---
id: P112-OWN026-POINTERMODEL
title: A Pointer field the app never declared (owner) reads on a page or in a Function as a Model of its wire envelope, so `row.owner === userId` is false
status: fixed
commit: fbd337bfe
regression: packages/noodl-runtime/test/nodes/hlt022-plain-records.test.ts "a Pointer the app never declared is the id it points at (P112 OWN-026 FIX-05: `owner`)"
severity: medium
area: runtime / cloudstore `_fromJSON` (Record, Query Records, `Noodl.Records`)
found: P112 OWN-026 FIX-05, 2026-10-23
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-026/fixes/FIX-05.md "Done"
---

`_fromJSON` converts a Pointer to its id only when the project's `dbCollections` metadata declares the field's type.
The backend stamps `owner` as a Pointer to `_User` on every record a signed-in user makes, and no project declares it
(the measured app, t2-nodegx-c05, declared no `dbCollections` at all). So `owner` arrived as a Model holding `__type`,
`className` and `objectId`, and the safe check (`row.owner === caller`) was false, so a model reaches for a field it
wrote itself. A `plain` read already unwrapped it (`_plainFromJSON`).

Fixed: an undeclared field whose value is a Pointer envelope is read as a Pointer (its id), top-level fields only. Not
graded by the node spec (`nodegx-node-spec/src/nodes/record.ts`: schema conversions are named "NOT GRADED HERE").
