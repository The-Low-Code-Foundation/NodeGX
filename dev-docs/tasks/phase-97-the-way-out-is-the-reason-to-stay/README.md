# Phase 97 — The way out is the reason to stay

**Scoped:** 2026-09-18, from Richard's question in session — *"what would be the easiest, most
logical path to moving from SQLite to another DB type"* — and a measurement of the persistence seam
taken the same afternoon at `cline-dev` HEAD `df60eb6f5`.
**Status: 🏗 In progress, s4 (2026-09-19). All 5 rulings taken (§4); R2 taken as recommended.
BRG-001 built. BRG-002 **fully built** — nothing in the backend reaches past the storage interface
any more, and `execution/` is at zero raw statements now that `IOperationalStore` exists. BRG-003
has a running suite — 56 cases, green against SQLite, proven able to fail by six mutants — and
**the §3.5 gate is built and in CI**: every member of the storage surface now has a conformance case
or a written declaration with an owing task, and a new one that has neither fails both `tsc` and
jest by name. 22 of 61 members are declared uncovered, held by a ratchet. AC5 was exercised and the
mechanism **did not hold** — `unsupported` covered an adapter that answered wrongly; fixed. **AC8 was all that remained on BRG-003 and it belonged to BRG-004 — s5 closed it**: the two
SQL generators are repaired and held by 36 cases and four mutants, with the adversarial half measured
on a real PostgreSQL 16.11. BRG-D1, D2, D3 and D4 are all closed. What BRG-004 still owes is **the
`migrate` command's data phases** — `--dry-run` and its carry report landed in the same session, and
every criterion still open needs a PostgreSQL driver, so **BRG-005 comes next, not later**.
**Prefix: `BRG`.**

> "Say somebody chooses NodeGX full stack, with the SQLite integrated backend. They develop a
> reasonably complex app using workflows and cloud functions, and they deploy and one day start
> getting thousands of active users… Is it not worth having a think about a dev phase to make it
> possible to say 'you can easily build on the full stack NodeGX and stay there as long as it's
> convenient, but we've made an easy bridge to a more production grade DB that also works with the
> same workflows and cloud functions just in case you suddenly need to scale'" — Richard, 2026-09-18

## 1. The person sentences

> **Someone who built a real app on the built-in backend — workflows, cloud functions, triggers,
> row ACLs, realtime — runs one command, points it at a Postgres URL, and the same app is serving
> from Postgres. Not one node in their graph changed. Not one workflow was rewritten.**

> **And on the day they never need that, nothing they built was shaped by the fear of needing it.**

The second sentence is the product. There are no NodeGX users at scale today, so this phase is not
built for a migration anyone is about to perform — it is built so the sentence can be **said**, to
someone deciding whether to start. The fear of the dead end is decided before line one, and a
full-stack visual builder that cannot answer it loses the serious build to a Supabase-plus-Next
stack it would otherwise have won.

## 2. What the measurement found (2026-09-18, HEAD `df60eb6f5`)

**✔** = re-read at HEAD by the scoping session. **·** = one grep, not re-read — **re-read before
building on it.**

### The good news: the seam is already narrow, and mostly by accident

| | reading | where |
|---|---|---|
| ⚠️ | **Exactly 8 modules** in the backend touch `adapter.` at all — **6 at HEAD; `triggers/dbchange.ts` and `server/http-util.ts` touch none** (BRG-001 §5.1) | `src/{security/state,triggers/dbchange,server/http-util,service,cli,realtime/ChangeBus,persistence/AdapterFacade,persistence/createAdapter}.ts` |
| ⚠️ | The whole adapter surface those 8 use is **8 names**: `connect`, `disconnect`, `getDatabase`, `getPersistenceStatus`, `on`, `off`, `schemaManager`, `transaction` — 🔴 **wrong, corrected by BRG-001 s1: it is 20.** `AdapterFacade.call()` dispatches twelve more BY STRING (`this.adapter[method]`), so the grep below could not see the entire data plane. See BRG-001 §5.1 | grep `adapter\.[a-zA-Z_]*` over `src/` — **the grep is what was measured, not the adapter** |
| ✔ | Everything else — every HTTP route, the workflow engine, cloud functions, auth, realtime, backup — goes through **`AdapterFacade`'s ~22 methods**, which are already promise-shaped and already split `raw*` (storage-shaped) from `wire*` (Parse-wire-shaped) | `persistence/AdapterFacade.ts:112-425` |
| ✔ | `SchemaManagerLike` already declares **14 methods** of the schema surface, written down *because* five modules had each independently typed it `any`. Its own docstring calls itself "a stand-in, and it says so on purpose" | `persistence/SchemaManagerLike.ts:1-25, 99-103` |
| ✔ | The adapter stack is **4,383 lines** across 6 files, with **8 test files** against it | `noodl-runtime/src/api/adapters/local-sql/`; `noodl-runtime/test/adapters/` |
| ✔ | `node:sqlite` carries joins, window functions, CTEs, FTS5, json1 and `loadExtension` — the ceiling was never capability | `phase-48-data-ceiling/README.md:11-25` |

