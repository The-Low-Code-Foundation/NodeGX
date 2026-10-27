---
id: BETA-S7-DROPDOWNFOCUSDIVERGE
title: The Dropdown does not conform on one generated sequence of 2026-10-25's seed — after Blur, a Label write and a long advance, the runtime fires Focused where the spec says Blur's Done
status: fixed
commit: aa9f30cdd
fixed: 2026-10-27, the Beta sweep s14 — the spec corrected (Visible reaches the element at once), six control specs
severity: low
area: node-spec / Dropdown (`packages/nodegx-node-spec/src/nodes/dropdown.ts` focus and label handling) or the runtime (`options.ts`, `utils.ts` focus actions, `react-component-node.ts`)
found: the Beta sweep s7, 2026-10-25, running Dropdown conformance for P121-TWO005-DROPDOWNSTALE
evidence: `NSP_ONLY=net.noodl.controls.options npx jest test/node-spec/conformance.test.ts` in packages/noodl-runtime, day seed 20751, sequence seed 1530142452
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "Visible: placed hidden, then Visible on and a Focus in the same frame — the dropdown is shown at once, so the Focus reaches it: Focused true and Focused fires (Done)"
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

**s14 (2026-10-27): the spec was wrong, not jsdom, and not only the Dropdown.** The s9 hypothesis does not hold: the
runtime's target already refuses focus to a hidden element (`noodl-runtime/test/helpers/node-spec-target.ts` :494-501,
NSP-016 s43); s9's probe was raw jsdom. Shrunk (73 runs) the sequence is three steps: placed hidden, then
`set visible 1`, `signal focus`, `settle`. The spec said Visible reaches the page at the next paint, so the Focus finds
it hidden and does nothing; the runtime writes `visibility` onto the element on the spot (Visible's setter →
`setStyle` / `removeStyle` in `react-component-node.ts`, `visibility` in none of their render-forcing lists), so the
Focus lands and Focused fires. Measured in Chrome 156 by raw CDP (focus emulation on): `focus()` on a `<select>` under
`visibility: hidden` (its own or its parent's) is refused, no focus event; hidden and shown again in the same task, it
takes focus. So a browser does what the runtime's target does. The same three steps, and the mirror (on the page, then
Visible off and a Focus in one frame: the runtime refuses, the spec took it), diverged on all six focusable controls,
18 of 18: Button, Checkbox, Dropdown, Radio Button, Slider, Text Input.

The runtime's way is also the one a builder wants: "show the search field and focus it" from one signal works.

**Fixed in the spec** (no runtime change): the six `visible` reducers set `pageVisible` with `visible` and say "at once";
each version rises by one with a shared `changes` entry (`src/nodes/visible-at-once.ts`, migration none: the runtime
never did otherwise). Three hand scenarios per spec (placed hidden then Visible on + Focus, the same after a paint, on
the page then Visible off + Focus). `golden.js --check`: 125 specs fresh, version rule held, no existing trace moved.
Catalog and enriched catalog regenerated (the six `says` lines only). docs-site node pages NOT regenerated: they were
already stale at HEAD in 37 files from other changes, and embed whole spec sources.

Measured after the fix: runtime conformance of the six at seed 20751 (the failing seed) and 13 all CONFORM (Dropdown at
20751: 94/94 scenarios, 200 sequences, 0 divergences); node-spec batch-visual, runner, golden, draw, pilot,
catalog-parity, spec-ledger, schema, settings-diagnostics green. Two older reds met on the way and fixed apart:
BETA-S14-SLIDERFOCUSSURVIVOR and BETA-S14-SEEDEDPAGEMODEL.
