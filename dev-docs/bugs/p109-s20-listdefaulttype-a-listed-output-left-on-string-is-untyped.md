---
id: P109-S20-LISTDEFAULTTYPE
title: A Function output added to the list shows Type "String" in the panel, but its port is untyped until another type is picked
status: fixed
commit: e6a124176
phase: P109
task: ISL-044
severity: low
area: runtime / Function (scriptOutputs proplist, simplejavascript.ts)
found: P109 ISL-006 s20, 2026-10-06
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s20
---
Each row under Script Outputs has a Type select whose default is `string`, so the panel shows "String". The port's
type is `parameters['outtype-<name>'] || '*'`, and a default is not written as a parameter. A person who leaves the
row on String gets a port typed `*`. Choosing "String" again writes nothing, because it is already the shown value.
Driven in the editor: three rows (total, label, ready) set to Number, String and Boolean. The Ports tab reads
`total number`, `label *`, `ready boolean`.

Inputs agree with their panel: an input's port falls back to `'string'`, and the runtime applies a type only when
`intype-` is set.

**The question for Richard:** should a listed output left on the panel's default be a String port (as the panel says),
or should the panel say "Any" until a type is picked? Making it String retypes every existing listed output that never
had a type picked. ISL-006's fix-up wrote 21 such rows on SuntappedX (`NoodlObject` and `Payments` hold objects).
Recommendation: the panel shows "Any" as the default for an output, and nothing that is saved changes.

**Ruled (Richard, P109 s44, 2026-10-11):** Panel says 'Any' until picked (as recommended): nothing saved changes.

**Fixed (P109 s44, 2026-10-11), as ruled.** The output Type select of both script hosts, the Function
(`simplejavascript.ts`) and the Script node (`javascript.ts`, which had the same mismatch), gains **Any** (`*`) as its
first choice and its default. Picking String now writes `string`, because it is no longer the shown default. Inputs
keep String, which is what their port falls back to. Nothing saved changes, since a default is never written. The
spec's twins (`nodegx-node-spec` `function.ts`, `script.ts`) say the same.

**Graded:** `noodl-runtime/test/nodes/isl044-listdefaulttype.test.ts` and
`noodl-viewer-react/tests/isl044-listdefaulttype.test.ts` read the ports each module's `setup` announces. On HEAD,
exactly the "shows Any" arm was red, and the controls (String picked makes a string port; an input stays String) were
green. All green after. P107's ports-parity oracle was red on the spec twins before they moved (7 rows,
`default runtime "*", spec "string"`) and 325/325 after. Golden check holds (no trace moves); catalog and docs checks
are clean.
