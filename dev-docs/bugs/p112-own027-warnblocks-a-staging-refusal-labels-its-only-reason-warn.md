---
id: P112-OWN027-WARNBLOCKS
title: A staging refusal labels its only reason "WARN", so a client that triages by severity reads a refusal as advice
status: fixed
severity: low
area: mcp / stage_plan_operation (planTools.ts validateStaged)
found: P112 OWN-027 arm T v2-e2b, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/T/v2-e2b/ledger.json (mcp[].head of the two refused stage_plan_operation calls)
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/noodl-mcp/tests/stagingDiagnostics.test.ts "a staging refusal says BLOCKS for the warning that refused it, and lists it in details.blocking"
---

`stage_plan_operation` on a section holding three identical item subtrees answers `isError`,
`code: "validation-failed"`, "rejected — nothing was staged", and its one readable reason is:

`WARN [repeated-sibling-subtree] … 3 sibling subtrees here are structurally identical … Make one component and instantiate it 3 times`

The refusal is deliberate: `planTools.ts` `validateStaged` gates "errors plus the three warnings that block authored
output". But the line keeps the severity of the rule as written, not the effect it had. The OWN-027 harness triages
rejections by severity and re-asks only `error`s, so it read "WARN" and found nothing to fix. Three runs (E2B, LFM3,
E4B) then had their list sections skipped, and with them the whole apply. A model reading the same text gets the
same mixed message: warnings are things you may leave.

Fix (small): in a refusal, print the blocking ones as `BLOCKS [repeated-sibling-subtree] …` (or `ERROR (blocks
staging)`), and put them in `details.blocking` as well as `readable`, so the word and the outcome agree.

Fixed (OWN-028 AC1): a refusal prints a warning that refused the write as `BLOCKS [code] …` (`formatRefusalLine`, `src/validate.ts`), on `stage_plan_operation`, `apply_plan` and the direct create/update doors; errors keep `ERROR`. The refusal's `details.blocking` carries the blocking diagnostics as objects.
