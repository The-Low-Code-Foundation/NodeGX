/**
 * Webhook secret verification (WF-005 implementation step 3).
 *
 * The scheme decision, made against what real senders actually transmit:
 *   - **hmac-sha256 (default).** GitHub sends `X-Hub-Signature-256: sha256=<hex>`
 *     over the raw body; Stripe sends `Stripe-Signature: t=…,v1=<hex>` (an HMAC
 *     over `t.payload`). Both are HMAC-SHA256. So the default verifies an
 *     HMAC-SHA256 of the RAW request bytes and accepts the signature from any of
 *     the common headers (`X-Hub-Signature-256`, `X-Signature-256`,
 *     `X-Webhook-Signature`), tolerating an optional `sha256=` prefix and hex or
 *     base64 digests. This is the scheme to point GitHub at directly.
 *   - **hmac-sha512.** Paystack sends `x-paystack-signature: <hex>`, an
 *     HMAC-SHA512 of the raw body keyed with the business's SECRET KEY (read
 *     2026-10-15, P121 TWO-004 §7). So the hook's secret is that key, pasted in,
 *     never one minted here. Accepted from `x-paystack-signature` or
 *     `X-Webhook-Signature`, hex or base64, with an optional `sha512=` prefix.
 *   - **token.** A shared bearer token in `X-Webhook-Token`, `Authorization:
 *     Bearer …`, or `?token=`. For senders that cannot sign. Documented as the
 *     weaker option (the secret crosses the wire).
 *
 * Comparison is constant-time. Verification is over the RAW bytes, never the
 * re-serialized JSON, so a signing sender and this verifier agree exactly.
 *
 * @module nodegx-backend/triggers/webhook
 */

import * as crypto from 'crypto';
import type { IncomingHttpHeaders } from 'http';

import type { WebhookScheme } from './registry';

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

const SIGNATURE_HEADERS = ['x-hub-signature-256', 'x-signature-256', 'x-webhook-signature'];
const SIGNATURE_512_HEADERS = ['x-paystack-signature', 'x-webhook-signature'];
const TOKEN_HEADERS = ['x-webhook-token'];

function timingSafeStrEqual(a: string, b: string): boolean {
  // Hash both sides so unequal lengths don't leak and timingSafeEqual gets equal
  // buffers to compare.
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const v = headers[name];
  if (Array.isArray(v)) return v[0];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Verify a webhook request against its per-hook secret. `rawBody` MUST be the
 * exact bytes received (the size-limit read hands them over).
 */
export function verifyWebhook(
  scheme: WebhookScheme,
  secret: string,
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
  query: Record<string, string>
): VerifyResult {
  if (!secret) return { ok: false, reason: 'no secret configured for this hook' };

  if (scheme === 'token') {
    let provided: string | undefined;
    for (const h of TOKEN_HEADERS) {
      provided = provided || headerValue(headers, h);
    }
    const auth = headerValue(headers, 'authorization');
    if (!provided && auth && auth.startsWith('Bearer ')) provided = auth.slice('Bearer '.length);
    if (!provided && query.token) provided = query.token;
    if (!provided) return { ok: false, reason: 'missing webhook token (X-Webhook-Token / Bearer / ?token=)' };
    return timingSafeStrEqual(provided, secret)
      ? { ok: true }
      : { ok: false, reason: 'webhook token does not match' };
  }

  // hmac-sha256 / hmac-sha512
  const algorithm = scheme === 'hmac-sha512' ? 'sha512' : 'sha256';
  const headerNames = algorithm === 'sha512' ? SIGNATURE_512_HEADERS : SIGNATURE_HEADERS;
  let provided: string | undefined;
  for (const h of headerNames) {
    provided = provided || headerValue(headers, h);
  }
  if (!provided) {
    return { ok: false, reason: `missing signature header (one of ${headerNames.join(', ')})` };
  }
  // Tolerate the "sha256=" prefix GitHub uses (and its sha512 twin).
  const prefix = algorithm + '=';
  const sig = provided.startsWith(prefix) ? provided.slice(prefix.length) : provided;

  const expectedHex = crypto.createHmac(algorithm, secret).update(rawBody).digest('hex');
  const expectedB64 = crypto.createHmac(algorithm, secret).update(rawBody).digest('base64');

  if (timingSafeStrEqual(sig.toLowerCase(), expectedHex.toLowerCase()) || timingSafeStrEqual(sig, expectedB64)) {
    return { ok: true };
  }
  return { ok: false, reason: `HMAC-${algorithm.toUpperCase()} signature mismatch` };
}

/** Compute the signature a sender would send (used by tests + docs examples). */
export function signWebhookHmac(secret: string, rawBody: Buffer | string): string {
  const buf = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf-8') : rawBody;
  return 'sha256=' + crypto.createHmac('sha256', secret).update(buf).digest('hex');
}

/** What Paystack sends in `x-paystack-signature`: a bare hex HMAC-SHA512 (tests + docs examples). */
export function signWebhookHmac512(secret: string, rawBody: Buffer | string): string {
  const buf = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf-8') : rawBody;
  return crypto.createHmac('sha512', secret).update(buf).digest('hex');
}
