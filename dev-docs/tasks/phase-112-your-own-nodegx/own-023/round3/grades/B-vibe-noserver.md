# OWN-023 r3 grade: B-vibe-noserver

**Harness:** Mistral Vibe 2.26.1 with DeepSeek V4.1 Flash. The NodeGX MCP server failed to start (a lab sandbox fault), so the stranger had no working NodeGX server. It read only the raw project files (JSON and scripts, through bash, read_file and python3).
**App:** NodeGX project `work/gala/app` (Le Gala de danse). I checked every claim against `app/components/**`, `app/scripts/**`, `app/nodegx.security.json`, `app/nodegx.project.json` and `tools/`.
**Headline:** quiz 20/22 (0 confidently wrong) · micro 62/66 right, 3 wrong, 0 built on · MUST 5/8, SHOULD 2/4 · traps fallen 2, avoided 4 · secrets 3/9 · soundness 14/18 · P(ship without redesign) 40%.

---

## A) QUIZ

| Q | score | conf. | justification (key) |
|---|---|---|---|
| 1 | 2 | sure | Dance-school gala management. Covers preparing (programme, blocks+chain choreography, formation, costumes, loge, parking), rehearsal vs gala, simulated and scored, notebook, and the next season adding classes. ≥3 of the key's points. |
| 2 | 2 | sure / fairly | All 8 tabs, with parking from season 2 (bonus). Gives prep/run/results and the season letter, plus `Pages/Grownups` via the gear chip. It invents no child login screen and no main menu. |
| 3 | 2 | sure | Exact save shape. Global Store `gala`, `storageKey "gala-game-v2"`, key `save`, in browser local storage. Written by the dispatcher after each press and once at boot after mend. Thin spot: it never says the `ui` store and the run in progress are *not* saved. The `noodl_store_` prefix is not knowable from the folder, so it is not counted. |
| 4 | 2 | sure | Backend at `127.0.0.1:8585`. `GameChange` find/get public and writes nobody. The three functions with their correct roles. Username+password accounts, public signup. "Accounts only for grown-ups, no child account, no per-child progress." Matches the key. |
| 5 | 2 | sure | `grownup` role. The editor is shown on `User.roles` (cosmetic). Enforced again in `saveChange/removeChange` via getuserroles and by security.json `role:grownup`. `claimGrownup` grants only if `listusersinrole` is empty, so the first account wins. Misses only the bonus that nobody holds it yet. |
| 6 | 2 | fairly | `frame.go()`, then `gala-act {act:"go",arg:"gala"}`, then `dp_rx`→`dp_fn`→`dispatch()`→`begin()`→`stage.beginRun('gala')`→`play.startRun`→`simulate()` up front. Then frame-loop playback, `live`/`say`, `onDone`→`runDone`→`finishGala`→results via `view/run.js`. Every piece is correct. The season seed is not named. |
| 7 | 2 | fairly | Stars, start 30, earned at the gala through `finishGala` (stars+earned). Per-number placement/music/harmony/execution/wow plus satisfaction match `engine.js` l.311–312. The full spend list is correct. Thin spot: it never says purchases are permanent or that rehearsals earn nothing. |
| 8 | 1 | sure | The S2 parking, S3 ados+floors+moods and S4 mamans additions are right, and so are `seasonRules`, `addSeasonNumbers` and the new seed. It says "Four seasons", but S5+ is a free season. It omits that stars and purchases carry over and the season letter. |
| 9 | 2 | sure | `save.lang` toggled by the `lang` act. `{key,fr,en}` Static Data rows (game `Words` plus `Grownups/Words`). `text.words()` with `{0}`, `{0:s}`, `{0:lower}`. Items carry their own fr/en (`w.nm`). Small slip: it places the "Words" node in App, but it is in `Logic/Start Up`, which App instantiates. The `extract-words.mjs` provenance is correct. |
| 10 | 2 | sure | `mend()`: `v!==2`, no plan or no school means fresh (keeps lang). Otherwise it fills keys, runs addSeasonNumbers, migrates moves+repeats to blocks+chain, filters order and repairs hair. It mentions `fromRound1` without saying it is dead code. Not marked down. |
| 11 | 1 | sure | Rules, views, actions and save are pure. Stage/three/Web Audio and the UI nodes are the screen. But it lists `game/dispatch.js` among the pure modules. That is the key's "watch for": dispatch drives the stage via `beginRun/stopRun/camCmd/setSpeed/wake`. |
| 12 | — | fairly | Opinion: "mend silently starts fresh on anything it doesn't recognise, including a *newer* save, so sync/version skew destroys progress silently." This is a real risk (key trap 5 / Q12 risk 2). It does not see risk 1 (the identity collision), which its own plan falls into. |

