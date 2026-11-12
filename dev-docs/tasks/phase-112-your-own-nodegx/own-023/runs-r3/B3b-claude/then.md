**1. What the game is.** *Le Gala de danse* is a management game, in French or English, where the player runs a dance school and prepares its end-of-year gala. In a typical session they set the running order, choreograph the numbers on a stage plan, and pick costumes, snacks, furniture and (later) the car park, buying things with stars. Then they run a general rehearsal and the gala night, which plays out in a 3D school, and read the verdicts with a "Why?" for each. — **Sure.**

**2. Screens and tabs.**
- The 3D school fills the window.
- A top bar shows the school name, season, stars, the evening's clock, music, FR/EN and the grown-ups' door.
- A camera bar sits over the 3D view.
- A side sheet holds the tabs:
  - Programme (order)
  - Formation
  - Goûter (snacks)
  - Costumes
  - La loge (dressing room)
  - Parking (from season 2)
  - Boutique (shop)
  - Carnet (notebook)
- The sheet also shows the live evening and the results.
- Other pieces:
  - the season letter overlay
  - a toast
  - a floating furniture toolbar
  - a separate Grown-ups settings page

— **Sure.**

**3. What is saved, where, when.**
- One JSON save object holds language, season, `galaDone`, `seenIntro`, the plan, the school, the notebook, sound and the seed.
- It lives in the Global Store `gala` under the key `save`, persisted to the browser's localStorage under `gala-game-v2`.
- It is written whenever a press changes the save (the Dispatcher's `dp_setSave`), and once at start-up after it is opened and repaired.
- The screen state (`ui` store) is not saved.

— **Sure** on the name and place. **Fairly sure** that the write to localStorage happens immediately on each set.

**4. Server, backend, accounts.**
- Yes. A NodeGX backend is configured at `127.0.0.1:8585`, the maker's own machine.
- It holds one collection, `GameChange`: the grown-ups' edits to the game tables.
- There are three cloud functions: `claimGrownup`, `saveChange` and `removeChange`.
- Accounts are username and password, with public sign-up.
- The game reads `GameChange` publicly at start-up and waits at most 4 s before opening without it.
- Only the grown-ups' page signs anyone in. The game itself has no accounts.

— **Sure.**

**5. Who can change settings, and how that is decided.**
- The first account to sign up or sign in on the Grown-ups page calls `claimGrownup` and gets the role `grownup`. Every later account is refused.
- `nodegx.security.json` lets only `role:grownup` call `saveChange` and `removeChange`.
- Both functions also check the role themselves.
- `saveChange` also runs the checker: known tables and fields only, numbers in range, short and polite names. The same checker runs in the browser first and again when changes are laid over the game.
- Nobody can write `GameChange` directly.

— **Sure.**

**6. From the gala button to the results.**
1. The sheet's GoButton sends the `gala-act` event, with `act: "go"` and `arg: "gala"`.
2. `/Game/Dispatcher` (`dp_fn`) passes it to `dispatch.js`, which calls `begin(..., 'gala')`. That does nothing if `galaDone` is already true.
3. Otherwise it calls `stage.beginRun`, and `stage/play.js` runs `simulate()` from `rules/engine.js` with the season's seed.
4. The returned result goes into the `ui` store as `res`, along with `screen: 'run'` and a fresh `live`.
5. The 3D stage plays the evening and reports progress into `ui.live`. The Top Bar clock and the `Game/Live` panel read it.
6. At the end the stage emits `done`, which becomes `act: "runDone"` on the same event channel.
7. The dispatcher sets `screen: 'results'` and, for a gala not yet done, calls `finishGala`. That sets `galaDone`, adds the points to `stars` and `earned`, and adds a notebook entry.
8. `Game/Results` shows the verdicts.

— **Fairly sure.** I didn't read inside `play.js`'s run loop or the Results component closely.

**7. Earning and spending points.**
- Points are stars, earned on gala night from the result of `simulate()` (`R.points`). A rehearsal shows what it "would have" earned but adds nothing.
- How the points are computed: **don't know**.
- Stars are spent in the shop (bought once, kept for good) on:
  - outfits, hairdos, shoes and accessories
  - dressing-room furniture
  - snacks and food
  - upgrades: seats, comfort, a refreshment stand, spotlights, a mirror ball, the stage, backdrops (forest, sea, city), a bigger dressing room, a car-park attendant, car-sharing, a shuttle, a second row

— **Fairly sure.**

**8. Seasons.**
- Each season ends with one gala night.
- "Next season" increments the season, resets `galaDone`, rolls a new seed and adds new classes' numbers: teens (A1, A2) and mums (F1).
- A season letter explains what is new.
- The car park appears from season 2.
- Which season each class arrives in: **don't know**.

— **Fairly sure.**

**9. French and English.**
- The FR/EN chip in the Top Bar sends `lang`, and the dispatcher flips `save.lang`. So the language is part of the save.
- The words are rows `{key, fr, en}` in the Static Data node `su_words` in Start Up, extracted from the original game by `tools/extract-words.mjs`. They are shared through the Variable `words`.
- `scripts/game/text.js` fills in templates such as `{0}`, `{0:s}` and `{0:lower}`.
- The grown-ups' page has its own word table, `Grownups/Words`.

— **Sure.**

**10. Loading an older save.** At start-up, `save.js`'s `mend()` runs:
- If the save isn't `v: 2` or lacks `plan` or `school`, a fresh save replaces it, keeping only the language.
- Otherwise it:
  - fills in any missing top-level, plan and school keys from a fresh save;
  - adds the current season's numbers;
  - migrates each number's plan;
  - drops unknown numbers and unknown programme items;
  - fills in missing hairdos.
- A `fromRound1()` converter exists, but `mend()` doesn't call it. Whether anything else calls it: **don't know**.

— **Sure** about `mend()`.

**11. Pure rules versus screen.**
- **Pure** (no screen):
  - `rules/*`: engine, data, plan and tunes, generated from `gala-rules`
  - `game/actions.js`, `game/save.js`, `game/text.js`
  - `settings/check.js`
  - `view/*`, which builds data for the panels but no DOM
  - `game/dispatch.js`, which is mostly pure but does call the 3D stage's methods
- **Screen**:
  - `stage/*` (three.js and the music)
  - the graph's visual components: pages, bars, tabs, UI pieces

— **Fairly sure.**

**12. Riskiest thing in my plan.** A fresh or wrongly repaired save overwriting a child's real progress on the server.
- The save is one whole object, replaced on every press.
- `mend()` silently turns anything it can't read into a brand-new school.
- So a new device, or a bad server copy, could produce a "valid" empty school that sync then sends as the latest.

The plan's guards depend on being implemented exactly right:
- a device never sends before it has loaded the server's copy;
- saves are checked before `mend()`;
- the server keeps a history copy before replacing a save with less progress.

The close second is the hosting assumption: one backend per home, with the first account becoming the grown-up. — **Fairly sure** (this is a judgement).