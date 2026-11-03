# P132 — next session

**BWF-008 is half done** (s9, 2026-11-03, NodeGX (this session's commits): [the record](BWF-008-THE-NODEGX-EDITOR-EDITS-THEM-TOO.md#s9-2026-11-03-items-2-and-4-built)).
Step 1 measured in the editor and given to Richard (AC1): functions edit as graphs; the panel listed workflows only
with a backend running and saved to the backend alone. Items 2 and 4 built: the editor's main process now keeps
`nodegx.automations.json` (`local-backend/project-automations.js`, `BackendManager.writeBoth`), the panel lists the
file's workflows when the backend is off (AC3 green in the app) and says where a save landed (AC2's editor half green
in the app). The trigger toggle sent `PUT`, the backend serves `POST` (P132-EDITORTRIGGERPUT, fixed).

**Next, in this order:**

1. **P132-STUDIOPRIVACYDROP** (`launch: beta`, one field): Studio's `serve.mjs` `projectWorkflow` drops
   `ignorePrivacyRules` from the file. Add it, grade it in `check:automations`, then Studio's four gates.
2. **BWF-008 item 3, the words**, in the editor's workflow canvas: steps titled by name, routes in the catalog's
   words (`ROUTE_WORDS` in Studio), no component banner over a workflow, the picker's preview from the catalog's
   description, no "· COMPONENT" on a step, retry help without "the function", the picker's search cleared on open.
   Then the value input's picker as field trees (BWF-003's `upstreamOf`/`shapeFields`, in Studio's `automations.mjs`).
3. **AC2's crossing**: Studio and the editor open on one Greenhouse copy; a change in each shows in the other.

**Driving the editor on a copy** (s9, the recipe is in BWF-008's s9 step-1 record): fresh `id`, no
`metadata.cloudservices`, `NOODL_USER_DATA_DIR=<scratch profile>` with a `recently_opened_project.json` listing only
the copy, `npm run dev:debug -- --quiet` in the background, Backend Services → *Add backend* → *Run one on this
computer*. The backend lands in `~/.noodl/backends/`: remove it by its id after `dev:stop`. Canvas presses need a real
`Input.dispatchMouseEvent` (a scratch `clickat.mjs`, one CDP connection). The window size can change between
launches: find cards and buttons by text, never by a remembered x,y.

Editor gates: `npx jest tests-main/local-backend tests-unit/workflow tests-unit/bmg-012` (green s9), `tsc -p
packages/noodl-editor --noEmit` (0). Full `jest` has 10 suites red that are not ours (same set at HEAD, s9 list in the
record): compare by name before reading a red as yours.

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
