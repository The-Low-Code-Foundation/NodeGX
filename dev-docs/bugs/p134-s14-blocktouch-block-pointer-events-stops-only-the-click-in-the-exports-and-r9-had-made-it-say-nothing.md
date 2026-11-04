---
id: P134-S14-BLOCKTOUCH
title: "export: a node set to Block Pointer Events stops all sixteen pointer events in the app and only the click in both exports, and R9 had made the exports stop saying so"
status: fixed
commit: ae7a3e99d
severity: low
area: the style layer (`packages/nodegx-export/src/emit/style.ts`, `BLOCK_TOUCH_NOTE`) and the HTML printer's losses
found: P134 session 14, 2026-11-04, the parameter ledger (blockTouch fell silent once R9 consumed it)
evidence: packages/nodegx-export/tests/parameter-coverage.test.ts §A (silentNotInLedger listed every node's blockTouch before the note)
regression: packages/nodegx-export/tests/parameter-coverage.test.ts
---

Fixed as a statement, not as behaviour: both exports now say "its Block Pointer Events is carried for the click only — the
press, hover and touch events still reach the parents, where the running app stops them". Carrying the other fifteen
events is open work if a template needs it (none measured).
