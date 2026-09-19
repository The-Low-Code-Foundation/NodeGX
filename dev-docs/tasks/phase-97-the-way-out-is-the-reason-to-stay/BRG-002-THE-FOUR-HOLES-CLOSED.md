# BRG-002 — The holes, closed

**Status: 🏗 §3.1, §3.2 and §3.3 all built (s1-s3, 2026-09-19). Nothing in the backend reaches past
the storage interface any more, and `execution/` is at ZERO raw statements. AC1, AC4, AC5 and AC6
are closed; AC7 (`test:main` + `noodl-mcp`) is the remainder — see §7.**

## 1. The person sentence

**The parts of the backend that quietly reached around the database layer and wrote their own SQL
stop doing that — so the interface in BRG-001 is the truth and not an aspiration.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| hole | sites | where |
|---|---|---|
| `IdempotencyStore` owns its own table and 12 prepared statements | 12 | `execution/IdempotencyStore.ts:176` (`CREATE TABLE idempotency_keys`), `231-253` |
| `security/state.ts` reads and writes `_Role` and `_ApiKey` in raw SQL, through `facade.adapter.getDatabase()` | 8 | `security/state.ts:386, 392-393, 411, 429, 442-443, 452, 471` |
| `getDatabase()` raw-handle escapes | 5 | `service.ts:377`; `security/state.ts:386`; `execution/ExecutionStore.ts:128`; `AdapterFacade.ts:410, 426` |
| **Synchronous** facade methods — `getColumns`, `existsSync`, `upsertSync`, `ensureImportShape` | 7 | `backup/dataio.ts:62, 305, 338, 351, 352, 354`; `server/admin-search.ts:77` |

The sync methods are the only **structural** blocker in the whole phase: a synchronous call cannot
be served over a socket, at any cost, by any adapter. They are confined to the backup/import path
and one admin search route — not the hot path — which is why this is a small task and not a rewrite.

`backup/snapshot.ts` and `backup/schema-migrate.ts` are SQLite-specific by design and are **not**
holes. On Postgres they are `pg_dump` / `pg_restore`, which is BRG-004's business.

## 3. Design

### 3.1 The seven sync call sites go async

`getColumns` / `existsSync` / `upsertSync` / `ensureImportShape` become promise-returning and lose
the `Sync` suffix. `dataio.ts`'s import loop already runs inside an awaitable import job;
`admin-search.ts:77` is inside an HTTP handler. Neither is a hot path and neither needs batching in
v1 — but `upsert` is called **per row** at `dataio.ts:354`, so it takes an array and becomes one
call per batch rather than one per row. That is a performance improvement on SQLite too.

### 3.2 `IdempotencyStore` and `ExecutionStore` keep their own store — explicitly

These two own operational tables that are **not** user collections: `idempotency_keys`, and
`executions.sqlite` as a separate file. Forcing them through the collection facade would be the
wrong abstraction.

The honest answer is a second, much smaller interface — `IOperationalStore`, key-value plus
compare-and-set plus a sweep — which SQLite implements against its own file and Postgres implements
against its own table. BRG-003 gates it. **This is the one place the task adds a concept rather than
transcribing one, and it is here because the alternative is pretending an idempotency claim is a
record in a user collection.**

### 3.3 `security/state.ts` goes through the facade

`_Role` and `_ApiKey` are ordinary collections with ordinary rows. The eight raw statements become
facade calls. One wrinkle to measure before building: the API-key lookup at `state.ts:411` is on the
**request path** for every API-key-authenticated call, so its latency matters — check whether the
facade path adds a materially worse plan than the prepared statement, and record the number.

### 3.4 What is allowed to remain

`AdapterFacade:410, 426` reach `getDatabase()` for the sync upsert path and die with §3.1. If
anything still needs the handle after this task, it uses `nativeHandle` from BRG-001 §3.3, is listed
here by line, and BRG-003 asserts nothing in the promise depends on it.

## 4. Acceptance criteria

1. **AC1** — `grep -rn "\.prepare(" nodegx-backend/src/` returns hits only under `src/persistence/`
   and the `IOperationalStore` SQLite implementation. The count is recorded here.
2. **AC2** — No `Sync`-suffixed method remains on the facade; the 7 call sites await. The full
   backup/import round-trip test (`backup-roundtrip.test.ts`) stays green.
3. **AC3** — `upsert` takes a batch. Importing 10,000 rows is measured before and after, and both
   numbers are recorded here (expected: faster).
