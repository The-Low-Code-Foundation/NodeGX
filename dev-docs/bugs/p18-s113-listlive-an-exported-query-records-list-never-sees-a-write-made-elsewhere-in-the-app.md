---
id: P18-S113-LISTLIVE
title: An exported Query Records list never sees a create, save or delete made elsewhere in the app
status: open
severity: medium
area: export / Query Records
found: P18 session 113, 2026-10-15, closing P18-S111-RECORDLIVE (its sibling, one node over)
evidence: noodl-runtime dbcollectionnode2.ts `bindStoreEvents` (create / save / delete handlers); nodegx-export component.ts — a query's list is `useState<T[]>([])` written only by its own read
---

A page lists records with Query Records; a form elsewhere in the app creates, renames or deletes one. In the running
app the list follows at once: Query Records listens to the store's `create`, `save` and `delete` events
(dbcollectionnode2.ts `bindStoreEvents`) and adds a new record that matches its filter at its sorted place, drops one
that no longer matches or was deleted, and moves one whose sort field changed (P107-C41). Its rows are the shared
records themselves (`Model.get(id)`), so a changed field shows in the row too.

In the exported app the list is component state (`useState<T[]>([])`) written only by the query's own read, so it
keeps what it read until the query runs again.

P18-S111-RECORDLIVE gave the exported client one copy of each record (`subscribeRecord`), which carries the field half
for a Record. The list half needs the store's events in the client (create / save / delete, with the query's filter
and sort applied in the browser, as `QueryUtils.matchesQuery` and `compareObjects` do in the runtime), so it is its own
change.
