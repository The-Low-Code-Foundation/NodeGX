# FED-002 — A collection declares its indexes

## 1. The person sentence

**Someone who writes the same feed item twice gets one row, because the collection said `id` is
unique, and a list of ten thousand items sorted by date comes back as fast on day ninety as on day
one.**

## 2. What is there (read 2026-09-18, HEAD `f3f67874d`)

| reading | where |
|---|---|
| `SchemaManager` creates exactly two indexes per table, `createdAt` and `updatedAt`, on create and on migration. The comment says it in words: *"no indexes (only `createdAt`/`updatedAt` are indexed"* | `local-sql/SchemaManager.ts:128-129, 341, 467-468` |
| Relations get junction-table indexes. That is the only other `CREATE INDEX` | `SchemaManager.ts`, junction path |
| The schema surface exposes `hasSearchIndex` / `rebuildSearchIndex` / `dropSearchIndex` and nothing about ordinary indexes | `persistence/SchemaManagerLike.ts:77-79` |
| FTS5 opt-in is already declared per collection in a JSON file the dashboard and MCP edit: `<dataDir>/search.json`. That is the pattern to match | `src/search/model.ts`, `SearchState.ts` |
| Collection schemas live in the project's `schema.json` and are pushed to a backend; the MCP has `Diff a schema against a backend` | `noodl-mcp/src/tools/backendTools.ts` |
| Create is `POST /classes/:collection` → `stampCreate` → insert. There is no upsert, and no unique constraint to conflict with | `server/parse-wire.ts:198-202` |

## 3. Design

### 3.1 The declaration

Each collection in `schema.json` may carry:

```json
"indexes": [
  { "fields": ["id"], "unique": true },
  { "fields": ["sourceId", "published"] },
  { "fields": ["published"], "order": "desc" }
]
```

`fields` is one to four property names of that collection. `unique` defaults to false. `order`
applies to every field of the index and defaults to `asc`. The name is derived
(`idx_<collection>_<fields joined by _>`) and never written by a person.

### 3.2 What the backend does with it

- `SchemaManager` creates and drops indexes to match the declaration on schema push and on
  migration, the way it already reconciles columns. A removed declaration drops the index. The
  built-in `createdAt`/`updatedAt` pair stays and cannot be declared away.
- Creating a **unique** index over existing duplicate rows fails the push with the count of
  duplicates and the first three offending values, and changes nothing. It never deletes data.
- A `unique` violation on `POST /classes/:c` returns **409** with `{ code, field, value }`. The
  Parse-wire client and the `Create New Record` node surface it on `Failure` with that shape.

### 3.3 Upsert, because a feed needs it

`POST /classes/:c` accepts a header `X-NodeGX-Upsert: <field>` naming a **unique-indexed** field.
When the row exists, the request becomes an update of that row and returns 200 with `objectId`;
otherwise a create, 201. Any other field name is a 400. The `Create New Record` node gains an
`upsertOn` port with the same rule. This is the whole dedupe story for FED-006: `Parse Feed` →
`for-each` → `Create New Record (upsertOn: id)`.

### 3.4 Where a person sees it

The `/_admin` dashboard's collection view lists declared indexes and whether each is built. The
MCP `Diff a schema against a backend` tool reports index drift like column drift. The execution
record of a schema push names the indexes it created or dropped.

## 4. Acceptance criteria

1. **AC1** — Pushing a schema with the three declarations above creates three SQLite indexes;
   `PRAGMA index_list` in the test shows them with the derived names and `unique` correct.
2. **AC2** — Two creates with the same `id` on a unique-indexed collection: the second returns 409
   with `field: "id"`. With `X-NodeGX-Upsert: id`, the second returns 200 and one row exists.
3. **AC3** — Upsert on a non-unique field is a 400 that names the rule.
4. **AC4** — A unique declaration pushed over a table holding duplicates is refused with the
   duplicate count; the table is unchanged; the push is recorded as refused.
5. **AC5** — A 20,000-row collection sorted by an indexed `published desc`, `limit 50`, answers
   under 20 ms in the test; the same query on a control collection without the index is measured
   and reported in the task file (not asserted, since SQLite may choose to scan a small table).
6. **AC6** — Removing a declaration and pushing drops the index; `createdAt`/`updatedAt` survive.
7. **AC7** — The `Create New Record` node's `upsertOn` port exists, is documented, and a cloud
   function using it passes AC2 over the node path, not only raw HTTP.

---

## 5. Built — session 2 (2026-09-18)

**All seven ACs green.** The drive is `packages/nodegx-backend/tests/fed-002-indexes.test.ts`
(26 specs, over HTTP against a real service on a real database); the SQL semantics are pinned
beside the code that emits them in
`packages/noodl-runtime/test/adapters/SchemaManager.indexes.test.js` (14 specs).

### 5.1 Where each piece landed

| piece | file |
|---|---|
| The declaration, its validation, the derived name, reconcile, the duplicate report | `noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` (new "Declared indexes" section) |
| `UNIQUE constraint failed: T.c` decoded into `{ collection, fields }` | `local-sql/QueryBuilder.ts` — `uniqueConstraintProblem` |
| 409 with `{ code, field, value }`, and `HttpError` learning to carry extra body fields | `nodegx-backend/src/server/http-util.ts` — `uniqueViolationToHttp` |
| `X-NodeGX-Upsert`, the lookup, the update, the race retry | `nodegx-backend/src/server/parse-wire.ts` — `classesUpsert` |
| `setIndexes` action, `indexes` on `createTable`, index status on every schema read | `nodegx-backend/src/server/byob-admin.ts` |
| Declared indexes listed and editable in `/_admin` | `nodegx-backend/src/admin/ui/index.html` (Schema view) |
| Index drift in the schema diff, and applied on promotion | `nodegx-backend/src/backup/schema-migrate.ts` |
| `Upsert On` port; `upsertOn` on the adapter contract; the REST adapters refusing it | `newdbmodelpropertiesnode.ts`, `nodegx-backend-contract/src/data.ts`, `ParseWireAdapter.ts`, `RestDataAdapter.ts` |

