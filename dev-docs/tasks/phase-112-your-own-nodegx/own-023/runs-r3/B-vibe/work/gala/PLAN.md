# PLAN — a child signs in and finds their game where they left it

A plan for adding accounts and cross-device progress to *Le Gala de danse*. Nothing here is built yet; this file is the only thing written.

---

## 1. How the game works today

### What it is

*Le Gala de danse* is a French/English game for children of roughly 8 to 13. The player is the teacher of a dance school putting on the annual gala. There are eight tabs — Programme (the running order), Formation (where the dancers stand), Goûter (the snack table), Costumes, La loge (a dressing room you furnish), Parking, Boutique (a shop), Carnet (a notebook) — and then a rehearsal or the gala night itself, played out on a 3D stage. A good gala earns stars; stars buy costumes, furniture and upgrades; a new season brings new classes. Progress is the whole plan plus the school's stars, purchases and notebook.

It is a **NodeGX v2 (OpenNoodl) project**, React 19 runtime, at `app/`. 54 components, 762 nodes, 874 connections. It was ported from an earlier hand-coded game: `gala-rules/` holds the original pure rules as ES modules with tests, and `tools/` holds the author's own scripts that copy those rules into the NodeGX project.

### How it is put together

```
app/
  nodegx.project.json      project metadata; metadata.cloudservices points at a backend
  nodegx.security.json     collections, function call rules, signup policy
  components/              the NodeGX graphs (nodes.json + connections.json per component)
    App/                   Router (pages /Pages/Game, /Pages/Grownups) + /Logic/Start Up
    Logic/Start Up/        words, fonts, the two Global Stores, the save opener
    Pages/Game/            the game page
    Pages/Grownups/        the grown-ups' settings page (already has accounts)
    Game/                  Dispatcher, Stage 3D, Top Bar, Sheet, Toast, ...
    Tabs/                  the eight tabs
    UI/                    the shared widgets
    __cloud__/             cloud functions: saveChange, removeChange, claimGrownup
  scripts/                 the JavaScript the graph nodes call
    game/                  save.js, dispatch.js, actions.js, text.js
    rules/                 GENERATED from gala-rules/src by tools/sync-rules.mjs
    settings/              check.js (GENERATED from tools/check.src.js), apply.js
    view/                  view models: prep, formation, run, frame, grownups, common
    stage/                 GENERATED from reference/src by tools/sync-stage.mjs
gala-rules/                the original rules + tests (node --test)
tools/                     sync-rules.mjs, sync-check.mjs, sync-stage.mjs, check-rules.mjs, check-views.mjs
```

The entry point is `App`: a `Router` whose start page is `/Pages/Game`, and one instance of `/Logic/Start Up`.

### The parts this feature touches

**The save.** One JSON object, one per device. Its shape is defined in `app/scripts/game/save.js`:

```js
// fresh(lang) in scripts/game/save.js
{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook: [], sound, seed }
```

