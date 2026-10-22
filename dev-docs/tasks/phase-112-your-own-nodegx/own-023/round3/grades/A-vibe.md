# OWN-023 r3 — grade: A-vibe (Mistral Vibe 2.26.1 + DeepSeek V4.1 Flash, plain-code three.js gala)

Sources read: PLAN.md and then.md under `/private/var/tmp/own023-r3/A-vibe/`, the app in `work/gala/` (source only, PLAN.md ignored for app facts), key-code.md, metrics/A-vibe.json, brief.txt, quiz.txt. One cheap node probe of `mend()` (below). The key and the source agree on everything this grade relies on. Nothing in it marks the stranger down for the docs-only disagreements in key §D.

## A. Quiz — 19/22, confidently wrong: 0

| Q | Conf. | Score | Justification (vs key) |
|---|---|---|---|
| 1 | sure | 2 | Gala you plan, then watch in 3D. Lists order, formation, costumes, loge, goûter and parking (from season 2). Free rehearsal vs a once-a-season gala that earns stars. Bilingual, ages 8–13. Has every full-marks point. |
| 2 | sure | 2 | prep/run/results, all 8 prep tabs with Parking from season 2, the grown-ups' screen with its 5 tabs, the intro modal and the top bar. Misses only the try-out and the gate dialog. |
| 3 | sure | 2 | `gala-game-v2` plus the server `save.json` in `~/.gala-de-danse`/`GALA_DIR`. Saves on every change via `changed()`→`save()`, with a 300 ms debounced PUT. Settings are separate (`settings.json` plus `gala-settings-copy`), and it names the legacy `gala-toy-v1`. Newest-`at`-wins is in its Q10 answer, not here. |
| 4 | sure | 2 | `serve.mjs`, the two endpoints, files outside the folder, no accounts, 127.0.0.1 plus the Host/Origin check. Doesn't say the game degrades to localStorage (it does say so in PLAN §1). |
| 5 | sure | 2 | 2 s long press, then a×b with "roughly 12–19 times 3–9" (exact, `grownups.js:50`). Says it's a speed bump, not auth, and mentions loading a settings file. Omits the clamping/sanitizing (key d) and the refusal during a run. |
| 6 | fairly sure | 2 | `beginRun`→`startRun`→`simulate({…seed: G.S.seed})` computes the whole evening up front. `stepRun` plays the trace back. `finishRun` credits stars, writes the notebook entry and calls `save()`, then `paintResults`/`verdictCards`. Every must-have (a–e). |
| 7 | fairly sure | 2 | The exact per-number /17 split and every bonus, matching `engine.js:313-350`. Gala only, the rehearsal just shows what it would earn. Lists the shop categories. |
| 8 | sure | 1 | Season constraints are right (S2 car park, S3 teens/mat/yawns, S4 mums), and so are `seasonRules`, `addSeasonNumbers` and the new seed. But it says "Four seasons", while seasons are uncapped with a free-season intro for S5+ (`ui.js:741`, `i18n.js:152`). It also never says progress carries over (key c). |
| 9 | sure | 1 | `G.lang` toggle, `TXT.fr/en` with `t()`, the fr/en row fields with `nm()`, number formatting. Misses must-have (c): the language is stored in the save (`state.js:84,79`). That matters for the plan (key trap "lang and sound inside the save"). |
| 10 | fairly sure | 1 | `mend()` repairs: fills keys, migrates numbers, resets removed items, re-cleans names, clamps stars. Converts `gala-toy-v1` via `fromRound1`. Covers a–c, but misses (d) the `v===2` gating that ignores unknown versions and (e) an old save getting `at=0`. |
| 11 | fairly sure | 2 | Pure: engine, data, plan, settings, words, tunes. i18n reads `G.lang`, and state touches localStorage, not the screen. main/ui/world/people/play/music/grownups draw. It puts `store.js` (fetch) on the "browser" side, which is defensible. It says play.js only replays the engine in Q6. |
| 12 | fairly sure | — | Opinion (not scored): the conflict policy, since the whole-blob save is all-or-nothing and last-`at`-wins would silently drop an evening. That matches key risk 1. It does not see key risk 2 (settings change what a save means). |

## B. Plan — micro (claims about the existing app)

**76 claims checked: 72 right, 3 wrong, 1 unverifiable. 1 wrong claim is built on.**

