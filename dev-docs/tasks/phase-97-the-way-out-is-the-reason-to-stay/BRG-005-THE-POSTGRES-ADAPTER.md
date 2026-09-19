# BRG-005 — The Postgres adapter

**Status: 🏗 s8 (2026-09-19) — THE ADAPTER IS BUILT AND CONFORMANT. `PostgresAdapter` + `PgSchemaManager`
pass BRG-003's suite 56/56 on PostgreSQL 16.11 with the six mutants each caught by a distinct case set
(AC1, AC3, AC9 ✅). `NODEGX_STORAGE_URL=postgres://…` starts the real service, `/health` carries the
pool, `stop()` drains it (AC4 ✅). Sixteen divergences declared with evidence (AC2 ✅). AC5 AC6 AC8 were
closed at s6/s7. Left: AC7's sweep (`test:main`, `noodl-mcp`, the full backend suite — a peer held
three suites live), and §7.4's owed list.** Needs BRG-001 ✅ and BRG-003 ✅. Gated on R5 ✅.

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
| AC2 divergences declared in `capabilities.ts` | 🟡 **six measured and written down below**; the `capabilities.ts` entries are owed |
| AC3 mutants fail against Postgres | ⬜ needs AC1 |
| AC4 `NODEGX_STORAGE_URL`, `/health`, SIGTERM drain | 🟡 pool + `saturation()` + `end()` built and specced; the **wiring** is owed |
| **AC5 BRG-D5 resolved by measurement** | ✅ **closed — see §5.2** |
| **AC6 FTS5 → `tsvector` declared `degraded`** | ✅ **closed — see §5.5.3.** Rows asserted, ranking declared different, and the refusal when no field list is given |
| AC7 SQLite path untouched | 🟡 **`test:main` 8223/8223 ✅** (514 suites, exit 0), `typecheck:runtime` ✅, 287 adapter tests ✅, phase backend specs 67/67 ✅. 🔴 **`noodl-mcp` is RED and it is not this phase's red** — measured, §5.5.5 |
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

### 5.5 s7 — the dialect seam, and the two ways the ACL translation was already wrong

`QueryBuilder` now takes a `dialect` argument (`'sqlite' | 'postgres'`) that **defaults to
`'sqlite'`**, threaded to the eleven functions that emit engine-specific SQL. Not a fork: a second
copy of a 1,230-line query builder is this phase's own thesis failing from the inside.

**`test/adapters/QueryBuilder.dialect.test.js` — 34 cases, green, every one of them run on BOTH
engines over ONE corpus** (a real `node:sqlite` database and a real PostgreSQL table seeded with the
same 20 rows), asserting the two return the **same `objectId` set**. Every case also asserts a third
value — which rows *should* come back — because two engines that are wrong in the same direction
agree with each other and pass. Package total **251 → 287 adapter tests**, `typecheck:runtime` exit 0.

#### 5.5.1 🔴 The ACL flag compared as TEXT denied a row SQLite grants

BRG-004 shipped `(_acl.value ->> '<access>') IN ('1', 'true')` — extract the flag as text, compare
the spelling. Graded against the SQLite predicate it translates (`json_extract(…, '$.read') = 1`)
over **all eight spellings the flag appears in**, it is right seven times and wrong once:

| stored flag | SQLite `= 1` | `->>` text form | `->` jsonb form |
|---|---|---|---|
| `true`, `1` | grants | grants | grants |
| **`1.0`** | **grants** | 🔴 **denies** | grants |
| `false`, `0`, `"yes"`, `null`, absent | denies | denies | denies |

`->>` renders the JSON real `1.0` as the text `"1.0"`, which is neither `'1'` nor `'true'`. Comparing
as `jsonb` agrees on all eight, because PostgreSQL normalises JSON numerics and `'1.0'::jsonb =
'1'::jsonb`. **A silent denial is the worst shape this predicate can fail in** — the app shows a user
fewer of their own rows and nothing reports an error.

