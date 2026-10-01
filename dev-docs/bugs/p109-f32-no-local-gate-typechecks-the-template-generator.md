---
id: P109-F32
title: No local gate typechecks the template generators — jest and `template:*` pass over a `Duplicate identifier` that `tsc` refuses
status: scheduled
phase: P109
task: ISL-023
severity: low
area: tooling / template generator (noodl-mcp tests, jest config)
found: P108 s4, 2026-09-30/10-01 (audit P109 F32; corrected by ISL-023 scoping 2026-10-01)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F32; ISL-023 §2
---

Two lanes each added `import { ENGINE, helper } from './cg002Scripts'`, git merged both lines without a conflict, and
every local gate stayed green: `tsc` reports TS2300 "Duplicate identifier", but nothing local runs `tsc` over these
files. Today the duplicates are harmless; the same hole lets a wrong type or misspelt field on a shared record through.
CI's `typecheck:mcp` (`pr.yml:51`) would catch it, but only after a push (local `cline-dev` was 315 commits ahead of
`origin/cline-dev` at scoping).

**Where:** `packages/noodl-mcp/jest.config.js:10` (`ts-jest` with `diagnostics: false`); every `template:*` script runs
`ts-node -T`; `scripts/` is in no typecheck program. The duplicates are still at HEAD `d2b2f0101`:
`packages/noodl-mcp/tests/cg005Olive.test.ts:21` and `:24`; `packages/noodl-mcp/tests/ig004Island.test.ts:15` and `:21`.

**Reproduce:** `tsc -p packages/noodl-mcp --noEmit` (not run here — read only).

**Proposed:** a local typecheck step before the generator writes (or `diagnostics: true` for the generator's specs),
`scripts/` in a typecheck program, and remove the two duplicate imports. Small.
