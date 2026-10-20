---
id: P112-OWN008-CATEGORY
title: "`@nodegx/canvas-look` colours a card by category (`visual`, `data`, `logic`, `javascript`, `component`) but nothing in the kit says which category a node type is, so two editors colour the same node differently"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/canvas-look` `nodeScheme(category)`; node-spec specs carry no category"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/map/REPORT.md (question 3)
kit: canvas-look
---

The map stranger mapped the runtime library's categories (`Visual`, `Data`, `Cloud Services`, `CustomCode`…) onto
canvas-look's five and fell back to name patterns. The NodeGX editor has its own mapping, which the kit doesn't
export. canvas-look's promise is "the look, as data, so it doesn't drift". This is the one part of the look it leaves
to every editor.

**Fix shape:** export `categoryOf(nodeType, library?)` from canvas-look, generated from the editor's own mapping like
the rest of the package.
