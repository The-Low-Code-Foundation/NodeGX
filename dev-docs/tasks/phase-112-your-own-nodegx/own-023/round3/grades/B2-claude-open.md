# OWN-023 r3: grade for B2-claude-open

**The arm:** Claude Code (Opus 5.5) with the NodeGX kit (@nodegx/mcp 0.2.4 and the generic CLAUDE.md). It worked on the NodeGX conversion of the gala. It chose not to open the project with the server: it read the JSON graphs and scripts directly, through a small Python tree-printer, and used only `list_examples` from the server.

**Sources read:** PLAN.md, then.md, the app under `work/gala/` (`app/`, `tools/`, `gala-rules/`), the key, the metrics, the brief and the quiz.

**Where the key and the source disagree:** nowhere that matters for this grade. One small difference: the key says `tools/check.cloud.js` is pasted into `sv_check`. In fact the pasted copy drops the comments and `toRows`, but the code that runs is the same, so the stranger's "I checked that they match" stands.

## A. Quiz

| Q | Score | Confidence | Justification (key) |
|---|---|---|---|
| 1 | 2 | sure | **Got:** dance-school gala management; prepare (programme, choreography blocks, snacks, costumes, loge, car park); a try-out or rehearsal against one gala night per season; stars spent in the shop. That covers 4 or more of the must-haves. |
| 2 | 2 | sure | **Got:** all 8 tabs, with Parking only from season 2; the live and results views; the Grown-ups page; the top bar and camera bar; the toolbar, toasts and the season letter. |
| 3 | 2 | sure (localStorage "guessing") | **Got:** store `gala`, key `save`, `storageKey gala-game-v2`; the save is written at start-up after mend and on every press by `dp_setSave`; the `ui` store is not saved. Device localStorage is named, though it was marked as a guess. **Missed:** the `noodl_store_` prefix (NodeGX source, not counted). |
| 4 | 2 | sure | **Got:** the backend at `127.0.0.1:8585` (local only); `GameChange` holds the grown-ups' edits with public read and no direct writes; the 3 functions; public signup; children never sign in and saves never touch the server. |
| 5 | 2 | sure | **Got:** the `grownup` role goes to the first account that claims it on the grown-ups' page. It is enforced three ways: in security.json, by the in-function role re-read, and by `checkChange` on the server and in the browser. Bonus: auto-claim on sign-in. |
| 6 | 2 | fairly sure (`simulate` up front: "guessing") | **Got:** `gala-act` go/gala → Dispatcher `dispatch` → `begin` → `beginRun` returns `res`; Stage 3D writes `ui.live`; `runDone` → results + `finishGala` → `dp_setSave`; `Game/Results`. **Missed:** the season seed. |
| 7 | 1 | sure / fairly sure | **Got:** stars, a start of 30 that grown-ups can change, earned from gala points only, and a complete list of what can be bought. **Missed:** "don't know" how the points are calculated; does not say purchases are permanent; places buying in "the shop or the car park" rather than at every pick. |
| 8 | 1 | fairly sure (season numbers "guessing") | **Got:** next season's mechanics (season++, galaDone cleared, new dice, new dances); ados then mamans; the letter; the car park from S2. **Missed:** floors and moods (S3), the free seasons, and that stars and purchases carry over. |
| 9 | 2 | sure | **Got:** `save.lang` flipped by the dispatcher; Static Data `{key,fr,en}` rows shared as the Variable `words`; `text.js` placeholders; the game's tables carry their own fr/en names; the grown-ups' word table. Its note that the rows were extracted from a missing `reference/src/i18n.js` is correct (`tools/extract-words.mjs`). |
| 10 | 2 | sure | **Got:** `mend` (anything not v2, or missing plan/school, starts fresh keeping `lang`; fill-ins; season dances; drops unknown dances; migrates moves+repeats; order and hair clean-up) and that `fromRound1` is dead. |
| 11 | 2 | sure | **Got:** rules, save, actions, text, view and check are pure; `dispatch` is pure except the stage; `stage/*` and the graphs touch the screen. Calling `apply.js` "touches the world" (it mutates the tables in place) is a fair nuance. |
| 12 | n/s | fairly sure | The `applyOnce` once-per-load clash with its own per-family settings, then the unconfirmed child session. The first is real: it is the key's trap "changes arrive once per load". It is a risk the plan itself created, not one of the key's top 3, all three of which the plan does handle. |

