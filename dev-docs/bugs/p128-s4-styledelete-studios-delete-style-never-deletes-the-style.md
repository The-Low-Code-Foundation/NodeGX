---
id: P128-S4-STYLEDELETE
title: Studio's Delete style never deleted the style: it filtered the styles file it had just read afresh by object identity (`x !== v`), so every style was kept and the file rewritten unchanged
status: fixed
commit: nodegx-studio 97574ac
severity: medium
area: "nodegx-studio `editor/studio.html` Styles tab, the Delete style button (`renderStyles`); `stylesFile()` is `store.readStyles()`, which parses `nodegx.styles.json` on every call (`packages/nodegx-project-contract/format/store.ts` `readStyles` → `readJson`)"
found: Beta sweep s21 (P128 S4), 2026-10-27, `check:app` section 2c driving Delete style through Studio's new card in the desktop app
evidence: "MEASURED: `check:app` 2c — the card asked, the yes was pressed, and `nodegx.styles.json` still held the Outline style (63/64); READ: the handler did `const s = stylesFile(); s.variants = s.variants.filter((x) => x !== v)` where `v` came from an earlier `stylesFile()` call, and `readStyles()` returns a new parse each time, so no element is ever `===` `v`. The same code at HEAD behind `confirm()`: no gate had ever pressed it (check:editor's Styles section makes and wears a style, never deletes one)"
owner: Beta sweep s21
---

Fixed: the delete keeps every style but the one with the same type and name. Graded by `check:app` 2c ("Delete style:
asked in Studio's card, and gone"), red before the fix and green after.
