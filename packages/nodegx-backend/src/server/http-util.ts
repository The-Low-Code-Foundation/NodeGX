/**
 * Small HTTP helpers shared by every route family. No framework — the service
 * keeps the plain-`http` approach the in-editor server used.
 *
 * @module nodegx-backend/server/http-util
 */

import type * as http from 'http';

import type { StorageQueryResult } from '@noodl/backend-contract';

import { requestIdOf } from '../ops/request-id';

// The adapter stack is plain CommonJS without type declarations (see AdapterFacade).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QueryBuilder = require('@noodl/runtime/src/api/adapters/local-sql/QueryBuilder');

const MAX_JSON_BODY = 10 * 1024 * 1024; // 10MB, matching the old server
const MAX_FILE_BODY = 50 * 1024 * 1024; // uploads get more headroom

/**
 * CORS is no longer a constant spread into every `writeHead`. Since BAK-009 the
 * dispatcher sets the per-request headers on the response before any handler
 * runs (ops/headers), so a handler cannot forget them and an operator can
 * configure them. Spreading a constant here would override those with `*`.
 */

/** Parsed request URL: pathname + decoded query params. */
export function parseURL(url: string): { pathname: string; query: Record<string, string> } {
  const [pathname, queryString] = url.split('?');
  const query: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.substring(0, eq);
      const value = eq === -1 ? '' : pair.substring(eq + 1);
      try {
        query[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, '%20'));
      } catch {
        query[key] = value;
      }
    }
  }
  return { pathname, query };
}

/**
 * Read the request body as a Buffer (for file uploads).
 *
 * On overflow this stops consuming and rejects with a 413, but deliberately
 * does **not** destroy the request. It used to: `req.destroy()` tears down the
 * socket, so the 413 the caller then tried to write never reached the client —
 * the sender saw a bare `ECONNRESET` and had no idea it had hit a size limit.
 * Both call sites papered over that with their own Content-Length pre-check,
 * which only helps senders that declare a length.
 *
 * Instead the request is paused and left intact so the caller's error response
 * can be written. `sendError` marks 413s `Connection: close`, which is what
 * actually ends the socket — after the status has been flushed, and without
 * Node trying to parse the rest of the upload as a second pipelined request.
 */
export function readRawBody(req: http.IncomingMessage, maxSize: number = MAX_FILE_BODY): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    function settle(err: Error | null, value?: Buffer) {
      if (settled) return;
      settled = true;
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      if (err) {
        // Stop pulling bytes we have already decided to refuse. The socket
        // stays open exactly long enough for the response.
        req.pause();
        reject(err);
      } else {
        resolve(value as Buffer);
      }
    }

    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        settle(new HttpError(413, 'Request body too large'));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => settle(null, Buffer.concat(chunks));
    const onError = (err: Error) => settle(err);

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