`JSON.stringify` cannot emit `1.0`, so the flag arrives that way only through another door: a
migrated database, a fixture, another language's writer. That is exactly the population BRG-004's own
docstring says the policy exists for — *"a policy that works on the data that exists rather than the
data it expected."*

#### 5.5.2 🔴 `jsonb_each` RAISES on a non-object ACL — one bad row breaks the whole collection

Measured: `jsonb_each('[1,2]'::jsonb)` is `ERROR: cannot call jsonb_each on a non-object`, and an
error inside a `WHERE` clause — or inside an RLS policy's `USING` clause — fails the **statement**.
SQLite's `json_each` walks an array or a scalar quite happily, hands back keys that are integers or
NULL, and no principal string matches them, so the row is simply **not visible**.

So one row whose ACL was written as an array turns every read of that collection into a 500 on
Postgres, where the built-in backend merely hides that row. `jsonb_typeof(…) = 'object'` reproduces
SQLite's answer exactly. This is `geo.ts`'s malformed-GeoPoint finding in a second place: **PostgreSQL
raises where SQLite coerces, and a raise inside `WHERE` is not a narrower result, it is no result.**

**Both fixes land in one place.** The ACL predicate existed **twice** — `SchemaManager._aclPredicate`
(RLS policy text) and `QueryBuilder.buildAclPredicate` (a bound WHERE clause) — and the two copies
had already drifted, which is why only one of them carried the text-comparison defect into the other
half of the product. Both now call `postgres/predicates.ts`. Each copy agreed with itself; that is
the whole reason neither found it.

Graded where each ships: the query path in `QueryBuilder.dialect.test.js`, and the **RLS path** in
`SchemaManager.export.postgres.test.js`, which gained two cases (a `1.0` row its owner can now read,
and a non-object ACL that hides its row without failing the table) — run against a live server under
real policies, each with its arming control. That spec is 10 → 12 cases.

#### 5.5.3 AC6 — FTS5 as `tsvector`, and the ranking that had to be negated

The searchable document is `to_tsvector('simple', <indexed columns, coalesced and cast>)`, matched
with `plainto_tsquery`, ranked with `ts_rank_cd`, excerpted with `ts_headline`.

- **`'simple'`, not `'english'`.** FTS5's `unicode61` tokenizer does not stem and drops no stopwords;
  `'simple'` does the same. `'english'` reads like an improvement and is a **different row set**.
- **`plainto_tsquery`, not `websearch_to_tsquery`.** `toFts5MatchQuery` exists to stop `-`, `:`, `*`
  and `"` in a user's phrase meaning operators; `websearch_to_tsquery` reintroduces exactly that.
  🔴 The Postgres path therefore binds the **raw term**, never `toFts5MatchQuery`'s output.
- 🔴 **`_rank` is negated.** `bm25()` is lower-is-better, `LocalSQLAdapter.search` publishes
  `_score = -_rank` on that basis, and the default ordering is `"_rank" ASC`. `ts_rank_cd` is
  higher-is-better, so an unnegated port hands every caller the ranking **backwards** — worst match
  first — with nothing failing anywhere. Asserted.
- **It REFUSES without a field list.** There is no shadow table to read the indexed fields from, so a
  default would search columns nobody chose: wrong rows, no error.
- ⚠️ **Declared `degraded`:** the rows are asserted, the ordering is not. Two ranking functions with
  different normalisation cannot be made to agree by choosing better arguments. The `tsvector` is
  computed per row, so this is a **sequential scan** — a generated column with a GIN index is
  `PgSchemaManager`'s to add, and the expression is written so adding one does not change the rows.

#### 5.5.4 The marker counts, which is why the seam is where it is

Three expressions bind a different number of values than their SQLite originals, so no driver-boundary
translator could have produced them from built SQL:

| operator | SQLite markers | Postgres markers |
|---|---|---|
| `$nearSphere` | 2 (`lat, lon`) | **3** — `lat, lat, lon`, the haversine needs the centre latitude twice |
| `$regex` | 2 (pattern, options) | **1** — the flags select the operator (`~*`) and an embedded `(?n)` |
| search | 1 (`MATCH ?`) | **3** — the tsquery appears in the rank, the headline and the predicate |

