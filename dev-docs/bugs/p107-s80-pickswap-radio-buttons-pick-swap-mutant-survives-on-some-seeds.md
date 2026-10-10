---
id: P107-S80-PICKSWAP
title: Radio Button's "pick of the selected sibling" swap mutant survives on some daily seeds — the swap hands back a group value the play already holds
status: open
severity: low
area: node-spec / Radio Button scenarios (`packages/nodegx-node-spec/scenarios/net.noodl.controls.radiobutton.json`) and the swap-branch mutant (`src/runner/mutants.ts`)
found: P107 NSP-020 s80, 2026-10-11 — closing the seed-only survivors the first full runtime batch after s79 showed
evidence: `NSP_SEED=20733` and `NSP_SEED=20738` `NSP_ONLY=net.noodl.controls.radiobutton npx jest test/node-spec/conformance.test.ts` — one survivor, `person.pick` `{"set":["elementFocused","focused"],"emit":["onBlur"]}` swapped with the pick that moves the group (`gValue`); the same on the pre-s79 tree (f60e10e82), so not from s79 or s80
kit: node-spec
---

A pick of the sibling that is already selected leaves the group's value alone (the branch sets only the keyboard
fields). Its swap mutant returns the OTHER pick branch's recorded patch, which writes `gValue`. When the value that
patch carries is the one the group already holds, the swap changes nothing on the wire and no sequence can kill it —
the trap s25 named ("a scenario already holding that value can't kill it"). On 9 of the 11 seeds 20730–20740 the
generated sequences happen to kill it; on 20733 and 20738 they do not.

**What a person sees:** nothing — the Radio Button conforms on the runtime on every seed (0 divergences); the hole is
in how well the suite grades the pick, not in the node.

**Why it is not closed here:** a killing scenario has to hold the group at a value different from the one the swap's
example writes, and which example the runner keeps depends on the suite (`discoverBranches` keeps the richest, then the
first). A scenario written against today's example breaks when another scenario is added. The durable fix is in the
mutant machinery (a swap's patch written against the CURRENT state's value, or an example per distinct value), or a
scenario that reveals `gValue` after the pick by writing this button's Value (as scenario 49 does) for each value the
example might carry.

**Daily CI:** green on 2026-10-11's seed (20736). A red radiobutton run on a later day with this branch in its survivors
is this row, not a regression.
