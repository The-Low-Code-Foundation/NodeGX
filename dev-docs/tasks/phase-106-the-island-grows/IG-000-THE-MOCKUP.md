# IG-000 — The mockup: the island as a 3D world, the robots, the three modes

**Opened 2026-09-28**, from the ruling "go 3D and a bit more open world". **Status: ⬜ not started.** Depends on
nothing. Lane M (its own worktree is not needed: it writes only under `tpl-012-mockups/` and an artifact).

## 1. The person sentence

> **Richard opens one page, sees his daughters' island from above in flat-shaded 3D, pans to a plot where a
> robot is still watering, taps an islander, and drives a second robot in a Workshop that has Drive, Teach
> and Play — and says yes or no to the look before a kit node is written.**

## 2. What it is

A playable HTML artifact in the shape of P105's mockup (`../phase-78-the-templates/tpl-012-mockups/bot-garden.html`
and https://claude.ai/artifact/Bu4ZBYvh1PenHzAtLQTCJq), with the same palette, fonts and copy, and three new screens:

- **Island (3D).** A 24×16 tile island in three.js (from cdnjs in the artifact; vendored in the kit later),
  flat-shaded primitives only: boxes for tiles with a little height, cone-on-cylinder trees, an icosahedron
  rock, a box-and-prism house, stem-and-bulb tulips, the robots as a box body with a visor. One directional
  light, one hemisphere light, no shadow maps. A 35° camera that pans with one finger or a drag, zooms with a
  pinch or a wheel, and a "find my robots" button. Three plots: one won (its robot loops a watering program
  live), one open (an islander with a speech bubble), one locked (a fence and a padlock).
- **Workshop (3D scene, same blocks).** The plot's 8×6 seen through the same camera, the block panel as
  today, and the bar **Drive · Teach · Play · One step · Start over**; Drive moves the robot with the pad and
  records nothing; Teach records. The running block gets the new ring (IG-001 D5).
- **My robots.** A card per robot: name (editable), colour, hat slot, its abilities as its palette, its
  upgrade slot (bigger can / bigger basket), where on the island it works. Locked robots show who lends
  them.
- **Olive reads.** The three blocks (`read`, `is it a…?`, `say`) with their cards, and one played example:
  a note on a plot, Olive reads "the red ones", the `if Olive read` block steers.

## 3. Acceptance criteria

