# PLAN — Children sign in online and keep their progress

Status: plan only. No code has been written. The only file added to the folder is this one.

---

## 1. How the game works today

### 1.1 What it is

**Le Gala de danse** is a management/puzzle game that runs in the browser. It's in French by default, with an English toggle. The player runs a dance school (shown as "École de danse Étoile" until they rename it) and prepares its end-of-year gala:

- the running order;
- each number's formation and choreography, built from blocks of steps chained together;
- costumes and hairdos;
- the dressing-room furniture;
- the snack table ("goûter");
- the car park, from season 2.

A **general rehearsal** (`mode: 'rehearsal'`) is free and can be run as often as the player likes. A **try-out** (`mode: 'try'`) rolls fresh dice for one number. The **gala** (`mode: 'gala'`) is played once per season and earns stars ⭐. Stars buy items in the shop. Then a new season starts and adds new classes: the teens in season 3, the mums in season 4.

The whole evening is computed in advance by a pure function, `simulate()` in `src/engine.js`. The 3D view (three.js) only replays that result.

Words that mean something specific in this code:
- **"school"** means the *in-game* dance school (`G.S.school`), not a real school.
- **"she"** in the comments is the player.
- **"grown-ups"** are the adults who can change the game's rules behind a gate.

### 1.2 How it is put together

- **No build step.** `index.html` loads `src/main.js` as an ES module. three.js is vendored in `vendor/` and wired in through an import map. Fonts come from Google Fonts.
- **`serve.mjs`** is a tiny Node HTTP server (`npm start`, port 5173). It does two things:
  - It serves the folder as static files.
  - It exposes exactly two JSON endpoints, `/api/settings` and `/api/save`. These read and write `settings.json` and `save.json` in `~/.gala-de-danse` (or `$GALA_DIR`), outside the game folder, so a new version of the folder doesn't wipe them. Writes go to a temp file first and are then renamed into place. Bodies are capped at 100 KB.
- **The server is deliberately local-only.** It listens on `127.0.0.1`, and `api()` returns 403 unless the `Host` is `localhost`/`127.0.0.1` and any `Origin` is the same local port. Today's "server" is a file-keeper for one machine. It is not an online backend. If the game were hosted on a public domain as it is, every `/api/*` call would get a 403 and the game would quietly fall back to the browser's copy.
- **Modules** (all in `src/`):

| File | Role |
|---|---|
| `main.js` | Start-up sequence, the frame loop, pointer and keyboard input, and `window.__game` (the handle the browser tests drive). |
| `state.js` | `G`, the single shared object (`G.S` is the save; the rest is screen state). Also the **save**: `fresh`, `mend`, `fromRound1`, `load`, `save`, `resetAll`. |
| `store.js` | The client for the two local files: `getFile`, `putFile` (debounced, last version only), `flush`, plus a `pagehide` keepalive flush. |
| `ui.js` | The side sheet (tabs, shop, notebook, results). Every edit goes through `changed()` → `save()`. Also `buy`, `beginRun`/`finishRun`/`stopRun`, `nextSeason`, `showIntro`. |
| `play.js` | Plays back a simulated day (`startRun`, `stepRun`, the dancers). |
| `engine.js` | `simulate()`: pure, deterministic for a given seed. |
| `plan.js` | Pure: `defaultPlan`, `defaultSchool`, `numberPlan`, `migrateNumber`, `addSeasonNumbers`. |
| `data.js` | Every row of game data (moves, outfits, classes…), `seasonRules`, `START`, `applyRows()`. `applyRows()` **mutates these module-level tables in place**. |
| `settings.js` | Pure: the grown-ups' settings schema, `sanitize`, `applySettings`. `serve.mjs` also uses it. |
| `grownups.js` | The grown-ups' settings screen behind the gate (hold ⚙️ for 2 s, then answer a multiplication), plus `loadSettings`. |
| `words.js` | `clean()`/`isRude()`: the filter for rude words and markup that every free text goes through. |
| `i18n.js` | All the French and English text. |
| `world.js`, `people.js`, `music.js`, `tunes.js` | 3D scene, dancers, synthesised music. |

- **Tests.** `npm test` runs 39 Node unit tests: engine, settings, save migration, word filter, music. **All 39 pass** (I ran them). `npm run check` runs Playwright browser specs: settings, persistence, and a one-minute "monkey" test. I did not run these because Playwright isn't installed here. The tests are numbered after the lines of a spec called "change 001". That spec isn't in the folder; `helpers.mjs` expects a `changes/` directory that doesn't exist.

### 1.3 The parts this feature touches, in detail

**The save document, `G.S`** (`state.js` `fresh()`):
```
{ v: 2, at, lang, season, galaDone, seenIntro, sound, seed,
  plan:   { start, interval, order[], numbers{ id: {A, B, blocks[], chain[], costume} }, hair{}, snack, cakeG, bottles, crepes, compotes, parking{}, backdrop },
  school: { name, logeCols, stars, earned, owned{}, upgrades{}, furniture[] },
  notebook: [ {season, at, points, satisfaction, nums{}} ] }
```
- A fresh save is about 3 KB. It grows only through `notebook`, by one entry per gala.
- It mixes three kinds of data:
  - **progress**: `season`, `galaDone`, `stars`, `earned`, `owned`, `upgrades`, `notebook`;
  - **the player's design work**: `plan`, `furniture`, `name`;
  - **per-player preferences**: `lang`, `sound`, `seenIntro`.
