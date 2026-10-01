---
id: P18-E2
title: An exported Counter counts from 0 where the app counts NaN, for a Start Value that is not a number
status: open
severity: low
area: export / Counter
found: P107 NSP-005 s6, 2026-09-30 (routed to P18)
evidence: dev-docs/tasks/phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md (row E2); P107 NSP-005-THE-EXPORT-ADAPTER.md §6
task: EXP-011 (P18 decides: match the runtime, or keep the export's boot and say so in the report)
---

A Counter with a Start Value of `'abc'` shows NaN for ever in the editor and a deployed app; the exported React app
quietly starts it at 0 and counts from there. The export "fixes" a broken counter and says nothing, so the two apps
disagree with no warning to either reader.

**Where:** `packages/nodegx-export/src/analyze/plan.ts` `latchStateOf`, the boot line
`Number(rawStart ?? 0) || 0` (:7198 in the working tree; :7092 at HEAD `d2b2f0101`). The same `|| 0` also turns a
`-0` into `0` (row E3, invisible to a person, not logged).

**How it shows:** a known row in `packages/nodegx-export/tests/node-spec-conformance.test.ts` (`row: 'NSP-005 §6 E2'`,
7 of 200, 179 of 10,000). Still declared at HEAD 2026-10-01.

**Who meets it:** an agent or a hand-edited file (the panel's field is numeric).

**Proposed:** either boot `Number(raw)` as the runtime does, or keep the repair and add a report line naming the node
and the value. Drop the `known` E2 entry in the same commit. Small.
