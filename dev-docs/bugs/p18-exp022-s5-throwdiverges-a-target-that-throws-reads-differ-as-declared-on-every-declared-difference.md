---
id: P18-EXP022-S5-THROWDIVERGES
title: A graph target that throws reads "differs as declared" on every scenario that declares a difference — a crashed export counts toward the ledger line's "3 differ as declared"
status: open
kit: node-spec
severity: medium
area: node-spec graph runner (`packages/nodegx-node-spec/src/runner/graph.ts`, `gradeGraphScenario`)
found: EXP-022 session 5, 2026-10-22, the Swift ledger line's first run (the package did not compile; the line still read 3 declared differences)
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s5/README.md "The first run"; packages/nodegx-export/tests/node-spec-graph-swift.test.ts B1 (the Swift line's own guard)
---

`gradeGraphScenario` turns a play that threw into a difference (`differenceWithThrow`), and for a scenario whose
`divergence` names the target it then asks only whether there is a difference. A throw always is one. So G1, C7 and C8
read `diverged` (CONTRACT.md Part 2's declared differences) when the target crashed before its first event. On the
Swift export's first run the package did not compile, every play threw, and the report read "3 diverged as declared".

The React export's line has the same hole. Its rows for C7 and G1 check that the Counter never reads 3, which a trace
of zero events also satisfies. Only C8's row (which needs a 3 to be present) would catch a throw there.

**Guarded on the Swift line, not fixed in the runner:** the Swift ledger row refuses to count when any play threw. The
fix belongs in the runner: a play with `error` set is `failed` whatever `divergence` says, because a throw is not the
declared difference. It needs the node-spec suite and React's graph line re-read, so it is the P107/React lane's.
