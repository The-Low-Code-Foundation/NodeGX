# OWN-023 round 3: grade for A-claude (Claude Code with Claude Opus 5.5, plain-code JavaScript + three.js)

**Sources read:**
- the plan: `/private/var/tmp/own023-r3/A-claude/work/gala/PLAN.md` (534 lines);
- the quiz answers: `/private/var/tmp/own023-r3/A-claude/then.md`;
- the app source under `work/gala/` (`PLAN.md` ignored as a source of facts);
- the key: `key-code.md`, plus the metrics, the brief and the quiz.

**How claims were checked:** by reading the source, with grep and two node one-liners. One of the one-liners measured the size of `fresh()`. I also ran `node --test tests/*.test.mjs` to check the plan's "39 pass": the result was 39/39.

**Key vs source:** I found no disagreements. Every key citation I relied on matched the source (`state.js`, `store.js`, `main.js`, `serve.mjs`, `grownups.js`, `ui.js`, `play.js`, `data.js`, `settings.js`).

---

## A. Quiz (21/22, 0 confidently wrong)

| Q | Score | Conf. | Justification (against the key) |
|---|---|---|---|
| 1 | 2 | sure | **Right:** a dance-school gala planned over seasons; the order, formation, steps, costumes, snack, dressing room and car park from S2; free rehearsals and try-outs; one gala a season that earns stars; bilingual. **Thin:** it does not say the evening plays out in 3D, or that the game is for children. |
| 2 | 2 | sure / fairly sure | **Right:** the screens prep/run/results; all 8 prep tabs, with Parking from S2; the season intro; the top bar; the ⚙️ settings with its 5 tabs, named correctly. **Missing:** the camera bar and the try-out. |
| 3 | 2 | sure | **Right:** `gala-game-v2` in localStorage plus `PUT /api/save` to `~/.gala-de-danse/save.json` (or `GALA_DIR`); the full list of `save()` triggers; the 300 ms debounce, last version only; the pagehide flush; `gala-toy-v1` read and never written; settings kept in a separate file and key, plus the sessionStorage flag. **Missing:** the boot rule "newest `at` wins" (it is in the plan, not in this answer). |
| 4 | 2 | sure | **Right:** `serve.mjs` serves the files and has 2 GET/PUT endpoints; writes are atomic, capped at 100 KB and checked; it binds to 127.0.0.1 with a Host/Origin lock; no accounts. **Thin:** it does not say the game falls back to localStorage without the server. |
| 5 | 2 | sure / fairly sure | **Right:** a 2 s hold on ⚙️ plus a sum with the exact ranges 12–19 × 3–9; no identity, child-proofing only; refused during a run. **Missing:** values are clamped and sanitized for whoever gets in. |
| 6 | 2 | fairly sure | **Right:** `beginRun` → `startRun` (refused if `galaDone`) → `simulate()` computes the whole evening up front with the season's seed. Then the run object (dancers and cars hidden, table reset, which the source confirms at `play.js:116-118`); the frame loop with `stepRun`, `stepScene`, `updateDancers`, `paintRunSheet` and music; no stop during a gala; `onDone` → `finishRun` (`galaDone`, stars and earned, notebook, `save()`) → results. It hedged honestly on `paintResults`. |
| 7 | 1 | fairly sure | **Right:** spending (the shop, upgrades including the car-park ones, furniture, outfits and accessories, snacks, crêpes and compotes) and "only the gala pays; rehearsals show points"; a 30-star start that grown-ups can change. **Missing:** how points are earned, which is key point (a): per-number scores, programme timing, goûter, parking, parents and the perfect evening. "Gala night's points" is circular. |
| 8 | 2 | sure | **Right:** S2 the car park; S3 the teens (two hip-hop numbers), with the floor rule and the moods/yawn rule; S4 the mums; then a free season. `nextSeason` raises the season, resets `galaDone`, draws a new seed, adds the numbers and shows the intro. **Thin:** it does not say outright that progress carries over. |
| 9 | 2 | sure | **Right:** the toggle on `G.lang` with `save()` and a repaint, and `lang` kept in the save; `TXT.fr`/`TXT.en` read through `t()`; the row names in the `fr`/`en` fields of `data.js` read through `nm()`; grown-ups can rename them. Holds all three must-haves. |
| 10 | 2 | sure | **Right:** `mend()` is additive (fills fields, `migrateNumber`, season numbers, repairs removed costumes and steps, `clean()` on names, stars clamped, a missing `at` becomes 0); `gala-toy-v1` goes through `fromRound1` then `mend`; a broken save starts fresh. **Implicit only:** the `v===2` gate. |
| 11 | 2 | fairly sure | **Right:** engine, plan, data, settings and words are pure; state is "mostly, but it touches localStorage" (it avoids the trap); ui, world, people, play, main and grownups are on screen; music is "neither" (sound), which is defensible and not the wrong-side trap. **Missing:** `tunes.js`, `store.js`, seeded randomness, and "play only replays" (that last point is in Q6). |
| 12 | n/s | fairly sure | **Opinion:** silent loss through `mend()` when a save is opened against different settings, then pushed up. This is exactly the key's risk #2, and it is well argued. |

