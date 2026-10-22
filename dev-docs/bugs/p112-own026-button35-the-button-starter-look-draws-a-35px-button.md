---
id: P112-OWN026-BUTTON35
title: The kit's Button starter look (set_element_style starter) draws a 35 px button, under the 44 px touch-target guidance
status: fixed
commit: pending
regression: packages/noodl-mcp/tests/own026GuidanceCut.test.ts ("the Button starter is a comfortable touch target")
severity: medium
area: kit / MCP (`packages/noodl-mcp/src/tools/elementStyles.ts` `ELEMENT_STYLE_STARTERS`)
found: P112 OWN-026 t1-nodegx-1 and -2 (T9), 2026-10-22; FIX-02 D
evidence: grade T9 — main buttons 35–37 px at 390 px wide; every plain-code arm drew 40+
---

`paddingTop/Bottom: var(--space-2)` with `text-sm` and no height. Both rounds wrote it through
`set_element_style({ starter: true })`. Fixed: `minHeight: var(--space-11)` (44 px) on the starter, a floor not a
height; a project's own `minHeight` (or a node's) wins, and nothing is restamped on a project that set its own. The
editor's own ButtonConfig defaults (what its picker stamps on a dropped Button) are unchanged: an editor decision.
