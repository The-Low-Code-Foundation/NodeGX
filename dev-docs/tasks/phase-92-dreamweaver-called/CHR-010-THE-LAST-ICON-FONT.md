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

## 6. What §2–§5 got wrong, re-derived at HEAD (s32, 2026-09-18)

Measured before building, not read. Six premises were stale or false.

1. **The census was 32 uses in 16 files; it is 23 in 13.** CHR-009's slices retired nine on their
   way past. The glyph list was stale in both directions: `fa-code` and `fa-check` are gone from
   source entirely (they survive only in the gitignored `index.bundle.js`, which a repo-wide grep
   counts — the same miscount CHR-003 §2 made), while `fa-exclamation-triangle` was never listed.
2. **§3.2 is unnecessary work.** "Expect ≤ 4 missing `IconName`s" — there are **none**. All ten
   glyphs the 23 sites need already exist, with SVGs on disk: `Pencil`, `Trash`, `Plus`, `Search`,
   `CaretDown`, `CaretUp`, `Close`, `DotsThreeHorizontal`, `WarningTriangle`, `ArrowRight`. No new
   art, no `LICENSES.md` change.
3. **§2 names one `<link>`; there are two.** `frames/viewer-frame/index.html:6` links Font Awesome
   as well, and the viewer frame uses **no** FA glyph at all — it was pure boot cost on the surface
   that renders the user's app.
4. **AC3's spec does not exist.** "there is a spec; keep it green" — nothing outside `Icon.tsx`
   referenced the icon directory. The invariant held (168 `IconName`s, 170 SVGs, **0** names without
   a file; 2 orphan SVGs), but nothing guarded it. Written now as
   `tests-unit/chr-010/iconInventory.test.ts`, 3 tests, 3 mutants red. It matters more than a tidy
   count: a name with no file makes `Icon` render an **empty span**, silently — CHR-008 §10.4's
   "drew nothing ≠ never ran" in a second place.
5. **AC2's three strings would have missed the two hardest dependencies**, both found by widening
   the gate's population rather than by the grep:
   - `popuplayer.ts` held FA through `classList.add('fa-share')` — a quoted glyph token, never
     adjacent to the word `fa`. It had **three** FA dependencies, not the one `fa fa-` finds: a bare
     `fa` class on the drop indicator and two glyph classes toggled at runtime.
   - `PortGroup.tsx` wrote ``className={`fa ${x ? 'fa-caret-up' : 'fa-caret-down'}`}`` — the pair
     split by an interpolation. §2 listed the file; a `fa fa-` recount dropped it.
   ⇒ the gate matches four shapes, not three. **A gate's population is exactly what its regex
   matches** ([[a-gate-can-have-a-hole-shaped-like-the-defect]], third time in this phase).
6. **§5's first trap is inverted.** There is no jest `moduleNameMapper` stub for `Icon` — CHR-008
   never added one, and 23 specs carry a per-file `jest.mock` instead. It did not bite: none of the
   13 converted files is imported by a spec that renders it. The new spec reads `Icon.tsx` as
   **text** for exactly this reason — importing it needs the stub, and the stub is what would hide
   the defect the spec exists to catch.

**Two layout facts the conversion turned up**, both invisible to a passing number:

- `Icon` is `display: block`. Four containers relied on inline flow (`sidebar-panel-edit-button`,
  `sidebar-panel-footer-button`, `queryeditor-add-filter-group-inner`, and the drag overlay's
  inline `<i>`). Each is now explicitly centred, with the hardcoded `marginRight: '5px'`/`'10px'`
  at the call sites replaced by a token `gap`. The drag overlay keeps inline flow via an
  `inline-flex` host, because blockifying it would have dropped the drag label onto its own line.
- 🔴 **A fixed-size `Icon` inside a padded box loses the padding to `border-box`.**
  `.queryeditor-caret-icon` had `padding-left: 15px`; with the global `box-sizing: border-box`
  (`style.css:26`) and `Icon`'s 12px width, the whole box would have gone to padding and the glyph
  would have rendered **zero wide**. Now a margin. Nothing would have reported this but the picture.