Total 20/22. Confidently wrong: 0. Q8 and Q11 were "sure" but scored 1, not 0.

---

## B) PLAN — MICRO (claims about the existing app)

66 claims: **62 right, 3 wrong, 1 unverifiable; 0 wrong claims built on.**

| group | n | right | notes |
|---|---|---|---|
| What the game is (dance school, blocks+chain, formations/costumes, loge/parking/shop, rehearsal vs gala scored into notebook, season→new classes) | 6 | 6 | |
| Structure: app/gala-rules/tools roles; project.json (name, id `ba2096a9-…`, version 5, `designTokens`, `cloudservices`); security.json role; component folders; script dirs; 3 files per component; Router `f7c4077d-…` startPage/routes; no routes file; `sync-rules.mjs` copies `gala-rules/src` | 9 | 9 | |
| Generated code: check.src→check.js via sync-check plus the body pasted in saveChange; check.cloud.js exports (`checkChange,toRows,cleanName,rude,TABLES,KNOWN`); stage scripts from `reference/src`; `reference/` missing | 4 | 3 | 1 wrong (W1) |
| State and save: two stores in Start Up; `gala` persist/`gala-game-v2`/`save`; only `gala` survives reload; `ui` keys `ui,res,live,cam,float,toast`; `su_ui` initialState + `UI0`; `fresh()` shape; `mend`; `nextSeason`; `fromRound1`; plan.js exports; school fields; plan fields (A/B, blocks, chain, costume…); notebook one entry per gala | 13 | 13 | |
| Loop: buttons send `gala-act {act,arg}`; `dp_rx`→`dp_fn`→`dispatch(act,arg,save,ui,w,stage)`→`{save,ui,toast}`; `dp_setSave/Ui/Res/Live/Toast`; save rewritten on every action; stage driven via `s3_run`/`s3_sync` | 5 | 4 | 1 wrong (W2) |
| Boot: `su_gala.ready`; `su_changes` + `su_wait` 4000 ms → `su_apply.run`; `applyOnce` re-checks then `applyRows`; `su_open` three inputs → `mend` → `su_setSave` → `su_setReady`; `gm_ready`→`gm_root.mounted`; boot waits ≤4 s | 6 | 6 | Exact match to `Logic/Start Up/connections.json` |
| Backend: endpoint/appId; GameChange perms; function perms; signup public, `creatorOwns:true`; saveChange node chain (`sv_req` params `table,rowId,fields` … `sv_ok/sv_fail`); removeChange shape; claimGrownup chain; checker in browser and server | 8 | 8 | |
| Sign-in today: only on Grownups; `User` outputs; `LogIn` ports; `SignUp` same shape; `LogOut` trigger is `login`; `gp_claimFn` after login/signup then `gp_userNode.fetch`; `gp_view` inputs + `view/grownups.js`; first account becomes grownup; no child, per-device save | 9 | 9 | |
| Embedded in parts 2–4: save read in `gm_save/dp_save/s3_sync`/views; storageKey is build-time, not runtime; new collections "reached only through cloud functions, exactly like GameChange"; mend wipes a newer-version save; `noodl.cloud.request` gives the caller's userId (`cl_req userId`); game needs no network beyond GameChange (three.js vendored) | 6 | 4 | 1 wrong (W3), 1 unverifiable (storageKey at runtime is NodeGX runtime behaviour; the plan itself flagged it as an assumption) |

**Wrong claims**
- **W1:** "`app/scripts/stage/{stage,world,people,play,music}.js` are generated … by `tools/sync-stage.mjs`". `sync-stage.mjs` l.54 writes only `world, people, play, music`. `stage.js` is hand-written glue ("what reference/src/main.js did…"). *Not built on.* The plan's consequence ("don't touch the stage scripts") is harmless.
- **W2:** "the save is rewritten on every single action." `dp_fn` sets `gala.save` only `if (r.save)`. Tab, camera, selection and speed presses return only `ui`. *Not built on in a harmful way.* The offline argument needs only "every save change is written", which is true.
- **W3:** new `Player`/`Progress` collections "both `nobody` for direct client access — reached only through cloud functions, exactly like `GameChange`". `GameChange` has `find/get: public` and is read directly by `su_changes`/`gp_changes` (DbCollection2). The plan states the real perms correctly in part 1, so this is a loose analogy. *Not built on.* The proposed closed collections are sound in themselves.

