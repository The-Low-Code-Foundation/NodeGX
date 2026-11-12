# OWN-023 r3 — ANSWER KEY, NodeGX version ("Le Gala de danse")

Pre-registered before reading any stranger output. Ground truth = the project files under `unz/gala/app/` (components,
`scripts/`, `nodegx.security.json`, `nodegx.project.json`) and `tools/`. Docs (`app/docs/*`, `CONVERSION.md`) were read
and checked against them; where they disagree the project wins (see §D). Paths: `C:` = `app/components/`, `S:` =
`app/scripts/`. "node `x`" = node id in that component's `nodes.json`.

## Q1 — What is the game, typical session
**Answer.** A FR/EN management game, drawn in 3D: you run a dance school's end-of-year gala. In each season the player prepares the
evening in a side sheet (running order and timings, each dance's formation and choreography, snacks, costumes,
dressing-room furniture, from season 2 the car park). They can run a free dress rehearsal or try a single dance, then
play gala night once. The evening plays out in 3D with music, then verdict cards ("Why?") and stars come back. Stars
are spent in the shop, and the player moves on to the next season. Separately, a grown-up can sign in on a ⚙︎ settings page and change the game's content.
**Cite.** `C:Pages/Game/component.json` description; `S:view/frame.js` `TAB_KEYS`, `go()`; word rows `intro_1_1`
(`C:Logic/Start Up` node `su_words`).
**Full marks (≥3 of):** dance-school gala management; prepare (programme/formation/costumes/snacks…); rehearse vs
one real gala night per season; results + stars; shop/next season.
**Watch for:** "rhythm/dancing game where you press keys to dance" (no); "multiplayer"; omitting the gala/rehearsal split.

## Q2 — Screens / tabs
**Answer.** Two pages, both listed in the App Router (`C:App` node `f7c4…`, `startPage /Pages/Game`): **Game**
(`Pages/Game`) and **Grown-ups' settings** (`Pages/Grownups`, reached via ⚙︎ in the top bar). The Game page has a full-window 3D view
(`Game/Stage 3D`) with these on top of it: the top bar (school name, season chip, stars, live clock, 🔊, FR/EN, ⚙︎), the camera bar, and a 400 px side
sheet (`Game/Sheet`) with tabs **Programme, Formation, Goûter/Snacks, Costumes, La loge/Dressing room, Parking/Car park
(season ≥2 only), Boutique/Shop, Carnet/Notebook** (`Tabs/*`). In place of the tabs, the sheet shows **Live evening**
(`Game/Live`) during a run and **Results** (`Game/Results`) afterwards. Overlays: **Season letter** modal
(`Game/Season Letter`), **Toast**, the floating **Furniture toolbar**.
**Cite.** `S:view/frame.js` `TAB_KEYS` (parking conditional on `rules(save).parking`); `C:Game/Sheet` node `sh_view`
(`show_<tab>`, `isRun`, `isResults`); `C:Game/Top Bar` node `tb_goGrown` → `/Pages/Grownups`.
**Full marks:** ≥6 of the 8 tabs + the run/results views + the grown-ups page. Bonus: parking appears only from season 2.
**Watch for:** inventing a login/profile screen for children, or a main menu. Neither exists.

