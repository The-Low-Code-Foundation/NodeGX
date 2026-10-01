---
id: P78-DBT-MIGRATE
title: nodegx-backend migrate overwrites the rows of a PostgreSQL database that already holds data
status: open
severity: blocker
area: backend / migrate (SQLite to PostgreSQL)
found: P78 Digital Bricks Training template, TASK-L179, 2026-09-24
evidence: templates/digital-bricks-training/docs/START-HERE.md "Putting the demo back (TASK-L179)", "On PostgreSQL" ("Measured: `migrate` does not refuse a non-empty target")
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
