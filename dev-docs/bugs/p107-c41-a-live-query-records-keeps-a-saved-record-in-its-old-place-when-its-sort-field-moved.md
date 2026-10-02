---
id: P107-C41
title: A live Query Records keeps a record in its old place when another node saves it with a different sort value
status: needs-ruling
severity: medium
area: runtime / Query Records (`DbCollection2`) — keeping its rows live (`cloudStoreEvents`)
found: P107 (the node says what it does) s24, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.10 (row C41) — the hand scenario "a member whose sort key moved keeps its place", played on the runtime
---

When another node saves a record that a Query Records already shows, and the record still matches the filter, the node
leaves it where it was, even when the field the list is sorted by has changed. The list is then out of order until
something re-runs the query.

**Where:** `dbcollectionnode2.ts` `cloudStoreEvents` (:330-349): a `save` only removes a member that stopped matching, or
adds a record that started matching. A member that still matches is not moved.

**What the runtime does (measured s24):** sort `n` ascending, rows `[r1 (n 1), r3 (n 3)]`. `r1` is saved with `n 9` →
Items stays `[r1, r3]`, with no output re-sent; the backend would answer `[r3, r1]`.

**Plain words:** *"If someone changes the date on a record in a list sorted by date, the record stays where it was in the
list instead of moving to its new place, until the page reloads the list."*

**Proposed:** on a `save` of a member that still matches, take it out and put it back at its sorted place (the same
`_addModelAtCorrectIndex`). A behaviour change; ships with C40 if both are ruled together.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; the spec states it as it is.
