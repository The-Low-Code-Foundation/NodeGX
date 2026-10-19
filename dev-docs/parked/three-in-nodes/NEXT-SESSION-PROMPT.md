# Three in nodes — s5: scenes that BEHAVE (the game crowd), then MODELS

**Written 2026-10-19 ~14:40 CEST by Opus 5.5, end of s4** (the conversation that built NodeGX Scene). Read, in order:
this file; [`../THREE-IN-NODES.md`](../THREE-IN-NODES.md) §3.3 (s4) and §6 (rulings); [`editor/README.md`](editor/README.md).
Say "Opus" in your first message. Verify a claim here by measuring it, not by trusting it.

## Where it stands (HEAD `7f491eed6` on `cline-dev`)

**Done and observed working** (headless Chrome on software GL, fresh copies, 2026-10-19):
- **three-kit** (`library/modules/three-kit`, `@nodegx/three-kit` 0.1.0, packed, NOT published): Scene, Mesh, Light,
  3D Group. s4 added one seam: each three.js object carries `userData.nodeId` (the node that made it) and the census
  reports it. After it: `packages/noodl-mcp/tests/three-kit-catalog.test.ts` + `three-kit-render.test.ts` **8 / 8**,
  `node --test library/modules/three-kit/test/add.test.js` **5 / 5** (pass the FILE; `node --test test/` fails on the folder).
- **NodeGX Scene** (`dev-docs/parked/three-in-nodes/editor/`), the separate editor. Drives all green at `7f491eed6`:
  `tests/editor.json` (fixture: select by click, live colour in the same frame, drag x 0 → 3.25 inside a group, group
  drag z 4 → 7.5 with its wired X left alone, undo, add, reparent, Use this view, Save "the project validates", Play),
  `tests/add-scene.json` (todo app, no kit: Add a 3D scene on Pages/Todo installs the kit, draws past the sign-in, saves),
  `tests/demo.json` (open screen, Try the demo, hover tooltip, lamp marker drag).

