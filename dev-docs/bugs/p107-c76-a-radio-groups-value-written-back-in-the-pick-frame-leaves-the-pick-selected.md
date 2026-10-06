---
id: P107-C76
title: A Radio Button Group's Value written back in the same frame as a person's pick leaves the picked button selected under a Value that names another — picking it again raises nothing, and picking the named one raises no Changed
status: fixed
commit: 8dbeb8f33
phase: P109
task: ISL-031
severity: medium
area: runtime / Radio Button Group (components/controls/RadioButtonGroup/RadioButtonGroup.tsx, nodes/controls/radiobuttongroup.ts)
found: P107 NSP-016 s42, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.7 (row C76); the two "row C76" scenarios in packages/nodegx-node-spec/scenarios/Radio Button Group.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Radio Button Group.json "a pick of 'a', then Value written back to 'b' in the same frame: Changed for the pick, and the Value back at 'b' — the buttons show what the Value says, so picking 'a' again sends it with Changed"
---

The group's component keeps the selection in its own state (`useState`, RadioButtonGroup.tsx :21) and follows the node
through an effect keyed on `props.value` (:37-39). A person's pick selects the button at once (`setSelection`, :27-30)
and calls the node's `valueChanged`, which writes `props.value` and asks for a render at the frame's end
(radiobuttongroup.ts :20-29). But each render of the node hands React a fresh COPY of the props
(react-component-node.ts :1076-1103), and the component's own re-render after the pick reuses the copy of the last paint.
So the effect compares against the Value the last PAINT rendered, not the one the node holds.

Measured on the runtime target (the spec models it; both targets agree):

- Group on 'b'. A person picks 'a' (Value 'a' sent, Changed fires), and in the same frame the graph writes Value 'b'
  back (Value 'b' sent). At the frame's end the node renders with 'b' — the same as the last paint — so the effect does
  not run: button 'a' stays selected on the screen while the Value output says 'b'. Picking 'a' again raises nothing (it
  is the selected radio).
- From there, picking 'b' selects it on the screen but raises nothing: the node already holds 'b', so `valueChanged`
  sees no change — the person changed the selection and Changed did not fire.

A frame between the pick and the write-back hides it (the frame's end renders 'a', the effect runs, the write-back is a
change). A graph that resets a group from its own Changed handler in the same frame is the realistic trigger.

**Where:** RadioButtonGroup.tsx :21 and :37-39 (the selection copied into component state, synced by an effect on
`props.value`); radiobuttongroup.ts :20-29 (`valueChanged` writes `props.value` but the render waits for the frame end).
The same family as C71 (the Dropdown) and C67 (the Checkbox): a component's copy of a value, synced by an effect on what
React last rendered.

**Reproduce:** the two "row C76" scenarios on the runtime target (`NSP_ONLY='Radio Button Group'`).

**Proposed fix:** drop the component's copy: render the selection from `props.value` and keep the "from a person" flag
on the node (set by `valueChanged`, cleared by the Value input), so a write-back is a render like any other and the
buttons read the node's Value. The spec then loses `rendered` and `selected` and the two scenarios change their claim.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Show what Value says".** The buttons read the group's Value directly, so every write redraws them and the next pick fires Changed. Medium change in the group's two files; the group's description work loses two checks that model today's behaviour. The question as asked: *"Should the group always show the button its Value names, even after a write-back in the moment of a pick?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**s47 (2026-10-06): the spec states the ruled intent (NSP-023 §8.6, the Radio Button Group v2 and the Radio Button v2), and
the runtime keeps this as a known row.** The group's spec drops `rendered` and `selected`, so the selection is the node's
Value. The button's spec drops `gRendered` and `gSelected` and reads the group's Value. The matchers are
`groupPickWrittenBack` (the group) and `buttonPickWrittenBack` (a button, where the group's write arrives at an `advance`) in
`packages/noodl-runtime/test/node-spec/conformance.test.ts`. The group's row scenario has a twin with a frame between the pick
and the write-back, which both targets pass. **When the app is fixed (ISL-031)**, the four C76 row scenarios (one on the group,
three on the button) stop diverging: remove their `row` field and close the row.

**Fixed 8dbeb8f33 (P109 ISL-031, 2026-10-06), as ruled.** The group's node counts every write of its Value (`props.valueWrites`) and the group's effect is keyed on the count, so a write-back in a pick's frame is drawn. Control: without the counter, red on exactly the four C76 scenarios (group 1, button 3).
