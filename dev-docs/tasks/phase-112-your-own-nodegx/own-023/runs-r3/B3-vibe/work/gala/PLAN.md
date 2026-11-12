# Plan: children sign in and keep their progress

This is a plan only. Nothing here is built, and no file other than this one has been changed.

---

## 1. How the game works today

### What it is

**Le Gala de danse** — a single-player game, in French and English, about running a dance school's annual gala. The player prepares the programme (the running order), each dance's formation and choreography, the costumes, the dressing room (furniture), the snack table, the car park (from season 2) and the shop; rehearses for free as often as they like; then plays "gala night" once per season for real, earning stars. Seasons 1–4 add classes (the teens, the mums); season 5 onward is a free season. It is a NodeGX (OpenNoodl) app — project format 5, runtime react19, nodegx 0.2.4 — in `app/`.

### How it is put together

- **54 components, 762 nodes, 874 wires.** The root `/App` is a Router with two pages (`/Pages/Game`, `/Pages/Grownups`) plus `/Logic/Start Up`.
- `/Pages/Game` places the 3D stage (`/Game/Stage 3D`, three.js), the top bar, the camera bar, the side sheet (`/Game/Sheet`, which holds the tabs), the toast, the season letter and the dispatcher.
- `/Pages/Grownups` is the grown-ups' settings page: sign in, then edit the game's tables (a step's name or difficulty, a price, the starting stars, a new costume or step).
- **Logic lives in `app/scripts/`** as plain JavaScript (CommonJS-style, reached through `use()`). Those files are generated: `tools/sync-rules.mjs` copies `gala-rules/src/` into `app/scripts/rules/`, and `tools/sync-stage.mjs` copies a `reference/src/` into `app/scripts/stage/`. **The `reference/` folder is not in this folder** — the original coded game it was generated from is gone.
- **State is two Global Stores.** `gala` is persisted (`storageKey: "gala-game-v2"`) and holds the save under the key `save`; `ui` is not persisted and holds what is on screen now. A few Variables are shared on purpose: `words`, `ready`, `grownupWords`, `grownupTable`, `grownupMessage`.
- **Every press goes one way.** A button sends an event on the channel `gala-act` (what was pressed, on which item) → `/Game/Dispatcher` → `scripts/game/dispatch.js` decides → it returns `{ save, ui, toast }` → Set Global Store nodes write them back.
- **The save is one JSON object:** `{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }`. `plan` holds the running order, each number's formation and choreography, the hairdos, the snack table, the car park and the backdrop; `school` holds the name, the stars, what is owned, the upgrades and the furniture; `notebook` is one entry per gala night. `app/scripts/game/save.js` owns its shape and its repairs: `fresh`, `fromRound1`, `mend`, `nextSeason`.
- **A backend already exists.** `app/nodegx.project.json` declares `cloudservices` (instanceId `backend_mvi4i1s8eudt8`, type `nodegx`, endpoint `http://127.0.0.1:8585`). It holds one collection, `GameChange` (the grown-ups' edits to the game's tables), and three cloud functions, `saveChange`, `removeChange` and `claimGrownup`, with the role `grownup`. `app/nodegx.security.json` declares who may do what.
- **Sign-in already exists.** `/Pages/Grownups` uses `net.noodl.user.LogIn`, `SignUp`, `LogOut` and `User`, and the cloud nodes `noodl.cloud.getuserroles`, `addusertorole` and `listusersinrole`. `claimGrownup` makes the first account the home's grown-up.

### The parts this feature touches

| Where | What it is, and why it matters here |
|---|---|
| `/Logic/Start Up` | `su_gala` (the persisted store), `su_open` (opens the save **once**), `su_apply` (lays the grown-ups' changes over the tables), `su_wait` (a 4-second timeout so the game opens even if the backend is unreachable), `su_setReady`. This is where a save is opened, and so where a signed-in child's save has to be swapped in. |
| `/Game/Dispatcher` | `dp_setSave` is the **only** place the save is written during play (`su_setSave` writes it once at startup). The sync layer hangs off this. |
| `app/scripts/game/save.js` | `fresh`, `mend`, `nextSeason` — the save's shape and its repairs. |
| `app/scripts/game/dispatch.js`, `actions.js` | What a press changes. `finishGala` writes a gala night's result into the save. |
| `/Pages/Grownups` | The working sign-in UI (`gp_login1`, `gp_signup1`, `gp_logout1`, `gp_userNode`) and the cloud-function pattern (`gp_saveFn`, `gp_removeFn`, `gp_claimFn`) to copy. |
| `/Game/Top Bar` | `tb_grown` is the ⚙︎ door to the grown-ups' page; a "sign in" chip belongs beside it. |
| `app/nodegx.security.json` | Permissions. `app/nodegx.project.json` | The backend binding. |
| `tools/` | `sync-rules.mjs`, `sync-check.mjs`, `check-views.mjs`, `check-rules.mjs` — the pattern for generated scripts and the checks that run them. |
| `gala-rules/src/`, `gala-rules/tests/` | Where pure logic with tests lives. |

---

## 2. The plan

### The shape of it

**Local-first, one save per child account, synced to the backend in the background.** The game keeps writing the save to the device on every press, exactly as it does now; a new sync layer copies it up to the child's account when the network is there, and pulls it back down on sign-in. The backend gains a `Player` collection (one row per child, holding the save) and a `Family` collection (the grown-up's family and its children), plus cloud functions to create children and to load and push a save. A grown-up creates each child's account — a username and a password, no email — and the child signs in with it.

### The data, and where it lives

- **`Family`** (collection): `name` (String), `ownerId` (String — the grown-up's user id), `joinCode` (String, short — what a device remembers so the child only has to pick their name next time). One row per family.
- **`Player`** (collection): `familyId` (String), `userId` (String — the child's account id), `displayName` (String), `save` (Object — the whole save blob), `rev` (Number — bumped on every accepted push), `updatedAt` (Date), `lastDevice` (String). One row per child.
- **On the device:** a local vault in `localStorage` (`gala-vault-v1`) — a plain object keyed `device` and `user:<id>`, each holding `{ save, rev, dirty, updatedAt }`. The Global Store `gala` keeps holding the *active* save, exactly as today.
- **Why the whole save and not per-field:** the save is already one object, the game reads it whole, and the realistic case is one device at a time. Per-field sync would mean rewriting every action for no gain.

### How a child signs in

1. The grown-up signs in (or signs up) on `/Pages/Grownups` — the existing flow; `claimGrownup` makes the first account the family's grown-up.
2. The grown-up adds a child: a display name and a password. A cloud function **`createChild`** (call rule `role:grownup`) calls `noodl.cloud.createuser` with a generated username (`gala-<family>-<name>`), the password, and `prop-familyId` / `prop-displayName`; it creates the `Player` row and returns the username. The grown-up writes it on a card for the child.
3. On any device, the child opens the game and taps **Sign in**. The device shows the family's children (from **`listChildren`**, once the family is known on that device); the child taps their name and types their password. `LogIn` establishes the session, **`loadSave`** returns their save, and the game opens it.
4. The device remembers the family (the `joinCode`), so next time the child only picks their name. A plain username-and-password form is the fallback.
5. Signing out returns the device to the anonymous/device save.

### What happens to the progress already on a device

- The device save is **never deleted** on sign-in. It is stashed in the vault under `device`.
- First sign-in for an account with **no** save: the device save is **adopted** — pushed up as the account's save. The child carries on exactly where they were.
- First sign-in for an account that **already has** a save: the account's save is loaded, and the device save is kept in the vault and offered as "continue the game on this tablet" — a one-tap switch, with a confirmation, because it overwrites the account's save. Nothing is silently thrown away.
- **Two children on one device:** the vault is keyed per user, so each child's local save is separate, and the anonymous save is separate again. Signing in as one child never shows the other's game.

### What happens offline

- The save is written to the device on every press, as today. **The game never waits for the network.**
- The sync layer subscribes to the `gala` store's `save` key: on every change it writes the vault immediately (synchronously) and sets `dirty`.
- A debounced pusher (about 2 seconds after the last change, and on the browser's `online` event) calls **`pushSave`** with the save, the `baseRev` it last saw, and a `clientId`.
- If the push fails — offline, timeout, backend down — `dirty` stays set and it retries with backoff; the game carries on. On reconnect it pushes.
- On sign-in, `loadSave` runs: if the server has no save, the local one is pushed; if the server's is newer, it is pulled; if both changed since the last sync, the child is asked which to keep (the newer `updatedAt` preselected), and the `notebook` — append-only gala nights — is unioned automatically.
- The 4-second `su_wait` timeout stays: if the backend is slow, the game opens on the local save and the sync catches up.

### The server-side workflows

**Cloud functions** (called from the app):

| Function | Call rule | What it does |
|---|---|---|
| `createChild` | `role:grownup` | Creates the child's account and `Player` row; returns the username. |
| `listChildren` | `role:grownup` | The family's children. |
| `resetChildPassword` | `role:grownup` | A forgotten password, reset by the grown-up (there is no email recovery). |
| `deleteChild` | `role:grownup` | Removes the account and its save. |
| `loadSave` | `authenticated` | Returns the caller's own `Player` row, or null. Checks `userId === caller`. |
| `pushSave` | `authenticated` | Writes the caller's own save with a revision check; returns the new `rev`, or the server's save on a conflict. |

**One workflow** (server-side, triggered): **`backupSaves`** — a `schedule` trigger (nightly) → a workflow whose single `call-function` step exports the `Player` collection to a backup. This is the job that makes "their progress is safe" true beyond one device.

Optionally a `db-change` trigger on `Player` to stamp `updatedAt` and write an audit row — worth it only if the grown-up should be able to see when a child last played.

### The order of work

1. **Backend.** Point the project at a reachable backend (the current one is `127.0.0.1:8585`, which no other device can reach — it has to be deployed); add `Family` and `Player`; add the `grownup` role if it is absent; write the permissions into `app/nodegx.security.json`.
2. **Cloud functions.** `createChild`, `listChildren`, `resetChildPassword`, `deleteChild`, `loadSave`, `pushSave`, as `#__cloud__/` components in the style of the existing `saveChange`.
3. **Pure sync logic** in `gala-rules/src/sync.js` (the vault shape, dirty, merge, conflict) with tests in `gala-rules/tests/sync.test.mjs`; generate `app/scripts/sync/save.js` with a new `tools/sync-sync.mjs` (or extend `sync-rules.mjs`).
4. **`/Logic/Start Up`.** Add a `net.noodl.user.User` node, the `loadSave` / `pushSave` `CloudFunction2` nodes, a subscription to the `gala` store to mark dirty, and a debounce timer. Keep `su_open` opening the local save first.
5. **`/Pages/Grownups`.** The children section — add, list, reset password, delete — reusing the existing sign-in and cloud-function pattern.
6. **A child sign-in screen** (a new `/Pages/SignIn`, or a modal in the game) and a chip in `/Game/Top Bar` beside ⚙︎.
7. **The `backupSaves` workflow** and its `schedule` trigger.
8. **Verify** (part 3).

### What could go wrong

- **The grown-up role is global.** `claimGrownup` makes the *first account on the backend* the grown-up. On a shared backend only one family could ever have one. Either the backend is per-family, or the family owner must be recorded per family (`Family.ownerId`) and the functions must check that instead of the role. **This is the biggest decision in the plan.**
- **The backend is on `127.0.0.1`.** "Another device" needs a deployed, reachable backend; the local one only serves this computer.
- **A child's save must not be readable by another child.** `Player` find/get must be `nobody`; every read goes through `loadSave`, which checks the caller. A public `Player` collection would leak every child's game.
- **`createChild` with no `call` rule is open account creation.** It must be `role:grownup`.
- **Two children on one device.** If the vault is not keyed per user, one child's save leaks into the other's. The keying is load-bearing.
- **Sign-in after the game has opened.** `su_open` runs once; a sign-in mid-session must swap the save into the store and re-open it. That needs an explicit re-open path, not just a store write.
- **Concurrent play on two devices.** Whole-blob last-write-wins loses one side's work unless the conflict prompt is wired. The `notebook` union is the only safe automatic merge.
- **A forgotten password has no email recovery.** The grown-up's reset is the only way back; if the grown-up's own account is lost, the family's saves are unreachable.
- **The save blob grows** with the notebook. Fine for a long time, but it is one row, so a long-lived account is one large object.
- **`seed` is part of the save.** Two devices sharing a save share the dice, which is correct; a merge that takes one side's `seed` changes the other's future runs.
- **The `reference/` folder is missing**, so the sync layer cannot be generated from the original coded game — it is new code, and the `tools/` scripts that read `reference/src/` cannot be re-run.

---

## 3. What I would check to know it works

- **`gala-rules` tests:** `node --test tests/*.test.mjs` — the new `sync.test.mjs` for the vault, dirty, merge and conflict, and the existing engine/rows/music tests still pass.
- **A `tools/check-sync.mjs`** in the style of `tools/check-views.mjs`: run `app/scripts/sync/save.js` against a fake backend and assert adopt-on-first-sign-in, per-user vault keying, dirty-on-change, retry-after-failure, and the conflict prompt.
- **`node tools/check-views.mjs`** still passes — the save's shape did not change.
- **`render_report`** on `/Pages/Grownups` and the new sign-in page; read the verdict and the numbers.
- **`drive_page`, from the start page:** sign in as child A, make a press, reload, confirm the save is there; sign out; sign in as child B, confirm a different save; block the backend, play, confirm the local save survives, unblock, confirm the push.
- **Backend:** `check_backend_access`, `list_user_identities` (the child account exists), `query_backend_audit` (the push landed), and a direct read of `Player` with a child's session — which must fail.
- **The one thing I cannot check from here:** a real second device. That needs the deployed backend and a second browser.

---

## 4. How I found my way around

**Easy.** The `--graph` page prints the whole app as text on one page — every component, node, parameter, function and wire — so the shape of the game was readable without opening the JSON. The scripts are small and commented, and the `tools/` sync scripts explain how the generated files are made. The existing grown-ups page is a working example of the auth and cloud-function pattern to copy.

**Hard.** The `reference/` folder the tools generate from is gone, so the original coded game is not here. The save is a large nested object with no schema — its shape lives only in `gala-rules/src/plan.js` and `app/scripts/game/save.js`. The `__cloud__` components paste a generated checker rather than importing it, so the same code exists in three places. The startup ordering (`su_gala.ready` → `su_wait` → `su_apply` → `su_open` → `su_setReady`) is subtle, and it is exactly where a sign-in has to slot in. `claimGrownup`'s "first account" rule is easy to miss.

**Where I am unsure of what I wrote.**
- Whether the backend is meant to be **per-family or shared** — this decides the whole ownership model, and I have assumed it could be shared, which is why I proposed `Family.ownerId` rather than leaning on the global `grownup` role.
- Whether the grown-up role should stay global or become per-family.
- The exact persist semantics of `net.noodl.GlobalStore` — whether it writes synchronously to `localStorage`. The plan assumes it does, because the game relies on that today, but I did not verify it.
- Whether `noodl.cloud.createuser`'s generated username is what the child then types. The node's ports say yes; I have not run it.
- The conflict policy the user wants when two devices both played offline. I proposed a prompt with the newer save preselected, but that is a guess.
- Whether "another device" is expected to reach a **deployed** backend or only the same machine. The plan assumes deployed, because otherwise the requirement cannot be met.