### 5.2 Three decisions the task file did not settle, and the reading taken

1. **The declaration lives in the collection's `_Schema` row, not in a file beside it.** FED-002 §2
   names `search.json` as "the pattern to match", and it is the pattern for *validation* and for
   *a person editing it* — but not for *where it lives*. An index is part of a collection's shape
   in a way a full-text opt-in is not: it travels with the schema through an export, a backup and a
   promotion, and a promotion that carried the columns but not their unique constraints would have
   moved a dedupe guarantee into a hope. So `schema.indexes` it is, exactly as §3.1 writes it, and
   `schema-migrate` carries it.
2. **Reconciliation reads `PRAGMA index_list` / `index_xinfo`, never the `_Schema` row.** Same
   choice, for the same reason, that `_columnScope` makes about `PRAGMA table_info` (DEF-014): the
   tracking row records what somebody *meant*. `indexStatus` therefore reports drift — an index
   that exists and nothing declares — as `declared: false` rather than hiding it.
3. **`field` and `value` reach the WIRE; the node's `Error` port gets the sentence.** §3.2 says the
   Create Record node surfaces the refusal "with that shape". Its `Error` port is a `string` and
   `setError(err: string)` is the family's one funnel, so the structured `{ code, field, value }`
   is on the 409 body (where an HTTP client, a workflow step or another app reads it) and the node
   shows `"id" is unique in "Item" and "guid-1" is already used. Send X-NodeGX-Upsert to update the
   existing record instead.` Widening the whole Record family's error channel to an object is a
   change to five nodes' contract and is not this task's.

### 5.3 What the ACs measured

- **AC1** — `PRAGMA index_list` read off the database file through a second, read-only connection:
  three indexes with the derived names, `unique` correct, `desc` correct, and the built-in pair
  still there. A re-push of the same declaration creates and drops nothing.
- **AC2** — second create → 409 `{ code: 137, field: 'id', value: 'guid-1' }`; with the header →
  200, one row, `createdAt` unmoved (a re-poll must not move an item's date). Plus an arm the AC
  does not ask for: **twenty concurrent upserts of one id leave one row**, exactly one of them a
  201. That is the gap between "is it there?" and "insert", which is the whole reason the guarantee
  is an index and not a query in a function.
- **AC3** — 400 naming the rule and printing the declaration to add; and a second 400 for a record
  with no value in the named field.
- **AC4** — 409 with `duplicates: 2` and `samples: [['dup-a'], ['dup-b']]`; the index list and all
  five rows unchanged; the audit entry present with `outcome: failure`, `status: 409` and the
  numbers in `detail.indexesRefused`. Then the same push accepted once the duplicates are gone.
- **AC5** — 20,000 rows. **`EXPLAIN QUERY PLAN` names `idx_Item_published`** for
  `ORDER BY published DESC LIMIT 50`, and `SCAN` for the control collection with the same rows and
  no declared index. Measured: **indexed 0.04 ms, control 8.92 ms** (~220×). The plan is what
  carries the AC — a duration is a statement about the box the suite ran on, the plan is a
  statement about the index.
- **AC6** — removing a declaration drops exactly that index; `[]` drops them all and leaves the
  built-in pair; and with the unique index gone the duplicate it refused is writable again, which
  is the pair that shows the guarantee lives in the index.
- **AC7** — a cloud function `request → Create Record (Upsert On: id) → Response`, driven over
  `POST /functions/storeItem`: two calls with the same id, one row. **Negative control:** the same
  graph with the port empty fails on the second call with the 409's sentence on `Error`.

### 5.4 One defect the drive found — filed, not fixed

**`id` is a reserved property name at the adapter layer, in three places and nowhere written
down.** The drive met it twice:

1. **It is never auto-created as a column.** Importing 20,000 feed-shaped rows into a collection
   nothing had declared rolled the whole import back with `table Control has no column named id`:
   `AdapterFacade.ensureImportShape` skips five names when it infers columns from the data —
   `objectId`, `createdAt`, `updatedAt`, `ACL` and **`id`** — and `LocalSQLAdapter.create`'s
   auto-add loop skips the same one.
2. **It cannot be changed by an update.** `QueryBuilder.buildUpdate` deletes `data.id` the way it
   deletes `createdAt`, so `PUT` with a new `id` answers **200 and writes nothing** but
   `updatedAt`. Found by a spec written to prove the update path's 409 mapping: the edit that
   should have collided did not, because it was never applied. The spec now pins the real
   behaviour, and the 409 arm was rewritten against a collection whose unique property is called
   `code`.

Historical and defensible — `id` is the Model layer's alias for `objectId` — but undocumented, and
it lands squarely on this phase's path: `Parse Feed`'s stable identity output is called `id`, and
FED-002's headline declaration is `{"fields": ["id"], "unique": true}`.

**It does not block FED-002 or FED-006.** A collection that carries a unique index has been
declared, and a declared `id` column is written on create and matched on by the upsert — which is
what every AC above drives through. An upsert never needs to change its own match key. Filed as
**R3** in the phase register.
