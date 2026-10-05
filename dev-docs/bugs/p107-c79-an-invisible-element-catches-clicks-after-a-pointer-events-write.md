---
id: P107-C79
title: A Text at Opacity 0 catches clicks once Pointer Events Enabled or Pointer Events Mode is written after it was drawn — the style write goes straight to the DOM and the component's "opacity 0 takes no pointer" rule is never re-applied
status: open
severity: medium
area: runtime / every visual node with the opacity rule (react-component-node.ts `setStyle` :1802-1890 and `removeStyle`; Text.tsx :88-90, and the same rule in Group, Image, Circle, Text Input and Video)
found: P107 NSP-016 s43, 2026-10-05
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.8 (the Text's 10,000 run, seed 20731, shrunk to 3 steps; isolated with the side-by-side probe)
kit: node-spec
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
Pointer Events Mode to `inherit`). Press: Pointer Down fires. The same writes in the other order, or Opacity 0 written
after the first frame (the opacity change forces a render), take no pointer. Measured on the runtime target (the real
component in jsdom, which diffs styles as React does in a browser): cases b and c of the s43 probe.

**Proposed fix (small).** Leave `pointerEvents` to the render. Have the two Pointer Events setters force an update (as
the opacity transition already does) instead of patching the DOM, so the component's opacity rule always has the last
word.
