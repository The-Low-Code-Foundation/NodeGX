---
id: P109-S21-EXPORTBLENDNAN
title: An exported Color Blend still renders "#NaNNaNNaN" for a Blend Value that is not a number, where the runtime now keeps the colour it last showed
status: fixed
commit: aeb49e430
phase: P109
task: ISL-043
severity: low
area: export / Color Blend (the emitted `blendColor` helper)
found: P109 s21 (ISL-026, the P107-D8 fix), 2026-10-06
regression: packages/nodegx-export/tests/small-utilities.test.ts "blendColorKept follows one runtime node through a sequence of blends and colour changes" (one runtime instance, step by step), NaN and 'abc' back in the parity grid (66 → 78), and the two walker tests "a wired Blend Value read in render …" / "… read only in a handler …" (each red with its walker's record removed)
evidence: packages/nodegx-export/tests/small-utilities.test.ts "blendColor agrees with the interpreter over a grid of lists and blend values" — with NaN in the grid it reads 6 disagreements, one per list ("#NaNNaNNaN" vs the runtime's kept colour)
---

P109 ISL-026 fixed P107-D8 in the runtime (`colorblend.ts`, ruled 2026-10-05 "Keep last colour, warn once"): a
Blend Value that is not a number keeps the colour the node last showed and raises
`color-blend/unreadable-blend-value` once. The exported app's `blendColor` helper was not changed (ISL-026 §5: the
export is P18's) and still returns `#NaNNaNNaN`, which a browser drops as invalid CSS.

The parity grid in `small-utilities.test.ts` compared NaN too; it was taken out of the grid (72 → 66 cases) with a
comment naming this row. Fix: the emitted helper keeps its previous result for a NaN blend (the generated component
holds it) and reports once, then put NaN back into the grid.

**Re-measured 2026-10-14 (P18 session 104, ISL-043 AC1): still fires, not fixed this session, design written down.**
The emitted `blendColor`, transpiled and run, answers `#NaNNaNNaN` for a blend of `NaN`, `'abc'` and **`undefined`**,
and `#7f7f7f` for 0.5. `undefined` is the common case, because a blend wire whose source is unset delivers it. The
runtime keeps `resultColor`, which is `'#000000'` from `initialize` until the first good blend.

**Why it was left:** `blendColor` is a pure call (a `util-call` with no node id), and keeping the last colour is
per-instance memory. The proposal, "the generated component holds it", is right, and it is a cross-walker change:
1. In the planner (`plan.ts` UTIL_NODES 'Color Blend' / the `util-call` builder near `:8146`), carry the node's id on a
   Color Blend's expression.
2. Declare `const <local> = useRef('#000000')` once per such node at the top of the component (as `delayRefs` are,
   `component.ts` ~`:6618`), with the `useRef` import. 🔴 **Both walkers have to record it**: `collectExprUse` (handler
   reads) and `hookExprSources` (render reads), because the code carries a standing warning that the two must be kept in
   step. Missing one leaves a call that names a local nobody declared.
3. Print `blendColorKept(<local>, blend, ...colors)`, a new helper in `utilLib.ts`: for `Number(blend)` NaN, return
   `<local>.current`; otherwise store and return `blendColor(…)`. Keep `blendColor` itself pure, because the parity
   grid calls it.
4. Grade it as a sequence against the runtime node (a good blend, then NaN, then `undefined`), put NaN back into the
   grid through the kept helper, and typecheck the emitted app. The "warn once" half has no bus in an exported app
   (this helper's own comment), so name that in the report rather than fake it.

A repeater row inlined into its parent's `map` would share the parent's ref. Check how the corpus's Color Blend
fixtures place it before choosing where the ref lives.

**Fixed 2026-10-15 (P18 session 105, BOARD lane 6).** A Color Blend whose Blend Value is wired prints
`blendColorKept(<ref>, blend, ...colors)` over a `useRef` the component declares once per node (`moodColourShown` in
mood-desk); an authored numeric blend still prints the pure `blendColor`, so no golden for a literal blend moved. Both
walkers record the ref in the clause that earns the helper's import.

🔴 **The design above was wrong about `undefined`, and measuring the runtime corrected it.** `Node.sendValue`
(`noodl-runtime/src/node.ts`) returns early on `undefined`, so a wire whose source is unset delivers *nothing*: the node
keeps the blend it last received (0 at first) and goes on blending the colours with it. Keeping the last *colour* for
`undefined` would have frozen a blend the runtime still recomputes. So the ref holds two things, the blend last received
and the colour last shown, and the helper has three rules: `undefined` leaves the blend alone; a blend whose `Number()`
is NaN keeps the colour last shown, even while the colours change; and before any blend, the colour shown is the
colours at blend 0 (authored colours are set at creation and each setter blends with the default), `#000000` only with
no colours. The sequence test runs one runtime instance beside the helper, step by step.

**Left, named, not graded:** a colour and a non-number blend arriving in the *same* update are order-dependent in the
runtime (the colour re-blends at the old blend first, then the NaN keeps that colour); one render sees both at once and
keeps the colour from before. And the interpreter's one-time `color-blend/unreadable-blend-value` warning has no bus in
an exported app, the same as the existing `unreadable-color` one; the helper's docblock says so.