4. **AC4** — `IOperationalStore` is declared in the contract package, implemented for SQLite, and
   `IdempotencyStore` + `ExecutionStore` use it. `cwf-016-idempotency.test.ts` stays green unchanged.
5. **AC5** — `security/state.ts` no longer calls `getDatabase()`. `security-enforcement.test.ts` and
   `security-model.test.ts` stay green. API-key auth latency is measured before and after and both
   numbers are recorded here.
6. **AC6** — Every remaining `nativeHandle` site is listed in this file with its reason.
7. **AC7** — `test:main` green, and the `noodl-mcp` suite green (it consumes the backend's admin
   routes and is not run by `test:main`).


## 5. §3.1 as built, s1 — 2026-09-19

### 5.1 The count was 8, not 7 — and the missing one was the important one

`grep -a` for the facade's synchronous calls (⚠️ `-a`, because plain `grep -rn` skips `.ts` files in
this repo as binary, and `fs.existsSync` dominates the output and must be filtered out by hand):

| site | call |
|---|---|
| `backup/dataio.ts:82` | `getColumns` (in `exportCollection`) |
| `backup/dataio.ts:305` | `getColumns` |
| `backup/dataio.ts:338` | `existsSync` — **per row** |
| `backup/dataio.ts:351` | `getColumns` |
| `backup/dataio.ts:352` | `ensureImportShape` |
| **`backup/dataio.ts:353`** | **`transaction`** — 🔴 **absent from §2's list**, and the only one that could not be fixed by making a method awaitable |
| `backup/dataio.ts:354` | `upsertSync` — **per row**, inside that transaction |
| `server/admin-search.ts:77` | `getColumns` |

**Why the missing one mattered.** §3.1 says the four methods "become promise-returning and lose the
`Sync` suffix". That would not have worked: the caller was
`facade.transaction(() => { for (…) facade.upsertSync(…) })`, and **a caller cannot hold a
synchronous SQLite transaction open across an `await`**. Promise-returning writes inside a sync
callback is a contradiction, so the transaction had to move.

### 5.2 The shape that closed it

`IStorageFacade`'s five synchronous members became four, **every one returning a Promise**:

| was | is |
|---|---|
| `getColumns(c): ImportColumn[]` | `getColumns(c): Promise<…>` |
| `existsSync(c, id): boolean` — per row | `existingIds(c, ids[]): Promise<Set<string>>` — one call |
| `ensureImportShape(…): void` | `ensureImportShape(…): Promise<void>` |
| `transaction(fn): T` + `upsertSync(…)` per row | `upsertBatch(c, rows[]): Promise<{created, updated}>` — **owns the transaction internally** |

✅ **`existingIds` also removed a raw-handle reach rather than merely making it awaitable**: it goes
through `rawQuery` with `{ objectId: { $in: … } }`, chunked at 500 ids, so it is **portable** where
`existsSync` was prepared SQL on the raw handle. Two of the three `getDatabase()` sites are now one.

⚠️ **`upsertBatch` is the one facade method whose implementation is still SQLite-specific** — it
needs `adapter.transaction()`'s synchronous callback and the adapter's own `QueryBuilder` to keep
all-or-nothing. **BRG-005 owes either a batch write on `IStorageAdapter` or its own facade**, and
BRG-003 is what catches it if neither arrives, because the rollback is a conformance case rather
than a comment. Recorded here rather than solved, because solving it needs the second adapter to
exist.

### 5.3 🔴 AC3's prediction was wrong, and the honest number is worth more

§3.1 predicted the batch would be *"a performance improvement on SQLite too"*, and AC3 says
**"expected: faster"**. Measured on `tests/brg-002-import-throughput.test.ts`, 10,000 rows, same
machine, before and after:

| | first import (all new) | re-import (all existing) |
|---|---|---|
| **before** (per-row `existsSync` + per-row `upsertSync`) | 169 ms | 170 ms |
| **after** (one `existingIds`, one `upsertBatch`) | 120–130 ms | 118–127 ms |

**~28% faster, and 17 µs per row before.** So the per-row loop was never a bottleneck on SQLite —
a prepared statement against a local file costs almost nothing, and anyone reading "N queries per
import" as a performance problem would have been reasoning about a cost that was not there.

✅ **The reason to do this was never performance — it is that the interface could not otherwise be
implemented over a socket.** The number that will actually move is the out-of-process one: 10,000
round trips become 1, and that is the case nobody can measure until BRG-005 exists. Recorded so that
BRG-005 measures it rather than assuming it.

