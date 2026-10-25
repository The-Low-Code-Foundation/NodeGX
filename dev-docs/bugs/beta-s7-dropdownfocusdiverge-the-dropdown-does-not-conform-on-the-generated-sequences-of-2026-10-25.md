---
id: BETA-S7-DROPDOWNFOCUSDIVERGE
title: The Dropdown does not conform on one generated sequence of 2026-10-25's seed — after Blur, a Label write and a long advance, the runtime fires Focused where the spec says Blur's Done
status: open
severity: low
area: node-spec / Dropdown (`packages/nodegx-node-spec/src/nodes/dropdown.ts` focus and label handling) or the runtime (`options.ts`, `utils.ts` focus actions, `react-component-node.ts`)
found: the Beta sweep s7, 2026-10-25, running Dropdown conformance for P121-TWO005-DROPDOWNSTALE
evidence: `NSP_ONLY=net.noodl.controls.options npx jest test/node-spec/conformance.test.ts` in packages/noodl-runtime, day seed 20751, sequence seed 1530142452
kit: node-spec
---

Red at 8f1c6e8d9 (that commit's `options.ts` and `dropdown.ts` together, measured), so not DROPDOWNSTALE's. The sequence:
params include `value: -1`, `useIcon: [1,2]`, `iconSourceType: "image"`, `variant: [1,2]` among style noise; steps
`signal blur`, `advance 0`, `act leave`, `act blur`, `signal focus`, `set visible 1`, `signal focus`, `set label 0`,
`signal blur`, `advance 30000`, settle, `set paddingRight 0`, settle. First difference at event 71: the interpreter says
`outcome blur done`, the runtime sends `signal onFocus`.

Not investigated: whether a Focus signalled before the element can take it is applied late by the runtime (a pending
focus) or the spec drops a Focus the runtime keeps. The day's seed changes daily, so this reads as a flake on another day;
it is a fixed sequence, and reproduces with that seed.

**s9 (2026-10-25): reproduced, not fixed.** `NSP_ONLY=net.noodl.controls.options NSP_SEED=20751 npx jest
test/node-spec/conformance.test.ts` (packages/noodl-runtime) reproduces it exactly: sequence 1530142452, first difference
at event 71, interpreter `outcome blur done`, runtime `signal onFocus` (33.5 s). Read, not measured: the spec's Focus on a
hidden Dropdown does nothing (`dropdown.ts` :420 `!s.pageVisible`; `visible` takes effect at the next paint, and the
params start it `visible: undefined`, hidden), while the runtime's Focus goes through `FocusTracker.setNodeFocused`,
which checks `_canFocus` (mounted) and never visibility, so it calls `focus()` on the hidden `<select>`. A browser refuses
focus to a `visibility: hidden` element; jsdom (the conformance target) does not check rendering, so the `<select>` takes
focus there and its `onFocus` lands on a later event. **Hypothesis: a jsdom fidelity gap, not a product defect.** Next:
the one sequence through `NSP_DEEP` with `NSP_REPLAY_DIR` (expensive: every mutant runs), or a jsdom probe of
`select.focus()` under `visibility: hidden`; then either a `_canFocus` that reads visibility (product) or a target that
refuses focus to a hidden element (harness).

Measured the jsdom half (s9): in the runtime's jsdom, `select.focus()` inside a `visibility: hidden` parent makes it
`document.activeElement` and fires `focus` (1 event); a browser's focusing steps refuse an element that is not being
rendered. The browser half (does a hidden Dropdown take a Focus in Chrome) is not measured; one CDP drive answers it.
