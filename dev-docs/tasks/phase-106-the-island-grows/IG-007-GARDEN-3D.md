# IG-007 — Garden 3D: the same ports, a flat-shaded world, graded on the tablet

**Opened 2026-09-28**, from README §1 global point 2 and ruling R2 ("go 3D"). **Status: 🟡 session 2 — AC1 (on the Mac, software GL), AC2, AC4 and AC6's module/manifest/picker/template done and driven; AC5 waits for Richard's grade, AC3 for the tablet, AC6's Windows installer for CG-008's workflow (§7).**
Depends on IG-000 (the mockup it builds to) for the look; the Workshop scene can start on IG-001. Lane D, in
a worktree (`scripts/devtools/make-worktree.sh`; a worktree has no gitignored build output — build the kit
there before a drive).

## 1. The person sentence

> **The child sees her plot as a little 3D island, pans with one finger, pinches to zoom, and watches Pip
> glide over the tiles and bump into the rock in the round. On the family tablet it stays smooth while
> Olive is thinking. If the tablet cannot draw it, the flat garden appears instead and nothing else changes.**

## 2. What it is

- **A new kit module `garden-3d-kit`** (`library/modules/garden-3d-kit/`), one React node **`Garden 3D`** with
  the SAME ports as `Garden`: in `Map`, `Things`, `Robots`, `Bubble`, `Step Ms`, `Celebrate`, `Label`; out
  `Tile X`, `Tile Y`, `Tile Tapped`, `Ready`; plus `Camera` (`plot | island | follow`), `Focus` (x, y, w, h),
  and out `Frame Ms` (a rolling p95 of the last 60 frames) and `Supported` (WebGL2 present). The page swaps
  the node, the graph above it is untouched.
- **three.js vendored** the maplibre way: `manifest.json` `"dependencies": ["three.min.js"]` and the node reads
  the `THREE` global; `OrbitControls` is inlined into `index.js` (it is small). Pinned version, licence file
  beside it (MIT), listed in the shell's `licenses/NOTICE.txt`.
- **The scene, from the mockup:** tiles as unit boxes with a height per kind (water lowest, path, grass, bed),
  a `MeshLambertMaterial` per kind with `flatShading`, one directional + one hemisphere light, **no shadow
  maps, no textures, no post-processing**; trees, rocks (three sizes by `left`), house, tulips (dry: tilted
  and paler), post box, sign, note, stone, puddle (a flat disc), bowl, letter; the robot as a box body +
  visor + eyes + hat + accessory + can level + load (IG-002/005 vocabulary). Glides are a lerp over `Step Ms`
  between tile centres, a turn is a lerp of yaw, a bump is a short recoil, `Celebrate` is a hop. The bubble is
  a DOM overlay projected from the robot's head (text stays selectable and translatable).
- **Input:** one finger / drag pans, pinch / wheel zooms within bounds, a tap raycasts to a tile and fires
  `Tile Tapped` (a tap, not a drag: ≤ 8 px moved). Pen counts as a finger.
- **The fallback is a rule, not a hope:** the page holds both nodes behind a `renderer` States node. It picks
  `2d` when `Supported` is false, or when `Frame Ms` p95 stays above 50 ms for 3 s after `Ready`, and writes
  the choice to the profile so the next open is instant; the Grown-ups page shows which renderer runs and a
  switch.
- **Drives** run on the 2D node (headless Chrome has no GPU worth timing); the 3D node has its own gate on
  the built file (the pure parts: the scene builder from a world, the raycast-to-tile maths, the camera
  bounds) in a `vm` with a `THREE` stub, and a **screenshot drive on the Mac** (real GPU) looked at beside the
  mockup's screenshots.

## 3. Acceptance criteria

1. `Garden 3D` placed under the same wires as `Garden` in the Workshop: the tulips request is driven end to end
   (drive, teach, fold, play, win) with the 3D node on the Mac; every step the 2D node draws, the 3D node
   draws (the drive asserts the engine, the screenshot the scene).
2. The kit gate: a 24×16 world with 30 things and 3 robots builds a scene of ≤ 500 meshes (instanced tiles
   count as one); raycast on a 24×16 world returns the tapped tile for 20 sampled points; camera bounds hold.
