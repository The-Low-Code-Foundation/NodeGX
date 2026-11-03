# P132 — next session

**BWF-007 is done** (s8, 2026-11-03, NodeGX (this session's commit), Studio `9a4287c`: [the record](BWF-007-SEND-AN-EMAIL.md#s8-2026-11-03-built)).
`send-email`, *Send an email*: `steps/email.ts`, `steps/emailParams.ts`, through `_noodl_send_email` (the Send Email
node's seam; `Mailer` now takes a list, `replyTo`, and returns `messageId`). No SMTP fails the step in words naming the
backend manager's Email page. AC1 `tests/p132-bwf-007-send-email.test.ts` (9); the 42 workflow-layer suites 655/655;
AC2 in Electron on a Greenhouse copy with an SMTP catcher ([greenhouse-drive-bwf007.mjs](greenhouse-drive-bwf007.mjs)):
the email arrived, "Fern, Basil", built with no JSON.

🔴 **P132-PARAMSHADOW (fixed this session)**: executors that resolve their own params (`http.ts`, `records.ts`,
`email.ts`) must resolve against `ctx.paramScope ?? ctx.scope`, never `ctx.scope`: there a param named `body` /
`query` / `headers` stands where the run's `body` stood. A new executor that resolves params copies that line.

**Next: BWF-008** ([task](BWF-008-THE-NODEGX-EDITOR-EDITS-THEM-TOO.md)): the NodeGX editor's Workflows panel. Step 1
is MEASURE ONLY (an hour), and its answers go to Richard the same day: open a Greenhouse COPY in the editor (the
`run-editor` skill; never the real one), are the two cloud functions in the Components panel and editable; does the
Workflows panel list the three workflows and their triggers; does a change reach the file, the backend, both or neither;
with the backend stopped, what does it draw. Write them into `P132-EDITORREADSBACKEND`. Then items 2–4. The editor is a
different stack from Studio: its gates are jest in `packages/noodl-editor` (`test:main` per-dir, see the harness
memory), and its workflow canvas contract is `workflow-canvas-contract` in the backend tests (a colour per category in
`workflowNodeLibrary.ts` `CATEGORY_COLOR`: *Workflow Integrations* has one).

What s8 leaves (still open):

- `P132-ROUTEDINSERT` (low, needs a ruling): *Add a step after* on a step puts a Find (or any kind with sides) between
  it and the next, the find keeps a plain `next`, and the backend's warning shows over the canvas in engine words
  (`routes (nonempty)`, `routes.<name>`). Ask Richard: warn only for `branch`/`switch`, or ask at the insert?
- A `join` separator cannot be a new line from Studio (a one-line box): "one plant per line" needs JSON.
- No agent round for BWF-006 or BWF-007 (none in their ACs); the MCP wording is in, ungraded by an agent.
- From s7: a query row draws its name above its value; an enum at its default reads "(default)", not its value.
- From s6: Studio has no control for *Ignore privacy rules*; "change every plant found" needs a function; a Date typed
  as text is a date only when the backend's table has the column (`provisionFor` in a lab).
- From s4: a record's date unfolds into `__type` / `iso` in *What it can read*; a JSON setting takes no formula or drop.
- `P132-BST006GOLDEN` (open, not ours): `tests/instructions.test.ts` red on 67 vs 68 backend tools.

🔴 **Syntax-check `studio.html` before a drive**: extract the `<script type="module">` body to a scratch `.mjs` and
`node --check` it.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html`:
`git diff -U0 editor/studio.html | grep ^@@` before committing. Three `docs/look/s2-composer-*.png` in Studio are still
someone else's, uncommitted. NodeGX's index may hold a peer's staged file (`dev-docs/parked/README.md`): commit
through a temporary index.

🔴 **Studio from the kit** (backend 0.2.9) has no tests, formulas, record steps, Call an API or Send an email until a
NodeGX release carries `511e41d5d`, `8d9907ccf`, `24914b305`, `c3a95ea65` and s8's commit. Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer (`npm run build` in
`packages/nodegx-backend`; the kinds are bundled into `dist/cli.js`, there is no `dist/workflow/`).

**Driving Studio's Electron app on a Greenhouse copy:** [greenhouse-drive-bwf007.mjs](greenhouse-drive-bwf007.mjs) is
the newest (an SMTP catcher, `choose` / `type` / `mark` helpers). CDP 9461 (check: `lsof -nP -iTCP:9461 -sTCP:LISTEN`),
`NODEGX_DRIVE_DIR` your scratchpad, Bash sandbox off. 🔴 Pressing a step that is already picked does not reopen it;
a step with sides (find, filter, branch) has *Add on <side>*, not *Add a step after*.

Studio gates before you commit: `check:automations` (with and without `NODEGX_REPO`), `check:hosted`,
`check:editor`, `check:app` (screen unlocked), one at a time, outside the Bash sandbox (s8: 127/127 and 94/94,
46/46, 262/262, 67/67). Backend: the 42 suites that reach the workflow layer (`grep -lE
"workflow/|WorkflowEngine|WorkflowSubsystem|/steps/|workflow-defs|stepKindCatalog" tests/*.test.ts`), about 4
minutes, `nice -n 19 … --runInBand`.

Still open from earlier: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three
ports crowd the column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
