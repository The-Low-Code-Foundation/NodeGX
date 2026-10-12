---
id: P107-S99-AGGFILTERPREFIX
title: Aggregate Records drops a filter condition whose value is wired, and aggregates the whole class, saying Success
status: open
severity: high
area: cloud runtime / Aggregate Records (`packages/noodl-viewer-cloud/src/nodes/data/aggregatenode.js` :180-183 `convertVisualFilter` with no `valuePortPrefix`; :357-360 parameters kept by bare name; editor ports :558-577 read only the retired shape)
found: P107 s99 (NSP-022), 2026-10-12 — measured on the real node through the runtime's cloud target before writing Aggregate Records' spec (NSP-022 §6.8)
evidence: control pair, same params and `qp-min` = 3: the builder's saved shape with a STATIC value 3 → `match={"points":{"$gt":3}}` in the request; the same condition with a CONNECTED value (`valuePortName: 'qp-min'`) → no `match=` at all, the whole class aggregated, Success; the retired visual shape (`input: 'min'`) → `match=` present
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.aggregate.json
kit: node-spec
---

The editor edits every `query-filter` port with the filter builder (`ByobFilterType.ts`), which saves a connected value as
`valuePortName: 'qp-<field>_<id>'`. Query Records, Subscribe To Changes and Filter Records pass their prefix to
`convertVisualFilter` (`valuePortPrefix: 'qp-'` / `'fp-'`); Aggregate Records passes none, so the lookup asks its parameters for
`qp-min` while they are kept as `min`. `dropUnresolvedConnected` then drops the condition as unwired, and the aggregation runs
over every record. Issue #14's wrong number, on the visual path that FLD-008 (the Javascript path) did not touch.

Two halves: the run-time lookup (pass `valuePortPrefix: 'qp-'`, as the siblings do), and the editor (its `updatePorts` collects
`qp-` ports only from the retired `rules`/`input` shape, so a saved-shape condition's port is never drawn and cannot be wired).
The scenario pins today's behaviour and moves when this is fixed (a spec version bump, NSP-010).

The scenario "the builder's saved shape with a CONNECTED value: the condition is dropped and the whole class is aggregated (P107-S99-AGGFILTERPREFIX)" pins today's behaviour; it moves when this is fixed.
