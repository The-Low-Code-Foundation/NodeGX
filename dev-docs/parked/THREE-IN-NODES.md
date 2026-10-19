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

**s5 (same day): the game half.** Richard tried NodeGX Scene (*"It worked really well, no notes"*) and picked **Coin Run**
from two playable sketches (R5, §6). The kit has **Body**, **Camera** and **Keys**; NodeGX Scene has a Game shelf and
**Behaviour** sentences that write real nodes and wires; Coin Run was built inside NodeGX Scene from a blank app by a drive
and played by another, and runs from `nodegx deploy` on real key presses (§3.5).

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

### 3.4 s5 — the mechanisms a game would be built from, measured before designing (2026-10-19)

Richard tried NodeGX Scene (the robot and the bar chart) at the start of s5: *"It worked really well, no notes."*

The ports below are what the MCP's `get_node_type` reports (the runtime's own library), and the kit sources. P112's rule:
use the existing mechanism, and say plainly where there is none.

| what a game needs | the existing mechanism | ports that matter | verdict |
|---|---|---|---|
| a tween ("move to", "turn") | **States** with `useTransitions` (`states.ts` :270, a timer per value) | `states`, `values`, `to-<S>` (signal in), `value-<S>-<V>`, output `<V>`, `reached-<S>` | ✅ one node per sentence: Tapped → `to-Moved`; its `x` `y` `z` outputs → the Mesh. A sentence the editor wrote is recognisable by structure |
| a tween that chases a number | **Animate To Value** | `targetValue`, `duration`, `easingCurve`, `delay`, `jumpTo`; out `currentValue`, `atTargetValue` | ✅ s2's ANIM: no start signal, it follows `targetValue`. Right for "follow a value", wrong for "on tap, go there" |
| a score | **Counter** | `increase` `decrease` `reset` (signals), `startValue`, limits; out `currentCount`, `countChanged` | ✅ |
| a value shared across the app | **Variable** (`Variable2`) / **Set Variable** | `name`, `value` / `name`, `do`, `setWith` | ✅ (high score, lives) |
| a clock | **Repeat** | `interval` (ms), `start`, `stop`; out `tick`, `count` | ✅ ("every 2 s a mole pops up") |
| a one-off wait | **Delay** (`Timer`) | `duration`, `start`, `restart`; out `timerFinished` | ✅ |
| on / off | **Switch** | `on` `off` `flip`; out `state`, `switchedToOn` | ✅ |
| a test | **Condition**, **Expression** | `condition` / `expression` (free names become inputs); out `ontrue`, `isTrueEv` | ✅ ("fell below 0 → restart") |
| go to a page | **Navigate** (`RouterNavigate`) | `navigate` (signal); `target` = a page's legacyName (dynamic) | ✅ |
| a sound | **game-kit Sound** | `sound` ∈ correct, wrong, tick, win, lose, pop, type, heart; `volume`, `enabled`, `play`; out `ended` | ✅ synthesised, no files |
| a tap on a thing | **three-kit Mesh / 3D Group `Tapped`**, Scene `Tapped Name` | — | ✅ (s1) |
| **a key held down** | **none.** game-kit **KeyboardMap draws a keyboard** for typing lessons (`nextKey`, `pressedKey`); the only `keydown` listener in the kits is AnswerPad's typing box (`game-kit/src/kit.js` :1717). No core node reads keys | — | ❌ **owed: a Keys node** (arrows / WASD held → Left Right Up Down, and two numbers −1…1) |
| **a frame loop** | three-kit's engine draws **only while something spins** (`kit.js` :148 `if (spinning) raf = …`) | — | ❌ owed: the engine runs every frame while a Body or a Follow camera is in the scene. A game cannot be a graph signal per frame (Repeat at 16 ms through the runtime is the wrong tool) |
| **physics** | P117's wall: shards fly ballistically and bounce on one floor (`mur3d.js` :234); marbles are beads on rails. **No body-to-body contact anywhere** | — | ❌ owed: **Body** in the kit (gravity, floor, bounce, push, Hit + the other's Name) |
| **a camera that follows** | the Scene's camera orbits the middle (`cameraDistance/Height/Angle`) | — | ❌ owed: **Camera** (Follow a Name, smoothing) |

**So the line between the two kinds of game is measured, not guessed:** a game of taps, timers and scores (the moles
below) is buildable from nodes that exist today plus three-kit's Tapped; a game you steer (the coin run) needs the four
✗ rows, all inside the kit.

### 3.5 s5 — the game half: Body, Camera, Keys, and sentences that write the graph (2026-10-19)

**The pick.** Two playable sketches on one page (an Artifact, three.js in the kit's look): *Coin Run* (roll a ball with
the arrow keys, the camera follows, grab coins, roll off and you drop back in) and *Mole Bop* (tap moles; nothing new in
the kit). Richard: **Coin Run** (R5, §6).

