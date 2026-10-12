---
id: P116-S19-STALEGOLDEN
title: The projection spec (`project.test.ts`) was red from s17 to s19 and nobody ran it — its goldens predated ONT-014's held rules, its "nothing said is dropped" branch did not know them, and `migrate.test.ts` did not type-check since s18
status: fixed
severity: medium
area: tests / `packages/nodegx-project-contract/tests/project.test.ts` (AC1's `projected.json` goldens, dated 2026-10-09; the "nothing said is dropped" else-branch, which expects every non-unique, non-pair rule to be SAID in the description) and `tests/migrate.test.ts` (`shape()` narrows a step union that gained a `rules` member in s18)
found: P116 ONT-011 step 2 s19 (Fable 5.1), 2026-10-11 — the first run of the package's whole suite since s17
evidence: `git log -1 -- tests/fixtures/world/projected.json` → a54294a1d 2026-10-09; ONT-014's projection commit e06f4259d 2026-10-11 10:38 flipped set once / never edited / never deleted to `onlyWhile` (held); the golden still said "nobody deletes a person; it ends" under `notHeld`, and the else-branch read `[rule.says, false, false]` for "an account's company is set once" on `world`, `world-every-kind` and `world-membership`; `tsc -p tsconfig.tests.json` → `tests/migrate.test.ts(34,104): Property 'schema' does not exist`
regression: packages/nodegx-project-contract/tests/project.test.ts "AC1 — the same files project to the same bytes" and "nothing said is dropped" (the else-branch now expects the five `onlyWhile` shapes on `c.onlyWhile` with a held claim, and an `allOrNone` check for a required `onlyWhen`); `npx tsc --noEmit -p tsconfig.tests.json` clean
---

s17 made *set once*, *never edited* and *never deleted* held (ONT-014 §3.3) and s18 added the `rules` migration step,
and each session ran the two specs it touched (`world.test.ts`, `mutants.test.ts`, the backend bands) — the handoffs
said "the project contract is green". The package has thirteen suites. `project.test.ts` compares every fixture's
projection to a committed golden and checks that every rule a kind makes is held or said; both halves read the
s16 world. Red for two sessions, found when s19's vocabulary change made the whole package suite the obvious run.

**Fixed s19:** the goldens regenerated (`ONT003_WRITE_GOLDEN=1`) and read before committing (the diff is ONT-014's
`onlyWhile` plus ONT-011 step 2's additions, nothing else); the else-branch learned the held `onlyWhile` shapes and
the held `onlyWhen`; `shape()` learned the `rules` step. **The lesson is the handoff's, not the test's:** "the spec I
touched is green" is not "the package is green" — a sibling spec that reads the same fixtures and the same
projection is a gate on the change whether or not the change named it. Run the package's `npx jest`, and its
`tsc -p tsconfig.tests.json`, before saying a contract package is green.
