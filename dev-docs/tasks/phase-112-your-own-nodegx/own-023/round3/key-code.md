# OWN-023 round 3 — ANSWER KEY, plain-code version (`work-gala/`)

Pre-registered before grading. Written from README.md, CLAUDE.md and changes/001 (the stranger did not get those), with every
fact checked in the source. Paths are relative to `work-gala/`. **Where docs and code disagree, the code wins** (§D).

## D. Docs vs code disagreements (a stranger reading only code cannot be faulted for these)
- CLAUDE.md:54 says "there's no settings screen, and `applyRows()` … is never called". **Stale**: `main.js:20` calls `applySettings` → `applyRows` (`settings.js:147-151`), and `grownups.js` is the screen.
- README:26 says settings.json holds "only the EDITABLE tables". Code: `EDITABLE` includes `rules` and `parking` (`data.js:240-241`), but `SCHEMA` (`settings.js:30-45`) has neither, so `sanitize()` drops them (`settings.js:116`). The settings file is a **subset** of EDITABLE.
- README:27-28 says the browser copy is "used when the server can't be reached". Code: the settings copy is also used when the server answers but has no file, and is then uploaded (`grownups.js:23-24`). The save's local copy wins **whenever its `at` is newer**, server reachable or not (`state.js:78-80`).

---

## Q1. What is the game, typical session
**Answer.** A French/English 3D (three.js) management and puzzle game. You run a children's dance school's end-of-year **gala night**. You prepare the evening: running order and start time, each dance's formation and choreography (blocks of moves chained to fill the music), costumes and hair, the dressing room's furniture, the snack (goûter), and from season 2 the car park. Then you check the plan with a free dress rehearsal or single-dance try-outs, which show verdicts and "Pourquoi ?" sums. Then you play gala night once per season. It earns stars to spend in the shop, and "next season" adds a new challenge.
**Cites.** `ui.js:1-2` header; tabs `ui.js:85`; `ui.js:108` (rehearsal and gala buttons); `engine.js:1-3`; `i18n.js:147-152` (season intros, French); `i18n.js:296-301` (the same in English).
**Full marks:** (a) a dance-school **gala** you plan and then watch play out in 3D; (b) planning covers order, formation and choreography, costumes and snacks, and more; (c) rehearsal is free and repeatable, the gala happens **once per season** and earns stars; (d) bilingual and for children.
**Watch for:** "a rhythm/dance game where you dance" (no, the player plans and the dancers are simulated); "an idle game"; "a multiplayer game".

## Q2. Main screens / tabs
**Answer.**
- **Top bar**: school name, season chip (re-opens the intro), stars, live clock, 🔊, EN/FR, ⚙️ (`index.html:13-21`, `hud()` `ui.js:56`).
- The **3D view**, with a camera bar (rotate, high view, school, stage, 🅿️ car park, walls, zoom) (`paintCamBar` `ui.js:64`).
- The **side sheet** (it moves to the bottom when the window is narrower than 760 px, `ui.js resize()`), in three screens (`G.screen` 'prep' | 'run' | 'results', `paintSheet` `ui.js:98-115`):
  - **prep** has 8 tabs: Programme · Formation · Goûter/Snacks · Costumes · La loge/Dressing room · Parking (season ≥ 2 only) · Boutique/Shop · Carnet/Notebook (`ui.js:85`, `i18n.js:22`, `i18n.js:181`). Bottom buttons: "Répétition générale" and "Le soir du gala", or "Saison suivante" once the gala is done.
  - **run** is the live evening: the programme cards, a feed, speed, follow, skip a number, stop (not during the gala), and skip to the end (`ui.js:556-581`).
  - **results** shows points and verdict cards (`ui.js:686`).
- A **try-out** of one dance (Formation tab, `ui.js:225,263`).
- A season **intro modal** (`showIntro` `ui.js:745`).
- The grown-ups' **gate** dialog and the **settings screen**, which has 5 tabs: steps, costumes, shop, school, file (`grownups.js:46,66,77`).

**Full marks:** the prep tabs (at least 6 of the 8, with Parking appearing from season 2), the run/live screen, the results screen, and the grown-ups' settings behind ⚙️.
**Watch for:** missing the hidden settings screen; listing Parking as always present; inventing a login or menu screen (there is none).

## Q3. What is saved, where, when, under what key
**Answer.** There are **two separate persisted things**.

