/**
 * P115-HST004-HTTPLOOKUP — how the *Call an API* step puts ONE request on the wire.
 *
 * The step (`http.ts`) builds the request, checks a literal host, follows redirects and reads the answer; a transport
 * only sends one hop and hands back what came back. There are two, because the address guard lives in a different
 * place on each host:
 *
 * - `nodeHttpTransport` (the default; a NodeGX backend on a machine or a VM): Node's `http.request` with the guard's own
 *   `lookup`, so the address it connects to is the address it checked, and a name that resolves to 127.0.0.1 is refused.
 * - `fetchHttpTransport` (a Cloudflare Worker): workerd implements `node:http`'s client but not `lookup` (*The
 *   options.lookup option is not implemented*), and offers no DNS answer to check. There the guard is the platform's:
 *   a deployed Worker cannot open a connection to a private address. `checkLiteralHost` still runs in the step, before
 *   every hop. Redirects are `manual`, so the step follows them itself and drops the key across origins, as on Node.
 *
 * A transport does not read the body of a redirect the step will follow (3xx with a location, not 304).
 *
 * @module nodegx-backend/workflow/steps/httpTransport
 */

import * as http from 'http';
import * as https from 'https';

import { StepExecutionError } from '../StepExecutor';
import { guardedLookup } from './outbound';

/** The largest answer a step keeps. A bigger one fails the step rather than filling the run record. */
export const HTTP_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export interface HttpHop {
  url: URL;
  method: string;
  /** Lower-case names. No content-length: each transport sets its own. */
  headers: Record<string, string>;
  body?: Buffer;
  signal: AbortSignal;
  /** Whether this backend may call private addresses (`--allow-private-http`). */
  allowPrivate: boolean;
}

export interface HttpHopAnswer {
  status: number;
  /** Lower-case names; a repeated header joined with ", ". */
  headers: Record<string, string>;
  /** The body as UTF-8; '' for a redirect the step will follow. */
  text: string;
}

export type HttpTransport = (hop: HttpHop) => Promise<HttpHopAnswer>;

function isFollowedRedirect(status: number, location: string | undefined | null): boolean {
  return status >= 300 && status < 400 && status !== 304 && !!location;
}

function tooLarge(): StepExecutionError {
  return new StepExecutionError(`the answer is larger than ${HTTP_MAX_RESPONSE_BYTES / 1024 / 1024} MB, the most a step keeps`);
}

/** Node's `http`/`https`, through the address guard's `lookup`. */
export const nodeHttpTransport: HttpTransport = (hop) =>
  new Promise<HttpHopAnswer>((resolve, reject) => {
    const mod = hop.url.protocol === 'https:' ? https : http;
    const req = mod.request(
      hop.url,
      {
        method: hop.method,
        headers: hop.body ? { ...hop.headers, 'content-length': String(hop.body.length) } : hop.headers,
        lookup: guardedLookup(hop.allowPrivate) as never,
        signal: hop.signal
      },
      (res) => {
        const status = res.statusCode || 0;
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : v;
        if (isFollowedRedirect(status, res.headers.location)) {
          res.resume();
          return resolve({ status, headers, text: '' });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > HTTP_MAX_RESPONSE_BYTES) return void req.destroy(tooLarge());
          chunks.push(c);
        });
        res.on('end', () => resolve({ status, headers, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    if (hop.body) req.write(hop.body);
    req.end();
  });

/** `fetch`, for a host with no `lookup` (a Cloudflare Worker). */
export const fetchHttpTransport: HttpTransport = async (hop) => {
  const r = await fetch(hop.url, {
    method: hop.method,
    headers: hop.headers,
    body: hop.body ? new Uint8Array(hop.body) : undefined,
    redirect: 'manual',
    signal: hop.signal
  });
  const headers: Record<string, string> = {};
  r.headers.forEach((v, k) => (headers[k] = v));
  if (isFollowedRedirect(r.status, r.headers.get('location'))) {
    await r.body?.cancel();
    return { status: r.status, headers, text: '' };
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (r.body) {
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > HTTP_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  }
  return { status: r.status, headers, text: Buffer.concat(chunks).toString('utf8') };
};
