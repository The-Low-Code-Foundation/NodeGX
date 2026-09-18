# Phase 97 — The way out is the reason to stay

**Scoped:** 2026-09-18, from Richard's question in session — *"what would be the easiest, most
logical path to moving from SQLite to another DB type"* — and a measurement of the persistence seam
taken the same afternoon at `cline-dev` HEAD `df60eb6f5`.
**Status: 📋 Specced, not started. 5 rulings open (§4) — R1 and R3 gate BRG-001.** **Prefix: `BRG`.**

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
| ✔ | **Exactly 8 modules** in the backend touch `adapter.` at all | `src/{security/state,triggers/dbchange,server/http-util,service,cli,realtime/ChangeBus,persistence/AdapterFacade,persistence/createAdapter}.ts` |
| ✔ | The whole adapter surface those 8 use is **8 names**: `connect`, `disconnect`, `getDatabase`, `getPersistenceStatus`, `on`, `off`, `schemaManager`, `transaction` | grep `adapter\.[a-zA-Z_]*` over `src/` |
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
| ✔ | 🔴 **They have zero tests.** Not one test file in the monorepo calls either | grep over all `*.test.ts` / `*.test.js`: **0 hits** |
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
| `getDatabase()` raw-handle escape | 5 | `service.ts:377`; `security/state.ts:386`; `execution/ExecutionStore.ts:128`; `AdapterFacade.ts:410, 426` |
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

## 4. Rulings needed — ⬜ NONE RULED YET

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

*(empty — to be filled when Richard rules, in plain words, in this table)*

| | asked | **ruled** |
|---|---|---|
| **R1** | DAT-002 re-specced bridge-aware, or deferred behind this phase | ⬜ |
| **R2** | the bounded wording of the claim | ⬜ |
| **R3** | the live `format=postgres\|supabase` route: remove, stamp, or fix in place | ⬜ |
| **R4** | whether the editor's local backend is in conformance scope | ⬜ |
| **R5** | Postgres only, or a family of targets | ⬜ |

**BRG-001 is gated on R1 and R3.** R1 decides whether the interface must carry a view concept at
all; R3 decides whether BRG-001 inherits a live route or a deleted one. R2, R4 and R5 can be ruled
any time before BRG-003.

## 5. The tasks

| task | one line | built | gated | driven |
|---|---|---|---|---|
| [BRG-001](BRG-001-THE-SEAM-WRITTEN-DOWN.md) | The storage interface declared as a type in `nodegx-backend-contract` — 8 + ~22 + 14 methods that already exist | ⬜ | ⬜ | ⬜ |
| [BRG-002](BRG-002-THE-FOUR-HOLES-CLOSED.md) | The 5 holes closed: 20 raw-SQL sites onto the interface, 7 sync methods made async, `getDatabase()` fenced | ⬜ | ⬜ | ⬜ |
| [BRG-003](BRG-003-THE-CONFORMANCE-SUITE.md) | One suite, any adapter, green against SQLite on day one — and a CI gate that fails an unportable feature | ⬜ | ⬜ | ⬜ |
| [BRG-004](BRG-004-THE-MIGRATOR.md) | `nodegx-backend migrate --to postgres://…`: schema, data, verify, cutover — and ACLs that survive | ⬜ | ⬜ | ⬜ |
| [BRG-005](BRG-005-THE-POSTGRES-ADAPTER.md) | `PostgresAdapter` implementing the BRG-001 interface until BRG-003 is green | ⬜ | ⬜ | ⬜ |
| [BRG-006](BRG-006-THE-DRIVE.md) | The drive: a real app with workflows, cloud functions, triggers and ACLs moved end to end, graph untouched | ⬜ | ⬜ | ⬜ |

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

## 9. Defects filed at scoping

| id | reading | owner |
|---|---|---|
| **BRG-D1** 🔴 | `generateSupabaseSQL()` emits four `USING (true)` / `WITH CHECK (true)` policies per table on a backend enforcing `creatorOwns` row ACLs — a silent authorization downgrade from a live admin route | BRG-004, gated by R3 |
| **BRG-D2** 🔴 | `generatePostgresSQL()` emits only `createdAt`/`updatedAt` indexes, dropping every FED-002 declared index including `unique: true` — the dedupe guarantee does not cross | BRG-004 |
| **BRG-D3** 🔴 | `POSTGRES_TYPE_MAP.Relation = null` causes relation columns to be skipped by `if (pgType)` and vanish from the export with no error | BRG-004 |
| **BRG-D4** | Both generators have zero test coverage and are reachable at `byob-admin.ts:466-468` | BRG-003 |
| **BRG-D5** · | `GeoPoint → POINT` may not answer `QueryBuilder`'s SQL distance queries without PostGIS. **Not verified** — measure before building on it | BRG-005 |

## 10. Phase 48 is not optional reading

[Phase 48 — The Data Ceiling](../phase-48-data-ceiling/README.md) is specced, unstarted, and covers
the same subject from the other end: it raises what the data layer can *express*, this phase raises
where it can *run*. Seven tasks, and **six of them touch this phase.** Neither phase is scheduled,
so every one of these is a free decision today and an expensive one later.

| phase 48 task | how it touches phase 97 | who moves first |
|---|---|---|
| **DAT-001** Vector search | `sqlite-vec` as a loaded native extension. Phase 48 already flags that this *"costs the zero-ABI-matrix property WF-004 explicitly chose `node:sqlite` to get"* — and it also creates the first capability with **no** Postgres equivalent except `pgvector`. It must declare itself through BRG-003 §3.4 or vector search silently stops working on the far side of the bridge | either, **if** DAT-001 declares |
| **DAT-002** Query Views | 🔴 **Direct collision — ruling R1.** Author-written SQLite SQL, and phase 48 concedes *"every view is a hand-port, and that is uncosted"*. The one place a graph-level promise ("your app moves") is broken by a feature that sits below the graph | **97 first**, or DAT-002 re-specced bridge-aware |
| **DAT-003** The view as the NL→SQL boundary | Runs the other way: phase 48 says its *availability* boundary *"needs DAT-005 or an out-of-process worker"* — a real role and a real `statement_timeout`, which only Postgres has. **BRG-005 is a prerequisite for half of DAT-003**, and phase 48 says that work "is not costed in this phase" | **97 first** |
| **DAT-004** Aggregation, revisited | Built on DAT-002, so it inherits R1 wholesale | follows DAT-002 |
| **DAT-006** Schema changes as reviewable artifacts | The closest ally. A migration is only as safe as the ability to answer "what shape is production" — BRG-004's carry report and DAT-006's change log are two views of one artifact, and building them apart means building the schema-diff twice (`backup/schema-migrate.ts` is already a third) | **either, but not independently** |
| **DAT-007** Capability honesty | 🔴 **Near-duplicate of BRG-003 §3.4.** Both say: a capability declares itself in `capabilities.ts` with a state and a reason, and the editor greys rather than lies. Whichever lands first should implement it once and the other should consume it — two mechanisms for this is the failure mode both tasks were written to prevent | **either, once** |

**DAT-005** is already marked superseded in phase 48's own table.

The honest read: **phase 48 and phase 97 are one subject split in two**, and the split is defensible
only if each knows what the other owns. A session picking up a `BRG` task re-reads the table above
and says in its notes which row it just touched.
