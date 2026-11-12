---
id: P100-UPG001-PTREQ
title: Filtering on a Pointer written as a Parse pointer object is a 500 (cannot translate: __type)
status: fixed
commit: 5bfb23cf4
phase: P109
task: ISL-039
severity: medium
area: runtime / local-sql query (backend data API)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks-archive/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
regression: packages/nodegx-backend-contract/conformance/cases/filters.ts "filters/a-pointer-written-as-a-parse-pointer-is-a-value"
---

`where author = {__type:'Pointer', className:'_User', objectId:'…'}`, the way a Parse client writes a pointer
match, fails with a 500: *"The built-in backend received a filter operator it cannot translate: __type"*. The
plain-id form (`author = "<objectId>"`) works.

**Where:** `packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts:449-466`. Any object value is
read as an operator map, so `__type`, `className` and `objectId` are each passed to `translateOperator` and the
first one hits the `default:` throw at `:733`. `convertPointerValue` (`:334`) exists but is only reached for a
value that is already under an operator such as `$eq`.

**How it was found:** P100's 0.2.4 backend drive. It behaves the same on 0.2.4 and HEAD. Not re-run since
2026-09-23. The code path is unchanged.

**Proposed:** in `buildWhereClause`, treat a condition object whose `__type` is `Pointer` (or `Date`) as a value,
not an operator map, and send it to the direct-equality branch through `convertQueryValue`. One spec. Small.

**Fixed (P109 s41, 2026-10-11, ISL-039).** Re-measured at HEAD first: red on both engines, and over `/classes`.
- In `buildWhereClause`, a condition whose `__type` is `Pointer` or `Date` is a value. It goes to direct equality
  through `convertQueryValue` (a Pointer becomes its id), not to `translateOperator`.
- Other tags (a GeoPoint as a bare value) keep the old answer, because neither engine can bind them.
- Graded: the contract case has the bare-id control beside it. The wire arm was red with the old query builder and is
  green now.
