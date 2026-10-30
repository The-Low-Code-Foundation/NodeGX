# Building a game in this folder

You are writing a game in plain three.js. Write it so it can say what it is made of.

- **Every number you choose by eye is a knob**: a name, a range, a unit and a sentence, in one place, read from there.
  A number nobody would ever say "a bit more" about is a constant with `// why:` and the reason on its line.
- **Every thing a person could point at is a part**: a named builder inside a `model()`, whose meshes carry its name.
- **A level is a file** in `places/`. Adding one changes nothing in `src/engine/`.
- **The person's changes are deltas in `design/`**, never in `localStorage`. The game rebuilds the thing, never the page.
- **Words a player reads live in `strings/`**.
- **Build no panel, no editor, no sandbox unless the person asks.** When they ask, build only what their sentence names,
  over the thing's own declaration, and ask whether to keep it. Their answer goes in `RECORD.md`.
- **When you come back to this game, run `node tools/what.mjs` before you read its code.**
- **Run `node tools/check.mjs` before you say a round is done.** It exits 1 on any red gate. A red gate is fixed, not
  argued with; if you think a gate is wrong, say so to the owner in plain words and leave it red.

## How the work goes

1. **The brief: one exchange.** Ask the owner your questions once; their answers go in `RECORD.md`, word for word.
2. **A picture, soon.** Something they can play within the first sitting. Structure comes later.
3. **Rounds.** They play and write a numbered list; it goes in `LOOK.md` as they wrote it. One pass builds every point,
   then they play again at the same address. Expect most of the game to arrive in the rounds.
4. Before you build a core mechanic (the camera, the controls, a turn, an inventory), write down in one line each how
   two games of the genre do it, and build that.
5. Decide what you must, list each decision in one line in `RECORD.md`, and keep building. The owner can overturn any.
6. Nothing moves unless the person moves it: no camera that glides or spins by itself; a change of view is a cut.
7. The owner's device is part of the picture. Ask which one, and set every drive's first step to its window and pixel
   ratio (`{ "viewport": [1368, 912, 2] }` is a Surface Pro). A drive never judges the look; the owner does.

## The folder

| | |
|---|---|
| `index.html` | your game's page (an import map gives `three` and `three/addons/`) |
| `src/` | your game. `src/engine/` is what every level shares |
| `places/<id>.mjs` | one level each: `export default place('<id>', { … })`, found by `loadPlaces()` with no other change |
| `strings/en.json` | every word a player reads: `say('key', { n: 3 })` |
| `design/<kind>/<id>.json` | the owner's changes, written by the game through the server |
| `editors/` | only what the owner asked for, each with its line in `RECORD.md` |
| `tests/<id>.json` | a drive for every place (`node tools/drive.mjs`) |
| `RECORD.md` · `LOOK.md` | the owner's words: the brief, decisions, keep/throw rulings · each round's list |
| `kit/` · `tools/` · `vendor/` · `assets/people/` | the kit. Use it; do not rewrite it |
| `examples/two-rooms/` | a small game written this way: `node tools/serve.mjs --root examples/two-rooms` |

Serve the game with `node tools/serve.mjs` (http://127.0.0.1:8800/, `--lan` for a tablet on the same Wi-Fi).

## The kit (`import { … } from './kit/index.mjs'`)

```js
const S = knobs('generator', {
  hum:   num(0.6, [0, 1], '', 'Hum volume', 'How loud it is. 0 is silent.'),
  smoke: on(true, 'Exhaust smoke'),
  paint: colour('#7a8c6e', 'Paint'),
  mode:  pick('steady', ['steady', 'sputter'], 'How it runs'),
});                                   // read S.hum anywhere; S.$.onChange(fn); S.$.set('hum', 0.4)

export const generator = model('generator', {
  help: 'Makes power. Needs a mechanic.',
  knobs: S,
  parts: { body: (S) => …, exhaust: (S) => …, dial: (S) => … },   // each returns an Object3D
});
const g = generator.build(); generator.live(g);                  // rebuilt in place when a knob changes

export default place('roof', { label: 'The roof', size: [24, 6], spawns: { door: [2, 0] }, build: (ctx) => group });

await loadStrings(); await loadPlaces(); await loadDesigns();    // at start, before building
saveKnobs('generator');                                          // the owner's change, to design/knobs/generator.json
expose({ scene, camera, renderer });                             // once the first place is built: the checker needs it
```

`partOf(mesh)` gives `{ model, part }` for whatever a ray hit. `writeDesign(kind, id, values)` and
`readDesign(kind, id)` keep anything else the owner chooses (one dweller's look, one room's layout).

**People** (`assets/people/`, twelve realistic people in work clothes, Microsoft Rocketbox, MIT):

```js
const people = await loadPeople();
const crowd = makeCrowd(people, 300); scene.add(crowd.mesh);   // hundreds of flat people, one draw call
const i = crowd.add('medic-f', { x, y, z }); crowd.play(i, 'walk'); crowd.move(i, { x, facing: -1 });
crowd.update(seconds);  crowd.pick(x, y) → { i, person, part }  crowd.walkSpeed(i)
await people.preload(['soldier-m']); const p = people.party('soldier-m');   // the same person in real 3D
scene.add(p.object); p.play('run'); p.update(dt); p.partAt(raycastHit)
```

The crowd's clips: walk, idle, work, fix, sit, talk. The real 3D person's: idle, walk, run, sprint, jumpStart, jump,
land, crouch, crouchWalk, melee, punch, aim, shoot, swim, tread, hit, down, pickUp, use. The flat people were lit once
when they were made (`shade` darkens one in a dark room); they face left or right, never in depth. Real 3D costs about
a millisecond a person on a tablet: keep it to the few the player steers. The ids and clips are on `what.mjs`'s page.

## The gates (`node tools/check.mjs`)

1 no orphan number · 2 every mesh under a part · 3 the page prints · 4 design files round-trip · 5 no browser storage ·
6 a new place changes no engine file · 7 no editor without the owner's words in `RECORD.md` (`keep: <name> — "…"`) ·
8 no knob that changes nothing on screen · 9 every place has a drive and it passes · 10 no player-facing words in code.

## Things that will catch you

- Headless Chrome draws on the CPU: its frame rate is no device's. Never report it as how fast the game is.
- In a drive, wait for a state (`{ "waitFor": "…" }`), not for a time: headless frames are slow, so game time lags.
- `tools/drive.mjs` and `tools/check.mjs` start headless Chrome; a sandbox that forbids that makes them fail at start.
