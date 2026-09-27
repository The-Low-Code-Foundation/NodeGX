# CG-001 — The kit: a program a child can hold, and a garden it runs in

**Opened 2026-09-27**, scoped from TPL-012 §3. **Status: ⬜ not started.** Depends on nothing. Lane A.

## 1. The person sentence

> **A child taps a block to add it, drags a block to move it, taps ✕ to drop it, and sees the running
> block glow while the robot moves in a garden drawn beside it — with a finger or a pen, on a tablet,
> with no reading needed in band 7–9.**

## 2. What it is

`library/modules/garden-kit`, a vendored node kit like `game-kit` (hand-written `src/kit.js`, a
`build.mjs`, the built file under `project/noodl_modules/garden-kit/`), with two React nodes:

**`garden-kit.BlockList`** (visual). The program editor.
- Inputs: `Palette` (JSON: the blocks this band may use, each with id, kind, icon, label EN/FR,
  whether it takes a body, whether it takes a count, its slots), `Program` (JSON, the current program),
  `Band` (1 or 2), `Language`, `RunningId` (the block to glow), `Locked` (true while a run plays).
- Outputs: `Program` (JSON, on every edit), `Changed` (signal), `Selected` (the container a palette tap
  inserts into, or none).
- Behaviour: a vertical list; containers (`repeat`, `until`, `if`, a named trick) nest with a left rail;
  `repeat` carries −/+ on its count; a slot on an `ask Olive` block opens a picker of garden words (never a
  free keyboard in band 7–9; a ≤40-character text field in band 10–12). Drag to reorder with pointer
  events (touch, pen, mouse), tap to remove, long-press does nothing (a tablet trap). Band 1 draws
  icon-first blocks (label as a small caption); band 2 draws icon + word.

**`garden-kit.Garden`** (visual). The tile world.
- Inputs: `Map` (JSON: tiles by row, the ASCII form TPL-005 uses, plus a legend), `Things` (JSON: tulips
  with dry/watered, puddles, letters, bowls, labels on tiles), `Robots` (JSON: one or two, each with
  x, y, facing, colour, eyes, hat, name), `Bubble` (JSON: which robot, text, style plain/olive, ms),
  `StepMs` (the animation length), `Celebrate` (signal).
- Outputs: `TileTapped` (x, y — for the Predict step and for free play), `Ready`.
- Behaviour: CSS-grid tiles with absolutely positioned sprites; a robot moves with a transition of
  `StepMs`; a bump animates without moving; a watered tulip stands up; a puddle pops. Every sprite is
  inline SVG (the mockup's symbols are the source). No canvas, no external image.

Reused, not rebuilt: `game-kit.Avatar` (the profile face), `game-kit.Sound` (bump, splash, drink, win),
`game-kit.KeepStorage`.

## 3. Acceptance criteria

1. Both nodes register in a **two-module project** (`garden-kit` + `game-kit`) and render when placed
   under a Group root (D53). Measured by the kit gate on the built file in a bare `vm` and by a drive.
2. `BlockList` round-trips a program: the JSON it emits after add / move / remove / count change / slot
   pick is what `Program` reads back, byte-identical, in a gate with 20 edit sequences.
3. Drag-to-reorder works with `pointerType` `touch`, `pen` and `mouse` in a headless drive (synthetic
   pointer events), and a drag that ends outside the list puts the block back.
4. `RunningId` glows the right block, including one inside a nested container on its third iteration.
5. Band 1 shows no text larger than a caption on a block; band 2 shows icon + word; the switch is live
   without a remount.
6. `Garden` draws the mockup's map (8×6) from the ASCII form, and a 12×8 map, at 1368×912 and at 390×844
   without horizontal scroll; the robot's face reads at ≥ 20 px in both (the P95 AC9 lesson).
7. A robot step, a turn, a bump, a watering and a puddle each animate in a drive with the screenshot
   looked at, EN and FR.
8. Two robots on one map draw without overlapping (D2), each labelled.
9. **Measured on the tablet's class of machine before the pages are built:** the world at 12×8 with two
   robots repaints a step in under 50 ms on a 2-thread CPU-only Chrome (a Mac run with
   `--cpu-throttling` stands in until CG-008 measures the real tablet).
10. The kit's README credits what it bundles and names the licences; no asset is fetched at runtime.

## 4. How to build it

- Precedents: `library/modules/game-kit/src/kit.js` (`RaceTrack` for sprites on a surface, `AnswerPad`
  for a touch control), `library/modules/nightbook-kit` (pointer, pinch and rotate on items),
  `packages/noodl-mcp/tests/tpl005Components.ts` (the ASCII map → rows pattern).
- Palette, program and map are JSON on ports so the engine (CG-002) owns the semantics and the kit owns
  only the drawing and the gestures. The kit never interprets a program.
- The mockup's `bot-garden.html` holds the working block list, the fold UI and the world in ~400 lines
  of vanilla JS; port it, do not redesign it.
- After registering the nodes, check the kit catalog (`packages/nodegx-kit-catalog`) and the generated
  node catalog for the new types (the FED-003 `inNodePicker` trap).

## 5. Gates

`tests/cg001GardenKit.test.ts` on the BUILT file in a bare `vm` (AC1, AC2, AC4, AC5); a drive
`scripts/devtools/drive-cg001-kit.js` on a two-module project (AC3, AC6–AC8); the repaint measurement
(AC9) as a numbered readout in the task file, not a pass/fail.

## 6. Traps

D41 (a kit that works beside 33 modules can fail beside two), D53, the `Icon` component renders an
empty span (draw SVG inline), `cdp click` hits the measuring ghost inside a Modal, a rendered surface can
be behind a blocker (`elementFromPoint` before a press).
