---
id: P132-EDITORTRIGGERPUT
title: The editor's trigger on/off on the workflow canvas sends PUT /admin/triggers/:id/enabled, which the backend serves as POST only
status: fixed
phase: P132
task: BWF-008
severity: medium
area: editor / main process BackendManager (backend:setTriggerEnabled)
found: reading the editor's trigger writes for BWF-008 item 2, 2026-11-03 (s9)
evidence: packages/nodegx-backend/src/server/admin-triggers.ts:11 (POST /admin/triggers/:id/enabled); every backend test that turns a trigger on or off uses POST; Studio's serve.mjs setTrigger posts
fixed: P132 s9 (BWF-008's commit), tests-main/local-backend/p132-bwf008-workflows-keep-the-project-file.test.js
---

`backend:setTriggerEnabled` (`BackendManager.js`, the menu on a workflow's trigger entry node, `WorkflowDocument.ts`
`setTriggerEnabled`) sent `PUT …/enabled`. The backend documents and serves `POST`, and its tests and Studio use only
`POST`. Not driven in the app before the fix (the method was read, not pressed), so "the toggle failed" is the
reading of the code, not a press seen failing. Now `POST`, and the change also reaches the project's
`nodegx.automations.json` (BWF-008 item 2); a mutant putting `PUT` back fails the spec.