/** Read and JSON-parse the request body. Empty body parses to {}. */
export async function readJSONBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRawBody(req, MAX_JSON_BODY);
  const text = raw.toString('utf-8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export function sendJSON(
  res: http.ServerResponse,
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

/**
 * PRD-001 — split a query result into the body the client gets and the headers
 * that say the page cap fired.
 *
 * 🔴 The cap announces itself in a HEADER, never in the body. The Parse wire
 * format is shared with four unchanged clients (`cloudstore.js`,
 * `userservice.ts`, the two runtime readers), and a new key in `{results,
 * count}` is a key one of them may already be iterating. A header is a surface
 * every route can set and no existing client can trip over.
 *
 * The BYOB `/api/*` routes are ours and could carry it in the body, and
 * deliberately do not: two surfaces answering the same question two ways is how
 * they come to disagree about the answer.
 *
 * Returning the body separately rather than deleting in place is what keeps
 * `capped` from leaking: a route that forgets to call this sends a result that
 * still has the fields on it, and the test that reads the body catches it.
 */
export function splitCapped(result: StorageQueryResult): {
  body: { results: Record<string, unknown>[]; count?: number };
  headers: Record<string, string>;
} {
  const { capped, cappedAt, ...body } = result;
  return { body, headers: capped ? cappedHeaders(cappedAt) : {} };
}

/**
 * PRD-006 — the ONE spelling of the cap signal, for the routes that cannot use
 * `splitCapped`.
 *
 * The aggregate routes answer with a scalar list and with a single object, not
 * with `results: Record<string, unknown>[]`, so they cannot pass through the
 * splitter — but they carry the same signal, and a second quoted copy of that
 * header name in this file is exactly the drift `splitCapped`'s docblock above
 * warns about. `splitCapped` calls this too, so the name is written once.
 *
 * `undefined` means the ceiling did not fire, and produces no headers at all:
 * a caller whose result FIT is not marked (PRD-001 AC4, PRD-006 AC5).
 */
export function cappedHeaders(cappedAt: number | undefined): Record<string, string> {
  if (cappedAt === undefined) return {};
  return {
    'X-NodeGX-Result-Capped': 'true',
    'X-NodeGX-Result-Limit': String(cappedAt)
  };
}

/**
 * An HTTP-mappable error. `parseCode` carries the Parse error code the clients
 * read (`{ code, error }` body) — e.g. 101 object-not-found / invalid-login,
 * 202 username-taken, 209 invalid-session-token.
 */
export class HttpError extends Error {
  status: number;
  parseCode?: number;
  /**
   * Extra fields merged into the response body beside `error` and `code`.
   *
   * Added by FED-002, whose 409 has to say WHICH field collided and with what
   * value — a refusal a graph can branch on rather than a sentence a person has
   * to read. Everything else still answers with the two fields it always did.
   */
  extra?: Record<string, unknown>;

  constructor(status: number, message: string, parseCode?: number, extra?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.parseCode = parseCode;
    this.extra = extra;
  }
}

/**
 * A create the adapter refused because of the caller's own `objectId` (P90
 * SYN-003) is the caller's mistake: a taken id is 409 with Parse's
 * DUPLICATE_VALUE (137), a malformed one is 400. Any other error passes through
 * unchanged, to be answered as before.
 */
export function createErrorToHttp(e: unknown, values?: Record<string, unknown>): unknown {
  const message = e instanceof Error ? e.message : String(e);
  const problem = QueryBuilder.clientObjectIdProblem(message);
  if (problem === 'taken') return new HttpError(409, message, 137);
  if (problem === 'invalid') return new HttpError(400, message);
  return uniqueViolationToHttp(message, values) || e;
}

/**
 * FED-002: a write refused by a declared unique index.
 *
 * SQLite names the table and the columns and stops there; the VALUE is in the
 * request body, which is why this is composed here and not in the adapter. The
 * result is a 409 whose body carries `{ code, field, value }` — the shape the
 * `Create Record` node puts on `Failure`, and the shape a feed graph tests to
 * tell "already had this item" from "the write broke".
 *
 * `field` is a single name for the ordinary one-field index and a
 * comma-separated list for a composite one; `value` matches it (a scalar, or an
 * array in the same order).
 */
export function uniqueViolationToHttp(message: string, values?: Record<string, unknown>): HttpError | null {
  const conflict = QueryBuilder.uniqueConstraintProblem(message) as { collection: string; fields: string[] } | null;
  if (!conflict) return null;

  const { collection, fields } = conflict;
  const value = fields.map((f) => (values ? values[f] : undefined));
  const shown = fields.length === 1 ? value[0] : value;
  return new HttpError(
    409,
    `"${fields.join(', ')}" is unique in "${collection}" and ${JSON.stringify(shown)} is already used. ` +
      'Send X-NodeGX-Upsert to update the existing record instead.',
    137,
    { field: fields.join(', '), value: shown, fields, collection: collection }
  );
}

/**
 * Send an error in the `{ code?, error }` shape all four runtime clients read.
 *
 * BAK-009 adds `requestId` when the dispatcher assigned one: an error a user
 * screenshots is then enough to find the exact log line and execution record
 * behind it, without asking them what time it happened.
 */
export function sendError(res: http.ServerResponse, err: unknown): void {
  const requestId = requestIdOf(res);
  if (err instanceof HttpError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.parseCode !== undefined) body.code = err.parseCode;
    if (err.extra) Object.assign(body, err.extra);
    if (requestId) body.requestId = requestId;
    // A 413 is raised while the body is still arriving, so the rest of it is
    // still in flight on this socket. Keeping the connection alive would leave
    // Node trying to read those bytes as the next pipelined request; closing
    // after the response is what lets the client actually read the status.
    sendJSON(res, err.status, body, err.status === 413 ? { Connection: 'close' } : {});
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  sendJSON(res, 500, requestId ? { error: message, requestId } : { error: message });
}
