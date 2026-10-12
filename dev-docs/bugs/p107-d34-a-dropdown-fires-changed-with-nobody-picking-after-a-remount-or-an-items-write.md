---
id: P107-D34
title: A Dropdown fires Changed with nobody picking — a remount, or Items written again after a person's pick, takes the author's Value back and announces it as a change
status: fixed
commit: 5d40a7aa3
phase: P109
task: ISL-031
severity: medium
area: runtime / Dropdown (components/controls/Select/Select.tsx, nodes/controls/options.ts)
found: P107 NSP-016 s39, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.4 (row D34); scenarios "Items written with the current Value absent …" and "a pick, then Mounted off and on …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "a pick, then Mounted off and on: Will Unmount; Did Mount, and the dropdown is where the person left it — nothing on the wire; a pick of the same option raises only Focused (the element that came back did not hold the keyboard)"
---

**Changed**'s description: "Fires when the user picks a different option; a value arriving on the Value input does not
fire it". It also fires when nobody picked anything: the `Select` component's effect (Select.tsx :44-47) runs at the
mount and whenever the Items ARRAY is a new one, and ends with `props.valueChanged(props.value)` — the author's Value.
After a person's pick the node holds the pick, so `valueChanged` finds a difference (options.ts :110-115), sends
**Value** back to the author's and fires **Changed**:

- a pick, then Mounted off and on: Did Mount, Value back to the author's, Changed;
- a pick, then Items written again (a query refreshing its rows, a new array each time): Value back, Changed — and the
  pick is lost on the screen too, since the effect sets the shown value to the author's.

A Dropdown fed by a live list cannot keep a person's choice across a refresh, and whatever is wired to Changed runs as
if the person had chosen.

**Where:** `Select.tsx` :44-47; `options.ts` :107-116 (`valueChanged` fires on any difference, pick or not).

**Proposed fix (for a ruling):** the effect should reconcile without announcing — write the author's Value into the
component and the node silently (as the Value input does), or key the reset on a REAL change of `props.value` only
and leave a new Items array to re-render the options around the current value. Either way Changed means the person
did it, as the description says. The spec models today's behaviour (the mount's and the array's announce), as the
Text Input's D31 does for Set.

**s46 (2026-10-05): the INTENT is ruled (R14), for NSP-023 step 4.** A Dropdown hidden with Mounted and shown again keeps the
person's pick and fires nothing ("Where the person left it"); handed its Items again — a fresh list still holding the pick — it
keeps the pick and fires nothing ("The pick stays"). The Dropdown v2 (step 4) states it; this becomes a runtime-only row then.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it now".** The pick survives hiding and a refreshed list, and Changed fires only for a person's pick. Small to medium change in the Dropdown's two files. An app that relied on Changed firing at load stops getting it. The question as asked: *"Should the running Dropdown follow your ruling now?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**s47 (2026-10-06): the spec states the intent (NSP-023 §8.5, the Dropdown v3), and the runtime keeps this as a known row**
(`changedWithNobodyPicking` in `packages/noodl-runtime/test/node-spec/conformance.test.ts`). Six row scenarios carry it.
Three remount after a pick ("a pick, then Mounted off and on …", "Mounted off after a pick …", and one with a Tab in the
remount frame). Three write Items after a pick (one with a Tab, one with a mouse press, and "Items written with the current
Value absent …", whose v2 name claimed a pick that never happened). Each has a twin that the runtime passes, in which the
graph writes Value equal to the pick in the frame after it. The runtime's `props.value` then names the pick, so neither a
remount nor a new list takes anything back. That is also the shape of the fix: the component reads the node's value and
keeps no copy of its own. **When the app is fixed (ISL-031), the six stop diverging:** remove their `row` field (a row
scenario that passes turns the "known rows" test red), drop the twins, and close the row.

**Fixed 5d40a7aa3 (P109 ISL-031, 2026-10-06), as ruled.** A pick writes `props.value` as well as `_internal.value`, so the node holds one value and a remount or a new Items list re-reads the pick; nothing is announced. The six row scenarios lost their marks and their six twins were dropped, as this file asked. Control: HEAD's Dropdown red on exactly the seven C71 / D34 scenarios.
