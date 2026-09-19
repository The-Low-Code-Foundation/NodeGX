/**
 * FED-005 — `POST /mcp`: this backend's own MCP endpoint.
 *
 * Someone pastes their backend's address and a scoped API key into Claude on
 * their laptop, and Claude can read their rows, add one, and call the functions
 * the key is allowed to call. Another NodeGX app does the same with the same
 * key. Neither installs anything.
 *
 * ## Transport
 *
 * Streamable HTTP in its **stateless** mode: one JSON-RPC message in, one
 * `application/json` response out, no session id, no SSE. That is a deliberate
 * choice and not a shortcut — a stateless endpoint works behind every proxy
 * this backend already works behind, and a server that hands out session ids
 * has to keep them somewhere, which for a service whose honest v1 semantics are
 * "single process, no queue" (triggers/scheduler.ts) would be a second kind of
 * state to lose on restart. `GET /mcp` therefore answers **405**, which is the
 * spec's way of saying "no stream here", and is what the official client
 * expects (it special-cases exactly that status).
 *
 * ## The four doors into this backend, and which gates each passes
 *
 * FED-004 §5.1 decision 7 pinned that the scheduler's overlap policy guards the
 * scheduler's fires and nothing else — a webhook, a manual fire and a db-change
 * trigger reach `dispatcher.fire` without it. **This is the mirror of that
 * question and it is answered here rather than left to be discovered.** `/mcp`
 * is a FOURTH door into the data plane, and it passes:
 *
 * | gate | `/classes` | `/functions` | `/mcp` |
 * |---|---|---|---|
 * | credential resolution (`resolvePrincipal`) | ✅ | ✅ | ✅ |
 * | dev-open relaxation | ✅ relaxed | ✅ relaxed | 🔴 **never** — see `checkAccess` |
 * | rate limit class | data | functions (+ per-function) | **data** |
 * | CLP (`checkClp`) | ✅ | — | ✅ per tool, and again per call |
 * | row ACL (`aclFor`) | ✅ | — (runs as system) | ✅ same option |
 * | function `call` rule (`checkFunctionCall`) | — | ✅ | ✅ |
 * | the graph's own `Allow Unauthenticated` | — | ✅ | ✅ (see `sessionForGraph`) |
 * | per-function rate limit (CWF-017) | — | ✅ | 🔴 **no** |
 * | idempotency (CWF-016) | — | ✅ | 🔴 **no** |
 *
 * The last two are the honest gaps and they are stated, not hidden. A
 * per-function budget is declared for an endpoint a provider hammers; an MCP
 * client is a person's laptop and is already inside the `data` class budget.
 * Idempotency keys identify a DELIVERY, and an MCP tool call is not a delivery
 * being retried by a provider — there is no key for the caller to send. Both
 * are cheap to add if a real one turns up; neither is worth a fake key today.
 *
 * ## Authorisation is not implemented here
 *
 * Not one access decision is made in this file. `buildToolSurface` derives the
 * list from `checkClp`/`checkFunctionCall`, `ctx.acl()` supplies the row
 * predicate the SQL builder uses, and `ctx.stampCreate()` stamps the owner —
 * the same three calls `/classes` makes. What IS written here is the response
 * shaping, deliberately: a model reading a Parse `{"__type":"Date"}` envelope
 * is a model spending tokens on wire format.
 *
 * @module nodegx-backend/server/mcp/McpRoutes
 */

import type { IStorageFacade, StorageQueryOptions } from '@noodl/backend-contract';
import type { RequestContext } from '../HttpServer';
import type { SecurityState } from '../../security/state';
import type { WorkflowRunner } from '../../workflow/WorkflowRunner';
import type { AuditLog } from '../../ops/audit';
import type { Principal } from '../../security/model';
import { HttpError, readJSONBody, sendJSON } from '../http-util';
import { logger } from '../../ops/logger';
import { AUDIT_MCP_TOOL_CALL } from '../../ops/audit-actions';
import { buildToolSurface, type FunctionOnSurface, type McpTool, type SchemaColumn } from './toolSurface';

