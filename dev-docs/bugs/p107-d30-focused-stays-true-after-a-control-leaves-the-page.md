---
id: P107-D30
title: Focused (and Hover, Pressed) stay as they were after a control leaves the page with Mounted off — the element that comes back holds no keyboard while Focused still reads true
status: fixed
commit: 32e1856b0
phase: P109
task: ISL-031
severity: medium
area: runtime / every control with the shared control states (Button, Checkbox, Radio Button, Dropdown, Slider, Text Input)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row D30); scenario "focused, then Mounted off and on" in packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json and …checkbox.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.button.json "focused, then Mounted off and on: the leaving takes the keyboard and Focused with it — Will Unmount, Focused false and Blurred (D30); Did Mount; a Focus action puts the keyboard on the element that came back and fires Focused; a Tab away then fires Blurred"
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

**Also measured on Text Input (P107 NSP-016 s38, 2026-10-04):** the same, through its own Focus / Blur (text-input.ts
:288-320) — scenario "focused, then Mounted off and on" in `packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json`;
and twice more where the element is REBUILT in place: Enable Label changing (TextInput.tsx :248-281) and Type changing
between Text Area and the rest (:192-223) each give a new element, the keyboard leaves with the old one and Focused
stays true (scenarios "focused, then Enable Label turned on" and "focused, then Type changed to Text Area").

**Also measured on Dropdown (P107 NSP-016 s39, 2026-10-04):** the same through the shared Focus / Blur (utils.ts
:366-440) — scenarios "focused, then Mounted off and on" and "focused, then Enable Label turned on" in
`packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json`: Enable Label changing rebuilds the tree around a
new `<select>` (Select.tsx :223-252), the keyboard leaves with the old one and Focused stays true.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Reset and announce".** The outputs describe the page, and logic waiting for Blurred runs. Small change in shared code, felt by every control. An app that validates or saves on Blurred will now also do so when the field is hidden. The question as asked: *"When a control leaves the page, should Focused, Hover and Pressed go false, with Blurred and Hover End fired if they were on?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 32e1856b0 (P109 ISL-031, built s27 on `p109-d30`, landed s28 2026-10-07).** A control leaving the page takes Focused, Hover and Pressed with it: Blurred and Hover End fire for the ones that were on (`controls/utils.ts`, `react-component-node.ts`); the six control specs moved with it. Re-graded on the rebased branch (over P107's Group v2, ISL-038 and ISL-013) before landing by fast-forward: the six controls conform on the runtime at seed 13 (200 sequences, 0 divergences) and on the interpreter (visual batch 13 / 13); stranger rounds 1–4, catalog parity, schema, pilot, page model, plants and world 483 passed; viewer 1807 / 1807; viewer and spec tsc 0; the four catalog and docs checks clean. s27's control (HEAD's files red on exactly the changed scenarios) was taken before the rebase.
