---
id: P104-BMG018-SEARCH
title: A link picker in the backend manager never finds a record older than the 200 newest, whatever is typed
status: scheduled
phase: P104
task: BMG-018 (for 0.3.1, by Richard's word)
severity: medium
area: backend / manager (link pickers)
found: P104 BMG-013 drive (Richard), s18, 2026-09-27; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-104-the-backend-manager/BMG-018-THE-SEARCH-FIELD.md §2
---

In the backend manager, typing into a Pointer or Relation field (and the filter row's *is / is not*, and
*Try it as*) searches only the 200 most recently created records. A record older than the 200th is never offered,
however exactly its name is typed. The label each record shows is also a guess: the first non-empty text field
in column order, so it changes when a field is added before it.

**Where:** `packages/nodegx-backend/src/admin/app/fields.tsx:214-216` `searchRecords()` fetches
`?limit=200&sort=["-createdAt"]` and filters in the browser. `pointerItem()` (`:203`) is the label guess.
`recordLabel()` (`format.ts:210`) is a second copy of the guess.

**Proposed:** BMG-018 owns it. A per-collection *Find records by* setting, a server-side `contains` search with
`limit 20`, and one helper that all six readers use. Its AC2 is this defect: a collection with 250 records, and
the first one found by typing its value.