**Total: 20/22. Confidently wrong: 0.** The two 1s come from thin answers about game rules (scoring and season contents), not from wrong facts.

## B. Plan, micro (claims about the existing app)

**71 claims: 66 right, 0 wrong, 5 unverifiable.**

Checked and right, grouped:
- **Identity and look (8):**
  - name "Le Gala de danse";
  - a FR/EN management game;
  - the prep list (programme, blocks, goûter, costumes/hair, loge, car park from S2, shop);
  - rehearsal / try / gala, played in a three.js 3D school;
  - the stars and the notebook;
  - ados then mamans;
  - one gala per season via `galaDone`;
  - what the ⚙︎ page edits (renames, prices, starting stars, new steps and costumes), laid over the tables for everyone.
- **Structure (11):**
  - 54 components (counted: 54);
  - `rules/*` is generated by `sync-rules.mjs`, and `check-rules.mjs` proves the copy plays the same evenings;
  - `stage/*` comes from `sync-stage.mjs`, whose `reference/src/` is absent (confirmed);
  - the contents of `game/*` and the purity of `view/*`;
  - `check.js` is generated from `check.src.js` by `sync-check.mjs`, beside `apply.js`;
  - the 3 cloud functions;
  - the endpoint `127.0.0.1:8585`;
  - `use()`/`exports` with `uses` and `Scripts.<file>.<fn>`;
  - the graph's port names (`out-save`, `in-rows`);
  - `extract-words.mjs` reads the missing reference.
- **Boot (8):**
  - App = Router (start `/Pages/Game`, plus `/Pages/Grownups`) and `Logic/Start Up`;
  - `su_words` → Variable `words`;
  - `su_gala` is persisted, with `storageKey gala-game-v2` and key `save`;
  - `su_ui` is not persisted;
  - `su_changes` + `su_wait` 4000 ms, and `su_apply` runs on whichever answers first (`fetched`/`failure`/`timerFinished` → `run`);
  - `applyOnce` → `toRows` → `applyRows` in place, once per visit;
  - `su_open` = `mend(stored.save)` → `su_setSave` → `su_setReady`;
  - `gm_ready` → `gm_root.mounted`.
- **Pages/Game contents (1):** all 8 children, with Sheet holding `Tabs/*`, `Live` and `Results`.
- **Write path (6):**
  - every button and the stage's `s3_send` use the `gala-act` channel;
  - `dispatch(act,arg,save,ui,w,stage)`;
  - `dp_setSave` writes the save;
  - `su_setSave` and `dp_setSave` are the only two Set nodes on `gala` (counted);
  - about 20 readers (counted: 17 components subscribe to `gala.save`, including every Tab and the Grownups page);
  - `s3_sync` calls `stage.sync(save, ui, …)`.
- **The save (10):**
  - its exact shape, checked against `fresh`, `defaultPlan`, `defaultSchool` and `finishGala`'s notebook entry;
  - about 3 KB / 4 KB (measured: 3019 and 4171 bytes);
  - `mend` keeps unknown fields (it deep-copies, then fills);
  - `mend` drops unknown dances;
  - `fresh` is reached from `note:resetYes` (`nb_sYes` in `Tabs/Notebook`);
  - `nextSeason` comes from `go:nextSeason`;
  - `fromRound1` is never called (grep);
  - `S.fresh(save.lang)` would drop an `owner` field;
  - `lang` and `sound` are in the save;
  - a save can refer to custom `pas…` ids.
- **Gala (4):**
  - `finishGala` (stars, earned, galaDone, notebook) runs only on `runDone` for a gala;
  - `ui.live`/`ui.res` are not persisted, so a reload loses the evening and not the save;
  - `startRun` reads `G.S` as it was at the last sync;
  - today the 4 s fallback plays on the default tables, and a save using a custom step would break: `engine.js` reads `MOVES[id].d` with no guard, so it would throw.
- **Grown-ups and security (11):**
  - `signup: public`;
  - `GameChange` find/get public, writes nobody;
  - `saveChange`/`removeChange` need `role:grownup`; `claimGrownup` needs `authenticated`;
  - LogIn.done and SignUp.done → `gp_claimFn`;
  - `cl_decide` grants only when nobody holds the role, and refuses everyone else;
  - `saveChange` re-queries the rows, runs the pasted checker (it matches), then creates or updates one row;
  - ids are `pas`/`tenue` + `Date.now().toString(36)` (`view/grownups.js`);
  - `gp_changes` queries `GameChange`;
  - failure reasons are `gm_<reason>` word keys (for example `gm_alreadyClaimed`);
  - `cleanName`/`rude` exist in `check.src.js`;
  - avatars `avatar-1..6` exist in `noodl_modules/starter-imagery`.
