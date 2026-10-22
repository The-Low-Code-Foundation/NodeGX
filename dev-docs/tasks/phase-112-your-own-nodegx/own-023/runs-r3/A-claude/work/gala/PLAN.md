# Plan: children sign in online and keep their progress

Nothing is built yet. This is the plan only. No file other than this one was changed.

---

## 1. How the game works today

### What it is

**Le Gala de danse** is a browser game, in French with an English switch. The player runs a small dance school and
gets its end-of-year show (the *gala*) ready over several **seasons**. Each season the player:

- sets the running order (`order` tab), each class's formation and dance (`formation`), the snack (`gouter`), the
  costumes and hair (`costumes`), and the dressing-room furniture (`build`). From season 2 there is also a `parking` tab.
- runs a **dress rehearsal** as many times as they like, or a **try-out** of one number. Both are free and leave nothing
  behind.
- runs **gala night** once per season. It earns stars (⭐), which buy things in the `shop`. The result goes into the
  `notebook`.
- moves on to the next season, which adds rules and classes: the car park in season 2, teens and hip-hop in season 3,
  a mothers' class in season 4, then a "free" season.

A season's evening is **simulated** from the plan (`engine.js` `simulate()`, seeded with a random number), then played
back in 3D with three.js. The game speaks to the player as "tu" and uses short, friendly sentences, which fits the
8–13 audience.

### How it's put together

- **No build step, no framework.** `index.html` loads `src/main.js` as an ES module. three.js is vendored in `vendor/`
  and mapped with an import map. Fonts come from Google Fonts, which is the only outside request.
- **`serve.mjs`** is a small Node HTTP server (`npm start`, port 5173). It serves the folder and exposes exactly two
  endpoints, `GET/PUT /api/settings` and `GET/PUT /api/save`. Each one reads or writes one JSON file in
  `~/.gala-de-danse/` (or `GALA_DIR`). Writes are atomic (temp file, then rename) and limited to 100 KB. The server
  listens on `127.0.0.1` only and refuses any `Host` or `Origin` that isn't localhost, so **today the game is a
  one-machine install.** There are no accounts, no network service and no notion of users.
- **Modules** (in `src/`):
  - `data.js`: every table of game content (classes, moves, outfits, shop items, seasons, `START.stars`), plus
    `applyRows()`, which lays the grown-ups' changes **in place over these module-level objects**.
  - `engine.js`: the pure rules and the `simulate()` function. `plan.js`: the starting plan and school
    (`defaultPlan`, `defaultSchool`, `addSeasonNumbers`, `migrateNumber`).
  - `state.js`: the one shared object `G` and **the save** (`G.S`). Details below.
  - `store.js`: the client for the two server files. Details below.
  - `ui.js`: the side sheet (tabs, shop, notebook, run, results, seasons). `play.js`: the run loop and the dancers.
    `world.js`, `people.js`: the 3D scene. `music.js`, `tunes.js`: synthesised music.
  - `settings.js`: the pure schema and `sanitize()` for the grown-ups' settings. It is shared by the page, the server
    and the tests. `grownups.js`: the settings screen behind a gate (hold ⚙️ for two seconds, then answer a
    multiplication).
  - `words.js`: the rude-word filter (`clean`, `isRude`), used on every name a player types. `i18n.js`: all text in
    `fr` and `en`.
  - `main.js`: the start-up order, pointer and keyboard input, the frame loop, and `window.__game`, a handle the
    browser tests use to drive the game.
- **Tests**: `npm test` runs 39 unit tests (`tests/*.test.mjs`) on pure modules, and all 39 pass. `npm run check`
  runs the Playwright browser tests (`tests/browser/`). Each one starts its own `serve.mjs` with a temporary
  `GALA_DIR`. The tests cite "change 001" and line numbers of a spec, `changes/001-grown-up-settings.md`, which is
  **not in the folder**.

### The parts this feature touches, in detail

**The save: `src/state.js`**

- The whole of one player's progress is one JSON object, `G.S`. A fresh one is about 3 KB. `fresh()` gives
  `{ v: 2, at, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }`.
  - `plan`: the running order, each number's formation, blocks and costume, the hair, snack, parking and backdrop.
  - `school`: the name, stars, earned, owned items, upgrades and furniture.
  - `notebook`: one entry per gala ever played. It grows without limit, by roughly 150 bytes a season.
  - `lang` and `sound` are preferences, but they live inside the save.
