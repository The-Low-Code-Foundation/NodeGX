# CMG-009 — A token in a field reads as a token

**Opened 2026-09-24** from Richard's drive of P102 (README §2, findings 10 and 11).
**Status: 📋 ready.** CMG-010 puts its pencil and *Show in Styles* on the chip this task builds.

## 1. The person sentence

> **Someone looking at a node's fields can tell at a glance which ones wear a style and which
> style, without hovering, and every field that can wear one has the same button to pick one.**

## 2. What is wrong, measured

*"I've just seen a group node where the 'padding' value is --var(something) and the preview of the
value of the input is ... and when you click it, you get about 2 characters wide of the value
inside the input, since it's designed for a number, and it's very hard to navigate around."*

*"How come some node prop fields have that nice {.} button on the right so you can pick a token,
but a lot of them don't, like padding which I assume would have style tokens too??"*

**Which fields offer tokens.** Decided by port name alone:
- `fieldOffersTokens` ([`tokenFieldPopout.ts:45-47`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/DataTypes/tokenFieldPopout.ts#L45-L47))
  checks `PORT_TOKEN_RULES` (`TokensForPicking.ts:140-163`).
- The rules cover letter spacing, line height, font size and weight, font family, the shadow
  token, radii, border widths, **padding and margin** (`:156`), gaps, `*Spacing`, icon size and
  width/height. The refusals are listed at `:127-131`.
- Four controls attach the picker:
  - `NumberWithUnits` (`NumberWithUnits.ts:200-218`, button drawn in `NumberUnitInput.tsx:188-207`);
  - `Dimension` (`Dimension.ts:127-133`);
  - `BasicType` (`:183-221`, only `boxShadowToken`);
  - `MarginPaddingType` (`:234`, `:259-274`).
- Colour and font have their own token lists.

**So padding does take tokens**, but in the padding box
([`MarginPaddingInput.tsx:266-292`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput.tsx#L266-L292))
the ↕/↔ glyph (↑↓←→ when expanded) *is* the button. The comment says a ~60px field *"has no room
for a second control"*. When a side holds a token, the glyph only changes colour
(`MarginPaddingInput.module.scss:184-200`). Nothing says the glyph can be pressed. Richard, who
has used `{.}` elsewhere, concluded padding had no tokens.

**How a token reads in the padding box.**
- The grid is `minmax(0,1fr) minmax(0,1fr) 26px` (`MarginPaddingInput.module.scss:12-14`), so
  about 60px per field at a 328px panel, with the glyph taking ~16px of it.
- At rest the field shows `tokenLabel()` = `--space-4` (`marginPaddingEdit.ts:322-346`),
  monospace with ellipsis (`.Value`, scss `:104-116`): **`…`**.
- On focus it shows `var(--space-4)` (`editTextOf`, `:349-353`) in the same ~40px input: **about
  two characters.**
- The full value is only in the `title` tooltip. Scrubbing is off while a token is set (`:302`).

**Elsewhere.** `NumberUnitInput` shows `var(--space-4)` verbatim in an input whose minimum width is
`calc(3ch + 8px)` (`NumberUnitInput.module.scss:46-57`). Only the `{.}` turning primary colour
(`.TokenButton.is-token`, `:158-161`) says it's a token. The shadow token field (`BasicType`)
shows raw `var(--shadow-md)` text.

**No token chip exists** (`grep` TokenChip/TokenPill/tokenBadge: nothing). The closest shapes:
- `BindingChip` (`noodl-core-ui/src/components/property-panel/BindingChip/BindingChip.tsx:47`,
  FB-018's chip for a wired port);
- `BoundField` (`MarginPaddingInput.tsx:148-170`, `.Field.is-bound`), which already swaps a
  padding side for a clickable chip when the edge is wired;
- the picker's own `TokenRow` (`TokenFieldPicker.tsx:79`).

## 3. What to build

1. **A token chip.** When a field holds exactly one `var(--x)`, it renders as a chip, not as text
   in an input: the token's short name (`space-4`, `shadow-md`) and, where it fits, its resolved
   value (`16px`, drawn for a shadow), in the token colour. **Click** opens the token picker on
   that field; the chip also carries **✕** or *Detach*, which puts the resolved number in the
   field. Typing a number into a chip field replaces the token (one undo step). Build it once in
   `noodl-core-ui` and use it in all four controls.
2. **In the padding box**, the chip takes the whole side field, the way `BoundField` does for a
   wired edge. If `space-4` doesn't fit, show the resolved value with the token mark and the name
   in the tooltip. Drive it at 328px and pick. It must never show `…` alone, and it must never put
   raw `var(…)` in a 40px input.
3. **One button that looks the same everywhere.** Every field that `fieldOffersTokens` accepts
   shows the same `{.}` affordance. In the padding box, either the glyph gets a visible `{.}`
   treatment on hover/focus, or the box gets one `{.}` per axis. The test is Richard's question:
   someone who has seen `{.}` once finds it on padding without being told.
4. **Census, as a spec:** for each widget kind, a port that `fieldOffersTokens` accepts renders a
   visible token button, and a port holding a token renders a chip. Graded over the node catalog,
   not over four hand-picked ports.

## 4. Acceptance criteria

1. **Richard's drive:** the Group from finding 10 (padding holds a `var(--space-*)`). At rest you
   can read which token it is without hovering. Clicking opens the picker, not a 2-character input.
2. The same on a `NumberWithUnits` field (font size) and on `boxShadowToken`.
3. Detach puts the resolved number in; ⌘Z brings the token back (one step each way).
4. A shot of the padding box expanded (four sides, mixed tokens and numbers) at 328px: every
   side readable.
5. Someone who has not used the padding box finds its token button: the glyph or `{.}` has a
   visible affordance, measured as a hover/focus style that differs from rest (computed style),
   plus the drive.
6. The census spec passes, and its counts go in this file.
7. 🔴 Values that aren't exactly one `var()` (for example `calc(var(--space-4) * 2)`) stay text.
   Nothing is rewritten. That is the round-trip rule (README §7).

## 6. Built (s1, 2026-09-24)

**One chip, five controls, not four.** `TokenChip` (`noodl-core-ui/src/components/property-panel/TokenChip/`)
draws a token as what it is: the short name (`space-4`) in the token colour with the `{·}` mark,
the resolved value (`16px`) where there is room, ✕ to detach, and the full name + value in the
tooltip. It imports no `Icon`, so the plain-Node runner renders it. The controls that draw it
when a field holds exactly one `var()`:

| control | where the chip goes | Detach |
|---|---|---|
| `NumberWithUnits` / `Dimension` (`NumberUnitInput`) | in place of the value box and the unit; the `{·}` button stays | resolved text through the field's own parser → `{ value, unit }`, one undo step |
| the padding box (`MarginPaddingInput.BoxField`) | compact, in place of the ~40px text box | `detachedValueOf` (`marginPaddingEdit.ts`, pure) → every comp the field owns, one undo step |
| `BasicType` (`boxShadowToken`, and the unitless `Circle.cornerRadius` / `strokeWidth`) | in place of the text input; a shadow draws small on a light card | none — the shadow port takes a token or nothing; a unitless port has no unit to detach into |
| **the font picker row** (`PickerTypeView` → `PickerTextInput`) | in place of the text box | resolved family through `commit`, one undo step |

The fifth row is the census's finding: `fontFamily` takes the family tokens (HLT-012,
`fontItems.ts`) and every new Text is stamped with `var(--font-sans)` — twelve ports in the
catalog where a token read as raw text through a control §2 did not list.

**"Where it fits" is measured, not guessed.** The first drive (a 300px panel, ~45px per padding
side) drew the chip at 25px reading `{} ✕`: the mark and the ✕ were fixed-width and the name had
`min-width: 0`, so the name was what vanished. The chip now measures its parts' natural widths
(hidden spans, so nothing measured depends on what is shown) and the **name never shrinks**; the
value, the inline ✕ and the mark give way in that order. Compact (the padding box): one text —
the name when it fits, else the resolved value — and the ✕ over the right edge on hover.
`data-token-shows` says which. At the inspector's 328px a padding side shows **`16px`** with
`--space-4 = 16px` in the tooltip; at wider panels, the name. (§3.2's rule; Richard's read of
whether the value-first fallback is enough is CMG-011's.)

**One `{·}` everywhere** (§3.3). The padding glyph — already the token button — gains the `{·}`
mark on hover and keyboard focus: the arrow's opacity goes 1 → 0 and the mark's 0 → 1 (computed,
measured), the box's rest state is exactly what CHR-009 drew, and the tooltip says *Pick a design
token*. Nothing new takes width in the field.

**Only exactly one `var()` is a chip** (AC7). `isTokenReference` decides in every control; the
padding box's `isToken` (`typeof === 'string'`, which also disables the scrub) is no longer
enough on its own: the first drive drew a chip titled `--calc(var(--space-4) * 2)` before the
guard. A `calc()`, two tokens or a token with a suffix stays in its text box, verbatim, and the
model is not rewritten.

**The census** (§3.4, `tests-unit/cmg-009/token-chip.test.tsx`, over `node-catalog-enriched.json`):
every port `fieldOffersTokens` accepts must reach a control that draws the chip; a hole fails by
name. Before the font row was added the census listed 12 holes (`*.fontFamily → font`).

| | count |
|---|---|
| ports that offer tokens | **448** |
| … drawn by `numberWithUnits` | 249 |
| … the padding box | 148 |
| … `dimension` | 28 |
| … the font picker row | 12 |
| … `basic` (`boxShadowToken` ×9, `Circle.cornerRadius`, `Circle.strokeWidth`) | 11 |
| holes | **0** |
| fields that could hold a token but no scale fits (HLT-012 AC3: rotation, breakpoints, shadow blur/spread, …) | 171 |

**§4 measured** (`scripts/devtools/drive-cmg009-chip.js` on a fresh copy of *CMP-001 Composer
Drive*, `CMG Drive Looks J`, inspector 327px; 24/24 arms):

| AC | reading |
|---|---|
| 1 | a Group's `paddingLeft = var(--space-4)`: the side is a chip (`data-token-chip`, 39×20px) reading `16px` whole, `fits: true`; title `--space-4 = 16px — a design token. Press to pick another, ✕ to detach.`; no `<input>` in that side; a press opens `[data-test="token-field-picker"]`. Shots `shots/cmg009-ac4-padding-328.png`, `shots/cmg009-ac1-picker-from-chip.png` |
| 2 | Font Size `var(--text-lg)`: chip `text-lg 18px ✕` (129px, `name+value`), no value box, no unit, the `{·}` still beside it; a press opens the picker. Font Family `var(--font-sans)`: chip `font-sans` (151px) with the stack in the tooltip and ✕. `boxShadowToken = var(--shadow-lg)`: chip `shadow-lg` with the card's `box-shadow` = the resolved shadow, no text box; a press opens the picker. Shots `shots/cmg009-ac2-font-size-chip.png`, `shots/cmg009-ac2-shadow-chip.png` |
| 3 | ✕ on the padding chip → `paddingLeft = { value: 16, unit: 'px' }`, the side is a number box reading `16`, undo +1; ⌘Z → `var(--space-4)`, undo back to the start, the chip drawn again. ✕ on Font Size → `{ 18, px }`, +1; ⌘Z → `var(--text-lg)` |
| 4 | the box expanded with `8` / `12%` / `16px` (`--space-4`) / `32px` (`--space-8`): every side readable, `shots/cmg009-ac4-padding-328.png` |
| 5 | `token-button-padding-top` at rest: mark opacity `0`, arrow `1`; pointer on it (CDP `mouseMoved`): `:hover` true, mark `1`, arrow `0`, title *Pick a design token*; pointer away: mark `0`. Shot `shots/cmg009-ac5-glyph-hover.png` |
| 6 | above; 448 / 0 holes |
| 7 | `paddingLeft = calc(var(--space-4) * 2)`: no chip, the text box shows it verbatim, the model still holds the string |

**Found on the way.**
- `resolveTokenText` (the chip's value) is asked on every render, and `rel-014` renders the real
  `Dimension` view: an unguarded `require('@noodl-models/projectmodel')` reddened 26 of its arms at
  `bugtracker.ts:246`. Guarded; `undefined` under the runner.
- `Page.og:image:width` / `og:image:height` are string meta ports matched by HLT-012's
  `/(width|height)$/` rule, so they offer the spacing scale (README §5).
- The fixture's Group already held `columnGap = var(--space-3)`: a chip nobody asked for, in the
  first shot.
