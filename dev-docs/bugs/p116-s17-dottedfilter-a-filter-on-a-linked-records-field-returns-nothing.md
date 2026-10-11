---
id: P116-S17-DOTTEDFILTER
title: A filter on a linked record's field (`salary.amount > 90000`, `author.name = …`) returns no rows on the built-in backend, even for the admin, with no error
status: open
severity: medium
area: runtime / built-in backend query (`noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` where-building; the editor offers these fields through `schema-ports.ts` `getFilterFields` → `expandRelationFields`)
found: P116 s17, 2026-10-11 (while closing bug P116-S16-INCLUDECLP: checking a dotted filter was not an oracle)
evidence: dev-docs/bugs/p116-s16-includeclp-include-reads-a-collection-its-caller-may-not-read.md (the fix note)
---

A person's query asks for the contracts whose linked salary is over 90,000. One contract matches. The built-in
backend answers `{"results": []}` with a 200: no rows and no refusal. The admin gets the same empty answer, so this
is not a permission at work. The editor offers exactly this kind of field in a filter. `getFilterFields`
(`schema-ports.ts`) adds "the dotted one-hop relation paths (`author.name`)" to the collection's own fields.

Measured 2026-10-11 on SQLite (a throwaway probe, not kept). `Contract.salary` is a Pointer to `Salary`, there is
one `Salary` of 91000 and one Contract linked to it. `GET /classes/Contract?where={"salary.amount":{"$gt":90000}}`
answers `[]` for the admin and for a user, and `$gt: 99000` also answers `[]`. Not measured: why (an unknown
column read as no match, or a JSON-path reading), PostgreSQL, and whether the BYOB backends handle it.

A dropped condition that returns MORE rows is refused by name elsewhere ("a filter operator it cannot
translate"). This one returns FEWER rows, silently, which reads as "nothing matches". Either the built-in backend
follows the one hop (the `$path` operator already compiles the join), or it refuses the dotted key by name and the
editor stops offering it for this backend.

Not a leak: after the INCLUDECLP fix, `refuseHiddenNamed` reads `salary.amount` as the field `salary`. A dotted
filter that worked would need the target collection's `find` rule asked, as a `$path` hop now does.
