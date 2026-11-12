---
id: NPMAUDIT-EXPORTDEADCOUNTER
title: The canonical click counter exports as a dead page with no todo
status: open
severity: high
area: export / Number, Boolean, String Format
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`nodegx export` (`@nodegx/export@0.2.5`) of the MCP's own `var-click-counter` example produces `ClickCounter.tsx` with every bit of logic dropped (Number/Boolean Set refused, String Format dropped as 'not a literal') and no `TODO(export)` marker in the file; the button does nothing. The generated README says 'All 130 nodes you can place export today' beside 13–23 refusals on six small examples; nodegx.io says every picker node exports. Fix: a TODO marker wherever a refusal lands, and the claim generated from the refusal count.
