# HLT-005 — The comment that overflows

✅ **BUILT 2026-09-21 (s6) — 0px of reachable horizontal scroll on a driven session in all four
cells, control 1,253px and 497px on the identical build.**
[verdict](./verdicts/HLT-005/2026-09-21/VERDICT.md) · `scripts/devtools/drive-hlt005-comment.js`

🔴 **§2 measured TRUE — the first task file in this phase that did.** Five before it were
materially wrong and the correction was the work each time; every claim in §2 below held under
measurement. Two additions rather than corrections are in the verdict: `min-width` already computed
to `0px` on the broken build (and the ⚠️ below is exactly right about why that changed nothing),
and the mirror already carries `overflow-wrap: break-word`, which is §5's landmine seen from the
other side — it breaks a word once the box is bounded and does nothing to the box's own width.

**The fix, both halves:** `NodeComment.tsx:145` lost the inline `style`; `.property-comment-bar`
gained `flex: 1` **and** `min-width: 0`. It moved to the stylesheet deliberately — an inline style
wins the cascade, which is why no rule in `propertyeditor.css` could ever have governed this
element, and why the row could sit in six "Left" lists without being closable from the file that
describes it.

**One line of CSS-in-JS. Filed six times in P92 CHR-009's "Left" lists, never once as an acceptance
criterion, and CHR-009 closed on 2026-09-18 with it still there.**

## 1. The person sentence

> **Someone typing a long line into a node's comment sees it wrap inside the panel, the way every
> other field in that panel does.**

## 2. What it is — the mechanism, measured

The comment bar is the **sole child** of a `ScrollArea` (`propertyeditor/index.tsx:223`), whose
`.Container` is a **row** flex container (`noodl-core-ui/.../ScrollArea.module.scss:39-49`). The bar
opts out of filling it:

```tsx
// editor/src/.../NodeComment.tsx:145
<div className="property-comment-bar" style={{ flex: '0 0 auto' }}>
```

`flex: 0 0 auto` is grow 0 / **shrink 0** / basis auto. Shrink-0 means it is sized to its own
**max-content** width and forbidden to come back to the scrollport. The content driving that width
is the hidden mirror `.property-comment-sizer` (`NodeComment.tsx:176`) — `white-space: pre-wrap`
with **no `width` or `max-width`** (`propertyeditor.css:681-703`), whose max-content width is the
full unwrapped longest line. The textarea then follows at `width: 100%` of that inflated box
(`propertyeditor.css:705-712`).

⚠️ **`> * { min-width: 0 }` at `ScrollArea.module.scss:47` cannot help** — it relieves the automatic
minimum size, and an item with `flex-shrink: 0` never shrinks anyway. A fix that adds `min-width: 0`
and stops there will change nothing.

✅ **Vertical growth is already capped** — `.property-comment-sizer { max-height: 184px }`
(`propertyeditor.css:696`). Horizontal has no equivalent. **The control is in the same file**: the
Properties tab uses `flex: 1` (`propertyeditor/index.tsx:206`) and does not overflow.

## 3. Scope

**In:** the comment bar's horizontal sizing.

**Out:** the comment feature's design, the tab strip, the 184px vertical cap, anything else in the
property editor. P92 owns that panel's look.

## 4. Acceptance criteria

1. ✅ **(person)** A node comment containing a line longer than the panel is wide wraps inside the
   panel. No horizontal overflow at the panel's minimum width **and** at its maximum.
   **Measured: bar 224px in a 224px scrollport at the 240px minimum, 980px in 980px at the 996px
   maximum, `scrollLeft` 0 in all four cells; control 1,489px / 1,253px and 1,489px / 497px.**
   ⚠️ The fixture had to be 264 characters — at 139 the line is 796px and *fits* the widest panel,
   so the control did not fire there and the run scored it a failure. A criterion that says min
   AND max needs a fixture that beats the max.
2. ✅ A spec asserts the bar's rendered width does not exceed its scrollport for a long single-line
   comment. 🔴 A mutant restoring `flex: '0 0 auto'` is **red** on it.
   🔴 **Split, and the verdict says why: jsdom has no layout engine**, so a rendered-width
   assertion in `test:main` passes identically on both builds. The width is measured by the drive,
   in real Chromium layout; `tests-unit/hlt-005/commentBarWidth.test.ts` (11 specs) grades the flex
   algorithm's deciding branch as arithmetic over the **real declarations read from the real
   files**, calibrated by a first `describe` that requires the shipped declaration to report the
   overflow the drive photographed. **The mutant was run, not argued** — it turns exactly the three
   AC2 specs red and leaves the calibration and the anchors green.
3. ✅ **The vertical behaviour is unchanged** — two lines 48px, thirty lines 184px, cap intact, and
   the textarea still matching the mirror to the pixel. Identical on both arms. The mirror was not
   touched, which is what §5's landmine is for.
4. ✅ Screenshots both themes, both panel widths, in
   [`verdicts/HLT-005/2026-09-21/`](./verdicts/HLT-005/2026-09-21/) — eight frames,
   `hlt005-{fixed,control}-{dark,light}-{min,max}.png`.
5. ✅ `typecheck:editor` 0, `typecheck:editor-tests` 0; `test:ci` at the floor (3036 specs, 8 **by
   name**, seed 30414); **and `test:main` 529/529 + 8450/8450** — README §7 says both, every time.
   `lint:ci` 876 vs 3916.

## 5. Landmines

- 🔴 **`overflow-wrap: break-word` does not reduce max-content width.** If the fix is attempted on
  the mirror, this is the trap — the element still *measures* as the unwrapped line.
- ⚠️ **This lived in a "Left" list six times.** It is cheap; that is exactly why it was never
  anybody's criterion. It has one here now.
- 🔴 **`root.querySelector` finds the WRONG FrameDivider.** A `FrameDivider` renders its own
  `Divider` after `Container2`, and `Container2` holds the nested one — so the nested divider is
  first in document order. This drive dragged the canvas/preview split while reporting the panel's
  "min" and "max", and printed four readings taken at one width. Take the **direct child**.
- 🔴 **Editing editor `src/` while a drive holds the property panel open crashes it.** HMR remounts
  `PropertyEditor` into `Cannot read properties of undefined (reading 'type')` and the error
  boundary takes the whole side panel. A hot-reload artefact, ruled out by a clean reload driving
  34/34 on the same build — but a drive taken straight after a source edit is reading a renderer
  that matches neither build.
