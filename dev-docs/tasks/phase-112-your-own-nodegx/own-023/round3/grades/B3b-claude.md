# OWN-023 r3b: grade for B3b-claude

Harness: Claude Code 2.1.301, Claude Opus 5.5, `@nodegx/mcp` 0.2.4 (with `--graph`), the kit's agent note after the wording fix. One planning sitting (5.9 min, 32 tool calls, $2.01) and a closed-book quiz (40 s, 0 tools, $0.95).
App: the NodeGX version of "Le Gala de danse" (`work/gala/app`, with `tools/` and `gala-rules/`). It has 54 components and 762 nodes, a local backend at 127.0.0.1:8585, the `GameChange` collection and 3 cloud functions.

**Headline: quiz 20/22 (0 confidently wrong) · micro 54 right / 2 wrong / 4 unverifiable of 60 (1 wrong claim built on, in the checks only) · MUST 8/8, SHOULD 3/4, traps 0 fallen / 5 avoided, secrets 7/10 · soundness 17/18 · 70% to ship without a redesign.**

---

## A) Quiz

| Q | Score | Conf. | Justification (vs key) |
|---|---|---|---|
| 1 | 2 | sure | Gives a dance-school gala management game, the preparation (order, choreography, costumes, snacks, furniture, car park), rehearsal vs gala night, the 3D evening, verdicts and stars. That is ≥3 of the must-haves. |
| 2 | 2 | sure | Names all 8 tabs, Parking only from season 2, the live and results views, the season letter, the toast, the furniture toolbar, the top and camera bars, and the Grown-ups page. No invented screens. |
| 3 | 2 | sure | Correct save fields, the `gala` store under key `save`, `gala-game-v2` in localStorage, written on every press via `dp_setSave` and at start-up, and the `ui` store not saved. Misses the bonus `noodl_store_` prefix and `{save:…}` wrapper. |
| 4 | 2 | sure | Gets the loopback backend, `GameChange` = grown-ups' edits, the 3 functions, public sign-up, the anonymous read at boot with the 4 s fallback, and that the game itself has no accounts. |
| 5 | 2 | sure | First account to sign up or sign in on the Grown-ups page claims `grownup`, later accounts are refused, plus the security rule, the in-function role check, the shared checker, and no direct writes. Also gets the auto-claim bonus. |
| 6 | 2 | fairly sure | `gala-act` go/gala → `dp_fn` → `dispatch.begin` → `stage.beginRun` → `simulate` with the season seed → `ui.res`/`live` → playback → `done` → `runDone` → `finishGala` → Results. Every must-have is there. |
| 7 | 2 | fairly sure | Stars are earned only on gala night from `simulate`'s points, a rehearsal adds nothing, the spending list is complete, and purchases are kept for good. The formula is "don't know", which is not a must-have. |
| 8 | 1 | fairly sure | Gets the season increment, `galaDone` reset, the new seed, A1/A2 teens, F1 mums, the car park from S2 and the season letter. It misses floors and moods (S3), which season each class arrives in ("don't know"), and that stars and purchases carry over. |
| 9 | 1 | sure | Gets the toggle in `save.lang`, Static Data `{key,fr,en}` in `su_words` via Variable `words`, the `text.js` placeholders and `Grownups/Words`. It misses one must-have: game items carry their own fr/en names (`w.nm`). |
| 10 | 2 | sure | Covers `mend()` at start-up: wrong version or missing plan/school starts fresh keeping `lang`, missing keys are filled, season numbers added, numbers migrated, unknown ids dropped, hair filled. Notes `fromRound1` is not called by mend. |
| 11 | 2 | fairly sure | Pure: rules, actions, save, text, check, view, with `dispatch` "mostly pure but calls the 3D stage". Screen: `stage/*` and the visual components. Matches the key exactly, including the dispatch caveat. |
| 12 | — | fairly sure | Opinion, not scored. It names a fresh or badly repaired save overwriting real server progress (`mend` silently making a new school), which is key risk 2. Second, it names the one-backend-per-home / first-account-is-grown-up assumption, which is key risk 1, seen from the hosting side. |

