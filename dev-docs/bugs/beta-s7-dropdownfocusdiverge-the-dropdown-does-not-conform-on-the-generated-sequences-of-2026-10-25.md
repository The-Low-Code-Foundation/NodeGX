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
