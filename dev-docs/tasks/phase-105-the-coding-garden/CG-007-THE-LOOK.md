# CG-007 — The look: the mockup's garden, not a wireframe of it

**Opened 2026-09-27.** **Status: ⬜ not started.** Depends on CG-003. Lane A.

## 1. The person sentence

> **The built game looks like the mockup the kids saw: the warm paper, the rounded blocks in their four
> colours, the tulips that droop and stand up, the owl's violet card, Fredoka and Nunito — on the tablet,
> in both languages, at both sizes.**

## 2. What it is

- One stylesheet reached by `cssClassName` (`cg007Look.ts`), every colour a theme token, the mockup's
  `:root` tokens as the source.
- Fonts bundled (Fredoka, Nunito; both OFL) in the template's `noodl_modules/` like Rocket School's
  fonts; `document.fonts` status checked in the drive (the Google Fonts splitter trap).
- The robot, the islanders, the tulip, the tree, the owl as inline SVG symbols (from the mockup); the
  DiceBear face for the profile only.
- Motion: a step 380 ms, a bump 350 ms, a tulip standing up 500 ms with the overshoot, the fold's
  pop 300 ms; all under `prefers-reduced-motion`.

## 3. Acceptance criteria

1. The six screens rendered by the drive sit beside the six artboards of the mockup at 1368×912, and
   the comparison is looked at and written into this file with the differences named (bar, cards,
   blocks, fonts, colours).
2. No button is an outlined pill by default; primary, teach, ask and quiet buttons are the mockup's four.
3. Fonts: both families report `loaded` in `document.fonts` on the deployed output, offline.
4. The blocks' four colours and the owl's violet are tokens; a token change re-skins every screen.
5. The robot's face at ≥ 20 px on the world at 390×844; two robots do not overlap.
6. Contrast: every text on its ground ≥ 4.5:1 (the look gate's collector, or the mockup's tokens
   measured once).
7. Reduced motion disables every animation and the game still reads (the tulip's state by opacity and
   pose, not by motion).

## 4. How to build it

The mockup's CSS is the spec; port its tokens and its component classes, do not restyle. TPL-011's
`tpl011Look.ts` is the precedent for a look in one file; its s4 side-by-side render recipe (`look.js` +
a steps file, headless Chrome at the artboard size) is the instrument.

## 5. Gates

The side-by-side render (AC1), `drive-cg003-pages.js`'s look clauses (AC3, AC5), a token census in the
template gate (AC4).

## 6. Traps

A green drive on identical outlined pills was "fuck all like the mockups"; look at the pictures. A
lucide icon is a ligature (text matching must strip `icon-*`). `opacity:0` still animates.

## 7. Session 2 — what was built (lane A, worktree `cg003-pages`, 2026-09-28)

**Built:** `packages/noodl-mcp/tests/cg007Look.ts` — the mockup's `:root` as 71 project tokens (8 of them the robot paints) over the Playful preset
(which ships Nunito), the four block colours and the owl's violet as tokens, one stylesheet (`GARDEN_CSS`, in App's `CSS
Definition`, every class `bg-*`), the mockup's `<symbol>`s as CSS background sprites (islanders, owl, tulip, tree, house,
rock) and its icons as `currentColor` masks on the buttons; `cg007Assets/noodl_modules/bot-garden-fonts/` — Fredoka
(variable 300–700, latin + latin-ext from `@fontsource-variable/fredoka` 5.2.8, 34 KB) with `OFL-Fredoka.txt`.

| AC | Status | Measured by | Numbers |
|---|---|---|---|
| 1 | 🟡 prepared | drive: `cg007-ac1-*.png` (6 screens, 1368×912) and `--mockup` → `mockup-*.png` (the mockup's 5 screens, same Chrome) | the comparison is the orchestrator's to look at and write here. Differences known before looking: the island is the kit's tile world (12 × 7, water border) with every robot on it, not the mockup's sea-and-blob with pins; Profiles is a screen the mockup does not have; the owl row has no thinking dots yet (CG-005) |
| 2 | ✅ measured | gate "no button is an outlined pill" | every Button node: `borderStyle: none` and a fill; the fills used include leaf (primary), coral (teach), violet (ask) and transparent (quiet, no border) |
| 3 | ✅ shipped · 🟡 `document.fonts` in the drive | gate AC3; drive CG-007 AC3 | 2 Fredoka faces + licence in the artefact, `checkFontFaces` silent, no `http` in the sheet; the drive reads both families `loaded` and 0 requests off 127.0.0.1 |
| 4 | ✅ measured | gate token census ×3 | every colour parameter is `var(--…)` or transparent (0 hex); every `var(--x)` in the graph and the sheet is defined (0 missing); outside the sprite data URIs the sheet has 0 hex/rgba; the kit is fed `var(--block-motion/action/control/ask)` |
| 5 | 🟡 prepared | drive CG-007 AC5 | the face on the world at 390×844 (the kit's floor gives 22.5 px); the two island robots' boxes disjoint |
| 6 | 🔴 measured, a ruling | gate "AC6 … a readout" | ≥ 4.5: ink on paper 13.02, on card 13.86; ink-2 on paper 5.01, card 5.33, paper-2 4.74; owl ink on violet-2 11.63, meta 4.84. **Below 4.5, the mockup's own pairs:** white on leaf (Play) 3.05, on coral (Teach) 2.57, on violet (Ask) 3.67; the eyebrow leaf on paper 2.87; white on the blocks: motion 3.20, action 3.05, control 2.05, ask 3.67 |
| 7 | ✅ in the sheet · 🟡 drive | gate AC7; drive CG-007 AC7 | the mockup's rule: `*, *::before, *::after { animation: none !important; transition: none !important; }` under `prefers-reduced-motion`; the sheet animates 3+ classes (known-firing); the tulip reads by the kit's opacity/pose |

**Ruling owed (AC6):** the mockup's white labels on its fills do not reach 4.5:1 (control blocks 2.05, Teach 2.57). Making
them pass is restyling the mockup (darker fills, or ink labels). The gate pins the eight failing pairs by name so a token
change shows. **Owner: Richard.**

**Residuals:** AC1's side-by-side and AC3/5/7's drive readings — the orchestrator. The kit's `icon.png` is still
game-kit's — CG-007 next session. The block colours in the KIT's own stylesheet default to the mockup hexes when the
page sends nothing — NONE (the page always sends the tokens).
