# CMG-006 — Edit a Look from Styles

**Opened 2026-09-24** from Richard's drive of P102 (README §2, findings 6a and 6b).
**Status: 📋 ready once CMG-005's `revealStyle` exists** (for the node → Styles link).

## 1. The person sentence

> **Someone sees a Look in Styles and changes it there, whether or not anything wears it yet. From
> a node wearing a Look, one press takes them to that Look in Styles. The editor calls it a Look
> everywhere.**

## 2. What is wrong, measured

*"When I save a 'Look', it appears in the style tab, but I can do fuck all with it. If I figure
out that I can edit it in the 'Look' dropdown on a node, I click edit and it says 'Edit variant'.
I guess this is ok, but we need a link between what we see in the styles tab and what's in the
Look editor on node props. I guess you could use the 'used by' menu to find a node that has the
look, then click to edit it, but that feels weird."*

- **Styles side.** [`LooksSection.tsx:17-21`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/LooksSection/LooksSection.tsx#L17-L21)
  says it outright: *"This surface renames, deletes and counts."* Each Look is a `StyleRow` with
  Rename (`:65-76`), Delete (disabled while worn, `:78-88`) and a *Used by* chip whose rows select
  the wearer (`shared.tsx:161-188`, `useGoToWearer`). No Edit. The empty state (`:95-100`) sends
  people to a node's Look menu.
- **Node side.** The Look row
  ([`variantseditor.tsx:98-169`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/components/VariantStates/variantseditor.tsx#L98-L169))
  has **Edit** (`onEditVariant`, `:219-227`), which puts the same property panel into variant mode
  (`propertyeditor.ts:76-81` → `ModelProxy.setEditMode('variant')`; from then on reads and writes
  go to `node.variant`, `modelProxy.ts:92-109`).
- **"Edit variant"** is hard-coded at `variantseditor.tsx:140-143`, missed by the rename noted at
  `:10-13`. Three toasts still say *Variant* (`:202`, `:208`, `:214`). `grep -rn "ariant"` over
  user-visible strings will find more.
- **No link either way** between the Styles Look row and the Look editor.
- **The seam.** Look editing always goes through a node's `.variant`. `VariantModel` can already
  give its ports and parameters without a node (`VariantModel.ts:119-150`). `PropertyEditor`
  (`propertyeditor.ts:41-51`) and `ModelProxy` (`modelProxy.ts:82-91`) are built around a node.

## 3. What to build

1. **Edit on every Look row in Styles** (the row's ⋯ menu, and a click on the row's name). It opens
   the Look's fields. 🔴 It must work for a Look **nothing wears**: that is the empty-state case,
   and the one Richard hits right after saving a Look and deselecting the node. So *"select the
   first wearer and switch to edit mode"* is not enough on its own.
   - **Recommended:** a Look-only host. An adapter with `ModelProxy`'s surface whose `variant` is
     the `VariantModel` and whose `type` comes from the Look's node type, mounted as a `Ports` view
     in edit mode `variant`. Open it as a drawer in the Styles panel, or in the property panel's
     slot with a header saying which Look it is. Pick one and say why in this file.
   - While editing, the header says **"Editing the Look *Card* · worn by 14 nodes"** (the count
     comes from the existing *Used by*), so nobody thinks they're changing one node.
2. **Node → Styles:** the node's Look row gets *Show in Styles* (`revealStyle({ kind: 'look',
   name })`, CMG-005).
3. **Words:** every user-visible *variant* becomes *Look*: the edit header, the toasts, tooltips.
   `grep` the property editor, the Styles panel and `PickVariantPopup.tsx` for user-visible
   strings; don't touch identifiers, file names or the project format.
4. When editing from Styles changes a Look, every wearer on the canvas updates. This is already
   true for the node-side edit; measure it for the new host.

## 4. Acceptance criteria

1. Save a Look from a Group, deselect everything, open Styles → Looks → *Edit*. Change its
   background. A second Group wearing it changes on the canvas. The saved `nodegx.styles.json`
   `variants` entry holds the new value.
2. The same on a Look with **0** wearers: the fields open, the change is saved, and a Group that
   then picks the Look wears the new value.
3. From a node wearing *Card*: *Show in Styles* → Styles is showing, Looks is open, the *Card*
   row is on screen and highlighted.
4. `grep` for user-visible *"ariant"* strings in the property editor and Styles panel returns only
   identifiers. A list of what was renamed goes in this file.
5. One undo step per field change in the Look-only host, the same as the node-side edit.
6. 🔴 The existing node-side Look edit still works exactly as before (a drive, not a spec: it is
   the path people use today).

## 5. Watch for

- Looks carry per-visual-state values (hover/pressed). The node-side editor shows states. The
  Look-only host either shows them too or says *"States: edit on a node"*. Don't drop them silently.
- Deleting is disabled while worn. Keep that rule in the new host.
