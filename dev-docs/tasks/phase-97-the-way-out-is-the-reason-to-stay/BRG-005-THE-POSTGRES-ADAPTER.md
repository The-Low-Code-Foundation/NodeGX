# BRG-005 — The Postgres adapter

**Status: 🏗 In progress, s6 (2026-09-19). R6 ruled — `pg`, bundled. AC5 and AC8 closed; the
connection layer is built and measured against a real PostgreSQL 16.11. The adapter class is next
and the dialect seam is what unblocks it (§6.1). Needs BRG-001 ✅ and BRG-003 ✅. Gated on R5 ✅.**

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

---

## 5. What s6 built (2026-09-19)

**Status: 🏗 In progress.** The driver is ruled and in, the connection layer is built and measured
against a real server, and **AC5 is closed**. The adapter class itself is not written — §6 says what
is next and why it is next.

| AC | state |
|---|---|
| AC1 `runConformance()` green on Postgres | ⬜ needs the adapter class |
| AC2 divergences declared in `capabilities.ts` | 🟡 **three measured and written down below**; the `capabilities.ts` entries are owed |
| AC3 mutants fail against Postgres | ⬜ needs AC1 |
| AC4 `NODEGX_STORAGE_URL`, `/health`, SIGTERM drain | 🟡 pool + `saturation()` + `end()` built and specced; the **wiring** is owed |
| **AC5 BRG-D5 resolved by measurement** | ✅ **closed — see §5.2** |
| AC6 FTS5 → `tsvector` declared `degraded` | ⬜ |
| AC7 SQLite path untouched | 🟡 `typecheck:runtime`, `typecheck:contract` and 251 adapter tests green; **`test:main` + `noodl-mcp` still owed** (§6.2) |
| **AC8 pool default + formula + PgBouncer caveat** | ✅ **built and specced — see §5.3** |
| AC9 suite + six mutants, both numbers recorded | ⬜ needs AC1 |

### 5.1 The driver — R6, and the two numbers that decided it

Ruled by Richard 2026-09-19: **`pg` 8.23.0, bundled into every build.** Every measurement behind the
question is in README §4.2; the one that decided it was not size but a JSON round trip through the
only call shape `QueryBuilder`'s output fits, where `postgres.js`'s `sql.unsafe` returned an
unparsed string and `null` for `-> 'k'` and `pg` returned the value. The row-ACL predicate is a JSON
extract, so that operator is not negotiable.

`pg` is a **dependency of `noodl-runtime`**, not an optional one: the deploy artefact is a single
esbuild bundle with no `node_modules` beside it (`scripts/package-deploy.js`), so "the operator
installs the driver" has nowhere to install to. Cost, measured: `dist/cli.js` 3,498,546 bytes → +175
KB (≈5%), install tree +14 packages / 828 KB, and `pg` bundles with **no warnings and no extra
`external`** under this repo's exact esbuild options.

### 5.2 AC5 / BRG-D5 — **PostGIS is not required, and must not be**

§3.2 marked this unverified. Measured on PostgreSQL 16.11 (Homebrew), from
`pg_available_extensions`: `cube` 1.5 and `earthdistance` 1.2 are **available and not installed**,
and **`postgis` is not available at all** — a separate package here, and a paid tier or absent on
several managed providers. A bridge that needs `CREATE EXTENSION` is a bridge that needs superuser.

Both geo operators are therefore **core PostgreSQL only** — `radians`, `sin`, `cos`, `asin`, `sqrt`
and the built-in `polygon @> point`. `src/api/adapters/postgres/geo.ts`, graded by
`test/adapters/postgres.geo.test.js`: **30 cases, green**, and every one of them runs the SQLite
adapter's own JavaScript beside the SQL over the same point and asserts they agree. A table of
expected values would have graded this session's arithmetic; running the two engines against each
other graded the port, and it found three things that arithmetic would not have:

