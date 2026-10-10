---
id: P112-S4-SCHEMADUP
title: "`trace.schema.json` declares `params` twice in the stack and popup observations — every bundle of the spec package warns"
status: open
severity: low
area: node-spec / trace schema (packages/nodegx-node-spec/schema/trace.schema.json :146 and :150, :175 and :183)
kit: node-spec
found: P112 OWN-004 s4, 2026-10-10
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-004-THE-REAL-APP-BESIDE-IT.md §6.2
---

Bundling anything that imports `@nodegx/node-spec` (the prototype's `build.sh`, any outsider's build) prints two
`Duplicate key "params" in object literal` warnings from esbuild. The `stack` observation (NSP-015 s18) lists
`"params": { "$ref": "#/definitions/canonical" }` at :146 and again at :150; the `popup` observation (NSP-015 s20) at
:175 and :183. Both copies are identical, so the schema means the same thing either way (JSON keeps the last); the cost
is a warning in every outside build of the package, which a stranger reads as something broken. Fix: delete the second
line of each pair (:150, :183). Left for P107, whose file it is and which had uncommitted work in the package when found.