`$within`'s four markers are unchanged and in the same order, so that one *could* have moved at the
boundary; it is in the seam anyway, because a translation split across two layers is the harder thing
to read. Every case asserts the balance through `toPgQuery`, which throws on a mismatch.

#### 5.5.5 🔴 AC7: `test:main` is green, and `noodl-mcp` is red for someone else's reason

`test:main` **8223/8223, 514 suites, exit 0** — the half s6 owed, now run.

`noodl-mcp` is **8 suites / 10 tests failing (2181 passed of 2191)**, and it fails **identically
without this session's changes**: the two runtime files were restored to their `HEAD` contents by
`cp`, the whole suite re-run, and the failing-suite list and the counts came back **byte-identical**
(then restored and verified by `diff`). The failing suites — node id allocation, a response budget,
theme preset chips, template settling, CMP exports, and a live-backend spec — are unrelated surfaces,
and a peer currently holds **twelve modified files plus six new specs in `packages/nodegx-backend/src`**
in this checkout, which is what a "live backend" spec runs against.

**So AC7's SQLite half is demonstrated and AC7 cannot be *closed* by this task**: it is written as
*"`noodl-mcp` is green"*, and that is not this phase's to make true. The full `nodegx-backend` suite
is deliberately **not** claimed either — with a peer's uncommitted edits in that package, running it
grades their working tree rather than this change. The phase's own backend specs are **67/67, exit 0**.

## 6. What is next, and why in this order

### 6.1 ✅ DONE (s7) — the dialect seam in `QueryBuilder`, which everything else was waiting on

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

✅ **Built in s7 and graded on both engines — §5.5.** The table above survived contact with one
correction: the FTS5 row was not a fourth site to translate later but AC6 itself, and it is closed.
What the table did not predict is that the ACL row had **two** defects in it rather than a coercion
to watch for, and that the second one (`jsonb_each` raising) reached the RLS policies BRG-004 had
already shipped.

### 6.2 Then, in order — and #1 is now the front of the queue

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

### 6.3 Owed, with the reason

- ✅ **AC7's sweep from s6 is RUN.** `test:main` 8223/8223 exit 0. `noodl-mcp` is red and **measured
  to be red without this change too** — §5.5.5 has the control and what it means for closing AC7.
- 🔴 **The full `nodegx-backend` suite is still unmeasured, and deliberately so**: a peer holds
  twelve modified files and six new specs in that package. Run it when their work has landed;
  running it now grades their tree. See [[a-commit-is-not-what-the-compiler-read]].
- **AC2's `capabilities.ts` entries** — now **six** divergences (§5.2's three, §5.5.1, §5.5.2 and
  AC6's ranking), written down here but not yet declared in code. An undeclared divergence is an AC1
  failure, so they land with the adapter.
- **`upsertBatch`.** `AdapterFacade.ts:474-528` is the one facade method still SQLite-specific — it
  reaches `sqliteHandle()` because `adapter.transaction()` takes a synchronous callback — and its
  own docstring says *"BRG-005 owes either a batch write on `IStorageAdapter` or its own facade"*.
  `PgConnectionPool.transaction()` is the awaitable shape that makes the second option cheap.

---

## 7. What s8 built (2026-09-19) — the adapter, and what a synchronous interface costs on a socket

**Every remaining criterion that needed the adapter class is closed.** The order §6.2 gave was the
order it was built in: `PgSchemaManager`, `PostgresAdapter`, `createAdapter()` on the URL, one test
file, then `IOperationalStore` on Postgres with its `close()` and the shutdown path.

