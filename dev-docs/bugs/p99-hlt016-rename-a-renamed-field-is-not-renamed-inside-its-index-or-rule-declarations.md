---
id: P99-HLT016-RENAME
title: Renaming a field leaves its index and rule declarations naming the old field
status: open
severity: medium
area: backend / schema (renameColumn, SQLite and PostgreSQL)
found: P99 HLT-016 s17 (checks), 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md ("Not built": "A renamed column is not renamed inside a check's declaration (nor an index's, pre-existing)")
---

A field renamed in a collection is renamed in the table and in the field list of the stored schema, but the
schema's `indexes` and `checks` declarations still name the old field. What anything reading the stored schema
then sees (the manager, a backup, a promotion that re-declares them) is a rule on a field that no longer exists.

**Where:** `packages/noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` `renameColumn` (:419-447) and
`postgres/PgSchemaManager.ts` `renameColumn` (:637-672): both change `col.name` only. Read at HEAD 2026-10-01: neither
touches `schema.indexes` or `schema.checks`.

**Not driven:** the code is read, the consequence is not. What a later reconcile or promotion does with the stale
declaration (refuse, re-create on the old name, or drop) has not been measured — the first job of whoever takes it.

**Proposed:** rename the field inside every index and check declaration in the same write (and on PostgreSQL the
CHECK constraint text); one conformance case per engine. Small.
