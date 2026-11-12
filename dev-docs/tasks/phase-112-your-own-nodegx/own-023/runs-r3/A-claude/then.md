## 1. What the game is

*Le Gala de danse* is a browser game in French, with an English switch, where the player runs a small dance school and gets its end-of-year show (the gala) ready, one season at a time. In a typical session the player:

- arranges the running order;
- sets each class's formation and dance steps;
- picks costumes and hair;
- chooses the snack;
- lays out the dressing-room furniture;
- from season 2, sets up the car park.

They run free dress rehearsals or try out a single number to see what goes wrong. Then they play gala night once, which earns stars to spend in the shop, and move on to the next season.

**Sure.**

## 2. Main screens and tabs

**Screens:**
- preparation (`prep`)
- the live run (`run`)
- results (`results`)

**Tabs on the preparation screen:**
- Programme (`order`)
- Formation
- Goûter (snack)
- Costumes
- La loge (`build`, the dressing room)
- Parking (from season 2)
- Shop
- Notebook

**Also on screen:**
- a welcome card at the start of each season;
- a top bar with:
  - season and star chips;
  - sound and language buttons;
  - a ⚙️ button that opens, after the gate, the grown-ups' settings panel.

The settings panel has its own tabs: moves, outfits, shop, school, file.

**Sure** for the tabs and screens. **Fairly sure** for the settings panel's tab names.

## 3. What is saved, where and when

