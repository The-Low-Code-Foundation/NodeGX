# Plan: children sign in and keep their progress

This is a plan only. Nothing here is built yet, and no file other than this one has been changed.

The feature: a child signs in and finds their game on another device; a grown-up sets the child up; two
children of one family share a device with separate progress; the game still works for someone who never
signs in; a child with progress already on the device keeps it when they first sign in; and a dropped
connection loses nothing.

---

## 1. How the game works today

### What it is

**Le Gala de danse** — a dance-school game, French and English, for children. The player runs the school:
they set the evening's programme (the order of the numbers), choreograph each number as blocks of dance
steps chained together, place the dancers in formations, choose costumes, hair, shoes and accessories,
furnish the dressing room, set up the car park and the shop, then run a dress rehearsal or the gala night.
The evening is simulated and scored, and the score is written into a notebook. A season ends with the gala;
the next season adds classes and numbers.

### How it is put together

It is a **NodeGX app**: a folder of JSON, no database of its own, no hand-written web server. The app lives
in `app/`; the pure game rules live in `gala-rules/`; the build/check scripts live in `tools/`.

| where | what it holds |
|---|---|
| `app/nodegx.project.json` | the project: name, id `ba2096a9-…`, format version 5, design tokens, and `metadata.cloudservices` — the backend endpoint `http://127.0.0.1:8585`, appId `backend_mvi4i1s8eudt8` |
| `app/nodegx.security.json` | who may read and write what on the backend (collections, functions, roles, signup) |
| `app/components/` | the app's components: `App`, `Pages/*`, `Logic/Start Up`, `Game/*`, `Tabs/*`, `UI/*`, `Grownups/*`, `__cloud__/*` |
| `app/scripts/` | the JavaScript the components call: `rules/`, `game/`, `view/`, `settings/`, `stage/` |
| `gala-rules/` | the pure rules package (ES modules) and its tests |
| `tools/` | the scripts that generate the app's copies of the rules, the checker and the 3D stage, plus the words data |

The components are graphs of nodes. A **visual** node draws; a **logic** node acts on a value or a signal;
a **wire** carries a value or signal between ports. The three files per component are `component.json`,
`nodes.json` and `connections.json`.

**Pages and routing.** `App` holds one `Router` node (`f7c4077d-…`) whose `pages` are
`{ startPage: "/Pages/Game", routes: ["/Pages/Game", "/Pages/Grownups"] }`. So the app opens straight into
the game; the grown-ups' settings are a second page. There is no separate routes file.

