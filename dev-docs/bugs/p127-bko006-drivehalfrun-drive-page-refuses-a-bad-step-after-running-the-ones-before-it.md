---
id: P127-BKO006-DRIVEHALFRUN
title: drive_page refuses a bad step only after the steps before it have run, so a refused drive still made an account
status: fixed
severity: low
area: "noodl-mcp drive_page: a step's shape is checked when it is reached, not before the run"
found: P127 BKO-006, 2026-10-27, the shared-expenses brief (REPORT.md item 13)
evidence: "REPORTED by the stranger, not yet re-measured: one run was rejected for a bad step after its earlier steps had already created the Alice account (a duplicated test lunch is the trace)."
owner: Beta sweep s17 (2026-10-27)
kit: mcp
regression: packages/noodl-mcp/tests/p127DriveHalfRun.test.ts "the measured list: refused at step 13 before anything ran, saying so"
commit: 4bf7e4664
launch: beta
---

To measure: a drive whose third step has an unknown key; does the sign-up in step 1 happen?

## Measured and fixed 2026-10-27 (Beta sweep s17, 4bf7e4664)

Reproduced from the transcript (`/private/tmp/bko006/out/expenses/agent.jsonl`, call at line 336, `@nodegx/mcp@0.2.7`):
refused `invalid-argument` at step 13, `read: { text_contains: "Paid by" }`, after steps 1–3 had typed
alice@team.test and pressed "Create account"; the next call's step 4 then waited in vain because Alice already existed.
`drive-steps.js` checked only the verb and `stub_route` before Chrome started.

Fixed: `checkStep` runs the run's own builders over every step before Chrome starts and names every bad step at once,
ending "No step ran: every step is checked before the first one does." Graded without a browser: the CLI on a folder
with no project answers step 13 (HEAD: "Not a NodeGX v2 project directory", the run had begun), the door names steps
2–4 of a four-step list (HEAD: no refusal, step 1 ran in Chrome), and a well-formed step of every verb still passes.

Seen on the way, not changed: the door aliases `wait_for: { text_contains }` to `{ text }` (`argumentAliases.ts`) but
not `read: { text_contains }`, which is the shape the stranger wrote. Reaches an agent with the next `@nodegx/mcp` dist
(the runner ships in `dist/render-harness/`).