- Each player needs their own copy of all three.

**Where the save lives and how the two copies are reconciled** (`state.js`):
- `localStorage['gala-game-v2']`. On load, round 1's `gala-toy-v1` is migrated by `fromRound1`.
- `save.json` on the local server.
- `load(remote)` mends both copies, then keeps the one with the larger `at`. `at` is `Date.now()` from the **client's clock**. The loser is **discarded**, and the winner is written back to the other place.
- `save(at = Date.now())` stamps `at`, writes `localStorage` **synchronously**, then calls `putFile('save', G.S)`, which sends the whole document after 300 ms. Only the last version is sent; there is no retry.
- If a PUT fails, nothing remembers that it failed. The next edit simply sends the whole document again.

**Where `save()` is called.** Every player action saves at once:
- `ui.js` `changed()`, which every stepper, drag, buy, costume and formation edit goes through;
- the school-name input;
- `finishRun()` when a gala ends: stars are added and a notebook entry is written;
- `nextSeason()`;
- `showIntro()`, which records `seenIntro`;
- `main.js`, for the language and sound buttons;
- `resetAll()`, from the notebook's "reset" button and from the grown-ups' "Start a new school".

**What a "game in progress" is.**
- A run (`G.run`) is never saved. It is replayed from `simulate()`.
- The gala uses the season's stored `seed`, so it is reproducible. If the page dies mid-gala, `galaDone` is still `false`. Replaying gives exactly the same result, because the plan and the seed haven't changed.
- The only gala result that matters is written in `finishRun()`.
- A run needs no network at all. So "connection drops in the middle of a game" really means: edits made while offline must reach the server later, and a page reload while offline must still work.

**Start-up order** (`main.js`, top-level `await`):
1. `loadSettings()` (`grownups.js`) and `getFile('save')` run in parallel.
2. `applySettings()` lays the grown-ups' rows over `data.js`.
3. `load(saved)` opens the save **against those rows**.
4. The world is built from `G.S`.

There is no notion of "who is playing". `G.S` is global, and many modules read it while building the scene (`buildDancers`, `refreshWorld`). Today the only way to swap the whole state cleanly is a reload; `closeSettings()` already does exactly that.

**The grown-ups' settings and why they matter here.**
- The settings are rule overrides: renamed steps, prices, up to 12 new steps or costumes (`new1`…`new12`), starting stars.
- They are stored per machine in `settings.json`, with a browser copy in `gala-settings-copy`.
- **`mend()` is destructive with respect to them.** If a save points at a costume, shoe, accessory, step or hairdo that isn't in the *current* rows, `mend()` replaces or removes it, and the next `save()` writes that repaired copy back.
- So if a child's save that uses costume `new3` opens on a device whose settings don't define `new3`, the child loses that costume choice for good. That's harmless on one machine. It's a real data-loss path once a save travels between devices.

**The gate.**
- The settings sit behind a long press plus a sum (`openGate()`). The sum is between 12×3 and 19×9: fine to stop accidents, but not real protection from a 12-year-old.
- There are no accounts, passwords or identities anywhere in the code today.

---

## 2. The plan

### 2.1 Decisions in one place

1. **Identity is a family account, owned by a grown-up**, with **child profiles** inside it.
   - Only the grown-up has an email address and a password.
   - Children have a display name, an avatar and an optional **picture code** (pick 3 of 9 pictures). Children never have an email address or a password.
2. **A device is "linked" to a family once, by a grown-up**, either by signing in on it or with a **family sign-in code** they hand to the child. After that, children on that device pick themselves from a "Who's playing?" screen.
3. **Each profile has its own save slot on the device and its own save on the server.** The existing anonymous save stays where it is as the **guest** slot. Playing without signing in works exactly as today.
4. **The device's copy is what the game plays from; the server copy is the shared, durable one.** Every edit is stored on the device first, synchronously, as today. A small outbox sends it when it can.
5. **The server stops using last-write-wins on client clocks.** Saves get a server-issued **revision number**, with optimistic concurrency.
   - If two devices really diverged, the game keeps the one that is further along (by season and gala progress) and records the other in a **history** a grown-up can restore.
   - When the two are equally far along, the child chooses between two "school cards".
   - Nothing is ever silently thrown away.
6. **The grown-ups' settings move into the family account** when a family is signed in, so a child's custom costumes and steps travel with them. Guests keep today's per-machine settings.
7. **The backend is a new, separately hosted service.** `serve.mjs` stays the local, offline-capable way of running the game, unchanged in behaviour, so the existing persistence tests keep their meaning.

### 2.2 The backend

**Shape.** A Node service in a new `server/` folder, in the same style as `serve.mjs`: plain `node:http`, few dependencies. It sits behind HTTPS on a public domain, for example `gala.example` for the game and `api.gala.example` or `/v1/` on the same origin.
- It serves the game's static files (the same files as today) and a JSON API under `/v1/`.
- Storage is **managed PostgreSQL**, so backups and point-in-time recovery come with the service. The data is tiny, a few KB per child, so any small instance will do.
- Dependencies: `pg` and an argon2 library for password and code hashes.
- It reuses the game's pure modules: `settings.js` `sanitize()` and `words.js` `clean()`, as `serve.mjs` already does.
- **It can't reuse `mend()`.** `mend()` depends on `data.js`'s module-level tables, which `applyRows()` mutates, and the server would need different rows for each family. The server therefore does a **structural** validation of saves (described below) and leaves the game-rule repair to the client.

