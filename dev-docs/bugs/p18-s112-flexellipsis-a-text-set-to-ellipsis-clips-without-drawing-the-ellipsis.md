---
id: P18-S112-FLEXELLIPSIS
title: A Text set to Text Overflow Ellipsis clips its line without drawing the "…"
status: open
severity: medium
area: runtime / Text
found: P18 session 112, 2026-10-15, the NOWRAP render (dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/)
evidence: dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/readings.json and shot-runtime.png — ellipsisText computes text-overflow ellipsis, overflow hidden, white-space nowrap, display flex, and paints "an ellipsis line th" with no ellipsis
---

Runtime: `Text.tsx` :67-75 sets `nowrap`, `overflow: hidden` and keeps `textOverflow: 'ellipsis'`, as the port promises
("What a line too long for its box does"). But the element is `display: flex` (`nodes/visual/text.ts` :31, the
default CSS that Text Vertical Align's `alignItems` relies on). The text then becomes an anonymous flex item, and
`text-overflow` does nothing there. Rendered in headless Chrome: a 120 px Text, one line, clipped mid-word, no "…".
So the Ellipsis option looks the same as Clip. Every app that picked Ellipsis shows a hard cut.

Export: draws the "…" (P18-S110-NOWRAP's fix carries the author's choice onto a block `<p>`). This is the one recorded
difference in the render, pinned in `packages/nodegx-export/tests/the-white-space-arms.test.ts` §D. A runtime fix closes it
with no export change. Shape of a fix, not yet tried: when the Text truncates, put the text in an inner block span
(`min-width: 0`, `overflow: hidden`, `text-overflow`, `white-space: nowrap`), so vertical align keeps its flex.