- **`save(at = Date.now())`** stamps `G.S.at`, writes `localStorage['gala-game-v2']`, and calls `putFile('save', G.S)`.
  Every change in the game goes through it. `ui.js` `changed()` calls `save()`, and so do `buy()`, `finishRun()` (gala
  only), `nextSeason()`, `showIntro()`'s button, the school-name input, and the language and sound buttons in
  `main.js`.
- **`load(remote)`** reads the browser copy through `fromLocal()`. That function also upgrades a round-1 save from
  `gala-toy-v1` via `fromRound1()`. It then compares the browser copy with the server's `save.json` and keeps
  **whichever has the larger `at`**. If the browser's copy wins, it is pushed back to the server.
  - `at` is the device's own clock, so this "last writer wins" only works because both copies sit on one machine.
- **`mend(s)`** repairs any save on load. It fills in fields added since the save was written, migrates the old dance
  format, and clamps stars.
  - It also **replaces any costume, step or hairdo that the current settings don't define** with the number's own,
    and runs names through `clean()`.
  - So a save that is opened against different settings comes back **silently changed**, and `load()` then writes
    that changed version back.
- **`resetAll()`** replaces the save with `fresh()`. The notebook's "start again" button calls it (`ui.js`
  `paintNotebook`), and so does the grown-ups' "new school" button (`grownups.js`).
- There is **one save per browser and one per machine** (`save.json`). Two children on one device would overwrite
  each other.

**The server client: `src/store.js`**

- `getFile(name)` times out after 2.5 s and returns `{ reached: false }` on any failure.
- `putFile(name, data)` debounces for 300 ms and sends only the last version.
  - **A failed PUT is not retried.** The waiters just get `false`. Offline changes still reach the server, but only
    indirectly: at the next page load, `load()` sees the browser copy is newer and pushes it.
- `flush(keepalive)` runs on `pagehide`. `keepalive` is only used for bodies under 60 KB.

**Start-up: `src/main.js`, top of the file**

- The settings and the save are fetched in parallel (`loadSettings()`, `getFile('save')`).
- `applySettings()` then mutates the content tables, and only after that is `load()` called, so `mend()` checks the
  save against the settings in force.
- **Settings can't be swapped while the page is running.** That is why `grownups.js` `closeSettings()` ends with
  `location.reload()`.

**The grown-ups' settings: `src/grownups.js` and `src/settings.js`**

- These are per-machine content changes: names, prices, up to 12 new moves and outfits, and starting stars.
- They are stored in `settings.json` on the local server, with a browser copy in `localStorage['gala-settings-copy']`.
  There is also a "save to a file / load from a file" pair for moving them by hand.
- The gate (`bindGear`, `openGate`) only keeps very young children out by accident. **A 10-year-old can answer
  `15 × 7`.**

**The runs: `src/play.js` `startRun()`, `src/ui.js` `beginRun()` / `finishRun()` / `nextSeason()`**

- A run never touches the network.
- A gala's result is decided entirely by `simulate()` with the season's stored `seed`, and the save is written **only
  when it ends** (`finishRun` sets `galaDone`, adds the stars and the notebook entry, then calls `save()`).
- If the page dies mid-gala, `galaDone` is still false, so the gala can be run again with the same seed and gives the
  same result. **There is no "in the middle of a game" state that needs saving.** The progress that matters is the
  plan edits, each of which is saved as it happens, and the end of a gala.

---

## 2. The plan

### 2.1 The main decisions

1. **A new hosted backend, separate from `serve.mjs`.**
   - `serve.mjs` is deliberately localhost-only and has one file per machine. Bending it into a multi-family internet
     service would undo exactly what makes it safe.
   - Keep `serve.mjs` as it is for local and offline installs. It also remains the store for **guest** play on those
     installs.
   - Add a new program in `server/` (Node, same no-framework style) that serves the same static game files **and** an
     authenticated API under `/v1/`, with a real database.
   - The game and the API share one origin, which keeps the cookies and security simple.
   - Database: PostgreSQL in production. SQLite is fine for local development and tests.
2. **Accounts belong to the family, and the grown-up owns them.**
   - A grown-up creates a family with their email and a password. Children are *profiles inside the family*, with a
     nickname, an avatar and a picture password.
   - Children never give an email or any personal detail.