**The scripts.** `app/scripts/rules/{data,plan,engine,tunes}.js` are generated from `gala-rules/src/` by
`tools/sync-rules.mjs` (ES modules → NodeGX's `use()`/`exports` form). `app/scripts/settings/check.js` is
generated from `tools/check.src.js` by `tools/sync-check.mjs`, and the same body is pasted into the
`saveChange` cloud function. `app/scripts/stage/{stage,world,people,play,music}.js` are generated from a
`reference/src/` by `tools/sync-stage.mjs` — **that `reference/` folder is not in this folder any more**, so
the stage scripts are generated from a source that is gone.

### The state: two Global Stores

`Logic/Start Up` creates the two stores the whole app reads and writes:

- **`gala`** — `net.noodl.GlobalStore`, `persist: true`, `storageKey: "gala-game-v2"`. It holds the save
  under the key `save`. This is the only thing that survives a reload.
- **`ui`** — `net.noodl.GlobalStore`, `persist: false`. It holds `ui` (the screen state), `res` (the last
  evening's result), `live` (the evening as it plays), `cam`, `float`, `toast`. Its starting shape is the
  `initialState` parameter of the `su_ui` node and `UI0` in `app/scripts/game/dispatch.js`.

### The save

`app/scripts/game/save.js` owns the save's shape and its repairs:

- `fresh(lang)` → `{ v: 2, lang, season: 1, galaDone: false, seenIntro: 0, plan, school, notebook: [], sound: true, seed }`
- `mend(input)` — fills in anything a newer version added; anything unreadable starts fresh
- `nextSeason(save)` — the next season: new classes join, the dice change
- `fromRound1(o)` — an older save's shape

`plan` comes from `app/scripts/rules/plan.js` (`defaultPlan`, `defaultSchool`, `addSeasonNumbers`,
`numberPlan`, `migrateNumber`). `school` holds `stars`, `earned`, `owned`, `upgrades`, `furniture`, `name`,
`logeCols`. `plan` holds `order`, `numbers` (each with `A`/`B` formations, `blocks`, `chain`, `costume`),
`hair`, `snack`, `cakeG`, `bottles`, `parking`, `backdrop`. `notebook` is one entry per gala.

### The loop

Every button in the game sends an event on the channel **`gala-act`** with an `act` (e.g. `"order:up"`,
`"tab"`, `"go"`) and an `arg`. `Game/Dispatcher`'s `dp_rx` receives it; `dp_fn` calls
`app/scripts/game/dispatch.js` `dispatch(act, arg, save, ui, w, stage)`, which returns
`{ save, ui, toast }`; the graph writes them back with `dp_setSave` (→ `gala.save`), `dp_setUi`, `dp_setRes`,
`dp_setLive`, `dp_setToast`. **So the save is rewritten on every single action.** The 3D stage is told
directly through `Game/Stage 3D`'s `s3_run`/`s3_sync`; it is the one thing that is not state.

### Boot

`Logic/Start Up` runs the boot:

- `su_gala.ready` fires when the persisted store has loaded.
- `su_changes` (`DbCollection2`, collection `GameChange`) fetches the grown-ups' saved changes; `su_wait`
  (a 4-second `Timer`) is the fallback. Either feeds `su_apply.run`.
- `su_apply` calls `app/scripts/settings/apply.js` `applyOnce(rows)`, which re-checks each row with
  `settings/check.js` and lays it over the game's tables with `rules/data.js` `applyRows`.
- `su_apply.out-ready` → `su_open.in-rulesReady`; `su_storeReady.state` → `su_open.in-storeReady`;
  `su_gala.state` → `su_open.in-stored`. When all three are in, `su_open` calls `save.mend(stored.save)`,
  `su_setSave` writes it back to `gala.save`, and `su_setReady` sets the `ready` variable.
- `Pages/Game`'s `gm_ready.value` → `gm_root.mounted`, so the game only draws once `ready` is set.

Note the boot already waits up to 4 seconds for the backend before opening the save. Offline, it proceeds
after the timeout.

### The backend today

NodeGX cloud services at `http://127.0.0.1:8585`, appId `backend_mvi4i1s8eudt8`. `app/nodegx.security.json`:

- collection **`GameChange`**: `find`/`get` **public**, `create`/`update`/`delete` **nobody**.
- functions: **`saveChange`** and **`removeChange`** callable by `role:grownup`; **`claimGrownup`** by
  `authenticated`.
- `signup: public`; `creatorOwns: true`.

The three cloud functions are components under `app/components/__cloud__/`:

- **`saveChange`** — `sv_req` (`noodl.cloud.request`, params `table,rowId,fields`) → `sv_roles`
  (`noodl.cloud.getuserroles`) → `sv_query` (`DbCollection2` on `GameChange`) → `sv_check`
  (`JavaScriptFunction`, the pasted checker) → `sv_create`/`sv_update` (`NewDbModelProperties` /
  `SetDbModelProperties`) → `sv_ok`/`sv_fail` (`noodl.cloud.response`).
- **`removeChange`** — same shape, ends in `DeleteDbModelProperties`.
- **`claimGrownup`** — `cl_req` → `cl_list` (`noodl.cloud.listusersinrole`, role `grownup`) → `cl_decide`
  (only the first account may claim) → `cl_add` (`noodl.cloud.addusertorole`) → `cl_ok`/`cl_fail`.

The checker itself is `tools/check.src.js` → `app/scripts/settings/check.js` and `tools/check.cloud.js`
(`checkChange`, `toRows`, `cleanName`, `rude`, `TABLES`, `KNOWN`). It is the one piece of validation that
runs both in the browser and on the server.

### Sign-in today

The only sign-in is on `Pages/Grownups`:

- `gp_userNode` (`net.noodl.user.User`) — who is signed in: `authenticated`, `roles`, `username`.
- `gp_login1` (`net.noodl.user.LogIn`) — inputs `username`, `password`, `login`; outputs `done`, `failure`, `error`.
- `gp_signup1` (`net.noodl.user.SignUp`) — same shape.
- `gp_logout1` (`net.noodl.user.LogOut`) — input `login`.
- `gp_claimFn` (`CloudFunction2`, function `claimGrownup`) — called after a successful login or signup, then
  `gp_userNode.fetch` refreshes the user.
- `gp_view` (`JavaScriptFunction`) decides what the page shows from `authenticated`, `roles`, `username`,
  the `GameChange` rows and the save's language; `app/scripts/view/grownups.js` builds the rows.

So: username + password, the first account to sign up becomes the `grownup`, and the grown-up's changes are
saved to `GameChange` through `saveChange`/`removeChange`. **There is no notion of a child, no per-child
progress, and the save is per-device only.**

### The parts this feature touches, named

| file / component | why it matters here |
|---|---|
| `app/scripts/game/save.js` (`fresh`, `mend`, `nextSeason`) | the thing to store per child; its `v` and `mend` decide what happens to an old or newer save |
| `app/components/Logic/Start Up` (`su_gala`, `su_open`, `su_setSave`, `su_storeReady`, `su_ready`, `su_changes`, `su_wait`, `su_apply`) | where the save is opened and written at boot, and where the backend is already fetched |
| `app/components/Game/Dispatcher` (`dp_save`, `dp_fn`, `dp_setSave`) | where the save is written on every action — the natural sync point |
| `app/components/Game/Stage 3D` (`s3_sync`) | reads the save directly; must keep working when the save is swapped |
| `app/components/Pages/Grownups` (`gp_userNode`, `gp_login1`, `gp_signup1`, `gp_logout1`, `gp_claimFn`, `gp_view`) | the only sign-in UI, and where a "my children" section belongs |
| `app/components/App` (Router `f7c4077d-…`) | where a sign-in page would be added to `routes` |
| `app/components/Game/Top Bar` (`tb_grown`, `tb_view`) | where a "sign in" chip would sit beside the grown-ups' gear |
| `app/components/__cloud__/*` and `app/nodegx.security.json` | the backend pattern to follow |
| `app/scripts/settings/apply.js` / `check.js` | the existing "fetch from the backend at boot, validate, apply" pattern |
| `app/scripts/view/grownups.js` | the grown-ups' page view model |
| `tools/sync-check.mjs`, `tools/check.src.js` | how one checker is kept in both the browser and the cloud function |
| `gala-rules/tests/*.test.mjs`, `tools/check-rules.mjs`, `tools/check-views.mjs` | the existing checks to extend |

---

## 2. The plan

### The shape of the change

Today: one save, in one browser, under one key. After: a **profile** per child, each with its own save,
kept on the device and on the backend, with the device's copy always the one the game plays from.

```
device                          backend
┌─────────────────────────┐     ┌──────────────────────────────┐
│ gala store              │     │ Player   (family roster)     │
│   save   = active save  │◄───►│ Progress (one row per child) │
│   saves  = { id: save } │     │ GameChange (grown-ups' rows) │
│   active = "guest" | id │     └──────────────────────────────┘
└─────────────────────────┘
```

The game keeps reading `gala.save` exactly as it does now. The new keys `saves` and `active` sit beside it,
so nothing downstream has to change.

### Data to store, and where

**On the device** (the `gala` GlobalStore, `storageKey: "gala-game-v2"`):

| key | what |
|---|---|
| `save` | the **active** save — unchanged, so the dispatcher, the stage and every view keep working |
| `saves` | a map `{ [profileId]: save }` — one entry per profile that has played on this device |
| `active` | the active profile id: `"guest"` when nobody is signed in, otherwise the child's user id |
| `sync` | `{ [profileId]: { rev, ackedRev, updatedAt } }` — what the backend last confirmed, per profile |

`profileId` is `"guest"` or the child's account id. The existing single save is migrated into
`saves.guest` on first run, so **a child who already has progress on this device keeps it** — it becomes the
guest profile's save.

**On the backend** (new collections, both `nobody` for direct client access — reached only through cloud
functions, exactly like `GameChange`):

| collection | fields | why |
|---|---|---|
| `Player` | `familyId` (the grown-up's user id), `userId` (the child's account id), `name` (display name), `username`, `createdAt`, `createdBy` | the family roster: who the grown-up's children are, and which account each is |
| `Progress` | `userId`, `save` (the save as a string), `rev` (integer), `updatedAt` (server clock), `deviceId` | one row per child: their game |

`GameChange` stays as it is, but should gain a `familyId` so one family's grown-up changes do not reach
another family on the same backend (today it is global — see "What could go wrong").

### Server-side workflows (new cloud functions)

Each is a component under `app/components/__cloud__/`, built the same way as `saveChange`: a
`noodl.cloud.request` for the parameters, `noodl.cloud.getuserroles` for the caller's roles, a
`JavaScriptFunction` for the decision, the `DbCollection2`/`NewDbModelProperties`/`SetDbModelProperties`/
`DeleteDbModelProperties` nodes for the data, and `noodl.cloud.response` for the answer. Each is added to
`app/nodegx.security.json` under `functions`.

| function | who may call | what it does |
|---|---|---|
| `createChild` | `role:grownup` | creates the child's account and a `Player` row linking it to the caller's family; returns the child's id and name |
| `listChildren` | `role:grownup` | returns the caller's family roster, with whether each child has a save |
| `linkChild` | `role:grownup` | the fallback path: links an account the child made themselves to the caller's family |
| `loadProgress` | `authenticated` | returns the caller's own `Progress` row (save + rev), or nothing |
| `saveProgress` | `authenticated` | writes the caller's save if the stored `rev` matches the caller's `baseRev`; otherwise returns the stored row so the client can reconcile |
| `claimProgress` | `authenticated` | first sign-in: if the caller has no `Progress` row, creates one from the save the client sends; if one exists, returns it |
| `resetProgress` | `role:grownup` | clears one child's progress (a grown-up's "start again") |

Every function that touches a child's data uses the **caller's own `userId`** from
`noodl.cloud.request` — never a `userId` sent by the client — so a child cannot read or write another
child's progress. `saveProgress` validates the save before storing it: it must parse, carry `v: 2`, and be
under a size cap. The validation lives in `tools/check.src.js` (or a sibling) and is generated into both the
browser and the cloud function by `tools/sync-check.mjs`, the way `checkChange` already is.

### How a child signs in

A child has a **username and a PIN** (a short password). No email. The grown-up creates it.

1. **The grown-up sets the child up.** On `Pages/Grownups`, a new "My children" section lists the family's
   children (`listChildren`) and has an "Add a child" form: a display name, a username, and a PIN. It calls
   `createChild`. The grown-up can also reset a child's PIN or progress.
2. **The child signs in.** A new page `Pages/SignIn` (added to the Router's `routes`), reached from a chip
   in `Game/Top Bar` beside `tb_grown`. Two fields — username and PIN — and one big button. On success the
   app switches the active profile to the child's id and loads their save.
3. **The child signs out** from the same place; the active profile goes back to `"guest"`.

The exact way the account is created is the one thing to confirm against the platform first (see "What
could go wrong"): a cloud function that creates a user, or the `SignUp` node followed by re-authenticating
the grown-up, or the child signing up themselves and the grown-up linking them with `linkChild`. The rest
of the plan does not depend on which of the three it is.

### What happens to the progress already on the device

- **On first run after the change**, the existing `gala.save` is copied into `saves.guest` and `active` is
  set to `"guest"`. Nothing is lost; the game plays exactly as before.
- **A child who played as guest and then signs in for the first time**: if their account has no save on the
  backend, `claimProgress` adopts the guest save as theirs. If their account already has a save (they played
  on another device), the backend's save becomes theirs and the guest save is **kept** under `saves.guest` —
  never deleted. The child (or the grown-up) can choose which to continue from; the default is the newer by
  `updatedAt`.
- **Two children on one device**: each has their own entry in `saves`. Signing out writes the active save
  back into `saves[active]` before switching, so the last few actions are never lost. Signing in loads the
  other child's entry.

### What happens offline

The game itself is already entirely client-side — the rules, the 3D stage and the music need no network. The
only network at boot is the `GameChange` fetch, which already has a 4-second timeout and falls back. So:

- **The save is written to the device on every action**, as it is today. That is the durable copy.
- **The push to the backend is debounced** (a few seconds after the last change, and again on
  `visibilitychange`/`pagehide`). If it fails, the local save is still the truth and the push is retried on
  the next action, on the browser's `online` event, and on a timer.
- **Boot never waits on the network.** The local profile is loaded from the store, `ready` is set, the game
  starts; the sync happens in the background. This is a change from today, where `su_open` waits for
  `su_apply` (up to 4 seconds).
- **A dropped connection mid-game loses nothing**, because every action has already been written locally.
- **Signing in offline** cannot authenticate, so it fails and the game stays on the guest profile — it never
  blocks.

### What could go wrong

| risk | why | what to do |
|---|---|---|
| The GlobalStore's `storageKey` is a build-time parameter, not a runtime input | one store cannot be pointed at a different key per child | keep one store and add the `saves` map and `active` key (the plan above); do not try to re-key the store |
| The save is read in many places (`gm_save`, `dp_save`, `s3_sync`, every view) | changing its shape would ripple everywhere | keep `save` as the active save; add `saves`/`active` beside it |
| A profile switch that forgets to flush | the last actions of the child who just signed out are lost | mirror the active save into `saves[active]` on every change, not only on sign-out |
| Boot now waits up to 4 s for the backend | a signed-in child on a slow or dead network waits | load the local profile first and set `ready`; sync in the background |
| A newer-version save from another device | `mend` starts fresh on anything it cannot read, which would **lose** progress | check `v` before overwriting: if the stored save's `v` is newer than the app's, do not overwrite it; warn instead |
| Two devices, both offline, both played | last-write-wins would silently drop one | `saveProgress` writes only when `rev` matches; on a mismatch, keep the backend's save and keep the local one as a recoverable copy; never delete either |
| A child tampering with their own save | the save is the whole game state, so the server cannot easily judge it | validate shape, version and size server-side; accept that a child can still edit their own stars — low stakes for this game, and say so |
| A child reading another child's progress | the collections are `nobody`, but a function could be written to trust a client-sent id | every function uses the caller's own `userId` from `noodl.cloud.request`; test it by calling as another user |
| A 4-digit PIN is guessable | children 8–13 | rate-limit sign-in attempts server-side; let the grown-up reset a PIN |
| `GameChange` is global today | two families on one backend would share one family's grown-up changes | add `familyId` to `GameChange` and scope the reads and writes; note this is a change to existing behaviour |
| The `reference/src/` the stage scripts are generated from is gone | `tools/sync-stage.mjs` cannot be re-run | do not touch the stage scripts; if the stage must change, the reference has to be found first |
| The exact NodeGX user-creation primitive is unknown | the account model depends on it | confirm it first (step 1 below); the fallbacks are `SignUp` + re-auth, or child self-signup + `linkChild` |

### Order of work

1. **Confirm the platform primitives.** Can a cloud function create a user account? Can it read the caller's
   `userId`? Can the client call a function with parameters and read the response? (`CloudFunction2` and
   `noodl.cloud.request` say yes to the last two.) Decide the account model from the answer. *No files
   changed.*
2. **Backend first.** Add the `Player` and `Progress` collections and the security rules to
   `app/nodegx.security.json`; add the cloud functions under `app/components/__cloud__/`; deploy them. Test
   each with a direct call before any UI exists.
3. **Local profiles.** Change `Logic/Start Up` and `Game/Dispatcher` to keep `saves` and `active`, migrate
   the existing `save` into `saves.guest`, and mirror the active save on every change. Verify a guest plays
   exactly as before.
4. **Sign-in UI.** Add `Pages/SignIn` and its route; add the chip to `Game/Top Bar`; add the "My children"
   section to `Pages/Grownups` and its view model in `app/scripts/view/grownups.js`. Wire the profile switch.
5. **Sync.** Add the debounced push, the `sync` bookkeeping, the `online`/`pagehide` handling, and the
   conflict policy. Verify offline play and reconnect.
6. **First sign-in adoption.** `claimProgress` and the keep-both rule.
7. **Checks.** Extend `gala-rules/tests/` for the save's shape; add a `tools/check-*.mjs` for the new
   server-side validation; run the existing checks; drive the app.

---

## 3. What I would check to know it works

**The game is unchanged for someone who never signs in**
- Play a full gala as guest, reload, and the progress is there.
- `node --test gala-rules/tests/*.test.mjs`, `node tools/check-rules.mjs` and `node tools/check-views.mjs`
  all pass, as they do today.

**Signing in and finding the game**
- Sign in on device A, play, sign out. Sign in on device B: the progress is there.
- Sign in on device B, play, sign out; back on device A, the newer progress is there.

**Two children, one device**
- Child 1 plays, signs out; child 2 signs in and sees their own, different progress; child 1 signs back in
  and sees theirs. Nothing from either is lost.

**Progress already on the device**
- Play as guest, then sign in to a fresh account: the guest progress is now the account's.
- Play as guest, then sign in to an account that already has a save: the account's save is used and the
  guest save is still there under `saves.guest`.

**Offline**
- Sign in, go offline, play, reload while still offline: the progress is there.
- Go back online: the progress reaches the backend (check the `Progress` row).
- Kill the network in the middle of a run, finish the run, reload: nothing is lost.
- Sign in while offline: it fails, the game stays on the guest profile, and nothing blocks.

**Conflicts**
- Play on A offline, play on B, bring A online: neither save is silently lost; the backend's save is the
  account's and the other is kept.

**Security**
- Call `loadProgress` as another child: it returns nothing of theirs.
- Call `createChild` as a child: refused.
- Call `saveProgress` with a save that is not `v: 2`, or is oversized: refused.
- A child cannot write a `Player` row directly.

**The existing grown-ups' flow still works**
- `claimGrownup`, `saveChange` and `removeChange` behave as before; a grown-up's change still reaches the
  game after a reload.

**The app itself**
- `validate_project` reports 0 errors.
- `drive_page` from the app's start page (`/Pages/Game`), pressing through sign-in and a short play, the way
  a person arrives.

---

## 4. How I found my way around

**Easy.** The folder is small and unusually well commented: every script opens with a sentence saying what
it is and where it came from. The `tools/` scripts explain the generated files (`sync-rules.mjs`,
`sync-check.mjs`, `sync-stage.mjs`), so it is clear which files are hand-written and which are copies. The
cloud functions are short and self-describing, and `nodegx.security.json` names the roles and permissions
plainly. The save's shape is easy to read once `game/save.js` and `rules/plan.js` are side by side.

**Hard.** The `reference/src/` that `tools/sync-stage.mjs` copies from is not in the folder, so the stage
scripts are generated from a source that is gone — I could read them but not re-derive them. The NodeGX node
semantics (`net.noodl.user.*`, `GlobalStore`, `CloudFunction2`, `DbCollection2`) are not documented in the
folder, so I inferred the ports from the connections: `User` gives `authenticated`/`roles`/`username` and
takes `fetch`; `LogIn`/`SignUp` take `username`/`password` and a trigger, and give `done`/`failure`/`error`;
`LogOut`'s trigger is wired as `login`. The save's shape is spread across `save.js`, `plan.js`, `data.js` and
`actions.js`, and the `ui` store's shape is only in the `su_ui` node's `initialState` and `UI0`. The boot
order is only visible by reading the `Logic/Start Up` connections.

**Where I am unsure of what I wrote.**
- **Whether NodeGX can create a user account server-side.** The whole account model hinges on this. I
  planned for it and named two fallbacks, but the first step is to confirm it.
- **Whether the GlobalStore's `storageKey` can be changed at runtime.** I assumed it cannot, which is why
  the plan keeps one store and adds a `saves` map. If it can, the plan gets simpler.
- **Whether `net.noodl.user.LogOut`'s trigger is really `login`.** The connection says so, but it reads
  oddly.
- **Whether the backend is one-per-family or shared.** `GameChange` is global today, which suggests one
  backend per family or school; the plan assumes it may be shared and scopes it by family.
- **The exact `net.noodl.user.User` outputs** beyond `authenticated`, `roles` and `username`.
- **The size and growth of the save.** I planned a size cap but did not measure a real save; the notebook
  grows one entry per gala per season, so the cap needs a real number.
