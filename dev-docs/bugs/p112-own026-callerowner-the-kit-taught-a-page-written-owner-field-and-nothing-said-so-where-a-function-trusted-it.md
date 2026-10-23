---
id: P112-OWN026-CALLEROWNER
title: The kit taught "owner isolation by an explicit field" set from the User id on the page, and nothing said so where a page wrote one or a cloud function trusted one, so the shortest graph for "invite someone to see my records" leaked another family's records
status: fixed
commit: fbd337bfe
regression: packages/noodl-editor/tests-unit/validation/ownerField.test.ts
severity: high
area: kit / examples + validation (`docs/node-catalog/examples/cloud-query-own-rows.json`; `packages/noodl-editor/src/editor/src/validation/ownerField.ts`)
found: P112 OWN-026 t2-nodegx-c05 (LEARNINGS #8), 2026-10-23; FIX-05
evidence: /Users/Shared/nodegx-lab/own026-grades/t2-nodegx-c05/grade.json C5.3 and T7 (forged-T1.png, forged-famB.png)
---

DeepSeek built a teacher invitation as a row the page created with `familyId` = the User node's `id`, and a cloud
function that returned every child whose `familyId` an invitation for the caller's address named. Replaying another
family's invitation with one's own address read that family's children (C5.3, and T7 regressed). The function's
comment: "No value arrives from the caller, so there is nothing to forge." The plain-code arm took the family from the
session. The kit's own example `cloud-query-own-rows` taught the shape: "owner isolation by an explicit field … Each
row is created with `ownerId` set from the same User id."

Fixed: the example filters on `owner` (the backend's own field; see P112-OWN026-OWNERWRITABLE) and says never to copy
the User id into a field of one's own. A new example, `cloud-share-my-records-with-someone`, shows "let someone see my
records" as a share naming only an address and a cloud function that returns the records of the shares' owners
(`list_examples` ranks it first for "invite someone to see my records" and "invite a teacher by email to see my
children"). Two infos come back in the write's own answer, never blocking:
- `owner-sent-by-the-page`: a Create/Update Record field fed from the User `id` in a browser component.
- `function-trusts-a-field-the-caller-wrote`: a cloud function reads records, answers per caller, and names `owner`
  nowhere. Silent when the project's rules say no caller creates or updates what it reads.

Measured: both fire on the round's own components. 0 of 171 example components and 0 of 1,051 template components
fire (60 template functions answer per caller; the 2 that fired before the rules check read `Member`, which only a
function writes). The readFirst rules, the backend doctrine, the enforced-rules note and the Create Record and Query
Records enrichments say it.

Not expressible today (C): a path rule (ONT-004) is refused on `create`, and `onlyWhile` (ONT-014) reads old values,
so "a new record may name only the caller's own group" has no rule. `owner` makes most of that need go away; a group
of several people (two parents) still has no create-time rule.
