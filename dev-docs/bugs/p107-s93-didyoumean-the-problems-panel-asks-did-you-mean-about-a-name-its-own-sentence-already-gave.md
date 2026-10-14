---
id: P107-S93-DIDYOUMEAN
title: The Problems panel asks "did you mean" about a name its own sentence already gave — every retired node reads "Use HTTP Request (net.noodl.HTTP) instead. — did you mean “net.noodl.HTTP”?"
status: fixed
severity: low
area: editor / Problems panel row text (`packages/noodl-editor/src/editor/src/views/panels/ProblemsPanel/ProblemsPanel.tsx` `diagnosticText`, now `ProblemsPanel/diagnosticText.ts`)
found: P107 s93, 2026-10-12 — driving R25 in the running editor on a renamed copy of Erleah-2-react19
evidence: the panel's own text over CDP — 8 rows "is a retired node type", each ending "— did you mean “net.noodl.HTTP”?"; `npm run validate:project -- <copy> --json` — 2,677 of 4,936 diagnostics carry a `suggestion`, 2,457 of them already name it in the message (raw-spacing-literal 2,310, inert-dimension 139, deprecated-node 8)
commit: e1f847269
regression: packages/noodl-editor/tests-unit/nsp-021/problems-panel-did-you-mean.test.ts
---

The panel appended `— did you mean “<suggestion>”?` to every diagnostic with a `suggestion`. The tail was written for a
typed name ("did you mean `value`?"), and the agent and the person both rely on it there (GAM-019, DEF-002). But R25's
`deprecated-node` sets `suggestion` to the successor *and* names it in its sentence, as `raw-spacing-literal` and
`inert-dimension` do with their token or value. The row then repeats itself as a question about a typo nobody made: a
REST2 is retired, not misspelled.

**Fix (s93):** the row keeps the tail only for a suggestion its message does not already say. No new words. The CLI's
`formatDiagnosticLine` (agent-facing, `→ did you mean`) is unchanged.

**Control:** the old unconditional line put back in `diagnosticText.ts` turns exactly the retired-node case red; the typo
case stays green.

**Left, filed apart:** P107-S93-NOTANAME — 220 rows on the same project whose `suggestion` is a sentence or a setting, not
a name, still get the "did you mean" wrapper.
