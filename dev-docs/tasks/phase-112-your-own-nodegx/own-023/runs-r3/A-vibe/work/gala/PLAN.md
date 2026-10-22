# Plan: children sign in online and keep their progress

This is a plan only. No code has been written and no other file has been changed.

The feature: a child signs in and finds the game exactly where they left it, on another device; a grown-up sets the children up; two children of one family share a device with separate progress; the game still works for someone who never signs in; a child who already has progress on a device does not lose it when they first sign in; a dropped connection loses nothing; and there is a backend with whatever server-side workflows that takes.

---

## 1. How the game works today

### What it is

**Le Gala de danse** ("The Dance Gala") is a French/English browser game for roughly 8–13 year olds. The player runs a dance school's end-of-year show: they set the running order, the formations and choreography, the costumes, the dressing room ("la loge"), the snack table and the car park, buy upgrades with stars, then run a free **dress rehearsal** or the once-a-season **gala night** that earns stars. It is a single-page app with **no build step**: `index.html` loads `src/main.js` as an ES module, and an import map points `three` at the vendored `vendor/three.module.js`.

The game is deterministic where it matters: a pure engine turns `{ plan, school, season, mode, seed }` into every verdict, every dancer's schedule, the points and a trace; the 3D view and the music just play that back.

### How it is put together

| Layer | File | Job |
|---|---|---|
| Entry | `index.html` | Canvas, top bar (`#top`), side sheet (`#sheet`), modal, toast; loads `src/main.js` |
| Start-up / loop | `src/main.js` | Loads settings + save, builds the world, runs the frame loop, the pointer on the 3D view, and exposes `window.__game` (the test handle) |
| Shared state | `src/state.js` | The one `G` object; the save `G.S`; `fresh()`, `mend()`, `load()`, `save()`, `resetAll()` |
| Transport | `src/store.js` | `getFile()` / `putFile()` / `flush()` — the client side of the two server files |
| Server | `serve.mjs` | Static files + `/api/settings` + `/api/save`; stores two JSON files outside the game folder |
| Settings | `src/settings.js`, `src/grownups.js` | The grown-ups' settings schema (pure) and their screen (behind a gate) |
| Data | `src/data.js` | Every class, number, move, costume, piece of furniture, snack, upgrade, season and rule; `applyRows()` lets settings override rows in place |
| Plan | `src/plan.js` | `defaultPlan()`, `defaultSchool()`, season arrivals, old-save migration |
| Engine | `src/engine.js` | `simulate()` and its judges (`programme`, `judgeSpacing`, `judgeMusic`, `execution`, `classState`, `judgeGouter`, `judgeParking`, `analyseLoge`, `changeTime`) |
| Playback | `src/play.js` | `buildDancers()`, `startRun()`, `stepRun()`, `updateDancers()`, `danceAt()`, `idle()`, `stepScene()` |
| 3D | `src/world.js`, `src/people.js` | The school, stage, dressing room, car park, camera; the box dancers |
| Music | `src/music.js`, `src/tunes.js` | Web Audio synthesis of each number's score, following the run |
| UI | `src/ui.js` | The side sheet (all tabs), HUD, run sheet, results, verdicts, shop, notebook |
| Words | `src/i18n.js`, `src/words.js` | Every sentence (fr/en); the profanity/link filter `clean()` |
| Tests | `tests/*.test.mjs`, `tests/browser/*.spec.mjs` | `node --test` for the pure modules; Playwright for the browser |

### The parts this feature touches, in detail

**`serve.mjs` — the whole "backend" today.** It is a tiny Node `http` server. `ROOT`/`PORT`/`DATA` are set at `serve.mjs:11-12`; `DATA` is `~/.gala-de-danse` (or `GALA_DIR`). `FILES` (`serve.mjs:15-18`) maps exactly two endpoints to two files: `/api/settings` → `settings.json` and `/api/save` → `save.json`. `api()` (`serve.mjs:22-47`) enforces `LOCAL` (`serve.mjs:20`): the `Host` must be `localhost`/`127.0.0.1` and any `Origin` must be the same local origin, otherwise `403`. It accepts `GET` (returns `null` when there is no file yet) and `PUT` (JSON only, `MAX = 100 * 1024`, written whole to a temp file then `rename`d in). `server.listen(PORT, '127.0.0.1', …)` at `serve.mjs:58` binds loopback only. **This is the file the backend replaces or grows out of.**

