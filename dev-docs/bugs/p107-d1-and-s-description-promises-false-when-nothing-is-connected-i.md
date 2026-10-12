---
id: P107-D1
title: And's description promises false when nothing is connected; it publishes nothing
status: fixed
commit: 770b01405
phase: P109
task: ISL-033
severity: low
area: runtime / And
found: P107 (the node says what it does) s3, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/And.json "false is published before the first input; the first input publishes the next result"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D1) — the row names how it is reproduced and pinned
---

And's description promises false when nothing is connected; it publishes nothing.

**Node:** And

**What, with the line:** Port description "**false when no input is connected at all**" (:57). The code: `result` is `undefined` until an input arrives (:14, :44-46), so nothing is published (C3) and a wire reads nothing

**How it was found / where it is pinned:** scenario *nothing is published before the first input*

**Proposed answer:** **docs wrong** — or the runtime initialises `result = false` and sends it; either way a ruling. The inspector (:25-28) shows `false` for the same node, so the inspector and the wire already disagree

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Make And start at false".** A node wired to And's Result gets false from the start, as Or gives today. A one-line behaviour change shipped alone; an app that relied on And staying silent before its first input would now see false at start-up. The question as asked: *"Should And start at false, as its description says, or should the description say it sends nothing until an input arrives?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 770b01405 (P109 ISL-033, 2026-10-06), as ruled.** `initialize` sets `result = false`, so a wire from Result reads false before any input arrives, as Or's does; a first input of false publishes nothing more. Spec And v2. Control: HEAD's and.ts red on exactly the renamed scenario.
