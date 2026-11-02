# BWF-007 — Send an email

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend` (a new kind over `email/Mailer.ts`),
`packages/noodl-mcp`; nodegx-studio (the form). Half a session.

## What to build

1. **`send-email`**: to (a value, or a list), subject, body (text with values; plain, or simple HTML), reply-to. Out:
   `{ sent, messageId }`. Sent through the backend's own SMTP settings (the manager's Email page, `smtpPresets.ts`).
2. **No SMTP set** fails the step with the sentence that says where to set it (the manager's Email page, and Studio's
   way there once it has one), never a stack trace.
3. **A test run sends.** BWF-002's warning covers it; the first send in a test says who it is about to email.
4. **The agent**: the catalog; the instructions name the kind and that SMTP is the person's to set.

## Acceptance

- AC1: backend tests against a fake transport: sent, values filled, a list of recipients, no SMTP refused in words.
- AC2: on a copy of Greenhouse with a local SMTP catcher, *The morning check* emails "Plants that need water today" with
  the found plants listed, built in Studio with no JSON.
