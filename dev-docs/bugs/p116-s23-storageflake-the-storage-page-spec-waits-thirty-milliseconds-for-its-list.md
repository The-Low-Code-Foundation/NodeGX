---
id: P116-S23-STORAGEFLAKE
title: The Storage page spec waits 30 ms for its file list, and on a loaded box the list is not drawn yet — "lists what the route answers" reads an empty table
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: tests / `packages/nodegx-backend/tests/admin-app/storage-views.test.tsx` "BMG-011 Storage page › AC1" (`await settle(30)` then reads `table.files tbody tr`)
found: P116 s23 (Opus 5.5), 2026-10-11 — the whole backend `npx jest` beside a peer's `test:main` (load ~70), then again alone beside a peer's `jest -w 2`
evidence: twice `expected ["ffeeddccbbaa9988_note.txt", "a1b2c3d4e5f60718_paws.png"], received []`; the third run with the box quiet (load 9) passed 26/26. The data is a fixed mock (no clock, no network), so only the wait varies
regression: packages/nodegx-backend/tests/admin-app/storage-views.test.tsx "AC1: lists what the route answers, names the record a file is used by, and a refused delete offers to clear"
---

A fixed-time settle is the spec's assumption that the view draws within 30 ms of mounting. On a box running two
suites it does not, and the AC1 test reads the table before the list arrives. Not a product defect: the view draws
the mocked answer every time it is given the time. Owned by P104 (BMG-011's spec); filed by P116 because P116's
whole-suite run met it.

**Fixed (the Beta sweep s6, 2026-10-25).** `tests/admin-app/dom.ts` `until(ready, what, ms = 3000)` settles until the
thing a step reads is there, and throws naming it when it never comes. AC1 waits for the rows and their uses, then the
in-use dialog, then the clearing delete, instead of three fixed `settle(30)`s. Its twin in `where-cards.test.tsx`
(the move card, red three times in nine runs this session) is **BETA-S6-MOVEWORDSFLAKE**, fixed the same way.

**Graded by an instrument, not by luck:** every mocked fetch delayed 50 ms. HEAD's waits: both cases red; `until`:
both green. Unslowed: both files 38/38. Other fixed waits in these files are not converted (none measured flaking).
