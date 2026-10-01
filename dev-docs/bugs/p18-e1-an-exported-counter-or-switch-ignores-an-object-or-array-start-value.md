---
id: P18-E1
title: An exported Counter or Switch ignores a Start Value / Start State that is an object or an array
status: open
severity: low
area: export / Counter, Switch
found: P107 NSP-005 s6, 2026-09-30 (routed to P18)
evidence: dev-docs/tasks/phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md (row E1); P107 NSP-005-THE-EXPORT-ADAPTER.md §6
task: EXP-011 (P18 decides: match the runtime, or keep the export's boot and say so in the report)
---

A Counter whose Start Value is an object counts NaN in the app and 0 in the export; a Switch whose Start State is
`{ a: 1 }` boots ON in the app and OFF in the export. The parameter reaches the exporter's IR as `{ kind: 'json' }`,
which the latch's `literalParam` does not read, so it falls back to the default without a word in the report.

**Where:** `packages/nodegx-export/src/analyze/plan.ts` `latchStateOf` → `literalParam(node, 'startValue')` /
`literalParam(node, 'onFromStart')` (:7184, :7197 in the working tree; :7078, :7091 at HEAD `d2b2f0101`).

**How it shows:** known rows in `packages/nodegx-export/tests/node-spec-conformance.test.ts` (`row: 'NSP-005 §6 E1'`,
Counter 18 / 628 and Switch 8 / 478 at 200 / 10,000). Still declared at HEAD 2026-10-01. (`undefined` has no
file form; that half is the generator's, not a product defect.)

**Who meets it:** an agent or a hand-edited file.

**Proposed:** defer the latch with a sentence when the param is `json` (the honest answer), or translate it with
the runtime's coercion. Drop the `known` E1 entries in the same commit. Small.
