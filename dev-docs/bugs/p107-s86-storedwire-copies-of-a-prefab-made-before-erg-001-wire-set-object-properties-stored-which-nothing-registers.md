---
id: P107-S86-STOREDWIRE
title: Copies of the Multi Choice filter made before ERG-001 wire Set Object Properties' `stored`, which nothing registers since the rename to `done` — the filter's Selection Changed never fires
status: open
severity: medium
area: runtime / Set Object Properties (`SetModelProperties`, setmodelpropertiesnode.ts :39-50 — ERG-001 §4 renamed `stored` → `done` and migrated the shipped prefabs only); projects that imported the Multi Choice filter earlier
found: P107 NSP-020 s86 (R19 part 2's measurement over Richard's local projects), 2026-10-11
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §6.10
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
