---
id: P99-HLT016-TYPECHANGE
title: On SQLite, changing the type of a field that has an index or a rule fails and rolls back
status: fixed
commit: e9f576618
phase: P109
task: ISL-041
severity: medium
area: backend / SQLite schema (changeColumnType)
found: P99 HLT-016 s17 (checks), 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md ("Found, not fixed, unowned")
regression: packages/noodl-runtime/test/adapters/SchemaManager.changeColumnType.test.js ("a field an index or a rule reads")
---

Changing a field's type across SQLite storage classes (say Text → Number) on a field that a unique index or a
`checks` rule reads is refused: SQLite will not `DROP COLUMN` a column an index or trigger reads. It fails loudly and
rolls back, so nothing is lost, but the change a person asked for is not done.

**Where:** `packages/noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` `changeColumnType` (:492), the
add-copy-drop-rename at :548-556. Its comment still says *"user columns carry no constraints and no indexes"* —
FED-002 (indexes) and HLT-016 (checks) made that false. Read at HEAD 2026-10-01: unchanged. The PostgreSQL path
(`ALTER COLUMN … TYPE`) is not affected.

**How to reproduce:** a collection with a unique index (or a check) on `code` as String; change `code` to Number →
SQLite error, rolled back.

**Proposed:** drop and re-create the indexes and check triggers that name the column around the rebuild (all inside
the transaction), or refuse up front with a sentence naming the index/rule. Small to medium.

**Fixed (P109 s41, 2026-10-11, ISL-041), on the "do the change" route.** Re-measured at HEAD first: the three new
arms were red on the old `SchemaManager.ts`.
- `changeColumnType` now reads, from `sqlite_master`, the indexes and triggers whose SQL names the column. It drops
  them, rebuilds the column, and re-creates them from their own stored SQL, all inside the one transaction.
- A unique index the converted values now break (`'01'` and `'1'` both become 1) is refused when it is re-created,
  and everything rolls back: the rows, the type and the index stay as they were.
- The stale comment ("user columns carry no constraints and no indexes") is gone.
- Graded: a unique index still refuses a duplicate after String → Number, and a both-or-neither rule still refuses a
  row that breaks it. Runtime adapter specs 331 / 331. The backend's four specs that retype a field are 91 / 91.