3. **On the tablet** (Richard, the installed app, `timings.log`): the Workshop scene ≥ 30 fps p95 (`Frame Ms`
   ≤ 33) with an Olive call in flight; the island at 24×16 with three robots ≥ 30 fps p95; the app's memory
   under 1 GB with the model loaded. **This is the gate for R2**: below it, the 2D fallback is the tablet's
   renderer and the ruling comes back to Richard with the numbers.
4. The fallback fires: with `Supported` forced false the Workshop draws the 2D node with no console error and
   the same drive passes; the Grown-ups page names the renderer.
5. The look beside the mockup's screenshots (`tpl-012-mockups/island-3d/`): Richard grades; his words go in
   §7.
6. `garden-3d-kit` builds deterministically; `manifest.json` lists the dependency; the editor's picker shows
   `Garden 3D` (a new node type owes `noodl-mcp` and the picker — harness pointers); the template's
   `noodl_modules/` carries it; the Windows installer includes it (CG-008's workflow).

## 4. How to build it

Lift the mockup's scene builder (IG-000 §4 keeps it as one function of the world shape) into the node; ports
first with the 2D node's parse helpers reused (`parseMap`, `parseThings`, `parseRobots` are exported on the
node as `world.*`); then the glide/turn/bump; then input; then `Frame Ms` and the fallback; then the tablet.
The Workshop first, the island (IG-004) second: the island's camera is a `Focus` change, not new code.

## 5. Gates

The kit gate in a `vm` with a `THREE` stub; the two-module project drive (P105 D41: never beside the 33-module
library); the Mac screenshot drive; the tablet reading written in §7 with the date; the CG-008 Windows
workflow builds and installs with the new module.

## 6. Traps

A frame throttle never fires in a hidden window (`a-frame-throttle-never-fires-in-a-hidden-window`): `Frame Ms`
is measured after `Ready` and only while visible, or the fallback fires on every minimised app. `RENDERED ≠
REACHABLE`: the bubble overlay must not eat the tap (`pointer-events: none`). `cdp click` hits a measuring
ghost inside a Modal — none here, but the DOM overlay is positioned each frame; `elementFromPoint` is the
check. Kenney or any downloaded asset is OUT of this task: primitives only, so AC10 of CG-001 (no `url(`, no
`fetch(`) holds for this kit too. A bundle-size claim is about the build config: measure the vendored file,
not the npm package.

## 7. Sessions

### Session 1 (2026-09-28/29, lane D, worktree `ig007-garden3d` cut from `4020fd1c0`)

**Built.** The module `library/modules/garden-3d-kit/` mirroring garden-kit's shape (library.json "Garden 3D Kit",
build.mjs banner + `src/kit3d.js` verbatim, `project/noodl_modules/garden-3d-kit/{manifest.json, index.js,
three.min.js, LICENSE.txt, README.md, types/}`, `manifest.json` `"dependencies": ["three.min.js"]`). The node
`garden-3d-kit.Garden3D` "Garden 3D" on EXACTLY the 2D node's ports (diffed by the gate: type, name, group, default,
description) plus `Camera` (plot | island | follow), `Focus`, `Frame Ms`, `Supported`. The scene from §2's
description: instanced tile boxes with a height per kind, cylinder-under-two-cones trees, squashed icosahedron rocks,
box-and-prism house, stem-and-cone tulips (dry: tilted and paler), puddle disc, letter, bowl, labels as DOM pills,
robots as box body + visor + eyes + mouth + arms + antenna + can + hat (cap/sun/crown); one directional + one
hemisphere light, no shadow maps, no textures, no post-processing. Glide = lerp over Step Ms, turn = shortest-arc yaw
lerp (300 ms), bump = recoil (350 ms), Celebrate = hop; bubble and names as a DOM overlay projected from the robot,
`pointer-events: none`. Hand-rolled camera (35° tilt from straight down, 40° fov): one pointer pans, two pinch, wheel
zooms, all clamped inside the map and a zoom range; a press moving ≤ 8 px raycasts to a tile; pen = finger. `Frame Ms`
= p95 of the last 60 frame intervals, reported at most every 500 ms, after Ready, only while visible. `Supported` false
(no THREE / no WebGL2 / renderer throws) draws nothing, throws nothing, never fires Ready. three.js added to the P105
shell's `licenses/NOTICE.txt` + `LICENSE-three.js.txt`. The gate `packages/noodl-mcp/tests/ig007Garden3d.test.ts`, the
fixture `tests/fixtures/garden-3d-app` (Garden 3D on the tulips 8×6 with one robot, every port on a Variable, the
signals on Counters), the drive `scripts/devtools/drive-ig007-3d.js` (swiftshader), `drive-deployed.js` gained an
additive `gpu` / `chromeArgs` option.

