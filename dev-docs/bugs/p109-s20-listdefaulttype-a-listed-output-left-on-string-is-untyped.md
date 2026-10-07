---
id: P109-S20-LISTDEFAULTTYPE
title: A Function output added to the list shows Type "String" in the panel, but its port is untyped until another type is picked
status: needs-ruling
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
