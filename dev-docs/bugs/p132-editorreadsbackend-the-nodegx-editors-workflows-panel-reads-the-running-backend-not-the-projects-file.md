---
id: P132-EDITORREADSBACKEND
title: The NodeGX editor's Workflows panel reads the running backend, not the project's nodegx.automations.json
status: scheduled
phase: P132
task: BWF-008
severity: medium
area: editor / Workflows panel
found: P132 scoping (code read), 2026-11-02
evidence: packages/noodl-editor/src/editor/src/views/panels/WorkflowsPanel*/WorkflowsPanel.tsx:38-43; WorkflowBackendClient.ts:1-40; dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/look/bwf008-m4-saved-to-backend-only.png
---

The editor's Workflows panel (registered `router.setup.ts:438-448`) loads workflows and triggers over IPC from the
backend's `/admin/workflow-*` routes. Since P127 BKO-001 the project file is the truth, so with no backend running the
editor shows none of an app's workflows, and its header comment still says workflows "survive no git clone". The only
mention of `nodegx.automations.json` in the editor is the build's ignore list (`utils/compilation/build/ignore.ts:134`).

From reading the code, not yet driven: BWF-008 step 1 opens a copy of Greenhouse in the editor and records what the
panel shows and whether an edit reaches the file.

## Measured in the editor (BWF-008 step 1, s9, 2026-11-03)

A copy of Greenhouse (fresh project id, no backend bound) opened in the dev editor on a throwaway profile
(`NOODL_USER_DATA_DIR`); a local backend made from *Backend Services → + → Run one on this computer*, as a person
would. Shots in the phase's `look/bwf008-m*.png`. The real Greenhouse was byte-identical after.

1. **Cloud functions: yes.** The Components panel has *Cloud Functions (2)*; *Mark watered* opens as its node graph
   and can be edited as in Noodl. Starting the backend pushed both ("pushed just now").
2. **The Workflows panel lists all three, once a backend runs.** A new backend with a project dir seeds itself from
   `nodegx.automations.json` (BKO-001, empty backend only), so *The morning check* (2 steps), *When a plant is
   watered* (2), *TriggerTest* (6) appear under the backend's name. Opening one draws the steps and the trigger as an
   entry node (*When a Plant is created → fires*). Triggers are not in the list itself.
3. **An edit reaches the backend only.** *The end*'s value typed in the Properties panel, *Save* → "Saved to the
   backend."; the backend's `workflow-defs/triggertest.workflow-def.json` holds it, the project's file is unchanged
   (same SHA). The two now differ, and nothing says so. Steps can be added: the picker has all 21 catalog kinds,
   including the four record steps, *Call an API* and *Send an email*, with forms drawn from the catalog.
4. **With no backend (never started, or stopped):** "Start a backend to author workflows. A workflow lives in a
   backend's data directory, not in this project — so there is nothing to list" while the project holds three.
   Stopped with a workflow open: the canvas keeps it and *Save* stays enabled.

Also seen (BWF-008 item 3's work, not separate rows yet): steps are titled by their id (`call-function-2`), not their
name; routes in engine words (`ontrue`, `next`); the component banner "triggertest isn't on any page yet" over a
workflow; the picker's preview says "No documentation yet" for kinds the catalog describes; a new *Call an API* is
headed "CALL AN API · COMPONENT" and its retry help speaks of "the function"; the picker opened with a stale search.