**The save (the whole school's progress, one object):**
- It is saved by `save()` in `state.js` after every change: each preparation edit (`changed()`), a purchase, the end of a gala, a new season, closing the welcome card, typing the school name, and the language and sound buttons.
- It is written to two places:
  - this browser's `localStorage`, under `gala-game-v2`;
  - the local server's `save.json` in `~/.gala-de-danse/` (or `GALA_DIR`), sent with `PUT /api/save`.
- The server copy is sent 300 ms after the last change, as the latest version only, and again when the page is closed (`pagehide`).
- An older save under `gala-toy-v1` is read, but never written.

**The grown-ups' settings:**
- They are stored in `settings.json` on the same server, with a browser copy in `localStorage['gala-settings-copy']`.
- A `sessionStorage` flag, `gala-settings-applied`, is used to show the "settings applied" message after the reload.

**Sure.**

## 4. Server, backend, accounts

There are no user accounts. The only server is `serve.mjs`, a small Node server:

- It serves the game's files.
- It exposes `GET` and `PUT` for `/api/settings` and `/api/save`, each tied to one JSON file.
- Writes are atomic, limited to 100 KB, and checked before they are stored.
- It listens only on `127.0.0.1` and refuses any other Host or Origin.

So only a browser on the same machine can use it.

**Sure.**

## 5. Who can change the settings

Anyone at the device who passes the gate:

1. hold ⚙️ for about two seconds;
2. type the answer to a multiplication (a number from about 12–19 times one from about 3–9).

There is no real identity check. The gate only stops a young child opening it by accident. It also refuses to open while a run is playing. Anyone who can edit the files in `~/.gala-de-danse` can change the settings too.

**Sure** about the mechanism. **Fairly sure** about the exact number ranges.

## 6. From pressing the gala button to the results

1. `beginRun('gala')` in `ui.js` clears what is selected and calls `startRun` in `play.js`.
2. `startRun` refuses if `galaDone` is already true.
3. Otherwise it runs `simulate()` from `engine.js` on the plan, the school and the season, using the season's stored seed. That works out the whole evening in advance: the order, the dancing, slips, the snack, parking and points.
4. It builds the run object, hides the dancers and the cars, and resets the parents and the snack table.
5. It sets `G.run`, and the screen switches to `run`.
6. On every frame, the loop in `main.js` does the following:
   - `stepRun` moves the evening's clock forward, at a rate that depends on what is happening and on the speed setting;
   - `stepScene` and `updateDancers` animate the 3D (`world.js`, `people.js`);
   - `hud` and `paintRunSheet` update the live feed;
   - `music.js` plays the tunes.
   - The player can speed up, skip a number or skip to the end. There is no "stop" button during a gala.
7. When the run is done, `run.onDone` calls `finishRun`, which:
   - sets `galaDone`;
   - adds the points to the stars and to the total earned;
   - adds an entry to the notebook;
   - calls `save()`;
   - shows the `results` screen with the points and the verdicts.

**Fairly sure.** I didn't read exactly how `stepRun` decides the run is finished, or the name of the function that draws the results.

## 7. Earning and spending

**Earning:**
- A new school starts with 30 stars (grown-ups can change this number).
- Gala night's points are added to the stars.
- Rehearsals show points, but don't pay any.

**Spending, in the shop:**
- **Upgrades:** seats, a bigger stage, a bigger dressing room, a refreshment bar, lights, backdrops; and for the car park, an attendant, carpooling, a shuttle and an extra row.
- **Dressing-room furniture.**
- **Outfits, hairstyles, shoes and accessories.**
- **Snacks, crêpes and compotes.**

**Fairly sure** about the categories. **Guessing** at some item meanings from their ids (placeur, covoit, navette).

## 8. Seasons

1. **Season 1:** the first gala.
2. **Season 2:** adds the car park.
3. **Season 3:** brings the teens' hip-hop class, with two numbers. It also adds two rules:
   - hip-hop can't be danced on the dance mat (the floors rule);
   - two calm numbers in a row make the parents sleepy (the moods rule).
4. **Season 4:** brings the mothers' class.
5. **After that:** a "free" season.

When a new season starts, the game moves to the next season number, allows a new gala, picks a new random seed, adds the new classes' numbers to the programme, and shows that season's welcome card.

**Sure.**

## 9. French and English

- The EN/FR button switches `G.lang`, calls `save()` (the save keeps `lang`) and redraws the sheet, the top bar and the school sign.
- The interface text comes from the `TXT.fr` and `TXT.en` tables in `i18n.js`, read through `t()`.
- The game's content (moves, outfits, classes, numbers) has its own `fr` and `en` fields in `data.js`, read through `nm()`. Grown-ups can rename those in the settings.

**Sure.**

## 10. Loading an older save

- **The current format** (`v: 2`) goes through `mend()`, which:
  - fills in any field added since the save was written;
  - converts the old "phrase × repeats" dances into blocks and a chain (`migrateNumber`);
  - adds the numbers of the current season;
  - puts back the number's own costume, shoes, accessory or hair where the save names something the settings no longer have, and drops removed steps;
  - cleans the school and block names with the rude-word filter;
  - keeps the star count to a sensible number;
  - treats a missing `at` as 0.
- **A round-1 save** (`gala-toy-v1`, `v: 1`) is first converted by `fromRound1`, which keeps the order, the formation, the snack and the costumes, and then goes through `mend()` too.
- **A broken save** starts fresh.

**Sure.**

## 11. Pure logic versus the screen

**Pure (no screen):**
- `engine.js` (the rules and `simulate`)
- `plan.js`
- `data.js`
- `settings.js`
- `words.js`
- most of the save logic in `state.js` (`fresh`, `mend`). It does touch `localStorage`, though.

**On screen:**
- `ui.js`
- `world.js` and `people.js` (three.js)
- `play.js`
- `main.js`
- `grownups.js`

**Neither:**
- `music.js` produces sound, not pictures.
- `i18n.js` is text only.

**Fairly sure.** The unit tests cover the pure modules, but I didn't check every import in every file.

## 12. The single riskiest thing in my plan

Silent loss through `mend()` when the same child's save is opened against different settings.

- The settings are applied by changing global tables in place (`applyRows`), before the save is loaded.
- Then `mend()` rewrites any custom costume or step those settings don't know, and `load()` saves the rewritten version.

So a sync mistake, out-of-date settings on a device, or a claimed guest save would quietly delete parts of a child's work and then push that onto the server. My plan relies on family-wide settings, the server's version numbers and the save history to catch it. If any of those slips, the loss happens without any error.

**Fairly sure** this is the riskiest part.