1. The artifact runs in Chrome on the Mac and in Edge on Windows 10 (the tablet's browser) with no console
   error; the island scene holds 30 fps or better on the tablet with the three plots animating — the first
   frame-time reading this phase has (a `stats` line in the corner, hidden by a key).
2. Every screen is in EN and FR from the P105 word table; no new string is untranslated.
3. The three plots, the three modes and the robot cards are clickable, not pictures; the won plot's robot
   actually steps its program in a loop.
4. The 3D look is graded by Richard against nothing (it is the first): his words go into this file verbatim,
   and IG-007 builds to this mockup, not to a description.
5. A screenshot of each screen sits in `tpl-012-mockups/island-3d/` beside the HTML, for IG-007's side-by-side.

## 4. How to build it

One file, no build step, three.js from `cdnjs.cloudflare.com/ajax/libs/three.js/` pinned to one version; the
P105 mockup's CSS and word table copied in, not linked. Keep the scene builder in one function that takes the
engine's world shape (`{map, things, robots}`) so IG-007 can lift it into the kit node.

## 5. Gates

The artifact opens on the tablet (Richard, by hand) and the stats line is read there; that number is written
in §7 before IG-007 starts.

## 6. Traps

A working wireframe is not the mockup: the palette, fonts and copy are the P105 mockup's, or the look is not
graded. No shadow maps, no post-processing, no textures: the tablet's HD 615 and the model on the same CPU.
`OrbitControls` is a separate file on cdnjs; pin both to the same version.

## 7. Session 1 (2026-09-28, Lane M, branch `ig000-mockup` cut from `4020fd1c0`)

**Built.** `../phase-78-the-templates/tpl-012-mockups/island-3d.html` (107,713 bytes, one file, no build step, three.js
pinned to `cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js`, the classic `THREE` global). Published as
the artifact **https://claude.ai/artifact/9pxL78hWRmogb4VAreDrDM** (title "Olive's Island 3D", version 2) — the
page Richard opens on the tablet. P105's palette tokens, Fredoka + Nunito, chrome, block panel and word table are
copied in, not linked; the word table is 150 keys in EN and in FR, and a self-check at load writes a console error
naming any key missing in either language (it logs `word table ok: 150 keys in EN and in FR`).

- **The scene builder is one block:** `<script id="scene-builder">` exports `GardenScene.buildScene(world, opts)`
  over the engine's shape from the top of `kit.js` (`{map: {rows, legend}, things, robots}`), no page code in it,
  no backticks, reads only the `THREE` global. It returns `group / update(world) / tick(now) / tileAt(ray) /
  pointOf(sel) / celebrate(i) / dispose()`. Every tile is ONE merged vertex-coloured mesh (box per tile, height per
  kind: water .14, bed .30, path .34, grass .40); trees cone-on-cylinder, rocks icosahedra in three sizes by
  `left`, house box-and-prism, tulips stem-and-cup (dry: tilted and paler; `colour: pink | yellow`), robots box
  body + visor + eyes + antenna + hat + accessory (can with a visible level, hod with the stones it carries,
  satchel, bell). `MeshLambertMaterial` `flatShading` only; one directional + one hemisphere light; no shadow maps,
  no textures, no post-processing. Glides and turns lerp over `stepMs`, a bump is a recoil keyed on the bump COUNT,
  celebrate is a hop. Bubbles and name chips are DOM overlays projected from `pointOf`.
- **Camera:** no OrbitControls (its UMD build is not on cdnjs for r158, and IG-007 §2 inlines one anyway): a
  ~70-line controller, fixed 35° tilt from vertical, one finger / drag pans, two fingers pinch, wheel zooms, both
  within the map's bounds; a tap (≤ 8 px, < 500 ms) raycasts to a tile; "Find my robots" fits every robot.
- **Island (24×16):** plot A Mamie Rose WON — Pip loops `fill · repeat 3 {water, right, fwd, fwd, left} · left ·
  repeat 6 {fwd} · right` on a timer (never on a frame), the can level empties, Mamie says thank you each lap;
  plot B Sami OPEN — Sami with a tappable speech bubble; plot C Biscuit LOCKED — a fence and a bobbing padlock.
  Tapping a plot in 3D or its card fits the camera to it and writes the line (won / open → Workshop / locked).
- **Workshop:** Sami's 8×6 through the same camera, Cobble (lent by Sami), the P105 block panel with Cobble's
  palette (`fwd left right pick put repeat until`; band 7–9 drops the control blocks), the bar **Drive · Teach ·
  Play · One step · Start over**. Drive shows the pad (every action of the robot's palette) and records nothing;
  Teach resets the robot to the start and records every press; Play runs; One step steps. The running block
  wears IG-001 D5's ring: 3 px ink ring + 4 px white halo + scale 1.04. Winning (3 stones laid) pins the program
  and Cobble to plot B, which then loops on the island beside Pip; plot C opens and Pocket is lent.
- **My robots:** Pip / Cobble / Pocket / Echo per IG-005 §2 — editable name (renames everywhere), colour swatches,
  hat slot, abilities as palette chips, upgrade slot (owned or "empty · from {islander}"), where it works; locked
  ones name who lends them and after what.
- **Olive reads:** the three blocks `read`, `is it a…?`, `say` with their line and example; the played example
  on Mamie's plot: `read [the note]` → Olive's bubble "Olive read: the red ones", `if Olive read [red tulips]`
  runs (`go to` walks the BFS path, `water`), `if Olive read [yellow tulips]` is greyed as skipped.
- **Stats line:** `s` toggles a corner line with rolling p95 frame ms, fps, draw calls, triangles and the view.

**Readings (all from the worktree; screenshots in `../phase-78-the-templates/tpl-012-mockups/island-3d/`).**

- `node --check` on both script blocks: exit 0, exit 0.
- Screenshot drive (own CDP script over the repo's `ws`, headless Chrome 1368×912, `--use-angle=swiftshader
  --enable-unsafe-swiftshader`, private port 9377 and profile, torn down by pid): `node drive.js` → **exit 0,
  24 passed, 0 failed, 24 total** (first reading; the previous run was 23/24 on a 10.4 s wait that was shorter
  than the Olive example's ~20 timed steps — a driver budget, not a product fault). Console: **0 errors, 0
  exceptions, 0 error log entries**; 2 console messages: three.js's own deprecation warning for `build/three.min.js`
  (removed at r160) and the word-table `ok` line. Clauses include: won robot's state changes over 1.8 s; three
  cards won/open/locked; fence + padlock things + Sami's bubble present; a real pointer tap on the locked plot
  selects it; `s` shows the stats line; bar text EN and FR; Drive: 3 presses move the robot and `0 blocks`; Teach
  resets to the start and records 13 blocks; the running block's computed box-shadow holds `rgb(46, 42, 61) 0 0 0
  3px` and `rgb(255,255,255) 0 0 0 7px` and a transform; the win; One step after a run; four cards; rename
  propagates; colour propagates to the island port; three Olive cards; Olive's bubble reads "Olive read: the red
  ones"; the example ends with the pinks watered, the yellows dry and one skipped `if`; two robots loop on the
  island after the win. 13 screenshots `01-island.png … 13-island-two-robots.png`, looked at.
- Stats read in that drive (software GL on the Mac, NOT the tablet, NOT a real GPU): island whole `p95 16.7 ms ·
  59 fps · 50 draw calls · 5378 tris`; island zoomed on Pip `p95 33.4 ms · 51 fps · 53 draw calls`.
- The drive log JSON sits in the lane's scratch dir (`ig000-mockup-scratch/drive-log.json`), not in the repo.

**Acceptance criteria.**
1. Chrome on the Mac (headless): 0 console errors — done. Edge on Windows 10 and the tablet's 30 fps with the plots
   animating: **Richard's reading, below.**
2. Done: 150 keys in both languages, self-check at load, FR screenshots 08 and 12.
3. Done: plots, modes and cards are clickable in the drive (real CDP pointer events after `elementFromPoint`);
   the won plot's robot steps its program in a loop on a timer.
4. **Richard's grade, below.**
5. Done: 13 screenshots beside the HTML.

**Deviations, with the reason.**
- §2/§6 say `OrbitControls` pinned to the same version: not used (no UMD build on cdnjs for r158; a small pan/zoom
  controller for a fixed-tilt camera is what IG-007 §2 wants inlined anyway).
- The Workshop is Sami's stones plot with Cobble, not Mamie's tulips with Pip: the person sentence drives "a
  second robot", and R3's fetch-and-return (`pick` from a rock that shrinks, `put` on the gaps) is the loop Richard
  described. Three gaps, not four, so the reference program is `repeat 3 {pick} · right · repeat 3 {put, fwd, fwd}`.
- The scene builder takes Thing kinds the kit does not have yet — `fence {w,h}`, `padlock`, `islander {who}`,
  `note`, `sign`, `stone`, `postbox`, `rock {left}` and `tulip.colour` — and robot fields `accessory / can /
  canMax / load`. They are IG-002/IG-004/IG-005/IG-007's vocabulary; the block's header documents each.
- Winning in the Workshop unlocks plot C and lends Pocket (R8's consequence made visible); plot C's own workshop is
  not built, and its line says so.
- P105's tidy/fold box is not carried into the block panel (not part of the look being graded).
- three.js r158's `build/three.min.js` logs a deprecation warning: IG-007 vendors exactly r158 (or the module
  build) — a later classic build will not exist.

**Could not verify.** The tablet (fps with Olive in flight, Edge, touch pinch — the two-pointer path ran only by
reading, headless CDP sends one mouse); a real GPU frame time on the Mac (headless swiftshader only); the page
inside the claude.ai artifact frame (the drive opened the file directly; cdnjs and Google Fonts are on the
frame's allowlist, and `file://` has no allowlist at all).

**Richard's lines (AC1 tablet reading and AC4 grade — leave for him):**
- AC1, on the tablet, stats line, island with the plots animating: `p95 … ms · … fps` — _____
- AC4, the look, verbatim: _____
