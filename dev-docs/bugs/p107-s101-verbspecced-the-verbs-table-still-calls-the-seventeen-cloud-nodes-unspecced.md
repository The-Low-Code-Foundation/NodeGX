---
id: P107-S101-VERBSPECCED
title: The verbs table still calls NSP-022's 17 cloud-only nodes "not specced", so project-contract's verbs suite is red since NSP-022 gave them specs
status: open
severity: low
area: packages/nodegx-project-contract/world/verbs.ts `VERB_NODES` (:35-36 "NSP-022's 17 (cloud only, not specced)"), graded by packages/nodegx-project-contract/tests/verbs.test.ts :278-285
found: P107 s101, 2026-10-13 — project-contract's suite run after s101's `port-context.ts` edit (page labels); 1 failed / 352
evidence: `every specced node has a scenario file in the spec package, and every scenario of a backend node is a verb node` — `unspecced` lists all 17 `noodl.cloud.*` types (addusertorole … verifysessiontoken, aggregate), because `packages/nodegx-node-spec/scenarios/noodl.cloud.*.json` exist since NSP-022 (s96–s100, ledger 142 of 147) while `VERB_NODES` marks them `specced: false`. Not s101's: the rule reads only the scenario directory and the table
kit: node-spec
phase: P116 (ONT-007 owns `VERB_NODES`); found by P107
---

`VERB_NODES` was written (P116 ONT-006/007, `d53e5f283` / `53fb6350d`, 2026-10-09) when NSP-022's cloud-only nodes had no
spec, and its test holds the flag to the spec package's scenario files both ways. NSP-022 then specced all seventeen, so the
flag is stale on every one.

The fix is probably the flag (`specced: true`) and the docblock's count, but whether a verb treats a specced cloud-only node
differently (`runs: ['server']`, counted `outside`) is P116's to read first, so this is left to that phase.
