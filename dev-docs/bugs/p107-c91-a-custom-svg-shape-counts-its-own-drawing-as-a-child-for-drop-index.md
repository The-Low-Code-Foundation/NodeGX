---
id: P107-C91
title: A Shape set to Custom SVG counts its own drawing as a child for Drop Index — a card dropped on it from the keyboard lands at 1, where every other shape says 0
status: fixed
commit: dd71d0d83
phase: P109
task: ISL-038
severity: low
area: runtime / Shape (Circle) and drag and drop (noodl-viewer-react/src/components/visual/Circle/Circle.tsx :327-334; drag-drop.ts `slots` :529-540, `keyboardLift` :858-866, the arrow keys :803-807)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; measured side by side on the runtime target: a card picked up from the keyboard into a Shape with Accept Drops on, then Enter — Drop Index 1 with Shape Custom SVG, 0 with Circle, Square, Star, Triangle and Polygon
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Circle.json "row C91 — Shape Custom SVG: a card picked up from the keyboard into it starts at 0, and Enter drops it at 0"
---

**What a person sees.** A Shape with Accept Drops on is a drop target: a bin, a slot, a badge. It has no children, so a card
dropped on it lands at 0 (Drop Index's own words: where among this zone's children it landed). With Shape set to Custom SVG, a
card moved onto it with the keyboard lands at 1. A graph that inserts at Drop Index puts the card one place too far.

**Where.** Circle.tsx draws Custom SVG's markup inside a `<span>` (`display: block`). The other shapes draw an `<svg>`. drag-drop.ts
`slots` counts the zone element's children that are HTML elements and laid out. An `<svg>` is not an HTML element, so the drawn
shapes count none. The `<span>` is one, so it counts as one slot. A card picked up from the keyboard starts after it (index 1),
and the arrow keys move it between 0 and 1. The Shape's own keyboard lift into itself starts at 0, and ArrowDown moves it to 1. A
pointer drop measures geometry (`indexAt`), and every act's pointer is at (0, 0) here, so it was not seen differing.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says 0, so the scenario carries `row` and
the runtime's difference is counted as known (`svgShapeIsASlot`). Its twin ("Shape Circle (an <svg> drawing …") is 0 on both
targets.

**Proposed fix.** Count only the children a node lays out: let `slots` skip an element the zone's node marks as its own
drawing (a data attribute on Custom SVG's wrapper). Making the wrapper `position: absolute` would also hide it from `slots`, but
it takes the wrapper out of the flow, and that could change the Shape's size. When it is fixed, remove the scenarios' `row` fields and the C91 entry from KNOWN_ROWS in the same commit.

**Ruled 2026-10-07 (P109 s28, asked in one batch of four), as recommended: "Don't count the drawing".** The Shape marks its drawing box so the drag code skips it; Drop Index is 0 on every shape. Nothing about how the Shape looks changes. The question as asked: *"Should the drawing stop counting?"*

**Fixed dd71d0d83 (P109 ISL-038, 2026-10-07).** Circle.tsx marks Custom SVG's span `data-ndl-drawing` and drag-drop.ts `slots` skips a marked element, so Drop Index is 0 on every shape. Ruled "Don't count the drawing". Graded on the runtime: Text v5, Group v2, Shape and Image conform at seeds 13 and 20732 (200 sequences, 0 divergences, every unkilled mutant a declared equivalent) with the row dropped; the visual batch conforms on the interpreter (13 of 13); viewer 1802 / 1802. Control: the base commit's drag-drop.ts, node-shared-port-definitions.ts and image.ts with C91's marker removed are red on exactly the row scenarios (C82, C84 twice, C85 on each of the four nodes, C91's three, C94's one); the base Circle.tsx alone runs the heap out (exit 134).
