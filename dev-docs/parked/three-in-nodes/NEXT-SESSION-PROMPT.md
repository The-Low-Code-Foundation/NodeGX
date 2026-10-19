# Three in nodes — s6: MODELS (load an AI-made model, then fix its parts), after Richard plays Coin Run

**Written 2026-10-19 ~16:00 CEST by Opus 5.5, end of s5** (the conversation that built the game half). Read, in order:
this file; [`../THREE-IN-NODES.md`](../THREE-IN-NODES.md) §3.5 (s5) and §6 (rulings); [`editor/README.md`](editor/README.md).
Say "Opus" in your first message. Verify a claim here by measuring it, not by trusting it.

## Where it stands (HEAD `55eadcf31` on `cline-dev`, plus this docs commit)

**Done and observed working** (2026-10-19, headless Chrome on software GL, fresh copies every run):
- **three-kit** has the game half: **Body** (Moves / Fixed / Ghost; Push X/Z, Jump To X/Z, Reset; out Hit + Hit Name,
  Fell, Now X Y Z, Tapped), **Camera** (Follow a Name), **Keys** (a logic node, arrows / WASD → −1…1). The engine draws
  every frame while a Body moves or a Camera follows; `pause(true)` holds Bodies at their start.
- **NodeGX Scene** has a **Game** shelf (Player, Floor, Wall, Coin, Camera) and **Behaviour** sentences that write real
  nodes and wires (`editor/public/behaviour.mjs`), and **Try Coin Run** on its open screen.
- **Coin Run** was built inside NodeGX Scene from a blank page by `editor/tests/coin-run.json` and played by it; the save
  is `three-in-nodes/coin-run/`.

