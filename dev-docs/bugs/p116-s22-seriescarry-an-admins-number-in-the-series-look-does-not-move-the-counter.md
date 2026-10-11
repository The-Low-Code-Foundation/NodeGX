---
id: P116-S22-SERIESCARRY
title: A number the admin types in a series' own look (a backfill) does not move the counter, so a later create is handed that number and refused
status: fixed
commit: 562e10453
severity: medium
area: runtime / series create (`noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts` and `postgres/PostgresAdapter.ts` `create`: a series field the record carries is kept and `SERIES_TAKE_SQL` is not run; `adapters/series.ts`)
found: P116 ONT-015 s22 (Opus 5.5), 2026-10-11 — reading why `ont-015-projection.test.ts`'s "counter left where it was" mutant was refused
evidence: on both engines, an admin `POST /classes/Invoice { number: "T-0003" }` on a `T-{####}` series, then three person creates — the third is handed `T-0003` and answered 409 (the unique index), with nothing made; conformance case `series/a-number-the-store-is-given-is-kept` pins "does not move the counter" (with `OLD-7`, a value in another look)
regression: conformance `series/a-number-brought-in-its-look-moves-the-counter-past-it` and `series/a-number-edited-in-its-look-moves-the-counter-past-it` (both engines, via brg-003/brg-005); packages/nodegx-backend/tests/ont-015-series.test.ts "a number the admin brings in the series’ own look moves the counter past it" and its mutant
---

ONT-015 AC2 lets the admin bring a number (an old invoice's, a backfill). s21 kept the carried value and left the
counter alone, which is right for a number in another look (`OLD-7`) and wrong for one in the series' own look: the
counter later reaches it, hands it out, and the unique rule refuses the person's create. Nothing is handed out twice
(the index holds), but a person's save fails, and the 409's words are wrong too (`P116-S22-SERIESMSG`).

`setSeries` (s22, §3.3) already does the right thing for a migration: `planNumbering` reads every held value back
with `seriesParse` and starts each period's counter above the highest. **The fix:** in both creates, a carried value
that `seriesParse` reads in this series' look raises that period's counter to above it, never backward — one
upsert, `GREATEST` on PostgreSQL and the scalar `MAX` on SQLite (or read-then-set inside the gap-free transaction).

**Fixed (s23, `562e10453`).** `seriesRaises` (series.ts) reads each carried series value with `seriesParse`;
`SERIES_RAISE_SQL` moves that period's counter to above it and never back (`CASE WHEN excluded.next > next`,
one statement on both engines). On create it runs inside the insert's transaction (a refused create raises
nothing); on save, after the row changed — an admin's edit to a number was the same hole through the other
door (the doors guard only creates; a person's edit is ONT-014's freeze). A value in another look still
counts for nothing. A mutant that never raises reds exactly the two new conformance cases, on both engines.