**(1) Progress** is the object `G.S`: `{v:2, at, lang, season, galaDone, seenIntro, plan, school:{name, logeCols, stars, earned, owned, upgrades, furniture}, notebook, sound, seed}` (`state.js:19-21`, `plan.js:50-70`).
- It is written to `localStorage['gala-game-v2']` (`state.js:18,85`) **and** PUT to the local server's `/api/save`, which writes `~/.gala-de-danse/save.json` (or `$GALA_DIR`) (`store.js:18-24`, `serve.mjs:12,17`).
- `save()` stamps `at = Date.now()` (`state.js:83-87`). The localStorage write is immediate. The server write is debounced to 300 ms and sends the last version only (`store.js:16-24`). Anything still pending is flushed on `pagehide`, with keepalive only if the body is under 60 000 bytes (`store.js:31,37-40`).
- **When** `save()` is called:
  - every plan or school edit, through `changed()` (`ui.js:31`): buying, steppers, the end of a drag, and so on;
  - every keystroke in the school name (`ui.js:426`);
  - the language and sound toggles (`main.js:29,32`);
  - the end of the gala (`ui.js:546-553`);
  - next season (`ui.js:742`);
  - closing an intro (`ui.js:750`);
  - reset (`state.js:88`);
  - at boot, when the local copy wins (`state.js:80`).
- At boot the two copies are compared and **the newest `at` wins**. A tie goes to the server.

**(2) Grown-ups' settings**: `{v:1, rows:{…}}` in `~/.gala-de-danse/settings.json` via `/api/settings`, plus `localStorage['gala-settings-copy']` (`grownups.js:12,19-28`). They are stored at every change (`commit` `grownups.js:171-175`).

**Also:** the read-only legacy key `gala-toy-v1` (`state.js:18,69-70`); `sessionStorage['gala-settings-applied']`, a toast flag (`grownups.js:12,30,74`); and a downloaded `gala-de-danse-reglages.json` that holds **settings only** (`grownups.js:224-227`).

**Full marks:** (a) the key `gala-game-v2` in localStorage; (b) **plus** a server-side `save.json` outside the game folder, with newest-`at`-wins; (c) saves on every change (`changed()`) and at the gala's end, with a debounced server write; (d) settings are a separate file and key.
**Watch for:**
- "localStorage only" (it misses the server copy);
- "saves at the end of each season only";
- "Save to a file exports your progress" (no, settings only);
- "results/verdicts are saved" (no, they are recomputed by `simulate`; only stars, `earned` and a notebook summary are kept, `ui.js:549-550`);
- "the mid-gala state is saved" (`G.run` is never saved).

## Q4. Server / backend / accounts
**Answer.** **There is a server, but it is local only.** `serve.mjs` is a Node `http` server bound to `127.0.0.1:5173` (or `PORT`) (`serve.mjs:11,58`). It does two things:
- It serves the static files.
- It offers exactly two JSON endpoints, GET/PUT `/api/settings` and `/api/save` (`serve.mjs:15-18,52`), which read and write `settings.json` and `save.json` in `~/.gala-de-danse` or `GALA_DIR` (`serve.mjs:12`).

What a PUT must pass:
- The Host header must be localhost or 127.0.0.1, and the Origin (if sent) must be that same host and port (`serve.mjs:20,24-25`).
- The content type must be `application/json` (`:34`), and the body at most 100 KB (`:19,35-38`).
- Settings are re-`sanitize`d on the server (`:9,16`). The save is checked only for `v === 2` (`:17`).
- The file is written whole and then renamed into place (`:43-44`).

**No user accounts, no login, no identity, no auth, no internet sync.** There is one save and one settings file **per machine**, shared by every browser on it. Anyone using this machine's page can read and write them. The game still works without the server: `store.js` fails quietly with a 2.5 s timeout (`store.js:1-14`).
**Full marks:** (a) yes, a local Node server (`serve.mjs`); (b) it only stores the two JSON files (settings and save) and serves the game; (c) it is reachable only from this machine (127.0.0.1 plus the Host/Origin check), with no accounts or auth; (d) the game degrades to localStorage without it.
**Watch for:** "no server at all, it's a static page" (this misses `/api/save`); "there's a backend with users"; "the server is just a dev server" (it is the persistence layer).

