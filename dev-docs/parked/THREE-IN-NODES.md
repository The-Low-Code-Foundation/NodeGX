# Three in nodes — three.js as NodeGX nodes, and an editor for them

**Parked:** 2026-10-19, from a conversation with Richard. This isn't a phase. It becomes one only when it takes a lane
on the [board](../BOARD.md) and Richard says so. Unlike most parked pages it carries a **measured prototype**: a kit of
three nodes, a fixture, a drive, 8 / 8 clauses green on the day it was written (§3).

> "I've had several community members asking me to show them 'how NodeGX works with three.js in nodes' which I know at
> the moment we don't … is there a world where we can create for example a custom editor designed specifically for
> generating the three.js windows in the apps we've made? … if we can create a 'spec' like we did with the 130 NodeGX
> nodes for 'gaming nodes' that translates into three.js as much as in theory it would translate into Godot …
> that would be pretty awesome. A lot of vibe coders are obsessed with creating games and 3D representations of data."
>
> "Rock out" — Richard, 2026-10-19

## 1. The idea

Three layers, cheapest first, each one useful on its own.

1. **A `three-kit` in the main editor.** Around ten nodes: Scene, Camera, Light, Mesh, Group, Transform, Tween, Tap,
   Orbit, Body. A Scene is a visual node that draws a WebGL canvas; the others sit under it in the structure lane the
   way Groups and Texts do, and draw nothing themselves. A `For Each` under a Scene makes one mesh per row, so "a 3D
   representation of data" is Static Data → For Each → Mesh, six nodes. This answers the community's question.
2. **Specs for those nodes in `@nodegx/node-spec`**, the kit as their first target, a headless scene-graph face for
   the gates (a three.js Scene is inspectable with no GPU). This is what makes "the spec admits a Godot target" a true
   sentence: NSP-006 showed a stranger builds a target from the spec and the suite alone.
3. **The sub-editor.** A P112 kit editor that opens one component, the scene, with a 3D-flavoured picker and the real
   preview beside it. In the main editor the scene is a component whose interface is its Component Inputs; opaque there
   and openable here is a choice the format already permits. The groovebox (P114) is this with the nouns swapped.

## 2. What was measured before building (2026-10-19, HEAD `a2c4fc09c`)

| # | fact | consequence |
|---|---|---|
| 1 | The game kit (`game-kit`: Alien, Avatar, RaceTrack, AnswerPad, Sound, KeyboardMap, KeepStorage) is 2D SVG, no three.js. The only three.js in a node is `garden-3d-kit.Garden3D`, one node, 3,004 lines, a hard-coded scene with the 2D Garden's ports. P117's wall used three.js in a prototype page, shelved. | "NodeGX with three.js in nodes" is today one kit node with the scene inside it. Richard's premise, confirmed. |
| 2 | three.js is not an npm dependency anywhere in the tree; garden-3d-kit vendors `three.min.js` 0.158.0 (MIT) beside the kit, listed in `manifest.json` `dependencies`, and reads the `THREE` global at mount. | A new kit copies that mechanism exactly. Nothing to install. |
| 3 | The viewer runs React 19. A kit's React node accepts children by default (`allowChildren` defaults true, `react-component-node.ts` :1271), and `renderChildren` hands them to the component as React children, each child's own React element. | A Scene with Mesh children is the standard tree. Children can speak to the parent through a React context, which is what react-three-fiber does; nothing in the viewer has to change. |
| 4 | IG-007 drove Garden 3D in headless Chrome on software GL (`--use-angle=swiftshader`) through `drive-deployed.js`, reading ports through Variables and taking screenshots. | The prototype can be graded with drives that exist, not by eye. |
| 5 | A For Each hands each row's fields to its template's Component Inputs by name (landing-pages `WorkCard`). | A row template of one Mesh with Height wired from `value` is the whole "bar chart". |

## 3. The prototype, and what the drive says

**Built:** [`library/modules/three-kit/`](../../library/modules/three-kit/README.md) — `Scene`, `Mesh`, `Light`, 652
lines of ES5 in the garden-3d-kit shape, three.js vendored beside it. The fixture
[`three-in-nodes/fixture/`](three-in-nodes/fixture/): a page with one Scene, a Sky and a Sun, a spinning red ball
whose Y is a Variable, and a For Each over a Static Data of eight rows (`{name, value, x, colour}`) whose template
`/Parts/Bar` is one Mesh with Name, Height, X and Colour wired from the row. The drive
[`scripts/devtools/drive-three-kit.js`](../../scripts/devtools/drive-three-kit.js): assemble, `nodegx deploy
--allow-development-engine` (exit 0), headless Chrome on swiftshader, every reading out of a port or the scene graph on
the Scene's root, the screenshot a look check.

