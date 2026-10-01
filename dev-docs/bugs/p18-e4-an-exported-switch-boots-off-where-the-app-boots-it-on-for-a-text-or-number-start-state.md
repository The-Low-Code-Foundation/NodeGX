---
id: P18-E4
title: An exported Switch boots OFF where the app boots it ON, for a Start State that is text or a number
status: open
severity: medium
area: export / Switch
found: P107 NSP-005 s6, 2026-09-30 (routed to P18)
evidence: dev-docs/tasks/phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md (row E4); P107 NSP-005-THE-EXPORT-ADAPTER.md §6
task: EXP-011 (P18 decides: match the runtime, or keep the export's boot and say so in the report)
---

A Switch whose Start State is the text `'true'`, a `1` or a `'3'` (even `'false'`) starts ON in the editor's
preview and in a deployed app, and OFF in the exported React app. Nothing in the export report says so.

**Where:** `packages/nodegx-export/src/analyze/plan.ts` `latchStateOf`, `literalParam(node, 'onFromStart') === true`
(:7184 in the working tree; :7078 at HEAD `d2b2f0101`). The runtime reads truthiness.

**How it shows:** the P107 export gate counts it on every run as a known row (12 of 200 sequences, 672 of 10,000):
`packages/nodegx-export/tests/node-spec-conformance.test.ts`, `KNOWN` Switch, `row: 'NSP-005 §6 E4'`. Still open
at HEAD 2026-10-01: the line is unchanged and the known row is still declared.

**Who meets it:** not a person typing in the property panel (a checkbox), but an agent or a hand-edited file — the
MCP server's `create_component` can write a string there.

**Proposed:** read truthiness as the runtime does (`!!literalParam(...)`), or keep `=== true` and add an export-report
line where the literal is not a boolean. Drop the `known` E4 entry in the same commit. Small.
