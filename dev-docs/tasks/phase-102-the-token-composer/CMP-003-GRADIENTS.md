# CMP-003 — Gradients

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): codec `token-codecs/gradient.ts` (AC1, AC4–AC6 as specs in `tests-unit/cmp-003/`; the agent's `to right, #ff0000, #0000ff` visual with kept literals and keyword direction); composer `GradientComposer.tsx`; row words *Radial · Primary → Foreground · glows from the top left* driven (AC3). AC2's Apply on the canvas: same path as CMP-002 AC3, driven there.** Depends on CMP-001. Rulings: RC-2, RC-6.

## 1. The person sentence

> **Someone gives their hero section a soft glow from the top corner by picking *Spotlight*,
> swapping one colour for their accent and pulling the glow further in — without knowing what
> `radial-gradient(90% 120% at 20% 0%, …)` means.**

## 2. What to build (mockup: *Gradient composer* board, minus dragging)

- **Presets:** Brand, Deep, Spotlight, Surface, Scrim (**exactly** the five defaults' values), plus
  two new ones (Glow, Horizon) built only from project colours and Clear.
- **Kind:** Linear / Radial, with one line of help each.
- **Linear, direction:** the eight arrow buttons (*"Towards the bottom right"*) and an Angle slider.
- **Radial, centre:** a *Centre* list (Top left … Bottom right, and *Custom spot* when the value
  isn't one of the nine) and a *Spread* slider. The two sizes in `90% 120%` move together
  (keeping their ratio), so one slider covers the defaults.
- **Colours:** a bar that draws the gradient (a preview, not dragged, in this phase), and a list of
  colours. Each has a colour from the project's colours, Black, White or Clear (RC-2), a
  **Strength** slider on Black and White, and a **Position** slider. *Add colour*, *Remove* (never
  below two).
- **Preview:** a hero block with a heading and a button on it.

## 3. The codec

- `linear-gradient(<direction>, stops…)` and
  `radial-gradient(<w>% <h>% at <x>% <y>%, stops…)`, the two shapes the defaults use.
- **Direction** (RC-6c) is either an angle, `<n>deg`, or a keyword, `to <side>` /
  `to <side> <side>`. The model keeps which one it was given; the eight arrow buttons light for
  either spelling (`135deg` and `to bottom right` are the same arrow) and, when pressed, write the
  spelling the value already used. A value with **no** direction (`linear-gradient(#a, #b)`, which
  CSS reads as `to bottom`) is kept as *no direction* and encoded without one. The Angle slider,
  once moved, writes degrees; that is the one place a keyword becomes an angle, and only by hand.
- A stop is a colour and an **optional** position (RC-6b). A stop with no position encodes with no
  position. Its slider shows the browser's even spacing greyed, and writes a number only once
  touched. 🔴 **Positions can be outside 0–100:** `--gradient-brand` has a stop at **115%**. The
  Position slider's range covers the value it was given; it is never clamped on open.
- **Colours**: the pick list is RC-2's (project colours, Black, White, Clear, Strength on Black
  and White). Any other single colour token is **kept** as a literal (RC-6a, same rules as
  CMP-002 §3): a hex-coloured gradient opens visually with *Custom* chips.
- **Shape the codec refuses** → `null` → text mode: `conic-`, `repeating-`, a radial with a
  `circle`/`ellipse` keyword or a named size (`closest-side`), a colour-hint stop (a bare
  percentage between two colours), a stop with two positions, a `var()` used as a *position*.
  CMP-006 counts each.

## 4. Acceptance criteria

1. All 5 default gradients decode and re-encode **byte-identical**, including brand's 115% stop.
2. On a drive: open `--gradient-spotlight`, pick *Spotlight*, change the second colour to
   *Accent*, move the centre to *Top*, Apply. The section wearing it on the canvas changes. One ⌘Z
   undoes it.
3. The row's preview draws (CMP-001 §3) and its words say *"Radial · 2 colours · glows from the top"*.
4. A `conic-gradient(…)` opens in text mode with *Replace with a preset* offered.
5. **The agent's gradient.** `linear-gradient(to right, #ff0000, #0000ff)` decodes as visual:
   the *Towards the right* arrow lit, two *Custom* chips, two greyed position sliders, and it
   re-encodes **byte-identical**. Press the *Towards the bottom* arrow: the saved string is
   `linear-gradient(to bottom, #ff0000, #0000ff)`, still a keyword, still no positions (a spec).
6. `linear-gradient(#a, #b)` with no direction re-encodes with no direction (a spec).