// CWF-014's contract reader, through the same alias WorkflowRunner uses. The
// function tool's input schema IS the Request node's declared contract, and
// `requestParamSpecs` is the one function that answers what a Request node
// declares — its own docblock names "whatever generates an OpenAPI description
// later" as a caller it exists for. This is that caller.
const { requestParamSpecs } = require('@cloud-runtime/nodes/cloud/requestContract') as {
  requestParamSpecs: (
    parameters: Record<string, unknown> | undefined
  ) => { name: string; type: string; required: boolean; default?: unknown }[];
};

/** JSON-RPC 2.0 error codes, plus the one MCP adds meaning to. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

/**
 * Protocol versions this endpoint will agree to. The client's version is echoed
 * when it is one of these and otherwise negotiated down to the newest the
 * official client still accepts — answering a version the client does not know
 * makes it abort the handshake, which reads to a person as "the backend is
 * broken" rather than "we disagree about a date".
 */
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const FALLBACK_PROTOCOL_VERSION = '2025-06-18';

/** Rows a `_find` tool returns when the caller names no limit. */
const DEFAULT_FIND_LIMIT = 100;
/** The ceiling a caller cannot raise past — a model does not want 10,000 rows and nor does its context. */
const MAX_FIND_LIMIT = 500;

interface JsonRpcMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpRoutesDeps {
  facade: IStorageFacade;
  security: SecurityState;
  audit: AuditLog;
  getRunner: () => WorkflowRunner | null;
  /** `toQueryOptions` from parse-wire — see the `find` branch of `run()`. */
  toQueryOptions: (src: Record<string, unknown>) => StorageQueryOptions;
  serverName: string;
  serverVersion: string;
}

export class McpRoutes {
  private readonly deps: McpRoutesDeps;

  constructor(deps: McpRoutesDeps) {
    this.deps = deps;
  }

  /**
   * `GET /mcp` — 405, with the sentence that tells a person what to do instead.
   *
   * The official client treats 405 as "this server has no SSE stream" and
   * carries on; anything else lands in its `onerror`. A 404 would have been the
   * router's default and would have looked, to a person reading a client's
   * logs, exactly like a wrong address.
   */
  noStream(ctx: RequestContext): void {
    ctx.res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' });
    ctx.res.end(
      JSON.stringify({
        error:
          'This MCP endpoint is stateless: it has no SSE stream to open. Send JSON-RPC with POST, ' +
          'and set your client to Streamable HTTP.'
      })
    );
  }

  /** `POST /mcp`. */
  async handle(ctx: RequestContext): Promise<void> {
    let message: unknown;
    try {
      message = await readJSONBody(ctx.req);
    } catch {
      // A body that is not JSON never had an id, so the error carries `null` —
      // and it is HTTP 200, because a JSON-RPC error is a successful exchange
      // about an unsuccessful request. A 400 here would be reported by the
      // official client as a transport failure and the reason would be lost.
      sendJSON(ctx.res, 200, error(null, PARSE_ERROR, 'Request body is not valid JSON.'));
      return;
    }

    // A batch is legal in the spec even though the official client does not send
    // one. Handled rather than refused, because "the other client" is precisely
    // the population an MCP endpoint exists for.
    const batch = Array.isArray(message) ? (message as JsonRpcMessage[]) : [message as JsonRpcMessage];
    const responses: JsonRpcResponse[] = [];
    for (const one of batch) {
      const response = await this.dispatch(ctx, one);
      if (response) responses.push(response);
    }

    if (responses.length === 0) {
      // Every message was a notification. 202 with no body is what the spec
      // asks for and what the official client's `send()` looks for.
      ctx.res.writeHead(202);
      ctx.res.end();
      return;
    }
    sendJSON(ctx.res, 200, Array.isArray(message) ? responses : responses[0]);
  }

