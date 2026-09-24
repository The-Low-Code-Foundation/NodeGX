# CMP-002 — Shadows

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): codec `token-codecs/shadow.ts` (AC1, AC2, AC4, AC5 as specs in `tests-unit/cmp-002/`, the four Playful shadows visual with a *Custom* chip); composer `ShadowComposer.tsx`; driven (AC3: slide, Apply, one ⌘Z; the Dark ground toggle exists — AC6's two shots are CMP-007's look).** Depends on CMP-001. Rulings: RC-2, RC-6.

## 1. The person sentence

> **Someone makes their cards float a bit higher by picking *Lifted*, then makes it a touch softer
> with a slider — and never sees `0 10px 15px -3px rgb(0 0 0 / 0.1)`.**

## 2. What to build (mockup: *Shadow composer* board, minus the drag pad)

- **Presets:** None, Subtle, Soft, Lifted, Floating, Dramatic, Inner, and Glow (one layer in a
  project colour). The first seven are **exactly** the seven defaults' values (`--shadow-none` …
  `--shadow-inner`), so a default token opens with its preset lit.
- **Layers:** a list, with *Add layer* and remove. Each row describes its layer in words
  (*"falls 4px down · soft · 10% dark"*).
- **Per layer:** Softness (blur), Size (spread), Across (x), Down (y) as sliders with plain labels
  (*"4px down"*, *"centred"*); **Colour** from Black, White and the project's colours (RC-2);
  **Darkness/Strength** on Black and White; **Inside the box** switch.
- **Preview:** a card and a button wearing the shadow, both updating live.

## 3. The codec

- Split on **top-level** commas only (a `rgb(…)` has commas inside it).
- Each layer: optional `inset`, 2–4 lengths, one colour, in that order.
- **Colours the controls can pick** (RC-2): `var(--x)`, and black/white as `rgb(0 0 0 / a)` /
  `rgb(255 255 255 / a)` in the **space-separated** form the defaults use. The Strength slider
  edits `a`.
- **Colours the codec keeps** (RC-6a): any other single colour token, once the lengths and
  `inset` are taken off the layer: `#hex`, `rgb()`/`rgba()`/`hsl()` with balanced parentheses,
  a named colour, `color-mix(…)`. Stored as a literal, chip reads *Custom*, written back verbatim.
  🔴 The Playful Look's `rgb(139 92 246 / 0.15)` **must** come through this path as *visual*; it
  is the first spec to write. ⚠️ A kept `rgb(… / a)` literal still has a readable alpha; do **not**
  offer the Strength slider on it in this phase, because writing it back means re-serialising the
  literal and that is where a rewrite creeps in. P103 can do it with a spelling-preserving writer.
- Lengths: `0` or `<n>px`, negative allowed (spread is negative in two defaults).
- `none` → zero layers.
- **Shape the codec refuses** → `null` → text mode: `em`/`rem`/`%` lengths, the colour before the
  lengths, more than four lengths, two colours, a layer with no colour, anything unbalanced.
  CMP-006 counts how often each happens on real projects. If one is common, the codec learns the
  spelling **and writes it back unchanged**, never converted.

## 4. Acceptance criteria

1. All 7 default shadows decode, and each re-encodes **byte-identical** (a spec).
2. Picking each preset on a fresh project writes exactly that preset's string (a spec), and the row's
   preview and words change (a drive shot).
3. On a drive: open `--shadow-md`, pick *Lifted*, make it softer, Apply. The card on the canvas
   that wears `--shadow-md` changes, and one ⌘Z puts it back.
4. **The four Playful shadows** decode as visual with the colour chip reading *Custom*, every
   slider live, and re-encode **byte-identical** (a spec). A hand-written `0 2px 4px rgba(0,0,0,.1)`
   does the same. Slide Softness on the Playful one and Apply: only the blur changed in the saved
   string; the purple literal is untouched.
5. A shadow in `em` (`0 0.5em 1em rgb(0 0 0 / 0.1)`) opens in text mode with *Replace with a
   preset* offered, and saves through the text box.
6. The preview's **Dark** ground shows a black shadow that is invisible on it and a white one that
   is not (one shot each): the toggle exists for exactly this.