3. **Each child signs in with: family code + tap their name + picture password.**
   - The **family code** is 8 characters, random, shown to the grown-up and printable on a sign-in card with a QR code.
   - The **picture password** is 4 pictures in order, chosen from 9 (9·8·7·6 = 3,024 combinations). It works on a
     tablet, needs no reading, and is what 8-year-olds can manage.
   - The weak secret is made safe by the family code, which can't be guessed (≈30⁸), by strict per-child rate limits,
     and by a notice to the grown-up.
4. **Guest play stays exactly as today.** It uses the same `localStorage` key `gala-game-v2` and the same local-server
   `save.json`, so someone who never signs in sees no change, and no existing save needs migrating.
5. **Each child's progress is stored on the device first, then in the cloud.** Every save goes to `localStorage` at
   once, as today, and into a small *outbox* that keeps trying until the server confirms it.
   - Conflicts are found with a **server revision number**, not the device clock.
   - **Nothing is ever thrown away.** The server keeps a history of each child's saves.
6. **The grown-ups' settings move to the family once the family exists.** A child's save must be opened against the
   same custom costumes and steps on every device. Otherwise `mend()` silently replaces them (see §1). So for
   signed-in children, the settings come from the family account and are edited from the grown-up's account, not
   from the ⚙️ gate.
7. **Switching player reloads the page**, like `closeSettings()` already does. `applyRows()` mutates module globals,
   and reloading is the only clean way to put a different settings set and save in place.

### 2.2 What is stored, and where

**On the server (database)**

| Table | Fields | Notes |
|---|---|---|
| `families` | `id`, `code` (unique, can be regenerated), `settings` (JSON, `settings.js` format), `settings_rev`, `created_at`, `deleted_at` | `settings` is checked with the same `sanitize()` that `serve.mjs` uses today. |
| `grownups` | `id`, `family_id`, `email`, `email_verified_at`, `password_hash` (scrypt from `node:crypto`), `consent_at`, `consent_text_version` | One or two per family. A second grown-up can be invited. |
| `children` | `id`, `family_id`, `nickname` (≤16 chars, through `words.js` `clean()`), `avatar` (one of a fixed list), `secret_hash` (scrypt + salt), `failed_tries`, `locked_until`, `created_at`, `deleted_at` | No birth date, no real name required, no email. |
| `saves` | `child_id` (PK), `rev` (integer, +1 per accepted write), `data` (JSON, the `G.S` object), `updated_at` (server clock), `device_id` | One current save per child. Limit 256 KB. |
| `save_history` | `child_id`, `rev`, `data`, `saved_at`, `why` (`sync`, `conflict`, `imported-from-device`, `before-restore`, `before-reset`) | Keep the last 50 revisions and every non-`sync` one for 90 days. This is how a grown-up can undo anything. |
| `sessions` | `id`, `token_hash`, `kind` (`grownup`/`device`), `grownup_id` or `family_id`, `child_ids` (on this device), `remember` (bool), `label` (e.g. "iPad, Safari"), `created_at`, `last_seen`, `revoked_at` | One **device session** per browser can hold several children. |
| `events` | `family_id`, `kind`, `at`, small details | For the grown-up's "recent activity" list and lockout notices. No game telemetry. |

**On the device (`localStorage`)**

| Key | Contents |
|---|---|
| `gala-game-v2` | **Unchanged:** the guest save. Also `gala-toy-v1` (round 1) and the local-server `save.json`, as today. |
| `gala-profiles` | `{ active: 'guest' \| childId, children: [{ id, nickname, avatar, familyId, remember }], deviceId }`. Only names and avatars, nothing secret. |
| `gala-child:<childId>` | `{ save, rev, pending, conflict? }`. `rev` is the last revision the server confirmed. `pending` is true while there are changes the server hasn't confirmed. |
| `gala-family:<familyId>` | The family's settings and their `settings_rev`, cached so a known child can play offline. |
| `gala-settings-copy` | Unchanged: the guest/device settings. |

The session token is **not** in `localStorage`. It is an `HttpOnly; Secure; SameSite=Strict` cookie, so a script on
the page can't read it.

### 2.3 Server-side workflows