1. 🔴 **The Earth radius.** The first draft hardcoded `6371`. `sqlFunctions.ts` uses **`6371.0088`**
   — *"the value Parse's `$maxDistanceInRadians` is defined against"* — and `QueryBuilder.ts:411`
   uses the same constant for radians→km. The difference is a **constant 1.4 ppm**: 0.5 m over
   London–Paris, 23 m over London–Sydney. It now **imports** the constant, and a case asserts that
   rather than asserting a number. A "within a metre" tolerance would have passed the short case and
   shipped it; the case asserts millimetres for that reason.
2. 🔴 **A malformed GeoPoint took the whole query down.** `('north')::double precision` **raises** on
   PostgreSQL, and an error inside a `WHERE` clause fails the statement — so one row written badly
   by a cloud function would 500 every distance query on that collection, where SQLite's
   `coordinates()` returns null and the row is merely not in the answer. Both expressions are now
   guarded with `jsonb_typeof(…) = 'number'`.
3. **The polygon boundary is half-open on one side only.** Ray casting (`sqlFunctions.pointInPolygon`)
   calls the **south and west** edges inside and the **north and east** edges outside; PostgreSQL's
   `@>` calls every boundary inside. Two edges agree, two do not. **Declared** — Parse does not
   define the boundary — and asserted in both directions so a change of convention on either side
   names which one moved.

### 5.3 AC8 — the pool, the arithmetic, and the number chosen

`src/api/adapters/postgres/pool.ts`, graded by `test/adapters/postgres.pool.test.js` (**10 cases,
green**, seven of them against the live server: checkout, commit, rollback-is-all-or-nothing with a
committed control beside it, no client leaked over six consecutive failures, saturation, drain).

    replicas × (data_pool_max + operational_pool_max) ≤ max_connections − headroom

Measured boot defaults on PostgreSQL 16.11: `max_connections` **100**,
`superuser_reserved_connections` **3**, `reserved_connections` **0**.

**Defaults: `data` 8, `operational` 2 — ten per process.** Not `pg`'s own `max: 10`, because this
service opens **two** pools (§3.5) and accepting the library default would be 20 per process, which
exhausts a stock server at five. Ten per process leaves nine processes inside `max_connections` with
headroom intact. It is also not a throughput compromise: one single-threaded Node process cannot
dispatch more than about ten concurrent queries usefully, and a larger pool moves the queue from
somewhere `/health` can see it to inside the database, where it cannot. `operational` is 2 because
the claim table and execution history are low-rate and must never be why a user request waits.

`headroom = 6`, and it is named rather than rounded: **3** superuser reserve, **2** for an operator's
`psql` and `pg_dump`, **1** for `nodegx-backend migrate` — which is most likely to be run *while the
service is up*. `connectionBudget()` evaluates the formula so an operator can be told what their own
numbers mean instead of being handed algebra.

**PgBouncer, transaction mode:** the pool **sets no session state at all**, and that is the decision
rather than an omission — it is what makes the adapter safe behind a transaction-mode pooler without
an operator needing to know that `SET`, `LISTEN`, prepared statements, temp tables and out-of-
transaction advisory locks do not survive. The one opt-in, `statementTimeoutMillis`, is applied as
`SET LOCAL` **inside** the transaction that uses it, so it is discarded at `COMMIT` and never leaks
onto a connection the pooler hands to somebody else.

### 5.4 The placeholder boundary, and what it proved about where the dialect seam goes

`QueryBuilder` emits SQLite's `?`; `pg` wants `$1 … $n`. `postgres/placeholders.ts` translates once
at the driver boundary (**8 cases, green**) rather than editing the 22 sites in `QueryBuilder` that
emit a marker — 22 chances to change the SQLite adapter while porting it, for a mapping that is
total and order-preserving. It skips quoted literals, quoted identifiers, dollar-quoted bodies and
comments; measured, nothing `QueryBuilder` emits today puts a `?` inside any of those, so the naive
form would pass every case — the scan is there because the defect it prevents arrives later and
shows up as *wrong rows on Postgres only*.

🔴 **And then the boundary proved it cannot carry the whole job.** The haversine needs the centre
latitude **twice** (the `dLat` term and the `cos·cos` term) and a positional marker binds one value
each, so the Postgres expression has **three** markers where `SQL_DISTANCE_KM(col, ?, ?)` has two.
An expression whose marker count differs from SQLite's cannot be swapped in after the SQL is built.