## Q5. Who can change settings; how the app decides
**Answer.** Anyone who passes a **child-proofing gate**. There is no identity check.
- Hold ⚙️ for 2 s, by pointer or by Enter/Space (`bindGear` `grownups.js:33-44`). A quick tap only shows a toast.
- Then type the answer to a random sum a×b, with a ∈ 12–19 and b ∈ 3–9 (`openGate` `grownups.js:46-62`, the check at `:56`). A wrong answer asks a new sum.
- The gate refuses while a run (rehearsal, try-out or gala) is playing (`:47`).
- It is checked entirely in the browser. The server applies no permission at all, only sanitising (`serve.mjs:16`).

Every value is validated by `check()`/`sanitize()` (`settings.js:68-138`), and every name goes through `clean()` (`words.js:48`). Closing the screen reloads the page if anything changed (`grownups.js:70-76`).
**Full marks:** (a) a long press on ⚙️ (2 s); (b) a typed answer to a times-table sum; (c) no account or password, and it is client-side only; (d) values are clamped and filtered whoever gets in.
**Watch for:** "a PIN or password"; "only the server owner"; "an admin role"; missing the long press; "settings are per player" (they are global to the machine).

## Q6. Gala button → results, step by step
**Answer.**
1. The `#galaBtn` button ("Le soir du gala") is shown only while `!G.S.galaDone` (`ui.js:108-110`), and calls `beginRun('gala')` (`ui.js:538`).
2. `startRun` (`play.js:108-124`) returns null if the gala is already done. Otherwise it calls **`simulate({plan, school, season, mode:'gala', seed: G.S.seed})`** (`engine.js:274`), which computes the **whole evening up front**: the programme and timing (`programme` `engine.js:193`), and for each number its spacing, music, state and execution, with slips rolled from the **season's stored seed** (`engine.js:296-302`). It also computes the goûter, the parking (season ≥ 2), the parents' satisfaction and the points (`:340-350`), plus a trace and each dancer's schedule.
3. `startRun` sets `G.run`. `beginRun` then wakes the audio, sets `run.onDone = finishRun`, cuts the camera to the school and calls `showScreen('run')` (`ui.js:538-545`).
4. The frame loop (`main.js:64-78`) calls `stepRun` (`play.js:131`), which advances the clock at a variable rate and turns trace `say` entries into feed lines and toasts through `sayText` (`ui.js:583`). `stepScene` and `updateDancers` animate the dancers, and `tickMusic` plays the Web-Audio score (`music.js`). `paintRunSheet` repaints 4×/s.
5. During the gala you cannot stop, but you can speed up, skip a number, or skip to the end (`fastForward` `play.js:152`).
6. When `run.t >= endT`, the run is done and `onDone` fires (`play.js:144`). `finishRun` (`ui.js:546-553`) sets `galaDone`, adds the points to `stars` and to `earned`, unshifts a notebook entry and calls `save()`, then `showScreen('results')`.
7. `paintResults` (`ui.js:686`) shows the points list and `verdictCards`. "Back" calls `stopRun`, and "Saison suivante" calls `stopRun` then `nextSeason`.

**Full marks:** (a) the engine computes the result **before** playback (pure `simulate`), with the season's seed; (b) playback (`play.js` and the frame loop) only replays the trace and schedule; (c) stars and the notebook are credited and saved only when playback ends (`finishRun`); (d) the results screen shows the verdicts; (e) names at least engine, play/ui and state.
**Watch for:** "the score is computed as the dancers dance" or "playback decides"; "points are added when you press the button"; "the gala can be replayed" (no; reloading mid-gala replays the **same** result, because the seed is saved).

## Q7. Earning and spending points
**Answer.** Points come from `simulate` (`engine.js:340-350`). Only **gala night** turns them into ⭐ stars (`ui.js:549`). A rehearsal only shows what it *would* earn (`i18n` `rehNote`, `paintResults`).

Points per gala:
- **Per number**: placement /3, music /2, harmony /3, execution /4, wow /5, so at most 17 (`engine.js:313-314`).
- On time 10; little ones in bed in time 5; no costume wait 5; start on time 5.
- No yawns 5 (season ≥ 3).
- Goûter 10, plus 3 × variety.
- Parking 10 (season ≥ 2).
- Parents' satisfaction ÷ 5.
- Perfect evening 20.

