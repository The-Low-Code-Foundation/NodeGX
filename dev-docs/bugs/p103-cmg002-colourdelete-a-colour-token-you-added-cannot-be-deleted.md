---
id: P103-CMG002-COLOURDELETE
title: A colour token you added cannot be deleted — its menu offers a greyed Reset and nothing else
status: open
severity: medium
area: editor / Styles panel (Colours › Design tokens)
found: Richard, 2026-11-14 ("be able to delete style tokens as well as adding and editing them")
evidence: packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/ColoursSection/ColoursSection.tsx (token row menuItems, v0.4.4)
regression: packages/noodl-editor/tests-unit/cmg-002/colour-token-delete.test.ts
---

CMG-002 §3.2 (commit e2194769a, shipped in v0.3.0) gave every token a person ADDS a delete: the ✕ on a row in
Type, Spacing, Borders, Effects and Motion, with the reach counted first and a confirm when something wears it.
The colour tokens under *Colours › Design tokens* never got it. Their row menu offers *Edit colour*, *Copy
reference* and *Reset to default* — and on a token you added, Reset is greyed with the tooltip *"You added this
token — it has no default"*. So the panel says the token is yours and gives you no way to remove it. The
model call (`StyleTokensModel.deleteCustomToken`) existed all along; only the menu item was missing.

**Where:** the delete handler lived inline in `TokensSection.tsx`; `ColoursSection.tsx` had no equivalent.

**Fix:** the handler moved to `StylesPanel/deleteToken.ts` (`isAddedToken`, `deleteTokenAsking`), and both
sections call it. The colour token menu gains *Delete* (trash, dangerous) only when `isAddedToken(token)`:
nothing wears it → deleted at once as one undo step; something wears it → the same *DELETE TOKEN* confirm,
naming the nodes, Looks and other tokens that use it.

**Not in scope:** deleting a SHIPPED default (`--primary`, `--space-4`, …). Those are rebuilt from the defaults
on every load, so a delete would need a stored "removed" list honoured by the CSS, the picker, the MCP style
vocabulary and export — and some defaults reference others. A task, not a hotfix.
