---
id: P112-OWN026-SHORTPATHUNSAFE
title: Changing a shared value by an amount needed a Function node and Noodl.Records.increment, so the shortest graph (read, add, write back whole with Update Record) was the one that loses a change
status: fixed
commit: PENDING
regression: packages/noodl-runtime/test/nodes/own026-fix03-add-to-and-press-guard.test.ts (FIX-03 A rows); packages/nodegx-node-spec/scenarios/SetDbModelProperties.json (v5 Add To rows)
severity: high
area: runtime / Update Record (`packages/noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode.ts`)
found: P112 OWN-026 t1-nodegx-3 (T5), 2026-10-23; FIX-03 A
evidence: /Users/Shared/nodegx-lab/own026-grades/t1-nodegx-3/grade.json T5: two tabs each finished a round, the child moved one planet, not two ("the app writes absolute values from each tab's stale copy")
---

The safe way was `await Noodl.Records.increment(…)` in a Function node; the unsafe way (a Function works out the new
total from the Record's value, an Update Record writes it) was shorter, and the model chose it in so many words
("contention is negligible … Simpler and defensible: compute the whole new state").

Fixed: Update Record has `Add To` (property names, comma-separated). Those properties' values are amounts sent as
`cloudstore.increment` (atomic on the NodeGX backend), after the other properties' save so `Only If Unchanged` still
guards them and a refused save adds nothing; the record shows the backend's total. A value that is not a number fails
the Do and says so; `All` never sends an amount's field as a value; Local only adds to the record held. The
`cloud-shared-counter` example is now a Button, a Record and an Update Record with no script; the guidance, the
backend doctrine, the enforced-rules note and the node enrichment lead with it. Node spec v5; conformance on seeds
3, 7, 99, 20748: 41/41 scenarios, 0 divergences, 85/85 mutants killed.
