# Three in nodes — three.js as NodeGX nodes, and an editor for them

**Parked:** 2026-10-19, from a conversation with Richard. Unlike most parked pages it carries a **measured prototype**:
a kit of three nodes, a fixture, a drive, 8 / 8 clauses green on the day it was written (§3).

**Picked up the same day (s2):** Richard, *"Let's continue the custom three.js editor work"*, then ruled **R1 nodes
first** and **R2 on npm too** (§6). s2 added the 3D Group node, Width and Height on the Scene, Name as the card title,
and measured the catalog route: **12 / 12** on the drive, **5 / 5** on the catalog spec (§3.1). It still has no lane on
the [board](../BOARD.md); which slot it takes is Richard's to name.

**s3 (same day):** the kit is the npm package `@nodegx/three-kit`, ready for lane 1's next cut (`npx @nodegx/three-kit
add`); a Mesh outside a Scene now says so to the agent; and the agent's own render harness, which had **no WebGL**, draws
the scene (§3.2).

**s4 (same day): the separate editor, first.** Richard: *"Maybe we should already make the separate editor? I'm a bit
worried about how it'll look in the existing NodeGX editor. I'd like to be able to start testing it before we do more"*,
so R1's order changed (§6). [`three-in-nodes/editor/`](three-in-nodes/editor/README.md) is **NodeGX Scene**: an outline,
a palette of ten things to add, an inspector from the kit's own port definitions, and the real app in the middle, where
a click selects, a drag moves, and a setting reaches the running app as it changes. It puts a 3D scene on any page of an
app that has none, installing the kit first (§3.3).

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
editor (the deploy and the viewer only); the look beside a mockup (there is no mockup: the screenshot is a readout, not
a grade).

### 3.1 s2 — the catalog, a 3D Group, a size (2026-10-19)

**The catalog was never the gap.** §5 said the kit "would not validate through the MCP" and the picker "does not list
these nodes". Neither had been measured. A kit in a project's `noodl_modules/` reaches the MCP through the project
overlay (CN-003), the route garden-3d-kit takes. [`three-kit-catalog.test.ts`](../../packages/noodl-mcp/tests/three-kit-catalog.test.ts)
runs it on this fixture: the overlay holds all four nodes, each `inNodePicker: true` with every declared port; the
fixture validates through `validateOnDisk` (what `validate_project` runs) with 0 errors; the control, the same project
without the kit, says `unknown-node-type`. What the overlay can't hold: "a Mesh belongs under a Scene". The bridge
registers every kit React node as `Visual` and the hierarchy rule is category-only, so a Mesh under a plain Group
validates clean and draws nothing (**PARKED-THREE-S2-MESHOUTSIDE**, low). The editor's picker itself was not driven.

**Built:** `3D Group` (`three-kit.Group`): Name, X Y Z, Rotation Y, Scale, Spin; Tapped when any mesh inside it is
tapped; a mesh with no Name is reported by the nearest group's. React runs a child's effects before its parent's, so
the engine parks a child in the scene and the group adopts it when it arrives. **Width and Height on the Scene**
(`inputCss`, the built-in controls' way; defaults 100 % × 360 px). **Name as the canvas card title** on Mesh and Group
(`usePortAsLabel`).

**Not built: Tween.** The built-in **Animate To Value** is the tween: its Current Value wired into a Mesh's or a 3D
Group's X glides it. The fixture's robot does exactly that.

| clause (new or changed) | reading, s2 |
|---|---|
| ROWS | Mesh Count **12** out of the port: the eight bars, the ball, the robot's three parts (a group is not a mesh) |
| GROUP | the robot is a 3D Group of 3 meshes; its body's world position is the group's (x −6, z 4, centre y 0.8), and the eye sits where a 30° turn puts it (x + 0.21, z + 0.36) |
| SIZE | the canvas is 1024 × **520**: Height set in the graph (the old fixed height was 360, so 520 can only come from the port) |
| ANIM | robotX −6 → 6: 2.76 at 300 ms, 6 after 1.5 s, body with it |
| GTAP | a tap on the robot's unnamed body: Tapped Name `"robot"`, the group's Tapped once, the Scene's twice in all |

**12 / 12.** Readings [`drive-2026-10-19-s2.json`](three-in-nodes/drive-2026-10-19-s2.json); the scene at 520 px
[before](three-in-nodes/shots/s2-01-scene.png) and [after the robot glided](three-in-nodes/shots/s2-03-robot-glided.png).

### 3.2 s3 — on npm, a Mesh that says where it is, and an agent that can see it (2026-10-19)

**The package.** `library/modules/three-kit/` is `@nodegx/three-kit` 0.1.0: `package.json` at the entry's root, so it
is no workspace and `package-lock.json` does not move; `files` ships the bin, the built kit folder and the README
(8 files, 189 kB packed). `npx @nodegx/three-kit add [projectDir] [--force]` finds the project at or above the folder,
copies the kit into `noodl_modules/three-kit/` and records the editor's `imported` provenance arm
(`fromProject: "@nodegx/three-kit@0.1.0 from npm"`, `entry`, `entryVersion`), keeping other kits' records. A second add
is a no-op; a different copy (someone's edits) is refused without `--force`. **Why a copy and not "the loader reads
`node_modules`"** (GRV-002 §4.2 asks for the pick): every loader (editor, preview, `nodegx deploy`, the MCP overlay)
already reads `noodl_modules/`, so one writer here beats four readers changed there. GRV-002's other half, the project
naming the kits it needs, is not built. **Not published:** the publish is Richard's, with lane 1's next cut.

**Graded.** `node --test library/modules/three-kit/test/*.test.js` **5 / 5**. The published-artefact route: `npm pack`,
the tarball installed in a scratch folder, its bin run in a fresh copy of the fixture, `nodegx deploy`, the drive:
**12 / 12** ([`drive-2026-10-19-s3-npm.json`](three-in-nodes/drive-2026-10-19-s3-npm.json)). Not measured: the editor's
picker with the kit installed (still owed), and whether a running MCP picks the kit up without a reopen (the overlay is
keyed on kit file mtimes, so it probably does; the bin's message says "reopen" until that is measured).

**PARKED-THREE-S2-MESHOUTSIDE, the kit's half.** A Mesh, Light or 3D Group with no Scene above it logs one
`console.error` naming itself, once per node and name. An error and not a warning because `render_report` collects
errors only (measured in `render-capture.js` and `render-report.js`). The drive's `--outside` variant is the bug's
repro (the ball moved to the Layout Group): **OUTSIDE 1 / 1** ([`drive-2026-10-19-s3-outside.json`](three-in-nodes/drive-2026-10-19-s3-outside.json));
the same site with the HEAD kit **0 / 1**, `consoleErrors: []`. The main run's BOOT (no console error) is its control.
`validate_project` and the editor's drop still say nothing: that half is option (a), a format change.

**PARKED-THREE-S3-NOWEBGL (high, fixed).** Opening the outside variant through the MCP and calling `render_report`
returned the finding, and a white page reading **"No WebGL here"**: the agent's harness ran Chrome with `--disable-gpu`
alone, so every three.js scene (this kit, garden-3d-kit) was blank to an agent. Software GL beside it
(`--use-angle=swiftshader --enable-unsafe-swiftshader`) in `render-report.js` and `drive-page.js`: gl false → true, the
fixture's 12 meshes drawn. [`three-kit-render.test.ts`](../../packages/noodl-mcp/tests/three-kit-render.test.ts) **3 / 3**
(WebGL with default flags; the outside page's `console-error` finding; the in-Scene control without one); with the two
flags removed, the first test reads `gl: false`. Nine render and drive specs **96 / 96** after the change. npm users get
it with the next `@nodegx/mcp` cut (`dist/render-harness` is rebuilt from these files).

### 3.3 s4 — NodeGX Scene, the separate editor (2026-10-19)

**What it is.** A page and a small server in [`three-in-nodes/editor/`](three-in-nodes/editor/README.md), built from the
npm kit the way the P112 editors are: `@nodegx/preview` 0.2.2 renders the app in the page (it already loads a project's
`noodl_modules` kits in memory, `inPage/kits.ts`), `@nodegx/project-contract` reads and saves (the map editor's
`core/commit.mjs`: validate first, write only on the revision read). Left: Add (Box, Ball, Cylinder, Cone, Ring, Tile,
Group, Sun, Lamp, Sky) and the scene's tree, where a row dragged onto a Group goes inside it and a For Each shows its row
template in italics. Middle: the app. Right: the selected thing's settings, laid out per kind (Shape, Colour, Place,
Size, Motion), each port's label, default and choices read from the running app's node library, so the editor cannot
drift from the kit. Edit / Play at the top.

**Three mechanisms, all existing ones.** (1) A setting goes to the running app through the runtime's own
`graphModel.getComponentWithName(…).getNodeWithId(…).setParameter` (what the editor's live preview calls,
`editormodeleventshandler.ts`), every instance at once, no rebuild; only a tree edit re-renders, keeping the orbit.
(2) Picking, orbit and zoom are three-kit's own (`pick`, `orbit`, `zoom` on the engine at `root.__threeKit`); a drag is
the pointer's travel over a plane through the object, turned into its parent's own space, so a mesh inside a turned,
scaled 3D Group follows the pointer. (3) **The stage:** in Edit the preview gets the same files with the scene's page as
`rootNodeId` (the page's root renamed for the stage alone, since the root is found by id across components), so a scene
behind a sign-in is on screen. Play renders the real root. Measured on the todo app: without the stage, the new scene
sat behind the sign-in page and could not be edited; with it, it is the page.

**The kit's seam.** Each three.js object carries `userData.nodeId`, the id of the node that made it (`nodeIdOf`,
`props.noodlNode.id`), and the census reports it: every row of a For Each shares its template's id, which is how a
picked bar selects its For Each. Additive: the catalog and render specs **8 / 8**, the add test **5 / 5** after it.

**Graded** (headless Chrome on software GL, fresh copies every run; `tests/*.json`):
- `editor.json` on the fixture: opens on the stage, 12 meshes, the outline as the files say; a click on the robot's body
  selects it and boxes it; a swatch recolours it live in the same frame; a 160 px drag moves it x 0 → 3.25 inside its
  group; with the robot selected, a drag on its head moves the robot z 4 → 7.5 and leaves its X to the wire from
  `robotGlide` (Animate To Value) and the head's own settings unchanged; one undo takes the drag back; add, group,
  reparent, undo; an empty click selects the Scene; an orbit then **Use this view** writes the camera; Save: "the
  project validates"; Play: the layer off, the app as built.
- `add-scene.json` on `templates/todo-list` (no kit, no scene): the card lists Pages/Todo and Pages/Sign in; **Add a 3D
  scene** on Todo installs the kit, adds Sky, Sun and Box and draws them on the stage; a ball and a ring; Save validates;
  Play shows the sign-in page, as the app runs.
- `demo.json`: the open screen, **Try the demo** (a temp copy), hovering names the head, a Lamp's marker dragged moves
  the lamp x 0 → -2.5.

**Found while building, fixed there:** the no-scene card's `display: grid` beat its `hidden` attribute, so a black panel
covered the view and ate every click (the first drive's "clicks do nothing"); a drag on an object with a wired axis was
refused outright, now the other axes drag.

**Not checked:** the feel on a real screen and a real GPU (Richard's), the main editor opening a project this editor
saved (its files pass the kit's `validateStructure`), rotation by dragging (a slider today), light markers above the
view (off screen, so selected from the outline).

## 4. The vocabulary, ranked by the two surfaces Richard named

Games, and 3D representations of data. Not by what three.js offers.

| rank | node | why first | built? |
|---|---|---|---|
| 1 | Scene (camera and orbit inside it) | nothing without it | ✅ |
| 2 | Mesh (six primitives, Sit On Floor, Spin, Tapped) | a bar, a ball, a tile, a wall, a player | ✅ |
| 3 | Light (sun, lamp, sky) | a scene with none is black | ✅ |
| 4 | Group (a transform with children) | a robot is a group of meshes; a For Each of groups is a row of robots | ✅ s2, as `3D Group` |
| 5 | Tween (Animate To Value in 3D: X Y Z, rotation, scale, over ms) | movement is what makes it a game and a chart that updates | ✅ s2: **no node**, the built-in Animate To Value wired into X (ANIM) |
| 6 | Text (a label projected from a point: a DOM overlay, the Garden's bubble) | a chart with no labels is a sculpture | |
| 7 | Camera as its own node (position, target, Follow) | a game follows a player; a data view frames a selection | |
| 8 | Body (a box or sphere with gravity and bounces, the wall's physics) | the kids' phases asked for it twice | |
| 9 | Model (a glTF file from assets) | the vibe coder's first question after the primitives | |
| 10 | Material (textures, shine) | last: flat shading is the look that worked every time (IG-000, TBM-008) | |

Out, on purpose: shadows, post-processing, a viewport with gizmos. The editor is the graph; the preview is the real
app (P112 R4).

## 5. What it would need to become a phase

- **The catalog, the picker and the MCP.** ✅ measured s2 (§3.1): the project overlay carries the kit to the MCP; it
  validates. ✅ s3: `render_report` draws the scene (NOWEBGL fixed), and a Mesh outside a Scene reaches the agent as a
  finding. Owed: the editor's picker driven once with the kit installed; MESHOUTSIDE's format half.
- **Layout inputs on the Scene.** ✅ s2: Width and Height.
- **On npm (R2).** ✅ s3 built and graded from the packed tarball (§3.2): `npx @nodegx/three-kit add`. Owed: the
  publish (Richard, lane 1's next cut), and a sentence somewhere an agent reads (the MCP's instructions or
  `create-nodegx`'s brief) so an agent asked for 3D knows the kit exists: today nothing in the npm kit names it.
- **The ten nodes** (§4), each with the four or five inputs a person wants, not the forty three.js has.
- **Specs** (layer 2): a headless face that reads the Scene's graph (the drive's `census()` is its first draft), the
  format's `act` for a tap and a drag, scenarios for Tween and Tap. NSP-016's layout model has nothing to say here:
  a transform is three numbers, easier than flexbox.
- **The sub-editor** (layer 3): ✅ s4, first version: NodeGX Scene (§3.3), before the vocabulary, by R1's change. Owed: what Richard finds trying it.
- **A demo designed before it is built.** P117's post-mortem: engineered before designed, no gate graded fun. A kit
  is infrastructure, so fun is the user's problem; the first demo still needs a mockup and a grade.

## 6. Rulings to ask Richard, when it is unparked

- R1 **Which layer first.** ✅ **Ruled 2026-10-19: nodes first** (the picker and the MCP, then Group and Tween; the
  sub-editor follows once there are enough nodes for it to edit).
  **Changed the same day (s4):** the separate editor now, so Richard can test the look before more nodes: *"I'm a bit
  worried about how it'll look in the existing NodeGX editor. I'd like to be able to start testing it before we do more."*
- R2 **Where the kit ships.** ✅ **Ruled 2026-10-19: on npm too** (`library/modules/` and `@nodegx/three-kit`, so a
  person using only the npm tools can install it; with lane 1's next npm cut).
- R3 **The Godot sentence.** Say "the spec admits other targets" and build none, or scope one batch (Mesh, Tween, Tap)
  as a NSP-006 stranger round in GDScript to prove it.

## 7. Files

- `library/modules/three-kit/` — the kit (`src/kit.js`, `build.mjs`, `library.json`, `project/noodl_modules/three-kit/`
  with `index.js`, `manifest.json`, `three.min.js`, `LICENSE.txt`)
- `dev-docs/parked/three-in-nodes/fixture/` — the project; `shots/`, `drive-2026-10-19.json` — the readings
- `scripts/devtools/drive-three-kit.js` — the drive (12 clauses; `--outside`, 1 clause)
- `library/modules/three-kit/package.json`, `bin/three-kit.js`, `test/add.test.js` — the npm package and its add (s3)
- `packages/noodl-mcp/tests/three-kit-render.test.ts` — what the agent's render harness sees (3 tests, s3)
- `packages/noodl-mcp/tests/three-kit-catalog.test.ts` — the catalog spec (5 tests)
- `dev-docs/parked/three-in-nodes/editor/` — NodeGX Scene, the separate editor (s4), its README, its drives in `tests/`
- `dev-docs/bugs/parked-three-s1-instanceid-….md`, `parked-three-s2-meshoutside-….md`, `parked-three-s3-nowebgl-….md` — the findings