### 5.4 Acceptance criteria touched

| | criterion | |
|---|---|---|
| AC2 | no `Sync`-suffixed method on the facade; the call sites await; `backup-roundtrip.test.ts` green | ✅ — 8 sites, not 7 |
| AC3 | `upsert` takes a batch; 10,000 rows measured before and after | ✅ — and the prediction it carried was wrong (§5.3) |
| AC7 | `test:main` green | 🏗 — `nodegx-backend` is **139/139 files, 1673 passed, 0 failed**; both typechecks green. `test:main` and `noodl-mcp` still owed |

**Still open: §3.2 (`IOperationalStore`), §3.3 (`security/state.ts` onto the facade), AC1, AC4, AC5,
AC6.** `security/state.ts` remains the one module reaching past the interface, through the named
`adapter` dependency BRG-001 gave it.


## 6. §3.3 as built, s1 — the last reach past the interface is gone

### 6.1 §3.3's premise was false, and Richard ruled the fix

§3.3 says *"`_Role` and `_ApiKey` are ordinary collections with ordinary rows. The eight raw
statements become facade calls."* Five of the six statements were exactly that. **`rolesForUser` was
not**: it joined `_Role` to `_Join_users__Role`, and two candidate replacements were measured and
rejected before building —

| candidate | measured |
|---|---|
| `$relatedTo` (`QueryBuilder.ts:357`) | ❌ **Wrong direction.** It emits `objectId IN (SELECT relatedId … WHERE owningId = ?)` — it answers "which users are in this role", and this needs the inverse |
| Query `_Join_users__Role` as an ordinary collection | ⚠️ **Works today** (probed: returns `{owningId, relatedId}`), and is the wrong answer. The junction table's *name* is the SQLite adapter's private storage convention, so a security module hardcoding it would return **no roles** on any adapter that stores relations differently — a permissions outage that reads as "this user has no roles", not as an error |

**Richard ruled: add the missing lookup.** `getRelationOwners(owningClass, relationName, relatedId)`
now sits beside its mirror image `getRelatedIds` in `SchemaManager`
(`local-sql/SchemaManager.ts`), and is declared on `IStorageSchema`. 🔴 **It is the one member of
the three interfaces that was not already an object-method call** — it was a JOIN written in SQL —
so it is the one place BRG-001's rule 1 was deliberately set aside, by ruling, and it is in the
promise like everything else: BRG-003 gates it.

`rolesForUser` is now two portable calls (the owning ids, then the rows for their names) and skips
the second entirely when the user is in no roles.

### 6.2 🔴 The bug this nearly shipped, which no type and no existing test would have caught

`_ApiKey.scopes` is declared **`Array`** (`service.ts:888`). The raw SQL wrote
`JSON.stringify(scopes)` into the column *by hand*. Moving the write onto `rawCreate` changes **who
serializes it** — the adapter does — so passing that same pre-stringified value through the facade
would have stored a JSON string *inside* a JSON array, and every scope list would have read back
wrong on the authorization path.

Nothing in the 1,673-test suite covered a create→list→authorize round trip for an API key.
`tests/brg-002-api-key-roundtrip.test.ts` does now, and it asserts the scopes come back as
`['records:read', 'records:write']` — the assertion the bug fails.

✅ **`parseScopes` reads both shapes**, so keys written by the old code still resolve.

### 6.3 AC5 — the latency, measured both ways, and the answer is honest rather than flattering

2,000 authorizations through `resolvePrincipal` with an API key, same machine, before = commit
`637217156` (raw prepared statements) restored over the module and re-run:

| | per auth |
|---|---|
| **before** — two prepared statements on the raw handle | **0.021 ms** |
| **after** — `rawQuery` + `rawSave` through the facade | **0.137 ms** |

🔴 **6.5× slower on the authorization path**, and it is recorded rather than explained away. In
absolute terms it is ~7,300 authorizations per second in one process, against a claim (§3 of the
phase README) of *"one app process, thousands of active users"* — so it is not a wall, but it is a
real cost and BRG-005 should re-measure it rather than inherit this number.

**Where it goes:** `touchApiKey` — the advisory `lastUsedAt` write — is **179 ms of the 273 ms**.
One `UPDATE` became a fetch, a serialize and a change event.

