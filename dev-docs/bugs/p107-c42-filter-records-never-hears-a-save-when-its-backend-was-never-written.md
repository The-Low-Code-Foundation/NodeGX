---
id: P107-C42
title: Filter Records never re-filters when another node saves a record, unless its Backend picker was written — and that picker is hidden when the project has one backend
status: needs-ruling
severity: high
area: runtime / Filter Records (`FilterDBModels`) — `cloudStoreEvents`, `bindStoreEvents`
found: P107 (the node says what it does) s25, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.14 (row C42); graph scenarios/graph/s09-the-filter-follows.json (the row and its control); scenarios/FilterDBModels.json "C42 — …"
---

Filter Records re-runs when a record it holds is saved somewhere else in the app (its `Record changes` box, on by
default). It only hears saves on the store it is bound to, and it binds the LEGACY store at creation
(`filterdbmodelsnode.ts` :172); only a write to its `Backend` input moves it (:547-553). The editor hides that picker when
the project has one backend (`recordBackendPickerPorts` → `hideWhenSingleBackend: true`), so on such a project nothing
ever writes it.

**What the runtime does (measured s25, graph on the runtime target, a project with its backend under `backendServices`
— the world's, a Directus-type entry):** Query Records → Filter Records (filter `title = a`, rows r1 a, r2 b, r3 a: 2
shown). Update Record saves r1 with title z. With Backend unwritten, Filter Records still shows 2 rows, r1 among them.
**Control** — the same graph with Backend written `_active_` (or `main`): it re-runs and shows 1. The pair differs in
that one parameter.

Not measured: a project on the legacy `cloudservices` endpoint alone (there the legacy store IS the store the writers
use, `CloudStore.forBackend` :509-536, so it should hear), and a NodeGX-type `backendServices` entry other than
`_endpoint_` (a separate store, so it should not).

**Plain words:** *"A filtered list built on Query Records goes stale when someone edits a record in the app: the edited
record stays in the filtered list even though it no longer matches. It only works if you pick the Backend on the
Filter Records node — and with one backend that picker isn't shown."*

**Proposed:** resolve the store the same way Query Records does at each run (the active backend's when Backend is
unset), rather than the legacy store; or bind at creation to `CloudStore.forBackend(scope, '_active_')`.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; the spec states it as it is.
