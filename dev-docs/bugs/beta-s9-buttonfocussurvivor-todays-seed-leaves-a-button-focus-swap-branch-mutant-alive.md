---
id: BETA-S9-BUTTONFOCUSSURVIVOR
title: On the day seed 20751 the Button spec's conformance leaves one mutant alive (person.focus swap-branch, on the branch where a focused press leaves the page), so Button reads DOES NOT CONFORM at HEAD with every scenario and sequence agreeing
status: open
severity: low
area: node-spec / Button (`packages/nodegx-node-spec/src/nodes/button.ts` `person.focus` branches) — the generator's coverage of a focus while leaving the page, not the runtime
kit: node-spec
found: the Beta sweep s9, 2026-10-25, running Button conformance after P112-OWN026-FIX03GOLDEN's version bump
evidence: "net.noodl.controls.button v5 on runtime: DOES NOT CONFORM … scenarios: 58 / 58 passed; generated: 200 / 200 ran, 0 divergence(s); mutants: 697 / 706 killed; SURVIVED person.focus swap-branch on branch {set:[elementFocused,onPage,pressed], emit:[willUnmount]} ↔ {set:[],emit:[]}" — identical at v5 (HEAD's button.ts) and v6
---

Not a divergence: the runtime and the spec agree on all 58 scenarios and 200 generated sequences. One mutant (swap the
branch of `person.focus` that leaves the page while pressed with the one that changes nothing) survives today's 200
sequences, so the kill gate reads the spec as under-tested on this seed. The same class as P107-S95-SEED20738 and
P107-S80-PICKSWAP: a hand scenario that focuses a pressed Button as it leaves the page kills it on every seed.
Reproduce: `NSP_ONLY=net.noodl.controls.button NSP_SEED=20751 npx jest test/node-spec/conformance.test.ts` in
packages/noodl-runtime.
