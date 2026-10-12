---
id: P107-C103
title: A Drag draws only its first child — every other child vanishes without a word, and the catalog's drag example teaches a readout that never appears
status: fixed
commit: 3506fc6e9
phase: P109
task: ISL-048
severity: medium
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `render` — `React.Children.toArray(props.children)[0]`); catalog / docs/node-catalog/examples/vis-drag-snap-back.json
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; jsdom probe — the real Drag component given two children renders one (`<div id="kid0" class="react-draggable" …>`), the second is absent from the DOM; vis-drag-snap-back.json places a Circle (`chip_circle`) and a Text (`offset_text`, the "Offset readout" its description promises) under the Drag
regression: packages/noodl-viewer-react/tests/isl048-c103-drag-children.test.tsx "row C103 — a Drag with two children draws both"
---

**What a person sees.** Put two things inside a Drag — a chip and a label — and only the first appears; the second is not on the
page at all, with no warning in the editor or the console. The node catalog's example `vis-drag-snap-back` does exactly this: its
description says Drag "makes its children draggable" and that Drag X is "mapped into the label", but the label (`offset_text`) is the
Drag's second child and is never drawn. An agent learning from the catalog learns a layout that does not work.

**Where.** `Drag.render` takes `React.Children.toArray(props.children)[0]` and drops the rest (react-draggable takes one child).

**How to reproduce.** Render the example, or the probe in §7.16.

**Proposed fix.** Either draw every child (wrap them in one element the library moves) or make the one-child rule visible: a
validation warning on a Drag with more than one child, and the example fixed to put the Circle and the Text inside one Group under
the Drag. The example needs the fix either way. Small.

**Ruled 2026-10-08 (P109 s31, asked in session), as recommended: "Draw them all".** Everything inside a Drag appears and moves together as one piece: with more than one child they are wrapped in one element the library moves; a Drag with one child stays exactly as today. The catalog example then works as written.

**Fixed (P109 ISL-048, s31, 2026-10-09), as ruled ("Draw them all").** One child is moved as it always was. More are wrapped in one
`<div>` the library moves (the `nodeRef` reads it first): a flex column, as a Group lays out by default, each child told
`parentLayout: 'column'`; in the Drag's parent's flow (`position: relative`), or at the top left of a parent that lays nothing out
(`absolute`, as a Noodl element there is). C104's class and style go on the wrapper. **The column is this session's reading** of
"wrapped in one element", not part of the ruling. Graded in the viewer (`isl048-c103-drag-children.test.tsx`, real Drag, wrapper and
Text): 6 / 6; control (the Drag before) red on exactly the 4 rows with two children, the one-child and no-child controls green. The
spec's sentence says so (no version: its page holds one child); Drag 22 / 22 at seeds 13 and 20732, mutants 0 survivors.
**Owed:** the catalog example (`vis-drag-snap-back`, a Circle and a Text in one Drag) rendered in a browser — not done (the worktree
has no build output for the render tools); the mechanism it needs is the graded one.