Worth noting: the most consequential error is not a wrong fact. The plan knows that "the first account to sign up becomes the `grownup`" (right) and still builds the per-family model on `role:grownup` (see C/D).

---

## C) PLAN — MACRO

**MUST: 5/8 found**
- ✅ `su_gala` single slot: a `saves` map plus `active`, with the anonymous save migrated to `saves.guest`, which is kept for non-signers.
- ❌ `su_open`/`mend` path. The plan never routes a save loaded from the server through `mend`. It never notices that `su_open` runs once per load (`alreadyOpen`), so a sign-in after boot needs its own mend→Set path, or that `fresh()` must come after `applyOnce`. It does see that mend wipes a newer `v`.
- ✅ Boot order: described exactly, and "boot never waits on the network; sync in the background".
- ✅ `Game/Dispatcher` `dp_setSave` is "the natural sync point". `finishGala` is not singled out.
- ✅ (partial) `nodegx.security.json`: new closed collections, `functions` entries, caller-id scoping. No decision on `signup:"public"` (child self-signup is even a fallback). `creatorOwns` not used.
- ❌ **Family grown-up ≠ `grownup`.** `createChild/listChildren/linkChild/resetProgress` are all `role:grownup`, and "My children" sits on `Pages/Grownups`, which auto-claims. Only one account per backend can ever hold that role.
- ❌ Endpoint `127.0.0.1:8585`. Quoted in part 1, never treated as unreachable from another device. Step 2 just says "deploy them".
- ✅ Save format: `rev`/`ackedRev`/`updatedAt` kept beside the save (`sync` map, `Progress.rev`), CAS on `baseRev`, and the newer-`v` guard. No `v` bump, but the need is covered.

**SHOULD: 2/4 found**
- ❌ In-game reset (`note:resetYes`) / `nextSeason` vs the cloud copy. Only a grown-up `resetProgress` exists.
- ✅ Sign-in UI: `Pages/SignIn` plus a Router route plus a `Game/Top Bar` chip. It misses that one shared User session makes a child signed in on Game look "not grown-up" on ⚙︎.
- ✅ (partial) `Game/Stage 3D` `s3_sync` "must keep working when the save is swapped". No `stopRun` on a switch mid-run.
- ❌ Child usernames are not checked with `cleanName`/`rude`.

