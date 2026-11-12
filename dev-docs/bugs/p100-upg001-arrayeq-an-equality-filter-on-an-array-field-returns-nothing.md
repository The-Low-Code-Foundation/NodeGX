---
id: P100-UPG001-ARRAYEQ
title: An equality filter on an Array field returns no rows, with no error
status: fixed
commit: 5bfb23cf4
phase: P109
task: ISL-039
severity: medium
area: runtime / local-sql query (backend data API)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks-archive/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
regression: packages/nodegx-backend-contract/conformance/cases/filters.ts "filters/equality-on-an-array-matches-an-element"
---

A query `where tags = "fantasy"` on an Array field returns `[]`, even though three rows carry `fantasy` in
`tags`. There is no error, so the person gets a wrong answer that looks like a right one. Parse, whose wire
this is, matches an array that contains the value.

**Where:** `packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts:449-453`. A direct equality
compiles to `"tags" = ?` against the column's stored JSON text, so it can never match one element.
`$eq` (`:513-518`) does the same.

**How it was found:** P100's 0.2.4 backend drive (§3.6b). It behaves the same on 0.2.4 and HEAD, so it is not
an upgrade break. Not re-run since 2026-09-23. The code path above is unchanged.

**Proposed:** when the schema types the column `Array`, compile equality to an `EXISTS (SELECT 1 FROM
json_each(col) WHERE value = ?)` (SQLite) or `col @> to_jsonb(?)` (PostgreSQL), as the ACL branch already
does with `json_each`. Add a spec on both engines. Small.

**Fixed (P109 s41, 2026-10-11, ISL-039).** Re-measured at HEAD first: red on both engines, and red over `/classes`
on a collection a client made by writing to it.
- `ColumnScope` now carries the columns the schema types `Array`. Both adapters fill it from `getTableSchema`.
- Equality and `$eq` on such a column compile to "the array holds this value": `EXISTS (… json_each …)` on SQLite,
  `col @> ?::jsonb` on PostgreSQL (Array is JSONB there). An array value or `null` keeps the old comparison.
- Graded: the contract case covers string, `$eq`, number and no-match on both engines, red before the fix. The wire arm
  was red with the old query builder and adapters and is green now. Runtime adapter specs 328 / 328, conformance SQLite
  29 / 29, PostgreSQL 84 / 84.
- 🔴 **Found by the backend suite, fixed in the same commit:** the admin data page asked "is this list empty?" as
  `{$eq: '[]'}`, the stored JSON text. Under the new rule a string is one element, so `bmg-002-filters` read 3 empty
  lists for 4. Now an ARRAY value under `$eq` is the whole array, compared as JSON (`json(col) = json(?)` on SQLite,
  `= ?::jsonb` on PostgreSQL), as Parse means it. The page asks `{$eq: []}` and reads that back as "is empty"
  (`filters.ts`, both sites). The contract case has both arms (`[]` and `['crime']`). Nothing else in `packages`,
  `templates`, `library` or `scripts` compares an array to a JSON string (grep).