**`src/store.js` — the client transport.** `getFile(name)` (`store.js:7-14`) does a `fetch` with a 2.5 s timeout and returns `{ reached, data }` or `{ reached: false }`. `putFile(name, data, delay = 300)` (`store.js:18-24`) debounces: the last version only is sent, and it returns a promise that resolves when stored. `send()` (`store.js:25-35`) does the `PUT`; `flush(keepalive)` (`store.js:37-39`) sends what is waiting, and a `pagehide` listener (`store.js:40`) flushes with `keepalive`. **Every call fails quietly** — when the server is unreachable the page plays on with the browser's copy. This is the seam where auth, per-child progress and an outbox go.

**`src/state.js` — the save and the merge rule.** `G` is at `state.js:9-15`. The save key is `SAVE_KEY = 'gala-game-v2'` and the round-1 key is `OLD_KEY = 'gala-toy-v1'` (`state.js:18`). `fresh()` (`state.js:19-21`) returns the v2 shape: `{ v: 2, at, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }`. `mend(s)` (`state.js:43-65`) fills in anything a newer version added, migrates old numbers, drops costumes/steps/hairdos a grown-up has removed, and re-cleans names — it never throws. `fromLocal()` (`state.js:66-72`) reads localStorage (v2, else v1 via `fromRound1()`). `load(remote)` (`state.js:74-82`) picks **whichever copy was written last (`at`) wins** between the browser and the server, then writes the winner back to the other side. `save(at = Date.now())` (`state.js:83-87`) stamps `at`, writes localStorage synchronously and queues `putFile('save', G.S)`. `resetAll()` (`state.js:88`) starts a fresh school. **The save blob is the unit of progress, and `at` is the only conflict clock.**

**`src/main.js` — start-up.** Lines 19–25 are the sequence a sign-in has to slot into:

```js
const [settingsFile, saved] = await Promise.all([loadSettings(), getFile('save')]);
applySettings(settingsFile);
load(saved.reached ? saved.data : null);
onSay(sayText, toast);
buildDancers(); refreshWorld(); idle(); idleScene(); paintCamBar(); showScreen('prep'); resize();
```

`window.__game` (`main.js:84-97`) is the handle the browser tests drive; it exposes `G`, `S`, `settings`, `clean`, `isRude`, and the run controls.

**`src/grownups.js` — where a grown-up already is.** `loadSettings()` (`grownups.js:19-27`) reads the server's settings file, falling back to a browser copy (`LOCAL_KEY = 'gala-settings-copy'`). `bindGear()` (`grownups.js:33-44`) is the long-press; `openGate()` (`grownups.js:46-62`) asks a multiplication sum; `openSettings()`/`closeSettings()` (`grownups.js:66-76`) show the screen and reload the game to apply changes. `TABS = ['moves', 'outfits', 'shop', 'school', 'file']` (`grownups.js:77`) is the tab list a "Family" tab joins. `commit()` (`grownups.js:171-175`) is the save path for settings. **This is the natural home for "a grown-up sets the children up."**

**`src/ui.js` — the surfaces a sign-in touches.** `hud()` (`ui.js:56-63`) paints the top bar (`#daychip`, `#seasonchip`, `#starchip`, `#langBtn`, `#brand`). `paintSheet()` (`ui.js:100-115`) and `showScreen()` (`ui.js:99`) switch between prep / run / results. `changed()` (`ui.js:31`) is **the single save trigger** — every edit calls it, and it calls `save()`. `finishRun()` (`ui.js:546-554`) adds gala points and the notebook entry and calls `save()`. `nextSeason()` (`ui.js:740-744`) and `showIntro()` (`ui.js:745-751`) call `save()`. The notebook's reset button (`ui.js:534`) calls `resetAll()`. **All of these are per-device today and must become per-child.**

**`index.html`** — the top bar (`index.html:13-21`) is where a sign-in / avatar chip goes, next to `#soundBtn`, `#langBtn`, `#gearBtn`.

**`src/i18n.js`** — `TXT.fr` / `TXT.en` (`i18n.js:19`, `i18n.js:179`) and `t()` (`i18n.js:328`). Every new sentence goes in both.

**`src/words.js`** — `clean(text, fallback, max)` (`words.js:48-53`) is the filter every free text already goes through; child names and family names must use it.

