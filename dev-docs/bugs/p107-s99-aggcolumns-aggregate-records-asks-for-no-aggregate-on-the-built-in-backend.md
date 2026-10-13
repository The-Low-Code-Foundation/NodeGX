---
id: P107-S99-AGGCOLUMNS
title: Aggregate Records asks for no aggregate on a project bound to the built-in backend: its class schema is cached as `columns`, which the node does not read
status: fixed
severity: high
area: cloud runtime + editor ports / Aggregate Records (`aggregatenode.js` :290-292 `getAggregates`, :455 `updatePorts`; the cache: `noodl-editor` `schemahandler.ts` writes `backend:getSchema`'s `tables`, `nodegx-backend` `byob-admin.ts getSchema` → `{ name, columns }`)
found: P107 s99 (NSP-022), 2026-10-12 — measured on the real node through the runtime's cloud target before writing Aggregate Records' spec (NSP-022 §6.8)
evidence: control pair, same params (three aggregates over `Score`): `dbCollections` in the Parse shape (`schema.properties`) → `group={"total":{"$sum":"$points"},…}`; the built-in backend's shape (`columns: [{name, type}]`) → `group={"objectId":null}` and Success with nothing sent
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.aggregate.json
kit: node-spec
commit: 9f3e69c9e
---

`dbCollections` has two shapes; `queryutils.ts schemaFor` (:106-138) already reads both. Aggregate Records reads only
`schema.properties`, at run time (`getAggregates` returns `{}`) and in the editor (`updatePorts` draws no Property, Operation or
output ports). So on our own backend an author cannot pick a Property at all, and every aggregate they name goes the
P107-S99-AGGNOPROP way (nothing happens) or, if a Property was set some other way, is silently left out. Read by code, then
measured on the runtime with the two shapes as a control pair; not yet driven in the editor.

The scenario "the built-in backend's cached columns: no aggregate is asked for, and the one row is a Success that sends nothing (P107-S99-AGGCOLUMNS)" pins today's behaviour; it moves when this is fixed.

**Fixed s100 (`9f3e69c9e`, R36 "Fix all three"):** `classProperties` reads `schema.properties` or `columns`, in `getAggregates` and `updatePorts`; on the runtime the built-in backend's columns are asked for. Driven in the editor (s100): a NEW Aggregate Records in a cloud function draws no Class, Property, Filter or Do at all, whatever the cache's shape — the editor never runs the module's `updatePorts`. That is P107-S100-CLOUDSETUPPORTS, filed; the editor half of this fix reaches a person only through it.
