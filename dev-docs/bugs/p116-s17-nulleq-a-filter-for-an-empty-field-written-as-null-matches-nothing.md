---
id: P116-S17-NULLEQ
title: A filter for an empty field written the short way (`{ "dob": null }`) matches nothing on the built-in backend; the long way (`{ "dob": { "$eq": null } }`) matches the empty rows
status: fixed
commit: ebdac4827
severity: medium
area: runtime / built-in backend query (`noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` direct equality: `${col} = ?` with a NULL parameter; the `$eq` arm already says `IS NULL`)
found: P116 ONT-014 s17, 2026-10-11 (a "set once" rule's "still empty" arm never matched)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-014-OLD-AND-NEW.md §6
regression: conformance `filters/null-short-form-is-empty` (both engines, via brg-003/brg-005); packages/nodegx-backend/tests/realtime-filter.test.ts "agrees with SQL membership across a large generated matrix"
---

Two people, one with a date of birth and one without. Asked for "the people whose date of birth is empty" as
`where={"dob":null}`, the backend answers `[]` with a 200. The same question as `{"dob":{"$eq":null}}` answers the
empty one. The two spellings mean the same in the Parse wire.

Measured 2026-10-11 over HTTP as admin, on SQLite and PostgreSQL (a throwaway probe, not kept):
`{"dob":null}` → `[]`; `{"dob":{"$eq":null}}` → `["empty"]`; `{"dob":{"$exists":false}}` → `["empty"]`.

Where: `QueryBuilder.ts`, the direct-equality branch (`typeof condition !== 'object' || condition === null`). It
pushes `${col} = ?` with `null`, and SQL's `= NULL` is never true. The operator branch (`$eq`) has
`if (convertedValue === null) return IS NULL`. The fix is one line: the direct branch does the same.

Not measured: which clients send the short form. The runtime's record nodes, a cloud function's `Query Records`,
and the MCP's filters each build a where. ONT-014's own clauses avoid the short form (`onlyWhile.ts` `eq`).

**Fixed (s23).** The direct-equality branch says `IS NULL` for a null, as the `$eq` arm does. **The realtime twin
moved with it:** `nodegx-backend/src/realtime/filter.ts` had mirrored `= NULL` on purpose ("never true … and the
property test proves it"), so the fix in `QueryBuilder` alone made the property test red — and that spec is not in
P116's band; the whole backend run found it. Conformance `filters/null-short-form-is-empty` reds on both engines with
the fix taken out, and nothing else does; the property test reds with the matcher's old arm put back.