**Not touched:** `engine.js`, `play.js`, `world.js`, `people.js`, `music.js`, `tunes.js`, `data.js`, `plan.js` — the game itself does not change. `settings.js` stays device-level (see §2H).

### What is missing today (the gap this feature fills)

A grep for `auth|login|sign in|token|session|account|user|password|pin|profile|child` across `src/`, `serve.mjs` and `index.html` returns **nothing** (only `sessionStorage` for the settings-applied flag). There is no identity of any kind. Progress is per-device: one `localStorage` key and one `save.json` on the machine running the server. The server binds loopback and rejects any non-local `Host`/`Origin`, so **another device cannot reach it at all**. "Sign in on another device" is therefore not a small addition — it changes the deployment model.

---

## 2. The plan

### A. The shape of the change

Today the game and its two-file store run on one machine, on loopback. Cross-device play needs a host reachable over the network. I would keep one Node process that serves the game statically **and** the API, but bind a real interface behind HTTPS, and replace the `LOCAL` guard with real authentication.

- `serve.mjs` splits into a thin static server plus a small API module and a small database module (e.g. `server/api.mjs`, `server/db.mjs`), so the game folder stays build-free and the API is testable in Node.
- The API lives under `/api/*`. The game stays static and unchanged in how it loads.
- `/api/settings` stays **local-only** (the grown-ups' settings are about the game's content on this device, not a child's progress). Everything new is authenticated.
- HTTPS and a real `Origin`/CORS policy replace the loopback check. The 100 KB cap stays.

### B. The data you would store, and where

The **save blob stays exactly `G.S` (v2)**. Nothing is added to its shape, so `mend()`, the engine and every existing test keep working. The server keeps the versioning around it.

| Table | Columns | Notes |
|---|---|---|
| `families` | `id`, `created_at`, `grownup_name`, `grownup_pin_hash`, `recovery_code_hash`, `email` (optional) | No email required. The recovery code is shown once. |
| `children` | `id`, `family_id`, `name`, `avatar`, `pin_hash`, `created_at`, `last_seen` | `name` goes through `clean()`; `avatar` is an emoji from the existing `ICONS` list in `settings.js`. |
| `progress` | `child_id` (PK), `rev` (integer), `at` (client stamp), `updated_at` (server time), `data` (the v2 blob) | One row per child. `rev` is the server's monotonic version. |
| `progress_snapshots` | `child_id`, `rev`, `at`, `data`, `reason` | Conflict copies and pre-adoption copies, so nothing is ever silently dropped. |
| `sessions` | `token_hash`, `child_id` (or `family_id` for a grown-up), `created_at`, `expires_at`, `device_label` | Long-lived tokens so a child stays signed in. |

Storage: a single **SQLite** file (transactional, handles concurrent writes, easy to back up). Node 22 ships `node:sqlite`; if the project wants to stay strictly dependency-free on Node 20, a JSON-file-per-child store with the same atomic `tmp` + `rename` write `serve.mjs` already uses is the fallback. I would pick SQLite and note the fallback.

The server runs `mend()` on any blob before storing it (it is pure and already runs in Node — `tests/save.test.mjs` does exactly this), so a malformed or hostile client cannot poison a child's save.

### C. The backend and its server-side workflows

All JSON over HTTPS.

| Endpoint | Who | What it does |
|---|---|---|
| `POST /api/family` | anyone | Create a family from a grown-up name + PIN. Returns a **family code** and a **recovery code**, shown once. |
| `POST /api/session/grownup` | grown-up | Sign in with family code + PIN → grown-up token. |
| `POST /api/family/children` | grown-up | Add a child (name, avatar, PIN). |
| `PATCH /api/family/children/:id` | grown-up | Rename, change avatar, reset PIN. |
| `DELETE /api/family/children/:id` | grown-up | Delete a child and their progress (privacy). |
| `POST /api/session` | child | Sign in with family code + child + PIN → child token. |
| `GET /api/progress` | child | Fetch `{ rev, at, data }`. |
| `PUT /api/progress` | child | Push `{ baseRev, at, data }` → `{ rev }`, or `409 { rev, at, data }` on conflict. |
| `POST /api/family/recover` | anyone | Reset the grown-up PIN with the recovery code. |

Server-side workflows: create family → add children → sign in → fetch/push progress → resolve conflicts → recover → delete. Plus a scheduled backup of the database file. Rate-limit sign-in attempts (a 4-digit PIN is guessable) and hash PINs and tokens (never store them in clear).

### D. How a child signs in

The players are 8–13 with no email, so the credential has to be something a child can use and a grown-up can set up.

1. **The grown-up creates the family once**, in the existing grown-ups' area (behind the long-press + sum gate in `grownups.js`), in a new **Family** tab. They type their name and a PIN; the server returns a family code (e.g. `GALA-7F3K-2M9Q`) and a recovery code, shown once with a "write this down" note.
2. **The grown-up adds each child**: a name (through `clean()`), an avatar (an emoji), and a 4-digit PIN.
3. **A child signs in on a device they already use**: a new chip in `#top` (next to ⚙️) opens a **"Who's playing?"** screen — the family's children as big avatar buttons, plus **"Play without signing in"**. Tap your avatar, type your PIN on a big keypad. The token is kept in localStorage (`gala-session`), so the child stays signed in.
4. **A child signs in on a new device** (the family tablet, a laptop at school): tap **Sign in**, type the family code (or scan a QR the grown-up shows), the children appear, pick yours, type the PIN.
5. **Sign out** returns to "Who's playing?" and leaves that child's local copy in place.

No email anywhere. Recovery is the grown-up's recovery code; a grown-up can reset a child's PIN.

### E. What happens to the progress already on a device

This is the requirement "a child who already has progress on this device must not lose it when they first sign in."

- Today one key `gala-game-v2` holds the device's save. It becomes the **guest** save. A signed-in child uses `gala-game-v2:<childId>`.
- **First sign-in, child has no server progress:** the device's guest save is **adopted** as that child's starting progress and uploaded. The child keeps playing exactly where they were. Nothing is lost.
- **First sign-in, child already has server progress** (they played at school) **and** the device has a guest save: the grown-up is asked once — "Keep the progress from this device, or the one already saved for *name*?" — with a preview (season, stars, last played). The default is the account's own progress, but the other version is kept as a `progress_snapshots` row, never deleted.
- **Fresh device, child has server progress:** just load it.
- `mend()` runs on whatever comes from the server, exactly as it does on the local copy today, so an old or damaged save still opens.

### F. Two children of one family on one device

- Per-child localStorage keys (above). The **"Who's playing?"** screen is the switch; each child's progress is separate on the device and on the server.
- The guest save is shared by anyone not signed in, as today.
- Switching requires the PIN, so one child cannot casually open another's progress. This is a family device: the PIN is a speed bump, not strong security, and I would say so in the UI copy.
- `resetAll()`, "new school" and "next season" act on the **signed-in child's** save, not the device's.

### G. What happens offline

The game is already local-first: `save()` writes localStorage synchronously and queues the server push, and `store.js` fails quietly. The feature keeps that and closes the gap.

- **Every change already calls `save()`** (through `changed()`), so nothing the child did is lost locally even if the connection drops mid-game. That requirement is largely met today; the work is making the server copy catch up.
- **An outbox in `store.js`:** if a `PUT` fails, keep the latest blob per child and retry on the `online` event, on a timer, and on the next change. Only the latest blob matters (the save is a whole document), so the outbox is one pending blob per child.
- **On reconnect**, push the latest local blob with its `baseRev`. If the server has moved on (`409`), keep **both**: the server stores the client's version as a snapshot and returns its own; the client shows the grown-up a "two versions" choice. Never silently drop a version.
- **First sign-in while offline:** account creation needs the network, so the child plays as guest and the adoption happens on the next successful sign-in. (A local "pending account" that syncs later is possible but adds a lot of edge cases; I would not do it first.)

### H. What could go wrong

- **Clock skew.** `at` is `Date.now()` on the device; two devices can disagree. Fix: the server owns `rev` and `updated_at`; the client's `at` is only a tie-breaker.
- **Conflict** (same child, two devices, both offline). Last-writer-wins would lose work. Mitigate with the `rev` check, keeping both versions, and letting the grown-up choose.
- **Lost PIN or family code.** Recovery code; a grown-up can reset a child's PIN.
- **A child signs in on a device with a guest save.** The adoption prompt above.
- **Privacy.** Children's data, no email, minimal fields, parental consent, a deletion endpoint, no third-party trackers (the game has none today). COPPA / GDPR-K apply.
- **The server is now internet-facing.** The old loopback `Host`/`Origin` guard is gone, so auth, HTTPS, rate limiting and input validation matter. Reuse `sanitize()` and `clean()`; keep the 100 KB cap; run `mend()` server-side.
- **Settings are device-level.** A grown-up's changes on one device will not follow the child. I would leave that as-is and note it; syncing settings is a separate decision.
- **The `seed` in the save.** If two devices diverge, the gala outcome differs. That is fine, but worth knowing.
- **Migration.** Existing v2 saves and round-1 `gala-toy-v1` saves must still open; the adoption path must run `mend()` / `fromRound1()`.
- **Backups.** One database file; back it up.

### I. In what order

1. **Backend skeleton + database + family/child/session/progress endpoints.** Split `serve.mjs`; keep `/api/settings` local.
2. **`store.js`:** auth header, per-child progress, outbox/retry, `409` handling.
3. **`state.js`:** per-child keys, adoption/merge, `mend()` on load.
4. **Sign-in UI:** the top-bar chip, "Who's playing?", the PIN keypad, new-device sign-in.
5. **`grownups.js`:** the Family tab (create family, add/rename/remove children, reset PIN, recovery code).
6. **Offline + conflict:** the outbox, reconnect, the "two versions" screen.
7. **Tests** (unit + browser) and a migration test for existing device saves.

---

## 3. What I would check to know it works

**Unit (`node --test`, alongside the existing `tests/*.test.mjs`):**

- Adoption: a device save with no account becomes the child's progress, and nothing is lost.
- Per-child keys: two children, two saves, no bleed between them.
- Outbox: a failed `PUT` is retried and the latest blob wins.
- Conflict: a `409` keeps both versions and surfaces a choice.
- `mend()` runs on server data; a round-1 save still opens.
- Child and family names go through `clean()`; a rude name is refused.
- PINs and tokens are hashed, never stored in clear.

**Browser (Playwright, following `tests/browser/helpers.mjs`):**

- Sign in on device A, play, sign in on device B, see the same progress — the "another device" requirement.
- Two children on one device: each sees their own progress; switching needs the PIN.
- Guest still works with no account, and the game is unchanged for them.
- First sign-in adopts the device's existing progress.
- Offline mid-game: play, drop the network, keep playing, reconnect, the server catches up.
- Conflict: two devices offline, both play, reconnect, both versions survive.
- The existing suites still pass: `npm test` and `npm run check`, including the monkey test (`tests/browser/monkey.spec.mjs`), which must stay clean.

**Manual:** the grown-up flow end to end; recovery; deletion.

---

## 4. How I found my way around

**Easy.** The file headers are excellent — almost every module opens with a sentence saying what it is and what it is not. `state.js`, `store.js` and `serve.mjs` are small and self-explanatory, and the save format is documented in comments. The tests are named after the requirements they check, so they double as a spec. The "no build step, pure engine, thin server" shape is easy to hold in your head.

**Hard.** `ui.js` (762 lines) and `world.js` (417 lines) are dense and do a lot per function; `engine.js` is one large pure function whose judges interlock; `i18n.js` is huge. Understanding the full shape of the save needed `plan.js` + `data.js` + `state.js` read together, because the plan and school are built in `plan.js` but repaired in `state.js`. The `at`-based merge in `load()` is easy to miss and is the crux of the whole feature.

**Where I am unsure of what I wrote.**

- **The deployment target.** I assumed a hosted server reachable over the internet. If "another device" means the same home network, the design is simpler (no HTTPS/CORS, a LAN address). This changes §2A.
- **Whether settings should sync.** I kept them device-level. If a grown-up expects their renamed steps to follow the child, that is a different plan.
- **The exact conflict policy.** I proposed "keep both, let the grown-up choose." A simpler last-writer-wins is easier but can lose work; a full three-way merge of two plans is a lot of work. This is the riskiest part of the plan.
- **The database choice.** SQLite is the right tool, but the project is deliberately dependency-free and on Node 20; `node:sqlite` is newer. The JSON-file fallback is real but weaker under concurrent writes.
- **The grown-up identity.** Today there is only a device gate (long press + sum), no account. I invented a family code + PIN. The right shape depends on what the family will actually tolerate.
- **Clock skew and the `at` field.** I moved authority to the server's `rev`, but I have not verified how the existing `load()` merge behaves when a device's clock is wrong; that needs a test.
- **PIN strength.** A 4-digit PIN is guessable; I leaned on rate limiting and the fact that this is a family device, but I am not certain that is enough for the privacy rules that apply to children's data.