1. **Grown-up sign-up.**
   - Email, password, and a plain consent text ("I am the parent or guardian. Here is what we keep about the
     children…").
   - A verification email is sent. The family can't add children until the address is verified.
   - This step is the parental-consent record. It needs a lawyer's reading for the countries we target: GDPR article 8
     (France sets the age at 15) and COPPA if US children play.
2. **Sign-in, sign-out and password reset** for grown-ups, with the reset by emailed link.
   - This needs a transactional email provider.
3. **Family page** (`/family`, a separate small page with no 3D, in fr and en):
   - add, rename and remove children, and choose avatars;
   - set or reset a child's picture password;
   - see, regenerate and print the family code and the sign-in cards;
   - edit the game settings for the family (the same fields as `grownups.js`, reusing `settings.js` `check()` and
     `sanitize()`);
   - list signed-in devices and sign one out remotely;
   - see each child's save history and restore one (restoring writes a new revision, so the current save is kept as
     `before-restore`);
   - export all of the family's data as JSON;
   - delete a child or the whole family. Deletion is soft for 30 days, then purged.
4. **Child sign-in** (`POST /v1/child-sign-in` with `{ code, childId, secret }`):
   - checks the family code, then the child, then the lock, then the secret;
   - adds the child to this browser's device session, creating one if needed;
   - returns the child's profile, the family settings, and the current save with its `rev`.
5. **Rate limits and lockouts.**
   - Per child: 5 wrong picture passwords lock them for 15 minutes, and repeats lock for longer. The grown-up gets an
     `events` entry and an email once a day at most. The grown-up can unlock from the family page.
   - Per IP and per family code: a cap on tries, so nobody can sweep through codes.
   - Lockouts count per device as well as per child, so a classmate who knows the family code can't keep a child
     locked out from every device.
6. **Save sync** (`GET /v1/children/:id/save`, `PUT /v1/children/:id/save` with `If-Match: <rev>`):
   - The server checks that the child is in this device session and is not deleted.
   - It checks the save's shape and size: `v === 2`, `plan` and `school` are objects, and the school name and block
     names go through `clean()`.
     - It does **not** run `mend()`, because `mend()` depends on the settings having been applied into globals
       (`applyRows`). Doing that in a multi-family server would leak one family's settings into another's request.
   - Same `rev`: store the save, `rev + 1`, and return the new `rev`.
   - Different `rev`: answer **409** with the server's copy and its `rev`. Nothing is overwritten (see §2.6).
7. **Family settings** (`GET`/`PUT /v1/family/settings` with `If-Match`): the grown-up edits them, and children's
   devices read them.
8. **Housekeeping jobs:**
   - purge soft-deleted families and children after 30 days;
   - trim `save_history`;
   - expire sessions (non-"remember" device sessions after 8 hours idle, "remember" ones after 90 days idle, grown-up
     sessions after 30 days);
   - email a grown-up before deleting a family that has been inactive for 2 years;
   - nightly encrypted database backups with a tested restore.
9. **Operations:**
   - HTTPS only and strict security headers, with a CSP that allows only self.
   - **Self-host the fonts.** Today `index.html` loads Google Fonts, which sends every child's IP address to Google.
     Remove that before the game is online.
   - Logs without request bodies.
   - Uptime monitoring and an error-rate alert on `PUT …/save` failures.

### 2.4 How a child signs in (what they see)

- **A new 👤 button in the top bar** (`index.html` `#top`, next to ⚙️) shows who is playing: "Invité·e" (guest) or the
  child's avatar and nickname.
  - Tapping it opens the **player chooser**: the children already known on this device, "Play without signing in",
    and "Sign in".
- **Sign in:**
  - "Family code" field (or scan the QR on the sign-in card with a tablet camera);
  - "Who are you?" (the family's avatars and nicknames);
  - "Your secret pictures" (tap 4 of 9).
  - Then: **"Is this a family device?"**
    - **Yes** (`remember`): next time this child taps their name and plays, with no secret, until a grown-up removes
      the device.
    - **No** (school laptop): the session ends after 8 hours idle and when the child signs out. Signing out removes
      their copy from this browser, **but only once the server has everything** (see §2.6).
- **Two children on one device:** each signs in once. The chooser then shows both.
  - Switching writes `gala-profiles.active` and reloads, so each child gets their own save, cache key and family
    settings.
  - On a device where the second child isn't "remembered", switching to them asks for their pictures again.
- The **grown-up** never signs in inside the game. Everything grown-up happens on `/family`.
  - The ⚙️ gate stays for **guest** play. While a child is signed in, ⚙️ says "Ask a grown-up to change this on the
    family page" and links there.

### 2.5 What happens to progress already on the device

The guest save (`gala-game-v2`, and the local-server `save.json` where `serve.mjs` is used) is **never deleted**.

On a child's **first** sign-in on a device that has guest progress worth keeping (anything beyond a `fresh()` save:
`season > 1`, or stars changed, or a non-empty notebook, or `at > 0`), the game asks:

