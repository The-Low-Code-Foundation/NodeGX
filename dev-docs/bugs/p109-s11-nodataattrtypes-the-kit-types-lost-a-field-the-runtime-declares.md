---
id: P109-S11-NODATAATTRTYPES
title: The published kit types lacked `noDataAttributes`, which the runtime's node definition declares — the types' drift gate was red
status: fixed
commit: b8dfe0571
severity: low
area: tooling / @nodegx/node-kit-types (drift.test.js), the kit copies of the types
found: P109 ISL-015 s11, 2026-10-03 (a red neighbour when the types package ran whole)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s11
regression: packages/nodegx-node-kit-types/tests/drift.test.js
---

P109 ISL-009 (`0951dbbe3`, s6) added `noDataAttributes?: boolean` to `ReactNodeDefinition` in
`noodl-viewer-react/src/react-component-node.ts` (Drag sets it: a node with no element of its own offers no Data
Attributes list). The published `packages/nodegx-node-kit-types/src/index.d.ts` was not changed, so
`drift.test.js` ("ReactNodeDefinition publishes exactly what the runtime declares") failed from s6 on, naming the
field. ISL-009's own runs read the viewer and the MCP, not this package.

**Fixed (s11):** the field added to the types with its sentence, and the 10 kit copies that were current re-written
from the scaffold (+5 lines each). Types package 111/111, scaffold 76/76 (its GAM-015 copies gate included).
**Lesson:** a field on the runtime's node definition is a field on a published package; run
`packages/nodegx-node-kit-types` whole after touching `react-component-node.ts`'s definition interface.
