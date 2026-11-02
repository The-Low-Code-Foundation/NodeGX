---
id: P132-EDITORREADSBACKEND
title: The NodeGX editor's Workflows panel reads the running backend, not the project's nodegx.automations.json
status: scheduled
phase: P132
task: BWF-008
severity: medium
area: editor / Workflows panel
found: P132 scoping (code read), 2026-11-02
evidence: packages/noodl-editor/src/editor/src/views/panels/WorkflowsPanel*/WorkflowsPanel.tsx:38-43; WorkflowBackendClient.ts:1-40
---

The editor's Workflows panel (registered `router.setup.ts:438-448`) loads workflows and triggers over IPC from the
backend's `/admin/workflow-*` routes. Since P127 BKO-001 the project file is the truth, so with no backend running the
editor shows none of an app's workflows, and its header comment still says workflows "survive no git clone". The only
mention of `nodegx.automations.json` in the editor is the build's ignore list (`utils/compilation/build/ignore.ts:134`).

From reading the code, not yet driven: BWF-008 step 1 opens a copy of Greenhouse in the editor and records what the
panel shows and whether an edit reaches the file.
