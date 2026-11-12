# OWN-023 r3b: grade for B3-vibe

Harness: Mistral Vibe 2.26.1 with DeepSeek V4.1 Flash, plus `@nodegx/mcp` 0.2.4 (the `--graph` page was named in the kit's note). One sitting for the brief (236 s, 47 tool calls, plan written at 3.6 min), then the quiz, closed book (48 s, 0 tools).
App: the NodeGX version of "Le Gala de danse" (`work/gala/app` + `tools/` + `gala-rules/`; no `app/docs/`, no `reference/`).

**Headline: quiz 17/22 (0 confidently wrong) · micro 46/49 right, 1 wrong, 0 built on · MUST 8/8, SHOULD 1/4, traps 3 avoided / 1 fallen, secrets 2/10 · soundness 15/18 · P(ship without redesign) 55%.**

All checks were made against the source in `work/gala`. Paths below: `C:` = `app/components/`, `S:` = `app/scripts/`.

---

## A. Quiz

| Q | Score | Conf. | Why (against the key) |
|---|---|---|---|
| 1 | 2 | sure | Has the dance-school gala, the prep tabs, free rehearsal vs one gala night per season, the stars and the verdicts. It does not mention the 3D view or the grown-ups' page, but it has ≥3 of the must-haves. |
| 2 | 2 | fairly sure | All 8 tabs (Parking from season 2), the live and results views, the season letter, and the Grown-ups page. Full marks plus the bonus. |
| 3 | 1 | sure / fairly sure | Exact shape, store `gala` / key `save` / `gala-game-v2`, localStorage, written at start-up and on every press. It **misses** the must-have that the `ui` store, the screen state and the run in progress are not saved. No `noodl_store_` prefix and no `{save:…}` wrapper. |
| 4 | 1 | sure | Backend, endpoint, `GameChange`, the 3 functions and their call rules are all right. It **misses** two must-haves: anyone can read the changes and anyone can sign up, and children and saves are not on the backend. It gives `127.0.0.1` without saying this means loopback only. |
| 5 | 2 | fairly sure | `grownup` role, first claimer wins and later accounts are refused, enforced in the cloud functions (`getuserroles`), and the UI check is only for display. |
| 6 | 2 | fairly sure | `GoButton` → `gala-act` `go`/`gala` → Dispatcher → `dispatch` → `begin()` → `beginRun('gala')` → `ui` run/res/live → `runDone` → `finishGala` → Results via `view/run.js`. It never names `simulate` or the seed, but "sets the screen state to `run` with the result" implies the result is computed up front. |
| 7 | 2 | fairly sure | Stars, earned from the gala's simulated points through `finishGala` (`stars` + `earned`). The upgrade list is near-verbatim, plus items and food. Bought = kept. |
| 8 | 1 | fairly sure | S2 car park, S3 ados (two dances), S4 mamans, S5+ free; `season++`, `galaDone` reset, new seed. **Missing:** S3's floors and moods, that stars and purchases carry over, and the season letter (two of the key's four must-points). |
| 9 | 1 | fairly sure | Gets `save.lang`, the top-bar chip through the dispatcher, Static Data "Words" `{key,fr,en}`, `text.js` templates, `grownupWords`, and `extract-words.mjs` (correct: `tools/extract-words.mjs` reads `reference/src/i18n.js`). **Misses** that game items carry their own fr/en names (`S:rules/data.js`). |
| 10 | 2 | fairly sure | `mend`: not v2, or no plan/school → fresh. Otherwise it fills missing keys, adds the season's numbers, migrates moves+repeats, drops unknowns and fixes hair. Blemish: "There is also `fromRound1()` for round 1's save" implies it is used. It is dead code, and a round-1 save is wiped (no `v:2`), not "repaired where possible". |
| 11 | 1 | fairly sure | Pure rules, view builders, actions and save are right, and so are the three.js stage scripts. But it calls `game/dispatch.js` "plain functions returning data", which is the key's watch-for: dispatch commands the stage (`beginRun`, `stopRun`, `camCmd`, `setSpeed`, `wake`). It also leaves out the music/Web Audio. |
| 12 | n/s | fairly sure | Opinion. It names the opaque whole-save blob: no safe auto-merge, and a bad swap loses everything. That is the key's risk #2. It does **not** name the identity collision, even though its own PLAN called the global `grownup` role "the biggest decision in the plan". |

