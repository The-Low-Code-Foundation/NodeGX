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