> "There's already a school on this device: **Les Étoiles**, season 3, 112 ⭐. Is it yours?"
> **Yes, it's mine** · **No, it's someone else's**

- **No:** nothing happens. The guest school stays for whoever owns it.
- **Yes, and the child's cloud save is empty** (a brand-new child, or `rev` 0):
  - the guest save is uploaded as the child's save, recorded in history as `imported-from-device`;
  - the guest slot is reset to `fresh()`, after a local backup copy is kept as `gala-game-v2.claimed` for 30 days.
  - If the upload fails because we are offline, the import waits in the outbox and the guest slot isn't reset until
    the server confirms it.
- **Yes, but the child already has a cloud school**: "You have two schools. Which one do you want to play?" Each is
  shown as a card (name, season, stars, last played).
  - The one chosen becomes current.
  - The other goes into `save_history` as `imported-from-device` (if it was the guest one) or `before-restore`, so a
    grown-up can bring it back from the family page.
  - The guest slot is handled as above.
- The question is asked once per device. The answer is remembered in `gala-profiles`, so a sibling signing in later
  isn't asked about a school that has already been claimed.

**Family settings on a device that has its own.** If the device has guest settings (`gala-settings-copy`) and the family
has none yet, the grown-up page offers "use this device's settings for the family" the first time it is opened from that
device. Otherwise the device's settings stay with guest play, and children always get the family's.

**What `mend()` would lose.** A guest save that uses a device-only custom costume (`new3`), claimed into a family whose
settings don't define it, would lose that costume.

- The claim screen checks this with `settings.js` `newIds()` and the save's `plan.numbers[*].costume.outfit` and
  `blocks[*].moves`.
- When there is a mismatch it says so, and it offers to copy the device's settings into the family when the family has
  none.
- Whatever the choice, the untouched original stays in history.

### 2.6 What happens offline

The game already plays fully offline once loaded. Runs never use the network (§1). The changes make sure **nothing a
child does is lost**:

- **Every change is stored on the device at once.** `save()` writes `gala-child:<id>` with `pending: true` before
  anything goes on the network, exactly as it writes `gala-game-v2` today.
- **The outbox** is a new `src/sync.js`, which takes the place of `store.js` `putFile` for signed-in children:
  - It sends the latest save with `If-Match: rev`. It debounces like `putFile` (about 1–2 s), so ten taps make one
    request.
  - It retries with back-off (2 s, 5 s, 15 s, 60 s, then every 2 minutes). It also retries at once on the `online`
    event, on `visibilitychange` to visible, on page load, and on `pagehide` (with `keepalive`).
  - It clears `pending` **only** when the server confirms the exact revision that was sent. Because `pending` lives in
    `localStorage`, a tab that is closed, reloaded or crashes while offline still sends the changes the next time the
    game opens for that child.
- **A sync indicator** in the top bar, next to the child's avatar:
  - ☁️✓ "saved"
  - ☁️… "saving"
  - ☁️⚠ "not sent yet. Your game is safe on this device."
  - It never interrupts play.
- **Sign-out with unsent changes:** "Your last changes haven't reached the internet yet. Stay signed in until the
  cloud turns ✓." The child can't sign out until they are sent, but a grown-up can force it on the family page.
- **Mid-gala:** nothing to do. The result is saved at the end (`finishRun`) like any other change. A gala interrupted by
  a closed tab is replayed with the same seed (§1).
- **Session expired while offline:** the child keeps playing locally. When the server answers 401, the game asks for
  the pictures again, then the outbox sends. The save is keyed to the child's id, and the server checks it is the same
  child.