Total 17/22. Confidently wrong: 0. All four "sure" answers (Q1, Q3, Q4 and the Q3 shape) are right. Q3 and Q4 lost points for omissions, not errors.

---

## B. Plan, micro (claims about the existing app)

49 distinct claims checked: **46 right, 1 wrong, 2 unverifiable. Wrong claims built on: 0.**

Right (grouped; each was checked in source):
- **What it is (1–6):** the name; single-player FR/EN dance-school gala; the prep areas (programme, formation/choreography, costumes, loge furniture, goûter, car park from S2, shop); free rehearsal and one gala night per season for stars; S3 teens, S4 mums, S5+ free; project format 5 / react19 / nodegx 0.2.4.
- **Counts (7–8):** 54 components, 762 nodes, 874 wires (recounted from every `nodes.json` / `connections.json`: 762 / 874).
- **Structure (9–15):** `C:App` Router `startPage /Pages/Game`, routes Game + Grownups, plus `/Logic/Start Up`. `Pages/Game` places Stage 3D, Top Bar, Camera Bar, Sheet, Toast, Season Letter and Dispatcher (it omits Furniture Toolbar). The Grownups page's purpose. Scripts reached through `use()`. `sync-rules.mjs` copies `gala-rules/src` → `S:rules`, and `sync-stage.mjs` copies `reference/src` → `S:stage`. `reference/` is absent (true). Note: the sentence starts with a blanket "those files are generated", but `game/` and `view/` are hand ports and `settings/check.js` comes from `sync-check.mjs`. The plan names the two generators correctly, so this is not counted as wrong.
- **State (16–24):** `su_gala` `persist:true`, `storageKey:"gala-game-v2"`, key `save`; `su_ui` `persist:false`; the five shared Variables (`words`, `ready`, `grownupWords`, `grownupTable`, `grownupMessage`); `gala-act` → `dp_rx` → `dispatch.js` → `{ save, ui, toast }` (the file header says exactly this) → Set Global Store; the save shape matches `fresh()`; the `plan` contents (order, numbers, hair, snack, parking, backdrop); the `school` contents; the notebook gets one entry per gala (`finishGala` `unshift`); `save.js` exports `fresh, fromRound1, mend, nextSeason`.
- **Backend (25–31):** `cloudservices` instanceId / type `nodegx` / endpoint `127.0.0.1:8585`; one collection `GameChange`; three functions and role `grownup`; `nodegx.security.json`; the page uses LogIn / SignUp / LogOut / User; `claimGrownup` grants the role to the first account on the backend.
- **Touch-point table (32–38):** `su_open` opens once (`alreadyOpen` from `ready`); `su_apply`; `su_wait` Timer 4000 ms as the backend fallback; `su_setReady`. `dp_setSave` is the only in-play writer of `gala.save`: the only other `gala` Set is `su_setSave`, and Stage 3D writes only `ui.live/cam/float`. `finishGala` writes the result. Grownups ids `gp_login1`, `gp_signup1`, `gp_logout1`, `gp_userNode`, `gp_saveFn`, `gp_removeFn`, `gp_claimFn`. `tb_grown` is the ⚙︎ chip (the navigation itself is `tb_goGrown`). The four `tools/` scripts exist. `gala-rules/src` + `tests`.
- **Elsewhere (39–47):** cloud functions are `/#__cloud__/…` components; calls are `CloudFunction2`; `seed` is in the save; the tools that read `reference/src` (`sync-stage`, `extract-words`) cannot be re-run; `node --test tests/*.test.mjs` with engine/rows/music tests (matches `package.json`); `check-views.mjs` runs the view code; the save's shape lives in `plan.js` + `save.js`; the checker exists in three places (`check.src.js` → `S:settings/check.js` and pasted into `saveChange`); the start-up order `su_gala.ready → su_wait → su_apply → su_open → su_setReady` (it leaves out `su_changes` and `su_setSave` but has the order right).

**Wrong (1):**
- **#30.** "`/Pages/Grownups` uses … the cloud nodes `noodl.cloud.getuserroles`, `addusertorole` and `listusersinrole`." Those nodes are cloud-only. They live in `C:__cloud__/claimGrownup` (`cl_list`, `cl_add`) and `C:__cloud__/saveChange` (`sv_roles`). The page has only `CloudFunction2` callers. This is an aside, and nothing in the plan depends on it.

