---
id: PARKED-THREE-S1-INSTANCEID
title: A kit node under a For Each shares one node id across every row, and nothing in the kit types says so
status: open
severity: low
area: node kits / types/node-kit.d.ts (NodeInstance.id under a For Each)
found: parked THREE-IN-NODES s1, 2026-10-19
evidence: dev-docs/parked/THREE-IN-NODES.md §3 (the first drive: Mesh Count 2 where 9 were placed); dev-docs/parked/three-in-nodes/drive-2026-10-19.json
---

A kit author who keys anything by `this.id` / `props.noodlNode.id` (a registry of children, a cache, a DOM id) gets
one entry for a whole For Each: every row's instance of the node carries the SAME id, the model node's. The
`NodeInstance` type says only `readonly id: string`, and the kit README does not mention it, so the first kit that
keyed its children by node id (three-kit's Mesh, 2026-10-19) collapsed eight rows into one mesh — Mesh Count 2 where
9 were placed, every row's write landing on the same object, the last row winning.

**Where:** `library/modules/example-node-kit/project/noodl_modules/example-node-kit/types/node-kit.d.ts` `NodeInstance.id`
(:416); the viewer's instance ids come from the model, one per node, however many component instances render it.

**How to reproduce:** `scripts/devtools/drive-three-kit.js` with the fix in `library/modules/three-kit/src/kit.js`
`useSceneObject` reverted to key by `props.noodlNode.id` — ROWS fails with `meshes: 2`.

**Proposed fix (small):** one sentence on `NodeInstance.id` in node-kit.d.ts and the kit README: *"the model node's id,
shared by every row a For Each renders of this node; per-instance identity is yours to make (a ref made once per
mount)"*. Nothing in the runtime changes; a per-instance id on `NodeInstance` would be a format question for P107.
