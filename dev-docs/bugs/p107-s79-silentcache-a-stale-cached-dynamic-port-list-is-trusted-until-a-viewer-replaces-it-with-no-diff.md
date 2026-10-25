---
id: P107-S79-SILENTCACHE
title: A node's cached dynamic ports are trusted as real until a viewer connects, and then replaced with no diff — a wire to a port that no longer exists is found only by the health check, after the fact
status: fixed
severity: medium
area: editor / dynamic ports cache (`NodeGraphNode.ts` `setDynamicPorts` :883-929, `getPorts` :505-566; `validation/normalize.ts` :67-70; `ProjectExporter.ts` :238-240)
found: P107 NSP-020 s79, 2026-10-10 — measuring how the editor learns ports before designing `ports(params, context)`
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §3.1 (c) and "Rows found by the measurement"
kit: project-contract
regression: packages/noodl-editor/tests-unit/p107-s79-silentcache.test.ts "the first list a viewer announces drops a wired port: a warning on the node names it, and the console logs the diff"
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

**Fixed short of NSP-020 (the Beta sweep s9, 2026-10-25), as the row's last sentence asks.** A node read from the
project with a non-empty `dynamicports` is marked as holding the file's list (`_portsFromFile`, set in `fromJSON`).
The first `setDynamicPorts` after that, from a viewer or an editor-side adapter, is diffed against it
(`models/nodegraphmodel/portsReplaced.ts`): dropped names (renames excluded) and ports whose type name changed are
logged (`[ports] <type> <id>: the preview replaced the ports saved in the project. Dropped: …`), and a wired port that
went, or now carries another type, raises `node-ports-replaced` on the node: *"The preview replaced the ports this node
was saved with. This port is gone but still wired: title."* It is re-read in `evaluateHealth`, so it clears once the
wire is deleted or the port is back. Later replacements (a person's own edit) are not diffed: they caused it, and the
wire's own error already shows.

**Left, NSP-020's:** the cache is still trusted until something announces ports, and two editors can still write
different `dynamicports`. `ports(params, context)` from the spec is that task's fix.

Graded: `tests-unit/p107-s79-silentcache.test.ts` (the pure diff and the real `NodeGraphNode` with WarningsModel and
capability gating mocked) red 2 of 9 on HEAD's `NodeGraphNode.ts` (the two node arms) → 9/9; mutant "diff every
replacement" reddens the edit arm. The 20 unit suites that touch `NodeGraphNode`/`setDynamicPorts`: 724/727, the 3 in
`see-001/honestyView` red identically on HEAD (P111-SEE001-HONESTYFIXTUREDRIFT territory). Editor tsc clean. **Not
driven** in the Electron editor.