- `plan` comes from `defaultPlan()` in `app/scripts/rules/plan.js` (start time, interval, the running order, each number's formation/blocks/chain/costume, hair, snack, cake, parking, backdrop).
- `school` comes from `defaultSchool()` (name, stars, earned, owned, upgrades, furniture).
- `mend(input)` repairs an old or partial save and starts fresh if it is unreadable; `nextSeason(save)` advances a season; `fromRound1(o)` migrates the very first round's save.

**Where the save lives.** `Logic/Start Up` creates a persisted Global Store:

```
su_gala  net.noodl.GlobalStore  storeName "gala", persist true, storageKey "gala-game-v2"
```

That is `localStorage` on this device, and nothing else. The startup graph is: `su_gala.ready → su_wait.start` (a 4-second `Timer`), `su_changes.fetched/failure → su_apply.run`, `su_wait.timerFinished → su_apply.run`, then `su_apply.out-ready → su_open.in-rulesReady`, `su_storeReady.state → su_open.in-storeReady`, `su_gala.state → su_open.in-stored`, `su_ready.value → su_open.in-alreadyOpen`, and `su_open.out-opened → su_setSave.set → su_setReady.do`. `su_open` calls `Scripts.save.mend(stored.save)` and writes the result back with `su_setSave`; `su_setReady` sets the `ready` variable, which mounts the game page.

**Where the save changes.** `Game/Dispatcher` subscribes to `gala.save`, `ui.ui`, `ui.res`, `ui.live` and calls `dispatch(act, arg, save, ui, w, stage)` in `app/scripts/game/dispatch.js`. That returns `{ save, ui, toast }`; the graph writes them back through `dp_setSave` (`GlobalStore.Set` on `gala.save`), `dp_setUi`, `dp_setRes`, `dp_setLive`, `dp_setToast`. The actual mutations are pure functions in `app/scripts/game/actions.js` (`orderStep`, `moveCard`, `formationAct`, `gouterStep`, `snack`, `costume`, `build`, `parking`, `shop`, `finishGala`). **Every press therefore rewrites the whole save into localStorage.** That is the durability the feature has to preserve.

**The accounts that already exist.** `Pages/Grownups` is not empty of this. It has `gp_userNode` (`net.noodl.user.User`), `gp_login1` (`net.noodl.user.LogIn`), `gp_signup1` (`net.noodl.user.SignUp`), `gp_logout1` (`net.noodl.user.LogOut`), and `gp_claimFn` (`CloudFunction2` → `claimGrownup`). Sign-in is **username + password**. `claimGrownup` grants the `grownup` role to the first account only. `app/scripts/view/grownups.js` is the view model for that page.

**The backend that already exists — but is not progress.** `nodegx.security.json` declares one collection, `GameChange` (find/get public, create/update/delete nobody), and three functions: `saveChange` and `removeChange` (`role:grownup`), `claimGrownup` (`authenticated`). The cloud components are `__cloud__/saveChange`, `__cloud__/removeChange`, `__cloud__/claimGrownup`. This layer is the **grown-ups' content editor**: it lets a grown-up rename a step, change a price, add a costume, or set the starting stars. `app/scripts/settings/check.js` (generated from `tools/check.src.js` by `tools/sync-check.mjs`) validates every change, and `app/scripts/settings/apply.js` `applyOnce(rows)` lays the accepted changes over the tables in `rules/data.js` at startup. It is shared content, not per-child progress, and it is easy to mistake for a progress store at a glance.

**The backend is not running on this machine.** `nodegx.project.json` points at `http://127.0.0.1:8585` (`backend_mvi4i1s8eudt8`), but `list_backends` returns nothing and `~/.noodl/backends` is empty. So today the game opens with the 4-second timer expiring and the tables as they ship. Any work on this feature starts by provisioning a backend here.

**What is missing, in one line.** There is no per-child progress anywhere: no collection, no function, no client code. The save is device-local, and the only accounts are the grown-up's.

---

## 2. The plan

### The shape of it

**Local-first, with the server as a backup and a carrier.** The device keeps writing the save to `localStorage` on every press, exactly as today, so a dropped connection can never lose a move. The server holds a copy per child so the same save can be found on another device. The server is never the thing the game reads from at startup; it is reconciled in the background.

**Profiles on the device.** The single save becomes a small map of profiles — a `guest` profile for anyone who never signs in, and one profile per signed-in child. That is what lets two children share a tablet without seeing each other's game, and what stops a first sign-in from destroying the progress already on the device.

**A family, owned by the grown-up.** The grown-up's account is the family. Children are accounts the grown-up creates; they have no email and never sign themselves up.

### The data

Three new collections, all locked to `nobody` for direct access and reached only through cloud functions (a cloud function runs as system, so the function's call rule is the only boundary in front of a write).

| Collection | One row is | Fields |
|---|---|---|
| `Progress` | one child's saved game | `userId` (String, the child's `_User` id), `familyId` (String, the grown-up's id), `saveJson` (String, the whole save), `revision` (Number), `updatedAt` (Date, server time), `season` (Number), `stars` (Number) |
| `Child` | one child in a family | `userId` (String), `familyId` (String), `displayName` (String, what the child taps), `username` (String, the sign-in name), `createdAt` (Date) |
| `ProgressBackup` | a copy kept before an overwrite | `userId`, `saveJson`, `revision`, `reason` (`conflict` / `daily` / `manual`), `createdAt` |

`Progress.userId` is a plain String, not a pointer: a cloud function cannot filter on a pointer (the schema cache is not populated in the cloud runtime, and the filter is silently dropped), so the function filters `userId` `equal to` the caller's id.

`GameChange` is left exactly as it is. The grown-ups' content stays global to the deployment; the children's progress is per child.

A new role, `child`, is created so a child account is distinguishable from the grown-up's. `grownup` already exists.

### The server side — cloud functions

New components under `app/components/__cloud__/`, following the shape of `saveChange` (a `noodl.cloud.request` with named `params`, logic, a `noodl.cloud.response` on every path).

| Function | Params | Call rule | What it does |
|---|---|---|---|
| `loadProgress` | — | `authenticated` | Reads the caller's `Progress` row by `userId = caller`. Returns `{ saveJson, revision, updatedAt }`, or empty for a child who has never synced. |
| `saveProgress` | `saveJson, baseRevision` | `authenticated` | Validates the save (shape, a size cap, season and stars in range). If the stored `revision` is newer than `baseRevision`, copies the stored row into `ProgressBackup` (reason `conflict`) before overwriting. Writes the row with `revision = stored + 1` and `updatedAt = now`. Returns `{ revision, updatedAt, conflict }`. |
| `createChild` | `username, password, displayName` | `role:grownup` | Creates the `_User` with `noodl.cloud.createuser`, adds the `child` role with `noodl.cloud.addusertorole`, writes a `Child` row with `familyId = caller`. Refuses a duplicate username. |
| `listChildren` | — | `role:grownup` | Returns the caller's `Child` rows. |
| `resetChildPassword` | `childId, password` | `role:grownup` | Checks the child belongs to the caller's family, then sets the password with `noodl.cloud.updateuser`. |
| `deleteChild` | `childId` | `role:grownup` | Deletes the `_User` (`noodl.cloud.deleteuser`), the `Child` row and the `Progress` row, keeping a `ProgressBackup` first. This is the "forget my child" path. |

The call rules go in `app/nodegx.security.json` under `functions`, beside the existing three. `loadProgress` and `saveProgress` must be `authenticated` **and** check the caller's own id inside the graph — `authenticated` means any account that can sign up, which is not the same as "this child".

### The server side — workflows

Two workflows, because both are genuinely multi-step and belong on the server rather than in a request.

- **`family-setup`** — triggered by a `db-change` trigger on `Child` (action `create`). Steps: add the `child` role to the new user, create the empty `Progress` row, and email the grown-up the child's sign-in name (via `noodl.cloud.sendemail`), with an error route that records the failure. This is why `createChild` only has to create the user and the roster row: the rest is retried by the trigger if it fails.
- **`progress-backup`** — a daily `schedule` trigger. Steps: for each `Progress` row, write a `ProgressBackup` row (reason `daily`), then prune backups older than a retention window. This is the belt-and-braces behind "nothing the child did should be lost": even a bad save that reaches the server can be walked back.

Both are authored with `create_backend_workflow` and pointed at with `create_backend_trigger`. The step vocabulary is read from `list_backend_step_kinds` first, because it is served by the backend and differs between versions.

### How a child signs in

**The grown-up sets the child up.** On `/Pages/Grownups`, in a new "Children" section:

1. The grown-up signs up or logs in (the existing flow) and claims `grownup` (the existing `claimGrownup`).
2. They tap "Add a child" and type a display name ("Léa"), a sign-in name ("lea") and a short password — four to six digits is fine, and is what a child can actually remember. `createChild` makes the account; the `family-setup` workflow finishes the job.
3. The grown-up sees the sign-in name and password to hand to the child, and can later see each child's last sync, season and stars, reset a password, or remove a child.

**The child signs in.** With the sign-in name and password, through `net.noodl.user.LogIn` — the same node the grown-up's page already uses. No email is involved anywhere.

**On a shared family device**, a "Who's playing?" picker lists the family's children so the child taps their name instead of typing it. The roster (display names and sign-in names, never passwords) is cached on the device after a grown-up has signed in once; the child still enters their password, so siblings cannot open each other's game. On a device the family has never used — a laptop at school — the child types the sign-in name and password the grown-up gave them.

**What happens on sign-in.** `loadProgress` is called. If it returns a save, that save becomes the child's active profile and the game reloads into it (the screen state resets to `UI0`, as `nextSeason` already does). If it returns nothing, the child is new and the device's guest save is offered as their starting point (below).

### What happens to progress already on a device

The persisted store changes shape, once, with a migration that keeps the old value.

Today the store holds a bare save. It becomes an envelope:

```js
{ v: 3, active: 'guest' | '<userId>',
  profiles: { guest: <save>, '<userId>': <save> },
  meta:     { '<userId>': { revision, updatedAt, dirty } } }
```

- **Migration.** A new `mendProfiles(stored)` in `app/scripts/game/save.js` (beside `mend`) recognises a bare save — it has `v` and `plan` — and wraps it as `{ v: 3, active: 'guest', profiles: { guest: mend(stored) }, meta: {} }`. `su_open` calls it instead of `mend` directly. The new envelope is written under a new key (`gala-profiles-v3`); the old `gala-game-v2` key is left in place as a fallback, so a bad migration is recoverable by hand.
- **A child who has been playing as a guest.** On first sign-in, `loadProgress` returns nothing, so the guest save is offered: "Keep playing as Léa with this game?" On yes, the guest save is **copied** to the child's profile and uploaded; the guest profile is left untouched. Nothing is lost either way, and the guest profile is still there for anyone who never signs in.
- **A child who has played elsewhere.** `loadProgress` returns their save; it becomes active. The device's guest save stays as the guest profile. If the device's save is newer than the server's, the child is asked which to keep, defaulting to the server's, and the device's is preserved as a backup profile rather than discarded.
- **Two children, one device.** Each child's profile is keyed by their `userId`, so switching profiles switches saves. The guest profile is never overwritten by a signed-in child.

### What happens offline

- **Every press still writes locally first.** The dispatcher's write to the persisted store is unchanged, so a move is durable the instant it is made, connection or no connection.
- **A new `Logic/Sync` component** subscribes to `gala.save`. On a change it marks the active profile `dirty` and schedules a debounced push — about two seconds after the last change, and immediately on `visibilitychange` and `pagehide` so a closed tab still flushes.
- **The push** calls `saveProgress(saveJson, baseRevision)`. On success it stores the new `revision` and clears `dirty`. On failure — offline, a 5xx, a timeout — it keeps `dirty` and retries with backoff, and again on the browser's `online` event.
- **At startup**, the local save is loaded first and the game opens immediately, exactly as today. If a child is signed in, `loadProgress` runs in the background: a newer server revision is adopted only when the local profile is not `dirty`; a `dirty` local profile is kept and pushed. **A failed fetch never blanks the game** — the same principle as the existing 4-second timer.
- **A conflict** (two devices, both changed) is last-write-wins, which is the right call for a children's game, but it is made non-destructive: the server copies the row it is about to overwrite into `ProgressBackup` first and reports `conflict: true`, so the other device's game can be recovered.

### The order of work

1. **Backend.** Provision a backend here (`provision_backend`), add `Progress`, `Child` and `ProgressBackup` with their columns, create the `child` role, lock the collections, and write the six function call rules into `nodegx.security.json`.
2. **The progress functions.** `loadProgress` and `saveProgress` first, because everything else depends on them. Test them against the running backend before any UI exists.
3. **The client sync.** `mendProfiles` in `scripts/game/save.js`; a new `scripts/game/sync.js` (dirty flag, debounce, retry, conflict); a new `Logic/Sync` component; wire it into `Logic/Start Up` and `Game/Dispatcher`.
4. **The migration.** The one-time envelope migration in `su_open`, with the old key preserved.
5. **Sign-in UI.** A `Pages/Profiles` page (or a panel on the game page) with the picker and the child sign-in, wired to `LogIn` / `LogOut` / `User`.
6. **Grown-up provisioning.** `createChild`, `listChildren`, `resetChildPassword`, `deleteChild`; the "Children" section on `Pages/Grownups`; the additions to `scripts/view/grownups.js`.
7. **The workflows.** `family-setup` and `progress-backup`, with their triggers.
8. **Verification.** The checks in part 3.

### What could go wrong

| Risk | What it would look like | What to do about it |
|---|---|---|
| Last-write-wins clobbers a child's game | Two devices used at once; the older game vanishes | Copy the row to `ProgressBackup` before every overwrite; report `conflict` so the UI can say so |
| A failed load blanks the game | The child opens the app offline and sees a fresh school | Local-first: the game opens from `localStorage`; the server is reconciled afterwards, never awaited |
| The first sign-in destroys device progress | A child signs in and their guest game is gone | Profiles: the guest save is copied, not moved; the guest profile is never overwritten |
| Two children share a device and see each other's game | Sibling taps their name and finds the other's school | Profiles keyed by `userId`; the picker requires the child's own password |
| A child's save grows without bound | A record or a request rejected, or a slow sync | Cap the save size server-side; the save is a few KB today |
| Clock skew orders saves wrongly | The "newer" save is the older one | Order by the server's `updatedAt`, never the client's |
| A child reaches another child's progress | A crafted call to `loadProgress` | The function reads the caller's own id from the request, never a parameter; `Progress` is `nobody` for direct access |
| A child creates their own account | Self-registration bypasses the grown-up | Keep `SignUp` for the grown-up; children are created only by `createChild` (`role:grownup`) |
| A second grown-up cannot administer | The other parent signs in and sees nothing | Known limitation of `claimGrownup` (first account only); note it, and treat "invite a second grown-up" as out of scope |
| The content layer is shared across families | Two families on one deployment share renamed steps and prices | `GameChange` is global by design; `Child` and `Progress` are scoped by `familyId`/`userId`. Note it; a per-family content layer is out of scope |
| The 3D stage re-syncs on every change | The stage stutters while a child plays | Keep sync separate from the stage's `syncKey` and debounce it |
| Signing in mid-game leaves stale screen state | The tab shows the previous child's selection | Reset `ui` to `UI0` when a profile is adopted, as `nextSeason` does |
| The session does not survive a reload | The child re-signs in every time | Check it early (part 3); if it does not, add a remembered-device token |

---

## 3. What I would check to know it works

**The pure parts, by test.** New functions — `mendProfiles`, the "which save is newer" comparison, the dirty/debounce decision — get tests in the style of `gala-rules/tests/*.test.mjs`, run with `node --test`. The existing suites must still pass:

```
cd gala-rules && npm test
node tools/check-rules.mjs     # the copied rules still play the same evening
node tools/check-views.mjs     # every view and action still runs
node tools/sync-rules.mjs && node tools/sync-check.mjs   # no drift in the generated files
```

**The backend, by inspection.** `list_backend_roles` shows `child`; `get_backend_permissions` shows `Progress`, `Child` and `ProgressBackup` locked; `list_backend_workflows` shows `family-setup` and `progress-backup`; `query_backend_audit` shows the writes; `export_backend_collection` on `Progress` returns the rows.

**The screens, by render.** `render_report` on the new page and on `/Pages/Grownups`, reading its verdict and numbers.

**The feature, by driving it** — one acceptance criterion at a time, with `drive_page` from the app's start page:

1. **Never signs in.** Play as a guest, make progress, reload. The game is where it was left.
2. **The grown-up sets a child up.** Sign in as the grown-up, add a child, see the child in the roster.
3. **First sign-in keeps device progress.** Play as a guest, sign in as the new child, confirm the guest game is offered and kept.
4. **Another device.** In a second browser context (or after clearing storage), sign in as the same child and find the same save.
5. **Two children, one device.** Sign in as each in turn; each sees their own school, and neither sees the other's.
6. **Offline.** With the network off, make a change; the change survives a reload; turn the network on and confirm the server has it.
7. **A drop mid-game.** Stop the backend mid-session; the game keeps working; restart it and confirm the save syncs.
8. **A conflict.** Change the same child's game on two devices; the later write wins and the earlier is in `ProgressBackup`.

**The one thing I would check first, because it changes the design.** Whether the NodeGX user session survives a page reload. If it does not, a child re-signs in on every visit, and the remembered-device token moves from "optional" to "needed".

---

## 4. How I found my way around

**What was easy.** The folder is well organised and honest about itself. `app/` is the NodeGX project, `gala-rules/` is the original rules with tests, `tools/` is the author's own sync and check scripts, and the script files carry header comments that say what they are and where they came from. The generated files announce themselves ("GENERATED from `gala-rules/src/plan.js` by `tools/sync-rules.mjs` — do not edit here"), which is the single most useful convention in the project. The component labels are descriptive ("The grown-ups' changes", "Open the save", "The game may draw"), so the startup graph reads almost as prose. `AGENTS.md` and `CLAUDE.md` explain the NodeGX workflow.

**What was hard.** The save is a single opaque JSON blob with no schema document; I reconstructed its shape from `fresh()` in `scripts/game/save.js` and `defaultPlan()` / `defaultSchool()` in `scripts/rules/plan.js`, and I would not swear to every field. The relationship between `gala-rules/src` (the source) and `app/scripts/rules` (the copy) is only discoverable from the sync script headers. The `GameChange` layer is for grown-up *content*, not child progress, and at first glance it looks like a progress store — that mistake would have sent the whole plan wrong. The `__cloud__` functions are dense: a pasted checker, explicit port declarations, and `runOnChange-*` flags that matter. `Logic/Start Up` is one long graph whose startup order is subtle. The 3D stage (`scripts/stage/*`, about 1,200 lines) is large and generated.

**Where I am unsure of what I wrote.**

- Whether the NodeGX user session persists across a reload. This decides whether a child signs in once or every time.
- The exact parameters of `noodl.cloud.createuser`, `updateuser` and `deleteuser`. I inferred them from the node summaries; they need checking against `get_node_type` before `createChild` is written.
- Whether a `DbCollection2` in a cloud function can filter by the caller's id reliably. The doctrine says to use a plain String and `equal to`, which is what I planned, but I have not run it.
- Whether `apply_backend_schema` is the right way to add the three collections, or whether `provision_backend`'s `collections` argument is enough on a backend that already exists.
- The size limit on a save and on a record. I assumed a few KB is safe and proposed a cap, but I did not find the real limit.
- Whether a workflow can be invoked directly from the app. I assumed not, and reached it through a `db-change` trigger instead; if it can, `family-setup` could be called straight from `createChild`.
- Whether the preview backend (`npx @nodegx/preview`) is the same backend the app would deploy against, which affects how the checks in part 3 are run.
- `reference/` is missing from this handover, so `tools/sync-stage.mjs` cannot be re-run here. `tools/sync-rules.mjs` and `tools/sync-check.mjs` read `gala-rules/`, which is present, so those two still work.
- Whether `net.noodl.user.User` exposes `roles` in the browser. `Pages/Grownups` wires `gp_userNode.roles`, so it probably does, but I did not confirm it.
