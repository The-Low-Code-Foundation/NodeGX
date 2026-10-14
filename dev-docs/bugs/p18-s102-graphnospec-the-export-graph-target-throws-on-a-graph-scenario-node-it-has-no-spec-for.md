---
id: P18-S102-GRAPHNOSPEC
title: NSP-008 on the export cannot run — the export graph target throws "no spec for net.noodl.GlobalStore" instead of reporting the scenario outside its reach
status: open
severity: medium
area: export / node-spec graph target (test harness)
found: P18 EXP-011 session 102, 2026-10-14 (the owed whole-package jest run)
evidence: packages/nodegx-export/tests/node-spec-graph.test.ts, packages/nodegx-export/tests/helpers/node-spec-target.ts:347-348 — 6 red at HEAD a66ebd2c5 in a clean worktree
---

The suite that grades the exported app on P107's graph scenarios is the instrument for ISL-043 ("the exported app
does what the running one does"), and it does not run: `graphComponent` throws `no spec for net.noodl.GlobalStore`
on the first scenario that places one, so all six rows fail, including C2 / C7 / C8 / G1, which do not use it.
`net.noodl.GlobalStore` appears in `packages/nodegx-node-spec/scenarios/graph/t01-global-store.json` (and State
History, Optimistic Update and Action Dispatcher in t02–t04), the T4 graph scenarios from P107 NSP-012.

**Reproduce:** `cd packages/nodegx-export && npx jest tests/node-spec-graph.test.ts`.

**Proposed:** a node the export target has no spec for makes that scenario *outside*, in the exporter's own words,
as the suite's own "the rest are outside" row expects, rather than throwing for every scenario. Measured: `nodegx-node-spec/src`
has no spec module for Global Store at all; t01–t04 are NSP-012's graph-by-construction recordings (`af8847e50`,
2026-10-01), so the target has thrown since that commit. Small, and it comes before ISL-043.