Almost every line reference in §1 is exact: `serve.mjs:11-12, 15-18, 20, 22-47, 58`, `store.js:7-14, 18-24, 25-35, 37-40`, `state.js:9-15, 18, 19-21, 43-65, 66-72, 74-82, 83-87, 88`, `main.js:19-25, 84-97`, `grownups.js:19-27, 33-44, 46-62, 66-76, 77, 171-175`, `ui.js:31, 56, 99-115, 534, 546, 740-751`, `index.html:13-21`, `i18n.js:19/179/328`, `words.js:48-53`. So are the descriptions behind them:
- the debounce and last-version-only send;
- the 2.5 s fail-quiet timeout;
- the pagehide keepalive flush;
- newest-`at`-wins, with the winner written back;
- the tmp-then-rename write and the 100 KB cap;
- GET returning `null`;
- the `__game` contents;
- the settings fallback copy;
- the engine judges and the play.js function names;
- `ICONS` in settings.js;
- the `npm test`/`npm run check` scripts and the monkey spec;
- `ui.js` = 762 lines and `world.js` = 417 lines.

Wrong claims:
1. **"`mend(s)` … it never throws"** (§1, state.js paragraph). False. A node probe of the source's `mend()` throws a TypeError on `{v:2, plan:null, school:{}}`, on `{v:2, plan:{}, school:null}`, on `plan.numbers:'x'`, and on a number with `blocks:[]` but no `costume`. `load()` only survives because it wraps the call in `try` (`state.js:76-77`). **Built on:** §2B has the server run `mend()` on every pushed blob "so a malformed or hostile client cannot poison a child's save". As written, a hostile blob makes `mend()` throw rather than get repaired. The server must catch that and refuse the blob, which the plan never says. The deeper problem is §C below: `mend()` depends on the settings.
2. **"`changed()` (`ui.js:31`) is the single save trigger — every edit calls it"**. Overstated. The school-name field calls `save()` directly on every keystroke (`ui.js:426`), and so do the lang and sound toggles (`main.js:29,32`). The plan's next sentence lists the other `save()` callers itself, and its design hooks `save()`/`store.js`, not `changed()`. **Not built on.**
3. **"A grep for `auth|login|…|pin|profile|child|user` … returns nothing (only `sessionStorage`)"**. Taken literally this is false: that case-insensitive grep matches `pinch0` (`main.js:40`), `userData` (people.js, play.js), `spin`, `lapin`, `pointerdown` and more. The metrics show no bash `grep` among the stranger's commands (ls, find, wc, cd), so the grep may never have run. The conclusion, that there's no identity of any kind, is right. **Not built on.**

Unverifiable: "the project is … on Node 20". `package.json` has no `engines` field, and nothing in the source names a Node version. "Dependency-free" is right for runtime (only `playwright` as a devDependency).

## C. Plan — macro

**MUST 7/8**
- found #1 state.js (per-child keys `gala-game-v2:<childId>`, guest slot, adoption)
- found #2 store.js (auth header, per-child, outbox/retry, 409)
- found #3 serve.mjs (drops LOCAL, split, HTTPS, re-validate)
- found #4 main.js boot ("the sequence a sign-in has to slot into", keep `__game`)
- found #5 save triggers (lists `changed`, `finishRun`, `nextSeason`, `showIntro`, the reset)
- found #7 version gates: the save is kept at v2 deliberately ("Nothing is added to its shape"), which sidesteps all three `v===2` checks, although it never names them
- found #8 "Start a new school" and the Notebook reset ("act on the signed-in child's save")
- **missed / half: #6** `mend()` with its settings dependency. It plans an old-save test, but never sees that loading a save on another device (or on the server) strips custom content.

**SHOULD 4/5**
- found #9: it reuses the gate for a Family tab and correctly says the gate is "a device gate … no account".
- found #10: an explicit choice (settings stay device-level), flagged as an open question.
- found #12: both languages and `clean()` for names. It misses `esc()` and the "kept on this computer" copy.
- found #13: tests via `helpers.mjs`, the monkey spec, and the new offline, two-children and adoption cases.
- **missed #11**: lang, sound and `seenIntro` living in the save (per-child vs per-device is never decided).

**TRAPS: 1 fallen, 7 avoided, 4 not relevant**
- **Avoided (7):**
  - more than one save location;
  - settings separate and global;
  - saved vs derived (the blob is the plan and school, with no verdicts);
  - one save per machine;
  - saves on every change;
  - not bumping `v`;
  - failed PUTs not retried (it adds an outbox).
- **Fallen (1):** saves depend on settings. The server runs `mend()` with no family settings applied, settings stay per device, and the sign-in load on a new device runs `mend()` against that device's settings. All three strip `new1..new12` steps and costumes and push the stripped save back up.
- **Not relevant (4):** mid-gala not saved; "save to a file" is settings only; legacy key read and never deleted (adoption does run `fromRound1`, but nothing makes the claim happen once); lang and sound in the save.

**SECRETS (in the plan): 1/10**
- #1, the outcome fixed up front by `G.S.seed`: "a pure engine turns {…seed}… the 3D view and the music just play that back", plus "the seed in the save".
- Partial, not counted:
  - #3: it quotes `applySettings` before `load` and says `mend` drops removed items, but never connects the two;
  - #10: "re-cleans names" in the plan, and stars clamping only in the quiz.
