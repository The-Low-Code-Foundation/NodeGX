# Plan: children sign in and keep their progress

Nothing has been built yet. This file is the only one written. Paths are relative to this folder.

---

## 1. How the game works today

### What it is

**Le Gala de danse** ("Star Dance School"), a French/English game for children. The player runs a dance school
and gets it ready for the end-of-year gala. She sets the running order of the evening (*Programme*), the formation
and choreography of each dance, built from blocks of steps (*Formation*), the snacks (*Goûter*), the costumes and
hair, the dressing room (*La loge*, furniture placed on a grid in 3D), the car park (from season 2), and a shop where
she spends stars. She can try a dance or hold a dress rehearsal as often as she likes. Then comes **gala night**:
an evening simulated from her plan, shown in a three.js 3D view with music. It earns stars and writes a line in the
school's *Carnet* (notebook). Then she moves on to the next season, when new classes join. Each season's gala can be
played only once.

There is also a **grown-ups' settings** page (`/Pages/Grownups`). A signed-in "grown-up" can change the game's own
tables there, for every player of this backend: a step's name or difficulty, prices, a new school's starting stars,
new steps and costumes.

### How it's put together

| Where | What it is |
|---|---|
| `app/` | The NodeGX project (`nodegx.project.json`, runtime `react19`). The app is a graph of nodes stored as JSON under `app/components/<path>/{component,nodes,connections}.json`. |
| `app/scripts/` | Plain JavaScript files the graph's Function nodes load with `uses` / `Scripts.<name>`, CommonJS-style (`exports`, `use('rules/data')`). |
| `app/scripts/rules/*` | The game rules, **generated** from `gala-rules/src` by `tools/sync-rules.mjs`. Don't edit them by hand. |
| `app/scripts/stage/*` | The 3D view and music, **generated** by `tools/sync-stage.mjs` from `reference/src/*.js`. **That `reference/` folder is not here.** |
| `app/scripts/settings/check.js`, `tools/check.cloud.js` | The grown-ups' change checker, both **generated** from `tools/check.src.js` by `tools/sync-check.mjs`. The cloud copy has been pasted into the `saveChange` cloud function, followed by `tools/cloud-save.glue.js`. |
| `gala-rules/` | The rules as a separate ES-module package, with `node --test` tests (19 pass). |
| `tools/check-rules.mjs`, `tools/check-views.mjs` | Smoke checks: the app's copy of the rules plays the same evening as `gala-rules`, and every view and action runs on fresh and played-through saves. Both pass today. |
| `app/nodegx.security.json` | Backend permissions: collections, cloud functions, sign-up. |
| `app/components/__cloud__/*` | Server-side workflows (cloud functions). |

Metadata says the backend is the built-in NodeGX one (`cloudservices.endpoint: http://127.0.0.1:8585`), so it
**only runs on this computer for now**.

### The parts this feature touches

**The save: one object kept in this browser.**
- `app/components/Logic/Start Up` (placed in `App` beside the router) declares the Global Store **`gala`** (node
  `su_gala`): `persist: true`, `storageKey: "gala-game-v2"`, i.e. browser localStorage. The node's comment says so:
  *"Persisted in this browser's localStorage, as the coded game's save was."* The save sits under the key `save`.
- Startup order (`su_*` nodes): the `GameChange` collection is fetched (`su_changes`), or a 4-second timer gives up
  on it (`su_wait`). Then `su_apply` lays the grown-ups' changes over the rule tables (`scripts/settings/apply.js`
  `applyOnce`). Once the store has loaded too (`su_storeReady`), `su_open` runs `Scripts.save.mend(stored.save)`,
  `su_setSave` writes the repaired save back, and `su_setReady` sets the Variable **`ready`**. `Pages/Game` mounts
  its window (`gm_root.mounted`) only when `ready` is true.
- The other store, **`ui`** (`su_ui`, not persisted), holds what's on screen: tab, selection, the live evening
  (`live`), the result (`res`), camera, toast.
