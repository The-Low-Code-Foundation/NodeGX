/**
 * P132 BWF-006 — *Call an API*: the `http-request` step.
 *
 * Ruling R3: an outside API is a step with its key in Secrets, not a connector library and not a cloud function
 * whose only node is an HTTP Request. Out: `{ status, ok, headers, body }`, the body parsed when it is JSON, so
 * BWF-003's picker can offer `body.current.temperature_2m` the way it offers a record's fields.
 *
 * ⚠️ THE KEY NEVER TOUCHES THE RUN RECORD
 * --------------------------------------
 * The workflow engine records a step's input and output UNSCRUBBED (`BoundedExecutionLogger`'s note): a function's
 * steps go through the value scrubber, a workflow's do not. So the key must never be a param VALUE. The step holds
 * the Secret's NAME (`authSecret`), the engine records that name, and the value is read here, from the same resolver
 * the Secret node uses (`_noodl_get_secret`, service.ts 4.6), and put straight onto the request. An API that echoes
 * the key back (a debugging endpoint, an error page quoting the header) would carry it into the OUTPUT, so the
 * output has the value cut out wherever it appears before the engine sees it.
 *
 * WHERE IT MAY CALL: `outbound.ts`. On a machine the address check is made on the connection itself (Node's `http`
 * with the guard's `lookup`); on a Cloudflare Worker, which has no `lookup`, the platform refuses private addresses.
 * `httpTransport.ts` holds both; the step is given one, the Node one unless its host says otherwise (P115-HTTPLOOKUP).
 *
 * @module nodegx-backend/workflow/steps/http
 */

import { ApiCallLookup, mergeSavedCall } from '../apiCalls';
import type { StepExecContext, StepExecutor } from '../StepExecutor';
import { StepExecutionError } from '../StepExecutor';
import { HTTP_DEFAULT_TIMEOUT_MS, HTTP_MAX_TIMEOUT_MS } from './httpParams';
import { HTTP_MAX_RESPONSE_BYTES, nodeHttpTransport } from './httpTransport';
import type { HttpTransport } from './httpTransport';
import { checkLiteralHost, PrivateAddressError } from './outbound';
import { retryPolicyActive, runWithRetryPolicy } from './retryPolicy';
import { isPlainObject, resolveValueDeep } from './values';

export { HTTP_MAX_RESPONSE_BYTES };
const MAX_REDIRECTS = 5;
const REDACTED = '[REDACTED]';

interface SecretLookup {
  found: boolean;
  value?: string;
  error?: string;
}

/** What the service installs: whether this backend may call private addresses (`--allow-private-http`). */
export interface HttpStepPolicy {
  allowPrivate: boolean;
}

function policy(): HttpStepPolicy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (globalThis as any)._noodl_http_step_policy as HttpStepPolicy | undefined;
  return { allowPrivate: p?.allowPrivate === true };
}

function readSecret(stepId: string, name: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = (globalThis as any)._noodl_get_secret as ((n: string) => SecretLookup) | undefined;
  if (typeof get !== 'function') {
    throw new StepExecutionError(`Step "${stepId}": the backend's Secrets are not available, so the key "${name}" cannot be read.`);
  }
  const got = get(name);
  if (!got.found || typeof got.value !== 'string') {
    throw new StepExecutionError(
      `Step "${stepId}": there is no Secret called "${name}". Add it in Secrets (its value is never shown again), ` +
        'or choose another one under Authentication.'
    );
  }
  return got.value;
}

/** The params resolved against the run, read from the STEP: a webhook's payload has `headers`, `query` and `body` of its own. */
function resolvedParams(ctx: StepExecContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx.step.params || {})) out[k] = resolveValueDeep(v, ctx.paramScope ?? ctx.scope);
  return out;
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** Every occurrence of `secret` in `v` cut out. A value too short to be a key is left alone (log-scrub's rule). */
export function scrubValue<T>(v: T, secret: string | undefined): T {
  if (!secret || secret.length < 8) return v;
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return x.split(secret).join(REDACTED);
    if (Array.isArray(x)) return x.map(walk);
    if (isPlainObject(x)) {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x)) o[k.split(secret).join(REDACTED)] = walk(val);
      return o;
    }
    return x;
  };
  return walk(v) as T;
}