Total 20/22. The don't-knows sit exactly where the stranger said it skimmed (the engine's scoring and the tabs' insides).

## B) Plan — micro

60 factual claims about the existing app were extracted (part 1 and the embedded asides in parts 2–4), and each was checked against `app/` and `tools/`. **54 right, 2 wrong, 4 unverifiable.**

Notable right claims: 54 components / 762 nodes (counted: 54 `nodes.json`, 762 nodes); react19, format 5; `su_gala` `persist:true`, `storageKey:"gala-game-v2"`, key `save`; the whole Start Up wiring (`su_gala.ready` → `su_wait.start` + `su_storeReady.on`; `su_changes.fetched/failure` and `su_wait.timerFinished` → `su_apply.run`; `su_open` guarded by `ready` → `su_setSave` → `su_setReady`; `gm_ready.value` → `gm_root.mounted`); exactly one Event Receiver on `gala-act` (`dp_rx`); `runDone` → `finishGala` only for an unfinished gala; `play.js:114` seeds with `G.S.seed`; `note:resetYes` → `S.fresh`; the save shape down to the notebook entry `{season, at, points, satisfaction, nums}`; the security file verbatim; `claimGrownup` "the home's grown-up … a child's included" (its own component description); `cloud-save.glue.js` = the tail of `saveChange`; `sync-check.mjs` writes both copies of the checker; `reference/src` missing, so `sync-stage`/`extract-words` cannot be re-run; Stage 3D's `resize` listener; `gp_said` mapping reasons to `gm_*` words; the sheet becomes a bottom sheet on a narrow screen.

**Wrong claims:**
1. **"About ten components subscribe to `gala.save`."** There are 17: Camera Bar, Dispatcher, Live, Results, Season Letter, Sheet, Top Bar, Pages/Game, Pages/Grownups and all 8 tabs. *Not built on.* The plan's point is that none of them has to change, and that holds at any count.
2. **The existing save is at `localStorage["gala-game-v2"]`** (check 1: "`localStorage["gala-game-v2"]` has the same shape as before"; check 2: "`seed_storage` a played `gala-game-v2`"). The runtime prefixes the key (`STORAGE_KEY_PREFIX = "noodl_store_"` in `noodl.viewer.js`), so the real entry is `noodl_store_gala-game-v2` and its value is `{"save":{…}}`. *Built on, in verification only.* As written, the two most important no-regression and migration checks would seed and read the wrong key. Check 2 would then fail visibly (a fresh school), not pass silently, so the cost is lost time, not a false green.

**Unverifiable:** the store writes to localStorage "at once" (runtime timing; the key says next tick); `check-rules`/`check-views`/`gala-rules` pass today (not re-run by the grader); a browser holds one sign-in session at a time (runtime); a save is "tens of KB".

Out of scope, not counted: the backend capabilities the plan uses (`createuser`, `updateuser`, `jwtsign`/`jwtverify`, `onlyIfUnchanged`, `upsertOn`, `allowNoAuth`). They are platform claims, read from the node catalog, and part 4 flags them honestly as untested.

## C) Plan — macro

**MUST 8/8**
- `su_gala` single slot: found. The guest keeps `gala-game-v2`, and a new `players` store holds the per-child slots.
- `su_open` + `mend`: found. Every server save is checked, then mended, and it noticed `su_open` runs once. It does not spell out the mend path for a mid-session switch, and it misses that `fresh()` must come after `applyOnce` (`START.stars`).
- Boot order: found. `loadProgress` runs in the background "with the same don't-wait-more-than-4 s idea as `su_wait`".
- Dispatcher as the single write point: found. Sync listens to the store, and `runDone`/`nextSeason`/reset send at once.
- `nodegx.security.json`: found. New collections are all-nobody behind cloud functions, there are function rules, and `signup:"public"` is decided and justified. It does not mention installing the rules or `devOpen`.
- Family grown-up vs `grownup`: found, with a caveat. It deliberately keeps the app's own per-home model. The source supports this: `claimGrownup` calls itself "the home's grown-up … a child's included". Children never pass through `claimGrownup`, and a shared server is flagged as needing a `Family` record "before step 3".
- Endpoint is loopback: found (§2.0 "before anything else").
- Save has no revision: found. `rev`/`updatedAt`/`opId` sit beside the save, and `v:2` is kept on purpose because `mend` wipes anything else.