**Written but not observed:** how a drag feels on a real screen and GPU (Richard's); the main NodeGX editor opening a
project NodeGX Scene saved (only the kit's `validateStructure` passed); lights above the view have no marker (outline only);
rotation is a slider, not a drag in the view.

**Running when s4 ended** (this session's servers; they may have died with it): `:8650` the demo copy, `:8651` a todo
copy, both under s4's scratchpad. Check `lsof -nP -iTCP:<p> -sTCP:LISTEN` before you reuse a port.

## What s4 settled (and where the plan of record was wrong)

- **R1 changed** (Richard, s4): the separate editor BEFORE more nodes. *"I'm a bit worried about how it'll look in the
  existing NodeGX editor. I'd like to be able to start testing it before we do more."* The "drive the main editor's picker"
  item is moot for now.
- **R4 ruled (end of s4): the game crowd first.** *"We have much more of a game crowd I'm afraid. I'd go with 2 next, and
  yeah 3 for putting in models would be amazing, I think making your own models is pretty much dead thanks to AI, but
  tweaking the models would obviously be a good thing for mistakes an AI has made in design."* So: **(2) behaviour**, then
  **(3) models** (load them, and TWEAK them — not model them). The data view (labelled 3D chart from app data) is behind both.
- The plan assumed the editor previews the app as it runs. **Wrong for real apps:** the todo app's page is behind
  sign-in, so the scene could not be reached. Fixed with **the stage**: in Edit, the preview gets the files with the
  scene's page as `rootNodeId` (that root renamed `__scene_stage__`, because the root is found by id across every
  component); Play renders the real root. Nothing of the stage is saved.
- `preview.update()` builds a **new frame** per call (~1 s on software GL): never per keystroke. A setting goes live
  through the runtime's own `runtime.context.graphModel.getComponentWithName(legacyName).getNodeWithId(id).setParameter`
  (what the main editor's live preview calls). Only tree edits rebuild.
- 🔴 `.x { display: grid }` beats the `hidden` attribute: a "hidden" overlay covered the view and ate every click.
  `style.css` has `[hidden] { display: none !important; }`; keep it.
- A drag on an object with a wired axis moves the other axes; the wired one stays with its wire (the fixture's robot X
  is wired from `robotGlide`, an Animate To Value).

## Next, in order (an agent can do these alone)

0. **Ask Richard in one line what he found trying NodeGX Scene** (`npm start` in `editor/`, or `node server.mjs <copy>`).
   Fix what he names first. If he has nothing, go on.

1. **Measure the mechanisms before designing** (P112's rule: use the existing mechanism). From the running app's node
   library (`vp.preview.nodeLibrary`, or the MCP's `get_node_type`), confirm the ports of: Animate To Value (the s2 ANIM
   clause: it IS the tween), Variable / Set Variable, Counter, the Router navigate node (target = a component legacyName),
   game-kit's **KeyboardMap** and **Sound** (`library/modules/game-kit`), States. Write the table into THREE-IN-NODES §3.4.
   Look at P117's wall physics prototype (`dev-docs/tasks/phase-117-tchac-boum/prototype/`) before writing any physics.

2. **Design the demo game BEFORE building** (P117's post-mortem: engineered before designed, nothing graded fun).
   Two candidates on one page for Richard, each a mockup plus the node list it needs, e.g. *Coin run* (a ball the arrow
   keys roll, the camera follows, spinning coins, touch one = +1 and it moves, fall off = restart) and a second of your
   own. **His pick is the only human gate in this list** (see below); keep building the parts both need while he decides.

3. **Behaviour in the editor**: a "Behaviour" section in the inspector that reads as sentences on the selected object:
   *When tapped → move to / turn / change colour / go to page / play sound / add to score*, *On start → spin / bob /
   patrol*. **It writes real nodes and wires** (the kit draws, the graph decides), so the main editor, the MCP and
   `nodegx deploy` run it. The model needs `connect` / `disconnect` / non-visual `addNode` (the map editor's
   `core/model.mjs` has them: `own-008/map/editor/core`). Reading back: recognise the editor's own patterns by structure
   (Tapped → Animate To Value → x); show anything else as a read-only "wired: A → B" line, never hide it.

4. **The kit's game nodes** (ranks 7–8 in THREE-IN-NODES §4), each with the 4–5 inputs a person wants:
   **Camera** (position, look at, **Follow** a named mesh, smoothing), **Body** (gravity, bounce, a box or sphere,
   **Hit** signal + the other's Name). Add the palette tiles and inspector layouts for them. Grade each with a clause in
   `scripts/devtools/drive-three-kit.js` (re-run the drive; never rebuild the measurement) and the catalog spec.

5. **Build the chosen demo inside NodeGX Scene** (not by hand-writing JSON) and grade it with a drive that PLAYS it:
   keys held → the player moves, the camera follows, a coin touched → the score goes up. Gate on game state, not wall
   clock (software GL runs at a fraction of real time).

6. **Then models** (the next session, probably): a **Model** node (glTF / GLB from the project's assets). Measure first,
   two likely blockers: (a) the vendored `three.min.js` 0.158 is the UMD build, which has **no GLTFLoader** (the
   `examples/js` loaders were removed in r148+), so the kit's build must bundle `GLTFLoader` from `three/examples/jsm`;
   (b) the editor's `projectTree` sends the preview **text files only** (`json|md|css|js|txt|svg`), and the in-page
   preview's kits use `blob:` URLs: find how `@nodegx/preview` serves binary assets before choosing. **Tweaking** is the
   point (Richard: fix an AI's design mistakes): the model's parts listed under it in the outline; per part hide / colour
   / move / turn / scale, kept as one overrides parameter on the Model node; whole-model scale, turn, and Sit On Floor
   from its bounding box. AI generators (Meshy, Tripo and the like) export GLB; test with one.

## Needs a human (Richard), not an agent

- **Which demo game** (step 2). Ask with a page and pictures in plain words, not a wall of text.
- **The publish** of `@nodegx/three-kit` (rides lane 1's npm cut; lane 1 packed 0.2.3 at `98dfc5249`, the kit isn't in it).
- **R3, the Godot sentence**, and **a BOARD lane** for this work: both still his.
- **An agent-facing sentence** naming the kit (the MCP's instructions or `create-nodegx`'s brief): lanes 1/2 own those
  surfaces; ask before editing.

## Working notes

- Test on COPIES: `node scripts/devtools/drive-three-kit.js assemble <dir>` (fixture + kit), `cp -R templates/todo-list <dir>`.
- Drive: `node editor/tools/drive.mjs <url> <steps.json> <shots>`; steps `dragAt`/`clickAt`/`hoverAt` take an expression
  returning `{x, y}`; `__scene.vp.screenOf(nodeId)` is an object's page position. A step with no answer in 45 s prints
  `[stuck]`. The page exposes `window.__scene` (state, model, vp, select, addTile, save, undo, setMode, showTree…).
- One heavy job at a time on this box; `nice -n 19 … --runInBand` for jest.
- Commit only your paths through a temporary index (shared checkout): see s4's commit `7f491eed6`.
- At the end: update this file for the session after, THREE-IN-NODES §3.x, and the memory
  `three-in-nodes-parked-prototype.md`.
