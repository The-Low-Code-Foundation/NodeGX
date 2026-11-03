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

## s8 (2026-11-03): built

**The engine** (NodeGX, `packages/nodegx-backend`): `send-email`, *Send an email*, category *Workflow Integrations*.
`steps/email.ts` (the executor), `steps/emailParams.ts` (who it goes to, and the write-time check, pure). `to` (one
address, several in one text split on `,` `;` and line breaks, or a list from the run: texts, or records with an
`email` field; at most 50, one email to all), `subject`, `body` (`control: long-text`), `bodyFormat` `text` / `html`
(a plain-text twin made from the HTML and sent with it), `replyTo`. Out: `{ sent, messageId, to }`. It sends through
`_noodl_send_email`, the Send Email node's seam, so one mailer, one retry, one count; `Mailer` now takes a list,
`replyTo`, and hands back nodemailer's `messageId`. No SMTP: the step FAILS with *"no email was sent. Email is not
configured for this backend: no SMTP host/port set. Set it up on the Email page of the backend manager (/_admin)…"*
(Studio has no Email page of its own yet, so the sentence names the manager's). The SMTP password is never a param;
the test holds it to `secrets.json` alone. Documented in `docs/runtime/WORKFLOW-NODES.md`.

- 🔴 **P132-PARAMSHADOW (fixed, high)**: `http.ts` and `records.ts` re-resolved their params against `ctx.scope`, where a
  param named `body` stands where the run's `body` stood, so `{"$path": "body.email"}` beside a `body` setting read the
  step's own setting. WORKFLOW-NODES.md's own *Call an API* example sent `{}`. Found by BWF-007's first test. The engine
  now hands executors its `paramScope` (`StepExecContext.paramScope`); a regression spec in the BWF-006 suite fails on
  the old code (`got: {}`).
- AC1: `tests/p132-bwf-007-send-email.test.ts`, 9 specs over a real backend with the transport faked: sent with
  subject and words filled by `text`, reply-to, the `from`, the message id handed on; a text with commas and a list of
  found records' `keeper` (by `pick`); `html` with its text twin; an address that is not one refused at run time and
  sends nothing; **no SMTP fails in words, no stack, and `onError` catches it**; the password in no file but
  `secrets.json`; the write-time check (no `to`, a bad address, no subject, 51 addresses, a bad reply-to; refused
  before anything is written). The 42 workflow-layer suites: **655/655**.

**The agent** (`packages/noodl-mcp`): `list_backend_step_kinds` and the step `kind` name `send-email`, and say the
backend's email settings are the person's to set (their SMTP server and password), never invented. `toolDisclosure`,
`tvw009Vocabulary`, `workflowProposals` green; `instructions.test.ts` red on `P132-BST006GOLDEN` alone (67 vs 68).

**Studio** (`9a4287c`): `long-text` draws a textarea (typed, from the run, or a formula, as every setting); a new
step starts at `someone@example.com` / *From your app*; a test that runs a `send-email` step says who it writes to
first (`automations.mjs` `testMailWords`: typed addresses, a picked value in its pill words, "the addresses its
formula gives"; only the steps the test runs), in one question with BWF-002's warning when both are new, asked again
only when the recipients change.

- **AC2 green in the Electron app** on a Greenhouse copy ([greenhouse-drive-bwf007.mjs](greenhouse-drive-bwf007.mjs),
  an SMTP catcher of its own on 127.0.0.1): in *The morning check*, after *Mark who is thirsty today*, **Find
  records** (Plant, `thirsty` is `true`) and on its *If there are some* side **Send an email** to
  `gardener@greenhouse.test`, *Plants that need water today*, the message the formula *Join* (*Pick a field from each*:
  `name` of each in the find's `items`, joined with `, `), all from menus, no JSON. Tested with no SMTP: the warning
  said *"…It sends a real email to gardener@greenhouse.test."*, the run line and the step said the sentence above.
  SMTP set (the manager's route, at the catcher), tested again: no second question, the catcher got one email,
  subject *Plants that need water today*, body **"Fern, Basil"** (Cactus, just watered, not found); the step shows
  `sent`, `messageId`, `to`. A third test sent again without asking. [look/bwf007-built-no-json.png](look/bwf007-built-no-json.png),
  [look/bwf007-no-smtp-in-words.png](look/bwf007-no-smtp-in-words.png), [look/bwf007-sent.png](look/bwf007-sent.png).
- Gates: `check:automations` 127/127 (`NODEGX_REPO`) and 94/94 (kit), pure 110/110, `check:hosted` 46/46,
  `check:editor` 262/262, `check:app` 67/67.

**Found on the drive, open:** `P132-ROUTEDINSERT` (low): *Add a step after* on the first step put the find between it
and the Return, so the find keeps a plain `next`, and the backend's warning shows over the canvas in engine words
(`routes (nonempty)`, `routes.<name>`). Needs a ruling (see the row). Also: a `join` separator cannot be a new line
from Studio (a one-line box), so "one plant per line" needs JSON; *Write the message as* reads "(default)", not
"text" (the known enum wording).

**Still open after s8:** no agent round for BWF-007 (none in its ACs); Studio from the kit has no Send an email until
a NodeGX release.