**The verdict that shapes the phase: a second adapter is four files of real porting plus an
interface extraction, not a rewrite.** Phase 48's DAT-005 estimate of 3 weeks was made without this
measurement and is probably pessimistic for the adapter and optimistic for everything around it.

### 🔴 The bad news: a bridge was half-built, is routed to users, and has already drifted

| | reading | where |
|---|---|---|
| ✔ | 🔴 **`generatePostgresSQL()` and `generateSupabaseSQL()` already exist and are already reachable**, at an admin route taking `format=postgres \| supabase \| json` | `SchemaManager.ts:582, 641`; `server/byob-admin.ts:466-468` |
| ⚠️ | 🔴 **They have zero tests.** Not one test file in the monorepo calls either — **corrected 2026-09-19, see §4.1: there is exactly one, and it asserts `toContain('CREATE TABLE')`** | `tests/service-http.test.ts:503` |
| ✔ | 🔴 **The exporter ignores declared indexes.** It hardcodes `createdAt` and `updatedAt` and emits nothing else — so FED-002's `indexes` declaration, **closed two days ago**, does not cross. A collection whose `id` is `unique: true` exports as a Postgres table with no unique constraint, and the dedupe guarantee silently becomes false | `SchemaManager.ts:614-617` vs `phase-96/FED-002-*.md` §3.1 |
| ✔ | 🔴 **`Relation: null` in the type map** — a relation column is skipped by `if (pgType)` and vanishes from the export with no warning, no comment and no error | `SchemaManager.ts:191, 601-607` |
| ✔ | 🔴 **The generated Supabase RLS grants everything to everyone.** Four policies per table, all `TO authenticated`, all `USING (true)` / `WITH CHECK (true)` — on a backend whose default is `creatorOwns` with the ACL predicate compiled **into the SQL**. The export converts a row-ACL'd collection into one where any logged-in user reads, updates and deletes any row. Two of the four even carry the comment *"(customize based on ACL)"* | `SchemaManager.ts:658-679` vs `security/model.ts:164, 294`; `local-sql/QueryBuilder.ts:241` |
| · | `GeoPoint` maps to a bare `POINT` with the comment "or use PostGIS". `QueryBuilder` implements distance in SQL (`SQL_DISTANCE_KM`); whether a bare `POINT` answers those queries was **not** verified | `SchemaManager.ts:192`; `local-sql/sqlFunctions.ts` |

**This is the phase's own thesis arriving early and uninvited.** There is no written interface and
no gate, so a feature landed in phase 96 and quietly broke portability, and nobody could have caught
it at review. That is the tax this phase exists to make visible — and a security-shaped export
running behind a live admin route is the proof that "we'll do the adapter later" is not free.

### The holes, located exactly

| hole | sites | where |
|---|---|---|
| Raw SQL outside `persistence/` | 12 | `execution/IdempotencyStore.ts:176, 231-253` (its own `idempotency_keys` table) |
| Raw SQL outside `persistence/` | 8 | `security/state.ts:392-471` (`_Role` and `_ApiKey` reads/writes) |
| `getDatabase()` raw-handle escape | ~~5~~ **3** | `security/state.ts:386`; `AdapterFacade.ts:410, 426`. `service.ts:377` and `ExecutionStore.ts:128` are `ExecutionStore`'s **own** handle over its own file, not the adapter's (BRG-001 §5.1) — **after BRG-001 the adapter count is 1**, `security/state.ts`, through a named dep |
| **Synchronous** facade methods — structurally impossible over a socket | 7 | `backup/dataio.ts:62, 305, 338, 351, 352, 354`; `server/admin-search.ts:77` |
| Untyped `schemaManager` | 13 | across `src/`, against `SchemaManagerLike`'s 14 declared names |

`backup/snapshot.ts` and `backup/schema-migrate.ts` are SQLite-specific and legitimately so — on
Postgres they are `pg_dump` and `pg_restore`, not a port. They are **not** holes.

## 3. The ceiling this phase does and does not raise

Two ceilings exist and they are not the same. **This phase raises one of them.**

| ceiling | what it is | this phase |
|---|---|---|
| **Storage** | Single writer. WAL gives many readers, one writer. Phase 48's own words: *"Fine to low thousands of active tenants. A cliff, not a wall."* | ✅ **raised** |
| **Process** | The service is single-process **by design**: the cron scheduler, the rate limiter, `FlowStore`, `ExecutionStore`, `IdempotencyStore`, the `SecretsStore` read-modify-write, and the `ChangeBus` tap that only ever sees writes made by *this* process | ❌ **untouched** |