**So the dialect seam belongs inside `QueryBuilder`, where the parameters are pushed.** That is §6.1,
and it is the next thing to build.

## 6. What is next, and why in this order

### 6.1 The dialect seam in `QueryBuilder` — the one thing everything else waits on

Not a fork. `QueryBuilder` is 1,230 lines and a second copy of it is this phase's own thesis
arriving from inside the fix. The engine-specific surface in it is small and already located:

| site | count | Postgres |
|---|---|---|
| `buildAclPredicate` — `json_each` + `json_extract(…,'$.read') = 1` | 1 | `jsonb_each` + `(value ->> 'read')` — 🔴 **and the coercion, which BRG-004 §5 has already been bitten by once**: the flag is `true` on disk and `json_extract` returns `1` |
| `$within` box — `json_extract(col,'$.latitude')` | 1 | `(col ->> 'latitude')::double precision`, **guarded** — §5.2's second finding applies here too |
| `SQL_REGEXP`, `SQL_DISTANCE_KM`, `SQL_POINT_IN_POLYGON` | 4 | built, specced, green — `postgres/geo.ts` |
| FTS5 `MATCH` + shadow table (`buildSearchSelect`, `buildSearchCount`, `toFts5MatchQuery`) | 3 fns | `tsvector` + GIN. **AC6: `degraded`, ranking differs** |
| `escapeTable` / `escapeColumn` | — | identical; both quote with `"` and sanitise to `[A-Za-z0-9_]` |
| `?` markers | 22 | **no change** — translated at the driver boundary (§5.4) |

The seam is a `dialect` argument threaded to the functions that emit those, defaulting to SQLite so
every existing caller and all 251 adapter tests are untouched. It has to be **inside** the builder
because the Postgres expressions do not all take the same number of parameters as the SQLite ones
(§5.4).

### 6.2 Then, in order

1. **`PgSchemaManager`** — `information_schema.columns` for the live-column read (`ColumnScope`),
   keeping the `undefined`-means-no-substitution semantics `LocalSQLAdapter.ts:675-692` warns about.
   DDL reuses BRG-004's repaired `generatePostgresSQL` rather than growing a second generator.
2. **`PostgresAdapter`** over `PgConnectionPool`, implementing `IStorageDataPlane`'s twelve + the
   eight.
3. **`createAdapter()`** branches on `NODEGX_STORAGE_URL=postgres://`, and `/health` carries
   `saturation()`. 🔴 R5: the CLI refuses any other scheme **by name**.
4. **One test file** — `packages/nodegx-backend/tests/brg-005-conformance-postgres.test.ts`, which
   BRG-003's SQLite file already describes as all this should take: *"BRG-005 adds one file to run
   it against Postgres. Nothing else changes."* AC1, AC3 and AC9 all land there.
5. **`IOperationalStore` on Postgres**, its `close()`, and **the shutdown path that calls it** —
   BRG-D6. §3.5 is emphatic that the shutdown path is the part that does not exist.

### 6.3 Owed from s6, with the reason

- 🔴 **AC7's full sweep was NOT run.** `typecheck:runtime`, `typecheck:contract` and the 251-test
  adapter suite are green, but `test:main` and `noodl-mcp` were not started: a peer session had a
  jest run and three webpack builds live in this checkout at the time. One heavy job at a time. They
  are owed before this task closes, and nothing in s6 touched a SQLite code path — the only edits to
  an existing file are `noodl-runtime/package.json` (and the root `package-lock.json` it moved).
- **AC2's `capabilities.ts` entries** for the three divergences in §5.2 and §5.3 are written down
  here but not yet declared in code. An undeclared divergence is an AC1 failure, so they land with
  the adapter.
- **`upsertBatch`.** `AdapterFacade.ts:474-528` is the one facade method still SQLite-specific — it
  reaches `sqliteHandle()` because `adapter.transaction()` takes a synchronous callback — and its
  own docstring says *"BRG-005 owes either a batch write on `IStorageAdapter` or its own facade"*.
  `PgConnectionPool.transaction()` is the awaitable shape that makes the second option cheap.