## Q3 — What is saved, where, when, under what key
**Answer.** One object, the child's **save** (`{v:2, lang, season, galaDone, seenIntro, plan, school, notebook, sound,
seed}`, from `S:game/save.js` `fresh()`). It lives in the **persisted Global Store `gala`**, store key `save`, with `storageKey:
"gala-game-v2"` (`C:Logic/Start Up` node `su_gala`, `persist:true`). It sits in **browser localStorage on this device only**. The
NodeGX runtime writes it as `noodl_store_gala-game-v2`, and the value is the whole store, `{"save":{…}}`. When it is written:
(a) at start-up, after the save is repaired (`su_open` → `su_setSave`); (b) after **every press that returns a new save**
(`C:Game/Dispatcher` `dp_fn` → `dp_setSave`), which covers plan edits, purchases, lang/sound toggles, next season, reset;
(c) at the end of a gala, through `runDone` → `actions.finishGala`. The store persists on the next tick. **Not saved:** the
non-persisted `ui` store (tab, picks, the run in progress, `res`, `live`, camera) (`su_ui`, `persist:false`).
Grown-ups' changes are **not** in the save. They are backend rows (`GameChange`).
**Full marks:** localStorage on the device; key `gala-game-v2` (store `gala`/key `save`); saved on every change, not
only at gala end; the screen state and the run in progress are not saved. Bonus: the `noodl_store_` prefix and the `{save:…}` wrapper.
**Watch for:** "saved to the backend/cloud", "GameChange holds progress", "saved only after the gala", key = `gala`
alone, "uses cookies/IndexedDB".

## Q4 — Server / backend / accounts today
**Answer.** **Yes.** There is a local NodeGX backend (`nodegx.project.json` `metadata.cloudservices`: endpoint
`http://127.0.0.1:8585`, instance `backend_mvi4i1s8eudt8`, so **loopback only**). It has user accounts (username + password,
`signup:"public"`) and one collection, **`GameChange`** (`table`, `rowId`, `fields` as JSON text). Security:
find/get public, create/update/delete nobody. There are 3 cloud functions: `claimGrownup` (any authenticated user may call it),
`saveChange` and `removeChange` (`role:grownup`). The backend's **only job** is to store the grown-ups' edits to the game's tables
(step names/difficulty, prices, new steps/costumes, starting stars). The game reads them anonymously at start-up
(`C:Logic/Start Up` `su_changes`) and starts without them after a 4 s Timer (`su_wait`). **Children never sign in.** Their
saves never touch the backend.
**Full marks:** a backend exists; it holds grown-ups' content changes only; anyone can read them and anyone can sign up, but
only the grown-up role can write, and only through cloud functions; children/saves are not on it. Bonus: it is
localhost only.
**Watch for:** "no backend, purely local" (true of the *original* game, false here); "backend stores saves/scores";
"kids have accounts".

## Q5 — Who can change settings, and how is that decided
**Answer.** Only an account holding the **`grownup` role**. There is no admin list. The role is **claimed first-come**:
`claimGrownup` (`C:__cloud__/claimGrownup`) lists the users already in role `grownup` (`cl_list`, limit 10). If the list is
empty it adds the caller (`cl_decide` → `cl_add`). If the caller already has the role it answers OK. Otherwise it fails with
`alreadyClaimed`. `Pages/Grownups` **calls `claimGrownup` automatically after every successful LogIn or SignUp**
(`gp_login1.done`/`gp_signup1.done` → `gp_claimFn.call`). The page's hint says "the first account made here becomes the
grown-ups' account". The editor is shown when `User.roles` includes `grownup` (`gp_view`), but this check is cosmetic. Enforcement happens at three
levels: `nodegx.security.json` `functions.saveChange/removeChange.call = "role:grownup"`; again inside the functions
(`sv_roles` Get User Roles → `sv_check` refuses `notGrownup`); `GameChange` is closed to direct writes. All values are checked
by the shared checker (`tools/check.src.js` → `S:settings/check.js` + pasted into `sv_check`). Per CONVERSION §11
**nobody holds the role today**.
**Full marks:** grownup role; the first account to claim it wins and later accounts are refused; enforced server-side (security
rule + in-function role check), not just hidden in the UI. Bonus: auto-claim on sign-in; nobody holds it yet.
**Watch for:** "any signed-in user"; "a password/PIN on the page"; "role set by an admin in the security file";
"checked only in the page".

