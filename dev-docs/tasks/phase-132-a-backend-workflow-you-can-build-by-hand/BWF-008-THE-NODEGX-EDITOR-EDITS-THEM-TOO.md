# BWF-008 — The NodeGX editor edits them too

**Phase:** [132](README.md). **Repo:** NodeGX `packages/noodl-editor` (`views/panels/WorkflowsPanel*`,
`models/workflow/*`, `WorkflowBackendClient.ts`, `TriggerBackendClient.ts`, `WorkflowValueInput.tsx`).
**Bug:** P132-EDITORREADSBACKEND. **After:** BWF-005..007 (it draws their kinds), but step 1 can run any time.

## Why

Richard: *"I hope … that if I open the full NodeGX Editor I'll see these workflows and functions and be able to edit
them as I used to be able to do in Noodl?"* Pillar one (DIRECTION §0): an editor for the app is a view over its files.
Cloud functions are there, as in Noodl. Workflows are drawn by a Workflows panel that reads the **running backend**
over IPC, not `nodegx.automations.json`, and its own header still says workflows "survive no git clone"
(`WorkflowsPanel.tsx:38-43`), stale since P127 BKO-001.

## What to build

1. **Measure first (an hour).** Open a copy of Greenhouse in the editor: are the two cloud functions in the Components
   panel and editable as graphs? Does the Workflows panel list *The morning check*, *When a plant is watered*,
   *TriggerTest* and their triggers? Can a step be added and changed, and does the change reach the file, the backend,
   both or neither? With the backend stopped, what does the panel show? Write the answers into
   P132-EDITORREADSBACKEND and tell Richard the same day: it answers his question.
