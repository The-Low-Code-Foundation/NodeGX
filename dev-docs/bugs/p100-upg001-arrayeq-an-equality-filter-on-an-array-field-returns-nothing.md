---
id: P100-UPG001-ARRAYEQ
title: An equality filter on an Array field returns no rows, with no error
status: open
severity: medium
area: runtime / local-sql query (backend data API)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
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
