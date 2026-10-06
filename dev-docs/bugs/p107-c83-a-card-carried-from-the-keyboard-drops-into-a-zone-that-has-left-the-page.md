---
id: P107-C83
title: A card carried from the keyboard is dropped into a drop zone that has left the page (Mounted off), and the zone stays lit while it is gone
status: open
severity: low
area: runtime / drag and drop on every visual node that has it (noodl-viewer-react/src/drag-drop.ts — `forget` :123-128, `onKeyDown` :783-839, `drop` :379-399; only a delete or Accept Drops off leaves a zone) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s51, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.12; the Text's zone-side scenarios in packages/nodegx-node-spec/scenarios/Text.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "the zone side: from the keyboard, the Text taken off the page under the carried card — Space on the card still drops it there: Dropped on a Text not on the page"
---

**What a person sees.** Someone picks a card up with the keyboard (Space). It starts in a drop zone, and the zone lights
up (Drag Over true). The app then takes that zone off the page, for example a column whose Mounted is switched off because
a filter hides it. The zone is gone from the screen, but the drag is still in it. Space or Enter drops the card there:
**Dropped** fires on a zone nobody can see, and the graph moves the data into it. Until then the hidden zone's Drag Over
stays true. A screen reader announces "Dropped in drop area 1".

**Where.** The gesture keeps its zone (`g.zone`, `g.zoneEl`) until `leaveZone` runs. Only three things call it: the
pointer finding another zone (`track`), Accept Drops switched off (`setAcceptsDrops`), and the node being deleted
(`forget`). An unmounted node is not deleted. A keyboard drop takes `g.zone` without checking it again (`drop` :379-399),
so it lands in a zone whose element is no longer connected. A mouse drag does not have this problem, because the next move
or the let go tracks the pointer again, finds no zone, and leaves it.

**How to reproduce.** Play the scenario named in `regression:` on the runtime target
(`NSP_ONLY=Text npx jest test/node-spec/conformance.test.ts` in `packages/noodl-runtime`). The spec models what the runtime
does here, so both targets agree and the scenario passes. Its trace shows Dropped Value, Drop Index and Dropped after
Will Unmount.

**Proposed fix (small).** At a keyboard drop, and at each arrow key, check that the gesture's zone still has a live element
(`liveElement(g.zone)`). If it has none, leave it first, so the drop becomes a cancel and Drag Over goes false. The arrow
keys already read `orderedZones`, which leaves out a zone with no live element. Once it is fixed, the spec takes the same
rule and this scenario changes with it.
