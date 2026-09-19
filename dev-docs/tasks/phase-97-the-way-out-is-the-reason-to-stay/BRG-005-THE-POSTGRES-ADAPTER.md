# BRG-005 — The Postgres adapter

**Status: ⬜ Not started. Needs BRG-001 and BRG-003. Gated on R5.**

## 1. The person sentence

**The same backend — the same workflows, the same cloud functions, the same triggers, the same
node graph — runs on Postgres, because the only thing that changed was which file opened the
database.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| reading | where |
|---|---|
| The adapter stack is 4,383 lines over 6 files: `LocalSQLAdapter` 1,373, `QueryBuilder` 1,230, `SchemaManager` 1,312, `engine` 261, `sqlFunctions` 185, `index` 22 | `local-sql/` |
| `engine.ts` already resolves an engine at runtime — `node:sqlite` preferred, `better-sqlite3` as a legacy fallback, wrapped by `wrapNodeSqlite` into one shape | `local-sql/engine.ts`; `createAdapter.ts:9-17` |
| `QueryBuilder` reads live columns from `PRAGMA table_info`, not from `_Schema` — the docstring is emphatic that these are not interchangeable | `LocalSQLAdapter.ts:675-692` |
| SQLite-specific by construction: `json_extract` for ACLs and GeoPoint boxes, FTS5 `MATCH`, and the hand-written `SQL_DISTANCE_KM` / `SQL_POINT_IN_POLYGON` / `SQL_REGEXP` user functions | `QueryBuilder.ts:241, 586-587`; `sqlFunctions.ts` |
| `node:sqlite` is synchronous by nature; `AdapterFacade` already wraps the callback API into promises | `AdapterFacade.ts:1-21` |

## 3. Design

### 3.1 Scope

A `PostgresAdapter` implementing `IStorageAdapter` / `IStorageFacade` / `IStorageSchema` from
BRG-001, plus `IOperationalStore` from BRG-002. **Done is defined by BRG-003 going green**, and by
nothing else. That is the whole reason BRG-003 comes first: without it, "the adapter works" is an
opinion.

### 3.2 The four real translation jobs

| SQLite today | Postgres | note |
|---|---|---|
| `json_extract(col, '$.k')` for ACL predicates and GeoPoint boxes | `col -> 'k'` / `jsonb_path_query` over `JSONB` | the ACL predicate is the highest-stakes line in the file; BRG-003 §3.2 gates it adversarially |
| FTS5 virtual tables + `MATCH` | `tsvector` + GIN, or `pg_trgm` | ranking will differ. **Declare `degraded` with a reason** (BRG-003 §3.4); do not pretend |
| `SQL_DISTANCE_KM`, `SQL_POINT_IN_POLYGON`, `SQL_REGEXP` as registered user functions | `earthdistance`/PostGIS, `ST_Contains`, `~` | BRG-D5 is unverified: **measure** whether a bare `POINT` answers these before assuming PostGIS is optional |
| `PRAGMA table_info` for live columns | `information_schema.columns` | `LocalSQLAdapter.ts:675-692` names this as a trap; the substitution is per-call and must keep the same `undefined`-means-no-substitution semantics |

### 3.3 What gets easier, not harder

Postgres removes work the SQLite adapter had to do by hand: real `NUMERIC` and `TIMESTAMPTZ`
instead of type affinity, real unique constraints instead of query-then-insert, `ON CONFLICT` for
FED-002's upsert, real `RETURNING`, and `LISTEN/NOTIFY` as a future change tap. The port is not
1,373 lines of equivalent difficulty.

### 3.4 What it explicitly does not do

It does not make the app tier replicable. The `ChangeBus` still taps **this process's** adapter
events, the scheduler still fires in one process, and the rate limiter is still in memory
(README §3). One app process, a real database behind it. `LISTEN/NOTIFY` makes the multi-process
version *possible* later; it is not in this task.

### 3.5 Connection handling

A pool, sized from config, with the pool's saturation exposed on `/health` alongside the existing
persistence status. The single most common way a migration like this disappoints is an
under-configured pool being blamed on the database.

**Sized deliberately, and the arithmetic published.** Raised 2026-09-19 by a peer session from a
survey of n8n field reports, where exhausting `max_connections` because every process opens its own
pool is the *second* most common production failure. The ask, and it is cheap only while this task
is unwritten:

- a **conservative default**, not the library's;
- the formula stated where an operator reads it — `replicas × pool_size ≤ max_connections −
  headroom`, with the headroom named (superuser slots, `pg_dump`, the migrator's own connection
  during BRG-004);
- **PgBouncer** guidance, including the one thing that bites: transaction-mode pooling does not
  carry session state, so anything this adapter does with session-scoped settings has to be stated
  or avoided.

⚠️ **The formula's `replicas` term is where this task touches the phase's honesty problem.** The
published claim (R2) is *"one app process, a real database behind it"*, so `replicas` is 1 — and
writing the formula with a replicas term in it is the first place a reader could infer otherwise.
It is written as a formula anyway because an operator running two processes *deliberately* needs the
arithmetic; what BRG-006 must not do is present that as supported. See README §3 and §6.

🔴 **There is a SECOND pool and it has no shutdown, which BRG-D6 filed 2026-09-19 (BRG-002 §7.5).**
`IOperationalStore` gets its own Postgres implementation — CWF-016's claim table is not a user
collection and does not travel through the adapter facade — so this task opens a pool there too.
And there is **nowhere to release either of them**: `ExecutionHistory` has no close method and
`BackendService.stop()` does not release `executions.sqlite`'s handle, because on SQLite process
exit does it for free. `IOperationalStore.close()` was written at BRG-002 and **taken back off**
for exactly that reason — no caller. So this task owes the method *and* the shutdown path that
calls it, and the shutdown path is the part that does not exist yet.

## 4. Acceptance criteria

1. **AC1** — `runConformance()` is green against `PostgresAdapter`, including every ACL case, on a
   real Postgres in CI.
2. **AC2** — Every divergence is **declared** through `capabilities.ts` with a reason, and the list
   is recorded in this file. An undeclared divergence is an AC1 failure.
3. **AC3** — The BRG-003 mutants fail against the Postgres adapter too, one distinct failure each —
   proving the suite is testing the adapter rather than the harness.
4. **AC4** — `NODEGX_STORAGE_URL=postgres://…` starts the service; `/health` reports engine and pool
   saturation; SIGTERM still exits 0 with the pool drained.
5. **AC5** — BRG-D5 resolved by measurement: it is recorded here whether GeoPoint distance and
   polygon queries need PostGIS, and the capability is declared accordingly.
6. **AC6** — FTS5→`tsvector` is declared `degraded` with its reason, and the search conformance
   cases assert correct rows while permitting different ranking.
7. **AC7** — The SQLite path is untouched: the full `nodegx-backend` suite and `test:main` are green
   with no Postgres present, and `noodl-mcp` is green.
8. **AC8** — The pool default, the `replicas × pool_size ≤ max_connections − headroom` formula and
   the PgBouncer transaction-mode caveat are published where an operator reads them (§3.5), and the
   default is stated here with the reasoning for the number chosen.
9. **AC9** 🔴 — The conformance suite is run against this adapter **and against the six mutants of
   `conformance/mutants.ts`**. Passing the suite is necessary and not sufficient: an adapter that
   also passes as a mutant means the suite stopped discriminating, and that is a BRG-003 defect
   filed before this task closes. Both numbers are recorded here.
