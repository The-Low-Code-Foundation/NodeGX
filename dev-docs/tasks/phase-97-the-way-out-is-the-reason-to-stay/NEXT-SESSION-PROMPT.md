# Phase 97 — next session

**Session 9 built the data plane. `nodegx-backend migrate --to postgres://…` now takes a consistent
snapshot, creates the schema, copies every table in checkpointed batches, and then VERIFIES its own
work by reading both sides back through their adapters — and refuses to say "cut over" if anything
differs. BRG-004 is closed: AC1–AC8 green, AC9 measured. `brg-004-data-plane.test.ts` is 17/17.**

**It also found a product defect that 56/56 conformance could not see** — a `Boolean` reads `0` on
SQLite and `false` on PostgreSQL, over HTTP, in the same app. Filed as **BRG-D8** (README §9),
declared in the adapter's divergence register, and NOT silently repaired: which way the two should
agree is Richard's call.

**Where it is:** `cline-dev`, commit `<S9-COMMIT>` (s8 was `4226a6c68`).

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`noodl-mcp` — red for peers' reasons, re-measured at s9) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ all eight | ⚠️ **it has no boolean round-trip case** — BRG-D8 got past it |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | ✅ **AC1–AC8 closed, AC9 recorded** | — (§7.6's 5 GB variant, if someone wants the bigger number) |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | ✅ all but AC7 | **AC7** — `noodl-mcp` green is not this phase's to make true (§7.5) |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | ⬜ **next** | the whole task |

**Readings taken this session** (2026-09-20): `brg-004-data-plane` **17/17 exit 0**; `test:main`
**520 suites / 8292 tests exit 0**; full `nodegx-backend` **161 suites / 1920 tests, 1 failed — the
peer's new `POST admin/executions/compact` route moving BAK-009's reviewed tally 79→80**; `noodl-mcp`
**129 suites / 2193 tests, 8 suites red — the same eight as s7**, one of them failing on an untracked
peer template; `nodegx-backend` typecheck exit 0. AC9: **2,000,000 rows / 1.36 GB in 50.7 s**.

## 1. First job — BRG-006, the drive

Everything it depends on now exists. §3 of that file is the scope; the three things s9 leaves it:

1. **The PostgreSQL specs are skipped when no server is reachable** (`brg-004-data-plane`,
   `brg-005-*`, `SchemaManager.export.postgres`, `QueryBuilder.dialect`, `postgres.geo`). That is a
   hole in CI written down in four places and closed in none. BRG-006's AC is where it becomes a gate.
2. **Operator docs** — `NODEGX_STORAGE_URL`, the pool arithmetic, PgBouncer, `pg_dump`, and now
   `migrate`'s five phases and what `--resume` promises. `docs/runtime/SELF-HOSTING.md` and
   `BACKEND-OPERATIONS.md` were peer-held at s8 and s9; check before editing.
3. **Backups on PostgreSQL** — `BackupManager` snapshots a SQLite file (`engine: 'node:sqlite'`
   hardcoded). On a storage URL a scheduled backup fails at backup time, not at start. Ruling needed:
   `pg_dump` is the operator's job (recommended — say so in the docs) or the service learns it.

## 2. 🔴 Two things in the working tree that are NOT at HEAD

Unchanged from s8, and s9 added a third:

- **`packages/nodegx-backend/src/execution/ExecutionStore.ts`** — the `PgOperationalStore` wiring
  sits on the peer's uncommitted PRD-003 `close()`. Commit it once theirs lands.
- **`packages/nodegx-backend/src/server/HttpServer.ts`** — only the four-line `pool:` hunk in
  `healthBody()` is this phase's; it was committed through a temporary index at s8.
- **`packages/nodegx-backend/src/cli.ts`** — s9's `migrate` hunks were committed through a temporary
  index (the file also holds the peer's PRD-005 `--require-secrets` work). If a `git diff` on it
  looks strange, that is why: what is at HEAD is HEAD + this phase's hunks only.

## 3. What s9 settled, including where s8's handoff was wrong

- 🔴 **s8 said the migrator would copy rows with `PostgresAdapter.upsertBatch`. It must not.**
  `upsertBatch`'s update path re-stamps `updatedAt` and drops `createdAt` — correct for an app write,
  a falsification for a migration, and invisible except on the resume. The writer is
  `INSERT … ON CONFLICT DO UPDATE` over the source's own values, and a case states that property on
  its own so the swap back fails with a sentence. (BRG-004 §7.2)
- **An FTS5 index is not data.** `sqlite_master` lists the virtual table and its shadow tables; a
  migrator reading the table list copies an index as a collection. They are excluded and the field
  list is carried instead, to be rebuilt.
- **A zoneless SQLite timestamp is UTC, and PostgreSQL will not assume that.** `_Schema`'s stamps are
  written with `CURRENT_TIMESTAMP`; handed to a `TIMESTAMPTZ` as-is they shift by the server's UTC
  offset. Verify compares instants, never spellings — and the obvious "compare the first 19
  characters" repair would have passed exactly the damage AC5.4 mutates in.
- **The verifier compares RECORDS through both adapters, not SQL.** That is what found BRG-D8, and it
  is why every declared divergence is exercised by verification rather than described by it.

## 4. Richard's calls — two, neither blocking

R1–R6 stand. Outstanding:

- 🔴 **BRG-D8: which way should the two engines agree about a Boolean?** PostgreSQL's `true` is the
  better answer and SQLite's `0`/`1` is what every existing app has been reading. The repair is one
  of: teach `_rowToRecord` the declared type (changes SQLite's answers), or make the Postgres adapter
  hand back `0`/`1` (keeps the old answer, and is the wrong-looking one). Either way BRG-003 needs a
  boolean round-trip case, which is the cheap part.
- **Backups on PostgreSQL** — `pg_dump` as the operator's job, or `BackupManager` learns a database
  that is not a file.
