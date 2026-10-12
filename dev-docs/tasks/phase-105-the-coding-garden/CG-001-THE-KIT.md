# CG-001 — The kit: a program a child can hold, and a garden it runs in

**Opened 2026-09-27**, scoped from TPL-012 §3. **Status: 🟢 built and driven, session 1 (2026-09-27) — AC1–AC10 measured (gate 20/20, drive 28/28 on the merged tree, screenshots looked at); AC9 is a Mac number, the tablet's is CG-008's.** Depends on nothing. Lane A.

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

## 7. Session 1 — what was built (lane A, 2026-09-27)

**Built:** `library/modules/garden-kit/` — `src/kit.js` (1,262 lines, hand-written, the two React nodes of §2), `build.mjs`
(game-kit's without the DiceBear bundle: banner + source verbatim, 67,702 bytes), `library.json`, `icon.png` (game-kit's,
copied, said so in the README), `project/noodl_modules/garden-kit/{index.js, manifest.json, README.md, types/node-kit.d.ts}`.
The gate `packages/noodl-mcp/tests/cg001GardenKit.test.ts` (19 specs) over the BUILT file in a bare `vm` (globals: `Noodl`,
`React`, `console`, timers — no `window`, no `document`). The drive `scripts/devtools/drive-cg001-kit.js` and its two-module
project `packages/noodl-mcp/tests/fixtures/garden-app/` (components only; the drive's `assemble` step copies both kits in).

**The contract as typed** (the header of `src/kit.js`; CG-002's `cg002Scripts.ts` types the same words): blocks `{id, t, n?,
body?, slots?}`, emitted as JSON TEXT in canonical key order (`id, t, n, body, slots`, slot keys sorted, whole counts 1–9, a
40-character slot cap); palette entries `{id, kind, icon, label:{en,fr}, hasBody, hasCount, slots}`; map `{rows, legend}` with
the mockup's legend by default (`G P W T R H F` → grass path water tree rock house bed); things `[{kind, x, y, watered?, full?,
text?}]`; robots `[{x, y, d, colour, eyes, hat, name, bump?}]` with `d` 0–3 clockwise from up and `bump` a rising count.

| AC | Status | Measured by | Numbers |
|---|---|---|---|
| 1 | ✅ measured (vm) · 🟡 two-module drive prepared | gate `AC1` ×3; `drive-cg001-kit.js` clause AC1 | names `['garden-kit.BlockList','garden-kit.Garden']`; built file ends with `src/kit.js` verbatim; assemble step measured: `modules: ["game-kit","garden-kit"]` |
| 2 | ✅ measured | gate `AC2` ×3 | 20 seeded sequences (8–14 edits each) through `BlockList.program.{add,move,remove,setCount,setSlot}`: `emit(parse(emit(P))) === emit(P)` 20/20; drawn shape (order AND nesting, read off the markup) = program shape 20/20; 138 blocks, 24 containers exercised |
| 3 | 🟡 prepared, drive pending | drive clauses AC3 ×4 | synthetic `PointerEvent`s with `pointerType` touch / pen / mouse; a 4th touch drag ending on the garden |
| 4 | ✅ measured | gate `AC4` ×2 | `[fwd, repeat 3 {left, water}]`, the engine's id sequence `1 2 3 4 3 4 3 4`: step 7 (water, 3rd pass) → exactly 1 `data-run`, on id 4; 8/8 steps one glow; `''` and `99` glow none |
| 5 | ✅ measured (markup + CSS) · 🟡 live switch in the drive | gate `AC5` ×2; drive clause AC5 | band 1 and band 2 markup identical once the root's band is masked; `.gd-band1 … .gd-n{font-size:11px}` vs `15px`; the drive marks the DOM node and reads it back after the switch |
| 6 | ✅ cells + face floor measured · 🔴 first drive: face 12 px (see §7.1) · 🟡 re-drive pending | gate `AC6` ×4; drive clauses AC6 ×4 | 8×6 → 48 cells `{grass 30, tree 3, house 1, bed 3, path 8, water 2, rock 1}`; 12×8 → 96; robot floor 56 px × face fraction 0.40 (the visor's SMALLER side, 28 of 64 units at 92 %) = **22.5 px**, read off the rendered `<rect data-face>` |
| 7 | 🟡 prepared, drive pending | drive clauses AC7 ×12 (EN + FR), 10 screenshots | step Δx ≈ one tile, turn = a changed transform at the same place, bump = `data-bump="1"` + bubble, water = `.gd-wet` 1 / `.gd-dry` 2, puddle on cell (1,4) |
| 8 | ✅ measured (markup) · 🟡 boxes in the drive | gate `AC8` ×2; drive clauses AC8 ×2 | two tiles: 2 sprites, `Pip`,`Bo`; one tile: `data-share` 0/1, `scale(.78)` at −90 %/−10 % ⇒ centres 0.8 box apart, a 0.02-box gap |
| 9 | ✅ MEASURED (a readout, not a pass) | drive clause AC9, run by the orchestrator on the primary checkout 2026-09-27 | 12×8, two robots, `Emulation.setCPUThrottlingRate 4`, 20 `Robots` writes, ms from the write to the 2nd `requestAnimationFrame`: **p50 27.9 ms, p95 29.8 ms, max 29.8 ms** (samples 10.3 28.9 29.8 27.2 28.1 28.4 25.6 27.3 28.5 29.6 26.1 25.5 28.8 29.7 27.9 26.4 28.6 27 25.5 27.3) — under the 50 ms line on a Mac at ×4; CG-008 measures the tablet |
| 10 | ✅ measured | gate `AC10` ×2 | README names the mockup as the sprites' source, GPL-3.0, the borrowed icon, "nothing is fetched"; the built file has 0 of `fetch(`, `http://`, `https://`, `<img`, `url(`, `XMLHttpRequest`, `@import` beside 1+ `'svg'`/`viewBox` |

**Runs:** `cd packages/noodl-mcp && npx jest tests/cg001GardenKit.test.ts` → `Tests: 19 passed, 19 total` (0.4 s). Control:
`npx jest tests/tpl007GameKit.test.ts` → `47 passed, 47 total`.

**Arms 9/9 killed** (each mutant applied to `src/kit.js`, rebuilt, the spec run, the source restored byte-identical): move into
own body allowed (killed only after the spec gained a NON-ZERO-index probe — at index 0 the fallback put the block back where
it was, a green-looking hole); count clamp removed; nesting rail flattened; glow on every block; ragged row not padded; emit not
normalised; same-tile robots not offset; face floor 40 px; band-1 caption at 15 px.

**The catalog (§4's last bullet, measured, not regenerated):** `packages/noodl-types/src/node-catalog.json` carries **0** kit
entries (`grep -c game-kit` = 0) — by design, it is built from the built-in register only. Kit nodes arrive through the
project-scoped overlay: the extractor bundle (`src/kitExtract/entry.js`, esbuilt) run over the assembled two-module project and
`@nodegx/kit-catalog`'s `catalogNodesFromNodeLibrary` give **8 overlay nodes** (6 game-kit + 2 garden-kit), both garden nodes
`inNodePicker: true`, `providedBy: "project-kit"`, `category: "Visual"`, every §2 port present (`palette program band language
runningId locked` / `onProgram onChanged onSelected`; `map things robots bubble stepMs celebrate` / `onTileX onTileY onTileTapped
onReady`), **0 collisions, 0 `kitDiagnostics`**. Nothing to regenerate.

**The drive (prepared, not run; Chrome is the orchestrator's):**
```
node scripts/devtools/drive-cg001-kit.js assemble <project-dir>                       # fixture + both kits
node packages/noodl-preview/dist/nodegx-deploy.cjs <project-dir> <deploy-dir> --allow-development-engine   # exits 0 even on refusal: check index.html's mtime
node scripts/devtools/drive-cg001-kit.js <deploy-dir> --shots <dir> --json <file>     # 30 clauses, 14 screenshots, exit 0/1
```
The page feeds every kit port from a `Variable2` and the drive plays the engine through `Noodl.Variables.set(...)`; `Program`
and `Selected` are written back into Variables the drive reads. Known unknowns the drive settles (each a FAIL line, not a
crash): a synthetic `PointerEvent` reaching React's root listener (if not, real CDP input, and pen is out of reach); a wired
`object` port fed JSON text from a Variable (the kit parses text either way).

**Residuals:** drag-to-reorder (`dropAt`, `elementFromPoint`) is graded only by the drive — owner: the orchestrator's drive
run · the band-1 "never a keyboard" rule is code (`s.text && band === 2`), not yet a spec: the picker opens on a tap, which
needs state — owner: CG-003's page drive · `icon.png` is game-kit's — owner: CG-007 · the AC9 number on the real tablet —
owner: CG-008 · the colour ports default to the mockup's hex, not tokens (no design system exists yet) — owner: CG-007.

### 7.1 The first drive (orchestrator, primary checkout, 2026-09-27): 20/27, and what it found

The drive ran once the fixture's Router listed its page (`129775882`, the orchestrator's fix: a Router with no `pages` logs
`[router/no-pages]` and draws nothing — 0/27 before it). Readings, each with its cause and where the fix went:

1. **🔴 The look — one flat green rectangle, no tile art (README §6).** Cause, in the kit: `react-component-node.ts:994` seeds
   `props.style` from `defaultCss` (`display: block`), and the world merged `props.style` LAST, so the inline `display:block`
   beat the class's `display:grid` — 48 `<button>` cells flowed inline at zero size (the drive counted them; nothing painted;
   the robot, placed by percentage, was the only thing on screen). Fix in the kit: the grid is set after the merge (only the
   graph's `display:none` is kept) and `defaultCss` is `grid`. Gate row added (the bridge's `display:block` is passed in and
   `display:grid` must come out; a tree, rock, house and bed cell carry their sprite, grass/path/water none; four distinct
   backgrounds in the stylesheet). Drive clause added (`THE LOOK`: computed `display:grid`, cells ≥ 40 px, path and water
   backgrounds ≠ grass, a tree/tulip/house sprite each with a box). The tile CSS and the sprites were already the mockup's
   (`.cell.G/.P/.W/.F`, the `<symbol>`s inline); they never had a sized cell to paint in.
2. **🔴 AC6 face 16.9 px at 80 px cells, 12.0 px at the 56 px floor.** Cause, in the kit's sprite: the visor was 28 × 16 units,
   and Pip faces right (`d=1`, `rotate(90deg)`), so `getBoundingClientRect().width` reads the visor's HEIGHT — 16/64 × 0.86 ×
   56 = 12.0, exactly the reading. Fix: the visor is 34 × 28 and the sprite 92 % of its box, so the smaller side is 0.40 of the
   box = 22.5 px at the floor whichever way the robot faces; the gate now reads the rendered `<rect data-face>`'s width and
   height and the `viewBox`, and the drive reads `min(width, height)`. (The first `faceFraction` was a constant computed from
   the unrotated width — a fact about the viewBox, not about the screen.)
3. **AC3 pen and mouse `publishedChanged:false`** with the reorder itself correct (`2,3,4,5,1`). Instrument fault: `resetProgram`
   restored the same program, the kit republished the same reordered text, `before === after`. The drive now empties
   `programOut` before each drag. Touch passed only because it ran first.
4. **AC7 (fr) bump: `{bump: "2", bubble: ""}`.** Instrument fault: the drive waited for `data-bump === "1"`, but the kit counts
   bumps for the life of the sprite (a RISING count restarts the animation — by design, so a robot can bump twice), so the
   second language read `2`, the 2 s wait ran out, and the 1.5 s bubble had gone before it was read. The drive now waits for a
   rise from the count it read before, and the bubble outlives the wait (4 s). The kit is unchanged here.
5. **AC9 measured:** p50 27.9 / p95 29.8 / max 29.8 ms (in the table above).

Gate after the fix-up: `cd packages/noodl-mcp && npx jest tests/cg001GardenKit.test.ts` → **20 passed, 20 total**; arms 11/11
(two added: the grid override removed, the visor back to 28 × 16 — each killed by the new rows). The drive is prepared again
(28 clauses, the LOOK clause added); the orchestrator re-runs it.

### 7.2 The re-drive on the merged tree (orchestrator, 2026-09-27 20:32)

`zsh drive-laneA.sh` on `cline-dev` at `17bd143dd` (the fix-up cherry-picked): assemble → deploy (`{"ok":true}`, fresh
`index.html`) → drive. **28/28 clauses, exit 0, 0 console errors.** AC3 touch / pen / mouse all reorder and publish; the
outside drop restores. AC6 faces: measured ≥ 20 px at all four viewport × map pairs (smaller side of the rotated visor).
AC7 twelve clauses EN + FR. AC8 both. **AC9 second run: p50 27.3 / p95 29.9 / max 29.9 ms** (12×8, two robots, CPU ×4, 20
samples) — consistent with the first run's 27.9 / 29.8 / 29.8.

Screenshots looked at (`ac1-two-modules`, `ac7-water-fr`, `ac8-shared-tile`, `ac5-band1`): a checkered green grid, a sand
path row, two water tiles, three beds with dry tulips that stand up pink when watered, three trees, a rock, a house; Pip
and Bo on one tile side by side and labelled; "Glou glou !" in a bubble; band 1 draws icon-first blocks with a caption.
The layout (blocks under the world, the avatar at the foot) is the drive fixture's, not the product's — CG-003 owns it.

The first run was 0/27: the fixture's Router had no `pages`, the deployed page logged `[router/no-pages]` and drew
nothing (`129775882`). A Router with no `pages` routes to nothing; the replay fixture's shape (`startPage` + `routes`)
is the one to copy.
