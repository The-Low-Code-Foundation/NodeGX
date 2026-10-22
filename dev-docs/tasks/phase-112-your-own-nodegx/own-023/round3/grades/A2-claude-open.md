# OWN-023 round 3 — grade: A2-claude-open (Claude Code with Claude Opus 5.5, plain-code JavaScript + three.js, open brief)

Sources: `PLAN.md` and `then.md` under `/private/var/tmp/own023-r3/A2-claude-open/`, with every claim checked in `work/gala/` (the plan file itself was ignored as evidence). Key: `round3/key-code.md`. Wherever I relied on something the key did not state, I checked it in the source. The key and the source never disagreed on a point used here.

**Headline:** quiz 21/22 (0 confidently wrong) · micro 62 right / 2 wrong / 2 unverifiable of 66 claims, 0 wrong claims built on · MUST 7/8 · SHOULD 5/5 · traps 1 fallen / 11 avoided · secrets 6/10 · soundness 18/18 · P(ship without redesign) 70%.

---

## A) Quiz

| Q | Score | Conf. | Justification (against the key) |
|---|---|---|---|
| 1 | 2 | sure | It says the player runs a dance school's end-of-year show, plans the order, blocks of steps, costumes, dressing room, snack and the car park from season 2, that rehearsals and try-outs are free, and that the gala is played once to earn stars. That covers key (a)–(c). (d), bilingual and for children, is missing here but covered in Q9. |
| 2 | 2 | sure / fairly sure (cam bar) | Top bar, camera bar, all 8 prep tabs with Parking from season 2, the prep/run/results screens, the intro card, the gate, and the settings panel with its exact 5 tabs (steps, costumes, shop, school, file). It catches the hidden settings screen. |
| 3 | 2 | sure | It names `G.S` and its contents, `localStorage['gala-game-v2']` **and** `save.json` in `~/.gala-de-danse`/`$GALA_DIR` via PUT `/api/save`. Timing: every `changed()`, plus lang, sound, intro, gala end, next season and reset, a 300 ms debounce sending the last version only, and a pagehide flush. Settings are kept separately (`settings.json` + `gala-settings-copy`). Thin spots: newest-`at`-wins isn't stated here (it is in the plan), and it says `gala-toy-v1` is "read once" when it is read whenever v2 is absent. |
| 4 | 2 | sure | A local `serve.mjs` on 5173 that serves the files plus `/api/settings` and `/api/save`, with the 127.0.0.1 bind and the Host/Origin refusal, and no accounts. Key (d), that the game degrades without the server, isn't stated. |
| 5 | 2 | sure | Hold ⚙️ for 2 s, then a multiplication "roughly 12–19 × 3–9". No real permission check, refused during a run, aimed at accidents. Key (d), values clamped and filtered, is missing. |
| 6 | 2 | fairly sure | `beginRun('gala')` → `startRun` (refuses if `galaDone`) → `simulate()` up front with the season's seed → `G.run` → frame loop `stepRun`/`sayText`/`stepScene`/`updateDancers` → `finishRun` (galaDone, stars + earned, notebook, `save()`) → results. It covers every must-have and names all the right pieces. |
| 7 | 1 | fairly sure | Spending (shop, Build, furniture, costumes, snacks, upgrades) and "only from the gala" are right, as is the 30-star start that grown-ups can change. But it says points are "summed from each number's score" plus a perfect bonus, which misses the evening-level points: on time, bed, costume wait, start, goûter, parking and parents ÷5 (key (a)). |
| 8 | 2 | fairly sure | S2 car park and Parking tab; S3 teens with hip-hop, the mat (floors) and yawns (moods); S4 mums; then a generic intro. `nextSeason` increments the season, clears galaDone, draws a new seed and adds numbers. "Progress carries over" is only implied. |
| 9 | 2 | sure | It covers `G.lang`, the toggle that saves, `i18n.js` `t()`, the row `fr`/`en` names through `nm()`, grown-up renames and the fr default. It avoids the "all words in i18n.js" trap. |
| 10 | 2 | sure / fairly sure (unknown v) | `fromRound1` for `gala-toy-v1` v1; `mend()` fills new fields, sets a missing `at` to 0, adds the season's numbers, turns phrase × repeats into a block chain, swaps out undefined items, cleans names and clamps stars; an unknown `v` is ignored. That is all of key (a)–(e). |
| 11 | 2 | fairly sure (tunes guessing) | Pure: engine, plan, settings, words, data, with the note that `applyRows` mutates data. In between: state and store. Screen: main, ui, play, world, people, grownups, with music for audio. `tunes.js` as pure data is right, though it says it is guessing. It doesn't say engine randomness is seeded or that play only replays (that is in Q6). |
| 12 | — (opinion) | fairly sure | Saves travelling between devices whose settings differ: `mend()` strips `new1`–`new12` items and the stripped save gets uploaded. This is the key's Q12 risk #2, almost word for word. The runner-up it names (a global `G.S` swappable only by reload, so it depends on the offline cache) is also real. |

