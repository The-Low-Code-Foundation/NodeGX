---
id: P107-C71
title: A Dropdown's Value written back to the value React last rendered, after a person's pick, changes the output but not the selection shown — picking the shown option again then raises nothing
status: fixed
commit: 5d40a7aa3
phase: P109
task: ISL-031
severity: medium
area: runtime / Dropdown (components/controls/Select/Select.tsx, nodes/controls/options.ts)
found: P107 NSP-016 s39, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.4 (row C71); scenario "a pick, then Value written back to what the author set before the pick" in packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json (marked row); probes Pa / Pb in §7.4
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "a pick, then Value written back to what the author set before the pick: Value sent, no Changed, and the selection follows on the interpreter — on the runtime the component's effect keys on the author's Value React last rendered, which this write did not change, so the pick stays selected and picking it again raises nothing"
---

The Dropdown's `Select` component keeps the selection in its own state and follows the node through an effect keyed
on `props.value` and `props.items` (Select.tsx :42-47). A person's pick writes the component's state and the node's
value (`valueChanged`, options.ts :109-116) but never `props.value`. The **Value** input writes `props.value` on every
call (:194) but re-renders only when the node's value changed (:196-199). Two consequences, both measured on the
runtime target:

- Pick 'Option 2' on a Dropdown whose Value is 'Option 1', then write Value 'Option 1': the node's value moves back
  (Value is sent) but `props.value` is 'Option 1' as at the last render, so the effect does not run and the `<select>`
  and the span keep 'Option 2'. The person sees Option 2, the graph says Option 1; picking Option 2 again raises no
  `change` (it is the selected option) and nothing moves.
- Placed on 'Option 2', pick 'Option 1', write Value 'Option 1' (no change: no render — the write never reaches the
  effect's comparison), then write Value 'Option 2': React last rendered 'Option 2', so again the effect does not run
  and the screen keeps 'Option 1' while the output says 'Option 2' — even with a frame between the two writes
  (probe Pa: `el.value "Option 1"`, span "Option 1", output 'Option 2').

**Where:** `Select.tsx` :44-47 (`useEffect(() => { setValue(props.value); props.valueChanged(props.value) }, [props.value,
props.items])`); `options.ts` :193-199 (`forceUpdate` only on a change of `_internal.value`). The same family as C67
(the Checkbox's effect keyed on React's last-rendered `props.checked`).

**Reproduce:** the scenario named above on the runtime target.

**Proposed fix:** have the pick write `props.value` too (as FB-020 did for the Checkbox's `checkedChanged`), and make
the Value setter `forceUpdate()` whenever `props.value` changed, not only `_internal.value` — then the effect's
comparison always sees the last write. The spec says the selection follows every Value write that changes the node's
value; the runner knows the row (`pickWriteBackPick`).

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it now".** Every Value from the app moves the selection, including one equal to an earlier write, so a Reset works after a pick. Small change in the Dropdown's two files. The question as asked: *"Should the running Dropdown follow your last-word rule now?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**s47 (2026-10-06):** the Dropdown v3 (NSP-023 §8.5) keeps this row unchanged (`pickWriteBackPick`). The spec now drops the
author's Value and the component's copy of the choice: the node's value is what the element is told to select. The
D34 twins avoid this row the same way the fix would. Once `props.value` follows every Value write, the effect sees the
write back.

**Fixed 5d40a7aa3 (P109 ISL-031, 2026-10-06), as ruled.** The node counts every write of its value (`props.valueWrites`) and the component's effect is keyed on it. Control: without the counter, red on exactly this scenario.
