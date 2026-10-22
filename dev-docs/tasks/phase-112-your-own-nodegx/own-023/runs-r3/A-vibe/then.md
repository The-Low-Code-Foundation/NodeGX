Answering from memory, no tools.

**1. What is this game, and what does the player do?**
It's "Le Gala de danse", a French/English browser game for roughly 8–13 year olds. The player runs a dance school's end-of-year show: they set the running order, the dancers' formations and choreography, the costumes, the dressing room ("la loge"), the snack table and (from season 2) the car park, then run a free dress rehearsal or the once-a-season gala night. A typical session is preparing those tabs, watching the simulated evening play out in 3D, reading the verdicts, and spending the stars earned on upgrades.
*Sure.*

**2. Main screens or tabs.**
Three screens: `prep`, `run`, `results`. The prep screen has tabs: Programme (order), Formation, Goûter, Costumes, La loge (build), Parking (season 2+), Boutique (shop), Carnet (notebook). Separately, the grown-ups' settings screen has its own tabs: moves, outfits, shop, school, file. There's also the season intro modal and the top bar chips (season, stars, day, sound, language, gear).
*Sure.*

**3. What does the game save today, where, and when?**
It saves one blob, `G.S` (version 2), in two places: this browser's `localStorage` under the key `gala-game-v2`, and the server's `save.json` in `~/.gala-de-danse` (or `GALA_DIR`). It's written on essentially every change — `changed()` in `ui.js` calls `save()`, which writes localStorage synchronously and queues a debounced (300 ms) `PUT` to the server. The grown-ups' settings are saved separately: `settings.json` on the server plus a browser copy under `gala-settings-copy`. There's also an older round-1 key, `gala-toy-v1`.
*Sure.*

**4. Is there any server, backend or user account today?**
There is a server — `serve.mjs`, a small Node `http` server that serves the static game and two endpoints, `/api/settings` and `/api/save`, each backed by one JSON file outside the game folder. There are no user accounts and no identity of any kind. It's usable only from the same machine: it binds `127.0.0.1` and rejects any request whose `Host`/`Origin` isn't localhost.
*Sure.*

**5. Who can change the game's settings, and how does the app decide?**
Anyone who can get past the gate: a long press (about two seconds) on the ⚙️ button, then answering a multiplication sum (roughly 12–19 times 3–9). It's a speed bump to stop a child opening it by accident, not authentication — there's no account or password. Settings can also be brought in by loading a JSON file from the "file" tab.
*Sure.*

**6. From pressing the gala button to seeing the results.**
Roughly: the gala button calls `beginRun('gala')` in `ui.js`, which calls `startRun('gala')` in `play.js`. That calls `simulate({ plan, school, season, mode: 'gala', seed: G.S.seed })` in `engine.js`, which returns the whole evening — running order, per-number verdicts, the goûter, parking, parents, points, and a time-ordered `trace` plus each dancer's `seg` schedule. `startRun` builds a `run` object and sets `G.run`; `showScreen('run')` switches the sheet. Each frame, `stepRun` advances `run.t`, drains `trace` events and turns them into sentences via `sayText`, while `updateDancers` and `stepScene` move the dancers and the hall, and `music.js` plays the score. When `run.t` reaches the end, `run.done` fires `onDone` → `finishRun()`, which adds the points to the school's stars, writes a notebook entry, calls `save()`, and shows the results screen (`paintResults` → `verdictCards`).
*Fairly sure.*

**7. How does the player earn points, and what can they spend them on?**
Points are earned on gala night only (a rehearsal shows what it would have earned). Each number scores up to 17: placement 3, music 2, harmony 3, execution 4, "wow" 5. On top of that: on time 10, little ones in bed 5, no costume waits 5, curtain on time 5, no yawning 5 (season 3+), goûter 10 plus 3 per variety item, parking 10 (season 2+), parents roughly satisfaction/5, and a 20-point "perfect gala" bonus. They're spent in the shop on hall and car-park upgrades, dressing-room furniture, outfits, hairdos, shoes, accessories, snacks and extra food.
*Fairly sure.*

**8. What are the seasons, and what changes?**
Four seasons. Season 1 is the base gala. Season 2 adds the car park (a new tab and upgrades like the attendant, car-share, shuttle, second row). Season 3 adds the teens class with two hip-hop numbers, plus floors (dance mat vs boards) and moods (two calm dances in a row make parents yawn). Season 4 adds the mums' class. `seasonRules(season)` turns on parking at 2+, floors and moods at 3+, and the classes whose `from` is at or below the season; `addSeasonNumbers` inserts the new numbers into the plan. Starting a new season bumps the season, clears `galaDone` and picks a new seed.
*Sure.*

**9. How does it switch between French and English, and where do the words come from?**
`G.lang` is `'fr'` or `'en'`, toggled by the language button in the top bar. Sentences come from `src/i18n.js`, which holds `TXT.fr` and `TXT.en`; `t()` returns `TXT[G.lang]`. Names of classes, numbers, moves, costumes, furniture and so on live beside their data in `data.js` as `fr`/`en` fields, and `nm()` picks the right one. Number and clock formatting also branch on the language.
*Sure.*

**10. What happens when an older save is loaded by a newer one?**
`mend(s)` repairs it: it fills in any top-level, plan or school keys a newer version added, migrates an old number (a phrase plus repeats) into the newer blocks-and-chain shape, drops any costume, step or hairdo a grown-up has since removed, re-cleans names, and clamps the stars. A round-1 save (`gala-toy-v1`) is first converted by `fromRound1()`. When both a browser copy and a server copy exist, `load()` keeps whichever has the larger `at` timestamp and writes the winner back to the other side.
*Fairly sure.*

**11. Which parts never touch the screen, and which do?**
Pure, no DOM: `engine.js` (the whole simulation and its judges), `data.js`, `plan.js`, `settings.js`, `words.js`, and `tunes.js` (the score data). `i18n.js` is essentially pure but reads `G.lang`. `state.js` touches `localStorage` but not the screen. Touch the screen or the browser: `main.js`, `ui.js`, `world.js`, `people.js`, `play.js`, `music.js` (Web Audio), `grownups.js`, and `store.js` (fetch).
*Fairly sure.*

**12. The single riskiest thing about the plan, given how this game is built.**
The conflict policy. The game's entire progress is one opaque save blob, and the only merge rule it has is "whichever copy has the larger `at` wins" — so two devices that both play offline cannot be merged field by field; any resolution is all-or-nothing, and the existing rule would silently throw one child's evening away. Everything else in the plan (auth, per-child keys, the outbox) is additive, but this one has no clean answer without either accepting lost work or building a real merge.
*Fairly sure.*
