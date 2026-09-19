# BRG-001 — The seam, written down

**Status: 🏗 Built s1 (2026-09-19). R1 and R3 ruled. ACs 1, 2, 3, 5, 6 met; AC4 measuring.**

## 1. The person sentence

**Nobody has to guess what a NodeGX backend needs from a database, because it is one file, and a
reviewer can tell at a glance whether a new feature just made the product harder to leave.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| reading | where |
|---|---|
| Exactly 8 modules touch `adapter.`, using 8 names: `connect`, `disconnect`, `getDatabase`, `getPersistenceStatus`, `on`, `off`, `schemaManager`, `transaction` | grep `adapter\.[a-zA-Z_]*` over `nodegx-backend/src/` |
| `AdapterFacade` fronts the adapter for everything else, in two deliberate views — `raw*` (storage-shaped) and `wire*` (Parse-wire `{__type}` envelopes, `include=` pointer expansion). Its docstring calls this "one database, two protocols" | `persistence/AdapterFacade.ts:1-21, 112-425` |
| `SchemaManagerLike` already declares 14 schema methods, and says it is a stand-in to be replaced "when PLAT-003 types the adapter" | `persistence/SchemaManagerLike.ts:1-25, 99-103` |
| `createAdapter` types the adapter it returns as `adapter: any` | `persistence/createAdapter.ts:35` |
| `LocalSQLAdapter` has ~36 public methods; the backend uses 8 of them | `local-sql/LocalSQLAdapter.ts` |
| The contract package that should hold this already exists, is types-and-data-only by charter, and already carries `BackendType`, capability descriptors and filter translators | `nodegx-backend-contract/package.json`; `src/capabilities.ts`; `src/backends.ts` |

## 3. Design

### 3.1 Where it lives

`packages/nodegx-backend-contract/src/storage.ts`. That package's charter is *"Types and data only —
no I/O, no adapter implementations"*, which is exactly what this is, and it is already the place the
editor and the backend both look to ask what a backend can do.

### 3.2 What it declares

Three interfaces, each a transcription of calls that exist today:

- **`IStorageAdapter`** — the 8 names the backend actually uses. `getDatabase()` is the problem
  child and is handled in §3.3.
- **`IStorageFacade`** — the ~22 `AdapterFacade` methods. **Every one returns a `Promise`** (see
  BRG-002 for the seven that do not today).
- **`IStorageSchema`** — `SchemaManagerLike`'s 14, promoted from stand-in to the real type, minus
  `generatePostgresSQL` / `generateSupabaseSQL`, which are a *migration* concern and move to BRG-004.

### 3.3 `getDatabase()` — the one honest exception

Five call sites hand out the raw SQLite handle. Four of them are BRG-002's job to remove. The
interface therefore declares:

```ts
/** SQLite-only escape hatch. Returns null on any adapter that is not file-backed SQLite. */
readonly nativeHandle?: { kind: 'sqlite'; db: unknown } | null;
```

Named so that a caller reaching for it knows it is an exception, `kind`-tagged so a Postgres adapter
returns `null` rather than something that looks usable, and **optional** so BRG-003 can assert that
no conformance-covered behaviour depends on it.

### 3.4 What it is not

Not a redesign. Every member must be traceable to a call site this task file names. A method that
exists because it would be nicer is out of scope, will not be in the conformance suite, and is
therefore not part of the promise.

## 4. Acceptance criteria

1. **AC1** — `nodegx-backend-contract/src/storage.ts` declares `IStorageAdapter`, `IStorageFacade`
   and `IStorageSchema`, and a doc comment on each member names the file and line it was
   transcribed from.
2. **AC2** — `createAdapter.ts`'s return type is `IStorageAdapter`, not `any`. `AdapterFacade`
   `implements IStorageFacade`. Both typecheck with no `as` cast at the boundary.
3. **AC3** — `SchemaManagerLike` is deleted and its 13 call sites import `IStorageSchema` instead;
   the stand-in docstring's own instruction ("should be replaced by the real type") is carried out.
4. **AC4** — `npm run typecheck` is green in `nodegx-backend` and `nodegx-backend-contract`, and
   `test:main` is green.
5. **AC5** — A test asserts the interface is *closed*: a mock implementing exactly `IStorageFacade`
   and nothing else satisfies every module under `src/` that takes a facade. A module reaching past
   the interface is a compile error, which is the whole point.
6. **AC6** — `nativeHandle` appears in exactly the sites BRG-002 leaves behind, and the count is
   recorded in this file.


## 5. What was built, s1 — 2026-09-19, on HEAD `c7fe1a1da`

`packages/nodegx-backend-contract/src/storage.ts`, exported from that package's `index.ts`, and
`nodegx-backend` now declares the dependency edge (the workspace symlink already resolved it, so no
install was needed). **Every import is `import type`**, so the emitted bundle is byte-identical:
this task added a compile-time edge and no runtime one.

### 5.1 🔴 The three numbers the scoping session had wrong

All three were found by building the thing, not by re-reading §2 — which is the argument for
building it.

