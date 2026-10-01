---
id: P107-D9
title: Value Changed's "including the first time it arrives" is false for undefined
status: needs-ruling
severity: low
area: runtime / Value Changed
found: P107 (the node says what it does) s4, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row D9) — the row names how it is reproduced and pinned
---

Value Changed's "including the first time it arrives" is false for undefined.

**Node:** Value Changed

**What, with the line:** Description (:47): "including the first time it arrives". `lastValue` starts `undefined` (:15), so a first arrival of `undefined` is not a change (`undefined === undefined`)

**How it was found / where it is pinned:** scenario *a first arrival of undefined is NOT a change*

**Proposed answer:** **intended** (a wire never delivers `undefined`); the sentence could say "a value"

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
