# HLT-016 index half, `checks` — verdict, 2026-09-22 (P99 s17)

**C1–C6 ✅ on SQLite AND PostgreSQL. X1 ✅.** With [`where`](../2026-09-22-where/VERDICT.md) this
closes HLT-016's index half. (b) transactions still wait on the invite-claim question; AC6 is the
DBT stream's.

## What a person can now declare

```jsonc
"checks": [
  { "exactlyOne": ["learnerId", "cohortId"] },
  { "allOrNone": ["anchorKind", "anchorId"] },
  { "field": "target", "min": 1, "max": 10 }
]
```

The three shapes the DBT product's CHECK constraints take (four exactly-one, one all-or-none, two
ranges; one compound fits none). A check's name is derived (`chk_<T>_one_learnerId_cohortId`),
like an index's. The SQL is one portable form for both engines (`CASE WHEN … IS NULL`, not
SQLite's boolean arithmetic or PostgreSQL's `num_nonnulls`), so the two cannot drift.

- **SQLite:** a pair of `BEFORE INSERT` / `BEFORE UPDATE` triggers per check that
  `RAISE(ABORT, 'CHECK constraint failed: <T>.<check>')`. No table rebuild; dropping one is
  `DROP TRIGGER`; read back from `sqlite_master`. The rows already there are counted first.
- **PostgreSQL:** a real `CHECK` constraint, inline in `CREATE TABLE` (so the export carries it,
  under the same name) and `ALTER TABLE … ADD CONSTRAINT` on reconcile, which validates the rows
  already there atomically. Read back from `pg_constraint` on restart. `23514` is translated to the
  same sentence SQLite raises.
- **HTTP:** a write that breaks one is **400**, Parse code **142**, `reason: "check-failed"`, and
  the rule in words (*"This write breaks a rule of "Assignment": exactly one of learnerId, cohortId
  is set. It was refused, and nothing was changed."*). On create, upsert, PUT and the BYOB routes.
  Pushing via `createTable` (`checks` beside `columns`) or the new `setChecks` action.

## Readings (all 2026-09-22, tree on `43d5d980e` + this change)

**The drive** ([hlt016checks.drive.test.ts](./hlt016checks.drive.test.ts)), a real service and
curl on both engines, and the same drive against **HEAD's copies of the 17 changed files**
(parked with `cp`, restored and compared byte for byte):

| | tree, SQLite | tree, PostgreSQL | HEAD, both engines |
|---|---|---|---|
| push with `checks` | 200, 2 created | 200, 2 created | 200, **`checks` silently ignored** |
| a row that keeps both rules | 201 | 201 | 201 |
| both scopes / neither / target 11 | **400 400 400** | **400 400 400** | 201 201 201 |
| an edit that sets the second scope | **400** | **400** | 200 |
| rows written | 1 | 1 | 4 |
| `setChecks` | 200 | 200 | 400 *Unknown schema action* |

[drive-fixed.json](./drive-fixed.json) · [drive-head.json](./drive-head.json)

**Specs, each graded by an in-source revert:**

- `noodl-runtime/test/adapters/SchemaManager.checks.test.js`, 7/7. No UPDATE trigger reddens C2's
  edit and C4; no pre-count reddens C3 and the bounds case; comparing checks by name only
  (ignoring changed bounds) reddens the bounds case.
- `nodegx-backend/tests/hlt016-checks.test.ts`, 9/9 (SQLite and PostgreSQL over HTTP, plus C5's
  diff). Removing the PUT mapping reddens the edit case on both engines (it answered **404**);
  removing the 23514 translation reddens 4 on PostgreSQL; forgetting `pg_constraint` on load
  reddens PostgreSQL's restart.
- **C5 on a real server, not only as a string:** the SQLite manager's `generatePostgresSQL()` for
  a collection with two checks and a partial unique index was applied with `psql -v
  ON_ERROR_STOP=1` to a throwaway database: it applied, `pg_constraint` lists both checks under
  their derived names, and a duplicate pinned row, a row with neither scope and `target` 11 were
  each refused by PostgreSQL (an unpinned duplicate was admitted).
- **Conformance C6:** case `schema/a-check-refuses-a-row-that-breaks-it` (create and update).
  SQLite green; **PostgreSQL 62/62**, not skipped. The new mutation `skip-checks` is caught on both
  adapters by **exactly that case**, by name.

## 🔴 What this found

- **`classPut` answered 404 "Object not found" for any refusal it did not recognise.** A check
  refusal on an edit would have told a person their record had vanished. It is now 400 on every
  write path that already decoded unique refusals.
- **At HEAD a `checks` key on a schema push was silently dropped** (the table row above), so a
  project that declared its rules got none of them and was told 200.
- ⚠️ **Found, not fixed, unowned:** `SchemaManager.changeColumnType`'s add-copy-drop-rename says
  *"user columns carry no constraints and no indexes"*. FED-002 made that false, and a check makes
  it false again: SQLite refuses `DROP COLUMN` on a column a trigger or index reads. It fails
  loudly and rolls back (nothing is lost), but a type change of a checked or indexed column is
  refused rather than done.
- ⚠️ **Found, not fixed, pre-existing:** `schema-migrate.applyIndexes` returns early on an empty
  list, so a promotion whose source removed its last index never drops it on the target. `checks`
  does not copy that: a changed table's empty declaration is applied.
- ⚠️ `QueryBuilder.dialect.test.js` uses a fixed table name in the shared `nodegx_brg005`
  database, so two runs at once collide (9 and then 15 failures, alone: green).

## Not built

- A compound rule (the DBT resource's label/url/storage key) fits none of the three shapes.
- A renamed column is not renamed inside a check's declaration (nor an index's, pre-existing).
