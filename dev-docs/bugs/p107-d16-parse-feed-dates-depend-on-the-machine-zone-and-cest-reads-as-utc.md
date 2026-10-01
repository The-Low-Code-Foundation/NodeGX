---
id: P107-D16
title: Parse Feed's dates depend on where it runs, and a CEST or BST date is published hours wrong
status: needs-ruling
severity: medium
area: runtime / Parse Feed
found: P107 NSP-013 s13, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

The same feed gives different **Published** / **Feed Updated** times depending on where it is parsed: a date
with no offset (`2026-09-15T08:00:00`) is 08:00Z in a UTC cloud function and 06:00Z in a browser in Paris. And a
named zone `Date.parse` does not know (`CEST`, `BST`) is rewritten to UTC, so `Mon, 15 Sep 2026 08:00:00 CEST`
is published as 08:00Z — two hours late — where the module's own comment promises *"a feed whose date it
cannot read gets null rather than a guess"*. (Its example of a declined zone, `EST`, is one V8 reads correctly.)

Where: `packages/noodl-runtime/src/feed.ts` :190-202 `toISODate`.

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.ParseFeed.json`, the three D16 scenarios (UTC,
Europe/Paris, America/New_York). Measured with `TZ=… node -e` on V8 too.

Proposed: read a zoneless date as UTC (one answer everywhere); a trailing zone name V8 does not know → `null`.