- **Conflict (409):** this happens when the same child played on two devices and both changed the school since the
  last sync.
  - First, if the server copy is identical to the local one, there is no conflict.
  - Otherwise both are kept. The local one is stored in `save_history` as `conflict` (the client re-sends it to a
    `POST …/save/conflict` endpoint that only appends to history).
  - The child sees the same "two schools, which one?" chooser as in §2.5. The one chosen is written with the new
    `If-Match`.
  - We do **not** try to merge plans field by field. A formation half from one device and half from another is worse
    than a clear choice, and the other version is always recoverable.
- **Opening the game offline** works on a device that has opened it before. The page and `vendor/three.module.js` must
  be available, so a **service worker** that caches the static files is added (step 9).
  - A child already known on the device can then play offline. A first sign-in needs the network.
- **iPad / Safari storage:** Safari can clear script-written storage for a site that hasn't been visited for 7 days.
  - Unsent changes are only at risk if the game was closed offline and not reopened online for a week.
  - Call `navigator.storage.persist()` and sync promptly to keep the window small, and say so in the family help text.

### 2.7 What changes, where, and in what order

Each step leaves the game working, and guest play unchanged.

1. **Groundwork, with no visible change.**
   - `index.html` and `style.css`: self-host the three fonts.
   - Write the missing spec as `changes/002-sign-in.md`, in the style the tests refer to (`changes/001-…`).
   - Add unit tests that pin today's guest behaviour (`load()` choosing between browser and server copies, `mend()`
     effects) before touching it.