---

## B. Plan, micro: 75 claims; 73 right, 0 wrong, 2 unverifiable

All claims are about the existing app, checked in the source. Groups are summarised; each item is a separate claim.

**What it is (8, all right):**
- browser game in French with an EN switch;
- a dance school's end-of-year gala over seasons;
- tab ids `order`/`formation`/`gouter`/`costumes`/`build`, with `parking` from S2 (`ui.js:88`);
- rehearsal and try-out are free and leave nothing (`finishRun` saves only when `mode==='gala'`, `ui.js:548`);
- one gala a season earns stars, with a notebook entry;
- the S2–S4 additions plus a free season (`data.js:220-225`);
- `simulate()` is seeded and played back in three.js;
- the game addresses the player as "tu".

**How it's put together (23, all right):**
- no build step;
- `main.js` is loaded as a module;
- the import map points at `vendor/`;
- Google Fonts is the only outside request (`index.html:7`);
- `serve.mjs` runs on port 5173 via `npm start`;
- exactly 2 endpoints (`serve.mjs:15-18`);
- `~/.gala-de-danse` or `GALA_DIR` (`:12`);
- writes are atomic (`:43-44`);
- the 100 KB cap (`:19`);
- 127.0.0.1 plus Host/Origin (`:20-25,58`);
- no accounts;
- the `data.js` tables and `START.stars`, with `applyRows` working in place (`data.js:242-251`);
- `engine.js` is pure;
- the exports of `plan.js` are as named;
- `state.js` holds `G` and the save;
- `settings.js` is shared by the page, the server and the tests;
- the gate is a 2 s hold plus a sum;
- `words.js` `clean`/`isRude`;
- `i18n.js` holds the UI text in fr and en;
- `main.js` roles and `window.__game`;
- **39 unit tests, all pass** (I ran them: 39/39);
- each browser test spawns `serve.mjs` with `PORT=0` and a `mkdtemp` `GALA_DIR` (`helpers.mjs:17-18`);
- the tests cite `changes/001-grown-up-settings.md`, which is absent.

**The save, `state.js` (16, all right):**
- a fresh save is about 3 KB (measured: 3,026 chars);
- the `fresh()` key list matches `state.js:20` exactly;
- the contents of `plan` and of `school`;
- a notebook entry is about 150 bytes a season (measured about 134);
- `lang` and `sound` are in the save;
- `save()` stamps `at`, writes `gala-game-v2` and calls `putFile`;
- the callers of `save()` (`buy()` goes through `changed()`, which is fine);
- `fromLocal` → `fromRound1`;
- newest `at` wins, and a browser win is pushed to the server (`state.js:78-80`);
- `at` is the device clock;
- `mend()` fills fields, migrates and clamps;
- `mend()` replaces undefined costumes, steps and hair, and runs `clean()`. **Nuance:** steps are *filtered out* and hair goes to the class default, not to "the number's own". This is a minor imprecision; the substance (silently changed) is right.
- `load()` writes the mended copy back;
- `resetAll` is called from `paintNotebook` (`ui.js:534`) and from the grown-ups' "new school" (`grownups.js:221`);
- one save per browser plus one per machine.

