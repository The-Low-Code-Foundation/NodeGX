---
id: P116-ONT-003-links
title: A Link keeps pointing at a record after that record is deleted, on both engines — nothing a person says about "when it goes" can be kept
status: fixed
commit: 1668b99c6
severity: medium
area: backend / Link (Pointer) — no on-delete rule in the contract (`@noodl/backend-contract` `IStorageSchema`, `StorageColumn`) or either engine (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` `_columnToSQL`, `postgres/ddl.ts`: a Pointer is a TEXT id, no foreign key)
found: P116 ONT-003 s3, 2026-10-08
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-003-THE-PROJECTION-IS-A-FUNCTION.md §6
regression: packages/nodegx-backend/tests/ont-003-claims.test.ts "keeps every held claim, and measures every claim labelled not held as not kept"
---

A person picks the *Link* tile ("points at one record in another collection") and later deletes the record it
points at. The delete succeeds, and every record that linked to it still holds its id: a link to nothing, which
the screens that follow it then show as missing or as an error. The person was never asked, and the backend could
not have kept the answer anyway: the contract has no on-delete rule, and both engines store a Link as a text id
with no foreign key.

P116's relation kinds ask it first ("When an account goes, do its members go with it, stay without one, or stop
it going?" — `belongs-to`, `is-on`, `happened-to`, `part-of-tree`, `same-as`, `extends`, `points-at-one-of`).
ONT-003 projects the answer into the collection's description as "not kept by the database yet", and measures it:
on the every-kind fixture, the claims `membership/person-goes-too`, `account-company/company-blocks`,
`attended/person-blocks`, `person-profile/person-goes-too`, `topic-tree/parent-blocks`,
`same-person/supersededBy-blocks` (and their siblings on the first fixture) FAIL on SQLite and on PostgreSQL at
the step that says the rule — the target is deleted and the linking row stays, still pointing.

Ruling wanted: whether the contract grows an on-delete rule on a Pointer (`goes-too` · `stays-unlinked` ·
`blocks`), enforced by each engine (SQLite and PostgreSQL both have `ON DELETE CASCADE / SET NULL / RESTRICT`,
but Pointer columns are not foreign keys today, and a Relation's junction rows are not either) — or whether the
backend keeps it above the engine, at delete time. Either is a capability-table row per backend. When it lands,
the claims above flip from not-held to held and their spec says so by failing ("the label is wrong") until the
projection is told.

**Ruled 2026-10-09 (Richard, P116 s11, README §9 R10): at delete time, in the backend** — not a foreign key. The
contract grows an on-delete rule on a Pointer (`goes-too` · `stays-unlinked` · `blocks`) and the backend applies it
inside the delete, the same on every engine, so a project that already holds broken links keeps working.

**Fixed 2026-10-09 (P116 s12, Opus 5.5)** — ONT-003 §6.6. `StorageColumn.whenTargetGoes` on a Pointer (the person's
three words); `@noodl/backend-contract` `targetGoes.ts` `deleteKeepingLinks()` reads every rule that points at the
record, plans the whole delete read-only (refusing on any `blocks`, at any depth, before a row is written), deletes the
caller's own record under their ACL, then empties and cascades as the master key; `AdapterFacade.rawDelete` calls it,
so every door (`/classes` — and so a cloud function's Delete Record — BYOB `/api/:table`, its batch) keeps it on both
engines. A `blocks` refusal is a 409 `reason: 'still-linked'` naming what links to it. The schema route refuses a rule
that could never be kept; `setWhenTargetGoes` changes it over records; the world migration emits it for a changed
answer. The claims above are now **held** and pass on SQLite and PostgreSQL through the facade's delete, each failing
on its mutant (`dropWhenTargetGoes`); with the rule skipped in the facade, exactly those 22 fail. A Links field's pairs
are not covered — bug `P116-ONT-003-pairs`.
