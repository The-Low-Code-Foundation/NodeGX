---
id: P107-C152
title: A Group with Enable Scroll on and Native platform scroll off ignores its gap — the children touch
status: fixed
commit: 0859bbbde
phase: P109
task: ISL-052
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `renderIScroll` :260-292)
found: P107 NSP-016 s70, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §8.2; measured on headless Chrome (packages/nodegx-node-spec/layout-fixtures/measured/scroll-iscroll.json beside scroll-native.json)
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P107-C152 (fixed, ISL-052) — with Native platform scroll off, a scrolling Group keeps its gap: the children sit 110 px apart, as natively"
---

**What a person sees.** A column of cards with a 10 px Row Gap. The builder turns Native platform scroll off to get snapping or
the Scroll To actions, which is what that port's description tells them to do. The gap disappears, and the cards touch. With
Native platform scroll on, the same column keeps its gap.

**Where.** With Native platform scroll off, `renderIScroll` puts the children in an inner `scroll-wrapper-internal` box. That box
copies the Group's `flexDirection` and `flexWrap` but not its `rowGap` / `columnGap`. The gap stays on the Group, which now has
one child, the wrapper, so nothing is spaced.

**How to reproduce.** `node scripts/node-spec/layout-measure.js --record packages/nodegx-node-spec/layout-fixtures --only
scroll-iscroll,scroll-native`. Measured at 1280×800: the children sit at y 0, 100, 200 with Native platform scroll off, and at
0, 110, 220 with it on. The regression test reads the recording.

**Proposed fix (small).** Copy `rowGap` and `columnGap` onto the inner wrapper's style in `renderIScroll`, as `flexDirection`
is. Then re-record `scroll-iscroll` and flip the regression test's assertion.

**Fixed (P109 ISL-052, s37, 2026-10-09).** The inner box now takes the Group's `rowGap` and `columnGap`, with its Align Items
and Justify Content (P109-S37-ISCROLLALIGN, the same omission). Re-recorded `scroll-iscroll`: the children at 0 / 110 / 220,
as natively. The regression test now holds both paths at 110. A control (HEAD's `Group.tsx`) reddens it, and a planted
variant without the two gap lines reddens it and the alignment test (that fixture has a gap), nothing else.
