---
id: P132-FXMENUWORDS
title: The formula menu runs each formula's name into its description ("Text with valuesJoin text…")
status: fixed
phase: P132
severity: low
area: nodegx-studio / Backend tab (a setting's "A formula…" menu)
found: Richard's re-walk of P132 in Studio, 2026-11-03 (screenshot of Call an API's Query, "A formula" open)
evidence: nodegx-studio editor/automations-drive.mjs "each formula reads its name, then on the line under it what it does"
launch: beta
commit: nodegx-studio d4c72c0
---

The formula menu (`formulaMenu`, BWF-004) reuses the action menu's row markup (`.words` with a `<small>`), but its menu
has the class `formulas`, not `actions`, so the action menu's stacking rule never applied: the generic
`.menu .item small` (`margin-left:auto; white-space:nowrap`) put the description on the name's line, against it, and
past the menu's right edge.

Fixed: `.menu.formulas` rows stack name over description as `.menu.actions` rows do. The drive measures every row:
the description's top is below the name's bottom and inside the menu (red on the old CSS: same line).
