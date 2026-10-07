---
id: P107-D36
title: A Slider fires Changed with nobody sliding — a Value written from the graph, a Min or Max that clamps the value, a remount after a slide, and a slider placed with Min equal to Max
status: fixed
commit: 21b27462d
phase: P109
task: ISL-031
severity: medium
area: runtime / Slider (components/controls/Slider/Slider.tsx, nodes/controls/slider.ts)
found: P107 NSP-016 s41, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.6 (row D36); scenarios "Value from the graph …", "placed with Min 10 …", "a slide to 30, then Mounted off and on …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "Value from the graph: Value and Value Percent sent at the frame's end, and Changed does NOT fire"
---

The **Value** input's description: "Moves the handle to this value, clamped to Min and Max; changing it from the graph
does not fire Changed". **Changed**'s: "Fires when the user moves the handle; a value arriving on the Value input does
not fire it". Both are wrong today. The node never reports a graph write itself: `_setInputValue` (slider.ts :237-271)
writes `props.value` and re-renders, and the `Slider` component's effect (Slider.tsx :88-90, keyed on `props.value`)
calls `updateOutputValue(props.value)` — the same function a person's slide calls, which fires **Changed** on any
difference (slider.ts :39-54). Measured on the runtime target, every one of these fires Changed with nobody touching
the slider:

- a Value written from the graph (40 on a slider at 0: Value 40, Value Percent 40, Changed);
- Min raised above the value, or Max lowered below it (the re-clamp in their `onChange`, :105-126, re-renders);
- placed with Min 10: the author's Value is clamped to 10 before the first paint and the mount's effect announces it;
- a slide to 30, then Mounted off and on: the fresh component's mount effect takes the author's Value (0) back and
  announces it;
- Min equal to Max: Value Percent is `NaN`, and `NaN !== NaN`, so every report fires Changed (row C75).

A Slider fed from a stored setting fires Changed at every load; a Slider wired to save on Changed writes back what it
was just given.

**Where:** `Slider.tsx` :88-95 (the effect and `onValueChanged`); `slider.ts` :39-54 (`updateOutputValue` fires on any
difference, slide or not).

**Proposed fix (for a ruling):** the effect should reconcile without announcing — a second entry point
(`syncOutputValue`) that sends Value and Value Percent but never Changed, called from the effect; the `<input>`'s
`onChange` keeps `updateOutputValue`. The Dropdown's D34 is the same shape and wants the same fix. The spec models
today's behaviour.

**s46 (2026-10-05, NSP-023 step 3 — the Slider v2): the INTENT is ruled; the app fix is still to ask.** The description already
said a Value from the graph does not fire Changed; Richard ruled the remount (R14, "Where the person left it"): a Slider hidden
with Mounted and shown again is where the person left it and fires nothing. The spec (v2) now says both — the graph's word reaches
the handle at the next paint and is reported without Changed; a remount leaves the handle alone — and this is a known row on the
runtime target (`changedWithNobodySliding` in `packages/noodl-runtime/test/node-spec/conformance.test.ts`: the runtime fires a
Changed the spec does not, or re-reports the author's Value at a remount). Row scenarios: "Value from the graph …", "a slide to 30,
then Mounted off and on …", the D36 matrix (440 segments) and the act-paint matrix in the scenario file. The proposed fix above
(a second entry point that syncs without announcing, called from the effect; the remount keeping `_internal.outputValue`) is the
question left.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it now".** Writes from the app move the handle and report Value without Changed, and a hidden Slider keeps its place. Small to medium change in two files. An app that relied on Changed firing at load stops getting it. The question as asked: *"Should the running Slider follow the description and your ruling now?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 21b27462d (P109 ISL-031, 2026-10-07), as ruled.** The component draws the graph's word through a second entry point (`takeGraphValue`) that reports Value and Value Percent without Changed; the node keeps the handle (`props.handle`), so a remounted component starts where the person left it. A slide still reports through `updateOutputValue`, with Changed. Known row D36 dropped with its predicate; its row scenarios lost their marks. Control: HEAD's Slider files red on exactly the 30 formerly marked scenarios.
