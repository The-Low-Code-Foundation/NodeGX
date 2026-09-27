# HLT-016 index half, `where` — verdict, 2026-09-22 (P99 s17)

**Ruled in** with (a) on 2026-09-22. ACs W1–W8 and X1 were written into the task file (§4b)
before any code. **W1–W8 ✅ on SQLite AND PostgreSQL. X1 ✅ for `where`.** `checks` (C1–C6) is the
next build.

## What a person can now declare

```jsonc
{ "fields": ["learnerId", "conceptId"], "unique": true, "where": { "pinned": true } }
```

One to four conditions, all of which must hold: `true`/`false` (Boolean), a string (String), a
number (Number), `{ "exists": true|false }` (any type), `{ "in": [...] }` (1–20 values). Never SQL
text. Values are written into the index definition as literals (an index cannot bind parameters),
so only finite numbers, booleans and strings are admitted, and a string goes through
`quoteLiteral`. The derived name gains `_w<8 hex>`, an FNV-1a hash of the normalized predicate
(keys sorted, `in` deduplicated and sorted), so a partial and a full index on the same fields are
two indexes, and two spellings of one predicate are one.

## Readings (all 2026-09-22, tree on `3c7264365` + this change)

**The drive** ([hlt016where.drive.test.ts](./hlt016where.drive.test.ts),
[drive-fixed.json](./drive-fixed.json)): a real `BackendService`, real curl, both engines, with a
**restart** (a second service on the same database):

| | SQLite | PostgreSQL |
|---|---|---|
| W2 two unpinned / two pinned for one (learner, concept) | 201 201 / 201 **409** | 201 201 / 201 **409** |
| W2 control, same declaration without `where`: two unpinned | 201 **409** | 201 **409** |
| W4 partial beside full: full kept, partial created; drop full: partial kept | ✅ | ✅ |
| W6 upsert on a field only a partial index covers / with a full one beside it | **400** / 201 | **400** / 201 |
| W5 push over rows that already violate it | **409**, count 1, 0 indexes, 5 rows | **409**, 0 indexes, 5 rows |
| W3 after restart: built + declared + `where`; re-push | kept, nothing created/dropped; still 409/201 | the same |

**HEAD control:** HEAD's `normalizeIndexDecls` refuses the declaration:
*`indexes[0]: unknown key "where" (expected fields, unique, order)`*.

**Specs, each graded by an in-source revert (cp backup, never `git checkout`):**

- `noodl-runtime/test/adapters/SchemaManager.partialIndexes.test.js`, 11/11. Dropping the `WHERE`
  from `CREATE INDEX` reddens 9; dropping it from the duplicate pre-check reddens W5 (and W1, for
  the reason below); forgetting `partial` in `builtIndexes` reddens W3, W4 and "two spellings".
- `nodegx-backend/tests/hlt016-partial-indexes.test.ts`, 14/14 (SQLite and PostgreSQL over HTTP,
  plus W7's diff). Removing the queue wait reddens **PostgreSQL's W5 only**; HEAD's
  `parseIndexDef` regex reddens **PostgreSQL's W3 only**; HEAD's upsert-cover check reddens W6 on
  both; dropping `where` from `schema-migrate.normalizeForDiff` reddens W7, and leaving its keys
  unsorted reddens "two spellings".
- **Conformance W8:** case `schema/a-partial-unique-index-holds-only-where-it-says`. SQLite green;
  **PostgreSQL 61/61** (60 + 1, not skipped). The new mutation `drop-where-on-index` is caught on
  both adapters by **exactly that case**, by name.

**Gates:** `typecheck:runtime`/`contract`/`backend-tests` and `tsc -p nodegx-backend --noEmit` exit
0. `noodl-runtime` `test/adapters` 15 suites, 306 passed (with PostgreSQL). Backend jest **167/169
suites**: the 2 reds are `tpl008-theme-drive` and `tpl008-todo-drive`, *"no theme switch is
drawn"*, the same pair s16 recorded red at HEAD. eslint: no errors in any touched file.

## 🔴 What the survey missed, and what was found beside it

- **Upsert would have trusted a partial index.** `parse-wire.assertUpsertable` accepted any built
  single-field unique index. A partial one would pass while rows outside its predicate repeat the
  value: the silent data-loser that check exists to refuse. Now a 400 that says why (W6).
- 🔴 **On PostgreSQL a refused index push was never refused to anyone. Pre-existing (FED-002 /
  BRG-005), for every unique index, not only partial ones.** The reconcile is queued, and a failure
  "surfaces on the next data-plane call". After a push, that call was always **the push's own audit
  write**, and `AuditLog.record` never throws by design. So: the push answered **200**, the refusal
  was logged from inside the audit write and dropped, the person's next write succeeded, and the
  audit trail lost the entry. Measured before the fix
  ([drive-before-queue-fix.json](./drive-before-queue-fix.json): `W5.push.status: 200`). The push
  now waits for the schema queue (`byob-admin.applyIndexes`) and answers 409.
- ⚠️ **Found, not fixed, unowned:** SQLite `SchemaManager.createTable` caches **the caller's own
  schema object**, and a later `reconcileIndexes` writes `indexes` onto it. The first version of the
  spec shared one constant across tests and one test's indexes leaked into the next table;
  "two spellings" then W1 alone failed W1, and the full order hid it because W5 happened to
  reconcile to `[]`. Callers that reuse a schema object get it mutated.
- The PostgreSQL export's name for a partial index is the same derived name, so a database the
  export made and one the adapter made agree on which index is which.

## Not built

- **`checks`** (C1–C6): next.
- A partial index's predicate is not parsed back from either engine. The name carries its hash,
  so only "partial or not" can differ under one name, and that is compared. A hand-made index that
  reuses a derived name with a different predicate would read as built.
