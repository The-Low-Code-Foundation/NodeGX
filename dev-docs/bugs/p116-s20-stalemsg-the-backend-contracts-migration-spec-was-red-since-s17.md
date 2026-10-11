---
id: P116-S20-STALEMSG
title: The backend contract's migration spec (`migration.test.ts`) was red from s17 to s20 — a step that is two things now names the rules step in its refusal, and the spec still expected the s11 words
status: fixed
severity: low
area: tests / `packages/nodegx-backend-contract/tests/migration.test.ts` ("a plan from a request body › a step that is two things is refused in words"), against `src/migration.ts` `migrationPlanProblems`
found: P116 ONT-011 step 4 s20 (Opus 5.5), 2026-10-11 — the first run of the backend contract's whole suite since s17
evidence: `9bc713ada` (2026-10-11, ONT-014's write) changed the refusal to "step 1 is one of a backup, a schema change, a move or the rules on old values"; the spec expected "… a schema change or a move"; `npx jest` in the package → 1 failed, 229 passed at HEAD `934d63e06`, with no s20 edit to either line
regression: packages/nodegx-backend-contract/tests/migration.test.ts "a step that is two things is refused in words"
---

The same lesson as `P116-S19-STALEGOLDEN`, one package over: s17 to s19 ran the backend bands and the project
contract, never `npx jest` in `@noodl/backend-contract`, whose `migrationPlanProblems` they changed. The code's words
are the intended ones (a `rules` step is a fourth kind of step since s17). **Fixed s20:** the spec expects them. A
change to a contract package is graded by that package's whole suite, not by the backend specs that call it.
