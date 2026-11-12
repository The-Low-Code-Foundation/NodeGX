---
id: P132-STALESTEPPANEL
title: Opening another workflow leaves the last workflow's step in the Properties panel, where a change edits a graph that is closed
status: fixed
phase: P132
severity: medium
area: noodl-editor / workflow canvas (`models/workflow/WorkflowEditorService.ts` `adopt` / `close`; `nodegrapheditor.ts` `switchToComponent` clears the selection only when it is given a node to select)
found: P132 s19 BWF-013 Build 4 drive (2026-11-04), on a Greenhouse copy in the dev editor
evidence: packages/noodl-editor/tests-unit/workflow/p132-bwf013-pieces.test.tsx "a workflow replaced or closed takes its step out of the Properties panel"
launch: beta
commit: (this commit)
---

Measured in the dev editor: with *Check thirst* (a step of *Find thirsty plants*) selected, opening *Plant round* from the
Workflows list put Plant round on the canvas while the Properties panel still showed *Check thirst*, its Function,
params and retry policy all editable. *Open the piece* (BWF-013) did the same with the Run step. The open path is the
same for both (`WorkflowEditorService.open` → `adopt` → `NodeGraphContextTmp.switchToComponent`), and
`switchToComponent` clears the selection only when it is handed a node to select.

Why it matters: the document behind that panel has been disposed, so a value typed there edits a graph nobody saves,
and nothing says it was lost.

Fixed: `adopt` and `close` clear the canvas's selection before the old document goes.