**`store.js` (5, all right):**
- a 2.5 s timeout returns `{reached:false}`;
- a 300 ms debounce sending the last version;
- no retry, so the waiters get `false` (`store.js:31-32`);
- offline catch-up happens only at the next load;
- the pagehide `keepalive` is used only under 60 KB.

**`main.js` and grown-ups (7, all right):**
- settings and save are fetched in parallel;
- `applySettings` runs before `load`;
- `closeSettings` → `location.reload()` (when the settings are dirty);
- the settings cover names, prices, 12 new moves and 12 new outfits (`MAX_NEW=12`), and starting stars;
- `settings.json` plus `gala-settings-copy`;
- the save-to-file / load-from-file pair;
- the gate sums (15×7 is in range).

**Runs (3, all right):**
- `play.js` makes no network calls;
- the gala is decided by `simulate` with the season's seed and saved only in `finishRun`;
- after a mid-gala death the rerun is identical.

**Claims embedded in parts 2–4 (13; 11 right, 2 unverifiable):**
- `mend` depends on globals applied by `applyRows`: right;
- `serve.mjs` imports shared pure code from `src/`: right. It imports only `sanitize`, not `clean`; the plan's "as serve.mjs already does" is about the pattern.
- `newIds()` exists (`settings.js:184`), and the paths `costume.outfit` and `blocks[*].moves` are right;
- every `localStorage` call is in a `try`: right (`fromLocal` is wrapped by `load`);
- `ui.js` has 762 lines: right;
- the project is about 5,000 lines with tests: right (5,005);
- `serve.mjs` has a "school's progress" comment: right (`:3`);
- comments call the player "she": right (`engine.js:14`);
- `node_modules` is absent: right;
- `window.__game.settings` exists: right;
- `hud()` and `#top` exist: right;
- *unverifiable* (platform facts, not app facts): keepalive bodies limited to about 64 KB in total; Safari's 7-day storage eviction.

**Wrong claims: none. Wrong claims the plan builds on: 0.**

---

## C. Plan, macro

**MUST: 7/8 found.**
- **#1 `state.js` keys, load, save, reset: found.** `saveKeyFor(profile)`; `load()` split into guest and child; `save()` routes to the active profile's writer; `resetAll` acts on the active profile only; `gala-toy-v1` and `save.json` are treated as guest data that is claimed once.
- **#2 the `store.js` seam: found.** It is kept for guests, and a new `sync.js` outbox adds retries, `If-Match`, `pagehide` and `online`. The plan notes explicitly that a PUT is never retried today.
- **#3 `serve.mjs`: found.** It is left localhost-only, and a separate authenticated backend validates the shape and size of a save.
- **#4 `main.js` boot order: found.** The profile is chosen first; family settings come before the child's save; `window.__game.sync` is exposed.
- **#5 save triggers: found.** The plan hooks once inside `save()`.
- **#6 `mend()` and the settings dependency: found, and central to the plan.** It adds tests that pin today's `load`/`mend` behaviour; extra state lives outside `G.S`, so `fresh()` is unaffected.
- **#8 "new school" and the notebook reset: found.** Both reset the active child, a `before-reset` history entry is written, and ⚙️ is redirected when a child is signed in.
- **Missed: #7 the hard-coded `v===2` gates.** They are never named. The plan keeps `v:2` and wraps the save under a new key, so it does not trip on them; it is safe by accident, not by analysis.

