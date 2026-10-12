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
