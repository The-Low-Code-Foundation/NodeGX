# BRG-002 — The holes, closed

**Status: ⬜ Not started. Follows BRG-001.**

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
