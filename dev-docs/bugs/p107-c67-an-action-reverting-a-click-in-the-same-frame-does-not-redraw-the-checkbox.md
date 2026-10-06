---
id: P107-C67
title: A Check or Uncheck that reverts a person's click in the same frame does not redraw the Checkbox — the box stays as the click left it and the next click reports the opposite of what the node holds
status: fixed
commit: b07b2a5a4
phase: P109
task: ISL-031
severity: medium
area: runtime / Checkbox (components/controls/Checkbox/Checkbox.tsx, nodes/controls/checkbox.ts)
found: P107 NSP-016 s37, 2026-10-04 (the Checkbox's 10,000-sequence run on the runtime)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C67); shrunk sequences 3966471586, 188133591, 3466342440 at seed 20729
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.checkbox.json "a click, an Uncheck and a click in one frame: the box ends ticked, Changed twice — the second click meets a box the Uncheck untick-ed"
---

A person clicks the box (it ticks; `checkedChanged(true)` writes `props.checked = true` and the node's state), and in the
same frame a graph pulse **Uncheck** reverts the node (`props.checked = false`, Done, `forceUpdate`). The box is still drawn
TICKED: the component's `useEffect(() => setChecked(!!props.checked), [props.checked])` keys on React's last-rendered
`props.checked`, which was `false` before the click (the click updated the node's props but React never re-rendered with
`true`), so the frame-end render sees `false → false` and leaves the component's local state at `true`. The next click
unticks the drawn box and `checkedChanged(false)` finds the node already false: no Changed, no Checked — the person's click
did the opposite of what they saw. The same with Check after an untick, and with the Checked input written in that frame.

**Where:** `Checkbox.tsx` :35-41 (the effect keyed on `props.checked`); `checkbox.ts` :34-52 (`checkedChanged` writes the
prop without a re-render — FB-020's fix, which closed the remount case and left this one).

**Reproduce:** `[{ "act": "click" }, { "signal": "uncheck" }, { "act": "click" }, "settle"]` on the runtime target: the
spec (and the person) expects Checked true and Changed from the second click; the runtime sends neither.

**Proposed fix:** make the component read the node's value, not React's last render — `checkedChanged` calling `forceUpdate`
so the click's `true` is rendered, or the effect keyed on a counter the node bumps on every write. The spec models today's
behaviour as a known row.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Draw the last word".** The box always shows what the node holds, so an app can refuse or undo a tick and the person sees it. Small change in the Checkbox's two files. The question as asked: *"Should the Checkbox always draw what the app last set, even straight after a click?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed b07b2a5a4 (P109 ISL-031, 2026-10-06), as ruled.** The node counts every write of Checked (`props.checkedWrites`: a click, the Checked input, Check, Uncheck) and the component's effect is keyed on it as well as `props.checked`, so each paint draws the node's value. Control: HEAD's Checkbox red on exactly that scenario.
