---
id: P107-C72
title: A Text Input's Clear, Backspace and frame-end writes convert with the Type, and measure room with the Max length, the component LAST RENDERED — a Type turned Number with a Clear in the same frame publishes '' where the next frame says null
status: fixed
commit: 580ce9e27
phase: P109
task: ISL-031
severity: low
area: runtime / Text Input (components/controls/TextInput/TextInput.tsx `setText` :94, `edit` :346)
found: P107 NSP-016 s40, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.5 (row C72); the 10,000-sequence runtime deep run (TEXT-INPUT-DEEP-RUN-2026-10-04.md, seeds 3832506663 and 955539596), replayed side by side on both targets (s40 zz probe, cases D6, D10)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a write converts with the Type as it stands: Type Number and Clear in one frame publish null (the Number field's empty), Done; a Clear in the next frame is Unchanged; a Backspace on a field holding '3' in the frame Type turns Number publishes null — the runtime converts with the Type it last drew ('' twice: row C72)"
---

`TextInput.setText` converts the text it publishes with `this.props.type` (TextInput.tsx :94) and `edit` measures an Insert
Text's room with `this.props.maxLength` (:346). Both are the props React handed the component at its LAST render. The
node writes `props.type` / `props.maxLength` as the inputs arrive, but the component sees them only when the holder
re-renders it at the frame's end (react-component-node.ts `render` copies the node's props). So an action that writes
through the component in the frame a Type or Max length change arrives uses the old value:

- Type `number` and Clear in one frame: Value publishes `''` (the Text empty), not `null` (the Number empty). A second
  Clear next frame finds the output not empty and publishes `null`, Done again.
- A field holding `'3'`, Type `number` and Backspace in one frame: Value publishes `''`, not `null`.
- Max length 2 written with an Insert Text `xy` in one frame onto `abcd`: the Insert goes through (room measured with no
  limit); the next frame's Insert finds no room.

A write at the frame's END (a queued Set or Insert Text) is the same: the node's after-inputs callbacks run before the
holder's render (nodecontext.ts), so the component still holds the old props when the Set converts.

The off-page paths are consistent (text-input.ts :480, :535 read the node's own `props.type`), and a person's typing
is converted after the act's paint, so only the graph's same-frame writes see this. The spec models it as `shownType` /
`shownMaxLength` (synced at each paint).

**Proposed fix:** have the node hand the component its live props for the two reads — `this.props.noodlNode.props.type`
(and `.maxLength`) in `setText` / `edit` / `componentDidMount` — or convert in the node (`onTextChanged`'s callback) with
the node's `props.type`, which is current. Small; the C69 family (the component reads React's last commit, here its
props rather than its state).


## Ruled 2026-10-05 (R12, NSP-023): the Type and Max length as they stand

Ruled with C69 ("each sees the last"): a write converts with the Type, and measures an Insert Text's room with the Max length, as they
stand when it runs. The Text Input spec v2 states it (no `shownType` / `shownMaxLength`); the runtime's behaviour is a **known row on the
runtime target only** (`staleProps`, conformance.test.ts), carried by two row scenarios. The proposed fix above stands.

**Fixed 580ce9e27 (P109 ISL-031, 2026-10-06), as ruled.** setText and edit read the Type and Max length from the node's props, which change as each input arrives. Known row gone; two scenarios unmarked. Control: red on exactly those two.
