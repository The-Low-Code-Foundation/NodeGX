---
id: P109-S21-EXPORTBLENDNAN
title: An exported Color Blend still renders "#NaNNaNNaN" for a Blend Value that is not a number, where the runtime now keeps the colour it last showed
status: scheduled
phase: P109
task: ISL-043
severity: low
area: export / Color Blend (the emitted `blendColor` helper)
found: P109 s21 (ISL-026, the P107-D8 fix), 2026-10-06
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
