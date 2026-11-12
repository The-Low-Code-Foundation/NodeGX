**1. What the game is.** *Le Gala de danse* ("Star Dance School") is a bilingual French/English game. The player runs a children's dance school and prepares its end-of-year gala. In a typical session they arrange the evening's running order, build each dance's formation and choreography from blocks of steps, and choose snacks, costumes and hair. They also furnish the dressing room in 3D and spend stars in the shop. They try dances or hold a dress rehearsal, then play gala night: the evening is simulated and shown in 3D with music, and it earns stars. — **Sure**

**2. Main screens and tabs.**
- **Preparation tabs** in the side sheet: Programme (order), Formation, Goûter (snacks), Costumes, La loge (dressing room), Parking (only from season 2), Boutique (shop) and Carnet (notebook).
- **Screen modes** of the sheet: preparation (`prep`), the live evening (`run`) and the results (`results`).
- **Around them:**
  - the 3D stage behind everything;
  - the top bar and the camera bar;
  - a floating furniture toolbar and a toast;
  - the Season Letter, which covers the window at the start of a season.
- **A separate page:** the grown-ups' settings (`/Pages/Grownups`).

— **Sure** for the tabs and pages, **fairly sure** for the screen-mode names.

**3. What is saved, where and when.**
- **What:** one save object, `{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }`.
- **Where:** in the Global Store `gala`, under the key `save`. The store is persisted to the browser's localStorage with storage key `gala-game-v2`.
- **When:** at startup, once the save has been opened and repaired (`su_setSave`), and after every press that changes it (`dp_setSave` in the Dispatcher).
- **Not saved:** the screen state, the live evening and the result.
- **I don't know** whether the store writes to localStorage immediately on every change or batches the writes.

— **Sure** apart from that last point.

**4. Server, backend and accounts today.** Yes. The app uses the built-in NodeGX backend, configured at `127.0.0.1:8585`, so it only works on this computer.
- **Data:** it holds a `GameChange` collection, the grown-ups' changes to the game tables. Anyone can read it; nobody can write to it directly from the page.
- **Functions:** there are three cloud functions: `saveChange`, `removeChange` and `claimGrownup`.
- **Accounts:** the grown-ups' page has username and password accounts, and sign-up is open to anyone.
- **Use by the game:** at startup the game fetches `GameChange` and gives up after 4 seconds. Players never sign in to play.

— **Sure**

**5. Who can change settings, and how that's decided.** Only an account with the `grownup` role.
- **Getting the role:** after a sign-in or sign-up on the grown-ups' page, the page calls `claimGrownup`. That function gives the role to the caller only if nobody has it yet, so the first account wins and every later account is refused.
- **Enforcement on the server:** `nodegx.security.json` lets only `role:grownup` call `saveChange` and `removeChange`. Both functions also check the caller's roles again inside.
- **Checking the change itself:** `saveChange` runs the shared checker, which covers known tables and fields, number ranges and the kind-names filter.
- **Showing the editor:** the page shows the editor only if the signed-in user's roles include `grownup`.
- **Timing:** changes apply the next time the game opens.

— **Sure**

**6. From the gala button to the results.**
1. The button sends an event on channel `gala-act` with `act: "go"` and `arg: "gala"`.
2. `Game/Dispatcher` receives it, and its Function `dp_fn` calls `dispatch()` in `scripts/game/dispatch.js`.
3. `dispatch()` calls `begin()`. If this season's gala is already done, nothing happens. Otherwise `begin()` calls `stage.beginRun('gala')` on the 3D stage.
4. In `stage/play.js`, the run calls `simulate()` from `rules/engine` with the plan, the school, the season and the season's `save.seed`. It returns the whole evening's result (`res`).
5. The Dispatcher writes `screen: 'run'`, `res` and `live` into the `ui` store.
6. The 3D stage plays the evening and keeps reporting progress into `ui.live`. The Live view shows the clock and a feed of what happens; speed, skip and stop are also available.
7. At the end, the stage sends `runDone` on the same channel.
8. `dispatch()` switches to the `results` screen. For a gala that wasn't already done, it calls `finishGala()`, which sets `galaDone`, adds the stars and writes a notebook line. The new save is written through `dp_setSave`.
9. `Game/Results` shows the stars and the verdict cards.

