---
id: P107-D13
title: Array's Changed description still names the rule from before the "Array contents" checkbox
status: needs-ruling
severity: low
area: runtime / Array
found: P107 (the node says what it does) s9, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row D13) — the row names how it is reproduced and pinned
---

Array's Changed description still names the rule from before the "Array contents" checkbox.

**Where:** Array `changed` description (:213)

**What the wire shows:** "suppressed while Fetch is connected" — NDA-017 §2 replaced that rule with the `Array contents` checkbox (:73)

**Plain words:** a sentence from before the checkbox

**Proposed:** rewrite

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
