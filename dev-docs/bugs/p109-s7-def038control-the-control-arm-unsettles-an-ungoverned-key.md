---
id: P109-S7-DEF038CONTROL
title: DEF-038's "the check is live" arm deleted a key the planner never reads, and read three settled templates as dead checks
status: fixed
commit: 4988a5948
severity: low
area: templates / test instrument (packages/noodl-mcp/tests/def038SettledTemplates.test.ts)
found: P109 s7, 2026-10-03 (attributing P109-S6-DEF038)
evidence: dev-docs/bugs/p109-s6-def038-four-templates-unsettled-against-run-on-change.md, "Measured in s7"
regression: packages/noodl-mcp/tests/def038SettledTemplates.test.ts
---

The control arm takes back ONE answered `runOnChange-*` checkbox and expects the migration planner to want to write it
again. It took the **first key in walk order**. The planner only reads a node whose control signal (`Run`) is wired,
so a key on a Function with nothing wired to `Run` is outside its reach: deleting it rightly writes nothing, and the
arm read that as "the check is dead".

Measured on the committed artefacts at `5fc537fb5` (a probe that deleted each key in turn): `templates/rocket-school`
has 145 answered keys, 133 governed, first one on `picknextquesFn` (no `Run` wire); `templates/digital-bricks-training`
50 answered, 36 governed, first one on `sfs_fn`. Both red from the commit that made them (`9d77c9427` 2026-09-14,
`0a0fd7f0d` 2026-09-20). The peer's uncommitted `templates/planning` and `planning-demo` read the same way.

**Fix:** try each answered key in walk order and pass on the first whose deletion the planner sees. Mutant: a planner
that never writes reddens the arm on all 14 committed artefacts (14/14).
