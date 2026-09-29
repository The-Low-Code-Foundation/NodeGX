# Garden 3D Kit

One node for Olive’s Island (Phase 106, IG-007): `Garden 3D`, the flat garden of `garden-kit`’s `Garden` drawn
in the round with three.js, on exactly the same ports plus a camera, two readouts and the fallback’s cue. The source is
`library/modules/garden-3d-kit/src/kit3d.js`; `index.js` is that file under a banner (`build.mjs`). Nothing
is bundled into it: three.js is vendored BESIDE it as `three.min.js` and listed in `manifest.json`
`dependencies`, so the page loads it first and the node reads the `THREE` global (the maplibre pattern).

The rule every node follows: **the kit draws; the engine interprets.** `Garden 3D` does not know what a wall
is — it draws the tiles the map names and the robots where the graph says they are. Which block is running,
whether a tulip is watered, where a puddle appeared: all of it arrives on a port. A page that holds `Garden`
today swaps the node and changes nothing above it.

## Garden 3D (`garden-3d-kit.Garden3D`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Map | input | object / JSON | `{ rows: ["GGTGGGTH", …], legend: { G: "grass", … } }` or just the rows. Kinds: `grass path water tree rock house bed postbox`. A `bed` draws a dry tulip until a Thing waters it; a `rock` tile is decorative and yields nothing. Ragged rows are padded with grass. |
| Things | input | object / JSON | `[{ kind, x, y, … }]`: `tulip` (`watered`, `colour`), `puddle`, `letter`, `bowl` (`full`), `label` (`text`, a DOM pill), `stone`, `postbox`, `egg`, `food`, `flag`, `rock` (`left` 0–4: big at 3 and up, medium at 2, small at 1, nothing at 0), `sign` and `note` (their `text` is not drawn on the tile). |
| Robots | input | object / JSON | `{ x, y, d, colour, eyes, hat, name, bump, can, canMax, carry }`. `d` is 0 up, 1 right, 2 down, 3 left. `bump` is a count: raise it once per bump and the robot recoils in place. The can shows `can` of `canMax` as its water level (none at all when `can` is null, empty at 0); the load on the robot’s back is the last entry of `carry` (`stone`, `letter`, `egg`, `food` as themselves, anything else a parcel). Two robots on one tile are drawn smaller, offset, never overlapping. |
| Bubble | input | object / JSON | `{ robot, text, style: plain \| olive, ms }`. A DOM overlay projected from the robot’s head; the text stays selectable. |
| Step Ms | input | number | How long a glide takes. Default 380. |
| Celebrate | input | signal | The robots hop for a moment. |
| Label | input | string | What a screen reader calls the world. |
| Camera | input | enum | `plot` (default) frames the Focus rectangle, the whole map when Focus is empty; `island` frames the whole map; `follow` keeps robot 0 in the middle. A finger can always pan and zoom within the map. |
| Focus | input | object / JSON | `{ x, y, w, h }` in tiles. |
| Tile X, Tile Y | output | number | The last tapped tile. |
| Tile Tapped | output | signal | A tile was tapped (a press that moved ≤ 8 px; a drag pans). |
| Ready | output | signal | The world is on the page: the first frame drew. |
| Frame Ms | output | number | The rolling p95 of the last 60 frame intervals, in ms, reported at most twice a second, measured only after Ready, only while the document is visible and only while something moves (the scene is drawn on demand). Above 33 is under 30 fps. |
| Supported | output | boolean | True when three.js is on the page and a WebGL2 context could be made. False: nothing is drawn, nothing throws, Ready never fires — the page swaps in `Garden`. |
| Too Slow | output | signal | Fires once when Frame Ms has stayed above 50 ms for 3 s of moving, visible time — the page’s other cue to swap in `Garden`. |

Gestures: one finger, a pen or a mouse drag pans (the ground stays under the finger); two fingers pinch or a
wheel zooms, between a three-tile close-up and the whole map with a quarter’s margin; a press that moves
≤ 8 px taps the tile under it. The camera is the mockup’s (`tpl-012-mockups/island-3d.html`): 35° from
straight down, turned 0.42 rad about the vertical, a 38° lens, aimed at the tile tops, and its framing (the
width or the tilted depth, × 1.18 + 1.2) fills the stage and lets the turned corners run off it. The first
framing is redone when the stage gets its size, until a finger has moved the camera.

The scene is drawn **on demand**: a frame while a robot glides, turns, recoils or hops, a tulip stands up, the
camera glides or a finger is on the world, and none while it is still — the CPU stays free for Olive, and a
still scene under the win card is never timed. Geometries and materials are made once per node and shared by
every rebuild.

The scene (the mockup’s primitives and palette): the sea, a sand rim and a green base under tile boxes a hair
apart, with a height per kind (water lowest, then bed, path, grass), one `MeshLambertMaterial` per colour with
flat shading, trees as a trunk under two six-sided cones, rocks as a squashed icosahedron, the house as a box
under a gabled roof, tulips as a stem, two leaves and a cup (dry: tilted and paler), a puddle as a flat disc,
robots as a box body with a white visor, eyes, a mouth, two wheels, an antenna with a gold ball, a hat (cap,
sunflower, crown), the can on the right and the load on the back. Tiles and tile decorations are instanced per
kind, so a 24 × 16 island with thirty things and three robots is under two hundred and fifty meshes. One
directional light and one hemisphere light; no shadow maps, no textures, no post-processing. Reduced motion
stills the glides, turns, recoils, hops and pops.

## What it bundles, and the licences

- **three.js 0.158.0**, `three.min.js` (651,651 bytes), the UMD build from the npm package, unmodified;
  copyright 2010-2023 three.js authors, **MIT** — `LICENSE.txt` beside it. It is loaded from the project’s own
  files as a manifest dependency, never from a CDN; the built file carries no `fetch`, no `http` URL and no
  `<img>`. The UMD build prints one `console.warn` when it loads (three.js deprecates the UMD script from
  r150 and removed it at r160, which is why the version is pinned).
- The kit’s code is part of OpenNoodl / NodeGX and carries the repository’s licence (GPL-3.0).
- `icon.png` (the library-shelf icon) is garden-kit’s (itself game-kit’s) icon, copied as a placeholder.
- No other asset: every shape is a primitive; no Kenney or downloaded pack (IG-007 §6).

The parse helpers (`parseMap`, `parseThings`, `parseRobots`) are garden-kit’s own when that kit is on the same
page (found through `window.__noodl_modules` at render time); a copy inside this file stands in when it is
not, and the kit gate pins the copy to the original. The desktop shell lists three.js in its
`licenses/NOTICE.txt`.
