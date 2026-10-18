---
id: P121-TWO008-WEBHOOKSHA512
title: A webhook trigger cannot verify a Paystack webhook, because Paystack signs with HMAC-SHA512
status: fixed
commit: f3c9b1ebb
phase: P121 TWO-004 step 5
severity: high
area: backend / webhook trigger
found: P121 TWO-008 s1, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-008-WHAT-WAPPLER-DOES.md §6
regression: packages/nodegx-backend/tests/webhook-verify.test.ts
---

A builder taking payments through Paystack cannot point Paystack's webhook at a NodeGX webhook trigger and have it
checked. Paystack signs each webhook with HMAC-SHA512 of the raw body in an `x-paystack-signature` header (its docs,
to confirm in TWO-004 step 2). The trigger knows two schemes only: `WebhookScheme = 'hmac-sha256' | 'token'`
(`packages/nodegx-backend/src/triggers/registry.ts:71`), and validation refuses any other
(`registry.ts:428`: `webhook.scheme must be "hmac-sha256" or "token"`). The only way to accept the webhook is the
`token` scheme, which Paystack does not send, or no check at all.

Reproduce: author a trigger with `webhook.scheme: "hmac-sha512"`; the registry refuses it with the line above.

Fix (TWO-004 step 5): an `hmac-sha512` scheme with a configurable header name, beside `hmac-sha256`, each with a test
that sends a wrong signature and sees a refusal. Flutterwave's check (a secret hash header, or a newer signature)
goes in the same change once TWO-004 step 2 has read its docs. Until then TWO-004 v1 verifies each payment by
calling the provider's verify endpoint after the redirect.

## Built, 2026-10-15 (P121 TWO-004 s10), not yet committed

The trigger takes `webhook.scheme: "hmac-sha512"`: an HMAC-SHA512 of the raw body from `x-paystack-signature` (or
`X-Webhook-Signature`), hex or base64. Its secret is never minted (a made-up one would refuse every call Paystack
sends): created without `secret` it is refused in words, its key is not handed back, and rotating is refused. The admin
app has a "Paystack signature" choice with a box for the key; MCP and the editor know the scheme. Tests:
`nodegx-backend/tests/webhook-verify.test.ts`, `triggers-http.test.ts` (wrong signatures refused 401 and recorded,
through the real route), `admin-app/schedule.test.tsx`. Detail: TWO-004 §9.1. Flutterwave's check waits for TWO-004
step 6. Set `fixed` with the commit once committed.
