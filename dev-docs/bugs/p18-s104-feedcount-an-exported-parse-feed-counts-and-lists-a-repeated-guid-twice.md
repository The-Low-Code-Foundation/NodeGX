---
id: P18-S104-FEEDCOUNT
title: An exported Parse Feed lists and counts an item whose guid repeats twice, where the running app holds it once (P107-D18)
status: open
severity: low
area: export / Parse Feed (`nodegx-export/src/emit/parseLib.ts` parseFeedState — `items` and `count`)
found: P18 session 104, 2026-10-14 — checking the D17/D18 rows P109-S25-EXPORTFEEDZONE said were not checked
evidence: "runtime `parsefeed.ts`: `collection.set(items)`, `this._internal.items = collection`, `this._internal.count = collection.size()` (f6700d187); emitted: `items` is the parsed array, `count: items.length`. The parsers differential copies the node's Count as `items.length`, so it cannot see this; no fixture repeats a guid"
---

In the running app Parse Feed's Items is a `Collection`, and each item is the app's shared record of its Id. Two items
with one guid are one record (with the later item's fields), and Count is what Items holds (P107-D18, ruled "Match
Count, describe sharing"). The exported app keeps both items and counts 2, so a feed that repeats a guid shows a
duplicate row and a Count one higher than the app's.

**Reproduce:** export a page whose Parse Feed reads an RSS document with two `<item>`s sharing a `<guid>`, and compare
Items / Count with the editor's preview.

**Proposed:** read `Collection.set`'s rules first (order of a repeated id, and how the later item's fields merge
onto the record), transcribe them into `parseFeedState`, and give the differential a fixture that repeats a guid, with
its Count taken from the node, not rebuilt.
