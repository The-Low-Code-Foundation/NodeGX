---
id: P109-S25-EXPORTFEEDZONE
title: An exported Parse Feed reads a date with no zone in the machine's zone, and a zone name it does not know as UTC
status: fixed
regression: packages/nodegx-export/tests/the-parsers.test.ts "an item published %j reads as the runtime reads it" (15 dates against the runtime's own toISODate) and the parseFeed differential's Feed Updated (6 red on HEAD's parse lib)
phase: P109
task: ISL-043
severity: low
area: export / Parse Feed (`nodegx-export/src/emit/parseLib.ts`, the emitted `toISODate`)
found: P109 s25 (ISL-032, the P107-D16 fix), 2026-10-06
evidence: the emitted `toISODate` is the runtime's v1 reader verbatim — `Date.parse(raw)`, then a retry that rewrites a trailing `[A-Z]{2,5}` to ` UTC`. Read, not run.
---

P109 ISL-032 fixed P107-D16 in the runtime (`feed.ts`, ruled 2026-10-05 "UTC, and no date if unknown"): a date with no zone
is read as UTC wherever the app runs, and a trailing zone name `Date.parse` does not know (CEST, BST, CET, IST, JST) gives
no date. The exported app still gives one feed different Published dates in different time zones, and publishes
`08:00 CEST` as 08:00Z, two hours late.

**Plain words:** *"In an exported app, the same feed shows different times depending on where it is opened, and a
European summer-time date is shown two hours wrong."*

**Proposed:** port the runtime's `toISODate` (`packages/noodl-runtime/src/feed.ts`, `ZONE_NAMES_READ`) into the emitted
module. The runtime's ruling covers it; no new question.

Not checked for the export: P107-D17 (Feed Updated blank) and P107-D18 (Count is what Items holds) — the emitted Parse
Feed's state shape was not read.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still fired at HEAD. The emitted
`toISODate` is now the runtime's D16 reader, identical line for line (`ZONE_NAMES_READ`, a zoneless date read as UTC,
an unknown zone name giving null). It is graded through the emitted `parseFeed` over 15 dates against the runtime's
exported `toISODate`. The CEST and BST rows distinguish the old reader from the new one on any machine. The zoneless
rows do only where the machine's zone is not UTC; this one is CEST.

**D17 and D18, which this file said were not checked, were checked.** 🔴 **Both had drifted, and the differential
could not see it**, because its runtime side rebuilt the node layer by hand from the pre-D17/D18 node (`count:
items.length`, `feedUpdated: … || undefined`).
- **D17 is fixed here:** Feed Updated is `''` after a parse, as the node's line is, and stays undefined only before the
  first parse (`FEED_UNSET`). The differential now copies the node's current line.
- **D18 is filed, not fixed:** P18-S104-FEEDCOUNT. The node's Items is a shared `Collection` de-duplicated by Id, and
  its Count is `collection.size()`. The export emits the parsed array and its length. Transcribing it means reading
  `Collection.set`'s order and merge rules first.

Readings: `the-parsers` 41/41, with 6 red on HEAD's parse lib. HLS-001 golden: 1 line predicted and 1 counted
(`sheet-desk/src/lib/parse.ts`).
