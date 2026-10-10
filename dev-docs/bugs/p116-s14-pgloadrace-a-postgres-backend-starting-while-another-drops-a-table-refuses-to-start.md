---
id: P116-S14-pgloadrace
title: A PostgreSQL backend that starts while another backend on the same database drops a table refuses to start
status: fixed
commit: f1b60a4d9
severity: high
area: runtime / PostgreSQL schema manager (`noodl-runtime/src/api/adapters/postgres/PgSchemaManager.ts` `load`)
found: P116 ONT-007 s14, 2026-10-10 (grading P116-ONT-007-junctions: `brg-005-conformance-postgres` failed to open a run's adapter)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.13
regression: packages/nodegx-backend/tests/p116-pg-load-race.test.ts
---

Two backends share one PostgreSQL database (a restart that overlaps, or two processes). One deletes a collection with
a Relation field while the other starts. The starting one fails, with `PostgresConnectionError: Could not open the
PostgreSQL database … no such table: _Join_…` or `… could not open relation with OID …`, and comes up `failed`.

Where: `load()` lists the tables from `information_schema`, then reads the columns, `_Schema`, the indexes
(`pg_get_indexdef` through `pg_indexes`), the checks, and each junction's rows, all in separate statements. A table
dropped between the listing and a later read breaks that read. The schema manager drops on its queue, so the window
is real even within one process's tests: `brg-005-conformance-postgres` opens a new adapter per run, and a run that
ended with a drop still queued failed the next run's open.

Reproduce (deterministic, the regression): a second connection holds `BEGIN; DROP TABLE "_Join_tags_Post"` while a
backend starts, then commits. The listing still sees the junction, its read waits on the lock, and the commit fails
it. First a per-junction catch was tried: it then failed one statement earlier, on `could not open relation with
OID`, so the whole load is the unit.

Fixed: `load()` reads again from an empty model, up to five times, only on those two errors (`42P01`, and `XX000`
with "could not open relation with OID"). Once the drop is committed the catalog is whole.