A school starts with **30 stars** (`START` `data.js:231`, which a grown-up can change).

Spending happens in the **Shop** (`paintShop` `ui.js:498`) and inline in the tabs, all through `buy()` (`ui.js:43-51`). You can buy:
- **Hall upgrades**: seats ×3, velvet seats, snack bar, spotlights, disco ball, a bigger stage, 3 backdrops, a bigger dressing room.
- **Car-park upgrades** from season 2: an attendant, a car-share poster, a shuttle, a 2nd row of bays (`data.js:193-208`).
- **Dressing-room furniture** (`PIECES`).
- Costumes, hairdos, shoes and accessories.
- Snacks (cereal bars, bread and jam), plus crêpes (20) and compotes (15) (`ui.js:53`).

Purchases are kept in `school.owned` and `school.upgrades`. An item with no price, or price 0, counts as owned (`isOwned` `engine.js:17-22`).
**Full marks:** (a) points come from the evening's quality (per-dance scores plus programme, goûter, parking and parents); (b) **only the gala** credits stars, once per season; (c) stars are spent in the shop on upgrades, furniture, costumes and accessories, and snacks; (d) the stars total is saved in `school.stars`.
**Watch for:** "rehearsals earn stars"; "points and stars are different currencies" (they are the same number); "you can grind the gala" (no, it is once per season).

## Q8. Seasons
**Answer.** `SEASONS` 1–4 (`data.js:220-225`), with `seasonRules(season)` (`data.js:226-229`).

| Season | What it adds |
|---|---|
| S1 | The base game: petits, moyens and grandes, 6 numbers. |
| S2 | **The car park**: the parking tab, parking rules and points, and the car-park shop upgrades (`season:2`). |
| S3 | **The teens** (hip-hop) arrive, with numbers A1 and A2 inserted before the interval and before the finale (`plan.js:73-85`). The **dance mat** must be rolled up for jazz and hip-hop (`floors`), and two calm dances in a row make the parents yawn (`moods`, the noYawn points). The street outfit and trainers unlock (`data.js:113,135`). |
| S4 | **The mums' class** (F1). |
| S5+ | A "free season" intro (`i18n.js:152,301`). There are no new rules (seasons are uncapped, `ui.js:741`). |

`nextSeason()` (`ui.js:740-744`) increments `season`, resets `galaDone`, draws a **new seed** and adds the season's numbers to the plan. Stars, purchases, furniture and the plan carry over. Each season shows its intro once (`seenIntro`, `ui.js:745-751`).
**Full marks:** (a) each season adds one new constraint: car park (2), teens with the mat and yawns (3), mums (4); (b) a season ends with its one gala, then "next season"; (c) progress carries over; (d) a new seed is drawn each season.
**Watch for:** "seasons reset the school"; "only 3 seasons"; "the game ends after season 4"; "seasons are calendar time".

## Q9. French / English
**Answer.** `G.lang` is 'fr' or 'en', and the default is 'fr' (`state.js:10,20`). The **EN/FR button** toggles it, then calls `save()` and repaints (`main.js:29`). The settings screen has its own button, which clicks the main one (`grownups.js:179`). The language is stored **inside the save** (`G.S.lang`, `state.js:84`) and restored at load (`state.js:79`). Nothing reads the browser's language.

The words come from three places:
- **Sentences** are in `i18n.js` `TXT.fr` and `TXT.en`, read through `t() = TXT[G.lang]` (`i18n.js:19,328`).
- **Names of things** sit on the data rows as `fr`/`en` fields, read through `nm()`, which falls back to fr (`i18n.js:1-2,14`, `data.js`). Grown-ups can override them through the settings rows.
- **Dancers' first names** exist in one version only (`NAMES`, `i18n.js:17`).

Number and clock formats change with the language: a decimal comma in French (`i18n.js:7-13`).
**Full marks:** (a) a toggle button with the state in `G.lang`; (b) `i18n.js` holds the sentences, and the `fr`/`en` fields on the data rows hold the names; (c) the choice is saved in the save.
**Watch for:** "an i18n library, JSON locale files, or browser detection"; "all words are in i18n.js" (it misses the row names); "the language is a device setting" (it is part of the save).

