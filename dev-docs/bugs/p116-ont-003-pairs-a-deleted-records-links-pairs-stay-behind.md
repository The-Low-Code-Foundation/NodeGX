---
id: P116-ONT-003-pairs
title: A Links field keeps its pairs with a record after that record is deleted — from either end, on both engines
status: fixed
commit: a54294a1d
severity: medium
area: runtime / schema managers — a Relation's junction rows (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts`, `postgres/PgSchemaManager.ts` `getRelatedIds`; the adapters' `delete` never touches `_Join_*`)
found: P116 R10 s12, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-003-THE-PROJECTION-IS-A-FUNCTION.md §6.6
regression: packages/nodegx-backend/tests/ont-003-target-goes.test.ts "a tag goes, a post goes, a post goes with its account: no pair names any of them after"
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

**Fixed 2026-10-09 (P116 s13, Opus 5.5)** — ONT-003 §6.7. No new schema member and no ruling: the plan
`deleteKeepingLinks` already reads (`@noodl/backend-contract` `targetGoes.ts`) now carries `unpaired`, every pair
with a record that goes at either end (its collection's own Relations through `getRelatedIds`, and every Relation
whose `targetClass` is its collection through `getRelationOwners`), each pair once. They are taken out last, as the
master key, through the data plane's `removeRelation`, which on PostgreSQL waits for the schema manager's write
queue. A record that goes with another (`goes-too`) takes its pairs too. A delete of a record that is not there
takes nothing (the plan's existence check, as for links), and a Relation that does not name its target collection
cannot be found from the far end, so only its owner's own pairs go. Graded on SQLite and PostgreSQL through the
real `AdapterFacade` (above). Unit cases sit beside it in `nodegx-backend-contract/tests/targetGoes.test.ts`.
Control: with the unpair loop emptied, the engine case is red on both engines and 3 of the 4 unit cases are red.
The fourth checks an absence, and the first case is its known-firing partner.