2. **Profile-aware storage on the client** (no server yet).
   - `src/state.js`:
     - replace the constant `SAVE_KEY` with `saveKeyFor(profile)`, which gives `gala-game-v2` for the guest so nothing
       moves;
     - split `load()` into `loadGuest(remote)` (today's code, unchanged) and `loadChild(local, remoteSave)`;
     - make `save()` hand the save to the active profile's writer (`putFile` for the guest, `sync.queue` for a child);
     - make `resetAll()` act on the active profile only;
     - keep `fresh()`, `mend()` and `fromRound1()` as they are.
   - New `src/profiles.js`: read and write `gala-profiles`, `active()`, `switchTo(id)` (writes, flushes, then
     `location.reload()`).
   - `src/main.js` start-up: find the active profile first.
     - Guest: exactly today's `loadSettings()` + `getFile('save')`.
     - Child: the cached family settings (`gala-family:<id>`) + `gala-child:<id>`, then refresh both from the server
       in the background. If the server has a newer `rev`, apply it at once when nothing is pending, otherwise go to
       the conflict flow.
   - `src/store.js`: unchanged. It stays the guest and local-install client.
3. **The backend** (`server/`):
   - HTTP and static files (reusing the careful path handling from `serve.mjs`);
   - database migrations for §2.2;
   - grown-up sign-up, verification, sign-in and reset;
   - children; the family code; device sessions; the child sign-in with rate limits;
   - save `GET`/`PUT` with revisions and history;
   - family settings.
   - Shared pure code is imported from `src/` (`settings.js` `sanitize`, `words.js` `clean`), as `serve.mjs` already
     does.
4. **The family page** (`family.html`, `src/family.js`): every workflow in §2.3 point 3, in fr and en.
   - It reuses `settings.js` and the field rendering ideas from `grownups.js`. Split the pure parts out of
     `grownups.js` rather than copying them.
5. **Child sign-in in the game:**
   - `index.html`: the 👤 button.
   - New `src/signin.js`: the chooser, the code entry and QR, the picture password, "family device?", and sign-out.
   - `src/i18n.js`: every new string, in `fr` and `en`.
   - `src/grownups.js`: when a child is signed in, ⚙️ points to the family page instead of opening the gate.
   - `src/ui.js`: `paintNotebook`'s "start again" for a child resets their school and labels it in history as
     `before-reset`.
6. **Sync** (`src/sync.js`): the outbox, retries, the indicator (in `ui.js` `hud()`), 401 and 409 handling, sign-out
   guarding, and the `pagehide` flush.
   - Expose it on `window.__game.sync` for the browser tests, the same way `settings` is exposed today.
7. **First sign-in import** (§2.5): the claim screen, the custom-costume check, the guest-slot backup.
8. **Privacy and operations:** export, deletion, the purge jobs, backups, monitoring, the lawyer's review of the
   consent text, and the privacy notice.
9. **Offline start:** the service worker that caches `index.html`, `style.css`, `src/*`, `vendor/*` and the fonts,
   with a version so a new release replaces it cleanly.
10. **Release:** behind a switch. The 👤 button is hidden until the backend is configured, so local installs that use
    `serve.mjs` look the same as today. Run a small family trial first.

### 2.8 What could go wrong

- **Silent loss through `mend()`:** a save opened against different settings drops custom items and is written back.
  - Mitigation: family settings for children, the check at import, and history on the server.
  - Also, for children, write back after `mend()` only when the user changes something, not on load.
- **Clock-based "newest wins"** (`at`) across devices. Mitigation: the server `rev` decides; `at` is only shown to
  people.
- **Two tabs or two devices for the same child.** `rev` catches it. A `storage` event listener also tells a second tab
  on the same device that the save changed.
- **Weak child secret.** Mitigation: the family code, rate limits, notices, and grown-up unlock and reset.
  - A family code shared around a class remains a risk. It can be regenerated, and children on "remembered" devices
    are unaffected.
- **A child left signed in on a school laptop**, so the next child plays in their school. Mitigation: "family device?"
  defaults to **No**, the 8-hour idle expiry, and a visible avatar and nickname. History makes any damage reversible.
- **Lockout used as a prank.** Mitigation: per-device counting, and grown-up unlock.
- **Storage blocked or private browsing.** The code already copes (every `localStorage` call is in `try`). A signed-in
  child then depends on the network. Show "this browser can't keep your game when offline".
- **Request size.** The notebook grows without limit. `keepalive` requests are limited to about 64 KB in total.
  - Mitigation: a 256 KB server limit. Fall back to a normal `fetch` on the next load, since `pending` survives.
  - Cap the notebook at, say, 100 entries, keeping older seasons as a summary.
- **Settings change while a child is playing** (a grown-up edits on `/family`). The child's page picks them up on the
  next load only, which is what happens today with `closeSettings()`. Show "new settings from your grown-up, they'll
  apply next time".
- **The local install (`serve.mjs`) and the cloud disagree about what "the save" is.** Keep them strictly separate:
  `save.json` is guest-only and is never synced to the cloud except through the explicit claim in §2.5.
- **Legal:** consent, data minimisation, and the processor contracts for hosting and email. Children's data needs a
  privacy notice written for parents *and* a short one for children. No analytics or ads. Avatars are pictures, not
  photos.
- **Email deliverability** for verification and reset. Grown-ups lose access to email. Mitigation: a second grown-up,
  and support-assisted recovery.
- **Operations:** if the backend is down, children keep playing locally (the outbox). A first sign-in on a new device
  is impossible until it is back.

---

## 3. What I'd check to know it works

The existing tools are enough: `node --test` for pure logic, Playwright for the browser, each test with its own server
and data folder (`tests/browser/helpers.mjs` `startServer`). Add a test backend with SQLite and a fake email outbox.
Each requirement gets at least one browser test written the way the existing ones are ("When I…").

**The requirements, one by one**

1. *Sign in elsewhere and find the game exactly as left.*
   - Child A plays on context 1: changes the order, a formation and a costume, buys an item, finishes a gala.
   - Then on a fresh context 2 they sign in. `window.__game.S` deep-equals context 1's save (apart from `at`), and the
     3D dancers wear the same costumes.
   - Repeat with **custom family settings** (a `new1` outfit in use). It must survive the trip; this is the `mend()`
     trap.
2. *No child email; a grown-up sets them up.*
   - Sign-up with an unverified email can't add children.
   - The child sign-in API has no email field.
   - The database has no email column outside `grownups`.
3. *Two children, one device.*
   - A and B sign in on one context and alternate edits.
   - Each `gala-child:<id>` and each server save contains only that child's changes.
   - Switching reloads with the right school name on the sign.
   - The guest save is untouched throughout.
4. *Never signs in.*
   - All existing tests (`npm test`, `npm run check`, monkey test) pass unchanged with the backend switched off **and**
     on.
   - A guest's `localStorage` keys are byte-identical before and after an upgrade to the new version.
5. *Existing progress isn't lost at first sign-in.*
   - Each branch of §2.5 (no, yes and empty cloud, yes and existing cloud) ends with both schools recoverable: one
     current, the other in history or still the guest.
   - Include a guest save from round 1 (`gala-toy-v1`) and one from the local-server `save.json`.
   - Include an import while offline that completes later.
6. *Connection drops mid-game.*
   - With Playwright `context.setOffline(true)` (and `page.route('**/v1/**', abort)`): make 20 edits, finish a gala,
     close the page, reopen still offline (the cache and the service worker), then go online.
   - The server ends with exactly the last state and `pending` is false.
   - Variants: the drop happens during a PUT (the server stored it but the reply was lost: the next PUT gets 409 with
     an identical copy and must resolve silently); and an offline session that has expired.
7. *Backend workflows.*
   - API tests for every endpoint: success, wrong family, wrong child, revoked session, lockout timing,
     `If-Match` conflict, oversize, a malformed save, and rude nicknames refused.
   - Deletion really purges after the grace period.
   - Export contains everything stored about the family.

**Also**

- Clock skew: set one browser's clock a day ahead (Playwright `clock`). Sync must still be correct.
- Conflict UX: two contexts edit offline, then both come online. The chooser appears and both versions remain.
- A security review of sign-in and sessions: brute-force limits, cookie flags, CSRF (`SameSite=Strict` plus an
  `Origin` check as `serve.mjs` does), and that one family can never read another's save (an id-swapping test on every
  endpoint).