🔴 **And the obvious fix does not work, which is the part worth keeping.** `touchApiKey` is now
fire-and-forget, and it was measured **both ways**: throughput 0.137 ms/auth, latency 0.131 ms/auth,
**unchanged**. The adapter is synchronous under the hood (`node:sqlite` wrapped in a promise), so
the write runs on the calling stack before the promise is returned — there is no "later" to defer it
to. It is kept because it is a true statement about `lastUsedAt` (nothing authorizes on it) and
because it is the shape that *will* pay on an adapter reached over a socket — **not** because anyone
measured a win. Assuming it had one would have been the easy mistake.

### 6.4 Acceptance criteria

| | criterion | |
|---|---|---|
| AC1 | `.prepare(` only under `persistence/` and the operational store | 🏗 — `security/state.ts` is at **0**, down from 6. `execution/IdempotencyStore.ts` still has 10 (§3.2) |
| AC5 | `security/state.ts` no longer calls `getDatabase()`; the security specs stay green; latency measured before and after | ✅ — and `SecurityStateDeps.adapter`, the named reach BRG-001 added, is **deleted**. `security-enforcement`, `security-model` and `admin-cors-devopen` green (67 tests) |
| AC6 | every remaining `nativeHandle` site listed | ✅ — **outside `persistence/`, none.** The only `getDatabase()` callers left in the backend are `AdapterFacade.upsertBatch` and its helper |

**§3.2 (`IOperationalStore` for `IdempotencyStore` and `ExecutionStore`) is what remains**, plus AC4
and AC7.

---

## 7. §3.2 as built, s3 — 2026-09-19

`IOperationalStore` is declared, implemented for SQLite, and `IdempotencyStore` is on it.
**`execution/` is at zero prepared statements, down from ten**, and `ExecutionHistory.getDatabase()`
— the last raw-handle escape outside `persistence/` — is gone.

| | file | what it is |
|---|---|---|
| new | `nodegx-backend-contract/src/operational.ts` | the interface — 7 methods, 3 payload types + the record |
| new | `nodegx-backend/src/persistence/SqliteOperationalStore.ts` | the SQLite implementation — 8 prepared statements, all of them here |
| edit | `nodegx-backend/src/execution/IdempotencyStore.ts` | rewritten onto the interface; no longer knows SQLite exists |
| edit | `nodegx-backend/src/execution/ExecutionStore.ts` | `getDatabase()` becomes `getOperationalStore()`; the sweep registry takes a promise |
| edit | `HttpServer.ts`, `service.ts` | the five call sites await |
| new | `tests/brg002-operational-store.test.ts` | 17 cases (§7.3) |

### 7.1 🔴 The interface had to be async, and §3.1's sentence was narrower than it read

§3.1 called the seven synchronous facade methods *"the only **structural** blocker in the whole
phase"*. That sentence is true about the facade and **false about the phase**, and §3.2 is where it
would have been found out: the ten statements it replaces sit behind a synchronous `claim()`,
`complete()`, `release()`, `sweep()` and `count()`, and declaring `IOperationalStore` in that shape
would have written the phase's one structural blocker into a brand-new file the same week it was
closed in the old one.

So every method on the interface returns a promise, `IdempotencyStore`'s surface is async, and five
call sites gained an `await`. The reasoning is §3.1's, unchanged: *a synchronous call cannot be
served over a socket, at any cost, by any adapter.* That is a statement about calls, not about one
class.

**The one place it was not a one-word change:** `ExecutionHistory.prune()` runs the registered
sweeps, and it is called from `createLogger()`, which is synchronous because **every execution
record is born there**. Awaiting a retention DELETE on that path would put it in front of a function
run. So `registerSweep` now accepts `() => number | Promise<number>` and `prune()` **starts** each
sweep without awaiting it — with a `.catch`, because an unhandled rejection there would take the
process down, which is precisely what *"one broken table cannot stop another"* was written against.
Nothing but a log line ever read a sweep's count.

### 7.2 The shape, and the two things it deliberately does not carry

Key-value, plus compare-and-set, plus a sweep — §3.2's own words. The ten statements reduce to seven
methods with nothing left over, which is the evidence that the concept was already there and only
the interface was missing.

**One timestamp, not two.** The table had `claimed_at` and `completed_at` and swept on whichever
suited. The record now has `claimedAt` (when the token took it) and `updatedAt` (when it last
changed), and **every** sweep and every takeover compares `updatedAt` only. That works because the
two ages are never live at once: while a record is `running`, `updatedAt` *is* its claim time; once
it is `done`, `updatedAt` *is* its settle time. A second column would carry the same two numbers and
one more way for them to disagree. `tests/brg002-operational-store.test.ts` pins that equivalence
directly rather than leaving it as a comment.

