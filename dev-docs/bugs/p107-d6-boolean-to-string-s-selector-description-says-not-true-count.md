---
id: P107-D6
title: Boolean To String's Selector description says "not true counts as false"; any truthy value counts as true
status: fixed
commit: 8f31517cc
phase: P109
task: ISL-033
severity: low
area: runtime / Boolean To String
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Boolean To String.json "a truthy non-boolean picks String for true — 'yes', 1, {} — as the description says (was row D6: it said 'anything that is not true counts as false')"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row D6) — the row names how it is reproduced and pinned
---

Boolean To String's Selector description says "not true counts as false"; any truthy value counts as true.

**Node:** Boolean To String

**What, with the line:** Port description (:69): "anything that is not true counts as false". The getter (:86) applies truthiness: `'yes'`, `1`, `{}` pick String for true

**How it was found / where it is pinned:** scenario *a truthy non-boolean picks String for true*

**Proposed answer:** **docs wrong** (or `=== true` in the getter — a behaviour change)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Correct the words".** The description says false, 0, empty text or no value picks String for false, and anything else picks String for true. No app changes. The question as asked: *"Should the Selector description be corrected to say what the node does, or should the node count only true itself as true?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 8f31517cc (P109 ISL-033, 2026-10-06), as ruled.** Wording only: Selector's sentence is now "false, 0, empty text or no value picks String for false; anything else picks String for true" in every copy. No behaviour moved.
