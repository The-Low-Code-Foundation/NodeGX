# Phase 97 — next session

**Session 8 built the adapter. `PostgresAdapter` and `PgSchemaManager` pass BRG-003's conformance suite
56/56 on a real PostgreSQL 16.11, all six mutants are caught by six distinct case sets, the real service
boots on `NODEGX_STORAGE_URL=postgres://…`, `/health` carries the pool, and `stop()` drains it.
BRG-005 has one criterion open — AC7's sweep — and BRG-D6 is closed.**

**On the way it found the seam's second synchronous half** — `IStorageSchema` — and served it from a
per-process model with queued DDL rather than pretending. That is filed as **BRG-D7** (README §9) and
declared as three divergences, not hidden.

**Where it is:** `cline-dev`, commit `4226a6c68` (s7 was `afead5e9d`).

## The board, re-derived from the task files

| task | state | what is left |
|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) the interface | ✅ | — |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) the holes | ✅ | AC7 (`noodl-mcp` — red for a peer's reason, measured at s7) |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) the suite + gate | ✅ all eight | — |
| [BRG-004](BRG-004-THE-MIGRATOR.md) the migrator | 🏗 export half + carry report | **AC5 AC6 AC9** — the data plane exists now; nothing is in front of them |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) the adapter | ✅ **AC1 AC2 AC3 AC4 AC5 AC6 AC8 AC9** | **AC7's sweep** (§1) and §7.4's owed list |
| [BRG-006](BRG-006-THE-DRIVE.md) the drive | ⬜ | — |

**Readings taken this session** (2026-09-19): `brg-005-conformance-postgres` **13/13 — 56 cases passed,
0 failed, 0 skipped**; mutants caught by 11 / 3 / 2 / 3 / 2 / 1 cases; `brg-005-service-postgres` 3/3;
`brg-005-operational-store-postgres` + `brg002-operational-store` **36/36** on one shared runner;
runtime adapter specs **292/292** (was 287; 5 new both-engine cases); phase backend specs **50/50**;
`service-http` + `idempotency-store` 44/44; `typecheck:runtime` / `nodegx-backend` / `backend-tests` /
`contract` **all exit 0**.

## 1. First job — AC7's sweep, before anything new

🔴 A peer held two jest runs, a `tsc` and three webpack builds for the whole of s8, so nothing wide was
run ([[do-not-pile-cpu-work-on-a-shared-box]]). Before any build work:

1. `dev:stop --list`, then `ps` for `jest|webpack|tsc` — wait if a peer suite is up.
2. `npm run test:main` (8223 at s7; exit 0 is the gate — read the DURATION).
3. `noodl-mcp` (8 suites red at s7 for a peer's reason — re-measure with HEAD restored by `cp` if red).
4. The full `nodegx-backend` suite, once the peer's `src` edits have landed (twelve+ files were live).

Then record the three numbers in BRG-005 §7 and close AC7 — or record which red is whose.

## 2. Second job — BRG-004's data plane (AC5 verify, AC6 resume, AC9 5 GB)

The four phases that move data were all waiting on a driver and an adapter. Both exist. The migrator
opens `PgConnectionPool` + `PgSchemaManager` on `--to`, applies `tableDDL` (already its own generator),
and copies rows with `PostgresAdapter.upsertBatch` — one transaction per batch, the shape BRG-002 made.
`_Schema` and `_SearchIndex` are TEXT-JSON on both engines by design so the meta rows copy verbatim.

## 3. 🔴 Two things in the working tree that are NOT at HEAD

- **`packages/nodegx-backend/src/execution/ExecutionStore.ts`** — the `PgOperationalStore` wiring and
  the `close()` call sit on the peer's uncommitted PRD-003 `close()` method, so the hunk has no HEAD
  context and could not be committed alone. Commit it after theirs lands. The boot spec is green
  against the working tree.
- **`packages/nodegx-backend/src/server/HttpServer.ts`** — only the four-line `pool:` hunk in
  `healthBody()` is this phase's; the rest of that file's diff is the peer's. It was committed through a
  temporary index; check `git show HEAD --stat` shows the file with **+4** and nothing else.

## 4. What s8 settled

- **The order §6.2 gave was right, and the seam held.** Nothing in `QueryBuilder` needed a third
  translation site beyond the two the first conformance run found (`$in: []` → `FALSE`, `LIKE` → `ILIKE`),
  both armed on both engines in `QueryBuilder.dialect.test.js`.
- **DDL has one source** (`postgres/ddl.ts`), the shared schema vocabulary is `schemaCommon.ts`, and the
  BRG-004 export specs did not change by a byte.
- **The model + queue is the honest shape for a synchronous schema interface on a socket** — and the
  honest fix is to de-synchronise it (BRG-D7). Six callers. Not this session's: a peer was live in that
  package throughout.
- **`Object.create` wrappers split state on assignment.** `conformance/mutants.ts` wraps the schema
  manager that way; `PgSchemaManager` keeps every mutable field in one `this.s` object for that reason.
  A second adapter that forgets this passes the plain run and fails the `ignore-unique` mutant strangely.

## 5. Richard's calls — none outstanding

R1–R6 stand. Two things are worth a sentence from him when convenient, neither blocking:
- BRG-D7's owner — BRG-006, or a task of its own.
- Backups on PostgreSQL — `pg_dump` is the operator's job (recommended, say so in the docs) or the
  service's `BackupManager` learns a database that is not a file (BRG-005 §7.4).
