---
id: P107-S74-CLICKAWAY
title: Group's conformance is red at seed 20736 — a click beside it has a twin branch that no scenario tells apart (a swap-branch mutant survives)
status: fixed
phase: P107
task: NSP-018
severity: medium
area: node-spec / Group (`packages/nodegx-node-spec/src/nodes/group.ts`, `scenarios/Group.json`)
found: P107 NSP-018 s74, 2026-10-10 — the runtime conformance spot-check after wording Group's reducers
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "a click beside it while its own finger is held: …" (kills the swap at seed 20736)
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

**Fixed (s75, 2026-10-10).** The first shape is a mouse click beside the Group that leaves the gesture alone. That
happens when no gesture is under way, and also when a FINGER's gesture is under way: `pointerUp` ends only the gesture of
the pointer that started it (`s.input !== input`). The second shape is the same click ending the Group's own mouse press.
The swap gave the first branch the second's patch, so a click beside the Group ended a finger's hold. No scenario held a
finger, clicked beside the Group and then waited for the hold. Added that scenario: touch, click beside it, wait 500 ms, then
lift. The original lifts it (Picked Up) and the lift cancels it (Cancelled). The mutant had already ended it, so nothing fires.
I read the interpreter's trace before relying on the scenario. Results at seed 20736: on the interpreter, mutants went from
3,659 to 3,660 of 3,668 (the 8 left are listed equivalents). On the runtime, Group conforms: 1,435 / 1,435 scenarios,
200 / 200 generated runs, the same mutant count.

