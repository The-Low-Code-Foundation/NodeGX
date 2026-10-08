---
id: P107-C79
title: A Text at Opacity 0 catches clicks once Pointer Events Enabled or Pointer Events Mode is written after it was drawn — the style write goes straight to the DOM and the component's "opacity 0 takes no pointer" rule is never re-applied
status: fixed
commit: 7496d93f0
phase: P109
task: ISL-031
severity: medium
area: runtime / every visual node with both the opacity rule and the Pointer Events inputs (react-component-node.ts `setStyle` :1802-1890 and `removeStyle`; Text.tsx :88-90, Group.tsx :328, Image.tsx :52, Circle.tsx :387, Video.tsx :213 — the five that call `addPointerEventOutputs`; Text Input has the opacity rule, TextInput.tsx :118, but no Pointer Events inputs, so nothing patches it)
found: P107 NSP-016 s43, 2026-10-05
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.8 (the Text's 10,000 run, seed 20731, shrunk to 3 steps; isolated with the side-by-side probe)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "row C79 — drawn at Opacity 0 a press meets nothing; after Pointer Events Enabled is written on, the invisible element still takes no pointer" (and its four twins, on the Shape, Image and Group too)
---

**What a person sees.** A Text faded out to Opacity 0 is meant to let clicks pass through to whatever is behind it
(Text.tsx :88-90 sets `pointer-events: none`, and the Click Bubbling description promises "an element at zero opacity
takes no pointer events at all"). If Pointer Events Enabled is then written (any value but false), or Pointer Events Mode
is set, the invisible Text starts catching presses, clicks and touches. The things behind it stop responding, and nothing
on the screen shows why.

**Where.** `setStyle` writes Pointer Events (and `removeStyle` clears it) directly on the DOM element, bypassing React
(:1802-1890 — only opacity transitions, margins, position and transforms force a render). React writes a style key only
when its OWN rendered value changes. The component computed `none` at the render that drew Opacity 0, and computes `none`
again at every later render, so React never writes it back over the direct `auto` (or `''`).

**Reproduce.** A Text placed with Opacity 0 (a parameter). Settle. Write Pointer Events Enabled `true` (or `[]`, or set
Pointer Events Mode to `inherit`). Press: Pointer Down fires. Measured on the runtime target (the real component in
jsdom, which diffs styles as React does in a browser): cases b and c of the s43 probe.

**Wider than s43 wrote (s44, measured, 22 cases side by side).** It is not only an Opacity set as a parameter. Once React
has rendered `none` — Opacity 0 at any frame, or Pointer Events Enabled off — a Pointer Events write in ANY LATER frame
is a patch React never writes back, and the invisible Text takes the pointer (scenario "Opacity 0 written later renders
none; Enabled written in a LATER frame …"). Only a write in the SAME frame as the opacity change is safe: that frame's
render comes after the patch. Whether a later render repairs it depends on what React last rendered, so the same
sequence can go either way:
- Text, Tag, Class Name, Data Attributes, Text Style, Width, Height, the four margins, Size Mode, Align X / Y, Block
  Pointer Events and Click Bubbling ask for a render (measured one by one). One of them written between an Enabled-on
  patch and a later Opacity 0 makes React's own value `auto`, and Opacity 0's render then writes `none`: no pointer.
  Without one, Pointer Down. A Mounted that changes asks too (its parent's render); Mounted written its own value does
  not (:2285).
- The opacity check compares the ELEMENT's stored opacity (`style.opacity === '0'`), not the value written: after
  Opacity -1 (stored clamped as `'0'`) a later 0 crosses nothing and asks for no render.

The Text's spec does NOT copy this (version 3, NSP-016 §7.9; R11: a spec says what a person gets, not a renderer's mechanics):
it says an element at Opacity 0 takes no pointer. This row is a known row on the runtime target (`invisibleTakesPointer`), carried by four
row scenarios and counted in every generated run.

**s50 (2026-10-06): a file dragged from the desktop is caught too.** The browser hit-tests a drag the same way, so the
invisible Text that catches clicks also lights up as a file drop zone (Is Dragging Over true) and takes the drop (Files
Dropped). Measured on the runtime target with the Text v4's file acts: the fifth row scenario, "row C79 — a file drag at
Opacity 0 written after Pointer Events" (Pointer Events Enabled off at placing, then on and Opacity 0 in one frame, then a
file drag). The matcher now also counts the file drop's signals, Is Dragging Over going true and the dropped file's values.
The same fix covers it.

**s51 (2026-10-06): a drag is caught too.** The invisible Text takes the press that starts its own drag, so a mouse move
then lifts it (Is Lifted, Picked Up). Found by the runtime's 10,000 run (seed 20732, sequence 5059: Opacity 0 and Pointer
Events Enabled `-1` as parameters, then a press and a move). The matcher now also counts a drag starting (Is Lifted true,
Picked Up) and the element lighting as a card's drop zone (Drag Over true).

**Proposed fix (small).** Leave `pointerEvents` to the render. Have the two Pointer Events setters force an update (as
the opacity transition already does) instead of patching the DOM, so the component's opacity rule always has the last
word.
