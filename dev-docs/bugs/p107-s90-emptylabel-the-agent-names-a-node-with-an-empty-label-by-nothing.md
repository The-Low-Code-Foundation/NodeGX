---
id: P107-S90-EMPTYLABEL
title: get_component's data flow names a node whose saved label is "" by an empty string, where the canvas shows its type's name
status: fixed
severity: low
area: agent server / `packages/noodl-mcp/src/describe.ts` (`endpoint`)
found: P107 NSP-021 s90, 2026-10-12
fixed: P107 NSP-021 s90, 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.4
commit: 97617baab
---

A node saved with `label: ""` is unlabelled to the editor: `NodeGraphNode.label` falls through to the type's
`labelForNode` on `!this._label`, so the card shows "Group", "Text", and so on. `describe.ts`'s `endpoint` read
`node.label ?? displayType ?? type`, which keeps `""`, so the agent read `" [g].boundingWidth"` in `get_component`'s
`dataFlow`. The visual tree and logic rows beside it already used a falsy check. Measured over 357 projects (258 of
Richard's, 122,451 nodes): 97 nodes, of which Text 56, Collection2 16, Group 14.

Fixed by treating an empty label as no label (`||`). `tests/nsp021EmptyLabel.test.ts` holds a no-label control and a typed
label beside it. When the old `??` is planted back, the empty-label case goes red.