**SHOULD: 4/5 found.**
- **Found:**
  - #9 the gate is kept for guests and explicitly "not auth";
  - #10 settings become family-scoped, with the device settings offered on first use;
  - #12 new strings in fr and en, and nicknames go through `clean()`;
  - #13 reuses `startServer`, `monkey.spec.mjs` and the existing suites, and adds two-children, offline and first-sign-in cases.
- **Missed: #11.** The plan notices that `lang` and `sound` live in the save, but never decides whether they are per child or per device. It also does not mention `seenIntro`.

**TRAPS: 12 avoided, 0 fallen into.** The plan avoids all 12:
- two save locations;
- settings are separate and global;
- saves depend on settings;
- saved vs derived;
- no mid-gala save;
- one save per machine as well as per browser;
- save timing;
- "save to file" holds settings only;
- the `v===2` gates (not bumped);
- no PUT retry;
- the legacy key;
- `lang` and `sound` are in the save.

**SECRETS: 6/10 found.**
- **Found:**
  - #1 the seed fixes the gala, and a reload replays it;
  - #3 settings are applied before the save so that `mend` repairs against them;
  - #5 a missing `at` becomes 0 (quiz Q10; the tie rule is not stated);
  - #8 keepalive under 60 KB vs the 100 KB server cap (the plan links them in its request-size risk);
  - #9 the gate ranges and the refusal during a run (quiz Q5);
  - #10 stars are clamped and the name is `clean`ed on every load.
- **Missed:**
  - #2 the rehearsal never slips, and a try-out uses a fresh seed;
  - #4 the server accepts *any* `v:2` save;
  - #6 a price of 0 means owned;
  - #7 the `EDITABLE` vs `SCHEMA` mismatch.

---

## D. Plan, soundness (18/18)

1. **Child sign-in without email, set up by a grown-up: 2.** The grown-up account has a verified email and a consent record. A child signs in with an 8-character family code, then taps their name, then a 4-of-9 picture password. Every attempt is rate-limited and lockouts are counted per device, and no child PII is stored.
2. **Two children on one device: 2.** One device session holds several children. Each child has their own `gala-child:<id>` key, and switching reloads the page (needed because `applyRows` mutates globals). A child who is not "remembered" must re-enter their pictures.
3. **The game works without signing in: 2.** The guest path is byte-identical (`gala-game-v2`, `save.json`, `serve.mjs`). The feature sits behind a switch that hides 👤, and the existing suites must pass with the switch on and off.
4. **First sign-in keeps the progress on the device: 2.**
   - It asks "is this school yours?" once per device.
   - Into an empty cloud account it imports the guest save, keeps a backup slot and records an `imported-from-device` history entry.
   - When the child already has a cloud school, it shows a "which school?" chooser and keeps the other in history.
   - The guest slot is reset only after the server confirms.
   - It runs a custom-item check before `mend` can strip anything.
5. **Offline and mid-game drops: 2.**
   - Saves go to localStorage at once, with a `pending` flag that survives a crash.
   - An outbox retries with back-off and on online, visibility, load and pagehide.
   - Conflicts are decided by a server `rev`, not the clock, and the unchosen copy goes to history.
   - The plan handles a reply lost after the server stored the write, and a session that expired offline.
   - A service worker allows an offline start.
   - A mid-gala drop is correctly shown to need nothing.
6. **Server-side workflows are concrete: 2.** The plan names:
   - the endpoints and what each checks (session membership, deleted, `v===2`, shape, size, `clean`, `If-Match`/409);
   - an append-only conflict endpoint;
   - lockouts with notices to the grown-up;
   - purge, trim and expiry jobs, plus backups.

   It explains why the server must not run `mend()` (the shared globals would leak across families).