/** The address with no query, for a sentence: a key carried in the query must not be quoted in an error. */
function shown(u: URL): string {
  return u.origin + u.pathname;
}

interface Built {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
  secret?: string;
  /** Header names that carry the key: dropped when a redirect leaves the origin, as a browser does. */
  authHeaders: string[];
}

function build(ctx: StepExecContext, p: Record<string, unknown>): Built {
  const id = ctx.step.id;
  const method = typeof p.method === 'string' ? p.method.toUpperCase() : 'GET';
  let url: URL;
  try {
    url = new URL(asText(p.url));
  } catch {
    throw new StepExecutionError(`Step "${id}": "${asText(p.url).slice(0, 80)}" is not a whole address (it needs https:// at the start).`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new StepExecutionError(`Step "${id}": an API is called over https:// or http://, not ${url.protocol}`);
  }
  if (isPlainObject(p.query)) {
    for (const [k, v] of Object.entries(p.query)) if (v !== undefined && v !== null) url.searchParams.set(k, asText(v));
  }
  const headers: Record<string, string> = {};
  if (isPlainObject(p.headers)) {
    for (const [k, v] of Object.entries(p.headers)) if (v !== undefined && v !== null) headers[k.toLowerCase()] = asText(v);
  }
  let body: Buffer | undefined;
  if (p.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    const type = p.bodyType === 'form' || p.bodyType === 'text' ? p.bodyType : 'json';
    if (type === 'json') {
      body = Buffer.from(JSON.stringify(p.body));
      headers['content-type'] ??= 'application/json';
    } else if (type === 'form') {
      const form = new URLSearchParams();
      if (isPlainObject(p.body)) for (const [k, v] of Object.entries(p.body)) if (v !== undefined) form.set(k, asText(v));
      body = Buffer.from(form.toString());
      headers['content-type'] ??= 'application/x-www-form-urlencoded';
    } else {
      body = Buffer.from(asText(p.body));
      headers['content-type'] ??= 'text/plain; charset=utf-8';
    }
  }
  headers['accept'] ??= 'application/json, text/plain;q=0.9, */*;q=0.8';
  headers['user-agent'] ??= 'NodeGX-Workflow/1';

  const auth = typeof p.authType === 'string' ? p.authType : 'none';
  const authHeaders: string[] = [];
  let secret: string | undefined;
  if (auth !== 'none') {
    secret = readSecret(id, asText(p.authSecret));
    if (auth === 'bearer') {
      headers['authorization'] = `Bearer ${secret}`;
      authHeaders.push('authorization');
    } else if (auth === 'header') {
      const name = asText(p.authName).toLowerCase();
      headers[name] = secret;
      authHeaders.push(name);
    } else if (auth === 'query') {
      url.searchParams.set(asText(p.authName), secret);
    } else if (auth === 'basic') {
      headers['authorization'] = 'Basic ' + Buffer.from(`${asText(p.authUser)}:${secret}`).toString('base64');
      authHeaders.push('authorization');
    }
  }
  return { url, method, headers, body, secret, authHeaders };
}

interface Answer {
  status: number;
  headers: Record<string, string>;
  text: string;
  contentType: string;
}

/** One request, through the address guard, following redirects through it too. */
async function send(b: Built, signal: AbortSignal, allowPrivate: boolean, transport: HttpTransport): Promise<Answer> {
  let url = b.url;
  let method = b.method;
  let headers = b.headers;
  let body = b.body;
  for (let hops = 0; ; hops++) {
    checkLiteralHost(url.hostname, allowPrivate);
    const a = await transport({ url, method, headers, body, signal, allowPrivate });
    const location = a.headers.location;
    if (a.status >= 300 && a.status < 400 && location && a.status !== 304) {
      if (hops >= MAX_REDIRECTS) throw new StepExecutionError(`followed ${MAX_REDIRECTS} redirects and was sent on again`, a.status);
      const next = new URL(location, url);
      const keep = a.status === 307 || a.status === 308;
      const nextHeaders = { ...headers };
      if (!keep) delete nextHeaders['content-type'];
      if (next.origin !== url.origin) for (const h of b.authHeaders) delete nextHeaders[h];
      method = keep || method === 'HEAD' ? method : 'GET';
      headers = nextHeaders;
      body = keep ? body : undefined;
      url = next;
      continue;
    }
    return { status: a.status, headers: a.headers, text: a.text, contentType: a.headers['content-type'] || '' };
  }
}

function parseBody(a: Answer): unknown {
  if (!a.text) return null;
  if (/\bjson\b/i.test(a.contentType) || /^\s*[[{]/.test(a.text)) {
    try {
      return JSON.parse(a.text);
    } catch {
      return a.text;
    }
  }
  return a.text;
}

/**
 * P132 BWF-012: a step that uses a saved call runs with the call's settings as they are NOW, its blanks filled from
 * the step's `fill`, the step's own settings over them. Checked again here, not only at the save: a call can be
 * changed after the workflow was (a blank added), and a backend loaded from a hand-edited folder never saw the check.
 */
function withSavedCall(ctx: StepExecContext, p: Record<string, unknown>, lookup: ApiCallLookup | undefined): Record<string, unknown> {
  if (p.call === undefined) return p;
  const id = String(p.call);
  const saved = lookup ? lookup(id) : null;
  if (!saved) throw new StepExecutionError(`Step "${ctx.step.id}": there is no saved API call "${id}" on this backend.`);
  const fill = isPlainObject(p.fill) ? p.fill : {};
  const empty = (saved.blanks || []).map((b) => b.name).filter((b) => fill[b] === undefined || fill[b] === null);
  if (empty.length) {
    throw new StepExecutionError(`Step "${ctx.step.id}": the saved call "${id}" was given nothing for ${empty.map((b) => `"${b}"`).join(', ')}.`);
  }
  return mergeSavedCall(saved, p);
}

export class HttpRequestStepExecutor implements StepExecutor {
  /**
   * @param transport how one request goes on the wire: Node's `http` through the address guard unless the host says
   *   otherwise (a Cloudflare Worker passes `fetchHttpTransport`, P115-HST004-HTTPLOOKUP).
   */
  constructor(
    private readonly getApiCall?: ApiCallLookup,
    private readonly transport: HttpTransport = nodeHttpTransport
  ) {}

  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const p = withSavedCall(ctx, resolvedParams(ctx), this.getApiCall);
    const timeoutMs = Math.min(
      typeof p.timeoutMs === 'number' && p.timeoutMs > 0 ? p.timeoutMs : HTTP_DEFAULT_TIMEOUT_MS,
      HTTP_MAX_TIMEOUT_MS
    );
    const anyStatus = p.anyStatus === true;
    const { allowPrivate } = policy();
    const once = async (): Promise<Record<string, unknown>> => {
      const b = build(ctx, p);
      const timer = AbortSignal.timeout(timeoutMs);
      const signal = AbortSignal.any([ctx.signal, timer]);
      let a: Answer;
      try {
        a = await send(b, signal, allowPrivate, this.transport);
      } catch (e) {
        const where = shown(b.url);
        if (e instanceof PrivateAddressError) throw new StepExecutionError(`Step "${ctx.step.id}" may not call ${where}: ${e.message}`);
        if (timer.aborted) throw new StepExecutionError(`Step "${ctx.step.id}": ${where} did not answer within ${timeoutMs} ms.`, 504);
        if (ctx.signal.aborted) throw e;
        const said = scrubValue(e instanceof Error ? e.message : String(e), b.secret);
        throw new StepExecutionError(
          `Step "${ctx.step.id}" could not reach ${where}: ${said}`,
          e instanceof StepExecutionError ? e.statusCode : undefined
        );
      }
      const out = scrubValue({ status: a.status, ok: a.status >= 200 && a.status < 300, headers: a.headers, body: parseBody(a) }, b.secret);
      if (!out.ok && !anyStatus) {
        const excerpt = scrubValue(a.text.replace(/\s+/g, ' ').trim().slice(0, 300), b.secret);
        throw new StepExecutionError(
          `Step "${ctx.step.id}": ${shown(b.url)} answered ${a.status}${excerpt ? `: ${excerpt}` : ''}`,
          a.status
        );
      }
      return out;
    };
    return retryPolicyActive(ctx.step.params) ? runWithRetryPolicy(ctx, once) : once();
  }
}
