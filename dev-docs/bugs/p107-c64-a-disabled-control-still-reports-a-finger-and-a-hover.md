---
id: P107-C64
title: A disabled control still reports Pressed, Pointer Down and Pointer Up for a finger, and Hover for the pointer — Enabled promises it "ignores clicks, touches and typing"
status: fixed
commit: d8a9f0069
phase: P109
task: ISL-031
severity: medium
area: runtime / every control with the shared control states (controls/utils.ts)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C64); scenario "a finger lands on a disabled button and lifts" in packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json "a finger lands on a disabled button and lifts: nothing — no Pressed, no Pointer Down or Pointer Up (C64: a finger on a disabled control reports nothing, as Enabled promises)"
---

With Enabled off, a Button (and every control sharing `addControlEventsAndStates`) still fires **Pointer Down** and
**Pointer Up** and moves **Pressed** when a finger lands on it and lifts, and still moves **Hover** and fires **Hover
Start / Hover End** when the pointer crosses it. Enabled's description says the control "ignores clicks, touches and
typing". A mouse press, release and click ARE ignored — the browser dispatches none of those to a disabled form
control and React drops them — but the browser delivers touch and hover events to a disabled element, and the
handlers (utils.ts :216-243, :260-275, :294-311) never read `enabled`.

**Where:** `packages/noodl-viewer-react/src/nodes/controls/utils.ts` — the `onTouchStart` / `onTouchEnd` /
`onTouchCancel` / `onMouseOver` / `onMouseLeave` handlers of `pressedState`, `pointerDown`, `pointerUp`, `hoverState`,
`hoverStart`, `hoverEnd`. `_updateVisualState` (:124-137) already ignores hover and pressed while disabled — only the
visual side was gated.

**Reproduce:** the scenario named above on the runtime target (a `touchstart` then `touchend` on a disabled Button).

**Proposed fix (for a ruling):** gate the five handlers on `this._internal.enabled` as the visual state already is;
or narrow the description to what the control does ignore. The spec models today's behaviour.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Ignore touches, keep hover".** A finger on a disabled control reports nothing, exactly as the description promises. Hover still reports, so a tooltip that explains why a button is disabled keeps working. Small change in one shared file, felt by every control. The question as asked: *"When Enabled is off, which pointer outputs should the control stop reporting?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed d8a9f0069 (P109 ISL-031, 2026-10-07), as ruled.** The shared touch handlers (utils.ts: Pressed's onTouchStart / onTouchEnd / onTouchCancel, Pointer Down's onTouchStart, Pointer Up's onTouchEnd / onTouchCancel) return at once on a disabled control; hover is untouched. A finger held while Enabled turns off is not released by its lift, as a mouse button held across it is not. Specs: Button v2, Checkbox v3, Radio Button v3, Dropdown v5, Slider v4, Text Input v5 (whose wrapped handler still drains). Control: HEAD's utils.ts red on exactly the 30 scenarios the new versions change. A peer's runtime batch at seed 13 (P107 s53) graded the six green independently.
