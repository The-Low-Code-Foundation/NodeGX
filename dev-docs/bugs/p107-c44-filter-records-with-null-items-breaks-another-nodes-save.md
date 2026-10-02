---
id: P107-C44
title: A Filter Records holding null on Items crashes inside another node's save of its Class — the saving node's Error gets the message, and a Query Records listening after it misses the save
status: needs-ruling
severity: medium
area: runtime / Filter Records (`FilterDBModels`) — `cloudStoreEvents`
found: P107 (the node says what it does) s25, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.14 (row C44); graph scenarios/graph/s09-the-filter-follows.json "C44 — …"; scenarios/FilterDBModels.json "null on Items …"
---

Filter Records' save listener checks `collection === undefined` (`filterdbmodelsnode.ts` :157) and then calls
`collection.contains(…)` (:164). With `null` on Items (which `bindCollection` accepts), that throws `Cannot read
properties of null (reading 'contains')` — inside the store's event, which the adapter fires from the WRITER's success
(`RestDataAdapter.ts` :1216-1219).

**What the runtime does (measured s25, graph on the runtime target):** Filter Records (Items null, a filter, Class
Lesson, Backend `_active_`), a Query Records filtered `title = a` listening to the same store, Update Record saving r1 to
title z. The Update Record reports Done AND its Error output reads "Cannot read properties of null (reading 'contains')";
the Query Records keeps r1 (count 3). **Control** — the same graph with Items unset on the Filter Records: no Error on
the Update Record, and the Query Records drops r1 (count 2).

**Plain words:** *"A Filter Records whose Items input receives null (with a filter set) makes a save of that class, made
anywhere else in the app, show an error on the node that saved it — and a list watching the same records misses the
change."* (The throw needs: Record changes ticked, a filter, the save's class = its Class, its Backend's store.)

**Proposed:** `if (!_this._internal.collection) return;` at :157 (null and undefined alike).

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules. The spec reads null as holding nothing; the
runtime's is the known row.
