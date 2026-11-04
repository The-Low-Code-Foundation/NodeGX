---
id: P132-EDITORBLINDTOSTUDIO
title: A workflow changed in Studio (or by the agent) never reached the NodeGX editor's open canvas, and the editor's next Save put the old steps back over it
status: fixed
phase: P132
severity: high
area: noodl-editor / ProjectFileWatcher, WorkflowEditorService, WorkflowsPanel
found: BWF-008 AC2's crossing, 2026-11-04 (s21), by reading the editor's watcher before the drive
evidence: packages/noodl-editor/tests-unit/workflow/p132-bwf008-outside-change.test.ts (9, two mutants red); the drive in BWF-008's s21 record, shots look/bwf008-s21-1..3
launch: beta
commit: (this session's NodeGX commit)
---

Studio and the editor share one backend per project (`~/.noodl/backends`, bound by `metadata.cloudservices`; whoever
opens second adopts the running one), and both write `nodegx.automations.json`. Studio watches the project folder and
takes an outside write in (STU-002). The editor's `ProjectFileWatcher` mapped only component files, the three
project-level files and scripts: `nodegx.automations.json` was dropped, so:

- the Workflows panel learned of Studio's change only when someone pressed Refresh or switched panels;
- an open workflow's canvas never learned of it at all, and its next Save sent the editor's old definition, wholesale,
  over Studio's (backend first, then the file): Studio's step gone, no word to anyone.

Fixed: the watcher reports the file (`isAutomationsFile`, its own question, not a fourth `ProjectLevelFile`);
`WorkflowEditorService.automationsFileChanged` makes the panel re-read, then compares the backend's `updatedAt` for the
open workflow with the canvas's (a save in flight is waited for, so the editor's own echo changes nothing). Changed
elsewhere with nothing unsaved: redrawn, "Redrawn from the backend". With unsaved edits: nothing replaced, "Changed in
two places", *Take theirs* (Save keeps mine). Gone from the backend: said.

Driven in both apps on one Greenhouse copy: a Return added in Studio drew in the editor; a step renamed in the editor
drew in Studio; Studio's rename over an unsaved editor edit asked, and *Take theirs* drew Studio's. The drive found the
warning stayed up after *Take theirs*, still offering it: it now closes with the press.

Not covered: a change that reaches the FILE only (a git pull, a hand edit) is not on the backend, so the open canvas
has nothing newer to redraw; the panel's drift line (BKO-001 AC6) says the two differ after its re-read.
