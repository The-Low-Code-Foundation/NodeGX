---
id: P107-D8
title: Color Blend renders "#NaNNaNNaN" for a non-numeric Blend Value
status: fixed
commit: 8294bb913
phase: P109
task: ISL-026
severity: low
area: runtime / Color Blend
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Color Blend.json "a Blend Value that is not a number keeps the colour last shown: halfway grey stays grey through 'abc', and 1 then shows white (D8)"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Keep last colour, warn once".** The screen keeps its last good colour and a one-time warning names the problem, as the colour inputs already do. A small change. The question as asked: *"Should Color Blend keep its last good colour and warn once when Blend Value is not a number?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** A Blend Value whose `Number()` is NaN keeps the colour last shown and raises `color-blend/unreadable-blend-value` once per value while it stands. Spec v2 (the result is state). Runtime 200: conforms 10 / 10. Control: the scenario and two new viewer tests fail on HEAD's file. The export has the same fault: `P109-S21-EXPORTBLENDNAN` (P18).
