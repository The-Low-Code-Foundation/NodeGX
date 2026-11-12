---
id: P134-S10-PARAMFLOOR
title: "export suite: parameter-coverage's floor and total each read three more than the ledger (1239 of 1402, the ledger 1236 of 1399)"
status: open
severity: low
area: `packages/nodegx-export/tests/parameter-coverage.test.ts`, `packages/nodegx-export/parameter-ledger.json`
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band
evidence: §A "the reaching count is the floor, and the total is the total" — expected { reaching: 1236, total: 1399 }, received { reaching: 1239, total: 1402 }
---

The total is the catalog's parameter count, which session 10 did not touch; the three new parameters all reach. Most
likely a catalog change elsewhere whose ledger was not moved with it. Owed: name the three parameters, and move the
ledger in the commit that added them (or with a line saying which commit did).
