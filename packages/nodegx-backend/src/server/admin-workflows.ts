/**
 * Admin workflow-definition routes (WF-001) — CRUD over the workflow registry
 * plus run/cancel, proxied by the editor and driven by the MCP workflow tools.
 * All routes are `admin` access, mirroring admin-triggers.ts.
 *
 *   GET    /admin/workflow-defs              list
 *   POST   /admin/workflow-defs             create
 *   GET    /admin/workflow-defs/:id         get one
 *   PUT    /admin/workflow-defs/:id         update
 *   DELETE /admin/workflow-defs/:id         delete
 *   POST   /admin/workflow-defs/:id/run     run now (payload optional; P132 BWF-002: `as`, `stopAfter`, `test` for a test)
 *   POST   /admin/workflow-runs/:executionId/cancel   cancel an in-flight run
 *   GET    /admin/workflow-step-kinds       the WF-002 step-kind catalog
 *   GET    /admin/api-calls                 P132 BWF-012: the saved API calls, and which workflows use each
 *   GET    /admin/api-calls/:id             one saved call
 *   PUT    /admin/api-calls/:id             create or replace one (refused if a workflow using it would have a blank unfilled)
 *   DELETE /admin/api-calls/:id             delete one (refused while a workflow uses it, naming them)
 *
 * @module nodegx-backend/server/admin-workflows
 */

import type { RequestContext } from './HttpServer';
import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { WorkflowSubsystem } from '../workflow/WorkflowSubsystem';
import type { RunTriggerContext } from '../workflow/WorkflowRunner';
import { definitionWarnings } from '../workflow/definitionWarnings';
import { WorkflowConfigError } from '../workflow/WorkflowRegistry';
import { ApiCallConfigError } from '../workflow/ApiCallRegistry';
import type { ApiCallDefinition, ApiCallInput } from '../workflow/apiCalls';
import { buildRunPayload, spreadableBody } from '../workflow/runPayload';
import { stepKindCatalog } from '../workflow/steps/kinds';
import type { WorkflowDefinition, WorkflowInput, WorkflowRunResult } from '../workflow/types';
import { HttpError, readJSONBody, sendJSON } from './http-util';

/**
 * What the Workflows page's *Last run* column shows (BMG-009): the newest
 * execution record of each workflow, or nothing. A DECORATION beside the
 * definitions, never on them — a definition is what a `PUT` carries back,
 * and it must not grow a field the registry did not write.
 */
export interface WorkflowLastRun {
  id: string;
  status: string;
  startedAt: number;
  durationMs?: number;
  /** `cancelled` / `timeout` when the engine said so; the store's own status alone cannot. */
  engineStatus?: string;
}

/** `GET /admin/workflow-defs`. */
export interface WorkflowListResponse {
  workflows: WorkflowDefinition[];
  /** BMG-009 — by workflow id; a workflow that never ran is absent. */
  lastRuns: Record<string, WorkflowLastRun>;
}

/** The body of every single-definition response (GET / POST / PUT). */
export interface WorkflowResponse {
  workflow: WorkflowDefinition;
  /** P132 BWF-001: on a create or update, what the stored definition does that is valid but rarely meant. */
  warnings?: string[];
}

/** `DELETE /admin/workflow-defs/:id`. */
export interface WorkflowDeletedResponse {
  deleted: boolean;
  id: string;
}

/**
 * `POST /admin/workflow-defs/validate` (WFA-007) — the dry run.
 *
 * `valid: false` is a **200**, not a 400: the caller asked a question and got an
 * answer. A 400 here would be indistinguishable from the route being wrong, and
 * the whole point is to distinguish "this would be rejected" from "something
 * went wrong asking".
 */
export interface WorkflowValidateResponse {
  valid: boolean;
  errors: string[];
  /** P132 BWF-001 (`definitionWarnings`): valid, but probably not what was meant. Never stops a save. */
  warnings: string[];
  /**
   * CWF-005: **the definition this backend would store**, when it would accept
   * one. Null when it would not.
   *
   * It can differ from what the caller sent, because a definition written
   * against an older step vocabulary is migrated on the way in. A caller that
   * DRAWS a candidate before it is saved — the editor's proposal review — has to
   * draw this, not the submission, or it reviews a step kind this backend no
   * longer has and reports a change the proposal does not make.
   *
   * Additive: a caller that only reads `valid` / `errors` is unaffected, and an
   * older backend simply omits the field.
   */
  definition: WorkflowDefinition | null;
}