| | §2 / the task file said | measured while transcribing |
|---|---|---|
| 🔴 | *"The whole adapter surface those 8 use is **8 names**"* | **20.** `AdapterFacade.call()` dispatches twelve more **by string** — `this.adapter[method]({...})`, `AdapterFacade.ts:102-110` — so `query`, `search`, `fetch`, `create`, `save`, `delete`, `count`, `aggregate`, `distinct`, `increment`, `addRelation` and `removeRelation` never appear as a literal `adapter.<name>` for a grep to find. **Those twelve are the entire data plane.** An adapter implementing the other eight would compile, start, connect, and answer nothing. This is the single biggest correction in the phase so far, and it lands on BRG-005's estimate rather than on this task's. |
| | *"Exactly **8 modules** in the backend touch `adapter.` at all"* | **6.** `triggers/dbchange.ts` and `server/http-util.ts` are named in §2 and neither touches an adapter — the first says so in its own comment (*"This class does NOT touch the adapter"*), the second requires `QueryBuilder`. |
| | *"`getDatabase()` raw-handle escape — **5** sites"* | **3** adapter escapes: `AdapterFacade.ts:410, 426` and `security/state.ts:386`. The other two are `ExecutionStore`'s **own** `getDatabase()` over its own separate `executions.sqlite` file (`ExecutionStore.ts:128` is the definition; `service.ts:377` the caller) — not the adapter's, and BRG-002 §3.2 territory. |

⚠️ **How the 8 were found to be 20** is worth recording, because the same trap is live for every
future sweep of this codebase: `grep -rn` **silently skipped `src/server/HttpServer.ts` as a binary
file** during the consumer sweep in this session, and would have left one module untyped. `grep -a`
found it. The scoping session's counts were taken with plain `grep -rn`.

### 5.2 The shape as built

- **`IStorageAdapter`** — the 8 literal names, extending **`IStorageDataPlane`** (the 12 by string),
  each transcribed with the `LocalSQLAdapter.ts` line it came from, plus the eleven callback-shaped
  option types at `LocalSQLAdapter.ts:70-165`.
- **`IStorageFacade`** — 21 methods + the `schemaManager` getter. The five synchronous ones carry a
  🔴 marker naming BRG-002 as the task that makes them awaitable.
- **`IStorageSchema`** — the 16 names of the old `SchemaManagerLike`, which is **deleted**.
- `getDatabase()` is declared **optional and returning `unknown`**, under the name it actually has.
  §3.3 sketched a `nativeHandle` property; inventing a second name for a method with three live call
  sites would have been a redesign, which rule 1 forbids. BRG-002 renames it when one caller is
  left. Both facade sites now go through one private `sqliteHandle()` that throws a sentence.

### 5.3 The closure, and the one module that is not closed

**Eighteen modules** were retyped from the concrete `AdapterFacade` class to `IStorageFacade`, and
`tsc` is green — which is the actual content of AC5: **not one of them was reaching past the
interface.** `HttpServer.ts`, `parse-wire.ts`, `byob-admin.ts`, `users.ts`, `oauth-routes.ts`,
`admin-security.ts`, `admin-search.ts`, `admin-backups.ts`, `email-routes.ts`, `identities.ts`,
`RoleStore.ts`, `SystemRoles.ts`, `SystemUsers.ts`, `MetadataStore.ts`, `FileSubsystem.ts`,
`audit.ts`, `tokens.ts`, `dataio.ts`.

🔴 **`security/state.ts` is the one that is not, and it now says so out loud.** It reads `_Role` and
`_ApiKey` with prepared statements on the raw handle, because the adapter's query API cannot express
the junction join and this runs on every authenticated request. Rather than let it reach through
`facade.adapter` — invisible, one property deep — `SecurityStateDeps` now takes **`adapter:
IStorageAdapter` as its own named dependency**, so the reach is written at every construction site.
BRG-002 §3.3 deletes that line. **AC6's count: one.**

### 5.4 What changed behaviourally (deliberately, and it is small)

`GET /admin/schema-export?format=postgres|supabase` now answers **501** on an adapter that does not
implement the generator, instead of crashing — the same shape the FED-002 index routes already use.
On SQLite nothing changes: the generators are there, and they still emit everything R3 ruled BRG-004
must repair.

## 6. Acceptance criteria — s1

| | criterion | |
|---|---|---|
| AC1 | `storage.ts` declares the three interfaces, each member carrying its source file and line | ✅ |
| AC2 | `createAdapter` returns `IStorageAdapter`, `AdapterFacade implements IStorageFacade`, no cast at the boundary | ✅ — the one cast left is the by-string dispatch inside `call()`, documented, because indexing a union of twelve differently-shaped callbacks gives `never` |
| AC3 | `SchemaManagerLike` deleted, its call sites import `IStorageSchema` | ✅ — deleted; 6 modules repointed |
| AC4 | `typecheck` green in both packages, `test:main` green | ✅ — `tsc --noEmit` clean in `nodegx-backend` **and** `nodegx-backend-contract`; `nodegx-backend`'s own suite **137/137 files, 1668 passed, 10 skipped, 0 failed** in 314 s (2026-09-19). The new spec ran and is 4/4 — checked alone, because a spec that matches nothing reports the same silence as a spec that passes |
| AC5 | a mock implementing exactly `IStorageFacade` satisfies every module that takes a facade | ✅ — `tests/brg-001-storage-interface.test.ts`, plus the 18-module retype that compiles |
| AC6 | every remaining raw-handle site listed with its count | ✅ — **1**: `security/state.ts`, via a named `adapter` dep (§5.3) |

🔴 **A caveat on AC5 that the next session must not lose:** `jest.config.js` runs ts-jest with
`isolatedModules: true`, which **transpiles without typechecking**. The compile-time half of that
spec is graded by `npm run typecheck:backend-tests` (which does include `tests/**`) and **by nothing
else** — under `npx jest` it is green whatever it says.
