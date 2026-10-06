---
id: P107-C2
title: Condition's Is True / Is False read the input live, while the wire carries the value from the last test
status: fixed
commit: a598f83e5
phase: P109
task: ISL-032
severity: medium
area: runtime / Condition
found: P107 (the node says what it does) s3, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/t13-condition-keeps-the-tested-result.json "Is True keeps what the last test found: a wire made after Condition changed with nobody testing it is handed the tested value, as the older wire holds"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row C2) — the row names how it is reproduced and pinned
---

Condition's Is True / Is False read the input live, while the wire carries the value from the last test.

**Node:** Condition

**What, with the line:** The runtime's two readers disagree: the getters (:133 `!!this.getInputValue('condition')`, :143) read the input LIVE, the wire carries the value at the last test. A wire connected AFTER a passive change is handed a value no test produced (`connectInput` reads the getter, node.ts :555-565), while wires made before hold the tested one. The description says "whether the **last test** found Condition true"

**How it was found / where it is pinned:** by reading, while fixing C1. No one-node trace arm can show it: the connection-time read happens at the first settle only, when `hasEvaluated` is false and both agree on `null`. NSP-008's graph adapter can (connect after a passive change)

**Proposed answer:** **runtime bug**: cache the tested value at :176 and return it from both getters. A behaviour change — ships alone after the ruling, like FH-022

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Keep the tested result".** The node remembers the value it last tested and both outputs report that. A small change in one node. A person only notices in the rare case above, where two wires now agree. The question as asked: *"Should Is True and Is False always give the result of the last test?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a598f83e5 (P109 ISL-032, 2026-10-06), as ruled.** Is True and Is False report the answer the last test found (`testedResult`), so a wire made after an untested change gets the tested value. Graded by graph t13 (new); the Condition spec already modelled the wire.
