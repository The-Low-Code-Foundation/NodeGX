# CHR-010 — The last icon font

Font Awesome 4.7 is linked on every window for 32 uses, 22 of them in the property panel. It is
the one place two icon systems share a column, and the reason a 32 KB stylesheet loads before the
launcher paints.

## 1. The person sentence

**Every glyph in the property panel is drawn from the same set, at the same stroke, in the same
colour as its text — and the editor loads one icon system.**

## 2. What the code says (audit, re-read at HEAD)

- `editor/index.html:6` links `assets/lib/fontawesome/css/font-awesome.min.css`.
- **32 `fa fa-*` uses in 16 files editor-wide.** Property panel: **22 in 12 files** —
  `iconpicker.jsx`, `avatarpicker.tsx`, `PropListInput.tsx`, `StringListInput.tsx`,
  `NumberUnitInput.tsx`, `colorstylepicker.jsx`, `variantseditor.tsx`, `PickVariantPopup.tsx`,
  `PickVariantItem.tsx`, `QuerySortingEditor.tsx`, `RuleDropdown.tsx`, `Pages.tsx`. Glyphs:
  `fa-plus` ×6, `fa-trash-o` ×2, `fa-trash` ×2, `fa-search` ×2, `fa-pencil-square-o` ×2,
  `fa-edit` ×2, `fa-code` ×2, `fa-ellipsis-h`, `fa-close`, `fa-check`, `fa-caret-down`.
  Elsewhere: `componentports/ComponentPortsView.tsx`, `TextStylePicker.jsx`,
  `popuplayer.ts:338,1240-1241`, `ConnectionPopup/PortGroup.tsx`.
- `variantseditor.css` styles `.variants-header .fa` — a stylesheet coupled to the font's class.
- `Icon` (`noodl-core-ui/src/components/common/Icon/Icon.tsx`): 172 `IconName`s over 170 SVGs,
  `currentColor`, sizes `tiny 12 / small 14 / default 16 / large 20`. Every glyph FA provides
  here has an `IconName` equivalent or a trivial one to add under `ICONOGRAPHY.md`'s rules
  (16 grid, 1.5 stroke, round caps).
- The hex ratchet permanently exempts the FA directory; `css-icon-url-ratchet.js` gates `url()`
  icons at zero and does not see font glyphs.

## 3. Scope

1. Convert the 22 panel uses to `<Icon name=… size=…>`; then the 10 others. `popuplayer.ts` is
   imperative — it gets the SVG string the way `CanvasIcons.ts` already does, or a tiny helper
   that renders an `Icon` into a detached root, whichever the file already has a pattern for.
2. Add the missing `IconName`s (expect ≤ 4: `trash`, `pencil`, `code`, `caret-down` likely exist —
   check the enum first) drawn to the house style; `LICENSES.md` updated.
3. Delete `.variants-header .fa` and any `.fa`-keyed rule; delete `assets/lib/fontawesome/`;
   remove the `<link>` from `index.html`; remove the FA exemption from `.hex-color-baseline.json`.
4. A gate: `scripts/icon-font-gate.js` (or a clause in `css-icon-url-ratchet.js`) that fails on
   any `fa fa-`, `class="fa`, or `font-awesome` string under `packages/*/src`. Zero, not a ratchet.

Out: redrawing the ~98 legacy filled glyphs (P23 UIX-010) and node-type icon coverage (UIX-014).
The user-app Lucide webfont (`starter-project/noodl_modules/lucide-icons/`) — a different
system, correctly separate.

## 4. Acceptance criteria

1. **(person)** Open a node with a `proplist` (the `+` and trash glyphs), a variants editor and
   the icon picker: every glyph is the same stroke weight as the chevrons and recolours with the
   theme (flip theme; nothing stays black). Screenshots into `verdicts/CHR-010/<date>/`.
2. `grep -rn "fa fa-\|font-awesome\|\.fa\b" packages/noodl-editor/src packages/noodl-core-ui/src`
   is empty; the renderer's boot network log shows no `font-awesome` request; the gate from §3.4
   is green and **reverted arm**: add one `<i class="fa fa-plus">` and it is red naming the file.
3. `Icon`'s `IconName` count and the SVG file count still agree (there is a spec; keep it green).
4. `test:ci` at the floor; `npm run colors` green with the FA exemption removed from the baseline
   file (its count should not change — FA's CSS was excluded, not counted).

## 5. Traps

- 🔴 **`Icon` is `require.context`-coupled and breaks `tests-unit`.** CHR-008 adds the jest
  `moduleNameMapper` stub; this task depends on it. Without it, converting `PropListInput` makes
  `fb-018/bindingChipRows.test.tsx` fail **to run**, which reads as a pass in some runners
  ([[this-jest-can-grade-a-react-component]] — "drew nothing" ≠ "never ran").
- ⚠️ **`IconSize` was inert at 441 call sites until POL-013.** Check that the size you pass is
  the size that renders — measure one, do not trust the prop.
- ⚠️ `popuplayer.ts:1240-1241` draws a glyph into a string template. A `currentColor` SVG in a
  string needs the surrounding element to set `color`; the FA glyph inherited it for free.
