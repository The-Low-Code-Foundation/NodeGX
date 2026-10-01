---
id: P100-UPG001-PTREQ
title: Filtering on a Pointer written as a Parse pointer object is a 500 (cannot translate: __type)
status: open
severity: medium
area: runtime / local-sql query (backend data API)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
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
