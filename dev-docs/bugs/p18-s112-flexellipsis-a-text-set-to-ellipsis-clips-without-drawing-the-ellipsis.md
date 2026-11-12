---
id: P18-S112-FLEXELLIPSIS
title: A Text set to Text Overflow Ellipsis clips its line without drawing the "…"
status: fixed
severity: medium
area: runtime / Text
found: P18 session 112, 2026-10-15, the NOWRAP render (dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/)
evidence: dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/readings.json and shot-runtime.png — ellipsisText computes text-overflow ellipsis, overflow hidden, white-space nowrap, display flex, and paints "an ellipsis line th" with no ellipsis
regression: packages/noodl-viewer-react/tests/def031-text-overflow.test.tsx "ellipsis: the words are in a span that shrinks to the box, clips and draws the ellipsis"
owner: Beta sweep s16
commit: 9a918f6fc
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

**Fixed (Beta sweep s16, 2026-10-27, 9a918f6fc).** The shape proposed above: an Ellipsis Text draws its words in a
span (`min-width: 0`, `text-overflow: ellipsis`, `white-space: nowrap`, and the element's own `overflow`, `hidden`
unless the author chose one). Clip and the default render as before (no span). Measured in headless Chrome on the s112
page (`wrap-desk`) through `render-from-disk.js` with HEAD's viewer and the fixed one built into the scratchpad: HEAD
paints "an ellipsis line th", fixed paints "an ellipsis line …"; the four Texts' boxes are identical; three added
Ellipsis Texts (200 × 60, short centred, short right/bottom, long centred) put a short text at the same pixel, and the
long centred one, which on HEAD started 44 px left of its box (its first words cut off), now starts at its left edge.
Text conformance CONFORMS (1272/1272, seed 20753). The export's `the-white-space-arms.test.ts` §D still describes the
difference as the runtime's (export lane, paused): its assertions grade the export only and stay green.
