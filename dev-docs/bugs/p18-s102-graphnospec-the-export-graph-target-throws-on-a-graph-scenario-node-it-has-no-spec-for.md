---
id: P18-S102-GRAPHNOSPEC
title: NSP-008 on the export cannot run — the export graph target throws "no spec for net.noodl.GlobalStore" instead of reporting the scenario outside its reach
status: fixed
commit: b01053e2b
kit: node-spec
regression: packages/nodegx-node-spec/tests/graph.test.ts "a scenario canPlay puts outside is never asked its reach — a reach may need the graph built (P18-S102-GRAPHNOSPEC)"
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

**Fixed 2026-10-14 (session 103, `b01053e2b`). The cause was not the one proposed above.** The export's `canPlay` already
put a scenario with an unspecced node outside, in the harness's words (NSP-013 s13). But the runner stopped asking it
first: `74a73de91` (P112 s8, 2026-10-11) folded `runGraphScenarios`' body into `gradeGraphScenario` and evaluated
`canPlay` and `graphReach` eagerly in one options object. The export's `graphReach` builds the graph, so it threw on
exactly the scenarios `canPlay` had excluded, and the throw ended the run. So "thrown since `af8847e50`" above is
wrong: it threw from 2026-10-11. The fix is the runner's old order (`src/runner/graph.ts`, reach only for a scenario
`canPlay` admits), with a regression in the node-spec kit that goes red on the eager line with this exact throw.

**What the run found once it ran:** the G1 row had been red underneath since `8a177580d` (P109 ISL-033, 2026-10-06).
That commit corrected C6 to the runtime's passing result and took the scenario's `row` mark off, but nothing declared
the export's atomic And as a difference. It is declared now (c06 `divergence.export`, CONTRACT.md Part 2's C6 row
⚠️ partial, the node-spec gate's set is C6/C7/C8). No one saw either break because no gate runs this suite
(P18-S102-NOEXPORTCI). Export graph 6/6: CONFORM, 1 passed, 3 diverged as declared, 81 outside, 0 failed of 85.