**Tables** (names are illustrative):

| Table | Columns | Notes |
|---|---|---|
| `families` | id, created_at, locale, consent_at, consent_version, family_code_hash, family_code_set_at, deleted_at | One per household. Records the consent the grown-up gave at sign-up. |
| `grownups` | id, family_id, email (unique, lowercased), email_verified_at, password_hash (argon2id), created_at, last_login_at | Only grown-ups have emails. Allow 2 per family (both parents) later; build for 1. |
| `grownup_sessions` | id, grownup_id, token_hash, created_at, expires_at | For the family pages. |
| `children` | id, family_id, display_name, avatar, picture_code_hash (nullable), created_at, archived_at | `display_name` goes through `clean()`, max 16 characters. No surname, no birthday, no school name. We don't need them, so we don't collect them. |
| `devices` | id, family_id, token_hash, kind (`family`/`shared`), label, created_at, last_seen_at, revoked_at | One row per linked browser. |
| `child_sessions` | id, child_id, device_id, token_hash, created_at, expires_at | Only used on `shared` devices (see 2.4). |
| `saves` | child_id (PK), rev (int), doc (jsonb), doc_v (int), updated_at (server time), updated_by_device, size_bytes | Current save per child. |
| `save_history` | id, child_id, rev, doc, reason (`superseded`/`conflict-loser`/`guest-replaced`/`reset`/`restored`), created_at | Every overwritten version goes here first. |
| `family_settings` | family_id (PK), rev, doc (jsonb, `{v:1, rows}` as `settings.js`), updated_at | Grown-ups' rule overrides for the family. |
| `email_tokens` | id, grownup_id, purpose (`verify`/`reset`/`change-email`/`delete`), token_hash, expires_at, used_at | Single-use, hashed. |
| `audit` | id, family_id, what, at, ip_hash | Sign-ins, device links and revokes, restores, deletions. Minimal, for support. |

Pruning rules:
- `save_history` is pruned to the last 30 versions per child, or 90 days, whichever keeps more.
- Conflict losers and replaced guest saves are kept for 180 days.

All tokens are random (at least 128 bits) and are stored **hashed**. Codes and picture codes are hashed with argon2.

**Validating a save on the server.** Today's `keep()` only checks `o.v === 2`. The new check:
- object, `v === 2`, at most 100 KB;
- the known top-level keys, with the right types;
- `season` an integer from 1 to 99;
- `stars` and `earned` clamped the way `mend()` clamps them (0–999999);
- `school.name` and block names run through `clean()`;
- `notebook` at most 200 entries.

Unknown keys are dropped. A `v` higher than the server knows is refused with 422, so an old server never overwrites a newer format.

**API** (JSON; bearer tokens in an `Authorization` header — see 2.7 for why not cookies):

| Who | Endpoint | Does |
|---|---|---|
| grown-up | `POST /v1/signup` | email, password, locale, consent tick → family + grown-up; sends a verification email |
| grown-up | `POST /v1/verify-email`, `POST /v1/login`, `POST /v1/logout`, `POST /v1/password-reset`, `POST /v1/password-reset/confirm`, `POST /v1/change-email` | account basics |
| grown-up | `GET/POST/PATCH/DELETE /v1/children[/:id]` | add, rename, change avatar, set or clear the picture code, archive |
| grown-up | `POST /v1/devices` | "link this device" → device token (`kind: family`) |
| grown-up | `POST /v1/family-code` | (re)generate the family sign-in code; the old one stops working |
| grown-up | `GET /v1/devices`, `DELETE /v1/devices/:id` | see and revoke linked devices |
| grown-up | `GET /v1/children/:id/history`, `POST /v1/children/:id/restore {rev}` | see and restore earlier versions of a child's school |
| grown-up | `GET /v1/export`, `POST /v1/delete-family` (confirmed by email) | data export and deletion |
| device | `POST /v1/devices/redeem {familyCode}` | link a device with the code → device token (`kind: shared` unless a grown-up has upgraded it) |
| device | `GET /v1/profiles` | the family's children: id, name, avatar, hasPictureCode |
| device | `POST /v1/children/:id/unlock {pictureCode?}` | on `family` devices: just checks the code; on `shared` devices: returns a child session |
| child | `GET /v1/children/:id/save` | `{rev, doc, updatedAt}`, or `{rev: 0, doc: null}` when there is none yet |
| child | `PUT /v1/children/:id/save {baseRev, doc, editedAt, reason?}` | if `baseRev === rev`, stores it, writes the old version to history, returns `{rev}`; otherwise **409** with `{rev, doc, updatedAt}` |
| child | `GET/PUT /v1/family/settings {baseRev, doc}` | family settings; the PUT needs a **grown-up** session |

Abuse limits:
- `redeem`, `unlock` and `login` are rate-limited per IP and per target. For example: 5 wrong picture codes lock that child for 15 minutes on that device; 10 wrong family codes per IP per hour.
- Every child-scoped query checks `child.family_id === device.family_id`. A child id from another family gets 404, not 403.

