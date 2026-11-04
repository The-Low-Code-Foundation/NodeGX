# P132 — next session

**s16 (2026-11-04): BWF-012 driven in the Electron app, green; BWF-013's engine built.**
- BWF-012 AC1 + AC2 by real presses on a Greenhouse copy ([greenhouse-drive-bwf012.mjs](greenhouse-drive-bwf012.mjs),
  [the record](BWF-012-SAVED-API-CALLS.md#s16-2026-11-04-ac1-and-ac2-green-in-the-electron-app-by-presses)). Three look
  fixes in nodegx-studio `54bf770` (a blank reads "city · from each workflow", one tick per line, the list heading).
- BWF-013 Build 1 (this commit): the `run-workflow` kind, the piece's own run linked to its parent, rings refused by
  name, depth cap 8, catalog **1.11.0** `pieces: true`
  ([the record](BWF-013-A-REUSABLE-PIECE-IS-A-WORKFLOW-OTHERS-RUN.md#s16-2026-11-04-build-1-the-engine-built-studio-make-a-reusable-piece-and-the-editor-are-next)).

**Next, in this order:**
1. **BWF-013 Build 2 in Studio**: *Reusable pieces* lists the workflows no trigger starts, with *New* (a piece: name,
   first step), who runs each; cloud functions under them as "made by the agent". A `run-workflow` step's panel: the
   piece picked by name (catalog `control: 'workflow'`), `send` as named values with composers, *Open the piece ↗*,
   and *Open that run* from the step's `run`. Studio asks `beNow().pieces` before offering any of it.
   **Rebuild `packages/nodegx-backend/dist` first** (`npm run build`), and drive with `NODEGX_REPO`.
2. Build 3: *Make a reusable piece* from selected steps. Build 4: the editor draws the kind. Then AC3's agent round.

- 🔴 **P132-PRESSLOSTINREDRAW** (filed, low): a press that straddles a list or canvas rebuild gets mousedown and
  mouseup but no click. The rebuilds come in the ~80 ms after an action, so the drive waits 1 s after opening the tab.
  In a new drive, if a press "does nothing", log `pointerdown/mousedown/mouseup/click` first.
- 🔴 OBS was recording at 410 % CPU this session: check:automations froze once (60 s on a row click) and check:editor's
  CCN-002 clash line went red once; both green on re-run. Under that load, re-run a lone red once before reading it.
- Asks for Richard: none new.

---

**s15 (2026-11-04): BWF-012 built** ([the record](BWF-012-SAVED-API-CALLS.md#s15-2026-11-04-built-engine-file-mcp-studio-ac1-and-ac2-green-in-chrome)),
NodeGX (this commit) + nodegx-studio `60796d4`. A saved API call is Call an API's settings kept once in the file's
`apiCalls`, its blanks `{"$path": "fill.<blank>"}`; a step uses it as `{ call, fill }`, read when the step runs.
Backend `/admin/api-calls`, catalog **1.10.0** (`savedCalls`). Studio: *Save this call* on a step, saved calls by
name in the step menu (Integrations), a *Saved API calls* list, the call's own form. AC1/AC2 green in Chrome
(check:automations drive 167/167), AC3 green (an agent wrote `call: "weather"`, nothing copied, $1.41).

**Next, in this order:**
1. **Drive BWF-012 in Studio's Electron app on a Greenhouse copy** with real presses (copy
   [greenhouse-drive-bwf011.mjs](greenhouse-drive-bwf011.mjs)): *Save this call* on a Call an API, the city ticked,
   a second workflow picks it from the menu, the city typed, both tested, the address changed on the saved call.
   The Chrome gate's `.click()` misses what a press does (s4, s14, and s15's focus miss below).
2. Then **BWF-013** (a reusable piece is a workflow others run).

- 🔴 **s15: the panel restores the focus BY POSITION after a redraw** (P132-FOCUSBYINDEX, filed). A Save that
  removes its own box left the caret in another field, and `takeOutside` holds an outside change until a focused field
  is left: the next workflow written from outside never drew (drive 144/145). Worked around (the box is left first).
  If a drive line waits on a row that never comes, check `document.activeElement` first.
- 🔴 The MCP's `patchAutomations` wrote only `version/workflows/triggers`: a new top-level key in
  `nodegx.automations.json` must be added to EVERY writer (MCP `projectFiles.ts`, editor `project-automations.js`,
  Studio `serve.mjs`), the s9 lesson again. MCP and Studio now keep `apiCalls`; the editor patches in place.
- 🔴 A type the MCP imports from nodegx-backend must come from a module with no engine imports (`apiCallTypes.ts`,
  not `apiCalls.ts`), or `tsc` in noodl-mcp walks into the engine (its 19 existing errors come that way from two
  P128 tests).
- The AC3 agent found the call by grepping the project, not through `list_backend_workflows`' `apiCalls`.
- Asks for Richard: none new. The earlier ones below still stand.

---

**s14 (2026-11-04): BWF-011 built in Studio** ([the record](BWF-011-A-VALUE-COMPOSED-IN-ANY-SETTING.md#s14-2026-11-04-built-in-studio-the-editors-picker-open)),
nodegx-studio `1114cb3`. Every text setting is a composer, words with value chips. A chip is refined in place
(first, last, how many, each one's field, joined; a record's fields). It is saved as `$path`, the typed text, or
`{ $fn: 'text' }`. Driven in the Electron app on Greenhouse: "Water " + the first plant's name + " today", no
formula menu opened, the test's email said "Water Fern today". NodeGX catalog: a `$path` walks lists by position.
**Next: BWF-012** (saved API calls), then 013. The editor's composer is still open (BWF-011's record).

- 🔴 **A real press takes the focus before a menu's pick lands**: a control that saves on `focusout` must not be
  one-shot. A gate's `.click()` never leaves the box; dispatch the `focusout` first, as `automations-drive.mjs` does now.
- 🔴 `automations-drive.mjs --shots` writes into NodeGX's `dev-docs/tasks/phase-127-…/look/`, overwriting five tracked
  PNGs: don't pass `--shots`, or put them back with `git show HEAD:<path> > <path>` after.
- Asks for Richard: the chip's words (`items › #1 › name`, pathWords'); the panel is busier (*+ A value* under each
  text setting).

---

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