**SHOULD 3/4**
- Found: reset/next season vs the cloud copy (`beforeReset` history, immediate send); the picker UI (Top Bar chip + `Who Is Playing` overlay) and the shared User session; child names checked with `cleanName` and the rude-word list.
- Missed: switching child during a run must `stopRun` (`Game/Stage 3D`).

**TRAPS: 0 fallen, 5 avoided, 2 not relevant**
- Avoided: `cloud-save.glue.js` (called out as misleading); the localhost backend; `mend` wiping an unreadable save (checker before mend, never send before a load); two children on one key and one session (device tokens + `LogOut` after `linkDevice`); the unclaimed `grownup` (children are made by `addChild`, which needs `grownup`, so no child can be first). That last one is avoided by design: the plan never says the role is unclaimed today.
- Not relevant: changes after the 4 s timer (the plan's own late load is handled); the docs' "Save" record (this bundle has no docs).

**SECRETS 7/10**
- Found: #2 auto-claim on LogIn.done and SignUp.done; #3 `authenticated` + first-come; #5 seeded evening (same on replay, `play.js` ~114); #6 stars only at `runDone`, closing mid-gala loses nothing and the gala can be replayed; #7 the checker in three places; #9 `mend` resets anything but `v:2` (`fromRound1` "not called by mend", in the quiz); #10 language in the save, "per-player, which is what we want".
- Missed: #1 the `noodl_store_` prefix (got it wrong, see B); #4 the `gp_reload` External Link; #8 `GameChange.fields` as JSON text, merged per (table,rowId).

## D) Plan — soundness

| # | Score | Why |
|---|---|---|
| 1 Child sign-in, no email, grown-up sets up | 2 | `addChild` (role:grownup) makes the account: a generated "dancer name" plus a 4-of-12 picture password, no email, a printable sign-in card, and `newPictures` to reset. |
| 2 Two children, one device | 2 | A per-child slot and a per-device token for each child. The swap order (outgoing slot → incoming → `current`) never leaves the save nowhere. A sibling's pending changes are still sent with that sibling's own token. |
| 3 Works with no sign-in | 2 | The guest stays exactly on `gala-game-v2`, and check 1 is "guest, unchanged". |
| 4 First sign-in keeps device progress | 2 | A four-case table. "Has progress" is defined. "Ask, never guess" applies when both exist. The adopted guest is copied to history and the guest becomes fresh, so a sibling can't take the same school. |
| 5 Offline / mid-game drops | 2 | Local first. One latest save per child, with backoff retry. An `opId` makes a retry after a lost reply harmless. `baseRev` + `onlyIfUnchanged` decides conflicts: more progress wins and the loser goes to history. A slot never sends before its first load. |
| 6 Server workflows concrete | 2 | Nine functions with caller rules. `saveProgress` is given step by step, with a generated shared save checker (size, `v`, ranges, `cleanName`) and history caps. |
| 7 Children's data | 1 | Minimum data is good (a nickname chosen by the grown-up, an avatar, the save, no email, age or real name), as is who sees what, and "Remove" deletes everything. It never names parental consent, a privacy notice or retention. |
| 8 Fit to the app as it is | 2 | It reuses `mend`, the Start Up timer pattern, the `saveChange` request→check→DB→response shape, `cleanName`, the `sync-check` generator pattern and the `gp_said` reason words. It keeps every `gala.save` subscriber untouched. It reads the existing accounts and role correctly and follows the app's own per-home intent. Small misses: `stopRun` on switch; `fresh()` after `applyOnce`. |
| 9 Ordering and verification | 2 | Pure scripts and Node tests come first, then reachability, the grown-up side, the progress functions, the store ("nothing must differ from today; check that before going on"), sync, and UI. The checks include concurrent writes, idempotent retry, stale `tokenVersion`, a stubbed outage across a whole gala night, and a shared computer. The wrong localStorage key in checks 1–2 would surface as a failure, not a false pass. |

Total 17/18. **Probability of shipping without a redesign: 70%.** The single biggest reason it might not: the plan keeps one backend per home. The family's grown-up is the global first-come `grownup` role (also the content admin), and each family hosts its own internet backend. If the product is one shared service, `claimGrownup`, `signup:"public"` and the role model must be rebuilt around a `Family` record before step 3. The plan flags this ("the decision I am least sure of") and pre-seeds `familyId`, but does not decide it. Close second: the whole device-token scheme assumes `jwtsign` with a secret, `allowNoAuth`, `onlyIfUnchanged` and email-less `createuser` behave as the node catalog suggests. None were tried; the plan does schedule them to be checked in steps 2–3.

## E) The thought process

**Says easy:** the `--graph` print ("readable … the comments explain *why*"); one event bus, one dispatcher, pure actions, one `gala.save`; short pure `save.js`/`actions.js`; tool headers that say what they generate. **Says hard:** `cloud-save.glue.js` sounding like a progress save; `rules/*` and `stage/*` looking editable but being generated (with `reference/src` missing); the size of the graph print (~240 KB). It says it read the cloud functions, App, Start Up, Dispatcher, both pages, Top Bar, Sheet, Notebook, Stage 3D, Toast and Season Letter closely and skimmed the tabs. **Says unsure:** per-home vs shared backend; whether cloud functions bypass collection permissions; `jwtsign`/secret, rate limits, password rules; whether `storageKey` can change at run time; the LogIn session offline.

**Does it match the numbers?** Yes. It took 5.9 wall minutes and 32 tool calls. It first looked at the save at 0.4 min and wrote the plan at 5.7 min. Its first sources were `save.js` and `dispatch.js`, with 0 component JSON files read and 0.17 Mchars of results. That is less than the 240 KB print, which fits "skimmed the tabs". The quiz's two don't-knows (the points formula, which season each class arrives) and its two 1-scores (seasons, item names) land exactly in the parts it says it skimmed. Its strongest understanding is boot, save, dispatcher, backend and security: every Start Up wire and every security rule it states is right. Its weakest is the engine and content (scoring, season content, `w.nm` names) and one runtime detail it never saw, the `noodl_store_` prefix.

**The `--graph` page.** It used the page as its main way in: 12 of 30 Bash calls were `npx`. Its first attempt, redirecting to `/tmp/gala-graph.txt`, was denied by permissions, so the print came back as a saved tool result, which it sliced with `python3`/`sed`/`grep`. PLAN part 1 says so explicitly ("I read it through `npx -y @nodegx/mcp@0.2.4 app --graph`, as `CLAUDE.md` says to"). With `componentsRead: 0`, the page fully replaced the component JSON: the note's "read that rather than the JSON" was followed to the letter, and the micro accuracy (54/56 checkable right) says it worked. It went to raw files only for the scripts, the security and project JSON, the two `tools/` files, and the node catalog inside `node_modules/@nodegx/mcp`, which is where it learned the backend's capabilities.

**`open_project`.** It was not used. The metrics' `tools` are only Bash 30, Read 1 and Write 1, with no MCP calls at all. PLAN part 4 states this plainly: "I did not run the app (`npx @nodegx/preview`) or open the project with the `nodegx` server. Everything here comes from reading the graph and the scripts and running the three existing checks." It **gives no reason**. The note's reassurance that `open_project` writes nothing did not move it. The likely cause is that the `--graph` page already answered everything it needed, and the brief said not to change files. The cost is visible: the backend capabilities came from a catalog, not from `find_tools({group:"backend"})`/`get_node_type`. Its plan does name server tools (`check_backend_access`, `get_backend_ops_config`, `set_function_secret`, `drive_page`, `seed_storage`, `stub_route`) as the verification instruments, so it knew they existed.
