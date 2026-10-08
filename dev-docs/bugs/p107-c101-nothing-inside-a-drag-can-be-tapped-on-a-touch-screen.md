---
id: P107-C101
title: On a touch screen nothing inside a Drag can be tapped — its buttons never click and its text fields never take the keyboard
status: fixed
commit: 534203afc
phase: P109
task: ISL-048
severity: high
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `render` — `<Draggable>` with no `allowMobileScroll` and no `cancel`; react-draggable 4.5.0 DraggableCore.js `handleDragStart`: `if (e.type === 'touchstart' && !this.props.allowMobileScroll) e.preventDefault()`)
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; jsdom probe on the real Drag component — a `touchstart` on a `<button>` inside the Drag's child comes back `defaultPrevented: true` (a `mousedown` there does not); headless Chrome 154 with touch emulation and `Input.dispatchTouchEvent` — inside a box whose `touchstart` is cancelled, a tap on a button fires no `click` and a tap on an `<input>` does not focus it; in an identical box beside it whose `touchstart` is not cancelled, both work
regression: packages/noodl-viewer-react/tests/isl048-c101-a-tap-inside-a-drag.test.tsx
---

**What a person sees.** On a phone or a tablet, any button, checkbox or text field placed inside a Drag does nothing when tapped.
The Site Builder template's `/Admin/SectionRow` wraps its whole row in a Drag (Axis Y, Constrain to parent off) so a section can
be dragged to reorder it — and that row holds the section's Move up / Move down, Save, Delete, Pick image and Remove image buttons
and its Heading, Body, Link label and Link target fields. On a touch screen none of them answers a tap, so a section cannot be
edited, saved or deleted from a tablet. With a mouse they all work.

**Where.** `react-draggable` listens for `touchstart` on the dragged element (its child's root) and calls `preventDefault()` on
every one unless `allowMobileScroll` is set. A browser that sees a cancelled `touchstart` sends no compatibility mouse events and
no `click` for that touch, and so also never runs the focusing steps (Touch Events spec; measured in Chrome above). The touch
starts on the button or field, bubbles to the dragged element, and is cancelled there.

**How to reproduce.** Open the Site Builder template's admin page in Chrome's device toolbar (touch on), add a section and tap
its Save or one of its fields. Or: the two probes in §7.16.

**Proposed fix.** Pass a `cancel` selector to `<Draggable>` so a press on an interactive element inside does not start a drag
(`cancel="input, textarea, select, button, [contenteditable], a"` — the library then never reaches the `preventDefault`), and
consider `allowMobileScroll`. Small: one prop in Drag.tsx and a jsdom regression that a `touchstart` on a button inside is not
`defaultPrevented`. Check that a drag started on the row's background still works on touch.