Two replicas today would double-fire every schedule and be blind to each other's changes —
`triggers/dbchange.ts:24-26` says so in words, and `triggers/scheduler.ts:21` and `admin/auth.ts:20-21`
both name the single-process stance as a deliberate v1 choice.

**So the claim this phase earns is bounded, and the bound must be written where a user reads it:
one app process, a real database behind it.** That is what a production Rails or Django app usually
is, and it carries thousands of active users comfortably. Shipping the bridge while implying
horizontal app-tier scale would move the wall rather than remove it, and the user would hit it one
step later having been promised otherwise. **BRG-006 does not close until that sentence is
published.** Making the app tier replicable (leader-leased scheduler, `LISTEN/NOTIFY` change bus,
shared rate-limit and flow state) is a real phase and it is **not this one** — see §6.

## 4. Rulings needed — ✅ ALL EIGHT RULED (R8 taken 2026-09-20, s12)

### What the scoping session asks, and recommends

- **R1 — Phase 48's DAT-002 (Query Views) is on a collision course with this phase.** Its premise is
  author-written **SQLite** SQL, and phase 48 already admits the consequence: *"'Moves to Postgres
  with no graph changes' holds for the graph and **not for the views** — type affinity, `||`,
  `strftime` vs `to_char`, JSON operators, window-frame defaults and `GROUP BY` strictness all
  diverge. Every view is a hand-port, and that is uncosted"*
  (`phase-48-data-ceiling/README.md:141-144`). Nothing in phase 48 is scheduled, so this is free
  today and a broken public promise later. **Recommend: DAT-002 is re-specced bridge-aware before
  it is built** — views declared in a portable subset, or generated from a declarative definition
  rather than hand-written SQL — **or deferred behind this phase.**
- **R2 — How the claim is worded.** Recommend the bounded form in §3: *"one app process, a real
  database behind it"*, stated in the docs and in the migrator's own output, not only in a task
  file. The unbounded form is the one that generates the angry user.
- **R3 — What happens to the existing `format=postgres|supabase` export route today.** It is live,
  untested, drops relations, drops unique indexes and emits `USING (true)` over a `creatorOwns`
  backend. Three options: **(a)** remove the route until BRG-004 replaces it; **(b)** leave it and
  stamp every generated file with a header naming exactly what it does not carry; **(c)** fix it in
  place as part of BRG-004. **Recommend (a) then (c)** — a security-shaped export with no tests
  behind an admin route is worse than no export, and (b) relies on someone reading a comment that
  two existing policies already carry and that did not stop anything.
- **R4 — Does the editor's own local backend count as a conformance consumer?** Six files in
  `packages/noodl-editor` consume the `local-sql` stack. **Recommend: no.** The editor's local
  backend stays SQLite-only and the interface is declared at the `nodegx-backend` seam; widening
  scope to the editor triples BRG-002 for no user-visible gain.
- **R5 — Postgres only, or a family?** Recommend **Postgres only**, and say so. MySQL, libsql and
  Turso each look like "one more adapter" and each doubles the conformance matrix. One proven exit
  is a promise; three unproven ones are a roadmap.

### The rulings as given

**Ruled by Richard 2026-09-19, s1**, from the re-measurement in §4.1 below — not from the scoping
session's readings, two of which had drifted.