7. **Children's data: 2.**
   - Consent is recorded at grown-up sign-up and given legal review (GDPR art. 8, France at 15, COPPA).
   - Children give no email, birth date or real name; avatars are pictures, not photos.
   - The grown-up gets export and deletion, which is soft for 30 days and then purged.
   - Logs keep no request bodies; there is no telemetry.
   - The fonts are self-hosted to stop children's IP addresses going to Google, a sharp catch.
   - An id-swap test ensures one family can never read another's data.
8. **Fit to the app as it is: 2.** It reuses the `store.js` pattern, `settings.js` `check`/`sanitize`, `clean()`, reload-to-apply, the gate, `startServer` and `window.__game`. It leaves `serve.mjs` alone and correctly identifies that there are no existing accounts or roles. One small gap: there is no decision on whether `lang`, `sound` and `seenIntro` are per child or per device.
9. **Ordering and verification: 2.** The sequence has 10 steps, and each keeps the game working. Tests are written per requirement and include:
   - the `mend` custom-item trap;
   - clock skew;
   - a reply lost during a PUT;
   - an offline reopen;
   - an id-swap security test;
   - real devices and a family trial.

   One small inconsistency: step 2 routes child saves to `sync.queue`, but `sync.js` is only built in step 6.

**Probability a competent team ships it without a redesign: 75%.**

**Biggest risk:**
- The `mend()`/settings coupling is mitigated, not closed. Suppose a signed-in child opens the game offline with a stale cached family-settings copy, for example after a grown-up has added `new3`. Then `mend()` strips `new3`.
- The child's next edit (the plan only skips the write-back made *on load*) pushes the stripped save with a matching `rev`, and the server accepts it.
- That is recoverable only through history and a grown-up.
- Second: the whole-save "pick one school" conflict rule may prove too blunt in the family trial.

---

## E. The thought process

**What the stranger said:**
- **Easy:** a small project with no build step, clear file-head comments (especially `serve.mjs`, `state.js`, `store.js` and the `applyRows` comment), and a well-isolated persistence layer. It ran `npm test` and got 39/39.
- **Hard:** the dense style (one-letter names, French domain words), and `ui.js` and `world.js`, which it read only around `save()`/`resetAll()`. Also the missing `changes/001` spec, and three side effects: `mend` writing back, `applyRows` mutating globals, and no PUT retry.
- **Unsure:** whether "school" means a real school install; who plays; the browser tests (not run); the picture password; the legal points; save sizes measured only on `fresh()`.

**Do the numbers match?**
- **Yes:** 4.6 minutes of wall time, 13 tool calls and no subagents. It reached the save code within 0.1 minutes and wrote the plan at 4.4 minutes. It read 15 files, all clustered on persistence (`state`, `store`, `main`, `grownups`, `settings`, `data`, `plan`, the save and persistence tests). That is exactly the "persistence is well isolated" path it describes.
- `serve.mjs`, `play.js` and `engine.js` are not in the metrics file list, yet the plan states facts from all three precisely: the Host/Origin lock, the atomic rename, the 100 KB cap, and the comment at `play.js:110`. They were most likely read through multi-file `cat` or `grep`, which the list does not attribute.
- Its own account of what it skipped (most of `ui.js`, `world.js` and the engine) lines up with its weakest quiz answers.

**Where its understanding was strongest:**
- **Persistence, end to end:** the two copies and the newest-`at` rule, the debounce, no retry, the keepalive limit, `mend` against applied settings with the write-back, reload-to-apply, and why the server must not run `mend`.
- It turned each of these into a specific design response, which is the hallmark of this plan: almost every design decision is traceable to a source fact.

**Where it was weakest:**
- **The scoring engine:** it could not say how points are earned (Q7); it missed that a rehearsal never slips while a try-out takes a fresh seed; and it missed that a price of 0 means the item is free.
- **The edges of `settings.js`:** the `EDITABLE`/`SCHEMA` mismatch, and that the server accepts any `v:2` save.

None of these gaps touches the feature, which is why the gaps cost it almost nothing in the plan.
