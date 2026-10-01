---
id: P99-HLT016-TYPECHANGE
title: On SQLite, changing the type of a field that has an index or a rule fails and rolls back
status: open
severity: medium
area: backend / SQLite schema (changeColumnType)
found: P99 HLT-016 s17 (checks), 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md ("Found, not fixed, unowned")
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
