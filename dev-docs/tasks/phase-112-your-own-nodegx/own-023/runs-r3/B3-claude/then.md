**1. What the game is.** "Le Gala de danse" is a game in French and English where you run a children's dance school and get it ready for its end-of-year show. In a typical session the player works through the preparation tabs: running order, choreography and dancers' positions, snacks, costumes, dressing room, and later the car park. They may try out one dance or hold a dress rehearsal. Then they play the gala night in a 3D view of the school, read the verdicts, earn stars, and move on to the next season.
*Sure.*

**2. Main screens and tabs.**
- **Game page:** the 3D school fills the window. Over it sit:
  - the top bar: school name, season, stars, clock, music, FR/EN and ⚙︎
  - the camera bar
  - the furniture toolbar
  - toast messages
  - the season letter
- **Side sheet tabs:**
  - Programme
  - Formation
  - Goûter (snacks)
  - Costumes
  - La loge (dressing room)
  - Parking, from season 2
  - Boutique (shop)
  - Carnet (notebook)
- **The sheet also shows:** the live evening and the results/verdicts.
- **Separate page:** the grown-ups' settings page.

*Sure.*

**3. What is saved, where and when.**
- **What:** a single save object: version, language, season, whether the gala is done, the intro seen, the plan, the school (stars, earned, owned, upgrades, furniture), the notebook, sound and a random seed.
- **Where:** in the Global Store `gala`, under the key `save`. It is persisted to the browser's localStorage under the key `gala-game-v2`.
- **When:** once at start-up, after it has been opened and repaired. After that, every time a press changes it through the Dispatcher.
- **Not saved:** the screen state (`ui`). An evening in progress only reaches the save when it finishes (`runDone`).
- I don't know whether the store writes to localStorage immediately or with a delay.

*Sure, except the timing of the localStorage write: don't know.*

**4. Server, backend and accounts today.** Yes, but only for the settings.
- **Backend:** a NodeGX backend configured at `http://127.0.0.1:8585`, so local to this computer, not online.
- **Collection:** one collection, `GameChange`: grown-ups' changes to the game's tables. Anyone can read it, but nobody can write it directly.
- **Cloud functions:**
  - `saveChange` and `removeChange` require the `grownup` role.
  - `claimGrownup` requires being signed in.
- **Accounts:** sign-up is public, with a username and password on the grown-ups page. Players don't use accounts at all.
- **Start-up:** the game reads every `GameChange` row and lays them over the tables for everyone. It waits at most 4 seconds, so it still opens offline.

*Sure.*

**5. Who can change the settings.** Only an account with the `grownup` role.
- **How the role is given:** after every log-in or sign-up, the page calls `claimGrownup`. This grants the role only if nobody has it yet, so the first account wins and everyone after is refused.
- **What the page does:** it shows the editor only if the user's roles include `grownup`.
- **What the server checks:** `saveChange` and `removeChange` check the role again. They also run the same checker as the browser: known tables and fields, number ranges, and short, clean names with a filter for rude words.
- **When changes apply:** at the next full load of the game.

*Sure.*

**6. From the gala-night button to the results.**
1. The gala button at the foot of the side sheet sends the event `gala-act` with act `go` and arg `gala`.
2. `/Game/Dispatcher`'s Function passes it to `dispatch.js`. That calls `begin()`, which does nothing if this season's gala is already done.
3. `begin()` calls `stage.beginRun('gala')` on the 3D stage. That returns the evening's result `res`, and the dispatcher sets the screen to `run` with `res` and `live` in the `ui` store.
4. The stage animates the evening. It reports progress into `ui.live`, which `/Game/Live` and the top bar's clock show.
5. At the end, the stage emits `done`. That goes back out as a `gala-act` with act `runDone`.
6. The dispatcher sets the screen to `results` and calls `finishGala()`. This adds the points to stars and earned, adds a notebook entry, and sets `galaDone`.
7. `/Game/Results` shows the stars and the verdict cards, each with its "Why?".

