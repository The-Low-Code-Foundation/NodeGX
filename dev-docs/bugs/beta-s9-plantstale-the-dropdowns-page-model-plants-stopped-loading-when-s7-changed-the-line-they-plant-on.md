---
id: BETA-S9-PLANTSTALE
title: The node-spec page-model plants suite stopped loading after the Beta sweep's s7 Dropdown fixes changed the line one of its plants edits, so 22 guards graded nothing
status: fixed
commit: f0fea7a64
severity: low
area: tests / `packages/nodegx-node-spec/tests/page-model-plants.test.ts` (the Dropdown plant's exact-text edit of `src/nodes/dropdown.ts`)
kit: node-spec
regression: packages/nodegx-node-spec/tests/page-model-plants.test.ts "the copy plays (a control: the planted key is really in its state)"
found: the Beta sweep s9, 2026-10-25, running the node-spec suites beside P112-OWN026-FIX03GOLDEN
evidence: "Test suite failed to run — dropdown.ts: \"{ set: { value: picked, domSelected: picked }\" occurs 0 times — re-read the file"; Tests: 0 total
---

The suite plants mutants by exact text. BETA-S7-DROPDOWNSTALE / DROPDOWNFIRSTPICK (33ae2817f, 483335262) added
`seeded: false` to the pick's `set`, so the plant's text occurred 0 times and the whole file failed to load: the 22
guards it holds (four shapes of "a key the page model must carry") graded nothing, and the run read as one red file
with no failing test.

Fixed (s9): the plant edits the line as it now reads and plants the same `selected` key. 22/22.

Trap for the next plant-by-text edit: a spec change owes a run of `page-model-plants.test.ts`, as `function-contract`
owes one for `simplejavascript.ts`.
