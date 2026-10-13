---
id: P107-S99-AGGSTALE
title: An aggregation that matches no record says Success and leaves the previous aggregation's totals on every output
status: fixed
severity: medium
area: cloud runtime / Aggregate Records (`ParseWireAdapter.ts` :454-457 a row count other than 1 hands `{}`; `aggregatenode.js` :160-167 flags only the names the answer carried)
found: P107 s99 (NSP-022), 2026-10-12 — measured on the real node through the runtime's cloud target before writing Aggregate Records' spec (NSP-022 §6.8)
evidence: a Success with `total` 12, then an answer with `results: []` → Success, and `agg-total` still 12 on its wire (the getter now reads `undefined`, but nothing is sent)
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.aggregate.json
kit: node-spec
commit: 9f3e69c9e
---

A grouped aggregation over zero matching records answers no row (MongoDB-style `$group`). A function that sums one user's
orders, then another's who has none, reports the first user's sum for the second. Needs a ruling because the fix has to pick a
value: send `undefined`/`null` for every aggregate asked, or `0` for a sum and `null` for the rest.

The scenario "an answer with no row after one with values: Success, and the outputs keep the last aggregation's values (P107-S99-AGGSTALE)" pins today's behaviour; it moves when this is fixed.

**Fixed s100 (`9f3e69c9e`, R36 "Empty, like our backend"):** every aggregate asked gets a value — what the answer carried, else `null` — and each wired output is sent, so an answer with no row empties the outputs. Our own backend already answers one row of nulls for no match (`LocalSQLAdapter.aggregate`).
