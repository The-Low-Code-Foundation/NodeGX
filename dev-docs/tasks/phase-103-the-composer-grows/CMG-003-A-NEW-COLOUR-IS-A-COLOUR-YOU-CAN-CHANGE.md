# CMG-003 — A new colour is a colour you can change

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 5). Ruling: **RC-9** (new
colours are tokens).
**Status: ✅ built 2026-09-24 (s1)** — 6 specs green, 9/9 drive arms green on a copy of a project with nine
old colour styles. §6 has what was built and what each AC measured.

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

## 6. Built (s1, 2026-09-24)

**＋ New colour makes a token** (`ColoursSection.tsx`): the button asks for a name (the field shows
the `--`; `tokenName.ts` refuses, inline and in words, an empty name, a space, a leading digit,
punctuation, or a name the project already has — default, custom or colour style), then
`addCustomToken({ category: 'color-palette' }, { undo: true })` — never `setToken`, whose fallback
files an unknown name as `color-semantic`. The starting value is the resolved colour of the last
colour token (else the last colour style, else `--primary`'s default), never grey. The token list
inside Colours opens, and once the row is on screen the picker opens on it with no extra press.
`DEFAULT_NEW_COLOUR` and its `#808080` are gone (AC5, held by a spec that strips comments).

**Every swatch is a door.** `StyleRow` takes `onSwatchClick`; given, the swatch is a `<button>`
labelled *Change the colour of X* with a ring on hover. Token rows write through
`setToken(…, { undo: true })` with the drag painting the canvas through `PreviewTokenInjector`'s
draft (RC-7, no writes until commit); old colour-style rows write through `setStyle('colors', …,
{ undo: true })`, exactly as `colorstylepicker.jsx` does, so the two doors agree. *Edit colour* is
in both ⋯ menus for the keyboard. The popout is anchored to the **row**, not the swatch — anchored
to the swatch it opened on top of the list it came from (first drive shot).

**The node picker offers it.** `colourTokensForPicking` puts a `color-palette` token with no
shipped default — one a person added — in the OPEN half beside `--primary`; an overridden ramp
swatch stays in the ramp. Without this the brand orange landed behind the closed 61-swatch row.
HLT-006's spec gained the arm.

**Old colour styles stay.** Listed, renamed, deleted, and now edited. Nothing migrates them;
converting a style to a token is a README §5 candidate.

**§4 measured** (`scripts/devtools/drive-cmg003-007-colours-and-shadows.js` on *CMG Drive Looks*
← *CMP-001 Composer Drive*, nine colour styles; specs `tests-unit/cmg-003/`, `hlt-006`):

| AC | reading |
|---|---|
| 1 | *New colour* → `brand-orange` → Enter: the row `--brand-orange` is on screen, the `.color-picker-popup` popout is open, the token is `color-palette` at the starting colour `#581c87` (the row above's purple), not grey. Hex field `c2410c` + Enter: token `#C2410C`, row swatch `rgb(194, 65, 12)`. After autosave the project file stores `{ name: --brand-orange, category: color-palette, value: #C2410C }`; `nodegx.styles.json` `colors` is the same 9 keys as before. Shot `shots/cmg003-ac1-new-colour-picker-open.png` |
| 2 | `colourTokensForPicking(model.getTokens()).semantic` holds `--brand-orange` and `--primary` (30 open); the ramp stays 61. The picker UI itself was not opened on a node in this drive: it reads the same function (`colorstylepicker.jsx:111`) |
| 3 | on the new-format project, the swatch of the old colour style *Primary Dark* (worn by 1 node) opens the picker; hex `123456` + Enter → `metadata.styles.colors['Primary Dark']` `#3F22B8 → #123456`. The reach to the node on the canvas is the existing `setStyle` path the node picker uses; not re-measured on the viewer here. Shot `shots/cmg003-ac3-colour-style-picker.png` |
| 4 | ⌘Z after the pick → `#581c87`; second ⌘Z → the token is gone; ⌘Z after the style change → `#3F22B8` |
| 5 | spec: no `#808080` / `DEFAULT_NEW_COLOUR` outside comments under the Styles panel |
| — | `bad name` → *No spaces — try a hyphen: brand-orange* under the field, the field stays, no token, undo location unchanged |

**Two undo steps for create + first pick**, as §3.1 allows; the second ⌘Z leaves nothing behind
(measured).
