---
id: P107-C23
title: Parent Component Object binds the GRANDPARENT's object when the parent's Component Object is created after the child
status: needs-ruling
severity: high
area: runtime / Parent Component Object (viewer)
found: P107 NSP-015 s15, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6
---

A Parent Component Object (blank Parent Component = "the nearest one that has a Component Object")
inside a Row, in a Page, in a Shell, where Shell and Page each have a Component Object: if the
Page's Component Object is created AFTER the Row instance, the Row's node reads and writes the
SHELL's record for good. Measured: Page's object set to 7 → the node says nothing; Shell's set to 8
→ the node reads 8 and fires Changed. Same graph with Page's object created first (the control):
the node reads Page's record.

Reachable in an app: `NodeScope.setComponentModel` creates nodes in `Object.values(componentModel.nodes)`
order (componentmodel.ts :132, the editor's insertion order) and builds a child instance's whole graph
when it is created — so "place the Row, then add the Component Object" is this order. No error, no
warning: the binding is wrong, not missing.

Where: `packages/noodl-viewer-react/src/nodes/std-library/componentutils/parentcomponentobject.ts`
`initialize` → `updateComponentState()` walks at creation, when the Page's object does not exist
yet, and finds the Shell's. The deferred re-walk in `nodeScopeDidInitialize` runs only
`if (!this._internal.modelId)` — so it fixes "found nothing" (the case NDA-015 §3 reasoned about)
but not "found the wrong one". The `componentStateNodesChanged` re-walk is editor-only (`setup` returns
unless `isRunningLocally`) and fires on node add/remove edits, never at load. Set Parent Component
Object Properties resolves at each Do (after the frame), so it writes the PARENT's record — the pair
then reads one record and writes another.

Reproduce: `packages/nodegx-node-spec/scenarios/graph/t09-component-object.json`, "Parent Component
Object created BEFORE its parent's Component Object …" (row C23) beside the control scenario before it.

Proposed: in `nodeScopeDidInitialize`'s deferred callback, re-resolve unconditionally (drop the
`!modelId` guard) and rebind when the id differs — the same comparison `onComponentStateNodesChanged`
already makes.
