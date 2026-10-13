---
id: P107-S95-MINABOVEMAX
title: A Counter with Min Value above Max Value says nothing anywhere — and the spec format had no way to say it, so the "How this node works" modal could not either
status: fixed
severity: medium
area: runtime / Counter (`packages/noodl-runtime/src/nodes/std-library/counter.ts`); spec format (`packages/nodegx-node-spec/src/spec.ts` `diagnostics`, `trace.ts` `diagnostic`); the runtime target (`packages/noodl-runtime/test/helpers/node-spec-target.ts`, which had no editor)
found: P107 s95, 2026-10-12 — Richard driving the R33 modal (NSP-019 AC3): Start 2, Min 3, Max 1, Limits Enabled off, Increase counted to 3 and nothing said the settings were wrong
evidence: `git grep "setDiagnostic(" packages/noodl-runtime/src packages/noodl-viewer-react/src` — 9 call sites besides the base class's (Date Add, Date Difference, Text Input, the controls' shared helper, For Each, States, Group, Icon, layout), Counter not among them; DIAGNOSTICS-CONTRACT.md's table already says "two of this node's settings contradict each other → diagnostic"; Date Add's spec said its diagnostic was "not on the wire, so not in the trace"; the runtime target's editor connection answered `isRunningLocally()` false, so `setDiagnostic` returned on its first line in every conformance play
commit: 0d81cd398
regression: packages/noodl-runtime/test/node-spec/nsp-019-diagnostics.test.ts; packages/noodl-editor/tests-unit/nsp-019/tryNode.test.tsx ("a warning about the settings")
kit: node-spec
---

Richard: *"you said it would include automated checks and tests so there's no way to fuck it up. I just managed to fuck it
up first try."* The modal was faithful. It runs the spec, and the spec copied a runtime that said nothing. The gap was three
deep. The Counter never raised a diagnostic. The spec format could not declare one. The conformance harness had no editor to
hear one.

**Fixed (s95).** The format grew `diagnostics` (a predicate per key, `<node-type>/<condition>`) and a `diagnostic` trace event
(one per key whose sentence changed, sorted by key, closing the frame's group). The interpreter records them. The runtime
target now has a recording editor and records the node's own keys (not the base class's `node/…`) for a spec that declares
any. The runner leaves them out for a target without an editor (`TargetAdapter.diagnostics`: the export, the strangers).
Counter v2 raises `counter/min-above-max` from both limit setters: *"Min Value 3 is above Max Value 1. With Limits Enabled
on, the count gets stuck."* The modal shows it above the card (with a danger ring) and as a *Warning* row, and *Fixed* when
it clears.

**Control:** one letter changed in the runtime's sentence → the Counter's runtime conformance red on the new scenario and on
69 of 200 generated sequences; restored.

**Not done:** the other nodes. Of those 9 call sites, no spec declares its diagnostic yet,
and no census has looked for other contradictions (the Slider's Min/Max is the next by name). The editor's Problems panel
and the agent's checker do not read a spec's `diagnostics` statically yet; the Problems panel shows the runtime's warning
only while the preview runs.

**s102 — the first two of the nine.** Date Add and Date Difference v3 declare `date-add/unknown-unit` /
`date-difference/unknown-unit`. The sentence is datemath.ts :61-65 `unknownUnitMessage`, copied into the spec's
`date-math.ts`, and it is evaluated on the last Unit that arrived. Each node got one scenario where an unknown Unit warns and
a Unit of the eight clears the warning. Their goldens gained only the `diagnostic` event. Both conform at seeds 20739 and
20740 (33 / 33 and 44 / 44 mutants). Control: one letter changed in the spec's sentence gives 17 divergences on Date Add.
Left: Text Input, the controls' helper, For Each, States, Group, Icon, layout, and the census of contradictions nobody
raises.
