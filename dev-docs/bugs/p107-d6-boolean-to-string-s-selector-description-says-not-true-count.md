---
id: P107-D6
title: Boolean To String's Selector description says "not true counts as false"; any truthy value counts as true
status: needs-ruling
severity: low
area: runtime / Boolean To String
found: P107 (the node says what it does) s4, 2026-09-30/10-01
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
