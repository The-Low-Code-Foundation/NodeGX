---
id: P107-D34
title: A Dropdown fires Changed with nobody picking — a remount, or Items written again after a person's pick, takes the author's Value back and announces it as a change
status: needs-ruling
severity: medium
area: runtime / Dropdown (components/controls/Select/Select.tsx, nodes/controls/options.ts)
found: P107 NSP-016 s39, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.4 (row D34); scenarios "Items written with the current Value absent …" and "a pick, then Mounted off and on …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "a pick, then Mounted off and on: Will Unmount; Did Mount, and the fresh component's mount effect takes the author's Value back — Value 'Option 1' sent and Changed fires"
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
