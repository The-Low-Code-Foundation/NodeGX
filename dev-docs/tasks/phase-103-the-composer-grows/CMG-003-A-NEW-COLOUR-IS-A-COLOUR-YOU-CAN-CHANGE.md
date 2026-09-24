# CMG-003 — A new colour is a colour you can change

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 5). Ruling: **RC-9** (new
colours are tokens).
**Status: 📋 ready.**

## 1. The person sentence

> **Someone presses *New colour*, picks the colour straight away, and it is one of their project's
> colours, offered everywhere the others are. A colour they made before this worked can be
> changed too.**

## 2. What is wrong, measured

*"When I add a new 'colour style', it just gives me grey by default and I can't change the
colour. Shouldn't this just be a design token? There's already loads of colours in there."*

- *＋ New colour style*
  ([`ColoursSection.tsx:69-88`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/ColoursSection/ColoursSection.tsx#L69-L88))
  calls `stylesModel.setStyle('colors', name, DEFAULT_NEW_COLOUR, { undo: true })` with
  `DEFAULT_NEW_COLOUR = '#808080'` (`:235`). That is the **old** layer, `metadata.styles.colors`
  (`StylesModel.ts`), not the token layer that holds `--primary` and friends.
- The row (`StyleRow.tsx:80-171`, menu `:161-164`) offers **Rename** and **Delete**. Its swatch
  (`:118-122`) is a plain `div`. **Nothing in the Styles panel can change a colour style's value.**
  The only place that can is the property panel's colour-style picker
  ([`colorstylepicker.jsx:197-225`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/DataTypes/ColorPicker/colorstylepicker.jsx#L197-L225),
  `onEditValue` → `ColorPicker` popout → `setStyle('colors', …, { undo: true })`). P94 STY-005's
  AC4 and AC5 specified only create, rename and delete. The value editor was never in scope.
- So the panel creates a thing it cannot edit. Every new colour is grey until someone finds a node
  whose colour field opens the style picker.
- Two layers in one section is P94's R2 (*"a person does not know we have two systems and should
  not have to"*). Rows are badged *Style* / *Token*. The badge tells people there are two systems,
  and the create button picks the one they can't edit.

## 3. What to build

1. **＋ New colour creates a colour token**, not a colour style (RC-9): `addCustomToken` with
   category `color-palette`, the name asked for as in CMG-002 (the same dialog). The **colour
   picker opens immediately** on it, the same `ColorPicker` popout the property panel uses.
   Its starting value is the colour of the row above it, not grey. One undo step for create +
   first pick is ideal. Two is acceptable if the pick is its own Apply, but then ⌘Z twice must
   leave nothing behind.
2. **Every colour swatch opens the picker**: design-token rows (through `setToken(…, { undo:
   true })`) and old colour-style rows (through `setStyle('colors', …)`, exactly as
   `colorstylepicker.jsx` does). An *Edit colour* item goes in each ⋯ menu too, for the keyboard.
3. **Old colour styles stay.** Projects carry them and nodes reference them by name. Listed,
   renamable, deletable, and now editable. Nothing migrates them. Converting a colour style to a
   token is a separate question: write it into the README's §5 candidates, don't build it.
4. The token picker's colour list (the node-side picker) offers the new token. Measure it; don't
   assume.

## 4. Acceptance criteria

1. *New colour* → name → the picker is open, with no extra press. Pick orange, close: the row is
   orange; the project file holds a `color-palette` custom token with that value; **no**
   `metadata.styles.colors` entry was written.
2. A node's colour field lists the new token among the project colours, drawn.
3. Clicking the swatch of an **existing** colour style (count which projects on this machine
   have a non-empty `colors` in `nodegx.styles.json`, and use one) opens the picker. The change reaches a node wearing that style on the
   canvas.
4. Undo for every write in this task: one ⌘Z undoes one visible change.
5. 🔴 The `'#808080'` constant has no callers left, or is deleted.

## 5. Watch for

- 🔴 **Two project formats** ([[a-project-scan-must-read-both-project-formats]]): colour styles live
  in the sidecar `nodegx.styles.json` in the new format. Drive AC3 on a new-format project.
- `ColorPicker` inside a popout inside the Styles panel: [[cdp-click-hits-the-measuring-ghost-inside-a-modal]].
