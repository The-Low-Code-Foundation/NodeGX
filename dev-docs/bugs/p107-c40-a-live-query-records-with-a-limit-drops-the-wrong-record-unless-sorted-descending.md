---
id: P107-C40
title: A live Query Records with a Limit drops the wrong record when a new one arrives, unless it is sorted descending
status: fixed
commit: 6593e7deb
phase: P109
task: ISL-029
severity: high
area: runtime / Query Records (`DbCollection2`) — keeping its rows live (`cloudStoreEvents`)
found: P107 (the node says what it does) s24, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/DbCollection2.json "Limit under an ASCENDING sort drops the record that sorts LAST: a new record that sorts first stays and pushes the last out; one that sorts last is dropped again at once (v4, C40)" (and "Limit with NO sort: … asks the backend again …")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.10 (row C40) — two hand scenarios in scenarios/DbCollection2.json, both played on the runtime
---

When another node in the app creates a record that a Query Records with **Use limit** on should show, the node adds it
and then drops one record to stay within the Limit. It drops the FIRST record unless the first sort key is descending.

**Where:** `dbcollectionnode2.ts` `_addModelAtCorrectIndex` (:301-311): `remove(get(descending ? size - 1 : 0))`. The
comment there says the end "depends on the sort direction" and that this is "preserved deliberately", but only the
descending case drops the right end.

**What the runtime does (measured s24, both scenarios pass on the runtime target):**
- sort `n` ascending, Limit 2, rows `[n1, n3]`. A record with `n0` is created: it is placed first (`[n0, n1, n3]`), then the first is dropped, which is the NEW record. Result `[n1, n3]`; the backend would answer `[n0, n1]`.
- same rows. A record with `n9` is created: it is placed last (`[n1, n3, n9]`), then `n1` is dropped. Result `[n3, n9]`; the backend would answer `[n1, n3]`.
- no sort, Limit 2, rows `[r1, r2]`. A record is created: it is appended and `r1` is dropped. Result `[r2, r4]`.
- Control: sort `n` DESCENDING, Limit 2, rows `[n3, n1]`. `n2` is created → `[n3, n2]`; `n0` → unchanged. Both right.

**Plain words:** *"A list that shows 'the first 10 by date, oldest first' gets the wrong 10 when someone adds a record in
the app: a record that belongs at the top disappears straight away, and one that belongs off the end pushes the top one
out. Lists sorted newest-first are fine."*

**Proposed:** drop the record that sorts LAST under any sort (`size - 1`), and with no sort leave the backend's order to
the next query (a re-query, as a search already does). A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; the spec states it as it is.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Drop the last; re-query if unsorted".** Under any sort the record that sorts last is dropped, so the list matches what the backend would return. With no sort the node fetches the list again, because only the backend knows its order. A small change, plus one extra request in the unsorted case. The question as asked: *"Should a limited live list drop the record that sorts last, as the backend would?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 6593e7deb (P109 ISL-029, 2026-10-06), as ruled.**