| clause | reading, 2026-10-19 |
|---|---|
| BOOT | the page drew; `index.html` loads `three.min.js` before `three-kit/index.js`; 0 console errors, 0 network errors |
| SUPP | Supported `true` out of the port; the root carries `data-ready` |
| READY | Ready fired once (a Counter into a Variable) |
| ROWS | **Mesh Count 9 out of the port**: the eight boxes the For Each made plus the ball; the scene graph holds one box per row with the row's name, in x order, each `scale.y` equal to the row's value and standing on the floor (`y = value / 2`) |
| PIXELS | 171 distinct colours in the canvas region of the screenshot (flat shading: nine solids and a grid; the garden's ≥ 200 was the wrong bar, the clause says ≥ 100 and why) |
| SPIN | the renderer's frame count rose 97 → 123 over 600 ms with nothing else changing: the ball spins, the still parts cost nothing |
| WIRE | `Noodl.Variables.set('ballY', 4)` moved the ball to y 4 in the scene graph: the graph owns the position |
| TAP | a CDP press and release at the tallest bar's projected centre (532, 150) fired Tapped once, Tapped Name `"sat"` — a raycast across nodes, back out through a port |

**8 / 8.** Screenshots: [the first frame](three-in-nodes/shots/01-scene-first-frame.png) (camera too close, bars
clipped) and [after the tap](three-in-nodes/shots/02-after-tap.png) (reframed). Readings:
[`drive-2026-10-19.json`](three-in-nodes/drive-2026-10-19.json).

**What the first run found.** 5 / 8: the For Each made ONE mesh (Mesh Count 2 for 9). Every row's Mesh is the same
node rendered eight times, so `noodlNode.id` was the same in every row and the eight writes landed on one object. The
fix is a ref made once per mounted component. Filed as `PARKED-THREE-S1-INSTANCEID` (low): the kit types say nothing
about it, and the next kit author will key by node id too.

**What it did not measure.** A GPU (software GL only); a touch tap (the mouse path only); more than nine meshes; the
editor (the deploy and the viewer only — the picker does not list these nodes, §5); the look beside a mockup (there is
no mockup: the screenshot is a readout, not a grade).

## 4. The vocabulary, ranked by the two surfaces Richard named

Games, and 3D representations of data. Not by what three.js offers.

| rank | node | why first | built? |
|---|---|---|---|
| 1 | Scene (camera and orbit inside it) | nothing without it | ✅ |
| 2 | Mesh (six primitives, Sit On Floor, Spin, Tapped) | a bar, a ball, a tile, a wall, a player | ✅ |
| 3 | Light (sun, lamp, sky) | a scene with none is black | ✅ |
| 4 | Group (a transform with children) | a robot is a group of meshes; a For Each of groups is a row of robots | |
| 5 | Tween (Animate To Value in 3D: X Y Z, rotation, scale, over ms) | movement is what makes it a game and a chart that updates | |
| 6 | Text (a label projected from a point: a DOM overlay, the Garden's bubble) | a chart with no labels is a sculpture | |
| 7 | Camera as its own node (position, target, Follow) | a game follows a player; a data view frames a selection | |
| 8 | Body (a box or sphere with gravity and bounces, the wall's physics) | the kids' phases asked for it twice | |
| 9 | Model (a glTF file from assets) | the vibe coder's first question after the primitives | |
| 10 | Material (textures, shine) | last: flat shading is the look that worked every time (IG-000, TBM-008) | |

Out, on purpose: shadows, post-processing, a viewport with gizmos. The editor is the graph; the preview is the real
app (P112 R4).

## 5. What it would need to become a phase

- **The catalog, the picker and the MCP.** Nodes a module registers at runtime are not in the build-time catalog
  (`library/modules/README.md` :144); the editor's picker and `noodl-mcp`'s validator learn a kit through the kit
  catalog (`nodegx-kit-catalog`, `kitOverlay.ts`). A new node type owes both (harness pointers). Today the fixture
  deploys and runs; it would not validate through the MCP.
- **Layout inputs on the Scene.** It has `defaultCss` and no Width / Height ports; a page sizes it by its parent.
- **The ten nodes** (§4), each with the four or five inputs a person wants, not the forty three.js has.
- **Specs** (layer 2): a headless face that reads the Scene's graph (the drive's `census()` is its first draft), the
  format's `act` for a tap and a drag, scenarios for Tween and Tap. NSP-016's layout model has nothing to say here:
  a transform is three numbers, easier than flexbox.
- **The sub-editor** (layer 3): the P112 kit applied to one component. Not before the vocabulary exists.
- **A demo designed before it is built.** P117's post-mortem: engineered before designed, no gate graded fun. A kit
  is infrastructure, so fun is the user's problem; the first demo still needs a mockup and a grade.

## 6. Rulings to ask Richard, when it is unparked

- R1 **Which layer first.** The recommendation is layer 1 as a published kit in the picker, the data demo (Static Data →
  For Each → Mesh) its first example; the sub-editor waits.
- R2 **Where the kit ships.** `library/modules/` like the others, or `@nodegx/three-kit` on npm beside the P112
  packages (the vibe coder installs with no editor).
- R3 **The Godot sentence.** Say "the spec admits other targets" and build none, or scope one batch (Mesh, Tween, Tap)
  as a NSP-006 stranger round in GDScript to prove it.

## 7. Files

- `library/modules/three-kit/` — the kit (`src/kit.js`, `build.mjs`, `library.json`, `project/noodl_modules/three-kit/`
  with `index.js`, `manifest.json`, `three.min.js`, `LICENSE.txt`)
- `dev-docs/parked/three-in-nodes/fixture/` — the project; `shots/`, `drive-2026-10-19.json` — the readings
- `scripts/devtools/drive-three-kit.js` — the drive
- `dev-docs/bugs/parked-three-s1-instanceid-….md` — the finding
