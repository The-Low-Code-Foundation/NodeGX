---
id: P107-S95-SEED20738
title: The runtime conformance run is red on the 2026-10-12 seed for reasons no session changed — mutants survive in DbModel2, JavaScriptFunction, Router and the Radio Button, and known row C96 no longer reproduces
status: open
severity: low
area: tests / runtime conformance (`packages/noodl-runtime/test/node-spec/conformance.test.ts`) — the day's seed (`NSP_SEED`, 20738 on 2026-10-12) and the known-row list (NSP-016 §6 C96)
found: P107 s95, 2026-10-12 — the full `npx jest test/node-spec` run in packages/noodl-runtime (1,479 s, 9 failed / 625 passed)
evidence: survivors — DbModel2 `modelId` drop-set and swap-branch; JavaScriptFunction `afterInputs` drop-set; Router `afterInputs` drop-set and drop-resume; Radio Button `person.pick` swap-branch. Control: `NSP_ONLY=DbModel2 NSP_SEED=20737` CONFORMS, `NSP_SEED=20738` DOES NOT. The mutant check plays mutants on the interpreter only (conformance.ts :317, :355), and s95's interpreter change is a no-op for a spec without `diagnostics`. C96: the two C96 scenarios on the runtime, with s95's recording editor and with the original connection restored, give identical traces and neither throws
kit: node-spec
---

Two different things, both found by s95's full run and neither caused by it.

**Mutants that survive on one seed.** The generator's 200 sequences are drawn from the day's seed. On 20738 they reach the
branches above but never in a way that tells the mutant from the original. The same specs kill every mutant on 20737. Same
family as P107-S92-VIDEOEMBEDSEED (Video, also red on this seed). A hand scenario per survivor would make each kill
independent of the day.

**C96 stopped firing.** Row C96 says the runtime throws when a Video showing a YouTube link gets a Source Object. Neither
scenario throws on the runtime now. Likely cause, not checked: `42699d261` (P109 ISL-045, 2026-10-11, "a built-in node
that throws while drawing loses itself, not the page"). The row's own rule: close it in NSP-016 §6 or drop the mark, after
reading whether the Video now loses itself instead (a different defect, still a person's blank video).

**Not done:** either half. Neither touches what s95 built.

**s100 (2026-10-13, seed 20739), the full `npx jest -w 2 test/node-spec` in noodl-runtime, run before any s100 edit:** 9 failed /
644 passed / 125 skipped. 118 specs CONFORM; every red is a mutant that survives on this seed, plus C96 (still not firing).
The survivors moved with the seed: String (`afterInputs` drop-set), Dropdown (`person.blur` swap-branch), Range (`person.click`
swap-branch ×2), Video, Drag (`snapToPositionY.value` swap-branch), Delete Record Properties (`afterInputs` drop-set and
swap-branch), WebSocket (`connect` swap-branch), JavaScriptFunction (`afterInputs` drop-set — the one survivor on both days).
DbModel2, Router and Radio Button, red on 20738, killed every mutant on 20739. So the full run is red on most days for a reason
no session caused, and that red hides a real one; the bug's fix (a hand scenario per survivor) is now nine scenarios, not four.
