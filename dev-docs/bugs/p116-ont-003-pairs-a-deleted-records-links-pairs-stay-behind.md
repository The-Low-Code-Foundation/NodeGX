---
id: P116-ONT-003-pairs
title: A Links field keeps its pairs with a record after that record is deleted — from either end, on both engines
status: open
severity: medium
area: runtime / schema managers — a Relation's junction rows (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts`, `postgres/PgSchemaManager.ts` `getRelatedIds`; the adapters' `delete` never touches `_Join_*`)
found: P116 R10 s12, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-003-THE-PROJECTION-IS-A-FUNCTION.md §6.6
---

A person has posts with a *Links* field `tags`. They delete a tag. Every post that was paired with it still lists it:
`getRelatedIds` hands back the deleted tag's id, and a screen that follows it finds nothing. The same the other way:
a deleted post's pairs stay in its junction table, readable by its id.

Measured 2026-10-09 on SQLite and PostgreSQL (a throwaway spec through `createAdapter` + `AdapterFacade`, read before
as the control): `Tag t1`; `Post p1`, `p2`, both paired with `t1`. Before: `[t1]`, `[t1]`. After `rawDelete('Tag', t1)`:
`p1` still `[t1]`. After `rawDelete('Post', p2)`: `p2` still `[t1]`. Identical on both engines.

R10 (README §9) ruled the "when it goes" rule for a **link to one record** (a Pointer), which is now kept at delete time
(`@noodl/backend-contract` `targetGoes.ts`). A Links field's pairs are not a column, and no rule names them, so the
delete leaves them. P116's kinds never give a Links field a `whenTargetGoes`; the pair is meaningless once either end
is gone, so the likely fix needs no ruling: the delete takes the record's pairs with it — its own junction rows (every
`Relation` column its declaration names) and the rows in every junction whose target class is its collection. Size:
small, above the engines in `deleteKeepingLinks` (the schema says which junctions; the schema surface needs a
"remove every pair naming this id" call, or `removeRelation` per pair), plus a case beside `ont-003-target-goes.test.ts`.