  /** One JSON-RPC message. Returns null for a notification (no `id`). */
  private async dispatch(ctx: RequestContext, message: JsonRpcMessage): Promise<JsonRpcResponse | null> {
    const isNotification = message.id === undefined || message.id === null;
    const id = isNotification ? null : (message.id as string | number);
    const method = typeof message.method === 'string' ? message.method : '';

    if (!method) {
      return isNotification ? null : error(id, INVALID_REQUEST, 'A JSON-RPC request needs a "method".');
    }

    // Notifications are acknowledged and otherwise ignored: this endpoint holds
    // no per-connection state for `initialized` to unlock and has nothing to
    // cancel.
    if (isNotification) return null;

    try {
      switch (method) {
        case 'initialize':
          return { jsonrpc: '2.0', id, result: await this.initialize(ctx, message.params) };
        case 'ping':
          return { jsonrpc: '2.0', id, result: {} };
        case 'tools/list':
          return { jsonrpc: '2.0', id, result: { tools: (await this.surface(ctx)).tools.map(publicShape) } };
        case 'tools/call':
          return { jsonrpc: '2.0', id, result: await this.callTool(ctx, message.params) };
        default:
          return error(
            id,
            METHOD_NOT_FOUND,
            `This backend's MCP endpoint offers tools only — no resources, no prompts. Unknown method: "${method}".`
          );
      }
    } catch (e) {
      if (e instanceof McpRequestError) return error(id, e.code, e.message);
      logger.error('mcp.dispatch-failed', {
        requestId: ctx.requestId,
        method,
        error: e instanceof Error ? e.message : String(e)
      });
      return error(id, INTERNAL_ERROR, e instanceof Error ? e.message : String(e));
    }
  }

