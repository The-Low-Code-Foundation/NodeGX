---
id: P107-D8
title: Color Blend renders "#NaNNaNNaN" for a non-numeric Blend Value
status: needs-ruling
severity: low
area: runtime / Color Blend
found: P107 (the node says what it does) s4, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row D8) — the row names how it is reproduced and pinned
---

Color Blend renders "#NaNNaNNaN" for a non-numeric Blend Value.

**Node:** Color Blend

**What, with the line:** A non-numeric Blend Value renders `'#NaNNaNNaN'` (:155-158: `clamp(NaN)` is `NaN`, `colors[NaN]` is a hole, `Math.floor(NaN).toString(16)` is `'NaN'`) — P79 E2's exact failure shape ("`#NaNNaNNaN` — no warning, no fallback") through the other input

**How it was found / where it is pinned:** scenario *a non-numeric Blend Value renders '#NaNNaNNaN'*

**Proposed answer:** **runtime bug**: `Number(value)` on arrival and a `NaN` guard that keeps the last colour (or shows Color 0) and reports once, as the colour path does

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
