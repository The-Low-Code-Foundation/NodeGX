# IG-007 — Garden 3D: the same ports, a flat-shaded world, graded on the tablet

**Opened 2026-09-28**, from README §1 global point 2 and ruling R2 ("go 3D"). **Status: ⬜ not started.**
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
