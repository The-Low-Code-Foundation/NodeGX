---
id: P107-D18
title: Parse Feed shows Count 2 and one item when a feed repeats a guid — and the item is the second one
status: fixed
commit: f6700d187
phase: P109
task: ISL-032
severity: medium
area: runtime / Parse Feed
found: P107 NSP-013 s13, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.ParseFeed.json "two items with one guid are ONE named record — Items holds it once, with the later item's fields, and Count says 1 (v4; was row D18: Count said 2)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

Every feed item carries an `id`, and putting the items into the array makes each one the app-wide record of
that id. Two items with the same guid become one record: **Items** holds it once, with the later item's fields,
while **Count** says 2. The record is also shared with anything else in the app using that id (an Object node,
another Parse Feed) — intended for storing each item once, but nothing on the node says so.

Where: `packages/noodl-runtime/src/nodes/std-library/data/parsefeed.ts` :257-263 (`collection.set(items)`,
`count = items.length`); `Model.create` keys by `id` (`packages/noodl-runtime/src/model.ts` :243-252).

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.ParseFeed.json`, the D18 scenario.

Proposed: Count = what Items holds; say on Items that each item IS the shared record of its id.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Match Count, describe sharing".** Count says how many items Items really holds, and the Items description says each item is the shared record of its id. A small change. Nothing else moves. The question as asked: *"Should Count match what Items holds, with Items saying that each item is the app's shared record for its id?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed f6700d187 (P109 ISL-032, 2026-10-06), as ruled.** Count is `collection.size()`, and Items' description says each item is the app's shared record of its Id. Parse Feed v4.
