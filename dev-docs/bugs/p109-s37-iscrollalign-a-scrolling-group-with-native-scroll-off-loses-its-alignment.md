---
id: P109-S37-ISCROLLALIGN
title: A Group with Enable Scroll on and Native platform scroll off loses Align Items (and, when it wraps, Justify Content) — a centred list sits at the edge
status: fixed
phase: P109
task: ISL-052
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `renderIScroll`)
found: P109 ISL-052 s37, 2026-10-09, probing beside P107-C152 (the same inner box)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; measured on headless Chrome (packages/nodegx-node-spec/layout-fixtures/measured/scroll-align.json)
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P109-S37-ISCROLLALIGN (fixed, ISL-052) — with Native platform scroll off, a scrolling Group keeps Align Items and Justify Content: column and row, with and without wrap, every child where its native twin is"
---

**What a person sees.** A 300 × 200 list, Align Items centre, Justify Content centre. With Native platform scroll on, the
cards sit in the middle. Turn it off (for snapping, or the Scroll To actions) and a column's cards move to the left edge, a
row's to the top. With Wrap on, the other axis is lost instead: a wrapping column's cards move to the top.

**Where.** With Native platform scroll off, the children sit in the inner `scroll-wrapper-internal` box, which copied only the
direction and the wrap. The axis that box fills (100% of the Group: the cross axis, or the main axis when it wraps) is laid
out by the box's own defaults, so the Group's Align Items or Justify Content reaches nothing. The other axis survives,
because there the box hugs its children and is itself placed by the Group. Measured at `f1ad13e2e`: column a(0,40) b(0,100)
against natively a(120,35) b(120,105); row a(90,0) against a(85,70); wrapping column a(120,0) against a(120,35); wrapping row
a(0,70) against a(85,70).

**Reach.** None on the shelf: the templates hold one scrolling Group, on the native path.

**Fixed (s37).** The inner box takes Align Items and Justify Content, with the gap (P107-C152). All eight children of the
`scroll-align` fixture now sit where their native twins do. A control reddens the test, and so does a planted variant without
the two alignment lines (alone).