**Total 21/22. Confidently wrong: 0.** Its confidence was well calibrated. Every "fairly sure" was right or nearly so, and the one 1-score (Q7) was flagged "fairly sure".

---

## B) Plan — micro (claims about the existing app)

**66 claims checked: 62 right, 2 wrong, 2 unverifiable. Wrong claims a plan step depends on: 0.**

Right (grouped, each checked in source):
- **What it is:** browser management/puzzle game, French default with an EN toggle, fallback school name "École de danse Étoile" (`i18n.js:21`); the list of things to prepare; `mode:'rehearsal'` free, `mode:'try'` rolls fresh dice (`play.js:111`); the gala once per season for stars; teens in S3, mums in S4; `simulate()` computes everything in advance and 3D only replays it.
- **Build:** no build step; `index.html` loads `src/main.js` as a module; three.js vendored via an import map; Google Fonts (Fredoka, Nunito, Playball) (`index.html:7,9`).
- **serve.mjs:** `npm start` on 5173; static files plus exactly two endpoints; files outside the folder in `~/.gala-de-danse`/`GALA_DIR`; tmp-then-rename; 100 KB cap; `127.0.0.1` bind; 403 unless Host is local and Origin is the same local port (`:20-25,58`); a public host would 403 and the game would quietly fall back (`store.js:11`); `keep()` checks only `v===2` (`:17`); `TYPES` has no `.woff2` (`:13`).
- **Module table:** main, state, store, ui, play, plan, data, settings, grownups, words, world/people/music/tunes. Every export it names exists. `applyRows` mutates in place (`data.js:242-251`). serve uses `settings.js` (`:9`). world, people, music and tunes never touch storage (grep: 0 hits).
- **Tests:** 39 Node tests (13+3+4+13+2+4 counted). `npm run check` runs the settings, persistence and one-minute monkey specs (`monkey.spec.mjs:8`, 60000 ms). Playwright isn't installed (no `node_modules`). The tests are numbered from "change 001", and `helpers.mjs:13` references a `changes/` folder that isn't there. `settings.test.mjs` test 15 is the never-throws test.
- **Save document:** the `G.S`, `plan` and `school` shapes match `fresh()`, `defaultPlan()` and `defaultSchool()` exactly. The notebook entry shape matches `ui.js:550`. A fresh save is "about 3 KB": I measured 3,026 bytes.
- **Persistence:** `load()` mends both copies, larger `at` wins, the loser is discarded, the winner is written back (`state.js:74-82`); `at` is the client's `Date.now()`; `save()` writes localStorage synchronously then calls `putFile` (300 ms, last version only, no retry); a failed PUT isn't remembered; `load()` calls `save()` (so it uploads) when the browser's copy wins.
- **Save callers:** `changed()`, school-name `oninput` (`ui.js:426`), `finishRun`, `nextSeason`, `showIntro`, lang and sound in `main.js:29,32`, and `resetAll` from the notebook reset (`ui.js:534`) and "Start a new school" (`grownups.js`).
- **Runs:** `G.run` is never saved; the gala seed is stored; dying mid-gala leaves `galaDone` false and replays the same evening; only `finishRun` writes the result; runs need no network.
- **Boot:** `loadSettings()` and `getFile('save')` in parallel → `applySettings` → `load` → world (`main.js:19-23`); `G.S` is global (read by `buildDancers`, `refreshWorld`); a reload is the only clean swap, and `closeSettings` already reloads (`grownups.js:70-76`).
- **Settings:** renames, prices, up to 12 new steps and costumes `new1..new12` (`MAX_NEW`, `isNewId`), starting stars; stored per machine plus `gala-settings-copy`; the settings document is `{v:1, rows}`; `mend()` replaces or filters anything missing from the current rows, and the next `save()` uploads the result (`state.js:52-60`); `mend` can't run server-side because it depends on the mutable `data.js` tables.
- **Gate and identity:** the sum runs from 12×3 to 19×9 (`grownups.js:50`); no accounts, passwords or identities anywhere; `#top`, `#grown` and `#gate` exist; `esc()` is in `ui.js`; settings file export and import exist; `window.__game.settings` is exposed.

