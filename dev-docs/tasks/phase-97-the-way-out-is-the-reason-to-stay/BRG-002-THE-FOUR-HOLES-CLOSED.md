# BRG-002 — The holes, closed

**Status: 🏗 §3.1 done s1 (2026-09-19) — the structural blocker is closed. §3.2 and §3.3 open.**

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
