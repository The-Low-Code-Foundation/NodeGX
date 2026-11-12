# Le Gala de danse — the local game (round 2)

Round 1 was one HTML file (`../toy/index.html`, kept as it was). Round 2 is this folder: the same game, split into modules
so it can keep growing. No build step, no install: plain ES modules and a vendored three.js (r177), so it also runs offline.

```
cd dev-docs/tasks/phase-122-the-gala/game
npm start            # → http://localhost:5173   (node serve.mjs; PORT=… to change)
npm test             # the engine's tests (node --test, ~0.1 s)
node drive.mjs full  # headless Chrome drive at the MacBook's 1426×690 @2x; shots in $GAME_OUT (default <tmpdir>/gala-game)
```

## Where things live

| file | what |
|---|---|
| `src/data.js` | **everything the game knows, as rows**: classes, dances (bpm, counts, style, mood, theme), the 26 moves, outfits, hairdos, shoes, accessories, the 20 pieces of furniture and their effects, snacks, shop upgrades, the car park, the seasons. Add a costume or a piece of furniture here. |
| `src/plan.js` | the starting plan and school; which numbers each new season adds |
| `src/engine.js` | **the day as a pure function**: `simulate({ plan, school, season, mode, seed })` → every verdict, each dancer's schedule, the points, a trace. No DOM. |
| `src/state.js` | the save (`localStorage` `gala-game-v2`; round 1's `gala-toy-v1` is carried over) |
| `src/world.js` | the three.js school, stage, lights, dressing room, car park, camera |
| `src/people.js` | the dancers and their costumes; poses |
| `src/play.js` | playback: the day drawn from the engine's schedule, each move's animation |
| `src/ui.js` | the side sheet: the eight tabs, the live evening, the verdicts and "Pourquoi ?" sums, the shop |
| `src/i18n.js` | every sentence, French and English |
| `src/tunes.js` | **each number's music, as notes** (public-domain tunes and two grooves), and `score(id)`: every note on the dance's counts, ending on the home chord exactly when the music ends |
| `src/music.js` | the music played: a Web Audio synth following `G.run` count by count (silent above ×2), applause on gala night, the 🔊 switch (`G.S.sound`) |
| `tests/music.test.mjs` | every number has a tune; every line fills its bars; nothing sounds after the music ends |
| `tests/engine.test.mjs` | the opening plan is wrong in the intended ways; seasons 1–3 can be solved |

## The rules the engine plays by (the numbers a player can reason about)

- **Running order**: hall closes 21:00; the little ones' *last dance* ends by 20:45 (they eat on the way out, no finale);
  1 min 30 s set change; a class's costume change takes `outfit minutes + shoes + accessory ± furniture`; the curtain
  waits for hair: `Σ dancers × hair minutes ÷ hair stations`, from 19:00.
- **A dance** (round 2½): named **blocks** of moves (4 or 8 counts each), and a **chain** of blocks in any order; the chain's
  counts must add up to the music's (`seconds × bpm ÷ 60`). The engine reads the chain flat (`danceOf`), danced once.
  Old saves (phrase × repeats) become one block chained that many times (`migrateNumber`).
  Spacing: centres at least the class's arm span apart (1.0 / 1.3 / 1.6 / 1.5 / 1.7 m); nobody within 0.5 m sideways of
  someone in front; travel accumulates every repeat; 🔀 walks to formation B and two dancers whose paths come within 0.6 m bump.
  Flow: a move ending *in the air* into one starting *on the floor* (or the reverse) jars 💥.
- **How they feel** at their number: energy (time awake, seats in the dressing room, the fan, the snack, dances already done,
  bedtime for the little ones), hunger (snack, fruit bowl), nerves (class, wings wait, calm furniture, the gala itself),
  focus (hunger, water, energy). These set each move's slip chance against difficulty − experience (above their level: ×15 one level up, ×80 two);
  experienced classes get bored with easy dances, and anyone with one block repeated more than 12 times. **The general
  rehearsal never slips; a try-out rolls fresh dice each time; the gala rolls the season's dice.** A fall on a step above
  the class's level twists an ankle 15% of the time: she sits out the rest of that dance.
- **Season 2**: cars = families + guests; bays = 28 m ÷ width; the gate lets 2 cars a minute in; families arrive over the
  first two thirds of the doors-open window; no bay = 14 min more.
- **Season 3**: the teens (hip-hop); the dance mat must be rolled up for jazz/hip-hop (2 min 30 s, free in the interval);
  two calm dances in a row make the parents yawn. **Season 4**: the mums.
