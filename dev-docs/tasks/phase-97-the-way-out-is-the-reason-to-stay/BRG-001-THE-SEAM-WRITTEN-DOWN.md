# BRG-001 — The seam, written down

**Status: ⬜ Not started. Gated on R1 and R3.**

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
