---
id: P107-S80-BACKENDPICKER
title: The Backend picker is drawn from the project's backend list, which no PortContext field carries — no spec can draw it
status: fixed
severity: medium
area: nodegx-node-spec/src/spec.ts `PortContext` (:730-767) against noodl-runtime/src/nodes/std-library/data/record-ports.ts `recordBackendPickerPorts` (:119-121) / schema-ports.ts `backendPickerPorts` (:546-571)
found: P107 NSP-020 s80 (L4, the module table), 2026-10-11 — oracle (a) drove Sign File URL and Upload File with a project holding two backends
evidence: packages/noodl-runtime/test/node-spec/nsp-020-module-table.ts (the `Sign File URL` and `Upload File` rows, case "a project with two backends"); NSP-020 §6.3
kit: node-spec
commit: 27aa07374
regression: packages/noodl-runtime/test/node-spec/nsp-020-module-table.ts
---

With two or more backends in the project (`backendServices` metadata), every node that reads a backend announces a
`backendId` input — "Backend", an enum of `Active Backend` plus each backend by id, default `_active_`, group General
(schema-ports.ts :546-571, shown only when there is more than one: `hideWhenSingleBackend`, record-ports.ts :119-121).
Sign File URL (signfileurl.ts :350-360), Upload File (uploadfile.ts :426-438), and the Record family
(dbcollectionnode2.ts :1275-1276, dbmodelnode2.ts :552-555, filterdbmodelsnode.ts :645-646, subscribetochanges.ts
:605-608, dbmodelcrudbase.ts) all do.

An editor has the backend list without a viewer — it is project metadata — but `PortContext` (task §3.1 decision 2) has
no field for it: `schema` is one backend's classes, not the list of backends. So no spec can say "this node has a Backend
input when the project has two backends", and `portsOf` under-draws every one of these nodes in a multi-backend project.
NSP-020 §6.1: "a new field is a row" — this is that row.

**What a person sees:** nothing yet — the editor still gets the port from a running viewer. What breaks is the promise
of NSP-020 AC1/AC3: the MCP server's per-instance ports and any viewer-less editor miss the Backend input, so an agent
cannot pick a backend on a Record node it builds.

**Fix (a format change — NSP-020's to make, not a lane's):** a `backends?: readonly { id: string; name: string }[]` field
on `PortContext` (with `PORT_CONTEXT_FIELDS`), filled by L5's `portContextFor(project, nodeId)` from `backendServices`,
and a shared `backendPicker(context)` the affected specs spread into `derived.inputs` with `needs: ['backends']`. Then the
two pins in the module table go stale and are removed. L1 should know before it settles the Record family's `needs`.

**Fixed in NSP-020 s82 (§6.6, piece 1):** `PortContext.backends` (`{ id, name }[]`, in `PORT_CONTEXT_FIELDS`) and
`backendPickerPort(context)` in `record-base.ts` — an enum of `_active_` then each backend's id, default `_active_`, group
General, drawn only with two or more backends (record-ports.ts :119-121). DbModel2 spreads it into `derived.inputs` with
`needs: [... 'backends' ...]`; oracle (a)'s fake graph model answers `backendServices` from `context.backends`, and the
DbModel2 row grades both cases (`regression:` above — the cases "a project with two backends" and "a project with one backend draws no picker"). The two pins on Sign File URL and Upload File stayed until those specs spread the same
helper — **done in s84**: both spread `backendPickerPort`, the pins are gone, and both rows grade the two-backend and
one-backend cases; so do every L1 row that reads a backend (the Record CRUD five, Query / Filter / Subscribe, User and Set
User Properties). L5's `portContextFor` fills the field from `backendServices`.