/** `POST /admin/workflow-defs/:id/run`. */
export interface WorkflowRunResponse {
  run: WorkflowRunResult;
}

/**
 * P132 BWF-002 — what a test's sample stands for, on the run's envelope form (`{ payload, test, as, stopAfter }`).
 * The run is started the way that trigger starts it: the same payload shape, the same trigger type (so a `db-change`
 * test runs as the app, a `webhook` one as a visitor, P127 SCHEDULEAUTH), and its record is marked a test.
 */
export type WorkflowTestAs =
  | { type: 'db-change'; collection: string; action: string; recordId?: string }
  | { type: 'webhook'; slug?: string; headers?: Record<string, unknown>; query?: Record<string, unknown> }
  | { type: 'schedule'; cron?: string }
  | { type: 'manual' };

function testPayload(as: WorkflowTestAs | undefined, callerData: unknown): { type: RunTriggerContext['type']; payload: Record<string, unknown> } {
  const legacy = spreadableBody(callerData);
  if (!as || as.type === 'manual') return { type: 'manual', payload: buildRunPayload({ type: 'manual', body: callerData, legacy }) };
  if (as.type === 'db-change') {
    if (typeof as.collection !== 'string' || !as.collection || typeof as.action !== 'string' || !as.action) {
      throw new HttpError(400, 'A db-change sample names its table (`as.collection`) and what happened to the row (`as.action`).');
    }
    const change = { action: as.action, collection: as.collection, id: as.recordId };
    // dbchange.ts's shape: the row is the body, the change on `trigger`, and the deprecated top-level view beside it.
    return { type: 'db_change', payload: buildRunPayload({ type: 'db_change', change, body: callerData, legacy: { ...change, record: callerData } }) };
  }
  if (as.type === 'webhook') {
    return { type: 'webhook', payload: buildRunPayload({ type: 'webhook', slug: as.slug, headers: as.headers || {}, query: as.query || {}, body: callerData, legacy }) };
  }
  if (as.type === 'schedule') return { type: 'schedule', payload: buildRunPayload({ type: 'schedule', cron: as.cron, body: callerData, legacy: { cron: as.cron } }) };
  throw new HttpError(400, `A test's sample is a "db-change", a "webhook", a "schedule" or a "manual" run, not ${JSON.stringify((as as { type?: unknown }).type)}.`);
}

/**
 * `POST /admin/workflow-defs/:id/run` with `wait: false` (BMG-009) — a **202**
 * as soon as the record is opened, so a page can land on `#/runs/<id>` while
 * the run is still going. Only when the history is on: without a record there
 * is no id to hand back, and the route waits as before.
 */
export interface WorkflowStartedResponse {
  started: true;
  executionId: string;
  workflowId: string;
}

/** `GET /admin/api-calls` (P132 BWF-012). */
export interface ApiCallListResponse {
  calls: ApiCallDefinition[];
  /** By call id: the workflows that use it. A call no workflow uses is absent. */
  usedBy: Record<string, string[]>;
}

/** `GET` / `PUT /admin/api-calls/:id`. */
export interface ApiCallResponse {
  call: ApiCallDefinition;
  usedBy: string[];
}

export class AdminWorkflowRoutes {
  constructor(
    private readonly getWorkflows: () => WorkflowSubsystem | null,
    private readonly getExecutions: () => ExecutionHistory | null = () => null
  ) {}

  private subsystem(): WorkflowSubsystem {
    const wf = this.getWorkflows();
    if (!wf) throw new HttpError(503, 'Workflow engine is not ready');
    return wf;
  }

  /**
   * The step-kind catalog (WF-002): every kind this backend can run, with its
   * params, routes, output shape and prose. This is how an authoring agent — or
   * a human reading the API — discovers the step vocabulary, since a workflow
   * step is not a graph node and so cannot appear in SUB-004's node catalog.
   *
   * Deliberately does NOT go through `subsystem()`: the vocabulary is static,
   * and "what can I author?" must be answerable before the engine is ready.
   */
  stepKinds(ctx: RequestContext): void {
    sendJSON(ctx.res, 200, stepKindCatalog());
  }

