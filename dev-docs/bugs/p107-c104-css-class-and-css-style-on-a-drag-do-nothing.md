---
id: P107-C104
title: CSS Class and CSS Style on a Drag do nothing — the Drag has no element and passes neither to the child it moves
status: fixed
commit: 9e19b3841
phase: P109
task: ISL-048
severity: low
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `render` reads neither `props.className` nor `props.style`; react-component-node.ts `cssClassName` / `styleCss` are declared on every visual node)
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; jsdom probe — the real Drag component given `className: 'zz-author-class'` and `style: { color: 'red', outline: … }` renders `<div id="kid0" class="react-draggable" style="transform: translate(0px,0px);">`: neither reaches the page. CSS Style is parsed into the node's style (`updateAdvancedStyle` → `setStyle`), which the component also ignores
regression: packages/noodl-viewer-react/tests/isl048-c104-drag-css.test.tsx "row C104 — the Drag's class is added to the element, beside the child's own and the library's"
---

**What a person sees.** The property panel offers CSS Class and CSS Style on a Drag ("Extra CSS class names to put on this
element"). Setting either changes nothing on the page. The class or style has to go on the child instead (DEF-027 made the child's
own class survive the Drag).

**Proposed fix.** Pass `className` and `style` from the Drag through to the child it clones (merging with the child's own, as
DEF-027 does for the class), or stop declaring the two ports on a node with no element (`noDataAttributes` already marks Drag as
one). Small.

**Ruled 2026-10-08 (P109 s31, asked in session), as recommended: "Apply to what it moves".** CSS Class and CSS Style go onto the element the Drag moves, added to that element's own class and style (as DEF-027 does for the class).

**Fixed (P109 ISL-048, s31, 2026-10-09), as ruled ("Apply to what it moves").** `Drag.tsx` passes its CSS Class and a non-empty CSS
Style on the child it clones: react-draggable adds `react-draggable` to that class and its transform to that style, and the child's
wrapper adds both to the node's own (DEF-027 for the class; on a style property both set, the Drag's wins, as a React parent's
always does). Graded in the viewer (`isl048-c104-drag-css.test.tsx`, beside DEF-027's, on the real Drag, wrapper and Text): 5 / 5,
DEF-027's 5 / 5; control (the Drag before) red on exactly the 3 rows that pass a class or style, its 2 controls green. The spec's
look comments say so (no version: nothing on the wire); Drag 22 / 22 at seeds 13 and 20732, mutants 0 survivors.