| | asked | **ruled** |
|---|---|---|
| **R1** | DAT-002 re-specced bridge-aware, or deferred behind this phase | ✅ **Views wait for the bridge.** Nobody writes a hand-written SQL view until the portability suite exists to catch an unportable one. DAT-002 is **blocked on BRG-003**, and phase 48's own table now says so. The interface carries **no** view concept. |
| **R2** | the bounded wording of the claim | ✅ **Taken as recommended** (not put to Richard — the honest form is the only one): *"one app process, a real database behind it."* Published by BRG-006, and printed by the migrator itself. |
| **R3** | the live `format=postgres\|supabase` route: remove, stamp, or fix in place | ✅ **Fixed in place.** The route, the IPC channel and the hook function all stay; **BRG-004 repairs what they emit** — relations, declared indexes, and the row-ACL translation. Consequence, recorded rather than argued: the four `USING (true)` policies remain reachable by an admin-token holder until BRG-004 lands. The generators therefore **stay on the schema interface** in BRG-001 rather than moving out of it. |
| **R4** | whether the editor's local backend is in conformance scope | ✅ **No.** The editor's local backend is SQLite forever. The interface is declared at the `nodegx-backend` seam, and this phase touches no editor file. |
| **R5** | Postgres only, or a family of targets | ✅ **Postgres only**, and the docs say so. MySQL, libsql, Turso and D1 stay out of scope (§6) and are not described as coming. |
| **R7** | BRG-D8 + BRG-D10 — which way should a `Boolean` read back? | ✅ **`/api` is brought into line: `true`/`false` everywhere**, ruled 2026-09-20, s10, from BRG-006's three-way table. 🟢 **BUILT s11 — [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md), 7/7, BRG-D8 and BRG-D10 both closed.** 🔴 It was put as two questions and is one: `/api` on SQLite is the **only** reader that says `1` — `/classes`, a graph's own `Query Records`, and every reader on PostgreSQL already say `true`. The premise the earlier framing rested on ("every existing app reads `0`/`1`") is therefore false, and keeping `0`/`1` would have meant changing the three readers that are already right to match the one that is not. **Blast radius named:** it reaches `_User.emailVerified`, `_Files.private` and `_ApiKey.revoked`, which `migrate`'s verify report lists. |
| **R6** | which Postgres client library, and whether it ships with every build | ✅ **`pg`, bundled into every build** — ruled 2026-09-19, s6, from the measurements in §4.2. The SQLite path gains 175 KB on a 3,498,546-byte `dist/cli.js`; `noodl-runtime` gains 14 packages / 828 KB in the install tree. `postgres.js` was rejected on behaviour, not on size. The third option — a runtime-resolved optional dependency, as `better-sqlite3` is — was rejected because the deploy artefact is one bundled file with no `node_modules` beside it, so 'the operator installs it' has nowhere to install to. |
| **R8** | backups on PostgreSQL: is `pg_dump` the operator's job, or does the service learn it? | ✅ **The operator's job, and the service refuses rather than appearing to do it** — ruled 2026-09-20, s12. 🟢 **BUILT — [BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md), 7/7.** Teaching the service `pg_dump` means shelling to a binary that may not exist, at a version it does not control, producing an artefact it cannot verify — and a managed Postgres is usually already doing it on a schedule nobody had to write. 🔴 **What the ruling actually bought is not the refusal but what the refusal replaced:** `nodegx-backend backup` on a migrated data dir was archiving the pre-migration `local.db` still sitting in `data/` and reporting **success** with a byte count. A backup that fails is an inconvenience; one that succeeds against stale rows is the thing you find out about on the worst day. |

### 4.1 What re-measuring moved, 2026-09-19 (HEAD `c7fe1a1da`)

Everything in §2 re-read before the rulings were asked — a task file is a claim, not a reading, and
a ruling taken on a drifted number is a ruling spent on work that does not exist. Two changes:

| | §2 said | measured at HEAD |
|---|---|---|
| 🔴 | *"They have zero tests. Not one test file in the monorepo calls either"* | **Not quite — there is one.** `tests/service-http.test.ts:503` calls `GET /admin/schema-export?format=postgres` and asserts the body `toContain('CREATE TABLE')`. It is a smoke assertion over the route, it calls neither generator by name, and it would pass unchanged with every relation dropped, every unique index missing and every ACL replaced by `USING (true)` — which is exactly what it does today. **BRG-D4 is re-worded, not withdrawn.** |
| 🆕 | *"already reachable"* / *"routed to users"* | **Reachable, but nothing can produce it by clicking.** The chain is `byob-admin.ts:465` ← `BackendManager.js:966` ← ipc `backend:export-schema` (`BackendManager.js:176`) ← `useLocalBackends.ts:263`, which returns `exportSchema` from the hook — **and no component consumes it.** Grep for `exportSchema` across every `.ts`/`.tsx` in `noodl-editor/src` returns three hits, all inside that one hook file. So the live surface is the admin HTTP route (admin token) and a dead IPC channel. This is what made R3 answerable cheaply. |

Unchanged and re-confirmed at HEAD: the 8 adapter names; `POSTGRES_TYPE_MAP.Relation = null`
(`SchemaManager.ts:191`); indexes hardcoded to `createdAt`/`updatedAt` only (`SchemaManager.ts:614-616`);
four `TO authenticated ... USING (true)` policies per table (`SchemaManager.ts:658-679`); phase 48
still `📋 Specced, not started`.

### 4.2 What was measured before R6 was asked, 2026-09-19 (s6)

