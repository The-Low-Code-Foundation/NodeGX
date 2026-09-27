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
