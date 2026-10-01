---
id: P107-C5
title: Boolean, Number, String and Color variables ignore a first Value of 0
status: needs-ruling
severity: medium
area: runtime / Variables
found: P107 (the node says what it does) s4, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row C5) — the row names how it is reproduced and pinned
---

Boolean, Number, String and Color variables ignore a first Value of 0.

**Node:** Boolean, Number, String, Color

**What, with the line:** `initialize` seeds `latestValue = 0` (variablebase.ts :121) and the value setter compares against it (DEF-046, :164-168). So a FIRST Value of `0` is never stored (a String handed the number 0 stays `''`, a Boolean stays unset), and a `Set` pulsed before any Value stores that seed through `cast`: `'0'` in a String, the NUMBER 0 in a Color, `false` in a Boolean — Changed fires and Done is reported for a value nobody sent

**How it was found / where it is pinned:** by reading; pinned in every Variable's scenarios (*a FIRST value of 0 is ignored*; *Set before any Value stores the seed*) and `tests/batch.test.ts`; the spec models it (the runtime wins)

**Proposed answer:** **runtime bug**: seed `latestValue = undefined` (:121 gives no reason for 0). Then the first 0 is a change (`valueDidChange(undefined, 0)`), and a Set before any Value abstains (`setValueTo(undefined)` returns false → `unchanged`), which is what the contract's own table says (:249-254)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
