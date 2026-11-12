Answering from memory, no tools.

**1. What the game is, and a typical session.**
*Le Gala de danse* is a dance-school management game for children, in French and English. The player runs the school: they set the evening's programme, choreograph each number as blocks of dance steps chained together, place the dancers in formations, choose costumes, hair, shoes and accessories, furnish the dressing room, and set up the car park and shop. A session ends by running a dress rehearsal or the gala night, which is simulated and scored, and the score goes into a notebook; the gala ends the season and the next season adds classes and numbers.
*Sure.*

**2. Main screens and tabs.**
Tabs: **order** (programme), **formation**, **gouter** (snacks), **costumes**, **build** (the dressing room), **parking** (season 2 onwards), **shop**, **notebook**. Screens within the game page: **prep**, **run**, **results**, plus the season-letter intro overlay. There is a second page, **Pages/Grownups**, reached from the gear chip in the top bar.
*Sure on the tabs; fairly sure on the screen names.*

**3. What is saved, where, when, under what key.**
One save object — `{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }` — holding the whole game state. It lives in the persisted Global Store named **`gala`**, whose `storageKey` is **`"gala-game-v2"`**, under the key **`"save"`** (so, browser local storage). It is written on **every action** (the dispatcher writes it back after each press) and once at boot when the mended save is opened.
*Sure.*

**4. Server, backend, accounts.**
Yes. NodeGX cloud services at `http://127.0.0.1:8585`, appId `backend_mvi4i1s8eudt8`. There is a `GameChange` collection (readable by anyone — `find`/`get` public — but writable by nobody directly) and three cloud functions: `saveChange` and `removeChange` (only a grown-up) and `claimGrownup` (any signed-in user). Accounts are username + password, created on the grown-ups' page; signup is public. So accounts exist, but only for grown-ups — there is no child account and no per-child progress.
*Sure.*

**5. Who can change settings, and how the app decides.**
A grown-up, on `Pages/Grownups`. The page reads `net.noodl.user.User` (`authenticated`, `roles`, `username`) and shows the editor only when the roles include `grownup`. The server re-checks independently: `saveChange`/`removeChange` call `noodl.cloud.getuserroles` and refuse anyone without the role, and `nodegx.security.json` restricts those functions to `role:grownup`. The role is claimed once: `claimGrownup` lists the users in the `grownup` role and grants it only if the list is empty, so the first account to sign up becomes the grown-up and everyone after is refused.
*Sure.*

**6. From pressing the gala button to the results.**
The button (built in `view/frame.js` `go()`) sends an event on the channel `gala-act` with `act: "go"`, `arg: "gala"`. `Game/Dispatcher`'s `dp_rx` receives it and `dp_fn` calls `game/dispatch.js` `dispatch()`, whose `go` case calls `begin(...)`, which calls the 3D stage's `beginRun('gala')` and sets the screen to `run` with a fresh `live` object. `Game/Stage 3D` → `stage/stage.js` `beginRun` → `stage/play.js` `startRun`, which runs the rules' `simulate()` to get the evening's result `R`; the frame loop then plays it (`PL.stepRun`/`stepScene`), emitting `live` updates and `say` lines that the sheet shows. When the run ends, `run.onDone` emits `done`, which the stage sends back as `act: "runDone"`; the dispatcher sets the screen to `results` and, for a gala, calls `actions.js` `finishGala()` to add the points and write the notebook entry. `view/run.js` `results()`/`verdicts()` turn `R` into the verdict cards, and `Game/Results` draws them.
*Fairly sure — I read the dispatcher, the stage, the frame and the results view, but not `play.js` itself, so the exact point where `simulate()` is called is inferred.*

**7. Earning and spending points.**
Points are **stars**. They are earned by running the gala: `finishGala` adds the evening's points to `school.stars` and `school.earned`, and the points come from the verdicts — per number, placement, music, harmony, execution and "wow", plus the parents' satisfaction. A new school starts with 30 stars. Stars are spent in the **shop**: hall and car-park upgrades (seats, comfort, snack bar, spotlights, disco ball, bigger stage, backdrops, bigger dressing room, attendant, car-share, shuttle, second row), costumes, hair, shoes, accessories, dressing-room furniture, snacks, and crêpes and compotes.
*Fairly sure.*

**8. Seasons.**
Four seasons. Season 1 is the base game. Season 2 adds the car park. Season 3 adds the teens' class and the floor and mood rules. Season 4 adds the mums' class. `seasonRules(season)` turns that into flags (`parking` from 2, `floors` and `moods` from 3, and the classes whose `from` is at or below the season), and `addSeasonNumbers` inserts the new classes' numbers into the programme. `nextSeason` bumps the season, clears `galaDone` and draws a new seed. Some shop items are also gated by season.
*Sure.*

**9. French and English.**
The save carries `lang` (`'fr'` or `'en'`), toggled by the `lang` action in the dispatcher. The words are rows `{ key, fr, en }` in Static Data nodes — the App's "Words" node for the game, and `Grownups/Words` for the grown-ups' page — and `game/text.js` `words(rows, lang)` builds a dictionary and fills templates (`{0}`, `{0:s}`, `{0:lower}`). The rows were extracted from a `reference/src/i18n.js` by `tools/extract-words.mjs` into `tools/words.json`. Game-table rows (moves, outfits, numbers…) carry their own `fr`/`en` and are read with `w.nm`.
*Sure.*

**10. An older save loaded by a newer game.**
`save.mend()` handles it: if the save is missing, or its `v` is not 2, or it has no `plan` or `school`, it starts fresh (keeping the language). Otherwise it fills in any keys a newer version added, adds the season's numbers, migrates each number from the old "moves + repeats" shape to blocks and a chain, filters the running order, and repairs hair defaults. There is also `fromRound1()` for round 1's shape. Anything unreadable starts fresh.
*Sure.*

**11. Pure rules versus screen.**
Pure, no DOM and no three.js: `gala-rules/src/{data,plan,engine,tunes}.js` (copied into `app/scripts/rules/`), and the pure functions in `game/save.js`, `game/actions.js`, `game/dispatch.js`, `view/*.js` and `settings/*.js` — they take the save, the screen state and the words, and return data. The screen parts: the components themselves (the visual nodes), and `stage/*` — three.js, the canvas, the pointer and key handling, and the Web Audio music. The view modules build view models but do not draw.
*Sure.*

**12. The riskiest thing about my plan.**
The save is the entire game state, and `mend()` silently starts fresh on anything it does not recognise — including a save whose version is *newer* than the app's. So the riskiest part is the sync: any bug, or a version skew between two devices, can destroy a child's progress with no error and no way back. That is why the plan keeps the local copy authoritative, checks the version before overwriting, and never deletes a save on a conflict. The account model (whether NodeGX can create a child account server-side) is the other big unknown, but it fails loudly; this one fails silently.
*Fairly sure.*
