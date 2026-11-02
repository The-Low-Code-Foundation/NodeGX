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