**TRAPS: fallen 2, avoided 4, not relevant 1**
- Fallen: **grownup role first-come**. The plan reuses it for every family's parent. Only one family's grown-up can ever hold it, and the first family member to touch ⚙︎ (possibly a child) becomes content admin.
- Fallen (variant): **4 s / applyOnce timing**. "Boot never waits… a change from today, where `su_open` waits for `su_apply`." Opening the save before the grown-ups' rows are applied would run `mend`/`fresh()` against unpatched tables (`START.stars`, renamed or removed items). Grown-up rows that arrive later would mutate the tables under a running game, or be ignored.
- Avoided: `cloud-save.glue.js` is not mistaken for a progress save. It does not claim the backend already syncs across devices (though it misses that it can't). It guards against `mend` wipes (server checks `v:2`, newer-`v` check, never deletes). Two children on one key is handled by the `saves` map with a flush on sign-out.
- Not relevant: the docs' "Save" record (no docs present).

**SECRETS: 3/9** (secret 1, the `noodl_store_` prefix, is excluded as NodeGX-source knowledge)
- Found: #2 claim on LogIn.done **and** SignUp.done; #3 `authenticated` caller, grant iff list empty (`cl_decide`); #7 checker in three places plus browser re-check before `applyRows`.
- Not found: #4 External Link `/` reload (only "reaches the game after a reload"); #5 seed and dice semantics; #6 stars only at `runDone` / mid-gala close loses nothing; #8 `fields` JSON text, one row per (table,rowId), merge; #9 `fromRound1` dead (listed as live); #10 lang becomes per-child once saves are (it noted only that Grownups borrows the save's lang).

---

## D) PLAN — SOUNDNESS (14/18)

1. **Child sign-in, no email, set up by a grown-up: 1.** Username+PIN created by the grown-up via `createChild`, with rate-limited PINs. But it is gated on the single first-come `grownup` role, so it fails for every family but one. The user-creation primitive is unknown (honestly flagged).
2. **Two children, one device: 2.** A per-profile `saves` map, `active`, a mirror on every change and a flush before switching.
3. **Works without sign-in: 2.** The `guest` profile is the old save. The dispatcher, stage and views keep reading `gala.save` unchanged.
4. **First sign-in keeps device progress: 1.** `claimProgress` adopts the guest save into an empty account and keeps both otherwise. But `saves.guest` is never cleared after adoption, so the second child signing into a fresh account would adopt the first child's progress as well. There is no rule for whose guest save it is.
5. **Offline / mid-game drop: 2.** Local is truth. Debounced push, retried on `online`/`pagehide`/timer. `rev` CAS with keep-both on conflict. Offline sign-in falls back to guest.
6. **Server workflows concrete: 2.** Seven functions, each with a caller rule and checks (caller's own `userId` from `noodl.cloud.request`, `baseRev`, `v:2`, a size cap), built on the `saveChange` node pattern. The validation is generated into both sides by the existing sync-check mechanism.
7. **Children's data: 1.** Minimal fields, owner-only reads, PIN rate-limit. No consent step, no retention/deletion story, no parent view of the child's progress.
8. **Fit to the app as it is: 1.** It reuses the store, dispatcher, boot chain, cloud-function pattern and checker generator, which is excellent. It noticed the existing accounts and role but handles them wrongly (the `grownup` collision, adding `familyId` to the global `GameChange` content). It misses the localhost endpoint and proposes decoupling `su_open` from `su_apply`.
9. **Ordering and verification: 2.** Confirm primitives → backend (tested by direct calls) → local profiles (guest unchanged) → UI → sync → adoption → checks. Concrete tests (two devices, two children, offline, conflict, cross-user `loadProgress`, `createChild` as a child). No two-families test, which is the one that would expose the role collision.

**Probability of shipping without a redesign: 40%.** The local-profile, sync and conflict design is solid and fits the code closely. **Biggest reason it might not:** the family model sits on `role:grownup`, which `claimGrownup` grants first-come to one account per backend (and auto-claims on any ⚙︎ sign-in). The admin/parent identity model has to be redone, and on top of that the backend must move off `127.0.0.1`.

---

## E) THE THOUGHT PROCESS

**What it says.** Easy: well-commented scripts, `tools/` explaining which files are generated, short self-describing cloud functions, a plain security file. Hard: the missing `reference/src`, undocumented NodeGX node semantics (it inferred ports from connections), the save shape spread across four files, and the boot order visible only in connections. Unsure: server-side user creation, runtime `storageKey`, the `LogOut` trigger being `login`, one backend per family vs shared, save size.

**Does it match the numbers?** Yes. 11 min wall clock, 57 tool calls (28 bash incl. 10 `python3` JSON parses, 28 reads), 42 files, 0 server calls (no server). Its first look at the save came at 0.3 min and it wrote the plan at 10.8 min, for about $0.07 in total. One 300 s timeout came from a `find /` hunting for `@nodegx`, which is the "node semantics undocumented" pain it reports, paid in wall time. With no MCP, it went straight to `nodes.json`/`connections.json` (Start Up, Dispatcher, Stage 3D, Top Bar, Pages, saveChange) and to every script that matters. Its own admission that it did not read `play.js` (Q6) checks out against the file list. Its uncertainties are honest and well placed. It doubted the right platform primitives and wrote nothing confidently wrong about them.

**Strongest:** the data flow. The boot chain, node by node; the store/save/dispatcher write path; the cloud-function node chains; the checker's three copies. The micro accuracy is 94% with no wrong fact carrying weight, and the quiz is 20/22 from a raw-file read with no server.

**Weakest:** consequences of the permission model and deployment reality. It read `cl_decide` correctly (first account wins) and then gave every family's parent `role:grownup`. It quoted `127.0.0.1:8585` and never asked how a school laptop reaches it. Its "never wait on the network at boot" also cuts the rules-before-save ordering that `su_open` depends on. It understood the mechanism precisely and did not carry that understanding through to the design.
