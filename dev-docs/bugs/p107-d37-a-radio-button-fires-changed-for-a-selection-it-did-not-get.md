---
id: P107-D37
title: A Radio Button fires Changed when its Checked moves for any reason while its group's last selection was a person's — a sibling carrying the same Value picked, its own Value written in the frame of a pick, a remount after a pick
status: fixed
commit: 8dbeb8f33
phase: P109
task: ISL-031
severity: medium
area: runtime / Radio Button (components/controls/RadioButton/RadioButton.tsx, nodes/controls/radiobutton.ts) and Radio Button Group (components/controls/RadioButtonGroup/RadioButtonGroup.tsx)
found: P107 NSP-016 s42, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.7 (row D37); scenarios "row D37 — …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.radiobutton.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.radiobutton.json "a sibling carrying THIS button's Value picked: both are selected — Checked true and no Changed (the person clicked the other); the other sibling picked: this one loses the selection to that click — Checked false and Changed"
---

The Radio Button's **Changed** says "Fires when the user selects or deselects this button". The button learns whether a
person did it from its GROUP: the context's `selectionFromUser` (RadioButtonGroup.tsx :21-30), read in the button's effect
whenever its rendered `checked` changes (RadioButton.tsx :78-84 → radiobutton.ts :39-55 `if (fromUser) sendSignalOnOutput`).
The flag describes the group's last SELECTION, not this button's change, so Changed fires for any change of Checked while it
is set. Measured on the runtime target (the spec models it; both targets agree):

- **A sibling carrying the same Value.** Two buttons with Value 'a'; the person clicks the other one. Both are selected
  (`selected === props.value` compares Values, not buttons) and BOTH fire Changed.
- **Its own Value written in the frame of a pick.** The person clicks this button (Checked true, Changed); in the same frame
  the graph writes this button's Value to something else. At the frame's end React renders the button with the new Value
  against the click's selection — the button's effect runs before the group's (a child's effects run first), while the flag
  is still the click's — so Checked false AND Changed: nobody deselected it.
- **A remount** (Mounted off and on) while the selection is still a person's — after a pick of the button the group's Value
  already held (row C76's state, where the group's effect never runs to clear the flag): the effect at the mount reports the
  selection with Changed.

The Dropdown's D34 and the Slider's D36 are the same shape: an effect that reports "a person did this" from state that says
something else.

**Where:** RadioButtonGroup.tsx :21-30 (the flag lives on the selection); RadioButton.tsx :78-84 (the effect reads it for
any change of `checked`).

**Reproduce:** the "row D37" scenarios on the runtime target (`NSP_ONLY='net.noodl.controls.radiobutton'`).

**Proposed fix:** fire the button's Changed from the click itself (the radio's `onChange`, which only the person reaches),
not from the effect; keep the effect for Checked. A sibling's click then deselects this button with Checked false and
Changed — the description's "deselects" — only when the button actually lost the selection, which the effect can still
report with the flag the click handler sets for one render.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fire from the click".** Changed comes from the person's click, and a button that loses the selection to that click reports the deselect. Small to medium change in the button's and the group's files. Two buttons with the same Value would still both show as selected. The question as asked: *"Should a Radio Button's Changed fire only when a person's click selects it or takes the selection away from it?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**s47 (2026-10-06): the spec states the ruled intent (NSP-023 §8.6, the Radio Button v2), and the runtime keeps this as a
known row** (`changedWithNobodyClicking`: the runtime fires a Changed the spec does not). Changed now comes from this button's
own click, and from a loss of the selection to a sibling's click while the button is on the page. A Checked that moves for any
other reason (a same-Value sibling, its own Value written, the group's Value from the graph, a remount) is sent without
Changed. One case the ruling does not name, a button off the page when a sibling's click takes its selection, shows the
group's choice when it comes back, with no Changed. That reading comes from this file's remount case and from the runtime's
own behaviour in that case; it is open to Richard (README §7 R15). Four row scenarios carry the row. 89 v1 scenarios that
graded the group's flag and React's effect order were dropped (NSP-023 §8.6).

**Fixed 8dbeb8f33 (P109 ISL-031, 2026-10-06), as ruled.** The group's selection carries the click that made it (`RadioClick`: a number, the clicked button's id, the selection it took over); each button reports a click once — Changed on the button clicked and on the one that lost the selection to it, nothing for a same-Value sibling, a Value write or a remount. Control: HEAD's radio files red on exactly the nine C76 / D37 scenarios.