**Wrong (2), neither built on:**
1. *"`i18n.js` — All the French and English text."* (module table, 1.2). The names of things live on the data rows as `fr`/`en` fields (`data.js`, read via `nm()`). This is an aside: the stranger gets it right in quiz Q9, and the plan only puts *new* sentences in `i18n.js`.
2. *"A fresh save … grows only through `notebook`, by one entry per gala."* (1.3). `addSeasonNumbers` adds `A1`/`A2`/`F1` number plans in S3 and S4 (`plan.js:74-85`), and blocks and furniture vary with play. Only the size argument rests on it ("saves are well under the 64 KB keepalive limit"), and that conclusion still holds.

**Unverifiable (2):** *"All 39 pass (I ran them)"*: I didn't run the tests (the count is right). *"'she' in the comments is the player"*: it's mixed. `engine.js:14` "what she owns" refers to the player, but `engine.js:291` and `play.js:83` refer to a dancer.

**Near-miss, counted right:** 2.5 lists "the older `gala-toy-v1`, already migrated by `fromRound1`". That's true as a description of today, but the key is **never deleted** and is read again whenever `gala-game-v2` is absent (`state.js:66-71`). The plan's claim step renames `gala-game-v2` to `gala-claimed:<id>` and relies on "the guest slot is then empty, so a sibling isn't offered the same school". For a round-1 upgrader, `fromLocal()` would bring the round-1 school back as the guest. See the trap under C.

---

## C) Plan — macro

**MUST 7/8**
- ✅ 1 `state.js` key, load, save and resetAll: the guest keeps `gala-game-v2`, per-profile `gala-p:<id>` slots, and newest-`at` kept only for the guest/local server while profiles use `sync.resolve()`. `resetAll` sends the reset copy to history. (The legacy key is "claimed once" only implicitly; see the trap.)
- ✅ 2 `store.js`: reuses its debounce and flush pattern, adds an outbox with `dirty` kept in localStorage, retry with backoff, `online`/`visibilitychange`, keepalive and a bearer token.
- ✅ 3 `serve.mjs`: kept local and unchanged. The new backend does real structural validation, because today only `v===2` is checked.
- ✅ 4 `main.js` boot: device, then active profile, then Who's playing? *before* the world is built; family settings are applied *before* `load`; `window.__game` is kept and extended.
- ✅ 5 Save triggers: hooks once in `save()` (dirty plus `sync.schedule()`), with an immediate flush after `finishRun` and `nextSeason`.
- ✅ 6 `mend()` with its settings dependency: this is the centrepiece. It has `mend` report repairs, never uploads a save repaired under foreign settings, keeps `unmended`, moves settings to the family, and adds tests for old saves.
- ❌ (partial) 7 The `v===2` gates: it keeps `v:2`, rejects higher `v` on the server (422) and on the client, but never notices that `state.js:68,77` and `serve.mjs:17` hard-code 2. A later bump would make the client silently ignore the save.
- ✅ 8 "Start a new school" resets only the active profile; the notebook reset says whose school it resets.

