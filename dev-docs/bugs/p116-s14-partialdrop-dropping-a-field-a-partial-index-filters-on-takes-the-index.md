---
id: P116-S14-partialdrop
title: Dropping a field that only a partial unique index's condition reads takes the index with it on PostgreSQL, and fails in SQLite's own words
status: fixed
commit: 78ec0ed69
severity: medium
area: backend / schema managers (`noodl-runtime/src/api/adapters/local-sql/schemaCommon.ts` `refuseColumnInUse`) and the schema route (`nodegx-backend/src/server/byob-admin.ts` `refuseIfInUse`)
found: P116 ONT-007 s14, 2026-10-10 (grading P116-ONT-007-renamecolumn)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.12
regression: packages/nodegx-backend-contract/conformance/cases/schema.ts "schema/drop-column-removes-it-and-refuses-one-in-use" (the where-only reader)
---

A person declares "one pinned lesson per learner and concept" (a unique index over learner and concept, only where
pinned is true) and later drops the `pinned` field. BMG-003 promises a column a declared index reads is refused by
name, "never silently with the column" — but the check read only the index's `fields`, not its `where`.

Measured 2026-10-10, conformance drop case with `reconcileIndexes(c, [{ fields: ['title'], unique: true, where: { score: 5 } }])`
then `dropColumn(c, 'score')`: PostgreSQL **succeeded** (`DROP COLUMN IF EXISTS` takes the index; the declaration kept
naming it); SQLite threw `ERR_SQLITE_ERROR … error in index idx_… after drop column: no such column: "score"` — a raw
engine sentence, not `COLUMN_IN_USE`.

Fixed: an index reads the fields it is over AND the ones its `where` names, in `refuseColumnInUse` (both managers, drop
and rename) and the route's `refuseIfInUse`. ONT-007's planner already counted `where` fields as read.
