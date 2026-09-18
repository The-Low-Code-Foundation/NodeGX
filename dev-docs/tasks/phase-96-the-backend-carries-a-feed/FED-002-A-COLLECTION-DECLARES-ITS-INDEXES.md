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