- Real devices: an iPad with Safari, an Android tablet, a Chromebook, and a school-style locked-down Windows laptop.
  On each: QR sign-in, airplane mode mid-session, and a closed lid.
- A small trial with two or three real families with children in the age range: can an 8-year-old sign in at school
  alone? Can they remember 4 pictures? Measure failed tries and lockouts in `events`.
- Load: a few hundred simultaneous syncs (each about 3–30 KB, debounced) is small. Check the debounce really limits
  writes and that history trimming keeps up.

---

## 4. How I found my way around

**What was easy**

- The project is small (about 5,000 lines with tests), has no build step, and its modules divide cleanly.
- Most files open with a comment that says what they are for and why. `serve.mjs`, `state.js`, `store.js` and the
  `data.js` `applyRows` comment are especially clear, and they told me the persistence model in a few minutes.
- The persistence layer is well isolated: one save object, one `save()` function, one client for the server. Nearly
  everything this feature touches is in `state.js`, `store.js`, `main.js` and `grownups.js`.
- The tests are readable and describe behaviour in the user's words. I ran `npm test`: 39 out of 39 pass. The browser
  test helpers show how to run an isolated server, which the new tests can reuse.
- The comment about galas ("the gala keeps the season's seed") plus `finishRun()` made it clear that a run has no state
  to protect.

**What was hard**

- The style is dense: long one-line functions, single-letter names (`G`, `S`, `W`, `T`, `R`), and French domain words
  (loge, goûter, entracte, répétition) mixed with English code. `ui.js` (762 lines) and `world.js` are hard going. I
  read them only where they call `save()` or `resetAll()`, not in full.
- The tests point to `changes/001-grown-up-settings.md` (line numbers like "10.", "18."), which isn't in the folder. The
  original requirements for the settings feature are therefore only known through the tests.
- A few side effects are easy to miss and matter a lot for syncing:
  - `mend()` changing saves against the current settings, and `load()` writing that back;
  - `applyRows()` mutating module globals, which is why changes need a reload;
  - `putFile` never retrying.

**Where I'm unsure**

- **How it's used today.** `serve.mjs` is built for one machine, and its comment says it keeps "the school's
  progress". I've read "school" as the *dance school in the game*, not a real school running the game. If it is
  actually installed in schools or clubs as a shared machine, the guest and local-install path matters more than I
  assumed. It would also need its own story for claiming that machine's `save.json`.
- **Who plays.** Comments say "she" for the player, and nothing says whether real players exist yet or how many. That
  affects how much care the guest-to-account import needs.
- **The browser tests: I didn't run them.** Playwright isn't installed (`node_modules` is missing), and installing it
  would have changed the folder. My description of the browser behaviour comes from reading the code and the tests.
- **The picture password and family code** are my judgement of what 8–13-year-olds can manage at a school computer. It
  should be checked in the family trial before it is final.
- **The legal points** (age of consent, COPPA, GDPR-K, the French CNIL's guidance for children) are flagged, not
  resolved. They need a qualified review before launch.
- **The size estimates** (a 3 KB fresh save, a notebook that grows slowly) are measured on `fresh()` only. I haven't
  seen a long-played save.