— **Fairly sure** on the overall order, **sure** on the named pieces.

**7. Earning and spending points.**
- **Earning:** points are stars, earned only on gala night. The amount is `R.points` from the simulation. The results break it down into verdicts on the programme, each dance, the snacks, the car park and the parents' satisfaction. A rehearsal shows what it *would* have earned.
- **Spending:** stars buy:
  - outfits, hairstyles, shoes and accessories;
  - dressing-room furniture;
  - snacks and food;
  - upgrades: seats, comfort, a refreshment stand, spotlights, a disco ball, the stage, backdrops (forest, sea, city), a bigger dressing room, and car-park upgrades such as an attendant, car-sharing, a shuttle and an extra row.

  Purchases are kept for good, and a new school starts with 30 stars.
- **Don't know:** the exact scoring formula.

— **Sure** on what can be bought, **fairly sure** on where the points come from.

**8. Seasons.**
- **What changes:** each season has one gala. "Next season" moves the season number up, clears `galaDone` and picks a new seed. It also adds that season's new classes and dances (`addSeasonNumbers`), and the rules vary by season (`seasonRules`).
- **The parking tab** appears from season 2.
- **The Season Letter** explains what's new each season.
- **Don't know:** how many seasons there are in total, or the details of each one.

— **Fairly sure**

**9. French and English.**
- **Switching:** the language chip in the top bar sends the `lang` act, which flips `save.lang` between `fr` and `en`. The language is therefore part of the save.
- **The game's words:** they are rows `{ key, fr, en }` in the Static Data node in `Logic/Start Up`, filled in by `words()` in `scripts/game/text.js`.
- **The grown-ups' words:** they live in `Grownups/Words`.
- **Names in the game tables:** steps, costumes and so on carry their own `fr` and `en` names, and grown-ups can override them.

— **Sure**

**10. Loading an older save.** At startup, `su_open` calls `mend()`:
- If the save isn't version 2, or has no plan or school, the game starts fresh and keeps only the language.
- Otherwise it fills in any field a newer version added and adds the dances for the current season. It also migrates each dance's choreography to the current format, resetting a dance to its default if neither the old nor the new form is present. Finally it drops unknown dances and running-order entries and repairs missing hairstyles.

A function `fromRound1()` exists for migrating an even older format, but **I don't know** whether anything calls it. Startup only calls `mend()`.

— **Fairly sure**

**11. Rules versus what touches the screen.**
- **Pure, never touching the screen:**
  - `scripts/rules/*` (data, engine, plan, tunes), which are copies of `gala-rules`;
  - `game/save.js`, `game/actions.js`, `game/dispatch.js` and `game/text.js`;
  - `settings/check.js`.

  Two caveats:
  - `dispatch.js` also gives commands directly to the 3D stage;
  - `settings/apply.js` modifies the rule tables in place.
- **Screen-facing data, not drawing:** `scripts/view/*` turns the save into what each part of the screen shows, but doesn't draw anything itself.
- **Touching the screen:**
  - `scripts/stage/*`: the three.js 3D view, the canvas and the music;
  - all the NodeGX components (pages, tabs, UI pieces).

— **Fairly sure**

**12. The single riskiest thing in my plan.** Changing the shape of the persisted `gala` store and adding the per-child slot switching. Every player's existing school lives in that one localStorage entry, and about 20 components read `gala`/`save`. A mistake there, at startup migration, sign-in or sign-out, could do one of two things:
- overwrite a player's only copy of their school;
- put one child's school into another child's account on a shared tablet.

My "nothing lost offline" promise also rests on how the persisted store writes to localStorage, which I haven't verified. — **Fairly sure**