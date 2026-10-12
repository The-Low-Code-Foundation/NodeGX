---
id: P116-S23-STORAGEFLAKE
title: The Storage page spec waits 30 ms for its file list, and on a loaded box the list is not drawn yet — "lists what the route answers" reads an empty table
status: open
severity: low
area: tests / `packages/nodegx-backend/tests/admin-app/storage-views.test.tsx` "BMG-011 Storage page › AC1" (`await settle(30)` then reads `table.files tbody tr`)
found: P116 s23 (Opus 5.5), 2026-10-11 — the whole backend `npx jest` beside a peer's `test:main` (load ~70), then again alone beside a peer's `jest -w 2`
evidence: twice `expected ["ffeeddccbbaa9988_note.txt", "a1b2c3d4e5f60718_paws.png"], received []`; the third run with the box quiet (load 9) passed 26/26. The data is a fixed mock (no clock, no network), so only the wait varies
regression: none yet — owed: the spec waits for the rows (or the mocked fetch's answer), not a fixed 30 ms
---

A fixed-time settle is the spec's assumption that the view draws within 30 ms of mounting. On a box running two
suites it does not, and the AC1 test reads the table before the list arrives. Not a product defect: the view draws
the mocked answer every time it is given the time. Owned by P104 (BMG-011's spec); filed by P116 because P116's
whole-suite run met it.