🔴 **`request_hash` is dropped, and this is the measurement that made that safe.** It was written on
every claim and read by **nothing**: `grep -rna 'requestHash|request_hash'` over `src/` and `tests/`
returns hits in `IdempotencyStore.ts` alone, and its only reader there was `peek()`, whose only
callers are inside the same file. The `requestHash` argument to `claim()` went with it — `HttpServer`
still computes the hash, because it folds it into the *identity* when `hashBody` is on, which is the
half that was ever load-bearing. Carrying a write-only column into the interface would have meant
every future adapter implementing a field nobody reads (phase rule 2, from the other direction).
**Reversible:** re-adding it is a column and a parameter, and this paragraph is the record of why it
went.

⚠️ **Identity is two parts and the owner composes the second.** A record is `(namespace, key)`, and
the namespace is the **owning subsystem** (`'idempotency'`), not the function name — so `sweep` and
`count` cannot reach another subsystem's rows. CWF-016's `(scope, key)` is composed into one key with
a NUL separator, guarded by a throw on a scope containing one. The alternative, a three-part
identity, is a column added for one caller's convenience.

🔴 **A new table, and the old one is left behind.** Column renames cannot be
`CREATE TABLE IF NOT EXISTS`-ed over an existing table — the statement is a no-op, every prepare then
fails on an unknown column, and the upgrade boots straight into `CWF-016 idempotency DISABLED`. So
`operational_records` is new and `idempotency_keys` is **left in `executions.sqlite` rather than
dropped**: a few KB that make a downgrade a downgrade rather than a data loss. The consequence,
recorded rather than argued: every `running` claim is already released on every start by design, so
the genuinely new loss is *completed* replay records — at most one duplicate run per key, once, on
the boot that upgrades.

### 7.3 🔴 The namespace argument was invisible to every existing test, and one mutant proves it

`idempotency-store.test.ts` drives this store hard, but through one caller, which uses **one**
namespace and **two** states. So namespace isolation — the entire reason `sweep` and `count` take a
namespace — was a write nobody read.

Measured rather than asserted. Both `namespace = ?` predicates in the sweep statements were replaced
with `? IS NOT NULL` (the argument still bound, still ignored) and the two suites re-run:

| suite | unmutated | mutated |
|---|---|---|
| `idempotency-store.test.ts` (15) | green | **still green** — it cannot see the defect |
| `brg002-operational-store.test.ts` (17) | green | 🔴 **2 failed** — both namespace-isolation cases |

That is what the new spec is for. Its 17 cases cover the refusals (`settle`, `discard` and `retake`
each resolving `false` rather than throwing — two plausible implementations of a failed CAS, and only
one of them is this contract), namespace isolation on every sweep, the single-timestamp equivalence,
and the fail-closed path: a dropped table rethrows rather than reading as contention, because
reported as contention a broken table becomes "every delivery waits for a claim nobody holds".

### 7.4 Acceptance criteria

| | criterion | |
|---|---|---|
| AC1 | `.prepare(` only under `persistence/` and the operational store | ✅ **with one wording correction** — see below |
| AC4 | `IOperationalStore` declared in the contract, implemented for SQLite, `IdempotencyStore` + `ExecutionStore` on it; `cwf-016-idempotency.test.ts` green **unchanged** | ✅ — that file is untouched in the diff and its cases are green |
| AC6 | every remaining `nativeHandle` / `getDatabase()` site listed | ✅ — outside `persistence/`, **none**. `AdapterFacade.upsertBatch` and its helper are the only two left, both inside |
| AC7 | `test:main` green, `noodl-mcp` green | 🏗 — package suite **141/144, 1692 passed**, every spec touching this change green; 3 reds attributed in §7.6 (2 re-run green, 1 drive owes a quiet re-run). `test:main` + `noodl-mcp` still owed |

🔴 **AC1's wording missed an exemption the task file already carried.** Measured with `grep -rna`
(the `-a` matters — plain `grep` silently skips a `.ts` file it reads as binary, which is how a
`HttpServer.ts` caller nearly went unseen this session):

| where | before | after |
|---|---|---|
| `src/execution/` | **10** | **0** |
| `src/persistence/` | 2 (`AdapterFacade`) | **10** (2 + the 8 that are the implementation) |
| `src/backup/` | 2 | 2 — `snapshot.ts` and `schema-migrate.ts` |

