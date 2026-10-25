---
id: P112-OWN026-DELETELEAVESBYTES
title: A deleted record stays readable in the backend's SQLite files (the WAL and freed pages), so "delete for good" isn't
status: fixed
commit: (this session, the Beta sweep s6)
severity: medium
area: backend storage — `packages/noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts:352` (`journal_mode = WAL`; no `secure_delete`, no checkpoint after a delete), the adapter every NodeGX backend uses
found: P112 OWN-026 t2-nodegx-c10 (delete a child for good), 2026-10-23
regression: packages/nodegx-backend/tests/p112-own026-delete-leaves-no-bytes.test.ts "a deleted record’s value is in no file of the data folder, while the backend runs"
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

**Fixed (the Beta sweep s6, 2026-10-25), as proposed.** `LocalSQLAdapter`: `PRAGMA secure_delete = ON` at connect,
and `_checkpointAfterDelete` (`wal_checkpoint(TRUNCATE)`) wherever a delete is known committed: the post-commit change
tap, once per delete, or once per transaction that held any. A checkpoint that cannot run is said once in the log and
left for the next. `docs/runtime/SCALING.md` says what it costs.

**Graded.** `tests/p112-own026-delete-leaves-no-bytes.test.ts` 3/3 on a real backend (a plain collection, a searchable
one, and the files after the backend stops): red 3/3 at HEAD (`data/local.db-wal`: 6), with the control beside it (the
value is in the files while the record exists). Each half is needed alone: without `secure_delete` the value is in
`data/local.db` (2) after the checkpoint; without the checkpoint, in the WAL (4). Runtime SQL adapter specs 129/129,
backend suites that delete or back up 54 suites 758/758, runtime tsc clean.

**Not covered:** a backup or a deploy copy taken BEFORE the delete still holds the row (it is a copy). PostgreSQL is
the server's own storage, not changed here. The search index let the value go in the arm measured (FTS5 with
`secure_delete`); a long-lived index after many merges is not measured.
