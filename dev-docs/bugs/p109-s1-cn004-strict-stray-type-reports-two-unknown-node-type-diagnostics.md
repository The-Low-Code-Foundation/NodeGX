---
id: P109-S1-CN004
title: Under strict validation a stray node type is reported as two unknown-node-type diagnostics, not one
status: open
severity: low
area: noodl-mcp / validate_project (strict) — the validator report joined with the precondition checks
found: P109 ISL-014 s1, 2026-10-01 (met as a red neighbour spec; not this task's)
evidence: packages/noodl-mcp/tests/cn004.test.ts "acceptance criterion 3 — a type no kit declares is unchanged › still errors under strict" — Expected 1, Received 2
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
