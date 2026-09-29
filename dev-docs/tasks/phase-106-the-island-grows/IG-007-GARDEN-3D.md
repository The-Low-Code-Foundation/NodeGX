# IG-007 — Garden 3D: the same ports, a flat-shaded world, graded on the tablet

**Opened 2026-09-28**, from README §1 global point 2 and ruling R2 ("go 3D"). **Status: 🟡 session 1 — module, node, gate and Mac drive built; page placement, fallback and the tablet wait for IG-001 and the mockup.**
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
