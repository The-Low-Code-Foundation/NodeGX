# OWN-023 r3: grade for B-vibe

Harness: Mistral Vibe 2.26.1 with DeepSeek V4.1 Flash, plus `@nodegx/mcp` 0.2.4. It opened the project and used get_project_info, the backend tool listings and the node-type listings.
App: the NodeGX conversion of "Le Gala de danse" (`work/gala/app`).

**Headline: quiz 17/22 (none confidently wrong). Micro: 54 of 57 claims right, 2 wrong, neither one built on. MUST 5/8, SHOULD 1/4, traps 1 fallen / 5 avoided, secrets 2/9. Soundness 15/18. P(ship without redesign) = 40%.**

Key vs source: every key fact I re-checked held in the source. The node count of 762 is the count of top-level nodes; there are 1,155 if child nodes are counted too. The key and the plan both use 762, which matches `_registry.json`.

---

## A) Quiz

| Q | Score | Confidence | Justification (key) |
|---|---|---|---|
| 1 | 2 | sure | Has dance-school gala management, the prep tasks (order, formation, costumes, loge, snack, parking), rehearsal vs gala night on a 3D stage, results and stars, and the shop. That is at least 3 of the key's 5 points. |
| 2 | 2 | sure / fairly | All 8 tabs, live run and results views, season letter, `/Pages/Grownups`. Misses the bonus that Parking only appears from season 2. It has no invented login screen or menu. |
| 3 | 2 | sure | Exact shape from `fresh()`, localStorage, Global Store `gala` / key `save` / storageKey `gala-game-v2`, written on every press that returns a save and at start-up after mend. It doesn't say outright that the ui state isn't saved, but the field list implies it. The `noodl_store_` prefix is excluded per the note. |
| 4 | 2 | sure | Backend yes, GameChange plus 3 functions with the right call rules, grown-ups' content only, not child progress, signup public, first account claims `grownup`, `127.0.0.1:8585`. "No backend on this machine" is backed by the server's `list_backends` → `[]`. |
| 5 | 2 | sure | `grownup` role, first-come via `claimGrownup` (lists the role, grants if empty), server-side `role:grownup` plus Get User Roles, browser re-check via `settings/check.js`. Misses the bonus that the claim fires automatically on LogIn/SignUp. |
| 6 | 1 | fairly / guessing | `gala-act` → Dispatcher → `dispatch('go','gala')` → `begin()` → `stage.beginRun('gala')` → `runDone` → `finishGala` → Results is all correct. It misses the key's central must-have: `engine.simulate` decides the whole evening up front with the season seed. It admits it guessed about the stage internals. |
| 7 | 1 | sure | Stars, earned by finishing a gala via `finishGala`, spent on outfits, hair, shoes, accessories, furniture, snacks and upgrades. It never says purchases are owned for good, or that rehearsals and try-outs earn nothing. Thin. |
| 8 | 1 | fairly / "don't know" | `nextSeason`: season++, galaDone reset, new seed, `addSeasonNumbers`, ados and mamans. It says honestly that it doesn't know which season brings what. It misses parking (S2), floors and moods (S3), stars carrying over, and the season letter. |
| 9 | 1 | fairly | `save.lang` toggled by the dispatcher, Static Data `{key,fr,en}` in Start Up shared via Variable `words`, `text.js`, `Grownups/Words`, `tools/words.json` correctly called a build artefact. It misses that game items carry their own fr/en names, which grown-ups can rename. |
| 10 | 2 | sure | `mend()`: v≠2 or no plan/school → fresh, otherwise fill defaults, add season numbers, migrate moves+repeats → blocks+chain, drop unknowns, repair hair. One wrong aside: "There is also `fromRound1` for the very first round's save" suggests it is used. It is dead code (key's Watch-for). |
| 11 | 1 | fairly | Rules, actions, save, text and view are pure. Stage, three.js and the components touch the screen. It falls into the key's Watch-for by listing `game/dispatch.js` as pure, but `dispatch.js` drives the stage (`beginRun`, `stopRun`, `wake`, …). |
| 12 | n/s | fairly | Picks the store-shape migration as the main risk, because one blob is the single thing everything depends on. That is reasonable, but it is not the key's top risk (the identity model colliding with `grownup`). |

Total **17/22**. Confidently wrong: **0**. Q7 is the only "sure" answer that scored below 2. It is thin, not wrong.

---

## B) Plan, micro (claims about the existing app)

57 claims checked: **54 right, 2 wrong, 1 unverifiable.** I left out the audience age (8–13), which comes from the brief.

Right (grouped, all checked in the source):
- What the game is (6): FR/EN; teacher running a gala; the 8 tab names; rehearsal vs gala on a 3D stage; stars buy costumes, furniture and upgrades; seasons bring classes.
- Build facts (4): NodeGX v2, `runtimeVersion: react19`; 54 components / 762 nodes / 874 connections (exact); `gala-rules/` holds the original ES-module rules with `node --test` tests; `tools/` copies them in.
- Structure (8): App = Router (`startPage /Pages/Game`, routes Game and Grownups) plus a Start Up instance; Start Up holds words, fonts, two Global Stores and the opener; the Game/, Tabs/ (8) and `__cloud__` (3) listings; `rules/*` GENERATED by `sync-rules.mjs`; `settings/check.js` GENERATED from `tools/check.src.js` by `sync-check.mjs`; the 6 view files.
- Save (6): the `fresh(lang)` shape; `defaultPlan()` fields; `defaultSchool()` fields; `mend`; `nextSeason`; `fromRound1` exists. The plan only says it exists, not that it is called.
- Persistence and boot (8): `su_gala` params exactly (`gala`, persist, `gala-game-v2`); localStorage only; `su_gala.ready → su_wait.start` (4000 ms); `su_changes.fetched/failure` and `su_wait.timerFinished → su_apply.run`; the four `su_open` inputs including `alreadyOpen ← su_ready`; `su_open.opened → su_setSave.set → su_setReady.do`; `Scripts.save.mend(stored.save)`; the `ready` variable mounts `gm_root`.
- Dispatcher (4): subscribes to `gala.save`, `ui.ui/res/live`; `dispatch(act,arg,save,ui,w,stage)` returns `{save,ui,toast}`; `dp_setSave/Ui/Res/Live/Toast`; the 10 pure action functions in `actions.js` are named correctly.
- Accounts and backend (11): node ids `gp_userNode`, `gp_login1`, `gp_signup1`, `gp_logout1`, `gp_claimFn` (CloudFunction2); username and password; first account only; `view/grownups.js`; the security file exactly; the content layer (rename step, price, costume, starting stars); `check.js` validates and `applyOnce` lays changes over `rules/data`; endpoint and instance id; no backend present (server output); no per-child progress anywhere; `gp_userNode.roles` is wired to `gp_view`.
- Embedded in parts 2–4 (7): a cloud function runs as system and its call rule is the only gate (server doc); filtering on a Pointer in a cloud function is silently dropped (server doc); `saveChange` is shaped request → roles → query → check → create/update → response on both paths; the dispatcher's `nextSeason` resets ui to `UI0`; the save is "a few KB" (a fresh save is 3,019 chars); `reference/` is absent and `sync-rules`/`sync-check` read `gala-rules/`; component labels quoted verbatim ("The grown-ups' changes", "Open the save", "The game may draw").

**Wrong (2), neither built on:**
1. "`stage/` GENERATED from `reference/src` by `tools/sync-stage.mjs`", repeated in part 4 as "large and generated". Four of the five files are. `stage/stage.js` is hand-written glue ("what reference/src/main.js did … put together"). This is an aside, and no plan step depends on it.
2. "**Every press** therefore rewrites the whole save into localStorage." `dp_fn` only fires `saveChanged → dp_setSave.set` when `dispatch` returns a `save`. Tab switches, picks and selections touch `ui` only. The sync design (subscribe to `gala.save`, mark dirty) is still correct, because every save change does pass through `dp_setSave`, so the overstatement does no harm.

**Unverifiable (1):** "a workflow cannot be invoked from the app". The plan flags this as its own assumption. It is NodeGX runtime behaviour, and neither the folder nor the server output settles it.

---

## C) Plan, macro

**MUST 5/8**
- ✓ Per-device slot `su_gala`: profiles envelope `{v:3, active, profiles:{guest, <userId>}, meta}` under a new key, with the old `gala-game-v2` kept as a fallback and a guest profile for people who never sign in.
- ✗ `su_open`/`mend` once per load: the plan noticed `alreadyOpen` in the wiring, but never says that a save arriving from the server after boot must go through `mend` → Set `gala.save`. "The game reloads into it" is left vague. It also never says a new child's save must be made after `applyOnce` (the `START.stars` timing). Partial.
- ✓ Boot order: the chain is described edge by edge; cloud loading runs in the background and "a failed fetch never blanks the game: the same principle as the existing 4-second timer".
- ✓ `dp_setSave` as the single write point: a new `Logic/Sync` subscribes to `gala.save` and debounces, with a flush on `pagehide`.
- ✓ `nodegx.security.json`: new collections locked to `nobody` and reached only through functions, with six call rules. Signup stays public for the grown-up and children are made only by `createChild`. The plan gives no explicit "install the rules" step, but `get_backend_permissions` is in its checks.
- ✗ **Family grown-up ≠ `grownup`**: the plan does the opposite. "The grown-up signs up or logs in (the existing flow) and claims `grownup` (the existing `claimGrownup`)", and `createChild/listChildren/resetChildPassword/deleteChild` are `role:grownup`.
- ✗ Endpoint is loopback: the plan notes `127.0.0.1:8585` and "not running here", but never says another device needs a reachable, deployed backend. Its cross-device test is "a second browser context" on the same machine.
- ✓ Save format has no rev or timestamp: `revision`/`updatedAt`/`dirty` are added in the envelope's `meta` and on the `Progress` row with server time. Inner saves stay `v:2`, so `mend`'s v≠2 wipe is sidestepped rather than triggered.

**SHOULD 1/4.** ✓ Profile picker / sign-in page ("Who's playing?", `Pages/Profiles`), though it misses adding it to the Router and the session being shared with ⚙︎. ✗ What `resetYes`/`nextSeason` do to the cloud copy. ✗ `stopRun` when switching child mid-run: it only says "reset `ui` to `UI0`". ✗ `cleanName`/`rude` for child usernames: it only refuses duplicates.

**TRAPS: 1 fallen, 5 avoided, 1 not relevant**
- Fallen: the global, first-come `grownup` role used as the family admin. The plan's risk table even says "Known limitation of `claimGrownup` (first account only) … out of scope" and "two families on one deployment share … content", so it saw the collision and built on it anyway.
- Avoided: `cloud-save.glue.js` and GameChange are not progress ("easy to mistake for a progress store at a glance"). It never claims the backend already syncs across devices. A malformed cloud object is not allowed to wipe progress (new key, old key kept, server-side shape validation, inner v2). Two children, one key/session: per-userId profiles and the child's own password. The save lives in localStorage and is not a backend record.
- Not relevant: late GameChange rows ignored until reload.

**SECRETS 2/9** (secret 1, the `noodl_store_` prefix, is left out per the note; the plan does use `stored.save`). Found: #3 `claimGrownup` is `authenticated` and grants iff the role list is empty (Q5); #7 the checker exists three times and the browser re-checks (plan §1 and part 4, Q5). Not found: #2 auto-claim on LogIn/SignUp.done; #4 the `gp_reload` full reload; #5 the result is decided at `beginRun` by `simulate`; #6 stars are committed only at `runDone`; #8 `GameChange.fields` is JSON text, merged per (table,rowId); #9 `fromRound1` is dead (it implies the opposite); #10 language becomes per child.

---

## D) Plan, soundness

| # | Score | Why |
|---|---|---|
| 1 Child sign-in, no email, set up by a grown-up | 1 | The mechanism is good: `createChild` with `noodl.cloud.createuser`, a `child` role, a short PIN-style password, roster, reset and delete. But it is gated on `role:grownup`, which only the first account on the backend can ever hold, so it works for exactly one family. `family-setup` also emails a grown-up who may have no email address. |
| 2 Two children on one device | 2 | Profiles keyed by userId, a "Who's playing?" picker with each child's own password, and the guest profile never overwritten. |
| 3 Works with no sign-in | 2 | A guest profile and local-first boot, unchanged from today. |
| 4 First sign-in keeps device progress | 2 | The guest save is *copied* to the new child on consent. If the server and device disagree, the child is asked, the server copy is the default, and the device copy is kept as a backup profile. |
| 5 Offline / mid-game drop | 2 | Local write first; `dirty` flag; a 2 s debounce plus a `pagehide`/`visibilitychange` flush; retry with backoff and on `online`; revision-based last-write-wins that copies to `ProgressBackup` before overwriting; server-time ordering. |
| 6 Server-side workflows concrete | 2 | Six functions with params, call rules and checks (shape, size cap, ranges, caller-id filtering, String not Pointer). Two workflows with real triggers (`db-change` on Child, daily `schedule` backup and prune). |
| 7 Children's data | 1 | It has scoping (no one reads another child's row), an "Forget my child" delete path, and passwords never cached. It has no consent step, no data-minimisation statement, and no account of who can see a child's progress beyond the owner and the family. |
| 8 Fit to the app as it is | 1 | It reuses existing pieces very well (GlobalStore, `dp_setSave`, the Timer principle, the `saveChange` pattern, LogIn nodes on a *new* page so there is no auto-claim). It noticed the existing accounts and roles but handled `grownup` wrongly, and it misses the localhost reach. |
| 9 Ordering and verification | 2 | A buildable order (backend → progress functions tested alone → client sync → migration → UI → provisioning → workflows). It keeps the existing suites (`npm test`, `check-rules`, `check-views`), adds unit tests for `mendProfiles` and the newer/dirty logic, and runs 8 acceptance drives including offline, a backend stopped mid-session, a conflict and sibling isolation. Its first check, whether the session survives a reload, is well chosen. It never tests a second family or a second machine. |

