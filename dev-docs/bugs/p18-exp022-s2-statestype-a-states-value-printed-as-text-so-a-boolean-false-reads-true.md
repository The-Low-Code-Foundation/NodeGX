---
id: P18-EXP022-S2-STATESTYPE
title: The Swift printer typed every States value as text, so a boolean value false read "false", which is truthy
status: fixed
severity: medium
area: export / Swift target (`packages/nodegx-export/src/emit/swift/view.ts`, the States table)
found: EXP-022 session 2, 2026-10-22, reading S1's States table while printing `states-go`
evidence: tests/the-same-graph-in-swift.test.ts; dev-docs/tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md §9 S2
commit: 136b7081c
---

S1 printed a States node's values as `[String: [String: String]]`, each value through `String(…)`. A `boolean` value
`false` became the text `"false"`, and every sink reads a graph value by JavaScript's truthiness, where a non-empty string
is true: a `mounted` driven by such a value would draw what the runtime hides. A `number` value became text too, so a
sum over it would concatenate.

**Fix:** the table is `[String: [String: Any]]` and each value is printed by its declared type (`StatesValueDef.type`):
a number as a `Double`, a boolean as a `Bool`, a string or a colour as text. story-engine's table (text values only)
prints the same.