**The kit** (`library/modules/three-kit/src/kit.js`, still ES5, still one file):
- **Body** — a 3D Group the Scene moves, the one place "the kit draws, the graph decides" bends (a game cannot be a graph
  signal per frame). Kind **Moves** (falls, rolls, bounces), **Fixed** (a floor, a wall), **Ghost** (a coin: solid to
  nothing, says it was touched). Its shape comes from the meshes inside it: a ball when all are spheres, a box otherwise.
  X Y Z are its start (a change teleports it); **Jump To X / Z** move it and leave the start alone; **Push X / Z** roll
  it; **Reset**; out: **Hit** + **Hit Name** (when a touch STARTS, once, for both), **Fell** (10 below the floor),
  **Now X Y Z**, **Tapped**. Gravity 20, a contact slower than 2 rests instead of bouncing; ball–ball, ball–box and
  box–box overlaps pushed out along the shallowest way.
- **Camera** — a Scene child: **Follow** (a Name), Distance, Height, Angle, Smoothing, Field Of View. While it is there
  the Scene's own camera inputs and orbit are not used.
- **Keys** — a logic node: Left Right Up Down Space (arrows or W A S D), **X** and **Z** (−1…1, straight into Push X / Z),
  Last Key, Pressed. Ignores keys typed into a text field.
