# P132 — next session

**s13 (2026-11-04): BWF-010 built** ([the record](BWF-010-THE-TRIGGER-IS-THE-FIRST-STEP.md#s13-2026-11-04-built-ac1ac3-green)),
nodegx-studio `26e602d`, P132-TRIGGERROWS fixed. One row per workflow; what starts it is the first card on its
canvas, its settings on the right; a workflow nothing starts gets one from that card. Driven in the Electron app on a
Greenhouse copy ([greenhouse-drive-bwf010.mjs](greenhouse-drive-bwf010.mjs)): 5 rows, the time moved from the card,
file and backend agree. **Next: BWF-011** (item 2 below), then 012, 013.

- 🔴 **check:hosted's *Delete type* goes red on the backend's admin rate limit (burst 100)**, at HEAD too
  (P132-HOSTEDRATELIMIT). It now prints the toast on a red. A "Not deleted: Rate limit exceeded" there is that bug;
  re-run once before reading it as yours. Studio's page made the same 18 admin calls on HEAD and on BWF-010.
- 🔴 A regex written inside the drive's `ev(\`…\`)` template needs `\\s`, not `\s`: the template eats one backslash
  (`/\s+/` became `/s+/` and a right card read as wrong).
- Ask Richard: the card says "Every day at 08:00" (the backend's words for the cron), not the file's name "Every morning
  at 08:00". Does he want his name on it?

---

**s12 (2026-11-03/04): Richard re-walked the Backend tab** ("It's still confusing AF"; his eight points verbatim in the
[README](README.md#richards-re-walk-verbatim-2026-11-03-studio-on-greenhouse-screenshot-of-call-an-apis-query-with-a-formula-open)).
Four were bugs, fixed in nodegx-studio `d4c72c0` (P132-FXMENUWORDS, -BRANCHROWSCROSS, -RECORDSTEPREFUSED,
-TYPEDISTEXT; gates check:automations 133/133 with `NODEGX_REPO`, check:editor 262/262, check:hosted 46/46,
check:app 67/67). He ruled three new things before the Beta (R6–R8). **Four tasks added, in this order:**

1. **[BWF-010](BWF-010-THE-TRIGGER-IS-THE-FIRST-STEP.md) — the trigger is the first card on its workflow's canvas**, one
   list row per workflow (P132-TRIGGERROWS, `launch: beta`). His first and loudest point. Studio only.
2. **[BWF-011](BWF-011-A-VALUE-COMPOSED-IN-ANY-SETTING.md) — a value composed in any setting** (R8). No engine change:
   `getPath` already walks `items.0.name`, the formulas have `text`/`first`/`pick`/`join`.
3. **[BWF-012](BWF-012-SAVED-API-CALLS.md) — saved API calls** (R7): engine, file, Studio, agent.
4. **[BWF-013](BWF-013-A-REUSABLE-PIECE-IS-A-WORKFLOW-OTHERS-RUN.md) — a reusable piece is a workflow others run** (R6,
   reverses "sub-workflows" in Not taking): a `run-workflow` kind, *New piece*, select steps → *Make a reusable piece*.
5. Then the s11 list below (BWF-008's AC2 crossing, route words, HIDDENPANELCHURN), then BWF-009, the test.

🔴 s12: the drive only ever added record steps to workflows a table change starts, so `record: ''` (refused) was never
met. A new step's starting form needs a drive line for EACH way a workflow can start. Second case of the same family
as FILTERNOCONDITION: if a third kind meets it, make the add save an unfinished step with a warning instead.
🔴 Studio asked a table's columns from the backend's copy of the workflow, which an agent-written workflow is not in
yet: read the project's file first (fixed in `d4c72c0`).

---

## From s11 (still true)

**BWF-008 item 3 is done** (s11, 2026-11-03, [the record](BWF-008-THE-NODEGX-EDITOR-EDITS-THEM-TOO.md#s11-2026-11-03-item-3s-field-trees-built-and-driven-in-the-editor)).
The editor's value picker draws what a step can read as field trees, BWF-003's model ported to
`models/workflow/workflowSources.ts` (a port, not shared: Studio's page cannot import a NodeGX module without a kit
release). Fed by `WorkflowDocument.refreshReads` (newest run, the test sample, columns, a function's answer). Driven
in the editor on a Greenhouse copy: shape before a run, the run's values after, a press wrote `body.note`, Save put it
in the file. s10's words were already in. Item 3 is closed. NodeGX `7915c4af3`. Electron `test:ci` (seed 83494):
3083 specs, 2 failures, both P132-AAQ001STARTPAGE (s10's, not ours); the workflow specs green.

**Next, in this order:**

1. **AC2's crossing**: Studio and the editor open on one Greenhouse copy; a change in each shows in the other (the
   file watcher). The last open AC of BWF-008 apart from AC4's one-per-point.
2. **Studio reads the served route words** (catalog 1.9.0) before its own `ROUTE_WORDS`, so a new route's words reach
   both surfaces from the backend. Studio from the kit keeps the table until a release carries 1.9.0.
3. **P132-HIDDENPANELCHURN** (filed s11, open): with a workflow open, ~15,000 DOM changes a second from the hidden
   Components panel's filter input and empty dialog-portal divs. First measure the same 2 s observer at HEAD with a
   page open, then with a workflow open. Not on the Beta walk, but it may be why canvas presses sometimes miss.
4. Then BWF-009 (the test), per the README's order.

**Asks for Richard** (his call, not ours):

- The picker's preview speaks the catalog's agent prose ("(P132)", `create-record`): a person's sentence per kind
  needs a served field. Does it matter before the Beta?
- `P132-ROUTEDINSERT`: warn only for `branch`/`switch`, or ask at the insert?

**Driving the editor on a copy** (s9, the recipe is in BWF-008's s9 step-1 record): fresh `id`, no
`metadata.cloudservices`, `NOODL_USER_DATA_DIR=<scratch profile>` with a `recently_opened_project.json` listing only
the copy, `npm run dev:debug -- --quiet` in the background, Backend Services → *Add backend* → *Run one on this
computer*. The backend lands in `~/.noodl/backends/`: remove it by its id after `dev:stop`. Canvas presses need a real
`Input.dispatchMouseEvent` with `buttons: 1` on the press, a move and a pause before it ([editor-drive.cjs](editor-drive.cjs)); a
key event needs `code` too, or Escape does not close the picker. `cdp reload` leaves this renderer blank: restart the
stack instead. The window size can change between
launches: find cards and buttons by text, never by a remembered x,y.
🔴 s11: in zsh, `$D eval …` with `D="node editor-drive.cjs"` runs nothing (no word splitting): use [editor-press.sh](editor-press.sh)
(`editor-press.sh at "text" [selector] [dbl]`; any other first word passes to editor-drive.cjs) or `${=XY}`. The project card's title sits below the launcher's fold:
press the card's picture. A step's properties open on a press on the card's lower half, not always on its title.
`dev:stop` leaves the peers' `noodl-mcp` Electron processes alone (checked s11).

Editor gates: `npx jest tests-main/local-backend tests-unit/workflow tests-unit/bmg-012` (green s11: 13 suites, 159), `tsc -p
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

Still open from earlier (the fold of BWF-001 item 8 is BWF-010, done s13): TriggerTest's three
ports crowd the column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