| AC | state | evidence |
|---|---|---|
| **AC1** `runConformance()` green on Postgres | ✅ **56/56, 0 skipped, 0 failed-as-declared** | `tests/brg-005-conformance-postgres.test.ts` — builds through `createAdapter({ storageUrl })`, never names the class |
| **AC2** divergences declared | ✅ **16 entries**, 8 `degraded`/`unsupported` + 8 measured translations, each with the spec that measured it | `postgres/divergences.ts`; the spec assigns the register to `ConformanceDeclaration` (compile-time shape check) and asserts every declared case id exists and every `degraded` case still PASSED |
| **AC3** mutants fail on Postgres | ✅ **6/6 caught, 6 distinct signatures, none wholesale** | same file; the record is in §7.2 |
| **AC4** URL starts the service, `/health`, drain | ✅ | `tests/brg-005-service-postgres.test.ts` — real `BackendService.start()`, `_User`/`_Role`/`_Schema` on PostgreSQL, no `local.db` written, `/health.persistence.pool`, `stop()` |
| AC5 AC6 AC8 | ✅ s6/s7 | unchanged |
| **AC7** SQLite untouched | 🟡 **adapter specs 292/292, phase backend specs 50/50 + 36 + 3 + 13, `service-http` 24/24, `typecheck:runtime`/`backend`/`backend-tests`/`contract` all exit 0.** 🔴 `test:main`, `noodl-mcp` and the full backend suite NOT run: a peer had two jest runs, a `tsc` and three webpack builds live for the whole session ([[do-not-pile-cpu-work-on-a-shared-box]]) | owed by s9 |
| **AC9** suite + six mutants, both numbers | ✅ **56 passed; mutants caught by 11 / 3 / 2 / 3 / 2 / 1 cases** | §7.2 |

Runtime: `npx jest --config packages/nodegx-backend/jest.config.js --rootDir packages/nodegx-backend brg-005`
— conformance ≈110 s (seven connected adapters, ~90 tables each, on a fresh database it creates and drops).

### 7.1 🔴 The finding: `IStorageSchema` is synchronous, and that is the seam's second half

BRG-002 de-synchronised the **facade** — seven methods, *"a synchronous call cannot be served over a
socket at any cost"* — and left `IStorageSchema` synchronous, correctly, because every caller of it was
synchronous too. The adapter class is where that comes due: `createTable`, `addColumn`,
`reconcileIndexes`, `getRelatedIds`, `getRelationOwners`, `rebuildSearchIndex` all return
synchronously, and PostgreSQL cannot.

**Built the only way it can be, and declared:** `PgSchemaManager` answers readers from a **model** of
the schema this process holds (primed at `connect()` from `information_schema`, `pg_indexes`, every
`_Join_` table and the `_Schema`/`_SearchIndex` rows), applies every mutation to the model at once and
**queues** the statement; the adapter's data plane calls `barrier()` before every query, so a row
written after `createTable` lands in a table that exists. A queued statement that fails undoes its
model change and surfaces on the **next** data-plane call — the earliest a synchronous interface can
report an asynchronous failure, and never swallowed. `/health.persistence.pool.pendingSchemaStatements`
shows the queue depth; the boot spec measured it at **7 right after `start()`** (the system tables)
and **0 within 373 ms**.

