# ISL-041 — A schema change does what it says, on both databases

**Status: ✅ s41 (2026-10-11): 4 of 4 — TYPECHANGE `e9f576618`, LASTINDEX `776125dba`, DIALECTTEST `b2b956e6b`, RENAME closed against P116's `78ec0ed69`. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 4 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 3 medium · 1 low. **Side:** nodegx-backend (schema: renameColumn, changeColumnType, schema-migrate promotion; the QueryBuilder dialect spec)

## 1. The person sentence

**Renaming a field, changing its type or promoting a schema leaves the indexes and rules matching the fields, on SQLite and PostgreSQL alike, and the dialect spec can run beside another run.**

## 2. Why these belong together

All four were found by P99 HLT-016 on the schema tools. A type change fails outright on SQLite when the field has an index or a rule; a rename leaves the index and rules naming the old field; a promotion keeps an index its source removed. The fourth is the gate itself: the dialect spec goes red when two runs share the PostgreSQL test database.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P99-HLT016-TYPECHANGE](../../bugs/p99-hlt016-typechange-a-type-change-of-an-indexed-or-checked-column-is-refused-on-sqlite.md) | medium | scheduled | On SQLite, changing the type of a field that has an index or a rule fails and rolls back |
| [P99-HLT016-RENAME](../../bugs/p99-hlt016-rename-a-renamed-field-is-not-renamed-inside-its-index-or-rule-declarations.md) | medium | scheduled | Renaming a field leaves its index and rule declarations naming the old field |
| [P99-HLT016-LASTINDEX](../../bugs/p99-hlt016-lastindex-a-promotion-never-drops-the-last-index-the-source-removed.md) | medium | scheduled | Promoting a schema whose source removed its last index leaves that index on the target, silently |
| [P99-HLT016-DIALECTTEST](../../bugs/p99-hlt016-dialecttest-the-dialect-spec-collides-with-itself-when-two-runs-share-the-test-database.md) | low | scheduled | QueryBuilder's dialect spec goes red when two runs share the PostgreSQL test database |

## 4. Order of work

TYPECHANGE (fails and rolls back), then RENAME, then LASTINDEX. DIALECTTEST first if it blocks grading the others.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- Shares the PostgreSQL test database with ISL-039. One run at a time.
- P104 (live) edits nodegx-backend.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (none today).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.

## 8. Record

### s41 (2026-10-11) — closed, 4 of 4

Each row was re-measured at HEAD first. All four still fired except RENAME, which P116 had fixed the day before.

| row | commit | what changed | graded by |
|---|---|---|---|
| TYPECHANGE | `e9f576618` | SQLite's retype sets aside the indexes and check triggers that read the field and re-creates them from their SQL in the same transaction; a unique index the conversion breaks rolls it all back | `noodl-runtime` `SchemaManager.changeColumnType` (3 arms red before); adapters 331/331 |
| RENAME | P116 `78ec0ed69` | already fixed as `P116-ONT-007-renamecolumn`: a rename of a field a rule reads is refused by name | P116's conformance case, green on both engines |
| LASTINDEX | `776125dba` | `applyIndexes` takes `applyChecks`' `whole` flag | `nodegx-backend/tests/isl041-last-index-promoted.test.ts` (red on that arm only); 55/55 with the promotion specs |
| DIALECTTEST | `b2b956e6b` | `BrgDialect_<pid>` | two runs at once: 18/39 and 39/39 red before, 39/39 each after |
