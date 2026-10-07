---
id: P107-C88
title: A Group with Enable Scroll on and Native platform scroll off reports Drop Index as if it had one child — a card dropped from the keyboard lands at 0 or 1, whatever the Group holds
status: fixed
commit: 9e4c79935
phase: P109
task: ISL-038
severity: medium
area: runtime / Group and drag and drop (noodl-viewer-react/src/components/visual/Group/Group.tsx `renderIScroll`; drag-drop.ts `slots` :531-541, `keyboardLift` :858-866, the arrow keys :803-807)
found: P107 NSP-016 s52, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the runtime target's first 200 run of the Group spec, then measured side by side (a card picked up from the keyboard into a Group with three children: Enter drops at 1 with the scroller, at 2 without it)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "C88 — Enable Scroll on and Native platform scroll off: a card picked up from the keyboard drops after both children, at 2"
---

**What a person sees.** A column of cards scrolls with snapping, so its Native platform scroll is off (the port's own
description says to turn it off for snapping and for the Scroll To actions). Someone moves a card into it with the keyboard
and presses the arrow keys. The card can only be placed at the top or after "the" one item: Drop Index is 0 or 1 whatever
the column holds. The graph then puts the card in the wrong place.

**Where.** With the JavaScript scroller, Group.tsx draws its children inside one `scroll-wrapper-internal` div
(`renderIScroll`). drag-drop.ts counts the zone element's own children (`slots`), so it counts one, the wrapper. The keyboard
start index, the arrow keys and the drop all use that count. The pointer's index (`indexAt`) measures the same one child.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec counts the Group's children (the Drop
Index port's own words), so the scenario carries `row` and the runtime's difference is counted as known (`scrollerWrapsChildren`).

**Proposed fix.** Let a node name the element its children are laid out in, and have `slots`, `homeIndex`, `indexAt` and
`openGap` use it: the Group returns the wrapper when the scroller is on. When it is fixed, remove the scenario's `row` field
and the C88 entry from KNOWN_ROWS in the same commit.

**Ruled 2026-10-07 (P109 s28, asked in one batch of four), as recommended: "Count the cards".** The Group tells the drag code which box its cards really sit in, so Drop Index counts the cards in a snapping scroll Group as it does in one that does not scroll. The question as asked: *"Should Drop Index count the cards inside the wrapper?"*

**Fixed 9e4c79935 (P109 ISL-038, 2026-10-07).** Ruled "count the cards". The scroller's wrapper is marked `data-ndl-slots`, and drag-drop.ts `slotParent` gives `slots` and `homeIndex` the element the cards sit in, so Drop Index counts the cards in a snapping scroll Group. Graded on the runtime target at the landing commit's tree (P109 s29, 2026-10-07): the Group v3 conforms at seeds 13 and 20732 (1390 of 1395 scenarios, the five failing ones the open C79 row; 200 sequences, 0 divergences, every unkilled mutant a declared equivalent), and the Text, Shape and Image conform at both seeds with the new drag-drop.ts; the Group conforms on the interpreter (every mutant killed or declared); viewer 1807 / 1807; catalog parity + schema 342 / 342 with the visual batch. Control: HEAD's Group.tsx, drag-drop.ts and group.ts under the same scenarios are red on exactly the fifteen row scenarios of C86, C87, C88, C89, C90 and C95, and the nine twins pass on both.