  private async initialize(ctx: RequestContext, params: unknown): Promise<Record<string, unknown>> {
    const asked = (params as { protocolVersion?: unknown } | null)?.protocolVersion;
    const protocolVersion =
      typeof asked === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : FALLBACK_PROTOCOL_VERSION;
    const surface = await this.surface(ctx);
    return {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: this.deps.serverName, version: this.deps.serverVersion },
      instructions: surface.instructions
    };
  }

  // ==========================================================================
  // The surface
  // ==========================================================================

  /**
   * The tools THIS request's key may use.
   *
   * 🔴 Recomputed per request, never cached. Revoking a scope, unbinding a key
   * or changing a collection rule has to take effect on the next call, and a
   * cache keyed on anything less than the whole principal plus the whole config
   * is a cache that eventually hands somebody a tool they have just lost. The
   * cost is a handful of pure `checkClp` calls over the table list.
   */
  private async surface(ctx: RequestContext): Promise<{ tools: McpTool[]; instructions: string }> {
    const sm = this.deps.facade.schemaManager;
    const collections: string[] = sm ? sm.listTables() : [];
    const runner = this.deps.getRunner();
    const functions: FunctionOnSurface[] = runner
      ? runner.getAvailableFunctions().map((fn) => ({
          name: fn.name,
          allowNoAuth: runner.functionAllowsNoAuth(fn.name),
          params: requestParamSpecs(runner.getRequestNodeParameters(fn.name))
        }))
      : [];
    return buildToolSurface({
      config: this.deps.security.config,
      principal: ctx.principal,
      collections,
      columnsOf: (collection) => {
        const schema = sm ? sm.getTableSchema(collection) : null;
        return ((schema && schema.columns) || []) as SchemaColumn[];
      },
      functions
    });
  }

  // ==========================================================================
  // tools/call
  // ==========================================================================

  private async callTool(ctx: RequestContext, params: unknown): Promise<Record<string, unknown>> {
    const name = (params as { name?: unknown } | null)?.name;
    const args = ((params as { arguments?: unknown } | null)?.arguments || {}) as Record<string, unknown>;
    if (typeof name !== 'string' || !name) {
      throw new McpRequestError(INVALID_PARAMS, 'tools/call needs a "name".');
    }

    const surface = await this.surface(ctx);
    const tool = surface.tools.find((t) => t.name === name);
    if (!tool) {
      // 🔴 AC4. A tool this key may not use is INDISTINGUISHABLE from one that
      // does not exist, and both are a JSON-RPC error rather than a 500 or a
      // 403. The wording says the list is per-key, because otherwise a model
      // that saw the tool in somebody else's docs will simply retry.
      throw new McpRequestError(
        INVALID_PARAMS,
        `No tool named "${name}" on this backend for your API key. Call tools/list — it is computed from your key's scopes and changes when they do.`
      );
    }

    const startedAt = Date.now();
    let outcome: 'success' | 'failure' = 'success';
    // 🔴 Seeded from the ARGUMENT, not from the result. §3.4 asks for the
    // objectId "if any", and the call that most needs one in the trail is the
    // one that was REFUSED — "who tried to read row X and could not" is the
    // question an operator asks after a key is pasted somewhere it should not
    // have been. Reading it off the result records it only on success, which
    // this suite caught on its first run.
    let objectId: string | undefined = typeof args.objectId === 'string' && args.objectId ? args.objectId : undefined;
    let result: Record<string, unknown>;
    try {
      const ran = await this.run(ctx, tool, args);
      objectId = ran.objectId ?? objectId;
      result = { content: [{ type: 'text', text: ran.text }], structuredContent: ran.structured };
    } catch (e) {
      outcome = 'failure';
      // A tool that failed is an `isError` RESULT, not a JSON-RPC error: the
      // model is supposed to read the reason and try something else, and a
      // protocol error is handed to the client's plumbing instead of to it.
      result = {
        content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }],
        isError: true
      };
    }

    // §3.4. One row per tool call, written here rather than by the dispatcher
    // for CWF-015's reason, verbatim: `POST /mcp` is a single route whose action
    // is whatever tool was called, so the dispatcher cannot know which — only
    // this can. `actor` is the key's NAME because that is the actor spelling
    // every other row uses for a key (`HttpServer`'s trace), and a trail with
    // two spellings for one principal is a trail nobody can filter.
    void this.deps.audit.record({
      action: AUDIT_MCP_TOOL_CALL,
      actorKind: 'apiKey',
      actor: ctx.principal.kind === 'apiKey' ? ctx.principal.name : '',
      target: {
        tool: tool.name,
        ...(tool.target.kind === 'collection'
          ? { collection: tool.target.collection, op: tool.target.op }
          : { function: tool.target.functionName }),
        ...(objectId ? { objectId } : {})
      },
      detail: {
        durationMs: Date.now() - startedAt,
        actsAsUserId: ctx.principal.kind === 'apiKey' ? ctx.principal.actsAs?.userId ?? null : null
      },
      outcome,
      status: 200,
      ip: ctx.clientIp,
      requestId: ctx.requestId,
      method: 'POST',
      route: 'mcp'
    });

    return result;
  }

  /** Perform one tool. Throws for a failure the model should read. */
  private async run(
    ctx: RequestContext,
    tool: McpTool,
    args: Record<string, unknown>
  ): Promise<{ text: string; structured?: Record<string, unknown>; objectId?: string }> {
    if (tool.target.kind === 'function') return this.runFunction(ctx, tool.target.functionName, args);

    const { collection, op } = tool.target;
    // The gate again, on the way IN. The surface already refused this
    // principal every tool it may not use, so this can only fire if the config
    // changed between building the list and running the call — which is exactly
    // when it must.
    ctx.checkData(collection, op);

    switch (op) {
      case 'find': {
        const options = this.deps.toQueryOptions({
          where: args.where,
          order: args.order,
          limit: clampLimit(args.limit),
          skip: args.skip
        });
        options.acl = ctx.acl('read');
        const result = (await this.deps.facade.wireQuery(collection, options)) as { results?: unknown[] };
        const rows = (result.results || []).map(plain);
        return {
          text: rows.length === 0 ? `No rows in ${collection} matched.` : JSON.stringify(rows, null, 2),
          structured: { results: rows }
        };
      }
      case 'get': {
        const id = String(args.objectId || '');
        if (!id) throw new Error('objectId is required.');
        let record: Record<string, unknown>;
        try {
          record = (await this.deps.facade.wireFetch(collection, id, undefined, ctx.acl('read'))) as Record<
            string,
            unknown
          >;
        } catch {
          // Existence hiding, identical to `/classes/:collection/:id`: a row
          // somebody else owns must read the same as a row that is not there.
          throw new Error(`No row ${id} in ${collection}.`);
        }
        const row = plain(record);
        return { text: JSON.stringify(row, null, 2), structured: row, objectId: id };
      }
      case 'create': {
        const data = { ...args };
        delete data.objectId;
        delete data.ACL;
        ctx.stampCreate(collection, data);
        const created = (await this.deps.facade.rawCreate(collection, data)) as Record<string, unknown>;
        const id = String(created.objectId);
        return { text: `Created ${collection} ${id}.`, structured: { objectId: id }, objectId: id };
      }
      case 'update': {
        const id = String(args.objectId || '');
        if (!id) throw new Error('objectId is required.');
        const data = { ...args };
        delete data.objectId;
        delete data.ACL;
        delete data.createdAt;
        delete data.updatedAt;
        if (Object.keys(data).length === 0) throw new Error('Send at least one field to change.');
        try {
          await this.deps.facade.rawSave(collection, id, data, ctx.acl('write'));
        } catch {
          throw new Error(`No row ${id} in ${collection} that you can change.`);
        }
        return { text: `Updated ${collection} ${id}.`, structured: { objectId: id }, objectId: id };
      }
      default:
        throw new Error(`Unsupported operation ${op}.`);
    }
  }

  /**
   * Call a cloud function, through the runner the HTTP route uses.
   *
   * 🔴 **The graph's own `Allow Unauthenticated` check still applies**, because
   * it runs INSIDE the graph and nothing out here can wave it. For a key BOUND
   * to a user the request therefore carries an ephemeral session for that user
   * (see `sessionForGraph`), so the function sees `Authenticated: true` and the
   * right `UserId` — which is what "the key acts as this person" has to mean at
   * the one door where the person's identity is visible to code they wrote.
   *
   * For an UNBOUND key nothing is minted and the graph decides exactly as it
   * does for the same key over `POST /functions/:name` today. A function that
   * refuses unauthenticated callers refuses this one, and the refusal is
   * reported to the model with the fix named.
   */
  private async runFunction(
    ctx: RequestContext,
    functionName: string,
    args: Record<string, unknown>
  ): Promise<{ text: string; structured?: Record<string, unknown> }> {
    const runner = this.deps.getRunner();
    if (!runner) throw new Error('This backend is still starting up. Try again in a moment.');

    const session = await this.sessionForGraph(ctx.principal);
    try {
      const response = await runner.run(
        functionName,
        {
          body: JSON.stringify(args),
          headers: session ? { 'x-parse-session-token': session.token } : {}
        },
        { type: 'webhook', source: `POST /mcp (${functionName})`, requestId: ctx.requestId }
      );
      const text = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
      if (response.statusCode >= 400) {
        // 🔴 The hint is conditioned on there being NO session, not on the
        // status. Register R11: a graph refusing an unauthenticated caller
        // throws a plain `Error` and the runner answers **500** — not 401 —
        // and that is true over `POST /functions/:name` too, so it is not this
        // endpoint's to change. Keying the hint on 401 (which is what this
        // first said, and what the acts-as suite caught) would have attached it
        // to the one status the case never produces.
        throw new Error(
          `The function "${functionName}" answered ${response.statusCode}: ${reasonFrom(text)}` +
            (session
              ? ''
              : '. If this function requires a signed-in caller, ask whoever issued your API key to bind it to a user (actsAsUserId).')
        );
      }
      return { text, structured: safeJson(text) };
    } finally {
      if (session) await session.release();
    }
  }

  /**
   * An ephemeral `_Session` for the user a bound key acts as, or null.
   *
   * ⚠️ **The token never leaves this process.** It is minted, put in the
   * request headers the runner passes to the graph, and deleted in a `finally`
   * — it is not returned to the MCP client and there is no route that would
   * hand it back. The graph could read it out of `Request.Headers`, which
   * changes nothing: a cloud function already runs as system with the master
   * key, so it is strictly more privileged than the session it is being shown.
   *
   * 🔴 Released in a `finally`, not after a successful call. A function that
   * throws or times out must not leave a usable session behind — that would
   * turn every failing MCP call into a credential leak with a long tail.
   */
  private async sessionForGraph(principal: Principal): Promise<{ token: string; release: () => Promise<void> } | null> {
    if (principal.kind !== 'apiKey' || !principal.actsAs) return null;
    const token = 'r:' + require('crypto').randomBytes(24).toString('hex');
    const created = (await this.deps.facade.rawCreate('_Session', {
      sessionToken: token,
      userId: principal.actsAs.userId,
      // One minute is longer than any function this endpoint will wait for and
      // short enough that a row orphaned by a hard crash is not a live
      // credential. `sessionExpiryMs` reads an ISO string (server/users.ts).
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    })) as Record<string, unknown>;
    const objectId = String(created.objectId);
    return {
      token,
      release: async () => {
        try {
          await this.deps.facade.rawDelete('_Session', objectId);
        } catch (e) {
          // The row expires on its own a minute from now; a failed delete is
          // worth a log line and never worth failing the call the model made.
          logger.warn('mcp.session-release-failed', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** A JSON-RPC error this endpoint raises deliberately, as opposed to a crash. */
class McpRequestError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = 'McpRequestError';
  }
}

function error(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/** A tool as the wire carries it — `target` is ours and stays here. */
function publicShape(tool: McpTool): Record<string, unknown> {
  return { name: tool.name, description: tool.description, inputSchema: tool.inputSchema };
}

/**
 * A stored row, flattened for a model.
 *
 * `wireQuery` answers in Parse's shape, where a date is `{"__type":"Date","iso":…}`
 * and a pointer is a three-key envelope. A model reading that spends its
 * attention on wire format, and — worse — writes it back, so the envelopes are
 * unwrapped to the plain values a `_create` tool would take.
 */
function plain(value: unknown): Record<string, unknown> {
  const row = (value || {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(row)) {
    if (key === 'ACL') continue; // the security model's bookkeeping, not the person's data
    if (field && typeof field === 'object' && !Array.isArray(field)) {
      const envelope = field as Record<string, unknown>;
      if (envelope.__type === 'Date' && typeof envelope.iso === 'string') {
        out[key] = envelope.iso;
        continue;
      }
      if (envelope.__type === 'Pointer' && typeof envelope.objectId === 'string') {
        out[key] = envelope.objectId;
        continue;
      }
    }
    out[key] = field;
  }
  return out;
}

function clampLimit(value: unknown): number {
  const asked = Number(value);
  if (!Number.isFinite(asked) || asked <= 0) return DEFAULT_FIND_LIMIT;
  return Math.min(Math.floor(asked), MAX_FIND_LIMIT);
}

/**
 * The sentence inside a failed function's body, or the body itself.
 *
 * Every refusal this backend generates answers `{"error": "<sentence>"}` —
 * CWF-014's bad request, the runner's 500, the timeout. Handing the model the
 * whole JSON means handing it `{\"error\":\"Invalid request body: \\\"a\\\" is
 * required\"}`, in which the one useful clause is buried under two levels of
 * escaping. Same argument as `plain()` above: wire format is not the answer.
 *
 * A body that is not that shape is passed through untouched, because a function
 * an author wrote may answer anything and guessing at it would lose detail.
 */
function reasonFrom(text: string): string {
  const parsed = safeJson(text);
  return parsed && typeof parsed.error === 'string' ? parsed.error : text;
}

/** A function's body as an object when it is one, for `structuredContent`. */
function safeJson(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
