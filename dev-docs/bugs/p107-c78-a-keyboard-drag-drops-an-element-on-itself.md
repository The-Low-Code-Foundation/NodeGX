---
id: P107-C78
title: An element that is both Draggable and a drop zone, picked up with the keyboard, starts inside itself — Enter drops it on itself (Dropped and Landed on the same node, its own Drag Value), which the pointer can never do
status: open
severity: low
area: runtime / drag and drop (noodl-viewer-react/src/drag-drop.ts `keyboardLift` :841-878, `onKeyDown` :804-815) — every node with both port groups (Text, Image, Group, Circle, Video)
found: P107 NSP-016 s43, 2026-10-05
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.8; the four "row C78" scenarios in packages/nodegx-node-spec/scenarios/Text.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C78 — Draggable and Accept Drops: a keyboard lift starts IN ITSELF (Drag Over true); Enter drops it on itself — its own Drag Value, Drop Index 0, Dropped, Landed"
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
