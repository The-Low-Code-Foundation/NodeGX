---
id: P107-D30
title: Focused (and Hover, Pressed) stay as they were after a control leaves the page with Mounted off — the element that comes back holds no keyboard while Focused still reads true
status: needs-ruling
severity: medium
area: runtime / every control with the shared control states (Button, Checkbox, Radio Button, Dropdown, Slider, Text Input)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row D30); scenario "focused, then Mounted off and on" in packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json and …checkbox.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json "focused, then Mounted off and on: Focused still reads true while the element that came back holds no keyboard — a Focus action takes it again and fires Focused; a Tab away then fires Blurred"
---

A control that holds the keyboard and is taken off the page (Mounted off) keeps saying **Focused: true**. The
browser fires no blur for an element that is removed (the focus fixup rule moves focus silently), and nothing in the
node resets `outputPropValues.focusState` at unmount — `componentWillUnmount` resets only the VISUAL states
(react-component-node.ts :1000-1003). When Mounted comes back on, the element is a new one and holds no keyboard,
while the Focused output still reads true; a Focus action then takes the keyboard and fires **Focused** a second time
without a **Blurred** in between. Hover and Pressed behave the same way (the pointer is no longer over an element that
is gone).

**Where:** `packages/noodl-viewer-react/src/nodes/controls/utils.ts` :157-168 (`focusState` written only by the
element's own focus / blur events); `react-component-node.ts` :993-1003 (`componentWillUnmount`).

**Reproduce:** the scenario named above: Tab onto a Button, Mounted off, Mounted on, Focus → Focused fires again with
Focused still true throughout; Blurred never fired.

**Proposed fix (for a ruling):** at unmount, drop the three states and tell the wire — `focusState` / `hoverState` /
`pressedState` to false, with `onBlur` / `hoverEnd` when they were true — so the outputs describe the page. The spec
models today's behaviour (the element's own focus is tracked beside the node's reported one).