- The quiz also shows #9 (the 12–19 × 3–9 range).

## D. Plan — soundness (16/18)

| # | Score | Note |
|---|---|---|
| 1 Child sign-in, no email, grown-up sets up | 2 | Family code plus a grown-up PIN plus a one-time recovery code. Each child gets a name through `clean()`, an emoji avatar and a 4-digit PIN. Rate-limited, hashed, no email anywhere. |
| 2 Two children, one device | 2 | Per-child local keys, a "Who's playing?" screen and a PIN to switch. It doesn't say switching needs the same rebuild/reload the boot does (`buildDancers`, `refreshWorld` …). That's minor. |
| 3 Works with no sign-in | 2 | The guest save is today's `gala-game-v2`, plus "Play without signing in". The guest is unchanged. |
| 4 First sign-in keeps device progress | 2 | Adopt the guest save if the account is empty. Otherwise a grown-up picks, with a preview, and the loser is kept as a `progress_snapshots` row. Gap: the guest save is never marked as claimed, so a sibling signing in next would adopt it too. |
| 5 Offline / mid-game | 2 | Local-first stays. One outbox per child, retried on `online`, on a timer and on the next change. `baseRev` with a 409 keeps both copies, and the server's `rev` replaces client-clock authority. An offline first sign-in waits for the network. |
| 6 Server workflows concrete | 2 | A full endpoint table: what each endpoint does and who can call it, the rev check, snapshots, rate limiting, hashing, the delete endpoint and backup. The flaw in the server-side `mend()` check is scored under 8. |
| 7 Children's data | 1 | Minimal fields, no email, a delete endpoint, COPPA/GDPR-K named. But "parental consent" is one word in a list with no flow, and anyone can `POST /api/family`. There's no model of who can see what beyond the PIN. |
| 8 Fit to the app | 1 | Reuses `store.js`, `load()`, the gate, `clean()` and `i18n`. It correctly sees there are no accounts today and that the gate isn't auth. But server-side `mend()` has no settings, so custom content gets stripped, and `mend()` throws on bad blobs. It keeps `/api/settings` "local-only" on what becomes an internet-hosted server, so every remote family loses its server settings file and falls back to the browser copy. And the settings→save dependency is unseen. |
| 9 Order and verification | 2 | A buildable order (backend → store → state → UI → Family tab → conflict → tests) and specific unit and Playwright cases (cross-device, two kids, adoption, offline, two-device conflict, existing suites). No test would catch the custom-content strip. |

**Probability of shipping without a redesign: 65%.** The plan is coherent, and it flags its biggest open question itself (internet host vs home LAN). **Biggest risk:** settings stay per device while saves travel between devices, with `mend()` run server-side and on each device. A grown-up's custom steps and costumes vanish from a child's progress on the school laptop, and the stripped copy syncs back. Fixing that means either family-scoped synced settings or a non-destructive `mend()`, which is a structural change the plan defers ("syncing settings is a separate decision").

## E. Thought process

- **What it says.** Easy: the module headers, the small `state`/`store`/`serve` files, tests named after requirements, and the "pure engine, thin server" shape. Hard: `ui.js`, `world.js`, the interlocking judges in `engine.js`, the huge `i18n.js`, and assembling the save's shape from `plan.js` + `data.js` + `state.js`. It names the `at` merge as "the crux".
- **Its stated doubts:**
  - the deployment target (internet vs LAN);
  - whether settings should sync;
  - the conflict policy;
  - SQLite vs JSON files;
  - the grown-up identity;
  - clock skew;
  - PIN strength.
  Its doubt about settings syncing is exactly the right place to doubt, but it treats this as a UX preference, not as a data-loss path through `mend()`.
- **What the numbers show.** It finished in 3.3 min wall time with 38 tool calls (31 `read_file`, 6 bash, 1 write), read 27 files and spent about $0.04 on the plan sitting. It reached the save code within 0.1 min and wrote the plan at 3.1 min. It read nearly the whole `src/` (not `tunes.js`) and every test file, so its reading was close to exhaustive. That fits its very precise line references. The one read error (a file over 50 KiB; `ui.js` is 67 KB, `i18n.js` 48 KB) fits its "ui.js is dense" remark. The quiz sitting took 40 s with 0 tool calls.
- **Strongest.** The persistence pipeline end to end (`save`→`putFile` debounce→`flush`/pagehide→`serve.mjs` checks→`load` newest-wins). On this it is near-perfect and builds a sound offline/conflict design on top. Also strong: the gala pipeline (Q6) and the points table (Q7).
- **Weakest.** How saves interact with settings (`mend()`'s dependence on the applied rows, and how robust it really is), and what lives inside the save (lang, sound, intro). This is the one hidden coupling the feature crosses, and the plan steps on it.