*Fairly sure.* The steps through the dispatcher I read. That `beginRun` simulates the whole evening up front with the rules engine is my inference: I didn't read `stage.js`.

**7. Earning and spending points.** The points are stars.
- **Earning:** only the gala night earns them (`R.points`). A rehearsal shows what it would have earned. The points come from each dance's score and the parents' satisfaction, but I don't know the exact formula.
- **Spending:** in the shop, and in places in the tabs:
  - outfits, hairdos, shoes and accessories
  - dressing-room furniture
  - snacks and food
  - upgrades: seats, comfort, a refreshment stand, spotlights, a disco ball, the stage, the forest/sea/city backdrops, a bigger dressing room, and the car-park helpers (attendant, car-sharing, shuttle, extra row)
- **Rules:** things are bought once and kept for good. A grown-up can set the starting stars.

*Fairly sure* about what is sold. *Don't know* how the points are scored.

**8. Seasons.** Each season ends in one gala night. After it, "Next season" calls `nextSeason()`: the season number goes up, `galaDone` resets, there is a new random seed, and the new classes' dances are added with `addSeasonNumbers`. A season letter explains what's new. The car park arrives in season 2. Which dances (P1… F1) join in which season, I don't know.
*Fairly sure*, apart from which dances arrive when: don't know.

**9. French and English.**
- **The switch:** `save.lang` holds the language. The FR/EN chip sends act `lang`, and the dispatcher flips it.
- **Where the words live:** in the Static Data node "Words" in `/Logic/Start Up`, shared as the Variable `words`. `Scripts.text.words(rows, lang)` turns them into a function that fills in `{0}`, `{0:s}` for plurals and `{0:lower}`.
- **Where they came from:** they were extracted from the missing `reference/src/i18n.js` by `tools/extract-words.mjs`. There is a copy in `tools/words.json`.
- **Other words:** the game's tables carry `fr` and `en` names, and the grown-ups' page has its own words table.

*Sure.*

**10. Loading an older save.** `mend()` in `save.js` handles it.
- If the save isn't version 2, or has no plan or school, it is replaced by a fresh one (keeping the language).
- Otherwise, anything missing is filled in from a fresh save. Season dances are added, old dances are migrated to the blocks format, unknown dances and order entries are removed, and missing hairdos get their defaults.
- `fromRound1()` exists for an even older format, but I didn't see anything call it. So a round-1 save probably just starts fresh, and since the storage key is `gala-game-v2`, an older key would probably never be read at all.

*Fairly sure* about `mend()`. *Guessing* about `fromRound1` never being used.

**11. Pure rules vs. what touches the screen.**
- **Pure:**
  - `gala-rules` and its copy in `scripts/rules`: engine, data, plan, tunes
  - `game/actions.js`, `game/save.js` and `game/text.js`
  - `settings/check.js` and `settings/apply.js` (apply lays changes over the tables in memory)
  - the `view/*` scripts, which return data rather than drawing
  - `dispatch.js` is nearly pure, but it calls the 3D stage's methods directly.
- **Touches the screen:** the `stage/*` scripts (three.js canvas, music) and the Function "3D stage" that mounts them, plus all the graph's visual components.

*Fairly sure.* I'm least sure that `apply.js` is pure.

**12. The single riskiest thing about my plan.** `mend()` silently turns any save it doesn't recognise into a brand-new school. Once saves sync, one device with an old app, or a slip in the merge or in the player switch, could open a child's real school as a fresh one. That device would then upload it as the "latest" save and wipe their progress on every device. My plan's guards are the version check on the server, never pushing a save that `mend()` replaced with a fresh one, and backing up any save that goes backwards. They have to be built and tested first, before any push to the server exists.
A close second: I assumed the persisted store will keep the extra entries (`players`, `guest` and so on) next to `save`, and I haven't checked that.
*Fairly sure.*