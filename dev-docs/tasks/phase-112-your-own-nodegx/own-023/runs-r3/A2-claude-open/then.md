**1. What the game is.** *Le Gala de danse* is a 3D browser game where the player runs a dance school and prepares its end-of-year show. In a session they set the running order, choreograph each number from blocks of steps, and pick costumes and hairdos. They also arrange the dressing room, plan the snack table and, from season 2, the car park. They can run free rehearsals and try-outs as often as they like, then play the gala once to earn stars. — **sure**

**2. Screens and tabs.**
- **Top bar:** the season chip (reopens the intro card), the stars chip, a clock chip during a run, and buttons for sound, language and ⚙️.
- **Camera bar:** buttons to rotate the view, go higher, jump to the stage or the school, and change how walls are shown.
- **Side sheet tabs:** Order, Formation, Goûter, Costumes, Build (the dressing room and the school name), Parking (from season 2), Shop and Notebook.
- **Sheet screens:** preparation, the live run, and the results.
- **Pop-ups:** a season intro card, the grown-ups' gate (a sum to answer), and the grown-ups' settings panel with tabs for steps, costumes, shop, school and file.

Confidence: **sure** about the tabs, **fairly sure** about the exact camera-bar buttons.

**3. What is saved, where and when.**
- **What:** the whole game state `G.S`, which includes:
  - version and timestamp, language, sound;
  - season, whether the gala is done, which intro was seen, the season's seed;
  - the plan, the school (name, stars, owned items, upgrades, furniture) and the notebook.
- **Where:**
  - in the browser under `localStorage['gala-game-v2']` (the older key `gala-toy-v1` is read once and migrated);
  - and on the local server as `save.json` in `~/.gala-de-danse` (or `$GALA_DIR`), through a PUT to `/api/save`.
- **When:**
  - on every change, because `changed()` calls `save()`: the browser copy is written at once, and the server copy about 300 ms later, sending only the latest version;
  - also on the language and sound buttons, closing the intro card, finishing a gala, starting a new season and resetting;
  - and any waiting copy is sent when the page closes.
- **Settings** are saved separately: `settings.json` on the server, plus a browser copy under `gala-settings-copy`.

Confidence: **sure**

**4. Server, backend, accounts.** There is a server, `serve.mjs`, run with `npm start` on port 5173. It does two things:
- serves the game's files;
- reads and writes the two JSON files through `/api/settings` and `/api/save`.

It listens only on 127.0.0.1 and refuses any request whose Host or Origin isn't localhost, so only the person at that computer can use it. There are no user accounts and no online backend. — **sure**

**5. Who can change the settings.** Anyone who gets through the gate: hold ⚙️ for 2 seconds, then type the answer to a multiplication (roughly 12–19 × 3–9). There is no real permission check. The gate is meant to stop a child opening it by accident, and it refuses to open while a run is playing. Anyone who can edit `settings.json` on disk can change the settings too. — **sure**

**6. From the gala button to the results.**
1. The gala button calls `beginRun('gala')` in `ui.js`. That clears any selection, then calls `startRun` in `play.js`.
2. `startRun` refuses if `galaDone` is already set. Otherwise it calls `simulate()` in `engine.js` with the plan, the school, the season, `mode: 'gala'` and the season's stored seed. This computes the whole evening up front: the timeline, verdicts, points and a trace of events.
3. It sets up `G.run`, hides the dancers and cars, and lays the snack table. `beginRun` then wakes the music, sets `onDone` to `finishRun`, cuts the camera to the school, and calls `showScreen('run')`.
4. Each frame, the loop in `main.js` calls `stepRun` to move the clock forward at a speed that depends on what's happening. It walks the trace, turning events into lines (`sayText`) and toasts. It also moves the dancers (`stepScene`, `updateDancers`), plays the music, and refreshes the top bar and run sheet.
5. When the run reaches its end, `finishRun()` sets `galaDone`, adds the points to `stars` and `earned`, writes a notebook entry, and calls `save()`.
6. `showScreen('results')` then shows the verdict cards.

Confidence: **fairly sure** (the exact place where the run is marked "done" is the least certain part).

**7. Earning and spending.**
- **Earning:** only from the gala's points, which are summed from each number's score. A perfect evening earns a bonus. A new school starts with 30 stars, and grown-ups can change that number.
- **Spending** in the shop and the Build tab:
  - costumes, hairdos, shoes, accessories;
  - dressing-room furniture;
  - snacks and food (crêpes, compotes);
  - upgrades: more seats, comfortable seats, a refreshment bar, a bigger stage, a bigger dressing room, an extra parking row, lights.

Confidence: **fairly sure** (the list of upgrades is from memory and may be incomplete).

**8. Seasons.** Each season is one gala. Starting the next season adds one to the season number, clears "gala done", rolls a new seed, adds the new classes' numbers to the programme, and shows an intro card.
- **Season 1:** the little ones, the middles and the seniors.
- **Season 2:** the car park becomes a problem, and a Parking tab appears.
- **Season 3:** the teens join with two hip-hop numbers. Floor types start to matter (hip-hop can't dance on the dance mat), and so do moods (two calm numbers in a row make the parents drowsy).
- **Season 4:** the mums join with one number.
- After that, a generic intro card.

Confidence: **fairly sure**

**9. Languages.** The EN/FR button switches `G.lang`, saves, and repaints the screens and the sign. The words come from `i18n.js`, where `t()` returns the table for the current language. Each game data row (steps, costumes, classes and so on) carries its own `fr` and `en` names, and `nm()` picks the right one. Grown-ups can rename these. French is the default. — **sure**

**10. Loading an older save.**
- A round-1 save (`gala-toy-v1`, v1) goes through `fromRound1`. This keeps the running order, formation and snack, and turns per-class costumes into per-number costumes and hairdos.
- Every save then goes through `mend()`, which:
  - fills in any field a newer version added, and treats a missing timestamp as 0;
  - adds the numbers of the current season;
  - turns old "phrase × repeats" dances into one block chained that many times;
  - swaps out costumes, shoes, accessories, steps or hairdos that are no longer defined;
  - filters names for rude words;
  - limits stars to a sane range.
- A save with any other version is ignored, and the game starts fresh.

Confidence: **sure**, except that I'm **fairly sure** about what happens to an unknown version.

**11. Pure rules versus screen.**
- **Pure (no screen):** `engine.js` (`simulate`), `plan.js`, `settings.js`, `words.js` and `data.js`. These are what the Node tests run, and the server also uses `settings.js` and `words.js`. `data.js` has no screen code, but its tables are changed in place by `applyRows()`.
- **In between:** `state.js` has no screen code but uses browser storage, and `store.js` handles the network calls.
- **Screen:** `main.js`, `ui.js`, `play.js`, `world.js`, `people.js` and `grownups.js`. `music.js` handles audio.

Confidence: **fairly sure** (I'm **guessing** that `tunes.js` is pure data).

**12. The riskiest thing about my plan.** Saves travelling between devices whose rules differ. A save only makes sense against the grown-ups' rules, which can include custom costumes and steps (`new1`–`new12`), and `mend()` quietly replaces anything it doesn't recognise. If a save opens on a device whose rules differ, the repaired copy would be uploaded, and the child's work would be lost on every device. The plan stops this by moving the rules into the family account and never uploading a save repaired against different rules. But it depends on getting that coupling exactly right. A close second is the global `G.S`, which can only be swapped by reloading the page. That makes switching players depend on the offline cache working. — **fairly sure**