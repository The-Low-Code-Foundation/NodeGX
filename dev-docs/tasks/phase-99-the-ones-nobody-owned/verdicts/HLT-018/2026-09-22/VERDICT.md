# HLT-018 — an empty object can be saved

**Built 2026-09-22 (P99 session 15).** ✅ **On a real `BackendService` on a real socket, a record
whose Object field is `{}` is created (201), emptied by a `PUT` (200), and imported (2 of 2 rows),
and every one reads back as `{}`. HEAD: the create answers 500, the import rolls back, and the
`PUT` answers 200 over a write that never happened.**

## 1. The number

`hlt018.drive.test.ts` in this folder (run from `packages/nodegx-backend` with
`HLT018_OUT=<file> npx jest -c <this folder>/jest.drive.config.js`). Collection `Learner`, declared
`{name: String, facts: Object}` through `POST /admin/schema`. The control arm is HEAD's
`QueryBuilder.ts` swapped in for one run and copied back (`cmp` clean).

| arm — performed, then read | fixed | HEAD |
|---|---|---|
| known-firing: `POST` `{facts:{a:1}}`, read back | 201 · `{a:1}` | 201 · `{a:1}` |
| `POST /classes/Learner` `{facts:{}}` | **201** | **500** — *"Provided value cannot be bound to SQLite parameter 5."* |
| …read back | `{}` | (no row) |
| `PUT` the keyed row to `{facts:{}}` | 200 | 200 |
| …read back | **`{}`** | 🔴 **`{a:1}` — nothing was written** |
| `POST /admin/import/Learner`, one keyed row + one `{}` row | **200 · applied · +2 rows** | **400 · *"import rolled back (no rows written)"* · +0** |

Raw readings: `drive-fixed.json`, `drive-head.json`.

## 2. 🔴 What §2 did not know — the `PUT` that says 200 and writes nothing

§2 predicted a 500 on both callers. `buildInsert` does 500; **`buildUpdate` does not.** Measured
against `node:sqlite` directly (the engine the backend uses; `better-sqlite3` is not installed):
a bare object passed as the **first** argument of `run()` is taken as the **named-parameter map**,
so every positional `?` after it shifts by one. `UPDATE … SET "facts" = ?, "updatedAt" = ? WHERE
"objectId" = ?` with `[{}, t, id]` binds `facts = t`, `updatedAt = id`, `objectId = NULL`, matches
**0 rows, and throws nothing.** `LocalSQLAdapter.save` checks `changes` only when an ACL is
present, so a master-key or unrestricted write answered 200 with a fresh `updatedAt`.

In `buildUpdate` the data's columns come first, so a single-field update to `{}` always takes that
path. In `buildInsert`, `objectId` is the first parameter, so the object is never first and the bind
throws. That is why the two callers failed differently.

⇒ The fix closes the whole class, not just `{}`: **`serializeValue` can no longer return an
object at all.** That property is pinned over ten value shapes (`never hands the driver an
object`).

⚠️ **Not fixed here, and worth a row if anyone meets it:** without an ACL, `LocalSQLAdapter.save`
reports success on 0 changed rows. Any other way to make an UPDATE match nothing, such as an
unknown `objectId` on a master-key write, would also answer 200.

## 3. §2's other two claims, measured

- 🔴 **"Both adapters are affected" is wrong.** The new conformance case passes on PostgreSQL on
  HEAD (58/58). `pg` serializes a bare object as JSON itself, so only SQLite ever failed. The case
  now runs on both adapters anyway, per AC4.
- ⚠️ **"The wrong fix would store every `Date` as `"{}"`" is wrong in detail, right in
  conclusion.** `JSON.stringify(new Date(…))` goes through `Date.toJSON` and stores the ISO string
  **wrapped in quote marks**, so a Date column would read back with literal `"`s. The spec pins
  the bare ISO string, and the mutant fails it.

## 4. Grading

| gate | reading |
|---|---|
| `noodl-runtime` `test/adapters` | 14/14 suites, 295/295 |
| `QueryBuilder.test.js` on HEAD's source | 2 failed: `stores an empty object as JSON`, `never hands the driver an object` |
| mutant: the key check deleted, the `Date` test left below it (the task's "tempting wrong fix") | 2 failed: `handles Date objects`, `still stores a Date and a Parse Date as bare ISO strings` |
| conformance `records/an-empty-object-saves-and-reads-back-empty` on HEAD | SQLite **red** (*"cannot be bound to SQLite parameter 5"*); Postgres green |
| conformance, fixed: `brg-003-*` (SQLite, gate, mutants, declared) + `brg-005-conformance-postgres` | 5/5 suites, 35/35; SQLite 58 cases, Postgres 58/58 |
| `nodegx-backend` jest | 166/168 suites. The 2 reds are `tpl008-theme-drive`/`tpl008-todo-drive`, *"no theme switch is drawn"*, red on HEAD since s12 and not this row's |
| `typecheck:contract`, `typecheck:runtime` | exit 0 |

## 5. Left

- **AC5 belongs to the DBT stream:** `tools/setup-backend.mjs` stops dropping empty objects, and
  its seed check passes with them in. It is that template's file.
