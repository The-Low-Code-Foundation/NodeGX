# P132 — next session

**BWF-006 is done** (s7, 2026-11-03: [the record](BWF-006-CALL-AN-API.md#s7-2026-11-03-built)). `http-request`,
*Call an API*: `steps/http.ts`, `steps/httpParams.ts`, `steps/outbound.ts`. The key is a Secret's NAME (`authSecret`),
read at run time through `_noodl_get_secret`; 🔴 the engine records a workflow step's input and output UNSCRUBBED, so a
secret must never be a param value (the same holds for BWF-007's SMTP password). Private and loopback addresses are
refused on the connection (`lookup` on Node's `http`), allowed by `--allow-private-http` / `NODEGX_ALLOW_PRIVATE_HTTP=1`.
Studio: `key-values` and `secret` controls, *Paste a curl command* (`automations.mjs` `parseCurl`, a key in the line
goes to Secrets first). AC1+AC2 `tests/p132-bwf-006-http-request.test.ts` (17); `check:automations` with `NODEGX_REPO`
127/127; AC3 in Electron with Open-Meteo ([greenhouse-drive-bwf006.mjs](greenhouse-drive-bwf006.mjs), real network).

**Next: BWF-007** ([task](BWF-007-SEND-AN-EMAIL.md)): `send-email`, half a session. The seam is
`_noodl_send_email` (`service.ts` 4.5, the Send Email node's), the way BWF-006 used the Secret node's resolver. Its
`to` / `subject` / `body` are values; "text with values" is the `text` formula. `tests/email-secrets.test.ts` and
`Mailer.setTransportForTesting` are the fake transport AC1 wants. A new kind turns three suites red on purpose (see
below) and goes in a category: *Workflow Integrations* exists now (colour `component`). Studio's step form needs
nothing new unless `to` takes a list (the `key-values` control is not that: a list control would be new).

What s7 leaves (still open):

- No agent round for BWF-006 (not in its ACs). The MCP wording is in, ungraded by an agent.
- A query row draws its name above its value, not beside it; an enum at its default reads "(default)", not its value.
- Still from s6: Studio has no control for *Ignore privacy rules* (a local backend is dev-open, so the switch changes
  nothing there); "change every plant found" needs a function (`for-each` calls a function per item, not a step); a
  Date typed as text is a date only when the backend's table has the column (use `provisionFor` in a lab, not
  `attachNewBackend`).
- From s4: a record's date unfolds into `__type` / `iso` in *What it can read*; a JSON setting takes no formula or drop.
- `P132-BST006GOLDEN` (open, not ours): `tests/instructions.test.ts` red on 67 vs 68 backend tools.

🔴 **Syntax-check `studio.html` before a drive**: s7 lost one drive to an extra `)`, which reads only as "title stayed
NodeGX Studio" two minutes in. Extract the `<script type="module">` body to a scratch `.mjs` and `node --check` it.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html` is
the file every Studio session edits: `git diff -U0 editor/studio.html | grep ^@@` before committing; a peer ran
`check:editor` during s6. Three `docs/look/s2-composer-*.png` in Studio are still someone else's, uncommitted. NodeGX's
index may hold a peer's staged file (s6: `dev-docs/parked/README.md`): commit through a temporary index.

🔴 **Studio from the kit** (backend 0.2.9) has no tests, formulas or record steps until a NodeGX release carries
`511e41d5d`, `8d9907ccf`, `24914b305` and s7's commit: Studio's check says "not graded" for each there. Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer (`npm run build` in
`packages/nodegx-backend`, gitignored). Rebuild `packages/noodl-mcp` too (`node build.mjs`) before an agent round.

**Driving the Electron app on a Greenhouse copy:** [greenhouse-drive-bwf006.mjs](greenhouse-drive-bwf006.mjs) is the
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
