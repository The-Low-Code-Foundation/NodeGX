---
id: P107-S74-CLICKAWAY
title: Group's conformance is red at seed 20736 — a click beside it has a twin branch that no scenario tells apart (a swap-branch mutant survives)
status: open
severity: medium
area: node-spec / Group (`packages/nodegx-node-spec/src/nodes/group.ts`, `scenarios/Group.json`)
found: P107 NSP-018 s74, 2026-10-10 — the runtime conformance spot-check after wording Group's reducers
kit: node-spec
evidence: `NSP_ONLY=Group npx jest test/node-spec/conformance.test.ts -w 1` in packages/noodl-runtime at the UTC day's seed 20736 — "Group v7 on runtime: DOES NOT CONFORM … mutants: 3659 / 3668 killed", one SURVIVED
---

Group's runtime conformance test fails today. That is a hole in the suite, not a runtime defect: 1,434 / 1,434 scenarios
pass and 200 / 200 generated runs agree. What fails is the mutant check: one mutant survives.

**The survivor:** `person.clickAway swap-branch` between two branch shapes:

```
{"set":["cardFocused","focusedElem","ran","scheduled","waiting"],"emit":[],"outcome":null,"outcomes":[],"request":false}
{"set":["cardFocused","focusedElem","input","phase","ran","scheduled","waiting"],"emit":[],"outcome":null,"outcomes":[],"request":false}
```

So a click beside the Group has one case that also writes the gesture's `input` and `phase`. Most likely that is a click
that ends a pending press or a card's carry. When the two branches are swapped, nothing any scenario or generated run
records tells them apart.

**Not caused by s74's edits:** the same run on the HEAD spec (`git show HEAD:…/group.ts`, copied in and restored by `cp`,
`cmp`-checked) gives the identical survivor at the same seed. It depends on the seed: the generated runs reach this
branch only at some seeds (NEXT-SESSION-PROMPT, "a seed-dependent swap-branch survivor").

**Fix (P107's, small):** read the second shape's case in `clicked(p, false, true)` (group.ts), find the scenario that
covers its twin, and add the sibling that makes `input` / `phase` observable afterwards (a later act whose result
depends on them). Then check that the reader tells the two arms apart (s68's Focus did not). Re-run with
`NSP_SEED=20736`. Each Group run takes about 4 minutes.
