# P132 — next session

**BWF-005 is done** (s6, 2026-11-03: [the record](BWF-005-STEPS-THAT-ACT-ON-THE-DATA.md#s6-2026-11-03-built)). Four
record steps, `create-record` / `update-record` / `delete-record` / `find-records` (`steps/records.ts`, category
*Workflow Records*), write through the backend's own `/classes` routes on loopback, so rules, hooks and db-change
triggers apply as they do for a function's Record node. R5's *Ignore privacy rules* is `ignorePrivacyRules` on the
workflow, on unless `false`. Studio (`c67b142`) draws their settings from the catalog's `control` (`table`,
`record-fields`, `record-conditions`). AC1–AC2: `tests/p132-bwf-005-record-steps.test.ts` (11). AC3 in the Electron
app on a Greenhouse copy ([greenhouse-drive-bwf005.mjs](greenhouse-drive-bwf005.mjs)): *Mark watered* replaced by
*Change a record*, no function, no JSON. AC4: an agent given *"When a watering is logged, update the plant's
last-watered date"* wrote the step, not a function ([agent-round-bwf005.mjs](agent-round-bwf005.mjs), $3.50).

**Next: BWF-006** ([task](BWF-006-CALL-AN-API.md)): an `http-request` kind, its key named from Secrets and never
written into the file (R3). The Secret node's resolver (`_noodl_get_secret`, `service.ts` 4.6) is the seam a step can
use the way the record steps use `_noodl_cloudservices`. Its URL is "text with values", which is the `text` formula
today (s4: a single line with pills inline is not built). AC1 wants the secret redacted from the run record's
`inputData`: the engine records `input` as resolved, so a secret resolved into a param would be written there; resolve
it inside the executor, not as a param value.

What s6 leaves (still open):

- **Studio has no control for *Ignore privacy rules*.** The agent or a hand edit sets it. 🔴 A local backend is
  dev-open by default (`security.json` `devOpen: true`), so with the switch off nothing is refused there: a person
  testing the switch locally sees no difference. Worth a sentence beside the control when it is built.
- **"Change every plant found"** still needs a function: `for-each` calls a function per item, not a step.
- **A Date typed as text** is written as a date only when the backend's table has the column. 🔴 The drives'
  `attachNewBackend` makes a backend WITHOUT the project's declared columns (s6's agent found Plant had no
  `lastWatered` and added it); Studio's `provisionFor` seeds them. Use `provisionFor` in the next lab.
- From s4: a record's date unfolds into `__type` / `iso` in *What it can read*; a JSON setting takes no formula or
  drop; text with values is the `text` formula's slots, not one line with pills.
- `P132-BST006GOLDEN` (open, not ours): the MCP's bound-briefing capture says 67 backend tools, the server 68, so
  `tests/instructions.test.ts` is red on HEAD.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html` is
the file every Studio session edits: `git diff -U0 editor/studio.html | grep ^@@` before committing; a peer ran
`check:editor` during s6. Three `docs/look/s2-composer-*.png` in Studio are still someone else's, uncommitted. NodeGX's
index may hold a peer's staged file (s6: `dev-docs/parked/README.md`): commit through a temporary index.

🔴 **Studio from the kit** (backend 0.2.9) has no tests, formulas or record steps until a NodeGX release carries
`511e41d5d`, `8d9907ccf` and s6's commit: Studio's check says "not graded" for each there. Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer (`npm run build` in
`packages/nodegx-backend`, gitignored). Rebuild `packages/noodl-mcp` too (`node build.mjs`) before an agent round.

**Driving the Electron app on a Greenhouse copy:** [greenhouse-drive-bwf005.mjs](greenhouse-drive-bwf005.mjs) is the
newest (copy it). It copies Greenhouse, gives it its own backend (`NODEGX_BACKENDS_DIR`), starts Studio's Electron
hidden on CDP 9461 (check it is free: `lsof -nP -iTCP:9461 -sTCP:LISTEN`), drops `ELECTRON_RUN_AS_NODE`. Set
`NODEGX_DRIVE_DIR` to your scratchpad. Its `press` scrolls a target into view first. A `<select>` is changed by
setting its value and dispatching `change` (a press does not pick an option).

**An agent round:** [agent-round-bwf005.mjs](agent-round-bwf005.mjs) `<labRoot> --setup`, then `<labRoot>` (nohup,
Bash sandbox off), then `--grade`; kill the `serve.pid` it writes afterwards. Take OUT of the lab copy whatever the
request asks for, or "it already does that" is the right answer. It fences the repo, Studio and the real projects by
name, never all of `//Users/**` (that also refuses the file Claude Code saves a long result to). Write the request as
a change, not a question.

Studio gates before you commit: `npm run check:automations` (with and without `NODEGX_REPO`), `check:hosted`,
`check:editor`, `check:app` (screen unlocked), one at a time, the Chrome ones outside the Bash sandbox (s6: 115/115 and
94/94, 46/46, 262/262, 67/67). 🔴 check:automations runs into the backend's admin rate limit (burst 100, 5 a second)
by its last section: s6's BWF-005 section waits 20 s first. A new section at the end needs the same. Backend: the 40
suites that reach the workflow layer (`grep -lE "workflow/|WorkflowEngine|WorkflowSubsystem|/steps/|workflow-defs|stepKindCatalog" tests/*.test.ts`)
in about 4 minutes, `nice -n 19 … --runInBand`; adding a kind turns three of them red on purpose (the kind lists in
`workflow-steps-catalog`, `workflow-steps-http`, and a new category in `workflow-canvas-contract`, which also wants a
colour in the editor's `workflowNodeLibrary.ts` `CATEGORY_COLOR`).

Still open from earlier: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three
ports crowd the column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
