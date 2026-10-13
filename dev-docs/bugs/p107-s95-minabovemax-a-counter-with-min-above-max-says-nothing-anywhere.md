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

**s103 — States (v5).** States had no `setDiagnostic` sentence of its own to declare. Its :723 call only *withdraws*
`states/unknown-state`. The sentences come from the error bus: `raiseRuntimeError` reaches the editor through
`createEditorWarningSubscriber` (runtimeerror.ts :177-186), keyed by the code, and the runtime target records any key in the
node's namespace once the spec declares one. So declaring one key meant declaring all four a play can raise:
`unknown-state` (withdrawn when a request names a state in the list, even one the node is already in), `no-states`,
`unreadable-transition` (once per port and curve) and `reserved-port-name`. The other three are never withdrawn.
`unreadable-color` needs the browser's `CSS.supports`, which a play does not have. The spec keeps the sentences in state
(`warnings`). Four scenarios were added. Two of them kill mutants that seeds 20739 and 20740 left alive, and one shows the
frame end's declared equivalent mutant on every seed. Before v5, seed 13's survivors there were all frame ends that raised a
failure, and the warnings now kill those at once. States v5 conforms at 20739, 20740 and 20741 with 0 divergences. Controls:
one letter changed in the transition sentence gives 4 scenarios and 5 sequences red, and dropping the clear gives 6 and 17.
Left after States: Text Input, the controls' helper, For Each, Group, Icon, layout, and the census.

**s103 — the Focus warning and Icon Source (seven specs).** Group, Text Input and the controls' helper are one sentence,
`focus/not-mounted`, raised by every Focus on whether the focus tracker took it. Seven specs declare it: Group, Text Input,
Button, Checkbox, Dropdown, Radio Button and Slider (`focus-not-mounted.ts`, a `focusMissed` flag the Focus action writes
on every press). Icon's `visual/icon-source-not-an-icon/iconIconSource` is declared by the six nodes with an Icon Source:
Icon, Button, Checkbox, Dropdown, Radio Button and Text Input (`icon-source.ts`, `describe-value.ts`). Its namespace,
`visual/`, belongs to the base visual class, as `node/` belongs to the base node. So the runtime target now records only the
keys a spec names in `visual/` and `dimensions/`, and does not grade the whole namespace. The runner counts a mutant that
changes only what the editor is told as `editorOnly` on a target with no editor (stranger round 4, Dropdown), not as a
survivor. Controls: one letter in the shared Focus sentence turns Button red on 8 scenarios and 13 sequences, and so does a
flag that is never set.
Left: For Each (its own `repeater/` namespace carries about 15 error-bus codes, and each one a play reaches must be modelled),
layout (`dimensions/wired-dimension-becomes-grow` depends on the parent's direction, a wired width or height, and the
rendered `flexGrow`: graph and render facts that a single-node play does not hold), and the census.

**s104 — For Each (v11).** A probe came first. The spec declared only `repeater/items-not-a-collection`, with a message that
was always empty, and ran at seed 20739. The runtime's sentences then show up as divergences. A play reached 9 `repeater/`
keys in the first difference of each play. Reading foreach.tsx found two more that a play can reach behind an earlier
difference: `template-script-threw` (a Script that throws, or a component that is not text) and `template-component-not-found`
with a Template that is not text (`{}`, `-1`). Ten keys are declared. Four of the 15 cannot happen in a play:
`row-build-failed`, `items-copy-threw`, `no-target` and `operation-threw`. Items is a `setDiagnostic` on every write. Two
sentences are withdrawn: the Script's, when a Script compiles, and the mapping's, at every mapping write. A row's problem is
raised once per sentence per rebuild, and the set a rebuild starts is kept after it. An empty entry is told once per Items
value. A Refresh's Failure tells the editor only when a Refresh was pulsed. Seven R35 scenarios. For Each v11 conformed on
its first run at seeds 20739 and 20740: 305 / 305 scenarios, 200 / 200 sequences, 0 divergences, 321 / 321 mutants.
Controls: one letter in the empty-entry sentence plus a dropped mapping withdrawal give 14 scenarios and 6 sequences red.
Left: layout, and the census.
