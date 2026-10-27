---
id: P128-S2-EMPTYSTATEREFUSED
title: "The `ui-empty-state` example the server teaches is refused by its own write door since COMPVISIBLE (`79cbc4674`): it wires `mounted` into a placed `/Components/EmptyState`, which now errors `connection-unknown-instance-port`"
status: fixed
commit: 6cdafc718
severity: medium
area: "docs/node-catalog/examples/ui-empty-state.json (`/Pages/Orders`, node `empty`); the rule from `79cbc4674` fix(p127 bko-006 compvisible)"
found: P128 S2, 2026-10-27, the full noodl-mcp suite after S2's change (S2 adds only info diagnostics and a result note; this error is the instance-port rule)
evidence: "MEASURED: `packages/noodl-mcp/tests/npmauditExampleInvalid.test.ts` › ui-empty-state, red: `/Pages/Orders: ERROR [connection-unknown-instance-port] … node empty \"Shown only when the query is empty\" (/Components/EmptyState) › input \"mounted\" … A placed component has no Visible or Mounted of its own. To show it only sometimes, put it inside a Group …`. The example was last changed 8 weeks ago (e337325c5); the rule is 79cbc4674, today. Not in S1's list of reds at HEAD (taken before 79cbc4674)."
owner: P127 s8 (fixed before the 0.2.8 cut)
task: P127 BKO-006 (COMPVISIBLE's lane)
regression: packages/noodl-mcp/tests/npmauditExampleInvalid.test.ts "ui-empty-state"
---

The example teaches exactly what COMPVISIBLE now refuses. The fix is the example's, by the rule's own suggestion: wrap
the `EmptyState` instance in a Group and wire the Group's `mounted`, then `npm run catalog:merge` (the server serves the
enriched catalog, not `docs/node-catalog/examples/`).

**Fixed (P127 s8, 2026-10-27), before the npm 0.2.8 cut.** The example now places `/Components/EmptyState` inside a
Group (`emptyWrap`, "Shown only when the query is empty") and wires the query's `isEmpty` into the Group's `mounted`.
Its description says why: a placed component has no `mounted` or `visible` of its own. `catalog:merge` regenerated
the enriched catalog (21 lines in each file, nothing else). Graded: `npmauditExampleInvalid.test.ts` 116/116; with
HEAD's enriched catalog put back, `ui-empty-state` red (1 failed, 115 passed); `catalog:merge:check
--require-coverage` up to date.
