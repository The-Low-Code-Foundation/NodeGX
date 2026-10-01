---
id: P107-D18
title: Parse Feed shows Count 2 and one item when a feed repeats a guid — and the item is the second one
status: needs-ruling
severity: medium
area: runtime / Parse Feed
found: P107 NSP-013 s13, 2026-10-01
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