- The save's shape comes from `app/scripts/game/save.js`:
  `{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook[], sound, seed }`. `school` holds the stars,
  stars earned, what's owned, upgrades and furniture. `plan` holds the order, the per-number choreography and
  costumes, hair, snacks, parking and backdrop. `fresh()` makes a new save, `mend()` fills in fields a newer
  version added (or starts fresh if the save can't be read), `nextSeason()` moves on, and `fromRound1()` migrates an
  even older save. A save is a few kilobytes; the notebook grows by one line per season.
- `lang` and `sound` are preferences, but they live **inside the save**.

**Where the save changes: one place.**
- Every button in every tab (`Tabs/*`, `UI/*`, `Game/*`) sends an Event on channel **`gala-act`** with `act` and
  `arg`. The 3D stage (`Game/Stage 3D`, node `s3_send`) sends taps and the end of a run on the same channel.
- `Game/Dispatcher` (placed in `Pages/Game`) is the only listener. Its Function `dp_fn` calls
  `Scripts.dispatch.dispatch(act, arg, save, ui, words, stage)` (`app/scripts/game/dispatch.js`), which calls the
  pure functions in `app/scripts/game/actions.js` (`orderStep`, `moveCard`, `formationAct`, `snack`, `costume`,
  `build`, `parking`, `shop`, `buy`, `finishGala`). It writes the result back with **`dp_setSave`** (Global Store
  Set, `gala`/`save`) and `dp_setUi` / `dp_setRes` / `dp_setLive` / `dp_setToast`.
- So the save is written in exactly **two places**: `su_setSave` at startup and `dp_setSave` on a press. A
  `grep` over the components finds no other `GlobalStore.Set` on `gala`. About 20 components read it through
  `GlobalStore.Subscribe` (`storeName: gala, keys: save`). That one write point is what makes this feature fairly
  contained.
- `dispatch.js` cases that matter here: `runDone` (the end of a gala calls `A.finishGala`, which adds stars, sets
  `galaDone` and adds a notebook line), `go:nextSeason` (`S.nextSeason`), `note:resetYes` ("Start again", which
  replaces the save with `S.fresh`), `lang`, `sound`.

**The evening is computed locally and needs no network.** `scripts/stage/play.js:114` calls
`simulate({ plan, school, season, mode, seed })`. The gala uses the season's `save.seed`, so a gala that is
interrupted (the page closed mid-evening) replays identically: `live`/`res` are not persisted, and `galaDone` is set
only on `runDone`. Try-outs use `Math.random()`.

**The backend, and what "grown-up" means today.**
- `app/nodegx.security.json`: everything defaults to `nobody` with `creatorOwns: true`. `GameChange` has
  `find`/`get` set to `public` and no writes from the client. Functions: `saveChange` and `removeChange` need
  `role:grownup`, `claimGrownup` needs `authenticated`. `"signup": "public"`. Files are off.
- `__cloud__/claimGrownup` makes the caller the **"home's grown-up"**, but only if nobody has the `grownup` role yet
  (`cl_list` → `cl_decide` → `cl_add`). Its description: *"Once a grown-up exists, every other account (a child's
  included) is refused here."* The page's words say the same (`g_signupHint`: "The first account made here becomes
  the grown-ups' account").
- `__cloud__/saveChange` checks the caller's role (`sv_roles`), loads `GameChange`, runs the pasted checker
  (`checkChange`, plus the rude-word filter `cleanName`/`rude`) and creates or updates one row. `removeChange`
  deletes one row.
- `Pages/Grownups` signs in with **username + password** (`net.noodl.user.LogIn` / `SignUp` / `LogOut` / `User`;
  no email). After signing in or up it calls `claimGrownup` (`gp_login1.done → gp_claimFn.call`), and it shows the
  editor only if `User.roles` includes `grownup` (`gp_view`). The door to it is the ⚙︎ chip in `Game/Top Bar`
  (`tb_grown` → `tb_goGrown`).

So **the backend was designed as one per home, with one content grown-up.** "Grown-up" means *the person who may
change the game for everyone on this backend*. That isn't the same thing as *a parent who looks after their own
children*, and the plan has to keep the two apart.

**Words.** Every sentence on screen is a row `{ key, fr, en }`. The game's rows are in the `Static Data` node
`su_words` in `Logic/Start Up`; the grown-ups' rows are in `Grownups/Words`. `scripts/game/text.js` `words()` fills
the templates. `tools/words.json` is an older copy that `check-views.mjs` reads. It has drifted from the app (19 keys
are only in the tools copy, 3 only in the app).

---

## 2. The plan

### 2.1 The shape of it, in one paragraph

The save stays **local-first**: the device's copy is always the one the game plays from, so every press is saved on
the device at once, exactly as today, connection or not. A signed-in child also has a **copy in the backend**, one
row per child. A new background component sends the latest save up whenever it changes and the network allows,
and fetches it when the child signs in on another device. A **family** is a grown-up's account plus the children
they create. Children get a simple username and three "secret words" from their grown-up, with no email. One device
keeps a separate save for each child who has played on it, plus the guest save of someone who never signed in.
Nothing on a device is ever overwritten without a copy being kept.

