---
id: BETA-S9-BUTTONFOCUSSURVIVOR
title: On the day seed 20751 the Button spec's conformance leaves one mutant alive (person.focus swap-branch, on the branch where a focused press leaves the page), so Button reads DOES NOT CONFORM at HEAD with every scenario and sequence agreeing
status: fixed
commit: 87f0df29b
fixed: 2026-10-27, the Beta sweep s14 — two hand scenarios in `scenarios/net.noodl.controls.button.json`
severity: low
area: node-spec / Button (`packages/nodegx-node-spec/src/nodes/button.ts` `person.focus` branches) — the generator's coverage of a focus while leaving the page, not the runtime
kit: node-spec
found: the Beta sweep s9, 2026-10-25, running Button conformance after P112-OWN026-FIX03GOLDEN's version bump
evidence: "net.noodl.controls.button v5 on runtime: DOES NOT CONFORM … scenarios: 58 / 58 passed; generated: 200 / 200 ran, 0 divergence(s); mutants: 697 / 706 killed; SURVIVED person.focus swap-branch on branch {set:[elementFocused,onPage,pressed], emit:[willUnmount]} ↔ {set:[],emit:[]}" — identical at v5 (HEAD's button.ts) and v6
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json "Keeps Focus on: a mouse press held on the button (the keyboard stays where it was), then Mounted off and a person's Focus in the same frame: Pointer Down, Will Unmount, no Focused; a Focus signal after it is Unchanged"
---

Not a divergence: the runtime and the spec agree on all 58 scenarios and 200 generated sequences. One mutant (swap the
branch of `person.focus` that leaves the page while pressed with the one that changes nothing) survives today's 200
sequences, so the kill gate reads the spec as under-tested on this seed. The same class as P107-S95-SEED20738 and
P107-S80-PICKSWAP: a hand scenario that focuses a pressed Button as it leaves the page kills it on every seed.
Reproduce: `NSP_ONLY=net.noodl.controls.button NSP_SEED=20751 npx jest test/node-spec/conformance.test.ts` in
packages/noodl-runtime.

**Fixed (s14, 2026-10-27).** Two hand scenarios reach the branch on every seed: a finger held on an unfocused Button
(a touch), then Mounted off and a person's Focus in the same frame, with a Focus signal after it as the reader (the
element has left, so it is Unchanged; under the mutant the button stays on the page and takes it); and its mouse twin
under Keeps Focus (a press that leaves the keyboard where it was). Pressed never shows in either trace: on and off in
one frame. Measured: runtime conformance at seed 20751 was 697 / 706 with this survivor, now CONFORMS 60 / 60, 698 / 706
(the 8 declared); each scenario alone kills it; seeds 13, 20731, 20734, 20738 CONFORM. `golden.js --check`: 125 specs
fresh, version rule held (scenarios only, no spec change, so no version).
