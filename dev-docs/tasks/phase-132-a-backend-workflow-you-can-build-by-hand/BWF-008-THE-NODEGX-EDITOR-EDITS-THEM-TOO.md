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
