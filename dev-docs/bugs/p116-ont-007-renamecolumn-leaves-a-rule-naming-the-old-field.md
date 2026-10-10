---
id: P116-ONT-007-renamecolumn
title: Renaming a field a rule reads leaves the rule naming the old field — the status still says it is built, and pushing the same declaration again is refused
status: fixed
commit: 78ec0ed69
severity: medium
area: backend / schema route (`nodegx-backend/src/server/byob-admin.ts` `mutateSchema` `renameColumn`) and both schema managers' `renameColumn`
found: P116 ONT-007 s8, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.8, §6.12
regression: packages/nodegx-backend-contract/conformance/cases/schema.ts "schema/rename-column-keeps-its-values-and-refuses-one-in-use" (both engines); packages/nodegx-backend/tests/bmg-003-schema.test.ts "P116-ONT-007-renamecolumn"
---

A person has a list rule on a field ("tier is one of basic, gold") and renames the field. The backend manager still
shows the rule as on "tier" and built; the next time the declaration is pushed as it stands, it is refused:
`Cannot check "a" on "T": the collection has no such property.`

Where: `renameColumn` renames the column and its `_Schema` entry, and nothing else. `dropColumn` and
`changeColumnType` refuse a column a declared index, check or search field reads (`refuseIfInUse`, BMG-003);
`renameColumn` does not.

Measured 2026-10-09 on SQLite and PostgreSQL: `createTable T(a)`, `reconcileChecks(T, [{ field: 'a', oneOf: [x, y] }])`,
`renameColumn(T, a, b)` → `declaredChecks(T)` still `[{ field: 'a', … }]`, `checkStatus(T)` says `built: true,
declared: true`; `reconcileChecks(T, declaredChecks(T))` throws the sentence above. Indexes are expected to behave the
same way (not measured).

Fix (either): refuse in words, as `dropColumn` does ("the rule … reads it; take it off first"), which is what
ONT-007's planner already assumes (it takes a rule off before renaming a field it reads); or carry the declaration
across (rewrite the field name in the declared checks and indexes and rebuild them). The refusal is smaller and
matches BMG-003.

**Fixed 2026-10-10 (P116 s14, `78ec0ed69`) — the refusal.** Both managers' `renameColumn` call the same
`refuseColumnInUse` as `dropColumn` (it now takes the verb), before any DDL: `Cannot rename "tier" in "T": the rule
"tier is one of basic, gold" reads it. Remove that rule first.` The route refuses first in the page's words (409) and
maps an adapter's `COLUMN_IN_USE` to 409. ONT-007's planner already takes a rule off before renaming a field it reads,
so no planned migration is refused (the nine `ont-00*` specs, 189/189). Measured red before the fix on SQLite and
PostgreSQL, conformance and route both. Not driven: the admin page's rename shows a refusal through its existing
`.catch(fail)` toast. Indexes behaved the same way (measured this time). Found while grading it:
P116-S14-partialdrop.
