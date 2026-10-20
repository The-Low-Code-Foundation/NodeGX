/**
 * WF-005 webhook secret verification — HMAC-SHA256 (GitHub/Stripe-shaped),
 * HMAC-SHA512 (Paystack-shaped, P121 TWO-004 step 5) and the token fallback:
 * accept the right secret, reject the wrong/missing one.
 */
import * as crypto from 'crypto';

import { verifyWebhook, signWebhookHmac, signWebhookHmac512 } from '../src/triggers/webhook';

const body = Buffer.from(JSON.stringify({ action: 'opened', number: 7 }), 'utf-8');

describe('verifyWebhook — hmac-sha256', () => {
  const secret = 'shhh';

  it('accepts a correct GitHub-style X-Hub-Signature-256 header', () => {
    const sig = signWebhookHmac(secret, body); // "sha256=<hex>"
    const res = verifyWebhook('hmac-sha256', secret, body, { 'x-hub-signature-256': sig }, {});
    expect(res.ok).toBe(true);
  });

  it('accepts a bare hex digest in X-Signature-256 (no sha256= prefix)', () => {
    const hex = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhook('hmac-sha256', secret, body, { 'x-signature-256': hex }, {}).ok).toBe(true);
  });

  it('accepts a base64 digest', () => {
    const b64 = crypto.createHmac('sha256', secret).update(body).digest('base64');
    expect(verifyWebhook('hmac-sha256', secret, body, { 'x-webhook-signature': b64 }, {}).ok).toBe(true);
  });

  it('rejects a wrong signature', () => {
    const res = verifyWebhook('hmac-sha256', secret, body, { 'x-hub-signature-256': 'sha256=deadbeef' }, {});
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/mismatch/);
  });

  it('rejects a signature computed with a different secret', () => {
    const sig = signWebhookHmac('other-secret', body);
    expect(verifyWebhook('hmac-sha256', secret, body, { 'x-hub-signature-256': sig }, {}).ok).toBe(false);
  });

  it('rejects when the signature header is missing', () => {
    const res = verifyWebhook('hmac-sha256', secret, body, {}, {});
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/missing signature header/);
  });

  it('is sensitive to a tampered body', () => {
    const sig = signWebhookHmac(secret, body);
    const tampered = Buffer.from(JSON.stringify({ action: 'opened', number: 8 }));
    expect(verifyWebhook('hmac-sha256', secret, tampered, { 'x-hub-signature-256': sig }, {}).ok).toBe(false);
  });
});

describe('verifyWebhook — hmac-sha512 (Paystack)', () => {
  const key = 'sk_test_ghana_business_key';
  const event = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'MK-2026-00042-GHS-0a1b2c3d4e5f' } }), 'utf-8');

  it('accepts Paystack’s x-paystack-signature: a bare hex HMAC-SHA512 keyed with the secret key', () => {
    const hex = crypto.createHmac('sha512', key).update(event).digest('hex');
    expect(signWebhookHmac512(key, event)).toBe(hex);
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': hex }, {})).toEqual({ ok: true });
  });

  it('accepts uppercase hex, a sha512= prefix, base64, and X-Webhook-Signature', () => {
    const hex = signWebhookHmac512(key, event);
    const b64 = crypto.createHmac('sha512', key).update(event).digest('base64');
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': hex.toUpperCase() }, {}).ok).toBe(true);
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': 'sha512=' + hex }, {}).ok).toBe(true);
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': b64 }, {}).ok).toBe(true);
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-webhook-signature': hex }, {}).ok).toBe(true);
  });

  it('rejects a wrong signature, another business’s key, and a tampered body', () => {
    const wrong = verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': 'deadbeef' }, {});
    expect(wrong).toEqual({ ok: false, reason: 'HMAC-SHA512 signature mismatch' });
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': signWebhookHmac512('sk_test_nigeria_business_key', event) }, {}).ok).toBe(false);
    const tampered = Buffer.from(event.toString('utf-8').replace('00042', '00043'));
    expect(verifyWebhook('hmac-sha512', key, tampered, { 'x-paystack-signature': signWebhookHmac512(key, event) }, {}).ok).toBe(false);
  });

  it('🔴 rejects a SHA-256 signature of the same body, and the sha256 scheme rejects Paystack’s', () => {
    const sha256hex = crypto.createHmac('sha256', key).update(event).digest('hex');
    expect(verifyWebhook('hmac-sha512', key, event, { 'x-paystack-signature': sha256hex }, {}).ok).toBe(false);
    expect(verifyWebhook('hmac-sha256', key, event, { 'x-webhook-signature': signWebhookHmac512(key, event) }, {}).ok).toBe(false);
  });

  it('rejects a missing header, naming the ones it reads; a GitHub header is not one of them', () => {
    const missing = verifyWebhook('hmac-sha512', key, event, { 'x-hub-signature-256': signWebhookHmac512(key, event) }, {});
    expect(missing).toEqual({ ok: false, reason: 'missing signature header (one of x-paystack-signature, x-webhook-signature)' });
  });

  it('fails closed with no secret', () => {
    expect(verifyWebhook('hmac-sha512', '', event, { 'x-paystack-signature': signWebhookHmac512('', event) }, {}).ok).toBe(false);
  });
});

describe('verifyWebhook — token', () => {
  const secret = 'tok_123';

  it('accepts the token from X-Webhook-Token, Bearer, or ?token=', () => {
    expect(verifyWebhook('token', secret, body, { 'x-webhook-token': secret }, {}).ok).toBe(true);
    expect(verifyWebhook('token', secret, body, { authorization: `Bearer ${secret}` }, {}).ok).toBe(true);
    expect(verifyWebhook('token', secret, body, {}, { token: secret }).ok).toBe(true);
  });

  it('rejects a wrong or missing token', () => {
    expect(verifyWebhook('token', secret, body, { 'x-webhook-token': 'nope' }, {}).ok).toBe(false);
    expect(verifyWebhook('token', secret, body, {}, {}).ok).toBe(false);
  });
});

describe('verifyWebhook — no secret configured', () => {
  it('fails closed', () => {
    expect(verifyWebhook('hmac-sha256', '', body, { 'x-hub-signature-256': 'sha256=x' }, {}).ok).toBe(false);
  });
});