**Total 15/18. P(ship without redesign) = 40%.**
**Biggest reason it might not:** the family-admin model sits on the global, first-come `grownup` content-admin role. As soon as a second family's parent signs up, they get `alreadyClaimed` and cannot add children, and the one parent who can is also everyone's content editor. A separate parent role and a parent sign-up path that doesn't pass through `Pages/Grownups`' auto-claim are needed, and the `Child.familyId` and `role:grownup` rules all change with them. The second risk is the backend being on localhost, which no step deploys.

---

## E) The thought process

**What it says.** Easy: the folder is "honest about itself". GENERATED headers, labelled nodes ("Open the save", "The game may draw") and the kit's AGENTS/CLAUDE. Hard: the save has no schema, so it rebuilt it from `fresh`/`defaultPlan`/`defaultSchool`; the gala-rules → app/scripts relationship; GameChange looking like a progress store; the dense `__cloud__` graphs; the long Start Up graph; the large generated stage. Unsure about: session persistence, the cloud user-node params, Pointer filtering, schema tooling, size limits, invoking a workflow, and the preview vs deploy backend.

**Does it match the numbers?** Mostly. It took 4.8 min wall time, 42 tool calls, 9 NodeGX calls and about $0.06. It read 8 script files directly (save, dispatch, actions, plan, apply, grownups view, and the two cloud tools). The metric `componentsRead: 0` undercounts: the transcript shows it `cat`/python-dumped the nodes and connections of Start Up, App, Pages/Game, Pages/Grownups and all three `__cloud__` functions, plus the whole `_registry.json`. Its reading went exactly where the feature lives (persistence, boot, write path, accounts, security), and the micro accuracy (54/57, the boot chain edge by edge) shows it. It never opened `rules/engine.js`, `rules/data.js`, `view/*`, `stage/*` (only `wc -l`) or `Game/Stage 3D`. That is exactly where the quiz thins out: Q6 has no `simulate`, Q8 can't place the season arrivals, Q11 calls `dispatch.js` pure. It says so itself in Q6 and Q8, so its confidence is well calibrated. The metric `minutesToPlanWrite: 0.3` contradicts the transcript, where `write_file` is the 38th of 42 calls, so it looks like a mis-measure. The one `task` (subagent) call returned 46 chars and contributed nothing.

**Strongest.** The persistence and backend layer: the exact store, boot wiring, write point, and security file; separating GameChange (content) from progress; using server-doc facts correctly (functions run as system, Pointer filters are dropped in cloud). The local-first sync design built on all that is genuinely good.

**Weakest.** (1) It understood the `grownup` mechanism precisely (Q5, plan §1) but misjudged its *meaning* for the feature: a global, first-come content admin is not a family parent. It even listed the consequence in its risk table and scoped it out. (2) Reach: it read the endpoint but treated "provision a backend here" as enough for cross-device play. (3) The game's rules and engine were never read, which costs nothing in the plan but shows in the quiz.