A scoping session's parenthetical about a third party is not a measurement
(the R1–R5 rulings were taken that way; §4.1 is the same discipline applied to this file's own numbers). Nothing in §3 of BRG-005 named a driver, so every
number below was taken in this session, against the **PostgreSQL 16.11 (Homebrew) on
aarch64-apple-darwin23.6.0** already on this machine — the same server BRG-004's adversarial half
ran on — in a scratch database `nodegx_brg005`.

| | `pg` 8.23.0 | `postgres` (postgres.js) 3.4.9 |
|---|---|---|
| licence | MIT | Unlicense |
| install tree | **14 packages, 828 KB** | **1 package, 384 KB** |
| esbuild `--platform=node --target=node22 --format=cjs` | **175.5 KB, no warnings, no extra `external`** | 72.0 KB, clean |
| last published | 2026-08-08 | 2026-04-05 |
| call shape | `query(text, values)` — **exactly `BuiltQuery { sql, params }`** (`QueryBuilder.ts:25-28`) | tagged template; `sql.unsafe(text, values)` is the escape hatch, not the idiom |

🔴 **The deciding measurement is not the size — it is the JSON round trip, and it lands on the
ACL.** The same SQL and the same params array, through the only call shape `QueryBuilder`'s output
fits, against the same server:

| probe | `pg` | `postgres.js` via `sql.unsafe` |
|---|---|---|
| `select $1::jsonb as j` with `'{"k":"ok"}'` | `{ k: 'ok' }` — parsed | `'{"k":"ok"}'` — **an unparsed string** |
| `select $1::jsonb -> 'k' as j`, same param | `'ok'` | **`null`** |

Re-run against the **unbundled** installed package to rule out the bundler: identical. The row-ACL
predicate is a JSON extract (`QueryBuilder.ts:241`) and BRG-D2 has already shown once that a
translated predicate carries the source engine's coercions
(BRG-004 §5: the ACL flag is `true` on disk and `json_extract` returns `1`, so a faithful transcription of the SQLite predicate denied everyone) — a driver that answers `null`
where the other answers `'ok'`, on that operator, is the wrong tool for this particular port.

⚠️ **One thing was measured and is NOT a divergence**, recorded so it is not quoted as one later:
`select pg_typeof($1)` throws *"could not determine data type of parameter $1"* on **both** drivers.
That is the server refusing an untyped parameter, not a client difference. The first pass of this
measurement nearly reported it as a third strike against `postgres.js`.

**What R6 does not decide:** the pool size. That is AC8, and §3.5 of BRG-005 already owes the
arithmetic.

## 5. The tasks

| task | one line | built | gated | driven |
|---|---|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) | The storage interface declared as a type in `nodegx-backend-contract` — **20 + 21 + 20** members that already exist (s1 recorded 20 + 22 + 16; **two of the three were wrong**, found when BRG-003's gate counted the artefact at s4) | ✅ s1 | ✅ s4 — `typecheck:contract` is now a CI job; the package had a `typecheck` script no workflow had ever called | n/a |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) | The 5 holes closed: 20 raw-SQL sites onto the interface, 7 sync methods made async, `getDatabase()` fenced | ✅ s1-s3 — §3.1 + §3.2 + §3.3 | 🏗 AC1 AC4 AC5 AC6; AC7 left | n/a |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) | One suite, any adapter, green against SQLite on day one — and a CI gate that fails an unportable feature | ✅ s2-s4 — 56 cases, 5 areas, **+ the gate** | ✅ AC1 AC3 AC4 **AC5 AC6 AC7**; **only AC8 left, and it is BRG-004's** | n/a |
| [BRG-004](BRG-004-THE-MIGRATOR.md) | `nodegx-backend migrate --to postgres://…`: schema, data, verify, cutover — and ACLs that survive | 🏗 s5 — **the export half** (D1, D2, D3, measured on PostgreSQL 16.11) **+ the carry report** | ✅ AC1 AC2 AC4; 🟡 AC3 AC7 AC8 | ⬜ AC5 AC6 AC9 — the four phases that move data, all behind **BRG-005's driver** |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) | `PostgresAdapter` implementing the BRG-001 interface until BRG-003 is green | ✅ s6-s8 — **the driver (R6), the pool, the geo port, the dialect seam, and at s8 the adapter class, `PgSchemaManager`, `createAdapter()` on `NODEGX_STORAGE_URL`, and `PgOperationalStore` + `close()`**; 292 adapter tests | ✅ **AC1 AC2 AC3 AC4 AC5 AC6 AC8 AC9** — conformance **56/56 on PostgreSQL 16.11, six mutants caught by six distinct case sets**; 🟡 AC7 (`test:main` / `noodl-mcp` / full backend suite not run: a peer held three suites live all session) | ✅ the service boots on the URL, `/health` carries the pool, `stop()` drains it (`brg-005-service-postgres.test.ts`) |
| [BRG-006](BRG-006-THE-DRIVE.md) | The drive: a real app with workflows, cloud functions, triggers and ACLs moved end to end, graph untouched | ✅ s10 — FED-006's feed reader, imported unmodified, plus four capabilities composed on | ✅ **AC1–AC7** — **22/22, exit 0, 206 s**; `NODEGX_REQUIRE_PG=1` closes the no-database skip | ✅ it IS the drive; AC8 published, Richard reading |
| [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md) | R7's repair: `/api` comes into line — a declared `Boolean` reads `true`/`false` through every wire prefix, on every engine | ✅ s11 — one helper (`schemaCommon.declaredProperties`) read by both adapters' `_rowToRecord` | ✅ **AC1–AC5** — **7/7**, one case **per wire prefix**, both arms, and **5 red with the repair reverted in place** | ✅ BRG-006's drive re-run green with its `booleanReads` fold removed |
| [BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md) | R8's repair: a backup refuses, by name, when the records are not in a file it can copy — instead of archiving the stale pre-migration `local.db` and reporting success | ✅ s12 — one guard on a whitelist, wired from the engine the adapter actually connected to; the CLI learns it **without connecting** (`describeConfiguredStorage`) | ✅ **AC1–AC5** — **7/7**, both real callers driven (CLI via `main()`, service over HTTP), and **4 red / 3 green with the guard disabled, the 3 green being exactly the 3 controls** | ✅ the 409 arm runs through a real `BackendService` on PostgreSQL 16.11 |

**BRG-001 → 003 are not speculative.** They are cheap now (20 raw-SQL sites, 7 sync calls), expensive
later, and they sharpen every backend feature that lands in the meantime whether or not a second
adapter is ever built. **BRG-004 → 006 are the promise**, and are the half that should wait for
Richard's call on whether the claim is worth making now.

Richard's ask was the four points — interface, conformance suite, migrator, adapter. BRG-002 is
carved out of BRG-001 rather than added to it: an interface containing seven synchronous methods
cannot be implemented over a socket, so declaring the seam and de-synchronising it are one job in
two commits. BRG-006 is the house drive every phase carries (`PHASE-EXECUTION.md`, and phase 96's
FED-006).

## 6. Out of scope, and why

- **Making the app tier replicable.** Leader-leased scheduler, `LISTEN/NOTIFY` or logical-replication
  change bus, shared rate-limit / flow / idempotency state, sticky or fanned-out SSE. This is the
  *process* ceiling of §3 and it is a phase of its own. This phase's job is to not lie about it.
- **MySQL, libsql, Turso, D1** — pending R5.
- **Moving to a third-party backend (Supabase, Directus, PocketBase).** That path already exists
  through `nodegx-backend-contract`'s translators and it costs the user their workflows and cloud
  functions, which live in `nodegx-backend/src/workflow/` and `src/execution/` and do not travel.
  This phase is the path that **keeps** them. The two are different products and should not be
  described as alternatives to each other.
- **Vector search, Query Views, aggregation, cross-collection reads** — phase 48 owns all four.
  **But they are not independent of it — see §10**, which maps all six interactions; R1 is only the
  sharpest.
- **`snapshot.ts` / `schema-migrate.ts` ported to Postgres.** On Postgres those are `pg_dump` and a
  migration tool. BRG-004 covers the move; keeping the SQLite backup machinery working is not a port.

## 7. Rules every task inherits

1. **Declare what exists; do not redesign it.** BRG-001 is a transcription job. Every method on the
   interface must be one the code already calls, at a line number the task file names. A method that
   exists only because it would be nicer is out of scope and will not be gated by BRG-003.
2. 🔴 **The conformance suite is the promise, so nothing may be in the promise that is not in the
   suite.** A capability the built-in backend has and the suite does not test is a capability that
   silently will not cross. When in doubt, test it.
3. 🔴 **A capability that genuinely cannot cross is declared, not omitted.**
   `nodegx-backend-contract/src/capabilities.ts` already has the vocabulary —
   `supported | unsupported | conditional | degraded` with a `reason` — and the editor greys rather
   than lies. FTS5 vs `tsvector` is the first real case. Silence is the failure mode this phase was
   created by.
4. **No security downgrade is ever emitted silently.** The `USING (true)` finding in §2 is the
   anti-pattern. A translation that cannot preserve a row ACL must refuse, not approximate.
5. **Tests are the drive, not the unit.** Each task ships a test in
   `packages/nodegx-backend/tests/` that provisions a backend and exercises the feature over HTTP,
   in the house style of `backup-roundtrip.test.ts` and `security-enforcement.test.ts`.
6. **This phase touches no editor file** (pending R4), so it runs beside phases 94, 95 and 96.
   Commits use explicit pathspecs so a sibling's work is never swept.
7. 🔴 **Read [phase 48](../phase-48-data-ceiling/README.md) before starting any task here.** The two
   phases share a subject and neither is scheduled, so whichever moves first constrains the other.
   §10 lists every interaction, task by task. **A `BRG` session that has not read phase 48's task
   table has not finished scoping its task.**
8. **[PHASE-EXECUTION.md](../../guidelines/PHASE-EXECUTION.md) applies.** A defect found while
   driving is filed with an owner, and the next session builds the next task unless the defect
   carries `BLOCKS <AC>`.

## 8. Close condition

BRG-006 is green: an app using **workflows, cloud functions, a schedule trigger, row ACLs, a unique
index and realtime** runs on the built-in backend, is moved by one `migrate` command to a Postgres
instance, and serves the same app from Postgres with **zero changes to the project's graph, schema
declaration or workflow definitions**. The conformance suite is green against both adapters and red
against a deliberately-broken third. The migrator refuses, loudly, on the one thing it cannot carry,
and names it. Richard has read the published sentence about what the bridge does and does not buy
(§3) and ruled it honest.

**Where that stands at s12.** Everything above is measured green. The published page had one
paragraph that s11's own repair had falsified — it still described the `/api` boolean divergence
BRG-007 removed — which is corrected, along with the backup words R8 needed. 🔴 **A page handed over
for a ruling is a measurement like any other, and this one decayed between being written and being
read.** The read is the last thing outstanding.

Carried out rather than left hanging, both by ruling and both with a home: **BRG-D7** →
[SYNCHRONOUS-SCHEMA-INTERFACE.md](../../future-projects/SYNCHRONOUS-SCHEMA-INTERFACE.md), and
**`schema-migrate` on a Postgres data dir** → [BRG-008](BRG-008-BACKUPS-ON-POSTGRES.md) §6, located
at `schema-migrate.ts:165` rather than suspected.

## 9. Defects filed at scoping

| id | reading | owner |
|---|---|---|
| **BRG-D1** ✅ | `generateSupabaseSQL()` emitted four `USING (true)` / `WITH CHECK (true)` policies per table on a backend enforcing `creatorOwns` row ACLs. **Closed s5** (BRG-004 §5.3): policies generated from the live CLP and the row ACL, with a non-owner's denied read/update/delete measured on a real PostgreSQL. 🔴 It needed a fact no generator can invent — a row's ACL is keyed by NodeGX `_User` objectIds and PostgREST authenticates a Supabase auth user — so `userIdClaim` is **required and refused when absent** | ~~BRG-004~~ |
| **BRG-D2** ✅ | `generatePostgresSQL()` emitted only `createdAt`/`updatedAt` indexes, dropping every FED-002 declared index including `unique: true`. **Closed s5**: emitted under the same derived name, `UNIQUE` and `DESC` when declared, read back out of `pg_indexes` | ~~BRG-004~~ |
| **BRG-D3** ✅ | `POSTGRES_TYPE_MAP.Relation = null` caused relation columns to be skipped by `if (pgType)`. **Closed s5**: the junction table is emitted under the name the adapter actually reads, and traverses in PostgreSQL. Two neighbours found while repairing it — `GeoPoint` mapped to `POINT` for a value stored as a JSON string, and declared `defaultValue` dropped entirely | ~~BRG-004~~ |
| **BRG-D4** ✅ | The two generators' only coverage was one smoke assertion (`service-http.test.ts:503`). **Closed s5**: 36 cases across three files — 20 on what the SQL says, 10 on what PostgreSQL does with it, 6 on the route — and **four mutants**, one per original defect, each caught by name (BRG-004 §5.5). This also closes **BRG-003 AC8** | ~~BRG-003~~ |
| **BRG-D5** ✅ | `GeoPoint → POINT` may not answer `QueryBuilder`'s SQL distance queries without PostGIS. **Closed s6 by measurement: PostGIS is not required and must not be** — `postgis` is not even available on the stock PostgreSQL 16.11 measured, and a bridge needing `CREATE EXTENSION` is a bridge needing superuser. Both geo operators are core PostgreSQL (haversine, `polygon @> point`), graded against the adapter's own JavaScript over the same points (BRG-005 §5.2) | ~~BRG-005~~ |
| **BRG-D6** ✅ | **There was no shutdown path for `executions.sqlite`.** `ExecutionHistory` had no close method and `BackendService.stop()` did not release the handle — free on SQLite, a pool leak on Postgres. **Closed s8**: `IOperationalStore.close?()` is declared, `PgOperationalStore` implements it over its own pool of 2, and `ExecutionHistory.close()` — which PRD-003 gave the history in the meantime — calls it. ⚠️ The `ExecutionStore.ts` hunk sits on the peer's uncommitted `close()` and is in the working tree, not at HEAD (BRG-005 §7.4) | ~~BRG-005~~ |
| **BRG-D7** 📦 | **`IStorageSchema` is synchronous, and a socket cannot serve it.** BRG-002 de-synchronised the facade and left the schema surface as it was, correctly — every caller was synchronous. On PostgreSQL the adapter serves it from a per-process model with queued DDL and a barrier before every data call (BRG-005 §7.1), which is truthful under R2's one-process bound and declared as three divergences. The fix is BRG-002's method applied to six callers (`byob-admin`, `RoleStore`, `identities`, `security/state.rolesForUser`, `SearchIndexer`, `backup`) | 📦 **carried out of the phase by Richard's ruling (s12)** — filed as [SYNCHRONOUS-SCHEMA-INTERFACE.md](../../future-projects/SYNCHRONOUS-SCHEMA-INTERFACE.md), gated behind horizontal scaling, which is the phase that cannot ship without it |

| **BRG-D8** ✅ | **A `Boolean` column read back as `0`/`1` on SQLite and `false`/`true` on PostgreSQL — the same app, the same record, two different JSON values over HTTP.** Found by BRG-004 s9's verification, the first thing that ever read the same rows back through both facades. **Closed s11 under R7 by [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md).** Neither adapter was wrong where it looked: both applied the declared type in `_rowToRecord` by reading `schema.properties[key].type`, and `SchemaManager.getTableSchema()` returns a `TableSchema`, which has **no `properties` member** — so on a service-opened backend (`BackendService` passes no `collections`) the declared type was never seen on either side and each driver won. Both adapters now read **both** schema shapes through `schemaCommon.declaredProperties`. 🔴 **BRG-003's suite had no case that round-tripped a boolean**, which is why 56/56 said nothing about it ([[a-gate-can-have-a-hole-shaped-like-the-defect]]); the gate that replaces that hole is one case **per wire prefix**, because BRG-D10 is the defect a single case cannot see | ~~BRG-006~~ **BRG-007 ✅** |

| **BRG-D9** ✅ | **`migrate` could not run at all on a database larger than 2 GiB.** AC7's promise — sha256 the source before and after — was taken with `fs.readFileSync`, which throws `ERR_FS_FILE_TOO_LARGE` over 2 GiB, and it is the first statement `migrateToPostgres` executes. So the migrator worked on every database nobody needs to migrate and refused every one somebody does. **Found by BRG-004 AC9's 5 GB run and by nothing else** — every other reading in the task was taken below that size and all of them were green. **Closed s9**: the hash streams; the spec asserts the mechanism (a database file is hashed with `createReadStream`, never `readFileSync`) because no spec can carry a 5 GB fixture | ~~BRG-004~~ |

| **BRG-D10** ✅ | **Two REST surfaces answered differently for the same Boolean, in the same row, on the same engine.** `GET /api/:c` read `1` where `GET /classes/:c` read `true` — **on SQLite, with no PostgreSQL anywhere near it**, from rows written either way. On PostgreSQL every reader agreed, and a NodeGX graph's own `Query Records` node already read `true` on both engines. Found by BRG-006's drive, the first thing that ever read one column three ways on two engines. 🔴 **BRG-D8 was one cell of this table**, and it falsified the premise its ruling waited on: the case for keeping SQLite's `0`/`1` was "every existing app reads that", and only `/api` on SQLite did. ⚠️ Not only app collections — `migrate`'s verify report names `_User.emailVerified`, `_Files.private` and `_ApiKey.revoked` too. **Closed s11 under R7 by [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md)**: the declared type is now applied at `_rowToRecord` on both adapters, so `/api` comes into line without either route family being touched | ~~BRG-006 filed it~~ **BRG-007 ✅** |

## 10. Phase 48 is not optional reading

[Phase 48 — The Data Ceiling](../phase-48-data-ceiling/README.md) is specced, unstarted, and covers
the same subject from the other end: it raises what the data layer can *express*, this phase raises
where it can *run*. Seven tasks, and **six of them touch this phase.** Neither phase is scheduled,
so every one of these is a free decision today and an expensive one later.

| phase 48 task | how it touches phase 97 | who moves first |
|---|---|---|
| **DAT-001** Vector search | `sqlite-vec` as a loaded native extension. Phase 48 already flags that this *"costs the zero-ABI-matrix property WF-004 explicitly chose `node:sqlite` to get"* — and it also creates the first capability with **no** Postgres equivalent except `pgvector`. It must declare itself through BRG-003 §3.4 or vector search silently stops working on the far side of the bridge | either, **if** DAT-001 declares |
| **DAT-002** Query Views | ✅ **Ruled 2026-09-19 (R1): views wait for the bridge.** DAT-002 is **blocked on BRG-003** and phase 48's table now carries that. When it is unblocked it is re-specced bridge-aware | **97 first**, by ruling |
| **DAT-003** The view as the NL→SQL boundary | Runs the other way: phase 48 says its *availability* boundary *"needs DAT-005 or an out-of-process worker"* — a real role and a real `statement_timeout`, which only Postgres has. **BRG-005 is a prerequisite for half of DAT-003**, and phase 48 says that work "is not costed in this phase" | **97 first** |
| **DAT-004** Aggregation, revisited | Built on DAT-002, so it inherits R1 wholesale | follows DAT-002 |
| **DAT-006** Schema changes as reviewable artifacts | The closest ally. A migration is only as safe as the ability to answer "what shape is production" — BRG-004's carry report and DAT-006's change log are two views of one artifact, and building them apart means building the schema-diff twice (`backup/schema-migrate.ts` is already a third) | **either, but not independently** |
| **DAT-007** Capability honesty | 🔴 **Near-duplicate of BRG-003 §3.4.** Both say: a capability declares itself in `capabilities.ts` with a state and a reason, and the editor greys rather than lies. Whichever lands first should implement it once and the other should consume it — two mechanisms for this is the failure mode both tasks were written to prevent | **either, once** |

**DAT-005** is already marked superseded in phase 48's own table.

The honest read: **phase 48 and phase 97 are one subject split in two**, and the split is defensible
only if each knows what the other owns. A session picking up a `BRG` task re-reads the table above
and says in its notes which row it just touched.
