---
id: P116-ONT-007-pagecap
title: A world migration read only the first page of each collection when an operator's page cap was under 500 — the rows after it were neither counted by the dry run nor moved
status: fixed
commit: 993a3ff1e
severity: high
area: backend contract / the migration executor (`nodegx-backend-contract/src/migration.ts` `allRows`)
found: P116 ONT-007 s11, 2026-10-09, before the executor had a production caller
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.11
regression: packages/nodegx-backend-contract/tests/migration.test.ts "the executor reads every row, whatever a page is capped at"; packages/nodegx-backend/tests/ont-007-route.test.ts (a cap of 2 set through PUT /admin/ops)
---

An operator who set the backend's page cap low (`PUT /admin/ops { queries: { maxLimit: 200 } }` — anything from
`defaultLimit` up is accepted) and then ran a world migration would have had it read 200 people, move 200, say
"done", and drop the old field from all of them: everyone past the first page lost their account.

Where: the executor read a collection 500 rows at a time and stopped at the first page shorter than 500. The
backend's facade caps every page at `queries.maxLimit` (PRD-001), so a capped page is short with rows after it. The
conformance context it was graded on has no cap, which is why no grade saw it.

Fixed before the route shipped: the executor reads until a page comes back empty, advancing by the rows it got.
Both regressions are red on the old loop (2 of 7 people counted; 2 of 3 under the route's cap).