**Unverifiable (2):**
- #48: "the game relies on" GlobalStore writing synchronously to localStorage. The plan hedges this itself. The key says the store persists on the next tick, which can't be confirmed without running the runtime.
- #49: "add the `grownup` role if it is absent". Whether the role exists depends on the live backend's state.

---

## C. Plan, macro

**MUST 8/8**
1. `su_gala` is the one per-device slot. ✓ A vault keyed `device` and `user:<id>`, with the `gala` store holding the active save.
2. `su_open`/`mend` runs once and sign-in after boot needs its own path. ✓ "needs an explicit re-open path, not just a store write". It does not say explicitly that a pulled save must pass through `mend`, or that `fresh` must come after `applyOnce`.
3. Boot order and not blocking offline. ✓ It names the chain, keeps `su_wait`, and opens the local save first.
4. `dp_setSave` is the single write point. ✓ The sync layer hangs off it (a store subscription and a debounce).
5. `nodegx.security.json`. ✓ `Player` find/get `nobody`, a call rule for every function, and the rules written into the file. It does not decide `signup:"public"` and does not mention installing the rules.
6. Family grown-up ≠ `grownup`. ✓ *found*: "The grown-up role is global … This is the biggest decision in the plan." It is mishandled in the design, though (see traps and D8).
7. The endpoint is loopback. ✓ It must be deployed.
8. The save has no rev or timestamp. ✓ `rev`/`updatedAt` sit in the `Player` row and the vault envelope, and the blob is unchanged. That is a valid answer, but the `mend` wipe on `v !== 2` is never mentioned.

**SHOULD 1/4.** Found: a sign-in UI (a new `/Pages/SignIn` plus a top-bar chip). It does not note that the shared session makes a signed-in child "not the grown-up" on ⚙︎. Missed: reset/next season vs the cloud copy; `stopRun` when switching child mid-run; checking usernames with `cleanName`/`rude`.

**TRAPS: avoided 3, fallen 1, not relevant 3**
- Avoided: `cloud-save.glue.js` (not taken for a progress save; it correctly reads the pasted checker); the localhost backend; two children sharing one key and session (a per-user vault, and sign-out returns to the device save).
- **Fallen (partly): the first-come `grownup` role.** Step 1 reuses the auto-claiming Pages/Grownups sign-in ("`claimGrownup` makes the first account the family's grown-up"). `createChild`, `listChildren`, `resetChildPassword` and `deleteChild` are all `role:grownup`, and `signup:"public"` is left open. Nothing stops a child signing up on ⚙︎ first and taking the role. The parent who does take it also becomes the global `GameChange` editor. The risks section names the alternative (`Family.ownerId`) but the design does not adopt it.
- Not relevant: changes that arrive after the 4 s Timer (GameChange only); the docs' "Save" record (no docs in this bundle); a careless merge that sends a malformed object to `mend`. The plan neither falls into this one nor guards against it: it never says a pulled save must be mended.

**SECRETS 2/10.** Found: #3, `claimGrownup` is open to `authenticated` and works only while no grown-up exists (in quiz Q4); #7, the checker exists in three places (PLAN part 4). Not found: #1 the `noodl_store_` prefix and `{save:…}` wrapper (it says it is unsure of the persist semantics); #2 the auto-claim on LogIn **and** SignUp (it lists the node ids but not the wiring); #4 the External Link reload; #5 the result being decided at `beginRun` (it sees only "seed is part of the save"); #6 nothing lost mid-gala; #8 `fields` as JSON text; #9 `fromRound1` being dead (the quiz implies it is live); #10 the language becoming per child.

---

## D. Plan, soundness

