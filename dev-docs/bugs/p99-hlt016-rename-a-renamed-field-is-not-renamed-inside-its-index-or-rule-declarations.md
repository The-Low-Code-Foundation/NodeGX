---
id: P99-HLT016-RENAME
title: Renaming a field leaves its index and rule declarations naming the old field
status: fixed
commit: 78ec0ed69
phase: P109
task: ISL-041
severity: medium
area: backend / schema (renameColumn, SQLite and PostgreSQL)
found: P99 HLT-016 s17 (checks), 2026-09-22
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-016/2026-09-22-checks/VERDICT.md ("Not built": "A renamed column is not renamed inside a check's declaration (nor an index's, pre-existing)")
regression: packages/nodegx-backend-contract/conformance/cases/schema.ts "schema/rename-column-keeps-its-values-and-refuses-one-in-use"
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

**Closed (P109 s41, 2026-10-11, ISL-041): fixed by P116 `78ec0ed69` (2026-10-10), as `P116-ONT-007-renamecolumn`.**
A rename that went through left the declarations naming a field that was gone, and P116 met exactly that. It fixed
it on the other side of this row's proposal: a rename of a field a declared index, a check or a search opt-in reads is
now refused by name on both engines and at the route (409 in words). So the stored schema can no longer carry a rule
on a field that is gone.
- Re-measured s41: P116's conformance case is green in both of today's runs (SQLite, the BRG-003 files; PostgreSQL
  85 / 85).
- Not built here: renaming the field inside the declarations as well. That would let the rename go through instead of
  refusing it, a feature P116 chose not to make. Ask if it is wanted.