- **Absence and environment (7):**
  - there is no player identity, no child account and nothing about a game on the server;
  - the game plays offline once loaded;
  - the only network calls are the `GameChange` read and the ⚙︎ page (true of the app's logic; the Google Fonts `@import` is a further, non-blocking call);
  - the component descriptions and labels read as prose ("Don't wait for the backend for ever", "Only the first account may claim");
  - `app/.gitignore` names a machine-specific `.mcp.json`;
  - gala-rules has 19 tests (13 + 4 + 2 `test(` calls);
  - a missing word key renders as the key itself (`text.js` `words()`).

Unverifiable (NodeGX runtime or tools, not settled by the folder):
1. Create User mints no session.
2. Add User To Role has a `createRole` option.
3. Delete User removes the user's sessions first.
4. A Hash node does SHA-256.
5. Cloud functions only take effect after `deploy_cloud_functions` (along with the list of example-library nodes).

**Wrong claims: none. Wrong claims built on: 0.**

## C. Plan, macro

**MUST: 7/8.**

Found:
- **`su_gala`, the single slot:** gains `slots`, `profiles`, `sync` and `settingsCache`, and `save` stays "the one being played", so the 17 readers are untouched.
- **Boot order:** `su_changes` is replaced by a `familySettings` call with a cache fallback, and the 4 s timer stays.
- **`dp_setSave`:** the single write point, watched by a new `Logic/Cloud Save`.
- **`nodegx.security.json`:** the new collections are closed and reached only through functions; function permissions are set; signup gets a decision. `devOpen` and installing the rules are not mentioned.
- **The family grown-up ≠ the global `grownup`:** the plan sees that the first-come `claimGrownup` would make one person admin of every family. It replaces auto-claim with `createFamily` and scopes `GameChange` and `saveChange`/`removeChange` by family. This redefines the role rather than adding a new one, but the collision is handled.
- **The endpoint:** the loopback address is recognised, and putting the backend online is step 7.
- **Save format:** there is no revision in the save, so `rev` + `hash` move into `ChildSave` and the device's `sync` map, and `owner` is added in a way that survives `mend`.

Missed (partial):
- **`su_open`/`mend` for a cloud load.** The plan never routes a save fetched by `getSave` (or adopted, or restored) through `mend()` before `Set gala.save`. It does not note that `su_open` runs once per load. It does not note that a new child's `fresh()` must come after `applyOnce` (`START.stars`).

**SHOULD: 4/4.**
- Reset and next season: `lastEvent` makes the sync send at once, and a reset makes a backup.
- The "Who's playing?" chip in the Top Bar and an overlay. The shared User session is handled for children ("one backend session"), but the ⚙︎ page's view of a child's session is not discussed.
- No swap during `run`/`results`, via `canSwapNow`.
- `cleanName`/`rude` for nicknames.

**TRAPS: 5 avoided, 1 fallen into, 1 not relevant.**

Avoided:
- It reads `cloud-save.glue.js` correctly, as the tail of `saveChange`.
- It does not assume the grownup role is claimed; `adoptHome` is safe on an empty backend.
- It knows the backend is localhost.
- It never merges a malformed save; `pushSave` validates `v === 2`, plan and school.
- Two children, one key and one session are handled by the slots and the switch order.

Fallen into:
- **Changes are applied once per load.** The plan loads per-family settings "for the signed-in child's family", but `applyOnce` has already run at boot and caches at module level. The plan does not reload. The stranger admits this in Q12.

Not relevant:
- The docs' "Save" record (it never had the docs).

**SECRETS: 7/9.** The `noodl_store_` prefix is excluded as NodeGX source.

Found:
- #2 the auto-claim on LogIn and SignUp;
- #3 `claimGrownup`: any authenticated caller, granted only when the role is empty;
- #6 stars are committed only at `runDone`, so a reload mid-evening loses nothing saved;
- #7 the checker exists three times, and the browser re-checks before `applyRows`;
- #8 one `GameChange` row per (table, rowId), re-queried and updated (the JSON-text detail is not stated);
- #9 `fromRound1` is dead;
- #10 `lang` is in the save and will follow the child.

Missed:
- #4 "Open the game with the changes" is a full reload;
- #5 the result is fixed at `beginRun` from the season's seed. The plan says only that `beginRun` works from the save at run start, and the quiz marked it as a guess.

## D. Soundness

| # | Area | Score | Why |
|---|---|---|---|
| 1 | Child sign-in, no email, set up by a grown-up | 2 | The grown-up creates each child (`addChild`): a generated username, then sign-in with family code + picture + PIN, with a lock-out. How the session gets minted is honestly left to a step-0 spike, with three ranked options. |
| 2 | Two children on one device | 2 | `slots` + `owner` inside the save, an ordered switch that only duplicates (crash-safe), one session at a time, the child's name always shown, an offline PIN check. |
| 3 | Works with no sign-in | 2 | The guest save is untouched (`owner:"guest"` via `mend`). It notes, deliberately, that an unlinked guest now gets the default tables. |
| 4 | First sign-in keeps device progress | 2 | Three cases (empty, has progress, identical). Adopting copies and never moves. The save not picked becomes a backup. |
| 5 | Offline and mid-game drops | 2 | Local first. "Unsent" is derived from a hash (it cannot be lost). Debounced sends, sends on the important events, back-off, idempotent hashes, `baseRev` conflicts, the "further along" rule with backups, no swap mid-run, session expiry offline. |
| 6 | Concrete server-side workflows | 2 | 14 functions, each with its caller rule and its checks. The child id always comes from the session. `pushSave` checks size and shape, compare-and-set on `rev`, writes backups and prunes them. |
| 7 | Children's data | 2 | The grown-up's creation is the consent; nicknames, not names; no child email; `removeChild` deletes everything; GDPR and EU hosting flagged for a human; closed collections. |
| 8 | Fit to the app as it is | 1 | It reuses the write point, the boot chain, the checker and the guest store, and it caught the `grownup` collision. **But:** it makes `GameChange` per-family (a big scope expansion) without solving `applyOnce`'s once-per-load cache; cloud-loaded saves skip `mend`; and the ⚙︎ page sharing the child's session is not addressed. |
| 9 | Ordering and verification | 2 | A step-0 spike for the unknowns. Seven increments, each leaving a working game. Node tests of the pure `profiles`/`sync`. Permission tests of the functions. Ten two-browser scenarios covering offline, conflicts, session expiry and "forget me". |

**Total: 17/18.**

**Probability of shipping without a redesign: 65%.**

**Biggest risk:** the per-family settings layer. `applyOnce` mutates the rule tables once per load, before anyone signs in. Signing in or switching to a child of another family after boot leaves the wrong tables in memory, and the engine throws on an unknown custom step id. Fixing that means a reload-on-switch design, which interacts with the offline story. A second risk is that the child-session mechanism (option a, b or c) is unconfirmed.

## E. Thought process

**What the stranger said:**
- **Easy:** short, commented scripts and prose labels; one event channel, one pure `dispatch`, one writer of the save.
- **Hard:** generated port names in the big graphs (it wrote a tree-printer); the missing `reference/src/`; not opening the server, so its knowledge of the backend came from the example library alone.
- **Unsure:** session minting, what `persist` writes, `creatorOwns`, rate limits and hosting, offline reload, the "further along" order, and per-family settings.

**What the numbers show** (6.6 min wall time, 26 tool calls, 16 files, 0 components via MCP, plan written at 6.3 min, $2.15 plus $1.05 for the quiz): a very fast, targeted read. It looked at the save after 0.2 min and dumped the graphs of `Start Up`, `Dispatcher` and `saveChange` as wired trees. Its own `node` run of `fresh`/`nextSeason` measured the save sizes, which shows it went past reading to cheap execution. The "easy" claim matches: the plan's micro accuracy (66 of 66 checkable claims right) means the files really were legible enough to get everything it touched right in six minutes. The "hard" claim also matches: there are no reads of `Pages/Grownups` beyond its wiring, and none of the Tabs, so the quiz is thin exactly where game rules live (scoring, Q7; season contents, Q8).

**Strongest:**
- the save's life cycle, from boot to write to mend;
- the grown-ups' trust model (the first-come role, enforced three ways);
- the security file.

These are exactly the places the feature touches, and the plan builds on all of them correctly.

**Weakest:**
- the gameplay rules beyond what the save touches;
- the runtime consequences of its own redesign. It understood `applyOnce` well enough to name "once per visit" in part 1, but did not carry that fact through when it made the settings per family. It only saw the clash when asked about risk afterwards.
