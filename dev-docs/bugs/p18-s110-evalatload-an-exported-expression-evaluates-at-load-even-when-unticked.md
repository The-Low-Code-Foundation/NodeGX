---
id: P18-S110-EVALATLOAD
title: An exported Expression evaluates at load even when Evaluate At Load is unticked
status: fixed
commit: (s112)
regression: packages/nodegx-export/tests/the-evaluate-at-load.test.ts
severity: low
area: export / Expression
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: Expression.evaluateAtLoad
---

Runtime: `expression.ts` :283 (`internal.evaluateAtLoad ? evaluate : NOT_EVALUATED`), setter :643 — unticked, Result stays
null until an input arrives. Export: the only reference is the reserved-name list (`analyze/expression-ports.ts` :133); an
Expression `months !== false` in budget-desk's Gauge emits the same `return (months !== false)` either way, so the export shows
`true` where the editor shows nothing. Side note: the "never evaluates" comment and refusal at `plan.ts` ~:6055-6058 predate
GAM-001; with the default (ticked) that refusal also drops a value the editor computes.

**Fixed, session 112.** Carried, not refused (`JsFunctionPlan.loadGate`). Unticked, the wrapper returns `null` while every
wire-fed input is `undefined`. Ticked, the load evaluation keeps `null` for a throw or a NaN, which was a gap on the
default side too. A literal on any input makes the box inert, as in the runtime. The refusal at `plan.ts` ~:6087 now
stands only for an unticked box over inputs nothing feeds, and its sentence names the box. Graded in
`tests/the-evaluate-at-load.test.ts`, against the runtime's own node (112 rows, mutant-controlled).
