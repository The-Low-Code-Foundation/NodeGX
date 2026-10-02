---
id: P107-C39
title: A Query Records filter script that throws before calling where() fetches every row, as a Success
status: needs-ruling
severity: high
area: runtime / Query Records (`DbCollection2`) — the Javascript filter
found: P107 (the node says what it does) s23, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.8 (row C39) — the same six-arm probe as C38
---

A Query Records filter script that throws before it calls `where(…)` fetches every row in the class, and reports it as a
Success.

**Where:** `dbcollectionnode2.ts` `getStorageFilter` (:1079-1089): the script runs inside `try { … } catch (e) {
console.log(…) }`; a throw leaves `_neutralFilter` undefined and `_filter` `{}`, and the function returns them as the
filter. FLD-008 closed exactly this widening for the `error` CALLBACK route (`_filterFailed`, :1087) — "a query whose
filter could not be translated then fetched every row in the collection" — but not for a THROW.

**What the call shows (measured s23):** script `nope(); where({ title: { equalTo: 'a' } })` → the call is `query({
collection: 'Lesson', sort: [] })` — no `where` — the rows come back, Success fires. Control beside it: the same script
without `nope();` sends `where: { title: { equalTo: 'a' } }`.

**Plain words:** *"If a Query Records filter script crashes before it sets the filter — a typo in a variable name, say —
the node fetches EVERY record in the class and reports success, instead of saying the filter failed."*

**Proposed:** a throw in the script is a filter failure (`{ failed: <the message> }`), as FLD-008 made the error callback.
A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules.