Three consequences are declared in `divergences.ts` rather than hidden:
`schema/served-from-a-per-process-model` (a second writer — the migrator run while the service is up,
a `psql` session — is not seen until restart; R2's bound makes this the truth),
`schema/reconcile-cannot-precount-duplicates` (the database refuses a unique index over duplicates
atomically, code `INDEX_DUPLICATES`, at the queue instead of before it), and
`relations/served-from-a-per-process-model` (`getRelationOwners` on the authorization path reads the
in-memory copy of the junction tables, written through by `addRelation`/`removeRelation`).

🔴 **Filed as BRG-D7: de-synchronise `IStorageSchema` the way BRG-002 de-synchronised the facade,
and delete the queue.** Six callers in `nodegx-backend` (`byob-admin` routes, `RoleStore`,
`identities`, `security/state.rolesForUser`, `SearchIndexer`, `backup`) — a package a peer was live in
all session, so it is filed, not done. Until then the model is [[a-client-property-read-as-a-fact-about-the-source]]
with its scope stated.

**One state object, on purpose.** `conformance/mutants.ts` wraps a schema manager with
`Object.create(manager, …)`, so a method can run with `this` being the wrapper — reads reach the real
manager through the prototype, an assignment to `this.x` would land on the wrapper. All mutable state
is `this.s`, mutated in place, never reassigned. Without that, the `ignore-unique` mutant's
`reconcileIndexes` would queue DDL on a copy the adapter's barrier never waits for.

### 7.2 What the first conformance run found — two more translations, both armed on both engines

The suite went **green on the first run** except for what it was built to find:

1. 🔴 **`$in: []` emitted a bare `0`** (`$nin: []` a bare `1`). SQLite reads `WHERE 0` as false;
   PostgreSQL refuses it — *"argument of WHERE must be type boolean"* — so a filter that should match
   nothing **failed the statement**. The postgres dialect emits `FALSE`/`TRUE`. Armed: the pre-fix
   `WHERE 0` is asserted to raise.
2. 🔴 **`LIKE` is case-insensitive on SQLite and not on PostgreSQL.** `$contains: 'lon'` finds
   `London` on one engine and nothing on the other — fewer rows, no error, the BCN-001 class. `$text`
   and `$contains` emit `ILIKE` on the postgres dialect. Armed: plain `LIKE` on the corpus is asserted
   to miss.

Plus the driver's own shape: `pg` returns `NUMERIC`, `BIGINT` and `COUNT(*)` as **strings** and
`TIMESTAMPTZ` as a `Date`; the built-in adapter returns numbers and ISO strings. The pool installs three
type parsers, so `records/create-returns-the-stored-row`'s `eq(row.score, 1)` holds with `===`. And
PostgreSQL's `duplicate key value violates unique constraint` is rewritten as SQLite's
`UNIQUE constraint failed: T.col` (`postgres/errors.ts`) so `uniqueConstraintProblem` and the HTTP 409
path read it unchanged — `schema/unique-index-refuses-a-duplicate` passes through the same decoder.

**AC9's record — which cases caught each mutant on PostgreSQL:**

| mutant | caught by |
|---|---|
| `drop-acl-on-reads` | 11 — every `acl/` read case incl. `search-returns-only-visible-rows` and `fetch-of-an-invisible-row` |
| `drop-acl-on-writes` | 3 — `a-non-owner-cannot-save` / `-delete` / `-increment` |
| `count-returns-page-length` | 2 — `records/count-matches-the-visible-set`, `acl/count-counts-only-visible-rows` |
| `ignore-unique` | 3 — `schema/unique-index-refuses-a-duplicate`, `compound-index-is-unique-over-the-tuple`, `index-declaration-survives-a-reread` |
| `relation-inverse-ignores-target` | 2 — `relations/inverse-lookup-finds-the-owners`, `inverse-lookup-of-an-unrelated-target-is-empty` |
| `aggregate-ignores-acl` | 1 — `acl/aggregate-computes-only-over-visible-rows` |

Same signatures as SQLite's run. The suite discriminates on both engines.

### 7.3 What else landed, and where

- **DDL has one source.** BRG-004's `generatePostgresSQL` loop body moved to `postgres/ddl.ts`
  (`tableDDL`, `junctionDDL`, `declaredIndexDDL`) and the SQLite manager calls it; a table the migrator
  creates and a table the adapter creates on first write are the same lines. The shared vocabulary
  (`TYPE_MAP`, `POSTGRES_TYPE_MAP`, `normalizeIndexDecls`, `indexName`, `junctionTableName`,
  `MigrationRefusal`, `inferType`) is `local-sql/schemaCommon.ts`. `SchemaManager.export*.test.js`
  are byte-for-byte unchanged and green — the proof the text did not move.
- **`createAdapter({ storageUrl })`** — defaults to `NODEGX_STORAGE_URL`, resolved by one function
  (`resolveStorageUrl`) that `ExecutionHistory` uses too. **R5 enforced by name** at construction
  (`postgres/storageUrl.ts`): `mysql://`, `libsql://`, `turso://`, `d1://`, `mongodb://`, `sqlite://`
  each get the sentence that says PostgreSQL only and *not coming*; the spec drives three of them.
  `PersistenceHandle` gained `target` (redacted URL) and `saturation()`; `/health.persistence.pool`
  is the AC4 reading. `dbPath` is `''` on PostgreSQL — the metrics gauge already guards it; the two
  SQLite-only consumers (`backup/snapshot.ts`, `schema-migrate`) are §7.4's.
- **`upsertBatch` on the adapter** — one real transaction over the pool; `AdapterFacade.upsertBatch`
  prefers it when present and keeps the SQLite-handle path otherwise. Read off the adapter, not added
  to `IStorageAdapter`: BRG-003's ratchet (*"the uncovered list does not grow"*) is the price of a new
  member and it is BRG-006's to pay with a case. `transaction()` on Postgres **throws** — a loud
  refusal, never a silent non-transaction.
- **`PgOperationalStore`** (`nodegx-backend/src/persistence/`) over its own pool of
  `DEFAULT_OPERATIONAL_POOL_MAX` = 2, graded by BRG-002's cases — which moved unchanged into
  `tests/helpers/operational-store-cases.ts` so both engines run the SAME 18 cases (36/36). `close()`
  is on `IOperationalStore` (optional) and **`ExecutionHistory.close()` calls it** — the shutdown path
  `operational.ts` said did not exist exists since PRD-003 gave the history a `close()`.
- **AC2's register** is `POSTGRES_DIVERGENCES`; `POSTGRES_CONFORMANCE_DECLARATION` is derived from it
  so the two cannot disagree. Sixteen entries, listed in the file with the spec behind each.

### 7.4 Owed, with the reason

- 🔴 **AC7's sweep** — `test:main`, `noodl-mcp`, the full `nodegx-backend` suite. Not run: a peer had
  two jest runs, a `tsc` and three webpack builds live for the whole session. First job of s9, before
  any new work.
- 🔴 **`ExecutionStore.ts`'s hunk is in the working tree and NOT committed.** It wires
  `PgOperationalStore` into `ExecutionHistory.open()` and releases it in `close()` — and `close()` is
  the peer's uncommitted PRD-003 method, so the hunk's context does not exist at HEAD
  ([[commit-your-delta-through-a-temporary-index]] rule 6). Commit it once theirs lands. The boot spec
  runs against the working tree and is green.
- **BRG-D7** (§7.1) — de-synchronise `IStorageSchema`; removes three declared divergences.
- **Backups and `schema-migrate` on PostgreSQL** — `BackupManager` snapshots a SQLite file
  (`engine: 'node:sqlite'` hardcoded, `backup/BackupManager.ts:382`); on a storage URL a scheduled
  backup would fail at backup time with "source database does not exist" rather than at start. Not
  in AC4's sentence; BRG-006 decides whether a PostgreSQL deployment's backup is `pg_dump`'s job
  (recommended — say so in the docs) or the service's.
- **A GIN index for search** (`search/no-materialised-index`) — the `tsvector` is per row; a generated
  column + GIN is the operator-facing fix and `PgSchemaManager.rebuildSearchIndex` is where it goes.
- **Operator docs** — `NODEGX_STORAGE_URL`, the pool arithmetic, PgBouncer, `pg_dump` — belong in
  `docs/runtime/SELF-HOSTING.md` / `BACKEND-OPERATIONS.md`, both peer-held this session. BRG-006's
  AC (the published claim) is where they land.
- **`stop()` does not await the operational pool's drain** — `ExecutionHistory.close()` is
  synchronous (the peer's shape); the drain runs after `stop()` returns and keeps the loop alive until
  the sockets close. Exit is clean; it is not *awaited*. A `Promise`-returning close is BRG-D7-adjacent.
- One stray `PostgresAdapter.query error: Database not connected` was logged during one boot-spec run
  after `stop()` — something queried after `disconnect()`. Not reproduced on the second run; the
  SQLite adapter logs the same sentence in the same situation, so it is a `stop()` ordering question
  for whoever owns it, not an adapter one.
