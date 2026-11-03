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
 * WHERE IT MAY CALL: `outbound.ts`. Not `fetch`: the address check has to be made on the connection itself.
 *
 * @module nodegx-backend/workflow/steps/http
 */

import * as http from 'http';
import * as https from 'https';

import type { StepExecContext, StepExecutor } from '../StepExecutor';
import { StepExecutionError } from '../StepExecutor';
import { HTTP_DEFAULT_TIMEOUT_MS, HTTP_MAX_TIMEOUT_MS } from './httpParams';
import { checkLiteralHost, guardedLookup, PrivateAddressError } from './outbound';
import { retryPolicyActive, runWithRetryPolicy } from './retryPolicy';
import { isPlainObject, resolveValueDeep } from './values';

/** The largest answer a step keeps. A bigger one fails the step rather than filling the run record. */
export const HTTP_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
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
function send(b: Built, signal: AbortSignal, allowPrivate: boolean): Promise<Answer> {
  const go = (url: URL, method: string, headers: Record<string, string>, body: Buffer | undefined, hops: number): Promise<Answer> =>
    new Promise<Answer>((resolve, reject) => {
      try {
        checkLiteralHost(url.hostname, allowPrivate);
      } catch (e) {
        return reject(e);
      }
      const mod = url.protocol === 'https:' ? https : http;
      const req = mod.request(
        url,
        {
          method,
          headers: body ? { ...headers, 'content-length': String(body.length) } : headers,
          lookup: guardedLookup(allowPrivate) as never,
          signal
        },
        (res) => {
          const status = res.statusCode || 0;
          const location = res.headers.location;
          if (status >= 300 && status < 400 && location && status !== 304) {
            res.resume();
            if (hops >= MAX_REDIRECTS) return reject(new StepExecutionError(`followed ${MAX_REDIRECTS} redirects and was sent on again`, status));
            const next = new URL(location, url);
            const keep = status === 307 || status === 308;
            const nextMethod = keep || method === 'HEAD' ? method : 'GET';
            const nextHeaders = { ...headers };
            if (!keep) delete nextHeaders['content-type'];
            if (next.origin !== url.origin) for (const h of b.authHeaders) delete nextHeaders[h];
            return resolve(go(next, nextMethod, nextHeaders, keep ? body : undefined, hops + 1));
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (c: Buffer) => {
            size += c.length;
            if (size > HTTP_MAX_RESPONSE_BYTES) {
              req.destroy(new StepExecutionError(`the answer is larger than ${HTTP_MAX_RESPONSE_BYTES / 1024 / 1024} MB, the most a step keeps`));
              return;
            }
            chunks.push(c);
          });
          res.on('end', () => {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) out[k] = Array.isArray(v) ? v.join(', ') : v;
            resolve({ status, headers: out, text: Buffer.concat(chunks).toString('utf8'), contentType: String(res.headers['content-type'] || '') });
          });
          res.on('error', reject);
        }
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  return go(b.url, b.method, b.headers, b.body, 0);
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

export class HttpRequestStepExecutor implements StepExecutor {
  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const p = resolvedParams(ctx);
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
        a = await send(b, signal, allowPrivate);
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