**SHOULD 5/5:** 9 the sum gate stays for guests and the plan notes it isn't real protection; family settings need a real grown-up sign-in · 10 settings become per family, with a cached `gala-fs:<id>` and an "Use these settings for the whole family?" migration · 11 lang, sound and `seenIntro` are named as per-player preferences inside each slot · 12 every string goes into both FR and EN, and `clean()` and `esc()` are reused (the specific "kept on this computer" copy isn't named) · 13 tests extend `save.test`, `001-persistence`, the monkey spec and the helpers' contexts, adding offline, two-children and first-sign-in cases.

**Traps: 1 fallen, 11 avoided.**
- Avoided: more than one save location; settings separate and global; saves depend on settings and load order; saved vs derived; no mid-run save; save timing; "Save to a file" is settings only (it proposes a *new* save export "mirroring" it); `v===2` (never bumps); failed PUTs not retried (named explicitly); lang and sound inside the save; one `save.json` per machine (described per machine, never per browser).
- **Fallen (minor): the legacy key `gala-toy-v1`.** The plan treats it as already migrated away (the quiz says "read once and migrated"). Its claim step empties the guest slot by renaming `gala-game-v2`, so a round-1 player's old school would come back as the guest and be offered to a sibling. That causes confusion, not data loss.

**Secrets 6/10.** Found: #1 (the seed fixes the gala and a reload replays the same evening); #3 (settings are applied before the save so `mend` can repair it); #4 (the server sanitizes settings but accepts any `v:2` save); #5 (a missing `at` becomes 0, in quiz Q10; the tie rule isn't stated); #9 (12–19 × 3–9 and refused during a run); #10 (`mend` clamps 0–999999 and runs `clean()` on names). Not found: #2 (try-out fresh seed found, but "the rehearsal never slips" is missing); #6 (price 0 means owned); #7 (`EDITABLE` vs `SCHEMA` for rules and parking); #8 (keepalive only under 60,000 bytes; the plan quotes the browser's 64 KB limit instead).

---

## D) Plan — soundness