2. **Read and write the file.** The panel loads from `nodegx.automations.json` (the backend's copy when it differs is
   BKO-001 AC6's drift, said as Studio and `get_project_info` say it); a save goes backend first, then the file, through
   the same rule as Studio's `saveWorkflow` and the MCP's `update_backend_workflow` (share the code if they can share
   it). With no backend running it still draws, read-only, and says why.
3. **The same steps.** The panel's forms come from the catalog (README rule 2), so BWF-005..007's kinds and BWF-004's
   formulas appear without per-kind editor code; routes drawn labelled (BWF-001's rule); the value input's predecessor
   picker extended to field trees from a sample run (BWF-003's model).
4. **The stale comment** corrected.

## Acceptance

- AC1: step 1's answers written down and given to Richard.
- AC2: a workflow changed in the editor shows the change in Studio's Backend tab and in the file; one changed in
  Studio shows in the editor (both open on one copy, the file watcher).
- AC3: with the backend stopped, the panel draws the file's workflows and says they can't be edited until it runs.
- AC4: the editor's existing workflow tests green, plus one per point above.

## s9 (2026-11-03): step 1 measured

In the dev editor on a Greenhouse copy, a backend made from Backend Services; the answers are in
[P132-EDITORREADSBACKEND](../../bugs/p132-editorreadsbackend-the-nodegx-editors-workflows-panel-reads-the-running-backend-not-the-projects-file.md#measured-in-the-editor-bwf-008-step-1-s9-2026-11-03),
the shots in `look/bwf008-m1..m6`. In one line each: the two cloud functions are in the Components panel and edit as
graphs; the Workflows panel lists the three workflows only while a backend runs (it seeds from the file when new);
an edit is saved to the backend and never reaches `nodegx.automations.json`; with no backend it says workflows live
"not in this project". The new kinds (BWF-005..007) are already in its picker with generated forms, so item 3 is
words and polish, not plumbing. Item 2 (the file) is the real work.

How the drive was made, for the next one: copy with a fresh `id` and no `metadata.cloudservices`; a profile dir with
`recently_opened_project.json` listing only the copy; `NOODL_USER_DATA_DIR=<profile> npm run dev:debug -- --quiet`
(run in the background); the card, then Backend Services → *Add backend* → *Run one on this computer* → a name →
*Create* → *Start backend*. The backend lands in `~/.noodl/backends/` (no env override): delete it by its id after
`dev:stop`. Presses on the canvas need a real `Input.dispatchMouseEvent` at x,y (a scratch `clickat.mjs`).

## s9 (2026-11-03): items 2 and 4 built

- **Item 2, the file.** `packages/noodl-editor/src/main/src/local-backend/project-automations.js` (read, patch in
  place, restore, drift in words; the backend's `shape.ts` shapes, `ignorePrivacyRules` kept) and
  `BackendManager.writeBoth`: `saveWorkflowDef`, `deleteWorkflowDef` (refused while a trigger in the file starts it,
  Studio's rule), `setTriggerEnabled` (now `POST`, P132-EDITORTRIGGERPUT), `deleteTrigger`. New IPC
  `backend:project-automations` (the BMG-012 census lists it). The panel: where a save landed, drift per backend,
  the file's workflows listed read-only with what starts each while the project's backend is not running.
- **Item 4.** The header comment rewritten (BKO-001: the file is the truth).
- **AC3 green in the app** (`look/bwf008-b1-file-list-no-backend.png`). **AC2's editor half green in the app**: an
  edit on TriggerTest saved, "Saved to the backend and to nodegx.automations.json.", both held it
  (`look/bwf008-b2-saved-to-both.png`). The first editor save of a workflow also writes the canvas's positions into
  each step (`ui: {x, y}`, which the backend keeps) and puts `next` before `routes`: one-time noise in git, not a
  defect. AC2's crossing (Studio and the editor open on one copy) is not driven yet.
- **AC4:** `tests-main/local-backend/p132-bwf008-workflows-keep-the-project-file.test.js` 13/13 (two mutants caught:
  no file patch → 3 red, `PUT` back → 1 red), `tests-unit/workflow/p132-bwf008-panel-words.test.ts` 4/4, the
  local-backend, workflow and BMG-012 suites green. Full `jest` 10 suites / 24 tests red, the same set with my files
  put back to HEAD (the peers' tree: chr-007, hlt-012, exp-013 ×2, hlt-013, vfn-011, see-001, def007, hls009, el-009);
  hlt-021 red in the full run only (a port). `tsc -p packages/noodl-editor --noEmit` 0.
- **Not done (item 3):** the words. Steps titled by id, routes as `ontrue`/`next`, the component banner over a
  workflow, "No documentation yet" in the picker, "· COMPONENT", retry help about "the function", a stale picker
  search. And the value input's picker extended to field trees from a sample run (BWF-003's model).

## s10 (2026-11-03): item 3's words built and driven in the editor

NodeGX `fed5b74d5`. Driven in the dev editor on a fresh Greenhouse copy (backend made from Backend Services, removed by id after). Shots
`look/bwf008-s10-1..4`.

- **Steps titled as a person reads them** (`WorkflowDocument.buildGraph`): the step's name; else, for a step that calls a
  function, the function's own name, the last part of its path (`usePortAsLabel: 'ref'`, *Check thirst*); else the
  kind's words (*Transform*, *Branch (IF)*), as Studio titles an unnamed step. Never the id. `givenName` keeps the
  fallback out of the file: a save in the app left every unnamed step unnamed and kept *The end*.
- **Routes in served words.** Catalog **1.9.0** (NodeGX backend `kinds.ts`): a route's `displayName`, the words Studio
  had in its own `ROUTE_WORDS` (*Yes*, *No*, *If there are none*, *Anything else*, *When the time comes*…). The editor
  draws them on the card and the wire, and the name on a backend that serves none. The two engine edges in Studio's
  words: *Then*, *Always, as well* beside routes, *If it fails* (`workflowNodeLibrary.ts`, a comment names Studio's copy).
- **No page banner over a workflow** (`previewStripWords.ts`: a `/#__workflow__/` canvas gets the quiet seam).
- **No "· COMPONENT"**: steps set `hideCategoryChip`, as trigger nodes do. The header reads *CALL FUNCTION · CLOUD FUNC…*.
- **The picker's preview** says the kind's `summary` and `whenToUse` (the type's `description`), not "No documentation yet."
- **Retry help** is one line about the step: "No retry: the step runs once, and a failure fails it." (the second hint,
  about "the function", is gone).
- **The panel**: "It starts at Transform." (was "Entry step: transform.").
- **Stale picker search: not reproduced.** Typed, closed, reopened: the box is empty. A synthetic Escape without `code`
  does NOT close the picker, so it stays open with its search: s9's sighting was most likely that.

Tests: backend `workflow-canvas-contract` names every route's words kind by kind (mutant: `Yes` removed → red); the
42 workflow-layer suites 656/656; `tests-unit/workflow/p132-bwf008-panel-words` + `tests-unit/tvw-002` (strip: a
workflow says nothing beside a component of the same name that does; mutant → red); Electron `tests/workflow/workflowcatalog`
and `workflowdocument` (route words, fallback, next/onError words, description; titles, no name written back, a picked
step unnamed, function title, `stepWords`, the chip). `tsc -p packages/noodl-editor` 0.

Seen and not settled:

- The picker's preview text is the catalog's, written for agents: it says "(P132)" and names kinds by id
  (`create-record`, `http-request`). The words are right to come from the catalog; the catalog's `summary`/`whenToUse`
  want a person's sentence beside the agent's (a served `description`?). Not done.
- An unnamed function step's sub-label still repeats the function (*Call Function · Cloud Functions/Check thirst* under
  *Check thirst*).
- Early in the drive, a run of my presses (a helper without `buttons`, right after the warnings popup) took one step and
  its wire off the canvas, unsaved. Six careful presses on the same card after a restart changed nothing. *Close* then
  discarded the edit without asking, and the canvas kept drawing the closed workflow until the stack restarted. Not
  reproduced, not filed: the first thing to try if anyone sees a step vanish.
- Not done: the value input's picker as field trees (BWF-003's model) and AC2's crossing.

## s11 (2026-11-03): item 3's field trees built and driven in the editor

Driven in the dev editor on a fresh Greenhouse copy (backend made from Backend Services, removed by id after; the
`~/.noodl/backends` census the same 19 before and after). Shots `look/bwf008-s11-1..3`.

- **Ported, not shared.** Studio's page imports only its own modules, so one shared module would have to ship through
  the kit and a release. `models/workflow/workflowSources.ts` is a TypeScript port of `automations.mjs`'s
  `upstreamOf`, `shapeFields`, `startWords`, `readSources`, `itemSources`, `pathWords`, `stepsOfRun`, plus `fieldRows`
  (a source as lines, from Studio's `readTree`). Its header says the two copies answer one question.
- **What feeds it** (`WorkflowDocument.refreshReads` / `readsFor` / `valueWords`): the newest run of this workflow on this
  backend (`execution-history:list` filtered by `metadata.sourceId`, then `get`), the test sample Studio keeps in the
  project's `.nodegx/workflow-samples.json`, a table's columns (the project's `dbCollections`, else the backend's
  `backend:getSchema`), a function step's answer (its `noodl.cloud.response` nodes' `params`, refusals left out), the
  catalog's `output` words for every other kind. Asked again each time the list opens, so a run made since shows.
- **The picker** (`WorkflowValueInput`): under a `from` value, the path in words (*plant · from the Watering that was
  made*) and *Choose what it reads…*, which opens an inline list (not a floating menu: s4's menu ran off the window):
  what started it, how it started (folded), each step before, a field a line with the run's value beside it, or *no
  run yet* / *from the test sample*. A press writes the `$path` and closes the list. The box still takes a typed path.
  A list step's `items` param does not offer its own item; its other params do. With no open document (no backend),
  the old chips stay.
- **Driven:** before a run, *The Watering that was made* showed `objectId`, `createdAt`, `updatedAt`, *no run yet*. Watering's
  columns are on neither the project (it declares only `_User`) nor a fresh backend, so that is the honest shape, and
  Studio draws the same. One run (`backend:run-workflow-def` with a Watering-shaped payload) and the list showed
  *plant · a Plant*, *note "very dry"*, *objectId "w1"*, and the validate step's *ok true*, *checked 2*. Pressing *note*
  wrote `body.note`; *Save* put `{"$path":"body.note"}` in `nodegx.automations.json`.
- **Fixed in the drive:** a source's heading did not shrink, so the list scrolled sideways (179 px in a 153 px box):
  headings now wrap (153/153).

Tests: `tests-unit/workflow/p132-bwf008-sources` (14, each a case Studio's `check:automations` pins under BWF-003, plus
`fieldRows`; mutant: the ACL let through → red). Editor gates `npx jest tests-main/local-backend tests-unit/workflow
tests-unit/bmg-012` 13 suites / 159 green; `tsc -p packages/noodl-editor --noEmit` 0. Electron `test:ci` on the
change (HEAD 37b51695 + this tree, seed 83494): **3083 specs, 2 failures**, both P132-AAQ001STARTPAGE's pair (filed s10,
red before this change); every workflow spec green. Committed `7915c4af3`.

Seen and filed: **P132-HIDDENPANELCHURN**. With a workflow open, the hidden Components panel's filter input and empty
`.dialog-layer-portal-target` divs change about 15,000 times a second (a 2 s `MutationObserver` on `document.body`:
29,904 portal childList + 3,204 input attribute mutations, none inside the new list). Cause unfound.

Not done: a filter's item drawn in the app (Greenhouse has no filter; the spec covers it); AC2's crossing.

## s21 (2026-11-04): AC2's crossing driven in both apps; P132-EDITORBLINDTOSTUDIO fixed

**Measured by reading first.** Studio and the editor share ONE backend per project: both keep backends in
`~/.noodl/backends`, the project names its backend in `metadata.cloudservices`, and the app that opens second adopts the
running one (Studio's `startFor` reads the runtime record; it answered `phase: adopted`, the editor's pid). Both write
`nodegx.automations.json`. Studio's `serve.mjs` watches the folder and its page takes the write in (STU-002). The
editor's `ProjectFileWatcher` dropped that file (components, the three project-level files and scripts only), so a
Studio change reached the Workflows panel only on Refresh and an open canvas never; its next Save put the old
definition back over Studio's. Filed and fixed as
[P132-EDITORBLINDTOSTUDIO](../../bugs/p132-editorblindtostudio-a-workflow-changed-in-studio-never-reaches-an-open-editor-and-the-editors-next-save-puts-the-old-one-back.md).

**Built (NodeGX):** `decide.ts isAutomationsFile`, the watcher's fifth callback `onAutomationsChanged`, wired in
`EditorPage`; `WorkflowEditorService.automationsFileChanged` (the panel re-reads on `automationsChanged`; the open
workflow compared by the backend's `updatedAt`, a save in flight waited for through `WorkflowDocument.settled()`); the
decision pure in `models/workflow/workflowOutsideChange.ts` (unchanged / reload / ask / gone).

**Driven** ([crossing-studio.mjs](crossing-studio.mjs) for Studio's presses on CDP 9461, `editor-press.sh` for the
editor's on 9222), one Greenhouse copy, its backend made by Studio's `attachNewBackend` (Backend Services has no *Add
backend* any more: *Find a backend* lists every backend on the machine) and started by the editor on reopen:

1. **Studio → editor.** *When a plant is watered* open in the editor (2 steps). In Studio, *Add a step after* *Mark
   the plant watered* → Return. The editor: "Redrawn from the backend", the list "3 steps", the canvas Mark → Then →
   Return, Save not lit (`look/bwf008-s21-1-studio-change-redrawn-in-editor.png`).
2. **Editor → Studio.** The Return renamed in the editor, Save: "Saved to the backend and to
   nodegx.automations.json", **no** "Redrawn" toast (the editor's own echo is ignored). Studio: "nodegx.automations.json
   changed outside Studio — redrawn", its card "Say the plant is watered".
3. **Both at once.** An unsaved rename in the editor, then Studio renames Mark: "Changed in two places", the editor's
   unsaved name kept, nothing redrawn (`look/bwf008-s21-2-changed-in-two-places.png`). *Take theirs*: Studio's "Mark it
   watered" drawn, the unsaved name gone (`…-3-took-theirs.png`). 🔴 The first run found the warning **stayed up**
   after *Take theirs*, still offering it: it now closes with the press (`ToastLayer.hideActivity(id)`), re-driven
   after a restart of both apps.

Gates: `tests-unit/workflow/p132-bwf008-outside-change.test.ts` 9/9 (mutants: the watcher not reporting the file → 1
red; no wait for a save in flight → 1 red); workflow, watcher (rel-009b, fld-009, isl-005), local-backend and bmg-012
suites 21 / 251 green; `tsc -p packages/noodl-editor --noEmit` 0. Census of `~/.noodl/backends` 21 before = 21 after;
the peers' five Electron processes alive after both `dev:stop`s.

**AC2 green.** Not covered: a change to the FILE only (git pull, hand edit) is not on the backend, so the canvas has
nothing newer to redraw; the panel's drift line says the two differ. BWF-008's last open item is AC4's one spec per
point, which s9–s21 each added.

## s22 (2026-11-04): Studio speaks the served route words; P132-HIDDENPANELCHURN fixed

**Route words from one place.** Studio's `stepPorts` and `pieceFrom` take the kind's served route `displayName`
(catalog 1.9.0) first; its own `ROUTE_WORDS` table speaks only for a backend older than that (nodegx-studio
`0dbd922`). The served words equal the table today, so the drive serves the If's Yes as "When it holds" (a wrapped
`fetch`) and grades the wire says it; with Studio's served words dropped (the mutant) the wire said Yes and the line was
red. check:automations 185/185 + drive 210/210 with `NODEGX_REPO`, 101/101 on the kit; hosted 46/46, editor 262/262,
app 67/67. The editor already read them (s10).

**P132-HIDDENPANELCHURN** was not the workflow's: with only a page open, `warningsChanged` fired ~480 times a second.
The Components panel re-renders on it and reads page names through `readNameList`, which cleared its (absent) warning
on every read, and the clear announced a change. Fixed in `WarningsModel.setWarning` (a set that changes nothing says
nothing). In the dev editor: 0 DOM changes in 2 s after the fix, with a page open and with a workflow open and a step
picked (were ~28,000). [The record](../../bugs/p132-hiddenpanelchurn-the-hidden-components-panel-and-the-dialog-layer-rewrite-the-dom-15000-times-a-second-while-a-workflow-is-open.md).
Spec `tests-unit/workflow/p132-hiddenpanelchurn.test.ts` 6/6 (HEAD red on 4); 46 suites / 1,046 green around warnings
and workflows; `tsc` 0. Electron `test:ci` not run. It may also be why canvas presses sometimes missed in s9–s21 drives
(unproven).
