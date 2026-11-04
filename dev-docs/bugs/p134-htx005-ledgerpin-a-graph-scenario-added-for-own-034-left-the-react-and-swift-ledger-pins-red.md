---
id: P134-HTX005-LEDGERPIN
title: "export tests: a graph scenario added for OWN-034 left the React and Swift ledger pins at 85, so React's ledger row has read red since 2026-10-30"
status: fixed
severity: low
area: the export's graph-scenario pins (`packages/nodegx-export/tests/node-spec-graph.test.ts`, `tests/node-spec-graph-swift.test.ts`)
found: P134 HTX-005 session 8, 2026-11-04, counting React's line before writing the HTML one beside it
evidence: `npx jest tests/node-spec-graph.test.ts` — "the ledger line" expected `of: 85, outsideExporter: 21`, received `of: 86, outsideExporter: 22`
kit: export
regression: packages/nodegx-export/tests/node-spec-graph.test.ts (the ledger line); tests/node-spec-graph-html.test.ts (V1, B1)
---

Commit 012c5236a (P112 OWN-034, 2026-10-30) added one graph scenario to `t01-global-store.json`: "a Function fed by
Subscribes on two keys of a named store sees the watched key's value from its first run, and again after a Set". The
React export leaves it outside on the exporter's verdict, so React's line moved from "15 of 85 … 21 outside on the
exporter's verdict" to "15 of 86 … 22 outside". Nobody moved the pins: React's ledger row failed from that commit on,
and the Swift file's V1 pin (85, 21 on the plan) failed the same way in the package suite.

Nothing played or conforming changed: 18 played, 15 conform, 3 differ as declared, on both.

Fixed in HTX-005 (session 8): both pins read 86 and 22, with a line saying which scenario moved them. The HTML line's
own pin is written against the same count, so the next scenario added turns all three red together.