- **The engine** draws every frame while a Body moves or a Camera follows; `pause(true)` holds every Body at its start
  (NodeGX Scene's Edit mode), `pause(false)` lets the game run.

**NodeGX Scene** (`three-in-nodes/editor/`): a **Game** shelf (Player, Floor, Wall, Coin, Camera); Body and Camera
inspectors; and **Behaviour**, sentences on the selected object, each one real nodes and wires
(`public/behaviour.mjs`, pure functions over the model):

| sentence | what it writes |
|---|---|
| The arrow keys push it | one Keys node for the scene; Keys X → Push X, Keys Z → Push Z |
| The camera follows it | the scene's Camera (made if there is none), Follow = its Name |
| When tapped / something touches it / it falls off → **add 1 to the score** | Tapped / Hit / Fell → one shared Counter "Score"; the first one also makes an Expression `'Score ' + score` and a Text above the Scene |
| … → **move somewhere new** | two Expressions that belong to the object (`round((random() * 2 - 1) * 9) / 2`, Run on the trigger) → its **Jump To X / Z** |
| … → **go back to the start** | the trigger → its own Reset |

Nodes a sentence made carry `metadata.scene = { role, for }`: reading back is by that structure, a wire no sentence made
shows as a plain *wired:* line, never hidden. A duplicate brings its own helpers and wires again to the shared score; a
delete takes its helpers; a sentence is one undo step (`model.batch`). Edit holds the game still; Play gives the app's
window the keyboard.

**Graded** (all 2026-10-19, headless Chrome on software GL):
- `scripts/devtools/drive-three-kit.js --game` on `three-in-nodes/fixture-game/` **7 / 7**: GBOOT, LAND (dropped from y 2,
  rests at y 0.45, Hit Name "Floor"), FOLLOW (8 in front, 6 above), KEYS (a held CDP ArrowRight: Keys X 1, it rolls),
  RING (Ghost: Hit once, the graph jumps it to x −3), FELL (Fell → Reset brings it back), PAUSE. The original drive
  **12 / 12** and `--outside` **1 / 1** unchanged.
- `packages/noodl-mcp/tests/three-kit-catalog.test.ts` + `three-kit-render.test.ts` **10 / 10**: the seven types with
  their ports, Body holds Visual like a 3D Group, Keys is a logic node; the game fixture and the saved Coin Run both
  validate with no error. `library/modules/three-kit/test/add.test.js` **5 / 5**.
- `editor/tests/behaviour.test.mjs` (node:test) **6 / 6**: write, read back, duplicate, delete, undo, numbering.
- NodeGX Scene's drives, **now real gates** (below): `editor.json` **13 / 13**, `add-scene.json` **3 / 3**, `demo.json`
  **4 / 4**, and **`coin-run.json` 8 / 8**: from `three-in-nodes/fixture-blank/` (one empty page) it adds a scene,
  deletes the starter box, adds Floor, Player (arrow keys, camera follows, falls off → back to the start) and a Coin
  (touches → score, → somewhere new), duplicates it to five, places them, saves ("the project validates"), plays: Score
  0 with every coin where it was put, an autopilot pressing arrow keys in the game's window takes the score from **0 to
  3 in 2.6 s**, a coin taken is somewhere new, rolling off the edge drops it to y −10 and back to the middle with the
  score kept. Its save is kept as **`three-in-nodes/coin-run/`** (**Try Coin Run** on NodeGX Scene's open screen).
- `editor/tests/coin-run-deployed.json` on `nodegx deploy` of `coin-run/` **2 / 2**: the game running, the coins where
  NodeGX Scene put them, and a real CDP **ArrowUp held 1.2 s rolls the player to z −5.1**.

**Found while building, fixed there:**
- **The drive tool could not fail** (PARKED-THREE-S5-DRIVEEXIT0). s4's "drives all green" was read by eye:
  `tools/drive.mjs` ended in `process.exit(0)`. Steps now take `expect`, a timed-out `waitFor` is a FAIL, exit 1 on any;
  a control with a false expectation exits 1.
- **"Move somewhere new" put every coin on the player** (PARKED-THREE-S5-WIREDSTART). The first Coin Run play read
  **Score 5** before a key was pressed: the sentence wired the coin's X and Z, a wired input never reads the value
  typed into it, so all five started at 0, 0 under the player. The autopilot's "score 3" passed on top of it, a check
  with nothing under it; only the start-state check failed. Fixed with Jump To X / Z; the drive now asserts Score 0
  and the placed coins at the start, and the autopilot that its first reading was 0.

**Not checked:** the feel on a real screen and GPU (Richard's); a phone (Keys has no on-screen arrows yet); sound (the
sentences have no "play a sound": game-kit's Sound is not on npm and NodeGX Scene cannot install it); the main NodeGX
editor opening Coin Run (only the agent's validator); Coin Run's look (the score is plain text on a white page under a
420 px scene).

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
| 7 | Camera as its own node (position, target, Follow) | a game follows a player; a data view frames a selection | ✅ s5 (Follow a Name) |
| 8 | Body (a box or sphere with gravity and bounces, the wall's physics) | the kids' phases asked for it twice | ✅ s5 (Moves / Fixed / Ghost, Hit, Fell) |
| 8½ | Keys (arrows / W A S D held → −1…1) | nothing read a held key anywhere (§3.4) | ✅ s5 (desktop only) |
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
- **The sub-editor** (layer 3): ✅ s4, first version: NodeGX Scene (§3.3), before the vocabulary, by R1's change. ✅ s5:
  Richard tried it, *"It worked really well, no notes"*; Behaviour sentences and the Game shelf (§3.5).
- **A demo designed before it is built.** P117's post-mortem: engineered before designed, no gate graded fun. ✅ s5:
  two playable sketches first, Richard picked Coin Run, then it was built in NodeGX Scene and graded by playing it
  (§3.5). Fun is still graded by a person: his hands on it are the check no drive makes.

## 6. Rulings to ask Richard, when it is unparked

- R1 **Which layer first.** ✅ **Ruled 2026-10-19: nodes first** (the picker and the MCP, then Group and Tween; the
  sub-editor follows once there are enough nodes for it to edit).
  **Changed the same day (s4):** the separate editor now, so Richard can test the look before more nodes: *"I'm a bit
  worried about how it'll look in the existing NodeGX editor. I'd like to be able to start testing it before we do more."*
- R2 **Where the kit ships.** ✅ **Ruled 2026-10-19: on npm too** (`library/modules/` and `@nodegx/three-kit`, so a
  person using only the npm tools can install it; with lane 1's next npm cut).
- R4 **Which crowd first, after the editor.** ✅ **Ruled 2026-10-19 (end of s4): games.** *"We have much more of a game
  crowd I'm afraid. I'd go with 2 next, and yeah 3 for putting in models would be amazing, I think making your own models
  is pretty much dead thanks to AI, but tweaking the models would obviously be a good thing for mistakes an AI has made in
  design."* Next: behaviour (sentences on an object that write real nodes and wires; Camera Follow; Body), then models
  (glTF in, and tweaking an AI-made model's parts). The data view waits. Plan: [`three-in-nodes/NEXT-SESSION-PROMPT.md`](three-in-nodes/NEXT-SESSION-PROMPT.md).
- R5 **Which demo game.** ✅ **Ruled 2026-10-19 (s5): Coin Run**, from two playable sketches (Coin Run, Mole Bop) with
  what each needs. Built and graded in §3.5.
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
- `dev-docs/parked/three-in-nodes/editor/public/behaviour.mjs`, `tests/behaviour.test.mjs` — the sentences (s5)
- `dev-docs/parked/three-in-nodes/fixture-game/` — Body, Camera, Keys for the drive's `--game`; `fixture-blank/` — one
  empty page, where `tests/coin-run.json` builds the game; `coin-run/` — Coin Run as NodeGX Scene saved it (s5)
- `dev-docs/bugs/parked-three-s1-instanceid-….md`, `parked-three-s2-meshoutside-….md`, `parked-three-s3-nowebgl-….md`,
  `parked-three-s5-driveexit0-….md`, `parked-three-s5-wiredstart-….md` — the findings
