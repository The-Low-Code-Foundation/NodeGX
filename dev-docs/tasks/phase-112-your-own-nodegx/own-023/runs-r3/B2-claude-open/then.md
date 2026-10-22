Answered from what I read earlier; I didn't open or run anything.

**1. What the game is**
"Le Gala de danse" is a French/English management game where the player runs a dance school and prepares its end-of-year gala. In a typical session they arrange the running order, choreograph each dance from blocks of steps, and pick snacks, costumes, hair, dressing-room furniture and (later) the car park. They try single dances or a dress rehearsal, watched in a 3D school. Then they play gala night once per season, earn stars and spend them in the shop.
*Sure.*

**2. Main screens and tabs**
- **Game page.** The 3D school fills the window. Over it sit:
  - a top bar: school name, season, stars, the evening's clock, sound, FR/EN, and ⚙︎ for grown-ups;
  - a camera bar, a furniture toolbar, toasts, and the season's letter;
  - a side sheet with tabs: Programme, Formation, Goûter, Costumes, La loge, Parking (only from the season that brings it), Boutique and Carnet (notebook).
- **During and after an evening.** The sheet shows the live evening, then the results (verdicts).
- **Grown-ups' settings page.** Sign-in, then table editors and forms for a new step and a new costume.

*Sure* for the list. *Fairly sure* about exactly when Parking appears; I believe it's season 2.

**3. What is saved, where and when**
- **What:** one JSON object holding the version (`v: 2`), language, season, `galaDone`, `seenIntro`, sound, dice seed, the plan, the school and the notebook.
- **Where:** in the persisted Global Store `gala`, under the key `save`, with storage key `gala-game-v2`.
- **When:** it's written once at start-up after being repaired, then rewritten whole by the Dispatcher's `dp_setSave` on every press that changes it.
- **Not saved:** the screen state, the live evening and the results. They live in the non-persisted `ui` store.

*Sure* about all of that. That `persist` means the browser's `localStorage` is *guessing*.

**4. Server, backend and accounts today**
- There is a backend: NodeGX's built-in one at `http://127.0.0.1:8585`, so only on that computer.
- It holds the `GameChange` collection: the grown-ups' changes to the game's tables. Anyone can read it; nobody can write it directly.
- It has three cloud functions: `saveChange`, `removeChange` and `claimGrownup`.
- Anyone can sign up for an account, but accounts are only used on the grown-ups' page. Players never sign in, and saves never go to the server.

*Sure.*

**5. Who can change the settings, and how that's decided**
- **Who:** only an account in the `grownup` role. `claimGrownup` grants that role only if nobody holds it yet, so the first account to sign in on the grown-ups' page becomes the grown-up for good.
- **How it's enforced:**
  - `nodegx.security.json` lets only that role call `saveChange` and `removeChange`.
  - Each function also re-reads the caller's roles itself.
  - `saveChange` runs `checkChange`: known tables and fields only, numbers within ranges, and names that are short, plain and not rude.
  - The browser runs the same check before sending, and again when it lays saved changes over the game.

*Sure.*

**6. From the gala button to the results**
1. The gala button in the sheet sends an event on the `gala-act` channel (act `go`, arg `gala`).
2. `Game/Dispatcher` calls `dispatch()`, which calls `begin()`. `begin()` refuses if this season's gala is already done. Otherwise it calls the 3D stage's `beginRun('gala')`, which returns the evening's result `res`.
3. The screen state switches to `run`, with `live` set.
4. `Stage 3D` plays the evening and keeps writing `ui.live`.
5. At the end the stage sends `runDone`. The dispatcher switches to the `results` screen and calls `finishGala()`. That adds the points to stars and to stars earned, sets `galaDone`, and adds a notebook entry, which `dp_setSave` writes to the save.
6. `Game/Results` shows the verdicts.

*Fairly sure* about the sequence. That `beginRun` works out the whole result up front with the engine's `simulate` is *guessing*.

**7. Earning and spending points**
- **Earning:** points come from gala night (the result's `points`). A new school starts with 30 stars, and grown-ups can change that number. How the points are actually calculated (dance scores, how satisfied the parents are) I *don't know* in detail.
- **Spending:** stars buy, in the shop or the car park:
  - costumes, hairstyles, shoes and accessories;
  - furniture for the dressing room;
  - snacks and food;
  - upgrades: seats, comfort, a refreshment stand, spotlights, a disco ball, the stage, backdrops (forest, sea, city), a bigger dressing room, an usher, car-sharing, a shuttle, and a parking row.

*Sure* about what can be bought. *Fairly sure* that points come only from galas.

**8. Seasons**
"Next season" adds one to the season, clears `galaDone`, picks new dice and adds the new classes' dances to the programme. The teenagers (A1, A2) and then the mums (F1) arrive, placed before the interval and the finale. Each season opens with a letter, and from season 2 there is the car park.
*Fairly sure*. Exactly which season each class arrives in is *guessing*.

**9. French and English**
- **Switching:** the FR/EN chip in the top bar sends `lang`, and the dispatcher flips `save.lang`. The language is part of the save.
- **Where the words come from:**
  - a Static Data node in Start Up holds rows of `{key, fr, en}`, shared as the Variable `words`;
  - `game/text.js` fills in their `{0}` placeholders;
  - the game's tables carry their own `fr`/`en` names;
  - the grown-ups' page has its own words component.
- The rows were extracted from a `reference/src/i18n.js` that is no longer in the folder.

*Sure.*

**10. Loading an older save**
- `mend()` throws away anything that isn't `v: 2` or lacks a plan or school, and starts fresh, keeping only the language.
- Otherwise it:
  - fills in any fields a newer version added;
  - adds this season's new dances;
  - drops dances it doesn't know;
  - converts old moves-plus-repeats dances into blocks;
  - cleans up the running order and fills in missing hair.
- A converter for "round 1" saves, `fromRound1()`, exists but is never called. So a round-1 save would simply start over.

*Sure.*

**11. Pure rules versus screen**
- **Pure, never touching the screen:**
  - `scripts/rules/*` (data, plan, engine, tunes, copied from the tested `gala-rules` package);
  - `game/save.js`, `game/actions.js` and `game/text.js`;
  - `view/*` (they compute what to show but don't draw it);
  - `settings/check.js`.
- **Mostly pure:** `game/dispatch.js`, except that it calls the 3D stage directly.
- **Touching the screen or the world:**
  - the component graphs;
  - `scripts/stage/*` (three.js and music);
  - `settings/apply.js`, which changes the shared rule tables in place.

*Sure.*

**12. The single riskiest thing about my plan**
The grown-ups' settings are laid over the rule tables once per visit, in place, by `applyOnce`, before the save opens, and they can't be undone. My plan makes those settings per family and loads them for whichever child is signed in. But a child usually signs in after start-up has already applied them, or switches to a sibling, or to a child from another family on a school laptop. The tables in memory would then be the wrong family's. A save that uses one family's custom step could then open on the wrong tables.

My plan mentions the settings cache but doesn't deal with this properly. The likely fix is to reload the page after any sign-in or switch that changes family, and that has to be designed in.

A close second is that how a child's server session gets created is still unconfirmed.

*Fairly sure* this is the main risk.