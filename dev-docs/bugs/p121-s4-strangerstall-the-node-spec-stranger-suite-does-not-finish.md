---
id: P121-S4-STRANGERSTALL
title: node-spec's stranger suite does not finish — it sits at full CPU after round 4's Dropdown conforms
status: open
severity: medium
area: node-spec / tests (`packages/nodegx-node-spec/tests/stranger.test.ts`, round 4 `stranger-4`, after AC1)
found: P121 TWO-003 s4, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §7.3
---

`npx jest tests/stranger.test.ts` in `packages/nodegx-node-spec` never reaches a result. P107 recorded it at 479 s;
on 2026-10-14 (HEAD `9401ed1a3`) three runs were stopped after 20 minutes and more, one jest worker at 98–100% CPU on
a quiet machine (load average about 3). Every run printed rounds 1–3 conforming and
`net.noodl.controls.options v10 on stranger-4 (plain DOM): CONFORMS (19156 ms)` (20315 ms in the control), then
nothing more.

Not P121's change: the control run had `src/nodes/upload-file.ts` and `src/nodes/equivalent-mutants.ts` put back to
HEAD byte for byte, the only two files that differed in the package, and stalled at the same line. The whole package
otherwise passed (34 of 35 suites, the stranger the 35th). The last commit to the package is P107 s105
(`a5bb33d13`, 12:52 the same day: "one format edit and one stranger re-grade").

Reproduce: `cd packages/nodegx-node-spec && npx jest tests/stranger.test.ts --verbose`; it prints round 4's AC1 line and
stops there. Next step for whoever owns it: `NSP_ONLY="net.noodl.controls.options" npx jest tests/stranger.test.ts` to
see whether round 4's AC2 (every mutant caught by the stranger's target) is the part that spins. Owner: P107.