## Q6 — Gala button → results, step by step
**Answer.** (1) The sheet's foot buttons come from `view/frame.go()` (row id `gala`, shown only if `!save.galaDone`). They are drawn by a
For Each of `UI/GoButton` in `C:Game/Sheet`. A click sends an **Event Sender `gala-act`** with `act:"go"`, `arg:"gala"` (`sh_sendGo`).
(2) `C:Game/Dispatcher`: Event Receiver `dp_rx` triggers Function `dp_fn`, which calls `S:game/dispatch.js dispatch()`, which calls `begin()`. `begin()`
calls **`stage.beginRun('gala')`** (`S:stage/stage.js`), which calls `play.js startRun()`. `startRun()` calls **`rules/engine.simulate({plan, school, season,
mode:'gala', seed: save.seed})`**, which computes the **entire evening up front** (schedule, verdicts, points).
(3) `begin` returns `ui {screen:'run', res, live}`. The Dispatcher's Set Global Store nodes write `ui.ui/res/live`, and
the Sheet swaps to `Game/Live`. (4) The 3D frame loop plays back the schedule. `emit('live')` fires 4×/s (`Game/Stage 3D` `s3_run` →
`s3_live`, setting `ui.live`), and `say` lines become toasts. Speed and "skip to end" are available. **There is no Stop in gala mode.**
(5) When playback ends, `run.onDone` → `emit('done')` → Event Sender `gala-act` `runDone` → dispatcher → `ui.screen='results'`, and
**`actions.finishGala`** sets `galaDone=true`, `stars += points`, `earned += points`, and adds a notebook entry. Writing this to the `gala` store saves it.
(6) `Game/Results` (`rs_view`, which calls `view/run.results(res, live, save, w)`) draws the points list and verdict cards.
**Full marks:** event `gala-act` → Dispatcher/`dispatch.js`; `simulate` runs once, at the start, with the season seed;
the 3D stage plays it back and reports through events/stores; `finishGala` on `runDone` awards stars and saves; Results view.
**Watch for:** "the engine simulates live during playback"; "points awarded on press"; "a cloud function computes the
result"; missing that the save changes only at the end.

## Q7 — Earning and spending points
**Answer.** The points are **stars ⭐** (`school.stars`). A new school starts with `START.stars = 30`
(`S:rules/data.js`; grown-ups may change this from 0 to 9999). They are earned **only on gala night**, once per season.
`engine.simulate` adds up each dance's score + punctuality (onTime 10, bedtime 5, noWait 5, startOk 5) + noYawn 5 (season ≥3)
+ goûter 10 (+3×variety) + parking 10 (season ≥2) + parents' satisfaction/5 + **perfect +20**. A rehearsal
shows what the evening *would* earn and gives nothing. A try-out gives nothing. `finishGala` adds the points to `stars` and
`earned`. **Spending** goes through `actions.buy()`: costume items (outfits, hair, shoes, accessories), dressing-room furniture,
snacks, extra food (crêpes/compotes, `foodPrice` 15/20), and upgrades (seats, comfort, buvette, spotlights, mirror ball,
bigger stage, backdrops, bigger dressing room, usher, carpool, shuttle, extra parking row). You can buy in the **Shop** or at the moment you pick
an item in Costumes/Goûter/Loge/Parking. **Bought = owned forever** (`school.owned`/`upgrades`). If you can't afford it, the toast
says `notEnough`.
**Full marks:** stars; earned only on gala night from how well the evening went; spent on costumes/furniture/
snacks/upgrades; purchases are permanent. **Watch for:** "earned in rehearsals", "earned per dance step pressed".

## Q8 — Seasons
**Answer.** `SEASONS`/`seasonRules` (`S:rules/data.js`). S1 has the petits, moyens and grandes (6 dances). **S2 adds the car
park** (Parking tab, the 🅿️ camera, parking verdict and points). **S3 adds the ados** (hip-hop, A1/A2 inserted into the programme), **floors** (the dance
mat vs wooden boards, with time needed to swap) and **moods** (two calm dances in a row make the parents yawn). **S4 adds the mamans** (F1). **S5+ is a "free season"**
(`intro_free_*`) with nothing new. Moving to the next season (`save.nextSeason`, available after the gala) does `season++`, `galaDone=false`, a new
**seed** (new dice), and adds the new classes' dances (`plan.addSeasonNumbers`). The audience grows by 8 per season and car-park guests by
4×season (engine). A new season letter appears (`seenIntro < season`). Plan, stars, owned items and the notebook carry over.
**Full marks:** ≥3 of the 4 additions; new dice; stars/purchases carry over; the season letter.
**Watch for:** "seasons are calendar/time-based"; "progress resets each season".

