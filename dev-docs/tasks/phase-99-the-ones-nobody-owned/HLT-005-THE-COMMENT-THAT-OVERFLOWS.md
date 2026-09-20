# HLT-005 — The comment that overflows

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

1. **(person)** A node comment containing a line longer than the panel is wide wraps inside the
   panel. No horizontal overflow at the panel's minimum width **and** at its maximum.
2. A spec asserts the bar's rendered width does not exceed its scrollport for a long single-line
   comment. 🔴 A mutant restoring `flex: '0 0 auto'` is **red** on it.
3. **The vertical behaviour is unchanged** — a control in the same spec: growth still happens and
   still stops at 184px. A fix that caps width by breaking the mirror's height measurement trades
   one defect for another.
4. Screenshots both themes, both panel widths, in `verdicts/HLT-005/<date>/`.
5. `typecheck:editor` 0; `test:ci` at the floor.

## 5. Landmines

- 🔴 **`overflow-wrap: break-word` does not reduce max-content width.** If the fix is attempted on
  the mirror, this is the trap — the element still *measures* as the unwrapped line.
- ⚠️ **This lived in a "Left" list six times.** It is cheap; that is exactly why it was never
  anybody's criterion. It has one here now.
