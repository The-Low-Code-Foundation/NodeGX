---
id: P109-F32
title: No local gate typechecks the template generators — jest and `template:*` pass over a `Duplicate identifier` that `tsc` refuses
status: fixed
commit: 5ff15228b
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

**Fixed (P109 ISL-023, session 10, 2026-10-03):** every `template:*` now runs `scripts/template-gate.js` first: a
typecheck of the generator's own files under the options ts-node uses, plus a source scan for a stray backtick and a
`${…}` inside a produced comment, each named by file and line, and the generator writes nothing on a red. The two
duplicate imports are removed. `typecheck:mcp`'s remaining spec-file errors are `P109-S10-TYPECHECKMCP`.
