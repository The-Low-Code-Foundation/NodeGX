---
id: P78-DBT-MIGRATE
title: nodegx-backend migrate overwrites the rows of a PostgreSQL database that already holds data
status: fixed
commit: 2deb380d0
phase: P109
task: ISL-039
severity: blocker
area: backend / migrate (SQLite to PostgreSQL)
found: P78 Digital Bricks Training template, TASK-L179, 2026-09-24
evidence: templates/digital-bricks-training/docs/START-HERE.md "Putting the demo back (TASK-L179)", "On PostgreSQL" ("Measured: `migrate` does not refuse a non-empty target")
regression: packages/nodegx-backend/tests/brg-004-data-plane.test.ts "ISL-039 (P78-DBT-MIGRATE): a first run into a database that already holds rows is refused by table, before a row moves"
---

`nodegx-backend migrate --to postgres://…` into a database that already holds rows does not refuse. It replaced
the rows, and only then did its own verification fail on `_Audit` and say *do not cut over*. Whatever the target
held is gone by then.

**Where:** `packages/nodegx-backend/src/migrate/move.ts`. The copy is `INSERT … ON CONFLICT (pk) DO UPDATE SET`
over the source's values (`:186-215`), which is right for a resume and wrong for a first run into somebody's
database. The refusals before any row moves (`:346`) cover tables with no primary key, not a non-empty target. Read
at HEAD on 2026-10-01: unchanged since `f89a6a81a` (2026-09-20).

**Reproduce:** migrate a backend once, change a row in the target, then run `migrate` again without `--resume`
into the same database. The changed row is overwritten, and verification then reports differences.

**Proposed:** on a fresh (non-resume) run, refuse a target whose tables hold any row, by table name. Add a
`--into-non-empty` override only if a ruling wants one. Small.

**Fixed (P109 s41, 2026-10-10, ISL-039).** Re-measured at HEAD first: the new case was red on the old `move.ts`. A
first run (no `--resume`) into a database that already holds rows was copied over, and the row a person changed in
PostgreSQL was gone.
- A first run now asks the target which of the tables it would write exist and hold a row. If any do, it refuses and
  names them, before a checkpoint is written or a row moves. It says to point at an empty database, or to use
  `--resume` to finish an interrupted migration. No override was added: the ledger asked for one only if a ruling
  wanted it.
- Found beside it: a refused first run deleted its snapshot only when there was no checkpoint FILE. A finished migration
  leaves its checkpoint, so every refused re-run would have left a whole copy of the database in the temp folder. It is
  now keyed on "this run wrote no checkpoint". A mutant restoring the old condition is caught (one snapshot leaked).
- Two BRG-004 cases had made a first run into rows. The `updatedAt` case now re-applies every row through a resume
  whose checkpoint lost its batches (the crash it guards against). The cross-target case gets its own empty database.
  The suite is 20 / 20.
- `templates/digital-bricks-training/docs/START-HERE.md` no longer says `migrate` does not refuse.
