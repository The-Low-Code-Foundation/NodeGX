---
id: P107-C88
title: A Group with Enable Scroll on and Native platform scroll off reports Drop Index as if it had one child — a card dropped from the keyboard lands at 0 or 1, whatever the Group holds
status: open
severity: medium
area: runtime / Group and drag and drop (noodl-viewer-react/src/components/visual/Group/Group.tsx `renderIScroll`; drag-drop.ts `slots` :531-541, `keyboardLift` :858-866, the arrow keys :803-807)
found: P107 NSP-016 s52, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the runtime target's first 200 run of the Group spec, then measured side by side (a card picked up from the keyboard into a Group with three children: Enter drops at 1 with the scroller, at 2 without it)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "row C88 — Enable Scroll on and Native platform scroll off: a card picked up from the keyboard drops after both children, at 2 (the runtime: at 1 — it counts the scroller's wrapper)"
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