### 2.2 Decisions, and why

1. **Two kinds of grown-up, two roles.** Today's role **`grownup`** stays exactly what it is: it can change the
   game's tables for everybody. A new role, **`parent`**, can only manage its own family. A parent must *never* get
   `grownup`. Otherwise every family could rename steps and change prices for every other family. In the words on
   screen, the ⚙︎ page becomes "Game settings" and the new page becomes "Family".
2. **Close the "first account wins" door before the backend goes online.** `claimGrownup` gives `grownup` to
   whoever signs up first. That's harmless on a home computer but not on a public server, where the first stranger
   to sign up would own the game's content. Before the backend is published, `claimGrownup` must also require a
   setup code kept as a function secret (`set_function_secret`, with the value pasted into the project's `.env`,
   never into chat). Or the operator claims the role before deploying and the function is switched off.
3. **Children's accounts are made by the server, never by sign-up.** The `addChild` cloud function uses
   `noodl.cloud.createuser`, which creates an account without opening a session, and gives it the role `child`.
   Children never see a sign-up form, and no email is asked for or stored.
4. **How a child signs in: a username plus three secret words.** The grown-up chooses a nickname and an avatar (one
   of `noodl_modules/starter-imagery/avatar-*.webp`). The server makes a **username** that's easy to read and type,
   e.g. `lea-etoile-27`, unique across the backend, and **three secret words** from a list of short, kind words in
   the game's world (e.g. `tutu lune pirouette`). That gives millions of combinations, against a few thousand for a
   PIN. The words are the account's password; they're shown to the grown-up **once**, on a card that can be printed
   or photographed, and can be reset any time. The standard `LogIn` node then works unchanged (`username`,
   `password` = the words joined by spaces, in lower case).
   *Rejected:* a family code plus a 4-digit PIN checked by a custom function. The backend can't open a session from
   a cloud function (Create User "mints no session"), and a PIN is too easy to guess without rate limiting I can't
   confirm exists.
5. **On a shared device, children pick themselves.** The device remembers **who has played here**: username,
   nickname and avatar, but never the secret words. A "Who's playing?" panel shows those avatars plus *"Play
   without signing in"*. Tapping your avatar asks for your secret words only (the username is filled in). On the
   family tablet a grown-up may tick **"Keep signed in on this device"** for a child, so that child doesn't type
   their words every time. That's a grown-up's decision because siblings could then open each other's schools.
   Switching child = signing out, then in.
6. **Whole-save snapshots, not a log of moves.** The save is small and `dispatch` replaces it wholesale on every
   press, so the backend stores **the latest whole save** plus a revision number. Sending it again is harmless (it
   just overwrites), so a retry after a dropped connection can't double anything, and the pending upload is never
   a growing queue: it's always just "the latest save of child X".
7. **Every check the server makes runs in the browser too, from one source file**, as the project already does for
   `check.src.js`. The new sync rules (which copy wins, is this save well-formed) go into a pure file that generates
   both the browser script and the code pasted into the cloud functions.

### 2.3 The data

**On the device**: the Global Store `gala` (still `persist: true`, `storageKey: "gala-game-v2"`, so the save from
before this feature is found where it already is).

```js
{
  save: { ... },                 // UNCHANGED MEANING: the save being played now. Every existing subscriber keeps working.
  who: 'guest' | '<userId>',     // whose save `save` is
  slots: {
    guest: { save },             // the save of whoever plays without signing in (today's save, moved here on first run)
    '<userId>': {
      username, nickname, avatar,   // to draw the "Who's playing?" avatar, nothing secret
      save,                         // this child's latest save on this device
      rev,                          // the server revision this copy was built on (0 = never synced)
      dirty,                        // true while there's a change the server hasn't confirmed
      savedAt,                      // when the device last changed it (ISO)
      syncedAt                      // when the server last confirmed it (ISO)
    }
  },
  backups: [ { who, save, at, why } ],  // at most 5: anything replaced by a merge or a claim, newest first
  deviceId: '<random>'                  // made once, so the server can say "this was saved on another device"
}
```

Keeping `save` as the key that's played means **none of the ~20 components that subscribe to `gala`/`save`
change**, and neither does the Dispatcher. Only the code that *chooses* which save goes into `save`, and the code
that copies `save` back into `slots[who]`, is new.

Moving `lang` and `sound` out of the save into a device preference was considered and left out. They follow the
child from device to device, which is reasonable, and moving them would touch the Top Bar, `dispatch.js` and
every `words()` call.

