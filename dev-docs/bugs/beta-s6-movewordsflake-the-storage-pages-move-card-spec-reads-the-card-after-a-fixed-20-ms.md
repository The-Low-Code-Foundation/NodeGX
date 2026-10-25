---
id: BETA-S6-MOVEWORDSFLAKE
title: The Storage page's "Move files to the bucket" spec reads the move card after a fixed 20 ms, and on a loaded box it is not drawn yet
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: tests / `packages/nodegx-backend/tests/admin-app/where-cards.test.tsx` "with the bucket in use: says how many are still here, asks, starts, shows progress, then what happened"
found: the Beta sweep s6, 2026-10-25 — `tests/admin-app` + `bmg-010` run seven times in a row: red twice ("nothing matches #move-words"), green alone
evidence: `await settle(20)` then `q(root, '#move-words')`; the same shape as P116-S23-STORAGEFLAKE
regression: packages/nodegx-backend/tests/admin-app/where-cards.test.tsx "with the bucket in use: says how many are still here, asks, starts, shows progress, then what happened"
---

The case mounts the Files view over a mocked backend and reads `#move-words` 20 ms later. The data is fixed; only the
time the view takes to draw varies, and under load it is more than 20 ms. The later steps wait the same way (20 ms
for the progress bar, 1.1 s then 20 ms for the result).

**Fixed** with `until()` (`tests/admin-app/dom.ts`) at all three: the card, the progress, the result. Instrument:
every mocked fetch delayed 50 ms — HEAD's waits red, `until` green. Not this session's change that exposed it: the
Storage page and its spec were not touched; the run that met it was this session's admin-app sweep.
