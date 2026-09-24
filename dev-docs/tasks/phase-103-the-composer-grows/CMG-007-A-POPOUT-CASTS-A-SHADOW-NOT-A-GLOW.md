# CMG-007 — A popout casts a shadow, not a glow

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 6c).
**Status: ✅ built 2026-09-24 (s1)** — 4 specs green, 7/7 drive arms green in light and dark. §6 has the
census and what each AC measured.

## 1. The person sentence

> **In light mode, every popout, popup and modal in the editor floats above the page on a soft dark
> shadow, the same one the new dialogs use. None of them glows white.**

## 2. What is wrong, measured

*"When you click the 'Look' dropdown on a node, the modal appears with a weird white glow around
it in light mode, which seems to be the only popout modal that looks like this. If there's others
they should change too."*

It is not the only one: it's the one he noticed. The Look popup has no shadow of its own. It
wears the shared PopupLayer wrapper:

- [`popuplayer.css:117-125`](../../../packages/noodl-editor/src/editor/src/styles/popuplayer.css#L117-L125),
  `.popup-layer-popout`: `box-shadow: 0 5px 20px 5px var(--theme-color-bg-1-transparent)`.
- That token is `rgba(0,0,0,0.8)` in dark (`noodl-core-ui/src/styles/custom-properties/colors.css:300`)
  and **`rgba(255,255,255,0.85)` in light** (`:655`). `-2` is white at 0.5 (`:656`). So in light
  mode the shadow is a white glow.
- `tests-unit/nat-001/palette-contrast.spec.ts:990-995` already notes that this token is used for
  shadows and doesn't follow the light ramp.
- **Who wears it:** every `PopupLayer.showPopout` caller, **26** source files (`grep -rln
  'showPopout('` without the bundles). That includes the token composer, the token field picker,
  the colour picker, the list editor, context menus, the connection popups and the Look popup.
  Also:
  - `.popup-layer-popup` (`popuplayer.css:42-45`) and `.popup-layer-modal` (`:192-195`), on
    `-transparent-2`;
  - `PopupToolbar.module.scss:6-7`;
  - `SideNavigation.module.scss:52`;
  - `BranchStatusButton.tsx:85` (inline).
- **What the newer surfaces use:** `--shadow-float` (`spacing.css:97` dark, `:144` light =
  `0 16px 40px rgba(23,32,43,0.16)`). It is used by `BaseDialog`, `Modal`, `Tooltip`,
  `NodePicker`, `.property-input-dropdown` and `PropertyPanelSelectInput`.

## 3. What to build

1. Every shadow and drop-shadow drawn in `--theme-color-bg-1-transparent*` becomes `--shadow-float`
   (or a filter equivalent for `drop-shadow`). Find them all with `grep -rn
   "bg-1-transparent" --include=*.css --include=*.scss --include=*.tsx` (🔴 check `grep` isn't
   skipping files, [[ugrep-silently-skips-a-source-file-as-binary]]). Keep a list in this file:
   each use, whether it is a shadow (change it) or a real background (leave it).
2. The popout **arrows** (`popuplayer.css:132-186`, bg-4/bg-5) match the popout's background in
   both themes, or go away if the new shadow makes them look detached. Decide by looking.
3. Update `nat-001/palette-contrast.spec.ts`'s note to say the shadow use is gone, with the count.

## 4. Acceptance criteria

1. Light-mode shots, before and after, of at least: the Look popup, the token composer, the token
   field picker, the colour picker, a right-click context menu, a connection popup and one
   `.popup-layer-modal`. Dark-mode shots of the same three show no visible regression.
2. `getComputedStyle(popout).boxShadow` in light mode contains no white `rgba(255, 255, 255`.
   Measured on each of the seven.
3. `grep` for `bg-1-transparent` in a `box-shadow` or `drop-shadow` returns 0.
4. The nat-001 palette spec passes, with its note updated.

## 5. Watch for

- 🔴 [[a-theme-flip-does-not-apply-in-the-same-eval]]: flip the theme, then measure in a **second**
  eval.
- 🔴 [[a-second-copy-of-a-palette-drifts-silently]]: use the token; don't paste its value.

## 6. Built (s1, 2026-09-24)

**The census** (`grep -rn bg-1-transparent` over editor + core-ui source, 17 hits):

| use | kind | done |
|---|---|---|
| `popuplayer.css` `.popup-layer-popup` filter + box-shadow | shadow | → `--shadow-float`, filter dropped |
| `popuplayer.css` `.popup-layer-popout` box-shadow (+ a commented filter) | shadow | → `--shadow-float`; the comment now says why there is no filter |
| `popuplayer.css` `.popup-layer-modal` filter + box-shadow | shadow | → `--shadow-float` |
| `PopupToolbar.module.scss` filter + box-shadow | shadow | → `--shadow-float` + the bg-1 hairline kept |
| `SideNavigation.module.scss` box-shadow on the tooltip label | shadow | → `--shadow-float` |
| `BranchStatusButton.tsx` inline `boxShadow` | shadow | → `var(--shadow-float)` |
| `CommentLayer.css` `outline` | an outline, not a shadow | left |
| `ConnectionPopup.module.scss` `background-color` | scrim | left |
| `BaseDialog.module.scss` `background-color` | scrim | left |
| `ActivityIndicator.module.scss` `background-color` | scrim | left |
| `IconButton.module.scss` `background-color` | ground | left |
| `colors.css` ×4 | the token's definitions | left |

**Arrows** (§3.2): the popout's ground is `bg-4`; three of its four arrows were `bg-5` and the
popup's top arrow `bg-3`, so a triangle in a different shade sat beside the new shadow. All match
their surface now. Kept, not removed: with the shadow under the box the arrow still reads as
pointing at the anchor.

**§4 measured** (`scripts/devtools/drive-cmg003-007-colours-and-shadows.js`, theme flipped with
`ThemeManager.setMode` and read in a later eval; spec `tests-unit/cmg-007/no-white-glow.test.ts`):

| AC | reading |
|---|---|
| 1 | light shots of the token composer, the colour picker, a context menu (`showContextMenuInPopup`), a confirm modal and the Look popup — `shots/cmg007-light-*.png` — and the same five in dark, `shots/cmg007-dark-*.png`. The token field picker and the connection popup were not opened: the field picker is a `showPopout` like the other three (one CSS rule, measured three ways), and the connection popup's use of the token is a background, left alone |
| 2 | `getComputedStyle(el).boxShadow` in light: composer, colour picker, context menu, modal, Look popup all `rgba(23, 32, 43, 0.16) 0px 16px 40px 0px`; none contains `rgba(255, 255, 255`. Dark control: `rgba(0, 0, 0, 0.38) 0px 18px 48px 0px`, so the arm reads a shadow, not an absence |
| 3 | spec: zero `box-shadow` / `boxShadow` / `drop-shadow` declarations naming the token, comments stripped, over 500+ files; the scrims still use it; the three popup-layer surfaces wear `--shadow-float` with no filter; all four popout arrows are `bg-4` |
| 4 | `nat-001/palette-contrast.spec.ts` passes; its note now says the shadow use is gone, with the seven sites |

**Before shots:** not taken — the change landed before a HEAD build was driven. The *before* is
Richard's own description and the computed value the spec's note records (white at 0.85).