## Q9 — French/English
**Answer.** The language is `save.lang` (`'fr'` by default, from `fresh()`), so **it is saved per device with the progress**. The FR/EN chip in the top bar
(`C:Game/Top Bar` `tb_sendLang`) sends `gala-act` `lang`, and `dispatch` flips `save.lang`. Every view Function rebuilds
its words with `Scripts.text.words(rows, save.lang)` (`S:game/text.js`: `{0}` placeholders, `{0:s}` plurals,
`{0:lower}`; a missing `en` falls back to `fr`, and a missing key shows the key itself). The words come from a **Static Data node "Words"** (373 rows
`{key, fr, en}`) in `C:Logic/Start Up` (`su_words`), shared through Variable `words`. The grown-ups' page adds its own words from
`Grownups/Words` (67 rows). The **names of game things** (steps, costumes, dances…) come from the `fr`/`en` fields of the
rows in `S:rules/data.js` (`w.nm`), which grown-ups can rename through `GameChange`. The Grownups page has no switch of its own. It uses the
save's `lang`.
**Full marks:** a toggle stored in the save; a word table of key/fr/en as data (Static Data); game items carry their own
fr/en names. **Watch for:** "i18n.js"/"browser locale detection" (the original's file; there is no locale detection
here); "separate translation JSON files loaded at runtime" (`tools/words.json` is a build artefact only).

## Q10 — Older save loaded by a newer version
**Answer.** At start-up, "Open the save" (`C:Logic/Start Up` `su_open`) calls **`game/save.js mend()`** **once per page load**
(it waits for the rules to be applied and the store to load, and is guarded by `alreadyOpen`). `mend` works like this: if `v !== 2`, or `plan`/`school` is missing,
it **silently starts fresh** (keeping only `lang`). Otherwise it deep-copies the save and fills missing top-level/plan/school keys from
`fresh()`. It adds the dances that are due for the season (`addSeasonNumbers`) and **drops dances the game no longer knows**. It **migrates an old
"moves + repeats" dance into blocks + chain** (`migrateNumber`), filters unknown ids out of `order`, and fills missing hair. The result
is written straight back to the store, so it is persisted. There is no version bump beyond `v:2`, and nothing records which repairs ran.
The round-1 importer `fromRound1` exists but is **never called** (CONVERSION lists it as lost).
**Full marks:** a `mend` step at load; fills in missing fields from defaults; migrates the old dance format; an
unreadable or wrong-version save → fresh start (data lost). **Watch for:** "a migration chain v1→v2→v3"; "imports the round-1
save"; "throws/crashes".

## Q11 — Pure rules vs screen
**Answer.** **Pure (no DOM):** `S:rules/{engine,data,plan,tunes}.js`, mechanical copies of `gala-rules/src` (made by
`tools/sync-rules.mjs` and checked by `check-rules.mjs`; `applyRows` mutates the tables in place);
`S:game/actions.js`, `game/save.js`, `game/text.js`, `view/*.js` (they build rows; `tools/check-views.mjs` runs them in Node);
`settings/check.js`. `game/dispatch.js` is pure **except** that it commands the 3D stage (`beginRun`, `stopRun`, `camCmd`,
`setSpeed`, `wake`). **Touches the screen:** `S:stage/{world,people,play,music,stage}.js` (three.js canvas, Web
Audio, pointer/keyboard listeners), mounted by `C:Game/Stage 3D` `s3_run`. Every visible element is a node (Groups,
Texts, Repeaters, States), and the component Function nodes bridge the stores to rows.
**Full marks:** rules/engine/data pure; view-row builders and actions pure; 3D/music are the screen code; the UI is nodes.
**Watch for:** calling `dispatch.js` fully pure; "engine draws the stage".