| # | Score | Why |
|---|---|---|
| 1 Child sign-in, no email, grown-up sets up | 1 | Concrete: `createChild` makes a username and password with no email, there is a name picker, and the grown-up resets passwords. But it rests on the global first-come `grownup` role. Also, the child's device, which is not signed in, must call `listChildren`, which is `role:grownup`, so the picker cannot work as written. |
| 2 Two children, one device | 2 | A vault keyed per user plus a separate anonymous slot. Signing in as one child never shows the other's game, and signing out returns to the device save. |
| 3 Works with no sign-in | 2 | Local-first, the game never waits for the network, and the anonymous `device` slot stays. |
| 4 First sign-in keeps device progress | 2 | Adopt if the account is empty. If it is not, the device save is kept in the vault and offered as a one-tap switch with a confirmation. Nothing is silently dropped. |
| 5 Offline / mid-game drops | 2 | Write-through vault, a `dirty` flag, a 2 s debounce, a push on `online`, retry with backoff, `baseRev` conflict detection, a prompt, and a notebook union. |
| 6 Server workflows concrete | 2 | Six functions with call rules and their checks (`userId === caller`, rev check, conflict returns the server copy), plus a nightly `backupSaves` schedule→call-function workflow. It has no server-side check of the save's contents or size. |
| 7 Children's data | 1 | No email; `Player` find/get `nobody`; minimal fields; `deleteChild`. It never mentions consent or a retention policy, and does not say what the grown-up can see. |
| 8 Fit to the app | 1 | It reuses Start Up, Dispatcher, the Grownups pattern and the `__cloud__` style well, and it noticed the existing role. But its own functions still sit on that global role, it keeps the auto-claim flow, and `signup:public` is unaddressed. It even writes "add the `grownup` role if it is absent". |
| 9 Ordering & verification | 2 | A buildable sequence (backend → functions → pure sync with tests → Start Up → Grownups → sign-in UI → workflow). The checks would catch real failures: `check-sync` against a fake backend, `drive_page` for child A, then B, then backend blocked, and a direct `Player` read that must fail. |

Total 15/18. **P(ship without redesign): 55%.**

**Biggest reason it might not:** the identity model is left as an open fork. The plan's functions are built on the backend-wide, first-come `grownup` role, so on any shared backend only one family gets a grown-up, and that grown-up also edits everyone's game content. The device picker also cannot call `listChildren`. Moving to `Family.ownerId` means rewriting every call rule and in-function check, plus the Grownups sign-in path.

---

## E. The thought process

**What it says.** Easy: "The `--graph` page prints the whole app as text on one page … the shape of the game was readable without opening the JSON." The scripts are small and commented, and the Grownups page is a working auth and cloud pattern. Hard: `reference/` is missing; the save has no schema; the checker is pasted three times; the start-up ordering is subtle; the "first account" rule of `claimGrownup` is easy to miss. Unsure: per-family vs shared backend, global vs per-family role, the GlobalStore persist timing, whether `createuser`'s username is what the child types, the conflict policy, and a deployed vs local backend.

**Did it use the `--graph` page? Yes, as its main reading surface.** The metrics' `files` list is the saved graph (`…/vibe-scratchpad-…/graph.txt`) plus only two script files, `app/scripts/game/actions.js` and `app/scripts/game/dispatch.js`. `componentsRead` is **0**: it never opened a `components/*/nodes.json`. The one error is a `read_file` refused at 51.1 KiB (over the 50 KiB cap), which fits the graph page. The 8 `read_file` calls over 3 files point to the page being read in slices with offset and limit. Beside the page it made 13 `nodegx_call_tool` calls (after `open_project` and 3 `find_tools`; the metrics do not say which tools) and 20 bash calls (19 begin with `cd`, so what they ran is not visible). Where it read something other than the page: the dispatch path and the actions, read directly as source. That matches the quiz, which notes on Q6, "I read the dispatch path; the stage's internal reporting I inferred."

**Do the numbers match what it says?** Yes. It says the graph made the JSON unnecessary, and `componentsRead: 0` agrees. The ids it quotes (`su_*`, `dp_setSave`, `gp_*`, `tb_grown`), the 54 / 762 / 874 counts and the start-up chain are exactly what a one-page node and wire dump gives, and all of them check out. It was very fast: first look at the save at 0.3 min, the plan at 3.6 min, $0.047. Its "hard" list is honest. The pasted-checker and first-account points are real secrets it found.

**Strongest:** the graph-level picture: stores, the one write point, the boot chain, the backend inventory and the node ids. That is where 46/49 claims landed and why it found all 8 MUST touch points. The local-first sync design built on that picture (vault, dirty, rev, adoption) is the best part of the plan.

**Weakest:** behaviour that a node and wire dump does not show directly. It missed the `noodl_store_` prefix and the persist timing (it said so), the auto-claim wiring's consequences, the dead `fromRound1`, and `dispatch.js` driving the stage. Above all, it could not turn a risk it saw into a design change. It called the global `grownup` role "the biggest decision in the plan", then built every child-management function on it. In the closed-book quiz it named a different risk (the opaque save blob) as the riskiest.
