---
id: P112-OWN026-DELETELEAVESBYTES
title: A deleted record stays readable in the backend's SQLite files (the WAL and freed pages), so "delete for good" isn't
status: open
severity: medium
area: backend storage — `packages/noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts:352` (`journal_mode = WAL`; no `secure_delete`, no checkpoint after a delete), the adapter every NodeGX backend uses
found: P112 OWN-026 t2-nodegx-c10 (delete a child for good), 2026-10-23
evidence: own026-grades/t2-nodegx-c10/grade.json C10.2 — after the app's delete, the rows are gone (404, empty queries, a logical dump of local.db has 0 matches) but `data/local.db-wal` still held the child's name 25 times
---

The backend opens SQLite in WAL mode and doesn't turn on `secure_delete` or checkpoint after a delete. A deleted row's
bytes stay in `local.db-wal` until a checkpoint, and in the database's free pages until SQLite happens to reuse them.
So an app that offers "delete for good" (a child's data, an account, anything a person may ask to be erased) leaves
it readable to anyone with the backend's folder, a backup of it, or a copy shipped with a deploy. The app can't fix
this from the graph: it's the platform's storage.

In OWN-026 the grader read the raw files and failed C10.2 ("its name is no longer anywhere in the stored data") on
the WAL alone. The app's own delete was complete.

Likely fix: `PRAGMA secure_delete = ON` at connect (deleted content is overwritten with zeros, at a small write
cost), and a `wal_checkpoint(TRUNCATE)` after a delete batch, or on a short timer, so the log doesn't carry the old
pages. Test: create a record with a distinctive value, delete it, then the bytes of every file in the data folder
don't contain the value. Check the backup and export paths for the same.