**Readings (all from the worktree).**
- `npx jest tests/ig007Garden3d.test.ts` — exit 0, **20 passed, 20 total** (new; first run 16/20: a robot claimed 11
  meshes and made 10 — caught by the constructor-count clause and fixed to 10; the other three were instrument faults
  in the spec).
- `npx jest tests/cg001GardenKit.test.ts` — exit 0, **20 passed, 20 total** (previous reading 20).
- `node library/modules/garden-3d-kit/build.mjs` twice — same sha256 `eef7c948…b720`, `git status` clean.
- Assemble + deploy (`nodegx-deploy.cjs … --allow-development-engine`) — `{"ok":true}`, index.html mtime = run time;
  the deployed page loads `garden-3d-kit/three.min.js` BEFORE `garden-3d-kit/index.js` (measured in the HTML).
- Drive `drive-ig007-3d.js` (headless Chrome, `--use-angle=swiftshader`) — run 1 **16/17** (the CAMERA clause wrote
  `island` to a port already reading `island`: a same-value write is not a change; instrument fault), run 2 **17/17,
  exit 0, 0 console errors**: Supported true out of the port, Ready fired once (Counter = 1), `data-helpers="sibling"`
  (garden-kit's parse helpers found through `window.__noodl_modules`), 442 distinct colours in the canvas, draw calls
  > 0, a Robots write glided the pill > 40 px with `gliding` true mid-way and the shots differing in the robot's
  region, turn/bump/hop read off the engine, a CDP mouse tap on tile 5,2 and a CDP touch tap on 1,4 came out of the
  ports as Tile X/Y with the Counter +1 each, a 60 px drag panned and tapped nothing, wheel zoomed in bounds, island
  vs plot framing, the bubble within 160 px of the pill with `elementFromPoint` at its centre = the canvas, Frame Ms
  came out of the port; 24×16 with 30 things and three robots = **156 meshes, 156 draw calls**.
  **Frame Ms readout, software GL on this Mac, 8×6: 18.6 (run 1) / 27.2 (run 2) ms p95 — a readout, not the AC3 gate.**
  JSON + shots: `shots/ig007-s1/` (island framing, plot framing, mid-glide, 24×16) copied from
  `…/ig007-garden3d-scratch/run2/`. Looked at: tiles read as heights, the house/trees/rock/tulips are recognisable,
  Pip's visor/eyes/mouth/can read at the plot framing; at island framing the map fills the width with empty margin
  above and below (the frame is width-limited at the root's map aspect).
- Kit gate AC2 numbers: 24×16 / 30 things / 3 robots → **189 meshes** (15 instanced, 174 individual), 20/20 sampled
  points round-trip at the island framing and 28 at the closest zoom; bounds hold at 0 and 1e9.

**Deviations.**
- Parse helpers: garden-kit's `Garden.world` IS reachable at render time through `window.__noodl_modules` and is used
  when that kit is on the page (the drive measured `sibling`); a COPY stays in `kit3d.js` for a project that installs
  this kit alone (and for the catalog extractor, which loads `main` only), pinned to the originals by a gate clause
  over every input shape. Two copies, one gate.
- `OrbitControls` NOT inlined (§2 said it was small): its UMD build is no longer shipped and a plot needs pan/zoom in
  bounds, not an orbit. Hand-rolled instead; the gate grades the maths.
- Camera tilt taken as 35° from straight down (elevation 55°), a named constant `CAMERA.tiltDeg`; IG-000 says only
  "a 35° camera". Cheap to flip after the side-by-side.
- three.js's UMD build prints ONE `console.warn` on load (deprecated from r150, removed at r160 — why 0.158.0 is pinned);
  a warning, not an error, the drive's 0-console-errors clause is unaffected. Written in the module README.
- Robot vocabulary drawn today = the 2D kit's (colour, eyes, hat, the can always); `accessory`, `can` level, `load`
  and the thing kinds rock/stone/postbox/sign/note are named hooks (`THING_BUILDERS`, `buildRobot`), not drawn.

**Not done (waits for IG-001's merge and the mockup).** AC1 (Workshop placement, the tulips request end to end),
AC3 (the tablet, Richard), AC4 (the `renderer` States fallback on the page, the Grown-ups switch), AC5 (Richard's
grading beside `tpl-012-mockups/island-3d/`), AC6's template `noodl_modules/` and the Windows installer. DONE: AC2
(kit gate), AC6's module build (deterministic), manifest, catalog (`inNodePicker: true`, extractor over the fixture).

**Findings for others.** (1) The deploy tool's wire checker reports `garden-3d-kit.Garden3D` as "a kit node this
deploy does not load" and publishes its 14 wires unchecked (the page loads it fine — the checker's own kit loader
skips or fails the module; not measured why). (2) A headless Chrome with a `nodegx-deployed-*` profile, PPID 1, five
days old, is running on the box — not this lane's (the brief: kill only your own pids); somebody's drive did not tear
down. (3) At the plot framing a 4×3 Focus shows Pip's face at ~60 px; at the 24×16 island framing a robot is ~12 px —
the island is a map, the plot is where the child works (the P95 AC9 face-floor lesson applies to the plot only).

**Could not verify.** Real-GPU frame time (this Mac's drive is swiftshader; the tablet is AC3); the look beside the
mockup (IG-000 is in flight); reduced-motion in a browser (the engine reads `matchMedia`, the gate covers the flag);
SSR of the kit under `kit-modules.js` (three.min.js through `new Function` under the React-only window shim: not run).

### Session 2 (2026-09-29, lane D, worktree `ig007-placement` cut from `f784833b8`)

**Built, in four commits on `ig007-placement`** — `e4589ae3f` (the vocabulary and the mockup's look in the kit),
`85c88b7d0` (on-demand drawing, the mockup's framing, shared GPU buffers), `0545f0c69` (the Workshop placement, the
rule, the Grown-ups switch, the template carries the kit), `deb28a761` (egg and food loads, as lane A's 2D kit; the
fixture drive's vocabulary clause). This docs commit follows.

- **AC1, the placement.** `Workshop/Play` holds `plGarden3d` (`garden-3d-kit.Garden3D`) beside `plGarden` on the stage,
  with the same parameters (`stepMs`, `label`) and EXACTLY the Garden's wires: `plDraw.map/things/robots/bubble` in,
  `onTileTapped → plPredictGate.eval`, `onTileX/Y → plPredictEnd.tapX/Y` out. The gate diffs the two nodes' wire sets.
  A `States` node labelled `renderer` (`useTransitions: false`, states `2d,3d`, values `show2d`/`show3d`) mounts
  one of the two, driven by `to-2d`/`to-3d` signals from a Condition over `Logic/Renderer`'s `use3d`, which reads
  the store. The graph above is untouched: `Workshop/Play/connections.json` +144/−0, and `nodes.json` only gains nodes
  (the only removed lines are auto-layout `y`s).
- **AC4, the rule.** `Supported` false → `Logic/Renderer choice` (`event: unsupported`) → `{ mode: '2d', why:
  'unsupported' }`. The kit's new **`Too Slow`** signal → the same choice with `event: slow` → `{ mode: '2d', why:
  'slow' }`. Both are written through a `GlobalStore Set` into the persisted `garden` store's **`renderer`** key, so
  the next open reads it and mounts the 2D node straight away. `Grown/Renderer panel` (a fourth panel on Grown-ups)
  names the renderer and why, and has a two-way Seg switch (`3D island` / `Flat garden` → `{ 3d | 2d, 'grown-up' }`).
  There are seven new words, EN and FR, appended to the page word table.
- **The kit (vocabulary, brief §4).**
  - `parseRobots` in the copy carries the three §4 lines verbatim.
  - `THING_BUILDERS` draws `rock`: big at `left` ≥ 3, medium at 2, small at 1, nothing at 0, big when there is no
    `left`; a pebble beside it from medium up.
  - It also draws `sign` (post and board), `note` (paper and a coral line), and `stone`, `postbox` and `tulip` as the
    mockup does. No text is drawn on a tile.
  - `buildRobot` is the mockup's robot: a visor, eyes, a mouth, two wheels, an antenna with a gold ball, a cap,
    sunflower or crown hat, and a can with a spout.
  - The can's level is a light band inside the can, `can`/`canMax` tall. At 0 it is hidden (no drops). When `can` is
    null there is no band.
  - The load on the back is the last entry of `carry`. `stone`, `letter`, `egg` and `food` are drawn as themselves,
    anything else as a parcel, and an empty `carry` draws nothing.
- **The kit (look, AC5).** The ground is the sea, a sand rim and a green base, with tiles 0.98 wide so the grid shows.
  The kit uses the mockup's palette, tile heights (water .14, bed .30, path .34, grass .40) and two lights.
  - Trees are two six-sided cones at a size per tile. The house has a gabled roof and TWO windows (s1 drew one per
    house).
  - Fixed: an instance colour multiplied a green material, which is why s1's grass was a darker green than the mockup's.
  - The camera is the mockup's exactly, taken from its source: `v.apply` sets camera y = d·cos35 and aims at y 0.4.
    It is turned 0.42 rad, with a 38° lens.
  - The framing is the mockup's `v.fit` (max(width across, tilted depth) × 1.18 + 1.2). `frameRect` (everything
    inside a margin) stays the zoom-out bound.
- **The kit (behaviour).** The scene is drawn **on demand**: a frame only while a robot glides, turns, recoils or
  hops, a tulip stands up, the camera glides or a finger is on the world. The bubble clears on a timer.
  - `Too Slow` fires once when the `Frame Ms` readout stays above 50 ms for 3 s of **sampled** time. Sampled time is
    the intervals between frames of one busy, visible spell, added across the short still gaps between glides; a
    hidden spell restarts the count.
  - Geometries and materials are made once per engine and shared by every rebuild.
  - Fixed: the first framing happened before the stage had its size (a 300×150 canvas), and a resize only clamped it,
    so the Workshop sat at dist **14.9** where the fit says **11.44** (read in the page). A resize now re-frames until
    a finger has moved the camera.
- **AC6.** `REQUIRED_MODULES` gains `garden-3d-kit`. The template's `noodl_modules/garden-3d-kit/` carries index.js,
  three.min.js (651,651 B), the LICENSE, the manifest and types. The deployed `index.html` loads
  `/noodl_modules/garden-3d-kit/three.min.js` (line 334) BEFORE `/noodl_modules/garden-3d-kit/index.js` (line 347).
- **Drives.**
  - `scripts/devtools/drive-ig007-workshop.js` (new) runs the deployed template. `--mode 3d` uses swiftshader. `--mode
    nogl` uses `--disable-3d-apis`.
  - `drive-ig007-3d.js` (s1's fixture drive): its GLIDE clause now reads the turned camera's own projection, and it
    gained a VOCAB clause.

**Readings (all from the worktree; exit code first).**
- Garden specs, one file each:
  - `ig007Garden3d` exit 0, **29 / 29** (20 before).
  - `cg003Template` exit 0, **98 / 98** (92 before).
  - `cg001GardenKit` exit 0, 22 / 22 · `cg002Engine` exit 0, 122 / 122 · `cg005Olive` exit 0, 34 / 34 ·
    `cg006Requests` exit 0, 83 / 83.
  - Total **388** (373 before).
- `npm run template:garden` exit 0, run again after the last commit: **0 files of drift**.
- `node library/modules/garden-3d-kit/build.mjs` twice: the same sha256 `96b78569…380ee`.
- Page drive (`drive-pages.sh` repointed): exit 0, **179 / 179**, 0 console errors, 0 network errors. It ran twice,
  first with the placement uncommitted, then on `0545f0c69`'s tree; `deb28a761` came after and changes only the 3D
  kit's loads. It runs on the 2D node:
  that Chrome (`--disable-gpu`) has **no WebGL2** (measured: `getContext('webgl2')` = null, with and without
  `--disable-3d-apis`). So the rule picks 2d there, and it does so deterministically.
- Olive page drive (`drive-olive.sh pages`, on the final deploy): exit 0, **22 / 22**, 0 skip, 0 console errors.
  Shell `node --test`: exit 0, **90 / 90**.
- `drive-ig007-workshop.js --mode 3d` (final kit): exit 0, **21 / 21**, 0 console errors, 0 network errors.
  - **AC1** (the tulips end to end on the 3D node, each step checked against `Noodl.Variables.gardenWorld`): Pip
    starts on 0,3 facing right. Two forwards glide him to 2,3, and mid-way he read `gliding`. A left turn gives d 0 in
    both. Water: 1 of 3 wet in both. Fifteen presses give fifteen blocks; the fold makes 6; Play reaches the win card
    with 3 of 3 wet in both, and Pip ends where the engine ends.
  - Predict through the 3D canvas: a tap on 5,3 (`elementFromPoint` = the canvas) draws the flag at 2,3 in 3D; a tap
    on 2,3 plays and Pip ends on 2,3.
  - **AC4**: 4 s of the win card over the still scene: `data-idle`, no Too Slow. A main-thread hog (75 ms busy loops)
    with a finger held on the world swapped to 2D in **3.79 s**, stored `{ 2d, slow }`. The next open mounted **0**
    3D nodes. Grown-ups read the slow line; the switch wrote `{ 3d, grown-up }` and the Workshop was 3D again.
  - Frame Ms readout (software GL, a loaded box, NOT AC3): **17.3–28.3 ms** p95 over the final runs, 41 draw calls,
    41 meshes.
  - Earlier runs, each a finding, not a flake:
    - Run 1 (before on-demand and the caches) failed at Play: the rule fired during Play.
    - Run 2 lost the 3D node before the Predict hit, with Frame Ms reading 63.1 after two screenshots. The drive now
      waits for Frame Ms ≤ 34 after a shot.
    - Run 3 passed 20 / 20.
    - Run 4 lost the node under the win card (its `backdrop-filter: blur` over a MOVING canvas) → on-demand drawing.
    - Then 21 / 21 three times.
- `drive-ig007-workshop.js --mode nogl`: exit 0, **8 / 8**, in three runs. WebGL2 is really absent.
  - `{ 2d, unsupported }` is written; the 3D node mounted once and is gone; the 2D node draws.
  - The tulips pass on 2D (15 → 6 → win).
  - The next open mounts 0 3D nodes.
  - Grown-ups: "The flat garden is on: this computer cannot draw 3D.", with Flat garden pressed.
  - 0 console errors.
- `drive-ig007-3d.js` (fixture, final kit): exit 0, **18 / 18** (17 before; +VOCAB). Frame Ms readout 17.3–42.3 ms.
- AC2 readout: 24×16 / 30 things (now incl. rock, sign, note, stone, post box) / 3 robots (cans, loads, cap,
  sunflower) = **238 meshes** (15 instanced, 223 individual), ≤ 500.
- Measured in the RUNNING mockup (headless, swiftshader): `views.ws` dist **10.7466**, aspect **1.4359** (a 672×468
  stage), yaw 0.42, fov 38, camera at (6.51, 8.80, 8.63) looking at (4, 0.4, 3). The mockup's 35° is from the
  vertical, measured at the target's floor; the node now uses the same formula (the gate pins 10.7466).
- JSON: `shots/ig007-s2/drive-workshop-3d.json`, `drive-workshop-nogl.json`, `drive-fixture-3d.json`. Logs are in
  the lane's scratch folder.

**AC5, what was compared (looked at, not graded — the grade is Richard's).** The side-by-side images
`shots/ig007-s2/sbs-*.png` put the mockup on the left and the node on the right. `mockup-running-workshop.png` is
the mockup captured at the node's viewport.
- `sbs-ws`, the Workshop at 1368×912: the same corner-on camera, the island filling the stage with its turned
  corners cropped, sand rim, sea, mint checkerboard with visible grid lines, the same tree, house and rock
  primitives. What differs:
  - Our stage is 4:3 (the map's 8:6); the mockup's is 8:5.6.
  - The mockup's plot is Sami's stones with Cobble.
  - The mockup has a "Just driving" chip; the node has Pip's name pill.
- `sbs-robot`, a robot close: the node's Pip has the mockup's box body, visor, eyes, wheels and gold antenna ball,
  and the can on its right. The mockup's Echo shows an Olive bubble.
- `sbs-island`: the fixture's synthetic 24×16 (too many houses, water scattered) in a 640-wide page. The composition
  and framing read like the mockup's island; its content is not the mockup's (the island page is IG-004's).
- `sbs-vocab`: rocks shrink by `left`, the sign and the note, stones, the post box, Cobble in a cap and Pocket in a
  sunflower with a parcel, beside the mockup's Workshop.
- **Richard's grade, verbatim:** _____

**Deviations, with the reason.**
1. **The renderer choice is not in the profile.** It is the persisted `garden` store's own key `renderer`, stored as
   `{ mode: '3d' | '2d', why: '' | 'unsupported' | 'slow' | 'grown-up' }` beside `model` in `noodl_store_bot-garden`.
   - A GPU is the computer's, not the kid's, and the save code carries the family to another computer.
   - `modelOf` rebuilds the model and drops unknown fields. It lives in `cg002Scripts.ts` (lanes A and C), so a
     field there would have been a merge-risk hunk in the engine file.
   - Nothing stored reads as 3D.
2. **The States node starts on `2d`.** Its states are `2d,3d` so that the cheap node is the one mounted until the
   choice is read. Measured: on the first open the Workshop's 2D node was NOT mounted before the 3D one (the mount
   counter's only `.gd-world` insertion was the island page's).
3. **The kit has one output beyond §2's list: `Too Slow` (signal).** The 3-s rule is decided where the frames are.
   A page Function cannot tell visible, moving time from wall time, which is the trap §6 names.
4. **On-demand drawing changes `Frame Ms`' meaning.** It is timed only while the scene moves. That is what the child
   sees, and a still scene gives the CPU to Olive (AC3). The tablet's `timings.log` reading should be taken with
   Pip moving or a finger panning.
5. **Framing.** It is the mockup's `v.fit` for Plot and Island, which crops the turned corners. s1's
   everything-inside-a-margin framing is kept as the zoom-out bound only.
6. **"Drive" in AC1.** There is no Drive mode on this branch (IG-003 builds it). Pip is driven with the Teach pad,
   and each press moves him in the engine and in 3D.
7. **Lane A's note.** The 3D load draws `egg` and `food` as themselves too. `can: null` (free water) draws no level.

**Merge notes (read before the merged gates).**
- The pinned-copy clause over `parseRobots` compares every field garden-kit answers (order-free). It allows exactly
  the extras `can`, `canMax` and `carry`, and checks them against §4 written a second way. It is green on this branch
  and stays green after lane A's lines land. It goes red only if lane A's three lines differ from §4.
- 🔴 **The clause that WILL go red if lane A edits a port text:** "every input of Garden is on Garden 3D with the
  same type, name, group, default and description". If lane A changes `Garden`'s `things`/`robots` descriptions (or
  any input's), copy the new text into `kit3d.js` `inputProps` in the merge commit, rebuild the kit, and regenerate.
  The same holds for `DEFAULT_LEGEND`/`KINDS`/`parseThings` if lane A adds a tile kind or changes the thing filter.
- On this branch a page with both kits uses garden-kit's `parseRobots` (the sibling helper), which does not carry
  `can`/`carry` yet. The Workshop's 3D Pip shows no can level or load until lane A's lines land and `Logic/Draw
  world` passes those fields into `Robots`.
- Shared-file hunks, all appends or single-line list entries:
  - `cg003Components.ts`: `KIT_GARDEN_3D`, `C.guRenderer`, the `DRIVE` and `TYPE` entries, `Workshop/Play` (the
    stage's children and the new nodes and wires after `plGarden`), `GU_RENDER`, `Pages/Grown-ups` (the grid's
    children, the place, the wire list, the description), `CG003_COMPONENTS` (+`GU_RENDER`), `REQUIRED_MODULES`.
  - `cg003Scripts.ts`: two scripts before `TRANSLATE_ALL_SCRIPT`, two `GLUE_SCRIPTS` entries at its end.
  - `cg003Content.ts`: seven `PAGE_WORDS` before the `REQUEST_SUBS` spread.
  - `cg003Template.test.ts`: the AC1 module list, one describe block before "CG-007 — the look", two imports.

**Not done, and why.**
- **AC3** (the tablet) is Richard's.
- **AC5**'s grade is Richard's.
- **AC6**'s Windows installer is CG-008's workflow: not attempted.
- The deploy tool's wire checker still publishes the kit wires unchecked. Re-measured this session: 38 wires, and
  `uncheckedTypes` lists **all five** kit node types (game-kit's two and garden-kit's two as well as `Garden3D`), so
  it is not Garden 3D's. It blocks no drive; still open.

**Could not verify.**
- A real GPU's frame time. Every 3D reading is swiftshader on a Mac with a 1-minute load of 3–6.
- The tablet.
- What the win card's blur costs on a real GPU.
- Touch pinch on hardware (the gate grades the maths).
- The Workshop at 390×844 on the 3D node (the page drive runs 2D).
- FR on the 3D Workshop (the Grown-ups words are graded EN/FR by the template gate and the page drive's language
  clause).