**Readings taken (all 2026-10-19, at `55eadcf31`'s content):**

| what | how to re-run | reading |
|---|---|---|
| kit game drive | `drive-three-kit.js assemble <d> --game` → `nodegx deploy … --allow-development-engine` → `drive-three-kit.js <site> --game` | **7 / 7** |
| kit original / outside | the same without `--game` / with `--outside` | **12 / 12**, **1 / 1** |
| catalog + render specs | `cd packages/noodl-mcp && nice -n 19 npx jest --runInBand tests/three-kit-catalog.test.ts tests/three-kit-render.test.ts` | **10 / 10** |
| kit add | `node --test library/modules/three-kit/test/add.test.js` (pass the FILE) | **5 / 5** |
| sentences | `cd editor && node --test tests/behaviour.test.mjs` | **6 / 6** |
| NodeGX Scene drives | `node server.mjs <copy> --port P` then `node tools/drive.mjs http://127.0.0.1:P/ tests/<t>.json <shots>` | editor **13 / 13**, add-scene **3 / 3**, demo **4 / 4**, coin-run **8 / 8**, close **4 / 4** |
| Coin Run deployed | deploy `coin-run/` with the kit added; serve; `tools/drive.mjs <url> tests/coin-run-deployed.json` | **2 / 2** (real CDP ArrowUp → z −5.1) |

The drive tool now FAILS (exit 1) on a missed `expect` or a timed-out `waitFor`; a control proved it. **Gate on exit codes.**

**Written but not observed:** how Coin Run feels on a real screen and GPU (Richard's); a phone (Keys has no on-screen
arrows); sound (no sentence plays one, see below); the main NodeGX editor opening `coin-run/` (only the agent's
validator passed); Coin Run's look (plain "Score 3" on a white page above a 420 px scene).

## What s5 settled (and where the handoff it started from was wrong)

- **R5 ruled: Coin Run** (from two playable sketches on an Artifact page; Mole Bop was the cheap one).
- 🔴 **s4's "drives all green" could not have been red.** `tools/drive.mjs` ended in `process.exit(0)`; green meant read
  by eye. Fixed (PARKED-THREE-S5-DRIVEEXIT0); the s4 drives got 20 expectations from their own readings, all PASS.
- 🔴 **game-kit's KeyboardMap is not key input.** The s4 handoff listed it as a mechanism to reuse; it draws a keyboard
  for typing lessons. No node read a held key anywhere (§3.4), hence Keys.
- 🔴 **A wired input never reads the value typed into it** (PARKED-THREE-S5-WIREDSTART): "somewhere new" wired into a
  coin's X/Z put all five under the player; the first play read Score 5, and two of the drive's checks passed on top of
  it. Body's Jump To X/Z is the fix. When a sentence must move a placed thing, wire a port that is not its placement.
- P117's wall has no body-to-body physics to reuse (ballistic shards on one floor); Body's contacts are new code.
- **Richard (end of s5): "once I selected demo by accident I couldn't get back … there's no 'quit project' button."**
  Fixed: **Close** beside the project name (`/api/close`, then a reload into the open screen; asks first when unsaved,
  and the leave-page guard stands down once he said yes). `tests/close.json` 4 / 4.
- Play gives the app's window the keyboard (`vp.setMode('play')` focuses the frame); without it the arrows go nowhere.

## Next, in order (an agent can do these alone)

0. **Ask Richard, in one line, what he found playing Coin Run** (`cd dev-docs/parked/three-in-nodes/editor && npm start`,
   **Try Coin Run**, Play, click the game once, arrow keys). Fix what he names first. If he has nothing, go on.

1. **Models (R4's "3"): measure before building.** A **Model** node (glTF / GLB from the project's assets). Two likely
   blockers, both to MEASURE, not assume: (a) the vendored `three.min.js` 0.158 is the UMD build with **no GLTFLoader**
   (the `examples/js` loaders went in r148+), so the kit's build would bundle `GLTFLoader` from `three/examples/jsm`;
   (b) NodeGX Scene's `projectTree` sends the preview **text files only** (`json|md|css|js|txt|svg`) and the in-page
   preview's kits use `blob:` URLs: find how `@nodegx/preview` serves a binary asset before choosing. Test with a real
   AI-made GLB (Meshy, Tripo and the like export GLB).

2. **Tweaking is the point** (Richard: *"tweaking the models would obviously be a good thing for mistakes an AI has made
   in design"*): the model's parts listed under it in the outline; per part hide / colour / move / turn / scale, kept as
   ONE overrides parameter on the Model node; whole-model scale, turn, and Sit On Floor from its bounding box. A Model
   inside a Body should get its shape from its bounding box (today `shapeOf` reads Meshes only).

3. **Coin Run owed, smaller:** on-screen arrows for a phone (Keys could draw them, or a Scene option); the look (Scene
   height to fill the page in a game, a styled score); a Wall or two in the demo; the main editor opening `coin-run/`
   once (drive it with the `run-editor` skill on a COPY).

## Needs a human (Richard), not an agent

- **Sound in a sentence.** game-kit's Sound is the existing mechanism, but game-kit is not on npm and NodeGX Scene cannot
  install it. Either game-kit gets the npm treatment three-kit got, or three-kit carries a Sound of its own (a second copy
  of the synth, which drifts). Ask with the cost of each in plain words.
- **The publish** of `@nodegx/three-kit` (still 0.1.0, never published; it now carries the game half). Rides lane 1's npm cut.
- **R3, the Godot sentence**, and **a BOARD lane** for this work.
- **An agent-facing sentence** naming the kit (the MCP's instructions or `create-nodegx`'s brief): lanes 1/2 own those.

## Working notes

- Copies, never the repo: `drive-three-kit.js assemble <dir> [--game]`; `cp -R ../fixture-blank <dir>` for coin-run.json;
  `cp -R templates/todo-list <dir>` for add-scene.json.
- Servers left from s4 on `:8650` / `:8651` run s4's code (another session's scratchpad); s5 used `:8660–8664`. Check
  `lsof -nP -iTCP:<p> -sTCP:LISTEN` and the process's command before reusing or killing a port.
- `tools/drive.mjs`: one Chrome per run, a 45 s guard per CDP call (an in-page autopilot must finish inside it). To drive
  a deployed site, serve it with `drive-deployed.js`'s `serveFolder` and spawn the drive ASYNC: a `spawnSync` blocks the
  server it is meant to talk to (s5 lost a run to it).
- The `nodegx` CLI warns its dist is older than `src/analyze/plan.ts` (a peer's change); deploy still exited 0 and its
  output drove green. Not ours to rebuild.
- One heavy job at a time; `nice -n 19 … --runInBand` for jest. Commit only your paths through a temporary index with a
  compare-and-swap `update-ref` (see `55eadcf31`), then `git reset -q HEAD -- <your paths>`.
- At the end: update this file, THREE-IN-NODES §3.x, and the memory `three-in-nodes-parked-prototype.md`.
