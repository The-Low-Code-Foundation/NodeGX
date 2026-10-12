---
id: P109-S41-SUNDAYWEEK
title: A "the past 7 days" filter read back on a Sunday comes back as "this week" (and "the past 30 days" as "this month" on the 30th of a 30-day month)
status: open
severity: low
area: backend admin / data page filters (`packages/nodegx-backend/src/admin/app/filters.ts`, `fromWhere`)
found: P109 s41, 2026-10-11 00:20 CEST (a Sunday), by `tests/bmg-002-filters.test.ts` "due within past7", red at HEAD with or without s41's changes
evidence: this file; `windowRange` and `fromWhere`'s `$gte,$lt` branch
---

On the data page, an advanced filter is read back into rows by `fromWhere`. For a `{$gte, $lt}` date range it returns
the first window in `WINDOWS` whose `windowRange(id, now)` is the same range. On a Sunday, "this week" (Monday to the
next Monday) and "the past 7 days" (six days ago to tomorrow) are the same range, and `week` comes first in the list. So
a "the past 7 days" condition comes back as "this week". On the 30th of a 30-day month, "this month" and "the past
30 days" collide the same way.

The rows the filter returns that day are the same. The meaning is not: a row kept and read on Monday is a different
window.

The spec `bmg-002-filters` round-trips every operator with `NOW = new Date()`, so its "due within past7" case is red
every Sunday, and "within past30" would be red on the 30th of a 30-day month. Measured red at HEAD with s41's files put
back.

**Proposed:** a tie between two windows is not a reading. Return `between` (the explicit dates), or prefer the rolling
window when both match. Give the spec a fixed `NOW` per arm, including a Sunday and a 30th. Small.
