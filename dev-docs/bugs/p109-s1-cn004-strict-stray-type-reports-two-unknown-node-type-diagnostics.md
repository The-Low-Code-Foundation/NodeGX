---
id: P109-S1-CN004
title: Under strict validation a stray node type is reported as two unknown-node-type diagnostics, not one
status: fixed
commit: c6abe20c3
phase: P109
task: ISL-034
severity: low
area: noodl-mcp / validate_project (strict) — the validator report joined with the precondition checks
found: P109 ISL-014 s1, 2026-10-01 (met as a red neighbour spec; not this task's)
evidence: packages/noodl-mcp/tests/cn004.test.ts "acceptance criterion 3 — a type no kit declares is unchanged › still errors under strict" — Expected 1, Received 2
regression: packages/noodl-mcp/tests/cn004.test.ts
---

`cn004.test.ts`'s strict arm adds one node of a type nothing declares (`nothing.declares.This`) to the kit-dynports
project and expects exactly one `unknown-node-type` error. On 2026-10-01 it reads **two**; the non-strict arm of the
same fixture still reads one warning. So under `strict` the same stray node is reported twice.

**Attribution:** measured with ISL-014's change in the tree AND with HEAD `3df5adb82`'s `validate.ts` and
`planTools.ts` restored (control, same reading: 2). So it predates ISL-014 and is not its rewrite (which changes
messages, never counts, and does not run at all for an overlay installed through `setCatalogOverlay` alone).

**Likely shape, not isolated:** two producers of the same diagnostic — the validator's rule and a precondition check
in `validateOnDisk`'s `withPreconditions` join — whose `diagnosticKey`s differ under strict (severity, or the
message), so `dedupeDiagnostics` no longer collapses them. The authoring doors print both lines to an agent.

**Reproduce:** `cd packages/noodl-mcp && npx jest tests/cn004.test.ts -t 'still errors under strict'`.

**Not fixed here:** ISL-014's AC named it only as a neighbour; the owner is whoever owns the strict pipeline
(`validate.ts` `validateOnDisk` / the precondition set, AAQ-005 / D13 lineage). Count the two diagnostics' codes and
keys before changing either producer.

## 🔴 Re-measured 2026-10-03 (P109 s6): the diagnosis above is wrong — it is the fixture's wire

Printed the strict report's errors on this row: **one** `unknown-node-type` (the stray node) and one
`nonexistent-port` — *"dynports.kit.Panel has no output named "title""*. The failing assertion is
`expect(report.summary.errors).toBe(1)`, not the `unknown-node-type` count (which is 1, and passes). The fixture's
stray wire is `{ fromId: 'dyn_panel', fromProperty: 'title', … }`, and Panel's `title` is an **input**
(`tests/fixtures/kit-dynports/noodl_modules/dynports-kit/index.js:40`). The validator is right to refuse it.

So there is no duplicate producer. The fix is in the spec's fixture: wire from a real Panel output (e.g. the shared
`childIndex`), or count `unknown-node-type` errors only. Not fixed here (CN-004's spec, not ISL-009's); the title of
this file is kept so its links hold, and is now known to be false.

**Fixed 2026-10-10 (P109 s39, ISL-034, `c6abe20c3`), in the spec as s6 said.** Still red at the session's HEAD (the full
noodl-mcp run read 2 for 1). The fixture's wire now runs from the stray node into Panel's `title` (an input), and the arm
counts the one error it is about. cn004 13/13. The product was right all along: no producer changed.
