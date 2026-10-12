---
id: P107-S79-SILENTCACHE
title: A node's cached dynamic ports are trusted as real until a viewer connects, and then replaced with no diff — a wire to a port that no longer exists is found only by the health check, after the fact
status: open
severity: medium
area: editor / dynamic ports cache (`NodeGraphNode.ts` `setDynamicPorts` :883-929, `getPorts` :505-566; `validation/normalize.ts` :67-70; `ProjectExporter.ts` :238-240)
found: P107 NSP-020 s79, 2026-10-10 — measuring how the editor learns ports before designing `ports(params, context)`
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §3.1 (c) and "Rows found by the measurement"
kit: project-contract
---

The editor keeps the ports a viewer last announced for a node in the project file (`dynamicports` on the node;
`components/<Name>/nodes.json` in the v2 layout, written only when non-empty, `ProjectExporter.ts` :238-240). On
open, without a viewer, that list IS the node's ports: `getPorts` merges it over the static list (:505-566), the
validator reads it as real (`normalize.ts` :67-70, `rules/nonexistentPort.ts` :6), and the canvas draws wires to it.
When a viewer connects and announces a different list, `setDynamicPorts` (:883-929) **replaces the whole list
silently** — no diff, no warning, no record of what was dropped. The only downstream sign is
`evaluateConnectionHealth` raising "Source/Target port doesn't exist" on a wire left dangling (`NodeGraphModel.ts`
:921-933).

**When a person meets it:** a project edited where the backend schema, a popup's Results, a Page's parameters or an
Event Sender's channel changed without a viewer running (the MCP server, a kit editor, a merge, a hand edit) opens
looking right, and then the first preview tears a wire — or, for a port the new list still names but with another
type, tears nothing and carries the wrong type on.

**Why it matters to the packages:** two editors writing the same project must write identical `dynamicports`, or the
P112 editor suite's field-by-field compare (`@nodegx/project-contract/editor-suite/compare.ts` :100-112) reads them
as disagreeing — the cache is the first place a second editor and this one differ. `dynamicports` is also excluded
from the merge's soft-equal (`utils/projectmerger.nodeequals.js` :5), so a merge never sees the drift either.

**Fix (NSP-020's shape, not this row's):** `ports(params, context)` from the spec gives an editor the list WITHOUT a
viewer; the cache becomes a thing to CHECK against it (the task's cache drive over the templates) and, once the spec
is the source, a thing to stop writing. Short of that: when `setDynamicPorts` replaces a non-empty list with a
different one, log the removed names and warn on any that had a wire — a diff where today there is none.
