---
id: P107-C78
title: An element that is both Draggable and a drop zone, picked up with the keyboard, starts inside itself — Enter drops it on itself (Dropped and Landed on the same node, its own Drag Value), which the pointer can never do
status: fixed
commit: 23d91e383
phase: P109
task: ISL-031
severity: low
area: runtime / drag and drop (noodl-viewer-react/src/drag-drop.ts `keyboardLift` :841-878, `onKeyDown` :804-815) — every node with both port groups (Text, Image, Group, Circle, Video)
found: P107 NSP-016 s43, 2026-10-05
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.8; the four "row C78" scenarios in packages/nodegx-node-spec/scenarios/Text.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C78 — Draggable and Accept Drops: a keyboard lift never starts in itself (no Drag Over); Enter cancels — nothing Dropped, no Landed" (and its twins on the Shape, Image, Group and Video; the pointer's way: the "where the pointer is" scenarios)
---

**What a person sees.** A column that can be dragged (to reorder columns) and that also takes cards. Someone moves
the column with the keyboard: Tab to it, Space. The column lights up as its own drop target. Enter "drops" it into
itself. The graph hears Dropped on the column, with the column's own Drag Value, and Landed. If the graph moves the
data on Dropped, the column is moved into itself. With a mouse or a finger this cannot happen: `zoneAt` (:446-464)
skips every zone inside the source ("a card cannot be dropped into itself").

**Where.** `keyboardLift` starts the drag in "the innermost zone it sits in". It finds those with
`list.filter((z) => z.el !== el && z.el.contains(el))`, which correctly leaves the element out. When that finds nothing
it falls back to `list[0]`, the first zone in reading order, and that can be the element itself. ArrowLeft and ArrowRight
(:804-815) walk the same list, so they can move into the element too. An Accept Kind that does not take the element's
own Drag Kind avoids it.

**Reproduce.** A Text with Draggable and Accept Drops on, Drag Value `{id: 7}`. Focus it, press Space: Picked Up, Drag
Over true. Press Enter: Dropped Value `{id: 7}`, Drop Index 0, Dropped, Landed. The four "row C78" scenarios pin it
(Accept Kind, Accept Drops switched off and on mid-drag, the Drag Value read at the drop).

**Proposed fix (small).** Have `orderedZones` leave out every zone inside the source (`g.sourceEl.contains(z.el)`), as
`zoneAt` does. The keyboard and the pointer then agree.

**The pointer can do it too, once the element is replaced (P107 s51, 2026-10-06).** The sentence above, "with a mouse
or a finger this cannot happen", holds only while the element stays the same. The gesture remembers the element the
press started on (`g.sourceEl`). `zoneAt` skips zones inside THAT element. If the node's element is replaced while the
press is held or the drag is lifted (Mounted off and on, or a new Tag), its new element is not inside the old one. A
move over the new element then finds the node as its own zone (Drag Over true), and the let go drops it on itself:
Dropped with its own Drag Value, then Landed. The hold timer's lift tracks too, so a held finger whose element was
replaced lifts straight into itself when the pointer was last over the new element. Both targets agree, and the Text's
spec models it: the "where the pointer is" scenarios and the matrix rows "its own mouse press pending … mounted again"
in packages/nodegx-node-spec/scenarios/Text.json (NSP-016 §7.12). **The same fix covers it if it compares against the
node, not the element:** skip a zone whose node is the source (`node === g.source`), in `zoneAt` and in `orderedZones`.