| # | Score | Why |
|---|---|---|
| 1 Child sign-in, no email, grown-up sets up | 2 | Family account with a verified grown-up email; child profiles with a display name, an avatar and an optional 3-of-9 picture code; a family code plus a printable QR card; family devices link once. It is honest that the picture code is only sibling-proofing. |
| 2 Two children, one device | 2 | Per-profile slots, a "Who's playing?" screen, a switch that flushes then reloads (the existing way to swap `G` and re-apply rows), one active tab per profile, and a guard so a sibling isn't offered an already-claimed school. |
| 3 Works with no sign-in | 2 | The guest slot is exactly today's key and behaviour; `config.js` empty means accounts are off; the local `serve.mjs` is unchanged; there's a test that existing suites still pass. |
| 4 First sign-in keeps device progress | 2 | An "Is this your school?" card, a two-card choice when an online save exists, the loser kept in history, a 30-day `gala-claimed` copy, a grown-up can reassign, and a bridge from localhost to the hosted site (different origin, so the hosted site can't see local progress) through CORS sign-in plus a save-file fallback. Small hole: the legacy key (C). |
| 5 Offline / mid-game drops | 2 | The local slot is written first and synchronously; `dirty` survives a reload; backoff retry; server revisions with a 409; a no-merge progress rule `(season, galaDone, notebook.length)` so stars aren't double-counted; clocks are for display only; a service worker for offline reloads; the mid-gala case is reasoned correctly from the seed. |
| 6 Server workflows concrete | 2 | Email verification before any child exists, reset and email change, a versioned consent record, export and soft-then-hard delete, inactivity expiry, history pruning, monitoring with the 409 rate as a sync-bug signal, a backup restore drill, per-family scoping (404 across families), rate limits, and a field-by-field structural validation of saves. |
| 7 Children's data | 2 | Collects no child email, surname, birthday or school; consent under GDPR art. 8 with COPPA noted; export and delete; retention; EU hosting; self-hosted fonts so children's IPs don't go to Google; shared devices show one child only; names are never shown to other families; a legal review. |
| 8 Fit to the app | 2 | Builds on what exists: the `store.js` pattern, the `changed()`→`save()` funnel, `clean`, `esc`, `sanitize`, reload-to-apply and `window.__game`. It found the deepest collision (settings change what a save means) and designs around it. Minor misses: the legacy key and the hard-coded `v===2` locations. |
| 9 Ordering and verification | 2 | Ten steps that each ship; profiles on one device come before any server, to de-risk; tests target real failures (a wrong clock, stars counted once after offline play, `new3` surviving travel, no trace left on a shared device, network flapping in the monkey test) plus real-device and usability checks. |

**Total 18/18. Probability of shipping without a redesign: 70%.**
**Biggest risk:** scope against an unknown deployment. The plan builds a full hosted account system (email auth, Postgres, a service worker, CSP, two kinds of device, history and restore UI) for a game whose only server today is a 127.0.0.1 file-keeper. If players really run it locally with `npm start`, then the CORS bridge from localhost to the hosted site and the claim flow become the main path, and they are the least-designed part. The stranger flags this uncertainty itself ("before building step 7, I'd check with whoever deploys it"). It also couldn't know the owner's house rule against accounts and data leaving the machine (CLAUDE.md, not given), which may need a ruling before any of this.

---

## E) The thought process

**What it says.**
- *Easy:* the code is small, each file opens with a header comment, the pure modules are separate from the DOM, the tests read as user stories, and every action funnels through `changed()`→`save()`.
- *Hard:* the code is very dense (it gives the example that `load()` calls `save()`), the "change 001" spec is missing, and the vocabulary ("school", "she", settings as rule overrides). Seeing that settings change what a save means took reading `settings.js` and `applyRows()`.
- *Unsure:* how the game reaches players, who the settings are for, its own conflict measure, Safari's eviction policy, legal details, and that it never ran the browser suite.

**Does it match the numbers?** Largely yes.
- It was fast and direct: the first look at the save came at 0.1 min, and the 46.5 KB plan was written at 5.7 min (5.9 min wall, 17 tool calls, no subagents, $1.54 plus $0.76 for the quiz).
- The 19 files read are exactly the persistence path plus the tests. That fits its account of reading `state.js`, `store.js`, `main.js`, `settings.js`, `plan.js` and `grownups.js` in full and only the save-touching parts of the rest.
- Two small mismatches:
  - The metrics' file list doesn't name `serve.mjs`, `index.html` or `package.json`, though the plan's claims about them are exact (Host/Origin, `TYPES`, the import map). They were evidently read through a multi-file `cat` whose output was persisted.
  - It says it ran `npm test`, but the Bash first-words show `node` ×3 and no `npm`. It probably ran `node --test` directly, which is the same suite.
- Its "guessing" on `tunes.js` in the quiz matches "skimmed only for imports".
- The one error was a permission denial on a directory, probably an attempt to look outside the folder (for the missing `changes/` spec).

**Strongest understanding:** the persistence layer and its hidden coupling. It got the two-copy reconciliation, the client-clock `at`, the absence of retries, `load()` uploading, and above all that `mend()` repairs saves against the currently applied grown-up settings, so a save that travels can be stripped and the loss spread. That last point is the key's Q12 risk #2, found with no docs, and it drives the plan's design (family-scoped settings, `settingsRev`, `unmended`). Its account of the run and replay model (seeded gala, nothing to save mid-run) is also exact.

**Weakest understanding:** the scoring economy (quiz Q7 misses the evening-level points), details of the rules it didn't need (rehearsal never slips, price 0 means owned, `EDITABLE` vs `SCHEMA`), and the lifecycle of the legacy key `gala-toy-v1`. That last one is the only gap that leaks into a plan step. It reads the code as it is today, and its blind spots are where it chose not to look rather than places where it misread something.
