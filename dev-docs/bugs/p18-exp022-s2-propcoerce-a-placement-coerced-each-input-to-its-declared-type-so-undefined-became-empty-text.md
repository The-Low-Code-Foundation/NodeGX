---
id: P18-EXP022-S2-PROPCOERCE
title: The Swift printer coerced each placement's input to its declared type at the boundary, so undefined became "" or 0 and a number became text
status: fixed
severity: medium
area: export / Swift target (`packages/nodegx-export/src/emit/swift/view.ts`, a placement's arguments; `support.ts` `JS.number`)
found: EXP-022 session 2, 2026-10-22, printing the Hook Desk, whose Echo reads an input that is undefined until a lift arrives
evidence: tests/the-same-graph-in-swift-s2.test.ts §A; dev-docs/tasks/phase-18-code-export-v2/exp-022/s2/
commit: 136b7081c
---

S1 typed a component's inputs by the plan's `tsType` (`String`, `Double`, `Bool`) and converted each argument at the
placement (`JS.show`, `JS.number`). A TypeScript type is a compile-time claim; the React export hands the value on as it
is, and so does the runtime. Coerced at the boundary, an input that is undefined arrived as `""` (or `0`), so a body
writing `'echo ' + Inputs.said` would have said `echo ` where both other arms say `echo undefined`, and a number fed to
a text input arrived as text. `JS.number(nil)` also answered `0` where JavaScript's `Number(undefined)` is `NaN`.

**Fix:** every input is `Any?`, the graph's value as it is; a sink coerces it (a Text by `JS.show`, a `mounted` by
`JS.truthy`), as JavaScript does. `JS.number(nil)` is `NaN`. The Hook Desk reads what the runtime reads at every step.
