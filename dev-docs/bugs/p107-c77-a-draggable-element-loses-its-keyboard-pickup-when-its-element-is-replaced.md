---
id: P107-C77
title: A Draggable element can no longer be picked up from the keyboard once its element is replaced — after Mounted goes off and on, after its Tag changes, or when it mounts more than about a second after Draggable was set
status: fixed
commit: 167c40e9c
phase: P109
task: ISL-031
severity: medium
area: runtime / drag and drop (noodl-viewer-react/src/drag-drop.ts `setDraggable`, `whenMounted`) — every node with the Drag Source ports (Text, Image, Group, Circle, Video)
found: P107 NSP-016 s43, 2026-10-05
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/RESEARCH-DRAG-DROP.md §4 (the probe's six cases, on the real Text node in the runtime target's page)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C77 — Mounted off and on: the new element takes the keyboard too, so Space lifts it; after Draggable off and on, the next Space lets it go" (and the other "row C77" scenarios, a new Tag and a late mount among them, on the Text, Shape, Image, Group and Video)
---

**What a person sees.** A card that could be picked up with Tab and Space stops responding to the keyboard. Tab
skips it and Space does nothing. A mouse or a finger can still pick it up. It happens when the card's element is
replaced:

- Mounted goes off and back on (a collapsed column opened again; any parent that remounts);
- the Text node's Tag changes (`div` to `h1`);
- the card was put on the page unmounted, or Draggable was set while it was unmounted, and it mounted more than
  60 frames (about a second) later.

Switching Draggable off and back on brings it back.

**Where.** `setDraggable(node, true)` (drag-drop.ts :83-110) adds `tabindex="0"` and `aria-roledescription` once, to
whatever element `whenMounted` finds (:136-145). `whenMounted` asks every frame for 60 frames and then gives up.
Nothing adds them again: a remount or a new tag gives React a new element without them. The keyboard pickup
(`onKeyDown` :768-783) needs `document.activeElement` to be the node's element, and a `<div>` without a tabindex
cannot take the keyboard.

**Reproduce.** A Text with Draggable on. Settle, Mounted false, settle, Mounted true, three settles, focus it, press
Space: nothing (the control, with no remount: Picked Up, Is Lifted true). The same for Tag `h1`, and for a Text
placed with Mounted false and mounted after 70 settles (after 3 settles: Picked Up). The probe is recorded in the
evidence file; seven "row C77" scenarios in the Text spec pin it, the 60-frame edge among them (a settle of the runtime
target is two frame starts, both before its paint commits).

**Proposed fix (small).** Add the attributes where the node learns its element, in `setDOMElement`
(react-component-node.ts :1934): when `_internal.draggable` is on, add the two attributes the author has not set.
That covers every new element, with no polling and no frame budget. `whenMounted` can then go.

**Fixed (P109 ISL-031, s31, 2026-10-08), as proposed.** The node reports each new element to the drag module from
`setDOMElement` (`elementChanged`), and a Draggable node's element takes the two attributes there; `whenMounted` is gone.
The five specs that copy drag-drop.ts (Text v9, Shape v5, Image v5, Group v7, Video v5) say the same. With every element
taking the keyboard, nothing outside could tell whether an act's paint or the frame end made a new element, and ~630
interpreter mutants were stranded on exactly that. As P107 ruled (s30), the state that became unobservable was removed
rather than declared: which element is on the page (`onPage`, `elem`, `shownTag`, the Group's `stampOn`) is the paint's
sync (`synced`), and the keyboard is the element that holds it (`focusedElem`, replacing the `elementFocused` flag), so
a paint writes nothing about the keyboard. 118 scenarios read what is left (a focused element given a new Tag and its old
one back in one frame; Draggable off and on around an act; a card picked up during the node's own drag; …). Interpreter
mutants: 0 survivors on all five at seeds 13 and 20732. Runtime: all five conform at 13 and 20732; control (drag-drop.ts and react-component-node.ts before) red on 21 / 117 / 117 / 30 / 16 of the C77 scenarios (ISL-031 §12).
