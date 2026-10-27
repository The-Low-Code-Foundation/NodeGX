---
id: BETA-S14-SLIDERFOCUSSURVIVOR
title: On the day seed 20751 the Slider spec's conformance leaves two mutants alive (person.touch swap-branch, on the branch where a focused, unhovered slider leaves the page), so the Slider reads DOES NOT CONFORM with every scenario and sequence agreeing
status: fixed
commit: aa9f30cdd
fixed: 2026-10-27, the Beta sweep s14 — one hand scenario in `scenarios/net.noodl.controls.range.json`
severity: low
area: node-spec / Slider (`packages/nodegx-node-spec/src/nodes/slider.ts` `person.touch`) — the generator's coverage of a pointer act while leaving the page, not the runtime
kit: node-spec
found: the Beta sweep s14, 2026-10-27, running the six focusable controls' conformance for BETA-S7-DROPDOWNFOCUSDIVERGE
evidence: "net.noodl.controls.range v8 on runtime: DOES NOT CONFORM … mutants: 789 / 796 killed; SURVIVED person.touch swap-branch on branch {set:[elementFocused,focused,onPage], emit:[willUnmount,onBlur]} ↔ {set:[out,pending,percent],emit:[]} and ↔ {set:[],emit:[]}" — identical at HEAD's slider.ts (v8) and at v9
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "the keyboard on the slider with no pointer over it (a Tab put it there), then Mounted off and a pointer act in the same frame: the act's paint takes the element, Will Unmount and Blurred, and a Focus and a Blur after it are Unchanged and Done — every pointer act"
---

Not a divergence: the runtime and the spec agree on every scenario and generated sequence. Two mutants (swap the branch of
`person.touch` where a focused slider with no pointer over it leaves the page in the act's paint with two other branches)
survive seed 20751's 200 sequences. The same class as BETA-S9-BUTTONFOCUSSURVIVOR and the Button's s57 survivor
(66c709174): the Slider had the hovered shape as a hand scenario ("focused and under the pointer…") and not the unhovered
one.

**Fixed (s14).** One hand scenario: a Tab onto the slider, then Mounted off and each pointer act (hover, leave, press,
release, click, touch, lift) in the same frame, with a Focus and a Blur signal after as readers. Measured at seed 20751:
was 789 / 796 with these two survivors (HEAD's files and this session's both), now CONFORMS 86 / 86 scenarios,
900 / 906 mutants (the new scenario reaches branches no sequence reached, so the count grows).