  list(ctx: RequestContext): void {
    const workflows = this.subsystem().registry.list();
    const history = this.getExecutions();
    const lastRuns: Record<string, WorkflowLastRun> = {};
    if (history) {
      for (const def of workflows) {
        const [last] = history.list({ workflowId: def.id, limit: 1 });
        if (!last) continue;
        const engineStatus = last.metadata && typeof last.metadata.engineStatus === 'string' ? last.metadata.engineStatus : undefined;
        lastRuns[def.id] = {
          id: last.id,
          status: last.status,
          startedAt: last.startedAt,
          ...(last.durationMs !== undefined && last.durationMs !== null ? { durationMs: last.durationMs } : {}),
          ...(engineStatus ? { engineStatus } : {})
        };
      }
    }
    sendJSON(ctx.res, 200, { workflows, lastRuns } satisfies WorkflowListResponse);
  }

  get(ctx: RequestContext): void {
    const def = this.subsystem().registry.get(ctx.params.id);
    if (!def) throw new HttpError(404, `No workflow "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { workflow: def } satisfies WorkflowResponse);
  }

  /**
   * WFA-007 — validate a candidate definition against THIS backend, writing
   * nothing.
   *
   * The editor's review surface asks this before it renders a proposal (a
   * candidate that could not be saved must never be offered as a choice) and
   * again after a partial accept (whatever the review's dependency closures
   * miss, the authoritative validator sees). MCP asks it before staging a
   * proposal, so an agent gets the backend's own errors instead of the user
   * getting an unacceptable choice.
   *
   * The version skew this closes is real: a definition valid against one
   * backend is not necessarily valid against another, which is the same reason
   * the step-kind registry is served rather than bundled.
   */
  async validate(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const { errors, definition } = this.subsystem().registry.preview(body as unknown as WorkflowInput);
    sendJSON(ctx.res, 200, {
      valid: errors.length === 0,
      errors,
      warnings: definitionWarnings(definition ?? (body as unknown as WorkflowDefinition)),
      definition
    } satisfies WorkflowValidateResponse);
  }

  async create(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    this.upsert(ctx, body as unknown as WorkflowInput, undefined, 201);
  }

  async update(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    this.upsert(ctx, body as unknown as WorkflowInput, ctx.params.id, 200);
  }

  private upsert(ctx: RequestContext, input: WorkflowInput, id: string | undefined, status: number): void {
    try {
      const def = this.subsystem().registry.upsert({ ...input, id: id || input.id });
      sendJSON(ctx.res, status, { workflow: def, warnings: definitionWarnings(def) } satisfies WorkflowResponse);
    } catch (e) {
      if (e instanceof WorkflowConfigError) throw new HttpError(400, e.message);
      throw e;
    }
  }

  delete(ctx: RequestContext): void {
    const ok = this.subsystem().registry.delete(ctx.params.id);
    if (!ok) throw new HttpError(404, `No workflow "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { deleted: true, id: ctx.params.id } satisfies WorkflowDeletedResponse);
  }

  /** Run a workflow now (records as a 'manual' execution unless a body says otherwise). */
  async run(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    // `{"payload": …}` is the documented form; a bare object is accepted as the
    // payload itself. WFA-003: whichever it was, the caller's data lands under
    // `body` — and stays spread at the top level as the deprecated legacy view,
    // which is the shape every workflow authored before this reads.
    // BMG-009: `wait: false` is the page's, never part of the caller's data. It is
    // read off the envelope form only; a bare body is the payload, `wait` and all.
    const enveloped = !!body && 'payload' in body;
    const noWait = enveloped && body.wait === false;
    const callerData = (body && (body.payload as Record<string, unknown>)) || body || {};
    // P132 BWF-002: a test, on the envelope form only (as `wait` is): what the sample stands for, and where to stop.
    const as = enveloped ? (body.as as WorkflowTestAs | undefined) : undefined;
    const stopAfter = enveloped && typeof body.stopAfter === 'string' && body.stopAfter ? body.stopAfter : undefined;
    const test = enveloped && (body.test === true || !!as || !!stopAfter);
    const { type, payload } = testPayload(as, callerData);
    const id = ctx.params.id;
    const subsystem = this.subsystem();
    const def = subsystem.registry.get(id);
    if (!def) throw new HttpError(404, `No workflow "${id}"`);
    if (stopAfter && !def.steps.some((s) => s.id === stopAfter)) throw new HttpError(400, `Workflow "${id}" has no step "${stopAfter}" to stop after.`);

    let answered = false;
    let startedHook: ((executionId: string) => void) | undefined;
    const started = new Promise<WorkflowStartedResponse>((resolve) => {
      if (!noWait) return;
      // FED-004's `onStarted`: called once with the record id before the graph runs.
      startedHook = (executionId: string) => resolve({ started: true, executionId, workflowId: id });
    });

    const source = test ? `test of ${id}${as && as.type !== 'manual' ? ` on a ${as.type} sample` : ''}${stopAfter ? `, up to ${stopAfter}` : ''}` : `manual run of ${id}`;
    const finished = subsystem.run(id, { type, source, ...(noWait ? { onStarted: (eid) => startedHook && startedHook(eid) } : {}) }, payload, test ? { test, stopAfter } : undefined);
    // Whichever comes first: the record opening (202) or, with the history off, the run ending (200).
    const outcome = await Promise.race([
      started.then((s) => ({ kind: 'started' as const, s })),
      finished.then((r) => ({ kind: 'finished' as const, r }))
    ]);
    if (outcome.kind === 'started') {
      answered = true;
      sendJSON(ctx.res, 202, outcome.s);
      // The run goes on; its record is where its outcome lands. A rejection here would otherwise be unhandled.
      finished.catch(() => undefined);
      return;
    }
    const { found, result } = outcome.r;
    if (answered) return;
    if (!found || !result) throw new HttpError(404, `No workflow "${id}"`);
    sendJSON(ctx.res, 200, { run: result } satisfies WorkflowRunResponse);
  }

  apiCallList(ctx: RequestContext): void {
    const wf = this.subsystem();
    const calls = wf.apiCalls.list().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const usedBy: Record<string, string[]> = {};
    for (const c of calls) {
      const users = wf.usersOfApiCall(c.id);
      if (users.length) usedBy[c.id] = users;
    }
    sendJSON(ctx.res, 200, { calls, usedBy } satisfies ApiCallListResponse);
  }

  apiCallGet(ctx: RequestContext): void {
    const wf = this.subsystem();
    const call = wf.apiCalls.get(ctx.params.id);
    if (!call) throw new HttpError(404, `No saved API call "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { call, usedBy: wf.usersOfApiCall(call.id) } satisfies ApiCallResponse);
  }

  async apiCallPut(ctx: RequestContext): Promise<void> {
    const body = (await readJSONBody(ctx.req)) as unknown as ApiCallInput;
    const wf = this.subsystem();
    const existed = !!wf.apiCalls.get(ctx.params.id);
    try {
      const call = wf.saveApiCall({ ...body, id: ctx.params.id });
      sendJSON(ctx.res, existed ? 200 : 201, { call, usedBy: wf.usersOfApiCall(call.id) } satisfies ApiCallResponse);
    } catch (e) {
      if (e instanceof ApiCallConfigError) throw new HttpError(400, e.message);
      throw e;
    }
  }

  apiCallDelete(ctx: RequestContext): void {
    let ok: boolean;
    try {
      ok = this.subsystem().deleteApiCall(ctx.params.id);
    } catch (e) {
      if (e instanceof ApiCallConfigError) throw new HttpError(409, e.message);
      throw e;
    }
    if (!ok) throw new HttpError(404, `No saved API call "${ctx.params.id}"`);
    sendJSON(ctx.res, 200, { deleted: true, id: ctx.params.id });
  }

  /** Cancel an in-flight run by its execution id. */
  cancel(ctx: RequestContext): void {
    const cancelled = this.subsystem().cancel(ctx.params.executionId);
    if (!cancelled) throw new HttpError(404, `No active run "${ctx.params.executionId}"`);
    sendJSON(ctx.res, 200, { cancelling: true, executionId: ctx.params.executionId });
  }
}