**In the backend** (built-in NodeGX backend; a hosted, HTTPS deployment is required, see 2.9):

| Class | Rows | Fields | Who can read/write (in `nodegx.security.json`) |
|---|---|---|---|
| `_User` (built in) | one per grown-up and per child | grown-up: `username`, `password`, optional `email` for recovery. child: `username`, `password` (the words), `nickname`, `avatar`, `familyId`, `keepSignedIn` (bool) | only through the cloud functions below |
| roles | `parent`, `child` (new); `grownup` (unchanged) | | |
| `Family` (new) | one per family | `name` (optional, checked by `cleanName`), `parentId`, `childIds[]`, `createdAt`, `consentAt` (when the grown-up accepted the terms) | all `nobody`; read and written by functions only |
| `Progress` (new) | one per child | `childId`, `familyId`, `save` (JSON string), `rev` (integer), `savedAt`, `deviceId`, `saveV` (the save's `v`) | all `nobody` |
| `ProgressBackup` (new) | at most 5 per child | `childId`, `save`, `rev`, `at`, `why` (`conflict`, `claim`, `restore`, `reset`) | all `nobody` |

All four new classes are `nobody` from the client, the same way `GameChange` writes are today, so the only ways in
are functions that check who's calling. Nothing about the children beyond a nickname and an avatar is stored: no
birth date, no school, no email.

### 2.4 Server-side workflows (cloud functions in `app/components/__cloud__/`)

Each one follows the pattern of the existing three: `noodl.cloud.request` → check the caller
(`noodl.cloud.getuserroles`, and for a parent that the child is in their family) → act → a success
`noodl.cloud.response` **and** a failure response with a reason key. The reason keys are new `gm_*` words in both
languages.

| Function | Who may call (`functions` in security) | What it does |
|---|---|---|
| `startFamily` | `authenticated` | For a grown-up who just signed up: refuses a caller who already has `child` or `parent`. Creates the `Family` row, gives the caller `parent`, records `consentAt`. Running it twice is harmless (`unchanged` → success). |
| `addChild` | `role:parent` | `{ nickname, avatar }`. Checks the nickname with `cleanName` (the existing kind-words filter) and allows at most 6 children. Generates the username (retries if taken) and the three words. `createuser` → `addusertorole child` → `updateuser { nickname, avatar, familyId }` → appends to `Family.childIds`. Returns `{ username, words }`. The words are never stored in plain text and never returned again. |
| `resetChildWords` | `role:parent` | New words for one of *their* children. Ends that child's sessions so a lost card stops working. |
| `setChildOptions` | `role:parent` | `keepSignedIn`, nickname, avatar. |
| `removeChild` | `role:parent` | Deletes `Progress` and `ProgressBackup` for the child, then `noodl.cloud.deleteuser` (sessions first, then the user), then removes the child from `Family`. Asks first, on the page. |
| `familyOverview` | `role:parent` | Per child: nickname, avatar, username, season, stars, last saved, on which device, and the backups. Read-only. |
| `restoreProgress` | `role:parent` | Puts one `ProgressBackup` back as the child's `Progress` (the current one becomes a backup first). For "my school went back to an older one". |
| `loadProgress` | `role:child` | The caller's own `{ save, rev, savedAt, deviceId }`, or `{ rev: 0 }` if none. |
| `saveProgress` | `role:child` | `{ save, baseRev, deviceId }`. Refuses saves over 200 KB or that don't pass the save check (see 2.5). If there's no row, or `baseRev === rev`: store it, `rev + 1`, return `{ rev }`. If not (another device saved since): **don't overwrite**; return `{ conflict: true, server: { save, rev, savedAt, deviceId } }` and let the browser decide (2.7). |
| `saveProgressForce` | `role:child` | Used after the browser has decided a conflict: copies the current server copy into `ProgressBackup`, then stores the chosen save. |
| `claimGrownup` (changed) | `authenticated` | Also requires the setup secret, and refuses anyone with `parent` or `child`. |

Children can only ever reach **their own** row: every child function takes the child from `request.userId`, never
from a parameter.

### 2.5 New and changed files, in the order I'd build them

Following the folder's CLAUDE.md: built with the `nodegx` server's tools (`open_project` on `app/`), one component at
a time, reading each answer before the next.

**Step 0: decisions that need the owner, and making the backend safe to publish.**
- Where the backend will run online (2.9), and how the game's address will be shared with families.
- Change `claimGrownup` (setup secret). Add the roles `parent` and `child`. Update `nodegx.security.json`.
  Decide whether `signup` stays `public`: yes for grown-ups, but a sign-up that isn't followed by `startFamily` has
  no role and can do nothing.

**Step 1: the sync rules as plain, testable code (no UI, no backend).**
- `tools/progress.src.js` → generated by a new `tools/sync-progress.mjs` into `app/scripts/game/progress.js` (the
  browser) and `tools/progress.cloud.js` (pasted into `saveProgress`), the same way `sync-check.mjs` works today.
  Pure functions:
  - `checkSave(save)`: shape and limits (`v === 2`, the season a whole number from 1 to 99, stars from 0 to 999 999,
    the notebook up to 200 lines, school name and block names through `cleanName`, total size). It doesn't
    recompute the gala. The rules are deterministic, so that would be possible later if cheating ever matters,
    but it's not a goal for a children's game.
  - `progressOf(save)`: a comparable "how far along" `[season, galaDone, notebook.length, earned]`.
  - `choose(local, server)`: the conflict rule in 2.7. Returns `{ keep, backup, tell }`.
  - `emptyish(save)`: true for a save nobody has really played (season 1, no gala, no stars earned, nothing bought,
    the default plan). Used so a brand-new device never asks a pointless question.
- Tests: `gala-rules`-style `node --test`, or added to `tools/check-views.mjs`.

**Step 2: one device, several saves (still no backend).**
- `scripts/game/slots.js` (new, pure): `openSlots(stored)` turns today's `{ save }` into
  `{ save, who: 'guest', slots: { guest: { save } }, deviceId }` the first time. A store that's already in the new
  shape passes through, and `mend()` runs on every slot. `switchTo(store, who)` writes `slots[old].save = save`,
  then `save = slots[who].save`. `keepBackup(store, …)` keeps at most 5.
- `Logic/Start Up`: `su_open` calls `openSlots` instead of only `mend`, and `su_setSave` becomes a whole-store
  write (or one Set per key: `save`, `who`, `slots`, `deviceId`). The `ready` logic stays the same.
- New `Logic/Slots` (placed in `App` beside Start Up): subscribes to `gala`/`save`. On every change it copies the
  save into `slots[who].save`, sets `dirty: true` and `savedAt` if `who` is a child, and writes it back. This is the
  **one hook** on the existing write point, `dp_setSave`, and it needs no change to the Dispatcher.
- Check with `check-views` and in the browser: a device with an existing save opens it unchanged as the guest save.

**Step 3: the backend.** The classes and functions from 2.3 and 2.4, one function at a time, each tried against the
local backend with its refusals (wrong role, someone else's child, a bad save, a stale `baseRev`) before the next.

**Step 4: the Family page, for grown-ups.**
- New `Pages/Family` (route added to the `Main` router in `App`; the start page stays `/Pages/Game`), with the
  components `Family/Sign In` (create the family account / sign in; same nodes as `Pages/Grownups`, then
  `startFamily` instead of `claimGrownup`), `Family/Child Row` (avatar, nickname, season, stars, last played,
  "New secret words", "Remove", "Keep signed in on this device"), `Family/Add Child` and `Family/Child Card`
  (username and words shown once, big, printable). Words go in a new `Family/Words` Static Data, the way
  `Grownups/Words` does it.
- `Game/Top Bar`: the ⚙︎ chip keeps going to `/Pages/Grownups`; a new link "Family" goes to `/Pages/Family`. (Or one
  door that shows two choices. To decide with whoever owns the design.)
- `Pages/Grownups`: an account with `parent` or `child` gets a clear sentence ("This is a family account; the game's
  settings are looked after by …") instead of `g_notGrownup`, and must not call `claimGrownup` at all.

**Step 5: children sign in.**
- New `Game/Players` panel over the game (like `Game/Season Letter`, which already covers the window until "Let's
  go!"): "Who's playing?", the avatars in `slots`, "I have a username" (username + three word fields, with words
  that are hard to mistype: lower case, accents not required), and "Play without signing in".
- A new chip in `Game/Top Bar` shows the avatar and nickname, or "Sign in" for a guest. Tapping it opens the panel.
- After `LogIn.done`: if `User.roles` doesn't include `child`, sign out again and say "This is a grown-up's
  account. Children sign in with the username on their card." Otherwise run the **first sign-in on this device**
  flow (2.6), then `switchTo(userId)`.
- Signing out: `slots[userId]` is kept (with `dirty` if it isn't synced yet), and `switchTo('guest')`. If that child's
  save isn't synced yet, say so: "Your last changes will go to the server next time you sign in here."
- If a session expires (`User.authenticated` turns false while `who` is a child), keep playing locally and keep
  `dirty`. The panel asks for the words again when the child opens it, and nothing is lost meanwhile.

**Step 6: the sync itself.** New `Logic/Cloud Save` (placed in `App`):
- Whenever `slots[who].dirty` is true, the user is signed in as that same `who`, and nothing is in flight, wait 3
  seconds of quiet (the debounce idiom: a Timer restarted on every change; the formation drag fires many presses),
  then `saveProgress({ save, baseRev: rev, deviceId })`.
  - `done` → `rev = answer.rev`, `syncedAt = now`, and `dirty = false` **only if the save hasn't changed since it was
    sent** (compare a hash, or the `savedAt` that was sent). Otherwise it stays dirty and goes again.
  - `conflict` → 2.7.
  - `failure` / no answer → stay dirty and retry with backoff (5 s, 15 s, 1 min, then every 2 min), immediately on the
    browser's `online` event, and on `visibilitychange` back to visible.
- Also: right after sign-in (`loadProgress`, see 2.6), on startup if `who` is a child, and on `pagehide` /
  `visibilitychange` to hidden (a last best-effort send; local storage already holds everything).
- A small status in the Top Bar chip: ✓ saved online · ⟳ saving · ☁︎✕ "saved on this device, will go online
  later". Gentle, never an alarm: the child has lost nothing.
- Only the slot of the signed-in child is ever sent, and only to that child's account. A dirty slot of a child who
  isn't signed in waits until they sign in again on this device.

**Step 7: words.** Every new sentence in French and English, in `su_words` / `Family/Words`. `tools/words.json`
gets brought back into line with the app at the same time, since `check-views.mjs` reads it.

### 2.6 What happens to the progress already on a device (first sign-in)

On sign-in, `loadProgress` and the device's own slot for this child (if any) are compared. **Nothing is thrown away
in any branch**; whatever isn't kept goes to `backups` (device) or `ProgressBackup` (server).

| Device has | Server has | What happens |
|---|---|---|
| this child's slot, `dirty` | anything | the normal sync path; a stale `rev` → conflict rule (2.7) |
| this child's slot, clean | newer `rev` | take the server copy (it was played elsewhere) |
| no slot for this child, **guest save that's been played** (not `emptyish`) | nothing | Ask: **"Is this your school?"**, showing the school's name, season, stars and last gala from the guest save. **Yes** → it becomes this child's save and is uploaded; the guest slot starts afresh, and the old guest save is kept in `backups`. **No** → the child starts a fresh school, and the guest save stays the guest's. The question matters on a shared tablet, where the guest save may be a sibling's. |
| no slot, played guest save | a played save | Ask which school to continue, both shown side by side ("Le Gala, season 3, 120 ⭐, saved on another device on 12 Oct" / "season 1, 40 ⭐, on this device"). The one not chosen is kept: as a server backup if the server copy loses, or left as the guest save if the guest save loses. |
| no slot, guest save `emptyish` | anything / nothing | no question: use the server's copy, or start fresh |

A child who only ever plays as a guest sees no change at all.

### 2.7 Offline, and the same child on two devices

- **During a game**: the game never needs the network once the page has loaded. Presses are stored at once in
  local storage by the persisted store (today's behaviour). The gala is simulated locally from `save.seed`, and an
  interrupted gala replays identically. When the connection comes back, `Logic/Cloud Save` sends the latest save.
  The child did nothing that can be lost unless the device itself loses its storage (see 2.8).
- **Starting the game offline**: the game opens from local storage as today. The 4-second `su_wait` already stops
  it waiting for `GameChange`. *Also planned:* keep the last `GameChange` rows in the `gala` store, so the
  grown-ups' prices and new steps still apply offline. Without that, a school opened offline could show a costume
  that doesn't exist in the shipped tables. `toRows`/`applyRows` already handle unknown rows by refusing them, but
  the child would see things disappear.
- **Two devices** (played at school, then on the tablet before the school laptop came back online). `saveProgress`
  answers `conflict`. `choose(local, server)`:
  1. the copy that's **further along** (`progressOf`: season, then gala done, then notebook length, then stars
     earned) wins;
  2. if they're level, the one **changed most recently** (`savedAt`) wins;
  3. the loser is always kept (`ProgressBackup` via `saveProgressForce`, or the device's `backups`), and a grown-up
     can restore it from the Family page. The child sees one friendly sentence ("Your school from another device was
     further along; we've opened that one").
  Merging two plans field by field was considered and rejected: a choreography or a dressing room half from one
  copy and half from the other would be stranger for a child than either whole copy.

### 2.8 What could go wrong

| Risk | What the plan does about it |
|---|---|
| A parent ends up able to edit the game for everyone | Separate `parent` role, never `grownup`. `claimGrownup` locked by a secret and refused to `parent`/`child`. Tested explicitly (section 3). |
| The first stranger on a public backend claims `grownup` | Step 0, before publishing. |
| One child's save uploaded into another child's account on a shared tablet | Only `slots[who]` with `who === signed-in userId` is ever sent; the server takes the child from the session, not from a parameter; sign-out switches `who` before anything else. |
| A sibling opens the other's school | Secret words per child; "keep signed in" only by a grown-up's choice. Accepted residual risk within one family. |
| The child forgets their words / loses the card | The grown-up resets them from the Family page; the old card stops working. |
| The grown-up forgets their password | An optional email on the grown-up's account, with the backend's password reset or magic link. Without an email, only the operator can help. Say so at sign-up. |
| Guessing a child's words | Three words from a list of ~250 ≈ 15 million combinations. **I couldn't confirm the backend limits login attempts** (2.9); if it doesn't, add a limit in front of it or use four words. |
| Safari/iPad clears local storage of sites not visited for about 7 days | That's what the online copy fixes, for signed-in children. A *guest*, or a child whose last changes never got online, can still lose them. The panel encourages signing in; the "saved on this device only" mark makes it visible. |
| The same game open in two tabs | Both write the same persisted store, as today. The second tab should notice (a `storage` event) and say "the game is open in another tab". It's existing behaviour, but a sync makes it more visible. |
| A save from a newer version opened by an older one, or the other way round | `mend()` already repairs older saves. `saveV` is stored, and a client refuses to overwrite a server save with a newer `v` than it knows ("please reload the game"). |
| Children's personal data | Only a nickname and an avatar. The grown-up's consent is recorded (`consentAt`). Removing a child deletes everything about them. Needs a short privacy notice; the law that applies (GDPR in France, given the game's language) is for the owner to confirm. |
| "Start again" in the Notebook now also wipes the online school | It replaces the save as before, but the old one goes to `ProgressBackup` (`why: 'reset'`) on the next sync, so a grown-up can bring it back. |
| Sync loops, or hammering the server | Debounce, one request in flight, backoff, nothing sent when nothing changed. |

### 2.9 Things outside the code that must be true

- The backend has to be **reachable from the internet over HTTPS**. Today it's `127.0.0.1:8585` on this computer,
  and a school laptop can't reach that. Where and how a NodeGX backend is deployed is a decision for the owner.
- Session lifetime: long enough that a child on the family tablet stays signed in for weeks (only if
  `keepSignedIn`).

---

## 3. What I'd check to know it works

**Automated (Node, like the existing tools):**
- `node tools/check-rules.mjs`, `node tools/check-views.mjs`, `cd gala-rules && npm test` still pass (they do today).
- New tests for `progress.js`: `checkSave` accepts every save `check-views` builds (fresh, every season, played
  through) and refuses broken, huge or rude ones. `choose` picks further-along, then newer, and always returns a
  backup. `emptyish` is true for `fresh()` and false after one purchase.
- New tests for `slots.js`: today's `{ save }` becomes the guest slot **unchanged** (deep equal after `mend`);
  `switchTo` A → guest → B → A keeps all three saves apart; backups never exceed 5.
- `sync-progress.mjs` regenerates the same files, so the browser and the server run the same rules.

**The backend, function by function** (against the local backend, before any UI):
- `saveChange` called by a `parent` and by a `child` → refused. `claimGrownup` without the secret, or by a
  `parent` → refused.
- `addChild` from a non-parent → refused; with a rude nickname → refused; a 7th child → refused; two children called
  "Léa" → two different usernames.
- `loadProgress` / `saveProgress`: a child can only reach their own row; `Progress` can't be read or written straight
  from the browser (try `find` on it from the page: it must fail); a stale `baseRev` → `conflict` and nothing
  overwritten; a 300 KB save → refused.
- `removeChild` → the child can no longer sign in, and their rows are gone.

**In the app, the way a person arrives** (`npx @nodegx/preview app --open`, and the server's `drive_page` from the
start page without `page`, pressing through):
1. **Never signs in**: the game opens straight to the school exactly as before; play a gala; reload; it's all
   there. An existing `gala-game-v2` save from before the change opens unchanged.
2. **Grown-up**: Family → create account → add "Léa" and "Tom" → each card shows a username and three words once.
3. **First sign-in keeps the device's progress**: on a device with a season-2 guest school, Léa signs in → "Is this
   your school?" → yes → the Family page shows Léa at season 2; the guest slot is fresh; the backup exists.
4. **Another device**: in a second browser profile (another "device"), Léa signs in → her season-2 school, same
   stars, same furniture, same choreography.
5. **Two children, one device**: Tom signs in on the same browser, plays, signs out; Léa signs in again → Léa's
   school, untouched; Tom's avatar is still on "Who's playing?".
6. **Connection drops mid-game**: Léa signed in; switch the browser offline (devtools) or stop the backend; buy
   something, move dancers, play the gala, go to the next season; reload the page while still offline → everything
   still there, marked "saved on this device". Restore the connection → within seconds "saved online"; the other
   browser, after reload, shows the new season.
7. **Close the tab while offline**, come back online days later, open the game → it sends the saved changes up.
8. **Conflict**: two browsers both offline as Léa, play further in one; put both online → the further copy wins in
   both, and the other appears as a backup on the Family page; restoring it works.
9. **Wrong account types**: a grown-up's account typed into the children's sign-in is refused with the right
   sentence; a child's account on `/Pages/Grownups` can't edit the game.
10. **Both languages**: every new screen in FR and EN (the `lang` chip); `check-views` reports no MISSING WORDS.
11. **Small screen**: the "Who's playing?" panel and the Family page on a phone-sized and a tablet-sized window
    (the Sheet already turns into a bottom sheet when narrow).

---

## 4. How I found my way around

**What was easy**
- The project explains itself unusually well. Nearly every component has a `description`, and most nodes have a
  `label` that says what they're for ("gala: the save, kept on this device", "The one place the coded game's
  changed() became"). The scripts open with a comment saying where they came from and what they return.
- The architecture is clean for this feature: all presses go through one event channel to one Dispatcher, and the
  save is written in one place. Once I'd seen that (by searching for `GlobalStore.Set` on `gala`), the sync hook was
  obvious.
- The game logic is pure functions (`dispatch.js`, `actions.js`, `save.js`), and the smoke checks
  (`check-rules.mjs`, `check-views.mjs`, the `gala-rules` tests) run and pass, which gives a safety net.
- The existing backend functions are a good model to copy: the role check, refusals with a reason key, one checker
  shared between browser and server through a generator script.

**What was hard**
- The graphs are JSON. Reading `nodes.json` and `connections.json` by hand, I had to write throwaway one-liners to
  list nodes and wires. Function code is inside JSON strings, and the `Start Up` file is mostly the word list.
- **The meaning of "grown-up".** It took the `claimGrownup` description and the page's words (`g_signupHint`,
  `g_notGrownup`) to understand that the existing grown-up is a single content administrator per backend, not a
  parent. That changes the design (two roles, and locking `claimGrownup`), so it's the thing I'd most like the owner
  to confirm.
- Generated files and missing sources: `app/scripts/stage/*` is generated from a `reference/` folder that isn't here,
  so those files can't be regenerated, only edited by hand. This feature shouldn't need to touch them.
  `tools/words.json` and the app's word list have drifted apart.

**Where I'm unsure of what I wrote**
- **I didn't open the project with the `nodegx` server** (opening writes `app/.mcp.json`, and I was asked not to
  change files). So I haven't run its validator, seen its node catalogue for this project, or played the game in a
  browser. What I say about how the game *behaves* comes from reading code and running the Node checks.
- **NodeGX backend details I inferred rather than confirmed** (from the node types in this project and the server's
  examples): that `noodl.cloud.createuser` takes a username and password with no email; that `updateuser` can set
  a new password (needed for `resetChildWords`) and that sessions can be ended (I saw this in the `deleteuser`
  example, but not as a separate action); whether login attempts are rate-limited; how long sessions last; what
  `signup` accepts besides `public`; and how the backend is deployed publicly.
- **Global Store persistence**: when exactly the persisted store writes to local storage (every Set, or debounced),
  whether two tabs see each other's writes, and whether a store of this size (several saves in one entry) has any
  limit. Local storage itself allows around 5 MB, which is plenty, but the "nothing lost" promise rests on writes
  being immediate.
- **Whether cloud functions can `use()` the app's script files.** The existing `saveChange` has the checker *pasted*
  into it by a generator, which suggests they can't, so I planned the same for `progress.js`.
- The exact numbers (3-second debounce, 5 backups, 6 children, 200 KB, the wordlist size) are starting points, not
  measurements.