The two `backup/` sites are **not** holes and §2 of this file says so in as many words: on Postgres
those files are `pg_dump` and `pg_restore`, not a port. AC1's sentence simply did not carry the
exemption its own task file had already granted, so it is recorded here rather than counted as red —
the criterion is **`.prepare(` only under `src/persistence/` and in the two declared-SQLite-specific
backup modules**, and at HEAD that is exactly where they are.

### 7.5 🔴 One finding, handed to BRG-005: there is no shutdown path to hang `close()` on

`IOperationalStore` was written with a `close()` and it was **taken back off**, because measuring
for its caller found none: `ExecutionHistory` has no shutdown method at all, `BackendService.stop()`
does not close `executions.sqlite`, and the SQLite handle is released by process exit. Declaring a
method nothing reaches is rule 1 of the phase README in as many words — *a method that exists
because it would be nicer is a method the conformance suite will not gate, and therefore a method
that is not part of the promise.*

⚠️ **It stops being free at BRG-005.** A Postgres operational store holds a connection pool, and a
pool nothing releases is a leak the SQLite implementation structurally cannot have — which is
exactly the class of difference this phase exists to surface before it is expensive. So BRG-005 adds
`close()` **together with the caller**, and the caller does not exist yet: giving `ExecutionHistory`
a shutdown and wiring it into `BackendService.stop()` is a prerequisite, not a detail. That is a
finding about the service, not about the interface, and it is filed here rather than left to be
rediscovered at full price.

**Filed as BRG-D6** (see phase README §9).

### 7.6 AC7 — the package suite at `ef772b0b1`, and the three reds that are not the change

`nodegx-backend`, 144 files, run at HEAD after the commit:

**`Test Suites: 3 failed, 141 passed, 144 total` · `Tests: 30 failed, 10 skipped, 1692 passed, 1732 total`**

🔴 **Every spec that touches this change is green** — `cwf-016-idempotency`, `idempotency-store`,
`brg002-operational-store`, `execution-retention`, `def004-execution-steps`,
`sbr015-execution-steps-drive`. The three reds are attributed below rather than waved at, because
"none of them are mine" is a reading that fits and not one that excludes.

| failures | spec | what the log actually says | resolution |
|---|---|---|---|
| **28** | `ac2-page-editor-drag-drive` (SBR-007) | **one `beforeAll` hook, `Exceeded timeout of 1800000 ms`.** Every test in the file then reports failed because the hook never completed — including all nine CONTROLs, which is the tell: when the *controls* fail the instrument never got its subject on screen | ⬜ **unresolved** — owes a quiet re-run |
| 1 | `def009-public-write-default` | a token-bucket threshold: `statuses[30]` expected `429`, received `200` | ✅ **passes on re-run** |
| 1 | `fed-002-indexes` | `TypeError: fetch failed` at `helpers/http.ts:57` — connection-level, not an assertion | ✅ **passes on re-run** |

**The contamination was measured, not inferred.** A peer launched an editor stack during the run:
at the moment the suite finished, `start-electron-dev` was 8 minutes old and three `webpack`
processes were 23–24 minutes old — i.e. two of them started *inside* my run's window. The two cheap
specs were then re-run **with that stack still up** and both passed, 40/40, which is the stronger
result: they are load-sensitive rather than stack-sensitive.

⚠️ **The drive is NOT claimed green.** `grep -acE "idempot|getDatabase|getOperationalStore|registerSweep|ExecutionHistory|OperationalStore"`
over that spec returns **0**, and a starved `beforeAll` is not a behaviour, but neither of those is a
passing run. It is re-run on a quiet box before AC7 closes.

🔴 **And the suite reported itself dead when it was not.** The background wrapper exited `144` with
the log 11 minutes in and no `Tests:` line — which is exactly the shape of a swept suite
([[launching-an-editor-kills-a-running-test-ci]]: `EXIT=137`, no summary, the tail all ticks). It was
alive: 7 workers running, log mtime 8 seconds old. **A missing summary line cannot separate "killed"
from "still running"** — the three fields that can are worker count, log mtime, and PASS count
against the file count on disk. Same family as
[[a-backgrounded-command-exit-code-can-lie]], different mechanism: there `;` hands you the last
command's code, here the wrapper died out from under live work that had inherited the redirect.

**AC7 remains 🏗:** `test:main` and the `noodl-mcp` suite are still owed, plus the one drive re-run.