## Q10. Older save loaded by a newer version
**Answer.** `load()` (`state.js:74-82`) works as follows.
- The local copy, read by `fromLocal()` (`state.js:66-72`):
  - `gala-game-v2` with `v===2` → `mend(s)`;
  - otherwise the round-1 `gala-toy-v1` with `v===1` → `fromRound1` → `mend`. `fromRound1` (`state.js:22-41`) carries over the order, the G1 formation, the snack amounts, the school name, and the costumes and hair it maps.
- The server copy is accepted only if `v===2` and it has a `plan` and a `school`. It is then `mend`ed (`:77`).
- Anything else counts as nothing (unknown `v`, or broken JSON caught by `try`). If neither copy exists, `fresh()` is used.

`mend()` (`state.js:43-65`) is an **additive repair, not a versioned migration chain**:
- It fills every missing top-level, `plan` and `school` key from `fresh()`.
- A missing or invalid `at` becomes 0, so an old save loses to any newer copy (`save.test.mjs:26`).
- It adds the season's numbers, and converts old "moves × repeats" into blocks and a chain (`migrateNumber` `plan.js:44-48`).
- It resets outfits, shoes, accessories, steps and hairdos that no longer exist (for example a grown-up's removed custom item) to the number's own.
- It runs names through `clean()`, and clamps stars to 0–999999.
- `v` stays 2.

The settings file has its own `migrate()`: bare rows with no `v` become `{v:1, rows}` (`settings.js:104-108`).
**Full marks:** (a) `mend()` fills missing fields with defaults and keeps the plan; (b) the round-1 key `gala-toy-v1` is converted; (c) references to things that no longer exist are repaired, not crashed on; (d) `v===2` gating, so unknown versions are ignored; (e) an old save gets `at=0`.
**Watch for:** "there's a migration per version number"; "an old save is discarded"; "no handling at all".

## Q11. Pure rules vs screen
**Answer.**
- **Pure (no DOM)**:
  - `engine.js` ("No DOM, no three.js, no words", `engine.js:1-3`) holds `simulate` and its helpers and uses a seeded RNG (`rngFor`, `engine.js:10`).
  - `data.js` (the rows and `applyRows`), `plan.js` (`plan.js:1`), `settings.js` (`settings.js:2`), `words.js` (`words.js:2`) and `tunes.js` (the notes and `score`).
  - Node tests run these directly (`tests/*.test.mjs`).
- **No DOM but with side effects (I/O)**:
  - `state.js` (`localStorage` and `putFile`; `mend` and `fresh` themselves are pure enough for `save.test.mjs`);
  - `store.js` (`fetch`);
  - `i18n.js` (it reads `G.lang`).
- **On screen**:
  - `main.js` (boot, the frame loop, input, `window.__game`) and `ui.js` (the side sheet, tabs, results, shop);
  - `world.js` and `people.js` (three.js);
  - `play.js`, which draws the engine's schedule ("Nothing here decides anything", `play.js:1`);
  - `music.js` (Web Audio) and `grownups.js` (the settings DOM).
- `serve.mjs` is Node, server side, and imports the pure `settings.js` to sanitize.

**Full marks:** (a) `engine.js` is pure, with seeded randomness; (b) `data.js`, `plan.js`, `settings.js` and `words.js` are pure; (c) ui, world, people, play and music draw; (d) play only replays what the engine decided.
**Watch for:** "`play.js` computes the outcome"; "`state.js` is pure"; putting `music.js` or `tunes.js` on the wrong side (`tunes.js` is data, `music.js` is the screen and audio side).

## Q12. Real top-3 risks of the sign-in feature in THIS codebase
1. **Silent overwrite of progress at sign-in and after offline play.**
   - **Why it bites here:** today's reconciliation is whole-object last-writer-wins on a client `Date.now()` stamp (`state.js:78-84`). It runs only at boot, with one global key (`gala-game-v2`) and one `save.json` per machine. Plugged into accounts naively, a device's anonymous or sibling progress (or a stale offline copy) will overwrite a child's cloud progress, or the other way round. Clock skew between devices makes "newest" wrong.
   - **What it needs:** per-player storage, an explicit "claim this device's progress" step, server-side revisions, and no automatic cross-identity merge.
2. **Grown-up settings are per machine but change what a save means.**
   - **Why it bites here:** custom steps and costumes `new1..new12`, renamed rows and starting stars are laid over the rules *before* the save loads (`main.js:18-21`). `mend()` strips ids the current settings don't know (`state.js:52-59`) and the next `save()` pushes the stripped save back up. A child's save opened on the school laptop (other settings, or none) **loses custom content and can propagate the loss**.
   - **What it needs:** settings must become family-scoped and synced, or `mend` must stop being destructive.
3. **Moving a localhost-only, auth-less store online, for under-13s.**
   - **Why it bites here:** the only protections today are binding to 127.0.0.1, a Host/Origin check (`serve.mjs:20-25,58`) and a times-table gate. The server accepts any `v:2` object as a save (`serve.mjs:17`, no sanitize or mend).
   - **What it needs:** real parent auth; child sign-in with no email or PII (a family code plus a picture or PIN); server-side validation, `clean()` on child display names, and size limits; children's-privacy law (COPPA / GDPR-K).
   - The project's own house rule (CLAUDE.md:86-87: "No ads, accounts, chat or data leaving the machine") is directly contradicted, so this needs the owner's ruling.

Also credit: **mid-gala** state is not persisted (`G.run`). It doesn't need to be, because the seed makes a replay identical. And a failed server PUT is **never retried** (`store.js:31`).

---

# What a sound plan must get right in THIS codebase

## Touch points
| # | MUST/SHOULD | Where | Why |
|---|---|---|---|
| 1 | MUST | `state.js` `SAVE_KEY`/`OLD_KEY` (`:18`), `fromLocal` (`:66-72`), `load` (`:74-82`), `save` (`:83-87`), `resetAll` (`:88`) | The single global key needs a per-player namespace and an anonymous slot. The newest-wins rule must not cross identities. The legacy key must be claimed once, by one player. |
| 2 | MUST | `store.js` `NAMES` whitelist (`:3`), `getFile`/`putFile`/`send`/`flush` (`:7-40`) | This is the existing sync seam: 300 ms debounce, last version only, fail-quiet, pagehide flush, keepalive under 60 KB. It needs an auth token and a per-player endpoint, and must **queue and retry** failed writes (today a failed PUT is dropped). |
| 3 | MUST | `serve.mjs` `FILES` (`:15-18`), Host/Origin lock (`:20-25`), 127.0.0.1 bind (`:58`), `v===2` check (`:17`), 100 KB cap | Either a new online backend or an extended one. The local server cannot be exposed as it is: the save gets no server-side validation. |
| 4 | MUST | `main.js` boot (`:18-21`), a top-level `await Promise.all([loadSettings(), getFile('save')])` | Choosing the player (or signing in) must happen **before** `load()`, and settings must be applied before the save loads. Keep `window.__game` (`:84-97`) working. |
| 5 | MUST | Save triggers: `changed()` `ui.js:31`; `finishRun` `ui.js:546-553`; `nextSeason` `ui.js:740-744`; `showIntro` `ui.js:750`; school name `ui.js:426`; notebook reset `ui.js:534`; lang and sound `main.js:29,32` | Everything funnels into `save()`. Hook there (once), not at each caller. |
| 6 | MUST | `mend()` `state.js:43-65`, together with the settings dependency (`state.js:52-59`) | Cross-device loads must not strip custom content. Any new save fields need defaults in `fresh()`. Add an old-save test (`tests/save.test.mjs`). |
| 7 | MUST | The version gates `v===2` at `state.js:68`, `state.js:77` and `serve.mjs:17` | Bumping the save version breaks all three. A stamped `v:3` save is ignored or refused. |
| 8 | MUST | `grownups.js` "Start a new school" (`:218-222`, calls `resetAll`), and the Notebook reset (`ui.js:534`) | With profiles, these must reset the **current** child only, and say so. |
| 9 | SHOULD | `grownups.js` gate (`bindGear`/`openGate` `:33-62`) | Can be reused to reach a "family" area **on the device**. It is a child-proofing gate, not authentication. |
| 10 | SHOULD | Settings storage: `loadSettings` (`grownups.js:19-28`), `LOCAL_KEY 'gala-settings-copy'`, server `settings.json` | Decide whether settings are per family, per device or per child, and how they sync. |
| 11 | SHOULD | `G.S.lang`, `G.S.sound` and `seenIntro` live in the save (`state.js:20,84`, `music.js:12,28`) | Decide whether they are per-child preferences (synced) or per-device ones. |
| 12 | SHOULD | `i18n.js` copy, e.g. "kept on this computer" (`i18n.js:162,310`), and every new sentence in **both** languages; `clean()` (`words.js:48`) for child display names; `esc()` (`ui.js:18`) for innerHTML | — |
| 13 | SHOULD | Tests: `tests/save.test.mjs`; `tests/browser/001-persistence.spec.mjs`, `monkey.spec.mjs`, `helpers.mjs startServer` (`GALA_DIR`, `PORT=0`) | Add offline, two-children and first-sign-in cases. |

## Existing mechanisms (reuse, or handle with care)
- **`store.js`**: a quiet, debounced, last-version-only file sync with a pagehide flush. This is the natural adapter to point at a backend.
- **`load()`**: boot-time two-copy reconciliation by `at`. It is reusable in shape, but dangerous as-is across identities.
- **`mend()` and `fresh()`**: forward-compatible repair of any save. The settings side has the same "never throws" `sanitize()` pattern, used on both client and server (`serve.mjs:9`).
- **`clean()` and `esc()`**: the one rude-word and code filter, and HTML escaping.
- **Gate**: long press plus a sum (`grownups.js`).
- **Atomic writes**: tmp file then rename (`serve.mjs:43-44`).
- **Reload as the "apply" mechanism**: `closeSettings` → `location.reload()`, plus a sessionStorage toast flag (`grownups.js:70-76`). Switching child will most likely need the same, because `applyRows` mutates the shared data rows **in place** (`data.js:242-251`).

## Traps (what a mis-reader gets wrong)
- **More than one save location.** It is localStorage **and** a server `save.json`, newest wins. It is not "localStorage only", and not "server only".
- **Settings are separate and global** (one per machine, `settings.json` plus `gala-settings-copy`). They are not part of the player's save.
- **Saves depend on settings.** `mend()` repairs saves against the currently applied settings, so the load order matters (`main.js:18-21`).
- **What is saved vs derived.** Verdicts, points and results are **derived** by `simulate()` and never saved. What is saved: the plan, the school (stars, owned, upgrades, furniture), the notebook summary, the season, `galaDone` and the `seed`.
- **The gala is not saved mid-run.** It is credited only at the end of playback, in `finishRun`.
- **One save per machine, not per browser.** Two browsers on the same computer already share one `save.json`. "Per device" is the server folder.
- **Save timing.** Saving happens on every change, on every keystroke in the school name, and at boot. It is not "on exit" and not "per season".
- **"Save to a file" exports grown-up settings only**, never progress.
- **The `v===2` checks are hard-coded** in three places. `mend` never bumps `v`.
- **Failed PUTs are not retried.** Offline catch-up happens only at the next boot, when the local `at` is newer.
- **The legacy key `gala-toy-v1`** is read and never deleted.
- **Lang and sound are inside the save.**

## Secrets (micro-understanding probes)
1. The gala's outcome is fixed before playback, using `G.S.seed`. The seed is drawn per season (`state.js:20`, `ui.js:741`) and used at `play.js:111`. Reloading mid-gala replays the identical evening.
2. The dress rehearsal **never** slips (`rolls = gala || try`, `engine.js:274`). A try-out rolls a fresh random seed each time (`play.js:111`).
3. Settings are applied **before** the save is opened, so that `mend()` can repair references to removed custom steps and costumes (`main.js:18-21`, `state.js:52-59`).
4. The server re-sanitizes settings with the very same `settings.js` (`serve.mjs:9,16`), but accepts **any** object with `v:2` as a save (`serve.mjs:17`).
5. A save missing `at` gets `at=0`, so it always loses to any newer copy (`state.js:48`). On a tie, the server copy wins (`state.js:78`).
6. A price of 0 (or none) means "owned for free" (`isOwned`, `engine.js:21`). A grown-up who sets a price to 0 gives the item away.
7. `EDITABLE` lists `rules` and `parking`, but the settings `SCHEMA` cannot change either (`data.js:240-241` vs `settings.js:30-45`).
8. The pagehide flush uses `keepalive` only for bodies under 60 000 bytes (`store.js:31`). The server cap is 100 KB.
9. Gate sums are a∈[12,19] × b∈[3,9] (`grownups.js:50`). The gate is refused while any run is playing (`:47`).
10. `mend` clamps stars to 0–999999 and passes the school name through `clean()` on **every** load (`state.js:62-63`). A rude name in a save comes back as the default.