## Q12 — real top-3 risks of the sign-in feature in THIS project
1. **Identity model collision.** The only role is the *global, first-come* `grownup`, and `claimGrownup` fires
   automatically on every sign-in or sign-up on `Pages/Grownups`. If a plan reuses that flow or role for "a grown-up in the family", one of two things happens. Either
   the first child or parent to sign in becomes the **content admin for the whole backend**, or every other family's
   grown-up gets `alreadyClaimed`. A separate role or a family link is needed, plus a way for an adult to create accounts for children who have no email. Signup is currently `public`.
2. **Save reconciliation.** There is one device-wide key (`gala-game-v2`), and the save is mended once per load and only after the rules are applied. Several cases
   must not destroy progress: the first sign-in with existing local progress (whose save is it, when two children share the device?), two
   devices editing the same child (stars after a gala can be overwritten by a stale device: last-write-wins), and
   offline edits that sync later.
3. **Backend reach and closure.** The endpoint is `127.0.0.1:8585` (no other device can reach it). A new collection is
   closed by default (`defaults` all `nobody`), so rules must be set on purpose, with owner-only access through `creatorOwns`. The
   converter's lesson was that rules were not enforced in dev-open mode until they were installed. Children's personal data adds a privacy/consent duty.

---
## FEATURE — what a sound plan must get right in THIS project

### TOUCH POINTS
- **MUST** `C:Logic/Start Up` `su_gala` (Global Store `gala`, `persist`, `storageKey:"gala-game-v2"`, key `save`). This is
  the single per-device slot, so per-child local slots (or a profile map) are needed, and the existing anonymous slot must be kept for
  players who never sign in.
- **MUST** `su_open` "Open the save" plus `S:game/save.js mend()`. Every save loaded from the server must go through `mend`.
  `su_open` runs only once per load (`alreadyOpen` from Variable `ready`, `runOnChange` off), so a sign-in *after* boot
  needs its own mend → `Set Global Store gala.save` path. A fresh save for a new child must be created **after**
  `applyOnce`, because `fresh()` reads `START.stars` at call time.
- **MUST** the boot order in `Logic/Start Up`: words → `gala.ready` → GameChange query (or the 4 s Timer) → `su_apply` →
  `su_open` → `su_setSave` → `ready=true`, which mounts `Pages/Game` (`gm_root.mounted`). Cloud loading must fit into this chain
  without blocking offline play (the existing Timer is the model to follow).
- **MUST** `C:Game/Dispatcher` `dp_setSave` / `S:game/dispatch.js`. This is the single write point of the save, so the place to
  hook (or debounce) cloud sync. `runDone` → `finishGala` is the write that matters most. The run itself is never saved.
- **MUST** `nodegx.security.json`: a new progress collection (find/get/create/update scoped to the owner, `creatorOwns`),
  `functions` entries for any new cloud functions (`role:`/`authenticated`), and a decision on `signup:"public"` (an adult
  creates the child accounts). Keep `devOpen:false`, and install the rules into the backend.
- **MUST** the family grown-up **≠** `grownup`. Do not reuse `claimGrownup` or the LogIn/SignUp nodes in `Pages/Grownups`, which auto-claim.
  The `grownup` role also gates the *global* `GameChange` edits.
- **MUST** `nodegx.project.json` `cloudservices.endpoint` is `127.0.0.1:8585`. Another device needs a backend it can actually reach.
- **MUST** the save format: `v:2` with no revision or timestamp. Cloud sync needs `updatedAt`/rev for conflict handling, and
  probably a `v` bump, which `mend` must learn (it currently wipes any `v !== 2`).
- **SHOULD** `note:resetYes` (`dispatch.js` → `S.fresh`) and `go:nextSeason`: decide what reset does to the cloud copy.
- **SHOULD** a profile picker / sign-in UI (a new page or a top-bar chip, `C:Game/Top Bar`). Add it to the Router (`C:App`).
  The User session is shared by the whole app, so a child signed in on the Game page will show as "not the grown-up" on ⚙︎.
