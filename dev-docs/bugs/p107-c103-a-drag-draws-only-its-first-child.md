---
id: P107-C103
title: A Drag draws only its first child — every other child vanishes without a word, and the catalog's drag example teaches a readout that never appears
status: open
severity: medium
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `render` — `React.Children.toArray(props.children)[0]`); catalog / docs/node-catalog/examples/vis-drag-snap-back.json
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; jsdom probe — the real Drag component given two children renders one (`<div id="kid0" class="react-draggable" …>`), the second is absent from the DOM; vis-drag-snap-back.json places a Circle (`chip_circle`) and a Text (`offset_text`, the "Offset readout" its description promises) under the Drag
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
