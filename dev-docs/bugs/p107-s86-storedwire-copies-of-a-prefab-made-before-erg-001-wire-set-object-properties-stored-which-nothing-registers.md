---
id: P107-S86-STOREDWIRE
title: Copies of the Multi Choice filter made before ERG-001 wire Set Object Properties' `stored`, which nothing registers since the rename to `done` — the filter's Selection Changed never fires
status: fixed
commit: PENDING
severity: medium
area: runtime / Set Object Properties (`SetModelProperties`, setmodelpropertiesnode.ts :39-50 — ERG-001 §4 renamed `stored` → `done` and migrated the shipped prefabs only); projects that imported the Multi Choice filter earlier
found: P107 NSP-020 s86 (R19 part 2's measurement over Richard's local projects), 2026-10-11
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §6.10
kit: core
regression: packages/noodl-runtime/test/corpus/p107-s86-stored-wire.test.ts "fires on Do, as the `done` it was renamed to does"
---

In all 22 copies of CMG Drive Looks, `/Filters/Multi Choice/Item` wires `stored` on a Set Object Properties into its
Component Outputs' `Selection Changed`. ERG-001 renamed that output `done` and migrated the seven wires in
`library/prefabs`; a project that had imported the prefab before keeps `stored`, and the runtime registers no such
port (no alias, no load migration — searched). So `Selection Changed` never fires, and the For Each that lists the items
types it `*` (nothing typed wires into it), which is why the same projects also wire `itemOutputSignal-Selection Changed`
where an editor draws `itemOutput-Selection Changed`.

The class is [[a-rename-of-a-built-in-port-ships-no-migration]]: a port renamed in the runtime with no migration for
projects that already wire it. R19's wire check now says so at the next agent write or validate (`SetModelProperties has
no output named "stored" with its settings in this project.`). Fix options for whoever schedules it: a load migration
`stored` → `done` on Set Object Properties (and ERG-001's three other renamed "Done" names), or an alias the runtime
registers.

**Plain words:** *"In an app that added the Multi Choice filter before September, ticking a filter choice never tells
the page the selection changed."*

**Fixed (the Beta sweep s8, 2026-10-25).** Not only Set Object Properties: the node catalog before ERG-001 (7cb235279)
against today's lists 41 renamed outputs on 39 types (`success` → `done` on the user, navigation and HTTP nodes,
`stored` → `done` on the Record and Object writers, the Variables' `stored` → `completed`, Send Email's `failed` →
`failure`, Open File Picker's `cancelled` → `unchanged`). One table, `@nodegx/project-contract/renamed-ports`, read by:
the runtime (`NodeScope.addConnection`/`removeConnection` connect a wire from a port the node lacks to the name it
became, so every running app follows an old wire: editor viewer, preview, deployed, cloud); the editor's `applyPatches`
(moves the wire on open, so the canvas draws it and the next save writes it); and `nonexistentPort` (an agent writing
an old name is refused with "It was renamed \"done\" in August 2026: wire \"done\"" and `done` suggested). Not
mappable by name, left: Run Tasks' old `done` (now `completed`) and Set Global Store's / Action Dispatcher's old
`completed`, names ERG-001 reused. The exporter (lane 4, paused) does not read the table: an exported old wire is
still dropped. Graded: runtime corpus red 3/5 on HEAD → 5/5, a mutant in `removeConnection` red; contract 89/89 (every
new name a catalog output, no old one); editor load + diagnostic 6/6, viewer corpus 63/63 (an ES5 Set spread in the table module had broken every viewer suite that loads the runtime; caught here and removed); mcp NSP-020 4/4.

Census with the table (in memory, nothing written) over the 54 `project.json` under `NodeGX test projects`: 6 projects
carry **367** such wires, all dead until now — TVW-006 s18 Perf 247, def036-dash-drive 96, four TVW drives 6 each;
most are Create New Record `created` (111), Set Record Properties `stored` (68), Cloud Function `success` (52).