- **SHOULD** `Game/Stage 3D` `stage.sync()` already reacts to a swapped save, but switching child during a run must `stopRun`.
- **SHOULD** check child usernames with `S:settings/check.js cleanName`/`rude` (as the school name already is in `actions.build('name')`).

### EXISTING MECHANISMS (reuse / beware)
- Users, LogIn/SignUp/LogOut/User nodes, and Cloud Function nodes all exist and work. Reuse the *nodes*, not the `Pages/Grownups` wiring.
- `grownup` is decided by **"first account to call `claimGrownup`"** (listusersinrole empty → add). It is not tied to age, family or email.
  Naive reuse is wrong.
- `GameChange` is global, public-read content for every player on the backend. It is **not** a model for private per-child
  rows (it has public find/get).
- Cloud functions here follow a Request → Get User Roles → Query → Function → Create/Update Record → Response pattern
  (`saveChange`), which is a good template for `saveProgress`/`loadProgress`. The function cannot `use()` scripts, so code is pasted
  (`tools/check.cloud.js` + `cloud-save.glue.js`).
- Security defaults: every unlisted collection is `nobody` for all operations, with `creatorOwns:true`. Rule atoms are `public |
  authenticated | nobody | role:<name>`.
- The `ui` store is not persisted. Only `gala.save` is progress.

### TRAPS
- `tools/cloud-save.glue.js` is the tail of the **saveChange** function (grown-up edits). It is **not** a cloud save of progress.
- The `grownup` role is unclaimed today, so the first account that signs in via ⚙︎ gets it. That could be a child's.
- The backend is localhost. A plan stating "the backend already syncs across devices" has misread the project.
- Changes that arrive after the 4 s Timer are ignored until reload (`applyOnce` caches at module level).
- `mend` replaces any unrecognised save with a fresh one, and its result is written straight away. A careless cloud merge
  that sends a malformed object will wipe progress.
- Two children on one device share **one** localStorage key and **one** signed-in session.
- The docs' "Save" record (ARCHITECTURE/000) is *not* a backend collection. It is localStorage.

### SECRETS (micro-understanding probes)
1. The real localStorage key is `noodl_store_gala-game-v2`, and the value is `{"save":{…}}` (runtime prefix; the store name is `gala`).
2. `Pages/Grownups` calls `claimGrownup` on LogIn.done **and** SignUp.done (`gp_login1`/`gp_signup1` → `gp_claimFn`).
3. `claimGrownup` is open to any `authenticated` caller and grants the role iff `listusersinrole('grownup')` is empty.
4. "Open the game with the changes" is an **External Link to `/`** (full reload, `gp_reload`), because `applyOnce` runs once per load.
5. The gala result is fully decided at `beginRun` by `simulate` with the season's `seed`. A rehearsal never rolls dice,
   and a try-out uses a fresh random seed every time.
6. Stars are committed only at `runDone`. Closing mid-gala loses nothing saved, and the same gala can be replayed (`galaDone` still false).
7. The checker exists 3 times: `tools/check.src.js` → `S:settings/check.js` and pasted into `saveChange` `sv_check`. The browser
   re-checks every `GameChange` row before `applyRows` (`S:settings/apply.js`).
8. `GameChange.fields` is JSON **text**, with one row per (table,rowId). A new change merges into the old one before it is checked.
9. `fromRound1` is dead code. `mend` resets anything with `v !== 2`.
10. The language lives in the save, so it is per device and would be per child once saves are per child. The Grownups page borrows it.

## §D — Docs vs project (project wins)
- ARCHITECTURE/000 name the page `Pages/Grown-ups`. The real component is `Pages/Grownups` (urlPath `grownups`).
- CONVERSION says 389 word rows / 66 grown-up rows. The Static Data holds **373** / **67**.
- CONVERSION's "Delay of 4 s" is a `Timer` node (`su_wait`, 4000 ms) started on `gala.ready`.
- ARCHITECTURE's "Save" fields leave out `v`, `galaDone`, `seenIntro`. It is not a backend record.
- `app/CLAUDE.md` names an MCP server `nodegx-app` / `.mcp.json`. The file is git-ignored and absent from the bundle.
