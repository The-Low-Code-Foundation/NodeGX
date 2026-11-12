# Le Gala de danse — the local game (round 2)

Round 1 was one HTML file (`../toy/index.html`, kept as it was). Round 2 is this folder: the same game, split into modules
so it can keep growing. No build step, no install: plain ES modules and a vendored three.js (r177), so it also runs offline.

From this folder:

```
npm start            # → http://localhost:5173   (node serve.mjs; PORT=… to change; only this machine can reach it)
npm test             # the rules' tests (node --test, under a second)
npm run check        # the browser tests (tests/browser/, ~5 min, includes a one-minute monkey test)
```

`npm run check` needs Playwright once: `npm i -D playwright && npx playwright install chromium`. It is a developer tool:
the game never imports it. `SHOTS=001-shots npm run check` also saves each test's screenshot in `changes/001-shots/`;
`MONKEY_MS=10000` shortens the monkey test while developing.

## The grown-ups' settings and where things are kept

Hold ⚙️ (top bar) for two seconds and type the answer to the sum: the settings screen opens. Grown-ups can rename steps,
costumes, shop items, classes, dances and dancers; change difficulties, prices, minutes and the starting stars; add up
to 12 new steps and 12 new costumes. Every value is checked (`src/settings.js`) and every name goes through `clean()`
(`src/words.js`). Closing the screen reloads the game with the settings laid over the default rows (`applyRows`).

`serve.mjs` keeps two files **outside the game folder**, in `~/.gala-de-danse/` (or `GALA_DIR`):
`settings.json` (`{ "v": 1, "rows": { …only the EDITABLE tables… } }`) and `save.json` (the school's progress).
A new version of the game replaces the folder and keeps these. The browser keeps a copy of both (`localStorage`),
used when the server can't be reached; for the save, whichever copy was written last (`at`) wins. The screen's
"Save to a file" / "Load from a file" carry the settings to another computer.

## Where things live

| file | what |
|---|---|
| `src/data.js` | **everything the game knows, as rows**: classes, dances (bpm, counts, style, mood, theme), the 26 moves, outfits, hairdos, shoes, accessories, the 20 pieces of furniture and their effects, snacks, shop upgrades, the car park, the seasons. Add a costume or a piece of furniture here. |
| `src/plan.js` | the starting plan and school; which numbers each new season adds |
| `src/engine.js` | **the day as a pure function**: `simulate({ plan, school, season, mode, seed })` → every verdict, each dancer's schedule, the points, a trace. No DOM. |
| `src/state.js` | the save (`localStorage` `gala-game-v2` and the server's `save.json`, newest wins; round 1's `gala-toy-v1` is carried over); `mend()` opens every older save, and repairs costumes or steps a grown-up has since removed |
| `src/settings.js` | **the grown-ups' settings**: which fields of which rows may change and their limits (`SCHEMA`), `sanitize()` (keeps what is valid, never throws), `applySettings()` → `applyRows` |
| `src/words.js` | `clean()`: the one filter for every free text (rude words in French and English, look-alike digits, links, web code) |
| `src/store.js` | the page's side of the server's two files (`/api/settings`, `/api/save`); fails quietly when the server can't be reached |
| `src/grownups.js` | the ⚙️ settings screen: the gate (a long press and a sum), every field with its limits and ↺, save to / load from a file |
| `serve.mjs` | serves the game on 127.0.0.1, and reads/writes `~/.gala-de-danse/settings.json` and `save.json` (only these, JSON, at most 100 KB, only from this machine's page) |
| `src/world.js` | the three.js school, stage, lights, dressing room, car park, camera |
| `src/people.js` | the dancers and their costumes (a grown-up's new costume is drawn like the one it "looks like"); poses |
| `src/play.js` | playback: the day drawn from the engine's schedule, each move's animation (a grown-up's new step "moves like" an existing one) |
| `src/ui.js` | the side sheet: the eight tabs, the live evening, the verdicts and "Pourquoi ?" sums, the shop |
| `src/i18n.js` | every sentence, French and English |
| `src/tunes.js` | **each number's music, as notes** (public-domain tunes and two grooves), and `score(id)`: every note on the dance's counts, ending on the home chord exactly when the music ends |
| `src/music.js` | the music played: a Web Audio synth following `G.run` count by count (silent above ×2), applause on gala night, the 🔊 switch (`G.S.sound`) |
| `tests/music.test.mjs` | every number has a tune; every line fills its bars; nothing sounds after the music ends |
| `tests/engine.test.mjs` | the opening plan is wrong in the intended ways; seasons 1–3 can be solved |
| `tests/rows.test.mjs` | `applyRows`: changed rows reach the rules |
| `tests/settings.test.mjs` | the settings file: limits, rude words, broken files, new steps and costumes, older files |
| `tests/words.test.mjs` | the word filter, and no false alarm on the game's own names |
| `tests/save.test.mjs` | older saves still open, with removed costumes and steps repaired |
| `tests/browser/helpers.mjs` | the browser tests' server, page and gate helpers (Playwright) |
| `tests/browser/001-*.spec.mjs` | change 001, line by line, driven by real clicks; persistence across reloads, browsers, versions and computers |
| `tests/browser/monkey.spec.mjs` | a minute of random clicks, drags, typing and keys on every screen |
| `changes/` | one file per change: the request, the numbered lines, the decisions, the report, the screenshots |

## The rules the engine plays by (the numbers a player can reason about)

These are the game's own numbers. A grown-up's settings may change a step's difficulty, a costume's or a hairdo's minutes,
the prices and the starting stars (30 by default); the rules below then use those values.


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