**Server-side workflows** (scheduled jobs and email):
1. **Verifying the email at sign-up.** A child profile can't be created until the email is verified. This proves a reachable grown-up exists.
2. **Password reset** and **change of email.** The change-of-email link goes to the new address, and a notice goes to the old one.
3. **Recording parental consent.** At sign-up the grown-up agrees to a short notice about what is stored: profile name, avatar, game progress, device list. That agreement is the parental consent, which France and the EU require for under-15s (GDPR art. 8). Its version and timestamp are stored. A changed notice triggers a re-consent prompt at the next grown-up sign-in.
4. **Exporting data** (JSON of every child's save and the settings) and **deleting the family**. A deletion confirmed by email soft-deletes at once (no more sign-ins) and hard-deletes after 30 days, history and backups following their own retention.
5. **Removing inactive families.** After 24 months without any sign-in, the grown-up gets a warning email. Without a response, the family is deleted 30 days later.
6. **Nightly pruning** of `save_history`, expired tokens and sessions, and old audit rows.
7. **Monitoring**:
   - error rate;
   - share of save PUTs answered with 409, a signal of a sync bug;
   - save sizes;
   - failed unlocks, a signal of abuse;
   - email bounces.
8. **Backups**: the managed point-in-time recovery, plus a restore drill before launch.

Transactional email goes through a provider hosted in the EU, with templates in both French and English (the same two languages as `i18n.js`).

**Family pages.** The grown-ups' side of the account (sign up, children, codes, devices, history, export, delete) is a separate page in the game's folder, `famille.html` + `src/family.js`. It reuses `i18n.js`, `esc()` and `words.js`, and is reachable from the account menu (2.4). It needs a real grown-up sign-in, not the multiplication gate.

### 2.3 What changes in the game, file by file

New client files:
- **`src/account.js`**:
  - the profile model on the device: linked family, known profiles, active profile;
  - the "Who's playing?" screen;
  - the picture-code pad;
  - "link this device" (grown-up sign-in or family code);
  - sign out;
  - the small sync-status chip;
  - the first-sign-in "is this your school?" flow (2.5).
- **`src/sync.js`**:
  - the outbox and revision logic for one profile's save and the family settings;
  - retry with backoff;
  - reacting to `online`, `visibilitychange` and `pagehide`;
  - the conflict rule (2.6) as a **pure function**, `resolve(local, server)`, so it can be unit-tested in Node like `engine.js`.
- **`src/config.js`**: the API base URL. It is empty when running locally, which means "accounts unavailable unless configured" (2.8).
- **`sw.js`** (service worker, at the root): caches the app shell (`index.html`, `style.css`, `src/*`, `vendor/*`, self-hosted fonts) under a versioned cache name, so the game **reloads while offline**. This is needed because switching profiles reloads the page.
- **`famille.html`, `src/family.js`**: the family pages.
- **Fonts**: self-host Fredoka, Nunito and Playball in a `fonts/` folder instead of loading them from Google. This lets them load offline. It also stops sending children's IP addresses to a third party.

Changed files:
- **`src/state.js`**:
  - **Slots.** `SAVE_KEY` becomes a function of the active profile. The guest keeps the existing key `gala-game-v2`, so **no existing player's data moves or changes**. Each profile uses `gala-p:<childId>`, holding `{ doc, rev, dirty, editedAt, settingsRev }`.
  - **`load()`** takes `{ slot, remote }`. For a profile, `remote` is `{rev, doc}`. The rule "larger `at` wins" applies to the guest and the local `save.json` only. Profiles use `sync.resolve()`.
  - **`save()`** writes the slot synchronously as today, sets `dirty: true` and `editedAt: Date.now()`, then calls `sync.schedule()` for profiles or `putFile('save')` for the guest.
  - **`mend()` must stop destroying data that comes from elsewhere.** It tracks whether it changed anything (`mend(s) → { save, repaired: [...] }`). `load()` must **not upload** a save that `mend()` repaired because a row was missing, unless the settings in use are the family's current settings (same `settingsRev`). The original is also kept in the slot as `unmended` until the next successful sync with matching settings. This closes the data-loss path described in 1.3.
  - **`resetAll()`**: for a profile, the server copy goes to history (`reason: 'reset'`) before the fresh save replaces it.
- **`src/store.js`**: unchanged for the local server's `settings`/`save`. Its debounce and `flush` pattern is reused in `sync.js`. The `pagehide` keepalive flush covers the profile outbox too.
- **`src/main.js`**, start-up becomes:
  1. Read the device record (`gala-device`) and the active profile (`gala-active`).
  2. If the device is linked and has several profiles and none is active, show **Who's playing?** before building the world.
  3. Settings:
     - for a profile: the family settings (fetch them, falling back to the cached `gala-fs:<familyId>`);
     - for the guest: `loadSettings()` as today.
  4. `applySettings`.
  5. Open the slot (`load`).
  6. Build the world.

  Add the account button handler. Expose `account` and `sync` on `window.__game` for the browser tests, the same way `settings` is exposed today.
- **`index.html`**:
  - an account button in `#top`, showing the active child's avatar or 👤 for the guest;
  - register `sw.js`;
  - point the font links at `fonts/`;
  - a strict Content-Security-Policy `<meta>`, since tokens will live in `localStorage` (see 2.7).
- **`src/grownups.js`**:
  - When a family is signed in, the settings screen edits **family settings**: `putFile('settings')` becomes `sync.putSettings()`. A grown-up sign-in is required instead of the sum; the sum gate stays for guests.
  - "Start a new school" only resets the **active profile**.
  - On the first grown-up sign-in on a machine whose local `settings.json` or `gala-settings-copy` isn't empty, offer: "Use these settings for the whole family?"
- **`src/ui.js`**:
  - `finishRun()` (a gala result) and `nextSeason()` call `sync.flushNow()` after `save()`. These are the moments that matter most, so we don't wait for the debounce.
  - The notebook's reset button says whose school is reset.
  - The status chip is painted in `hud()`.
- **`src/i18n.js`**: every new string, in French and English. The child-facing text is short and calm: "Saved on this tablet — will go online later", not "Sync error".
- **`style.css`**: the profile picker, picture pad, account menu and status chip, laid out for phone and tablet like the existing `#grown`/`#gate` panels.
- **`serve.mjs`**: no behaviour change. It serves the new static files (`sw.js`, `fonts/*.woff2`); add `.woff2` to `TYPES`.
- **`package.json`**: `server/` scripts (`server:dev`, `server:test`, `migrate`).

### 2.4 How a child signs in

**Setting up (grown-up, once per family).**
1. Sign up on the family page with email and password, accept the consent notice, and click the verification link.
2. Add each child: a display name (filtered, for example "Lina"), an avatar picked from the game's emoji set, and optionally a picture code (3 of 9 pictures in order).
3. The page shows the **family sign-in code**: about 12 characters in three easy-to-type groups with no ambiguous letters, e.g. `ROSE-7K4P-TUTU`. It also shows a printable **sign-in card**: the code, a QR code, and each child's avatar.

**On the family tablet or home laptop** (a `family` device):
1. The grown-up opens the game, taps the account button → "Grown-ups: link this device", and signs in.
2. The device receives a long-lived device token. The grown-up session itself isn't kept on the device.
3. From then on, the game opens on **Who's playing?**: one big button per child, plus "Play without signing in". The child taps their avatar and enters their picture code if they have one. Their game opens exactly where they left it.
4. Switching child: account button → "Change player". The current save is flushed, `gala-active` is set, and the page reloads; reloading is the existing way to swap all of `G`.

**On a school laptop or a friend's device** (a `shared` device, no grown-up present):
1. The child taps the account button → "Sign in" and types the family code from their card, or scans the QR code.
2. They pick their avatar and enter their picture code.
3. The device is linked as `shared`:
   - only that child is shown on it, not their siblings;
   - their session lasts until "Sign out" or 8 hours, whichever comes first;
   - `gala-active` is kept in `sessionStorage`, so closing the browser ends it.
4. **Signing out on a shared device** first flushes the outbox.
   - If everything reached the server, the profile's local slot and token are removed, so the next child at that laptop sees nothing of theirs.
   - If something is still unsent (offline), the game says so plainly ("Your last changes haven't gone online yet. Stay signed in until the cloud turns green?") and offers "Sign out anyway". Signing out anyway keeps the unsent slot locked on the device, to be sent the next time that child signs in there or the next time the device is online with that token. It is **not** deleted.

**Security, stated honestly.**
- The picture code protects siblings from each other. It isn't strong security.
- The real secrets are the device token and the family code (about 60 bits of randomness, rate-limited).
- A grown-up can regenerate the family code and revoke any device from the family page. A lost or leaked card is fixed in one click.

**Why not a separate code per child?** Possible, but one family code plus picture codes keeps one card per family and makes the grown-up's side simpler. If teachers ask for it, per-child codes can be added later with the same `redeem` endpoint.

### 2.5 What happens to the progress already on a device

There are three places today's progress can be:
1. this browser's `gala-game-v2`;
2. the local server's `save.json`, for people running `npm start`;
3. the older `gala-toy-v1`, already migrated by `fromRound1`.

`load()` already merges 1 and 2 into the guest save.

Rules:
- **Nothing moves until someone signs in.** The guest slot keeps working as before, for anyone, forever.
- **The first time a profile is opened on a device that has guest progress** (the guest save isn't `fresh()`: season > 1, notebook not empty, or a plan different from the default), the game shows the guest school as a card: name, season, stars, last played. It asks "Is this your school?":
  - **Profile has no server save yet** (the usual case at launch):
    - "Yes, it's mine" → the guest save becomes the profile's first save (`PUT` with `baseRev: 0`).
    - "No" → the profile starts fresh.
  - **Profile already has a server save** (the child played elsewhere): two cards side by side, "on this device" and "online", and the child picks which school to continue. The other is **kept**:
    - uploaded to `save_history` with `reason: 'guest-replaced'`, if it is the guest school;
    - or already in history, if it is the online one.

    A grown-up can bring it back from the family page.
- **After a "Yes"**, the guest slot isn't deleted straight away. It is renamed to `gala-claimed:<childId>` and stays 30 days as an extra safety copy. The guest slot is then empty, so a **sibling** signing in on the same device isn't offered the same school a second time.
  - The claim is recorded in the device record. A grown-up who thinks the wrong child claimed it can move it from the family page, because the history keeps it.
- **Different web address.** Players who use the local `npm start` version play at `http://localhost:5173`. The hosted game is at a different address, and browsers keep `localStorage` separate per address, so **the hosted site can't see the local progress**. Two ways across, both planned:
  - **Sign in from the local version.** `config.js` points the local game at the hosted API (CORS allowing `http://localhost:*` and `http://127.0.0.1:*`, bearer tokens rather than cookies). The child signs in there once, the "Is this your school?" flow uploads it, and from then on they can play anywhere.
  - **"Save my school to a file / Load from a file"** for the save, mirroring what `grownups.js` already does for settings. It's the fallback when nothing else works, and it's cheap.

### 2.6 What happens offline, and how the copies are reconciled

**Principle:** the device's slot is always written first and synchronously (as today), so **nothing the child does depends on the network**. The network only spreads what's already saved.

**The outbox.** Each profile slot carries `{ rev, dirty, editedAt }`.
- `save()` sets `dirty`.
- `sync.js` sends after 300 ms of quiet (as `putFile` does today), at once after a gala or a new season, and on `pagehide`/`visibilitychange → hidden` using `keepalive` (saves are well under the 64 KB keepalive limit).
- Failed sends retry with backoff (2 s, 5 s, 15 s, 60 s, then every 5 minutes) and immediately on the browser's `online` event.
- Because `dirty` lives in `localStorage`, **a reload, a crash or a closed tab doesn't lose the fact that something is waiting**. The next start sends it.

**Status chip** (in `#top`):
- ☁️✓ saved online;
- ☁️… sending;
- 📱 "saved on this device, will go online later".

It never shows an error to a child. If something has been waiting for over 7 days, it shows a gentle "ask a grown-up to connect" note.

**Reload or switching child while offline.** The service worker serves the app shell; the profile's slot and the cached family settings are local. So the game opens offline for any child who has already played on that device. A child who has **never** opened their profile on this device can't be fetched offline. They see "You need the internet the first time on a new device" and can play as guest.

**Mid-game.**
- A run is computed locally (`simulate()`) and needs no network. The gala result is saved locally in `finishRun()` at the moment it happens.
- If the tab is closed during the gala, before `finishRun()`, the gala hasn't counted yet. Because the season's `seed` is stored, replaying it gives exactly the same evening. Nothing is lost except the time spent watching.
- I wouldn't try to save a run in progress.

**Two devices that both changed (the conflict rule, `sync.resolve`).** A `PUT` with an out-of-date `baseRev` gets a 409 with the server's version. Then:
1. If the device's copy **isn't** dirty, take the server's copy. No conflict.
2. If both changed, compare **progress**: `(season, galaDone, notebook.length)`.
   - If one is strictly further along, it wins. A child who played their gala on the laptop and then opens the stale tablet sees the laptop's school; the tablet's edits go to history.
   - Copies are never merged field by field. Merging stars and purchases would let one gala count twice, or let one star be spent twice.
3. If both are equally far along (the usual case: tweaking formations in the same season on two devices), show the two **school cards**: "on this tablet, changed 10 min ago" and "online, changed yesterday on another device". The child picks one. The other goes to `save_history` (`conflict-loser`), and a grown-up can restore it. The default highlighted choice is "this device", since that's the one the child is looking at.
4. In every case the losing copy is sent to the server's history before being replaced, so a grown-up can always get it back.

**Clocks.** `editedAt` and `updatedAt` are only *shown* ("changed 10 min ago"). They never decide anything, because a school laptop's clock may be wrong. Revisions and progress decide.

**Several tabs on one device.** Two tabs playing the same profile would overwrite each other's slot. A `BroadcastChannel`/`storage` listener keeps **one active tab per profile**; the other shows "This school is open in another tab".

### 2.7 What could go wrong (and what the plan does about it)

| Risk | Consequence | Mitigation |
|---|---|---|
| `mend()` removes custom costumes/steps when a save opens under different settings | A child's design work disappears for good once it uploads | Settings travel with the family; never upload a save repaired under settings other than the family's; keep `unmended`; history (2.3, `state.js`) |
| Last-write-wins on client clocks (today's `at`) | A wrong laptop clock makes an old copy beat a new one | Server revisions plus the progress rule; clocks are display-only (2.6) |
| Progress at `localhost` is invisible to the hosted site | Existing players think their progress is gone | Sign in from the local version; save to a file; the release notes say how (2.5) |
| Safari/iPadOS deletes site storage after about 7 days without a visit (ITP), and private mode limits `localStorage` | The tablet forgets the device link and any **unsent** changes | Send early and often (gala and new season at once); call `navigator.storage.persist()`; suggest "Add to Home Screen" on the family page; the family code re-links quickly. Unsent changes older than 7 days on Safari remain a real (small) risk; the status chip and its note make it visible |
| A shared school laptop | Another child sees or plays someone's school | `shared` devices show one child, session-only, sign-out clears synced slots, 8-hour expiry, grown-up can revoke |
| A sibling plays the other's school | Annoyance, lost work | Optional picture code; history and restore |
| Wrong child claims the guest school | Progress ends up in the wrong profile | The question shows the school card; the claimed copy is kept 30 days; a grown-up can move it |
| Brute force on the family code or picture code | Someone gets into a family | Long random family code, rate limits, lockouts, audit, regenerate or revoke |
| Device token in `localStorage` read by injected script | Account access | No third-party scripts (fonts self-hosted), strict CSP, every name already escaped (`esc`) and filtered (`clean`); tokens are device-scoped and revocable. Cookies were rejected because the localhost version has to talk to the hosted API across sites |
| Profile switching reloads the page while offline | Blank page | Service worker app shell (2.3); test it |
| Stale cached client after a release (service worker) | An old client writes a save it doesn't understand | The save's `v` is checked both ways; the server rejects unknown `v`; the client refuses to overwrite a newer `v` and asks to refresh; the service worker updates on next start |
| A grown-up deletes a child or revokes a device while that device has unsent changes | Those changes have nowhere to go | Server answers 410; the device keeps the slot and offers to keep it as the guest school or save it to a file |
| Email delivery fails (spam, typo) | The family can't verify and is stuck | Resend, change email before verification, support mailbox; monitor bounces |
| Children's data protection (GDPR art. 8; COPPA if it reaches US players) | Legal exposure | Collect the minimum (no child email, real name or birthday); recorded consent from the grown-up; export and delete; retention limits; EU hosting; no analytics or ads; **a legal review before launch** |
| Free text from children (display and school names) | Rude or identifying names | Everything goes through `clean()` on client and server; display names are never shown to other families (there's no social feature) |
| The server gets a malformed or huge save | Storage abuse, crashes | Structural validation, 100 KB cap, rate limits per device |

### 2.8 Order of work

Each step leaves the game working and shippable.

1. **Safety net.**
   - Install Playwright and get `npm run check` green as it is today.
   - Add unit tests pinning today's `load()`/`save()` behaviour.
   - Make `mend()` report what it repaired, without changing behaviour yet.
2. **Several profiles on one device, no backend yet.**
   - Slots in `state.js`: guest = `gala-game-v2` unchanged.
   - The Who's playing? screen and the switch-by-reload in `account.js`.
   - The "Is this your school?" claim, offline-only.
   - This covers "two children on one device" and de-risks the riskiest client change before any server exists.
3. **Offline shell.** `sw.js`, self-hosted fonts, CSP; test reload and profile switching offline.
4. **Backend core.**
   - Database migrations;
   - signup, verify, login, reset;
   - children CRUD;
   - device link and redeem;
   - unlock;
   - save GET/PUT with revisions and history;
   - validation;
   - rate limits;
   - API tests.
5. **Family pages.** `famille.html`: account, children, family code and printable card, devices.
6. **Client sync.**
   - `sync.js` (outbox, backoff, `resolve()`);
   - wiring in `state.js`, `ui.js` (`finishRun`, `nextSeason`) and `main.js`;
   - the status chip.
7. **First sign-in with existing progress, online.** Claim and the two-card choice, history uploads, `localhost` → hosted via CORS and save to/load from file.
8. **Family settings.** Move `grownups.js` onto family settings, pin settings to the save, migrate local settings.
9. **Recovery and duties.** History and restore UI, export and delete, inactivity emails, pruning jobs, monitoring, backup restore drill.
10. **Hardening and launch.**
    - security review (tokens, CORS, CSP, rate limits);
    - legal review of the consent text;
    - test on real devices (iPad Safari, Android Chrome, a school Chromebook);
    - a usability session with a few 8–13-year-olds and their parents;
    - a staged rollout.

---

## 3. What I'd check to know it works

The existing tests are written as user stories numbered after a spec. I'd keep that style: name each test after the requirement it proves.

**Unit tests (Node, `tests/*.test.mjs`, alongside the existing ones):**
- `sync.resolve()`:
  - server newer and device clean → take the server copy;
  - device dirty, server unchanged → send;
  - both changed with different seasons → the further one wins and the other is marked for history;
  - both changed, same progress → "ask";
  - clocks set wildly wrong change nothing.
- Slots:
  - existing `gala-game-v2` and `gala-toy-v1` data opens unchanged as the guest;
  - a profile slot never reads the guest key;
  - two profiles never share a slot.
- `mend()` reports repairs; a save opened under foreign settings is not marked uploadable and keeps `unmended`.
- Server save validation: good saves pass unchanged (round-trip equal); oversized, wrong-type, unknown-`v`, rude-name and negative-stars saves are refused or cleaned; it never throws (mirroring `settings.test.mjs` test 15).

**Server tests** (`server/tests`, against a throwaway Postgres or test database):
- signup → verify → login; a profile can't be created before verification;
- PUT with a stale `baseRev` → 409 carrying the server copy; the old version is always in history;
- a device of family A asking for a child of family B → 404;
- rate limits and lockouts trigger;
- a revoked device → 401;
- a deleted child → 410;
- the deletion workflow removes everything after the grace period;
- an export contains every child's save;
- the pruning job keeps the stated minimum.

**Browser tests** (Playwright, like `001-persistence.spec.mjs`; each browser context stands for one device):
1. *A child signs in on a second device and finds their game exactly where they left it.* Device A: play, buy a costume, finish a gala, move a dancer. Device B (a fresh context): redeem the family code, pick the child. Compare `window.__game.S` deep-equal, except `at`.
2. *A grown-up sets up the family; the child has no email.* Run the whole sign-up through the family page with a fake mail sink.
3. *Two children on one device each keep their own progress.* Lina plays season 2; switch to Tom, who is fresh; switch back, and Lina is untouched; both are on the server.
4. *Playing without signing in still works.* Open the game; no sign-in screen appears for an unlinked device; all of today's tests still pass, including the monkey test.
5. *A child with progress on this device doesn't lose it when signing in for the first time.* Seed `gala-game-v2` with a season-3 save, link, pick the child, answer "yes" → the server has it. Repeat with a child who already has an online save → both copies survive (one current, one in history).
6. *A sibling isn't offered a school already claimed.*
7. *Connection drops mid-game.* `context.setOffline(true)` in the middle of edits, finish the gala, reload **while offline** (service worker), switch child offline, back online → the server has every edit, gala and notebook entry; nothing duplicated (stars counted once).
8. *Tab closed with unsent changes.* Go offline, edit, close the context's page, reopen online → sent.
9. *Two devices both offline, then both online.* Covers the progress rule, the two-card choice, and the history entry.
10. *Wrong clock.* Override `Date.now` in one context to a year earlier or later; its copy still neither wins nor loses because of it.
11. *Shared device.* Sign in with the code, sign out → no trace of the child in `localStorage`. Sign out with unsent changes → the warning appears and the slot is kept.
12. *Custom costumes survive travel.* A family setting adds `new3`, a child uses it on A, opens on B → still wearing `new3`; and the server copy is never stripped of it.
13. The **monkey test** extended with network flapping (random `setOffline`) and random profile switches: console clean and saves still open.

**By hand, before launch:**
- an iPad with Safari, including after 8 days untouched and in private mode;
- an Android tablet;
- a school-style Chromebook with a managed profile;
- one slow or flaky network (throttled).

**With people:**
- Can a grown-up set up two children in under 5 minutes?
- Can an 8-year-old sign in at a different computer with only the card?
- Do children understand the two-card choice?

**After launch, from monitoring:**
- the 409 rate stays low;
- no save is ever replaced without a history row (an alert if there's a mismatch);
- the age of the oldest unsent change per device, reported when the device syncs;
- failed unlocks per hour.

---

## 4. How I found my way around

**What I did.**
- Listed the files, then read all of `serve.mjs`, `index.html`, `package.json`, `state.js`, `store.js`, `main.js`, `settings.js`, `plan.js` and `grownups.js`.
- Read the parts of `ui.js`, `play.js`, `engine.js`, `data.js`, `music.js` and `i18n.js` that touch the save or a run.
- Read the save and persistence tests and the list of all test names.
- Ran `npm test` (39/39 pass) and measured a fresh save (about 3 KB).
- I didn't run the browser tests, because Playwright isn't installed, and I didn't want to write anything into the folder other than this file.
- I skimmed `world.js`, `people.js` and `tunes.js` only for what they import; they don't touch persistence.

**What was easy.**
- The code is small and each file opens with a comment saying what it is for. `state.js` and `store.js` explain exactly where the save lives and how the copies are chosen.
- The pure modules (`engine.js`, `plan.js`, `settings.js`, `words.js`) are separated from the DOM, and the tests are user stories. Both made the intent clear quickly.
- Every player action funnels through `changed()` → `save()`. That makes it easy to be confident that "the device copy is always current" is already true today, and it's the base the offline plan rests on.

**What was hard.**
- **The code is very dense**: many statements per line and short names (`G.S`, `sc`, `np`, `T`). It's readable, but it's easy to miss a side effect. For example, it's easy to miss that `load()` calls `save()`, and so uploads, whenever the browser's copy wins.
- **The spec the tests refer to ("change 001", lines 1–20) isn't in the folder.** `helpers.mjs` points at a `changes/` directory that doesn't exist. I worked out intent from test names and comments.
- **The vocabulary.** "School" means the in-game dance school, not the child's school, and "she" means the player. The grown-ups' "settings" are game-rule overrides, not preferences. I had to read `settings.js` and `data.js` `applyRows()` to see that settings *change the meaning of a save*. That is the source of the `mend()` risk, which I think is the least obvious problem in this plan.

**Where I'm unsure.**
- **How the game reaches players today.** The server only answers `localhost`, so I assume it's run from the folder on each computer with `npm start`. If it's actually hosted somewhere already (with `/api` simply failing), the "different web address" problem in 2.5 shrinks or changes shape. Before building step 7, I'd check with whoever deploys it.
- **Who the grown-ups' settings are for.** They could be a parent tweaking the game, or a dance or school teacher setting it up for a class. I've made them per family. If teachers are a real audience, a "class" or "group" layer may be wanted later, and the shared-device design (2.4) should then be reviewed with them.
- **The conflict rule's "further along" measure** `(season, galaDone, notebook.length)` is my judgment of what a child would call "more progress". It deliberately ignores stars and purchases. It should be checked with real play.
- **Safari's storage eviction** is described from what I know of WebKit's policy. The exact current behaviour on the iPadOS version the families use should be tested, not assumed.
- **Hosting and legal details** (provider, EU hosting, the exact consent wording, whether COPPA applies) are decisions I made on reasonable defaults. They need confirming by whoever owns the product, and a lawyer for the consent text.
- I didn't run the browser suite, so I haven't seen the existing persistence behaviour work end to end. My description of it comes from reading the code and tests.
