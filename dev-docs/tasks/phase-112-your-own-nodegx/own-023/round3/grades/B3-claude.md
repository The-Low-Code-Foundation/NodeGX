# OWN-023 r3b: grade, B3-claude (NodeGX version, Claude Code + @nodegx/mcp 0.2.4 `--graph`)

Sources graded against: the app at `/private/var/tmp/own023-r3b/B3-claude/work/gala/app` (and its `tools/`, `gala-rules/`),
then `key-nodegx.md`. I found **no place where the key and the source disagree** on anything this arm's answers touch.
Spot checks: 54 components, 762 nodes, 874 wires; `fresh()` is 3019 chars and a season-5 save is 4172 chars (measured by
loading `save.js` in Node); `gala-rules` has 2+4+13 = 19 tests; `stage/play.js:114` runs `simulate` with the season's
`seed` (a fresh random seed only for `try`).

Headline: quiz **21/22** (0 confidently wrong); micro **51 right / 1 wrong / 6 unverifiable of 58**, nothing built on the wrong
claim; MUST **8/8**, SHOULD **4/4**, traps **0 fallen**; secrets **5/10**; soundness **18/18**; P(ship without redesign) **75%**.

---

## A. Quiz

| Q | Score | Conf. | Justification (key) |
|---|---|---|---|
| 1 | 2 | sure | Dance-school gala management, prep tabs, try-out/rehearsal vs gala night, verdicts, stars, next season. Meets ≥3 of the key's points. |
| 2 | 2 | sure | All 8 tabs (Parking from S2: the bonus), live + results views, top bar, camera bar, furniture toolbar, toast, season letter, grown-ups page. |
| 3 | 2 | sure* | Store `gala`/key `save`, `storageKey gala-game-v2`, localStorage; written at start-up after repair and on every Dispatcher press; `ui` and the run in progress not saved. Missed the bonus `noodl_store_` prefix/`{save:…}` wrapper, and said "don't know" about write timing (honest). |
| 4 | 2 | sure | Backend at 127.0.0.1:8585 (localhost, the bonus), `GameChange` public-read/no direct write, 3 functions with the right rules, public sign-up, players have no accounts, 4 s wait. |
| 5 | 2 | sure | `grownup` role; first account wins via `claimGrownup`, called after every log-in/sign-up (the bonus); UI check plus server re-check and the shared checker; applies at the next full load. Did not say nobody holds the role yet. |
| 6 | 2 | fairly sure | `gala-act go/gala` → Dispatcher → `dispatch.begin` → `stage.beginRun('gala')` → `ui` run/res/live → live updates → `done` → `runDone` → `finishGala` → Results. Up-front `simulate` is stated, but flagged as inference; the seed is not mentioned. |
| 7 | 2 | fairly sure | Stars, gala night only, rehearsal shows but gives nothing, the full spending list, bought = kept. Said "don't know" about the formula (not required for full marks). |
| 8 | 1 | fairly sure | `nextSeason` mechanics right (season++, `galaDone` reset, new seed, `addSeasonNumbers`, season letter, car park S2). Missing ados/floors/moods (S3) and mamans (S4); key wants ≥3 of the 4 additions. It said "don't know" rather than guess. |
| 9 | 2 | sure | `save.lang` + the FR/EN chip → `dispatch`; Static Data "Words" → Variable `words` → `text.words` with `{0}`, `{0:s}`, `{0:lower}`; game tables carry fr/en; grown-ups' words table; `tools/words.json` correctly placed as an extraction copy. |
| 10 | 2 | fairly sure | `mend()`: `v!==2`/no plan/school → fresh (keeps lang); fills from `fresh()`, adds season dances, migrates to blocks, drops unknown dances/order entries, fixes hair. `fromRound1` is never called (rated "guessing", but right). |
| 11 | 2 | fairly sure | rules/actions/save/text/check/view pure; `dispatch.js` "nearly pure, but it calls the 3D stage": exactly the key's watch-for, avoided; stage/* and the graph's visual nodes touch the screen. |
| 12 | – | fairly sure | Opinion (not scored): `mend()` turning an unknown save into a fresh school, then pushing it everywhere. This is the key's risk #2 (save reconciliation) seen through its sharpest trap. Risk #1 (identity collision) is already handled in the plan. The second risk it names (whether the persisted store keeps extra keys) is real: unverified, though the key's secret 1 (`{"save":…}` is the whole store) suggests it holds. |

Total **21/22**. Confidently wrong: **0**. Every "don't know" was a real gap rather than a wrong answer.

---

## B. Plan, micro (claims about the existing app)

58 claims checked: **51 right, 1 wrong, 6 unverifiable**. Wrong claims a plan step builds on: **0**.

**Right (selection, all verified in source):** `nodegx.project.json` version "5", `react19`; 54/762/874; `Scripts.<name>` + `use()`;
`scripts/rules/*` from `gala-rules/src` via `sync-rules.mjs`, checked by `check-rules.mjs`; 19 gala-rules tests;
`dispatch.js` returns `{save, ui, toast}`; `actions.js` exports `buy, formationAct, costume, build, finishGala`; `save.js`
exports `fresh(lang), mend, nextSeason, fromRound1`; `settings/check.js` from `check.src.js` via `sync-check.mjs`, with `rude`
(l.31) and `cleanName` (l.41), pasted into `saveChange`; `su_gala` `persist:true, storageKey:"gala-game-v2"`, key `save`;
save shape matches `fresh()`/`defaultPlan()`/`defaultSchool()`/`finishGala` notebook entry; ~3 KB / ~4 KB (3019/4172);
`ui` store `persist:false`; **exactly two writers of `gala.save`** (`su_setSave`, `dp_setSave`: confirmed by scanning every
`nodes.json`); `su_open` = `if (!rulesReady||!storeReady||alreadyOpen) return; mend(stored.save)` → `su_setSave` → `su_setReady`;
`gm_ready → gm_root.mounted`; full list of `GlobalStore.Subscribe gala/save` readers (Top Bar, Camera Bar, Sheet, Live, Results,
Season Letter, 8 tabs, Grownups `gp_save` for `lang`; Stage 3D gets it via `Pages/Game` `gm_save` → `s3_sync`, which calls
`stage.sync(save, ui, …)`); `begin()` → `stage.beginRun(mode)` → `play.startRun` → `simulate` up front; the save changes only at
`runDone`; `resetYes` → `S.fresh(save.lang)`; `stop(stage)` and `UI0` exist in `dispatch.js`; endpoint `127.0.0.1:8585`,
`backend_mvi4i1s8eudt8`; every line of `nodegx.security.json` it quotes; `claimGrownup` (`cl_decide`: grant iff list empty, `already`
if the caller holds it, else refused); `gp_user`, `gp_pass`, `gp_login1`/`gp_signup1` → `gp_claimFn`; `tb_grown` ⚙︎ chip (`tb_goGrown`
navigates); Grownups description "(being built)"; "Réglages des grands"; `reference/src` absent; `extract-words.mjs`/`sync-stage.mjs`
read it; `check-views.mjs` reads `tools/words.json`; `cloud-save.glue.js` is the tail of `saveChange` (`notGrownup` refusal); the cloud
function shape request → getuserroles → query → JS → create/update → response (`saveChange`).

**Wrong (1):**
- "`scripts/stage/*` … is generated by `tools/sync-stage.mjs` from `reference/src`." Only `world.js`, `people.js`, `play.js`,
  `music.js` carry the GENERATED header. `stage.js` is hand-assembled ("what reference/src/main.js did … put together"). This is a
  wrong aside: the plan leaves the stage scripts untouched, and the conclusion it draws ("the stage can't be regenerated") still holds.
  Not built on. Consistent with the quiz admission "I didn't read `stage.js`".

**Unverifiable from the app (6):** no scheduled-job node exists; Create User in a cloud function accepts no email; Update Record
`onlyIfUnchanged` is a compare-and-set; a signed-in user can edit their own user record; built-in Log In can't count failures
per account; tool names (`drive_page`, `check_backend_access`, `get_backend_ops_config`, `npx nodegx-deploy`). The stranger
labelled the first five as assumptions itself in part 4. That is the right handling.

---

## C. Plan, macro

**MUST 8/8**
1. `su_gala` is the single slot → `gala.players[id]` per child, `gala.guest`, and `gala.save` kept as the guest's untouched save. Found.
2. `su_open` + `mend`: boot opens the active child's slot through `mend()`. After boot, switching goes through a new `player:switch` in
   `dispatch.js`, and merges go through `mend()`. Found. It is thin on two points: a pulled server copy is not said to be `mend`ed
   outside boot, and "fresh after `applyOnce`" is not discussed. The design creates fresh saves on the client after boot, so it is safe.
3. Boot chain and offline: "the game still opens without the network". Sync is a separate `/Logic/Sync` and never gates `ready`. Found.
4. `dp_setSave` is the single writer. It is named, and `runDone` pushes at once. Sync hooks by subscribing to `gala.save` rather than
   editing the Dispatcher, which is a legitimate choice. Found.
5. `nodegx.security.json`: new collections all `nobody` with cloud-function-only access, `functions` entries per role, child accounts
   only via `addChild`, checked with `check_backend_access`. Found. `devOpen` is not mentioned. Public sign-up is kept for parents, but
   `createFamily` (any authenticated user) lets any sign-up become a `parent`, which contradicts the test "public sign-up can't produce
   a `parent` role" (minor).
6. Family grown-up ≠ `grownup`: a new `parent` role, the `Pages/Grownups` *pattern* reused without its auto-claim, and `claimGrownup`
   changed to refuse `child`/`parent`. Found, strongly.
7. Endpoint is loopback: step 1 is hosting with HTTPS and repointing `cloudservices`. Found.
8. Save format `v:2` has no rev: `version`/`baseVersion`/`rev`/`sentRev`/`base` are kept beside the save, plus the `appSaveV` skew
   guard, and the plan names that `mend` wipes `v!==2`. Found.

**SHOULD 4/4:** reset → `reset` backup and a confirmation, plus a season backup; the player chip/picker in Top Bar, `/Pages/Family`
in the App Router, and "the browser holds one session"; switching child calls `stop(stage)` and resets `ui`; nicknames go through
`cleanName` + `rude`.

**TRAPS: 0 fallen, 5 avoided, 2 not relevant.** Avoided: `cloud-save.glue.js` (named explicitly in part 4); the unclaimed
`grownup` role could go to a child (fixed in step 3); localhost backend; `mend` wipes an unrecognised save (the central guard);
two children sharing one key and one session. Not relevant: GameChange arriving after the 4 s Timer, and the docs' "Save" record
(there are no docs in this bundle).

**SECRETS 5/10.** Found: #2 (auto-claim on LogIn and SignUp), #3 (`authenticated`, first account wins), #6 (save changes only at
`runDone`), #7 (one checker source → browser script + pasted into `saveChange`), #10 (`lang` lives in the save; the merge keeps
`mine`; Grownups borrows it). Missed: #1 (`noodl_store_` prefix, `{save:…}` wrapper; the plan's open question about extra keys is
exactly this gap), #4 (External Link `/` reload), #5 (seed determinism), #8 (`GameChange.fields` JSON text and its merge), #9
(`fromRound1` dead: the plan presents it as a live importer; only the quiz guesses that it is dead).

---

## D. Plan, soundness

| # | Score | Note |
|---|---|---|
| 1 | 2 | The parent creates each child via `addChild`: player code plus a 3-of-36 picture secret, no email, role `child`, the card shown once, resettable. It names its own weakness (47k combinations; a lockout depends on backend rate limits). |
| 2 | 2 | Per-child `gala.players` slots plus a separate guest slot. Switching = signing in as that child. Sync pushes only the signed-in id's slot; `pushProgress` checks ownership. |
| 3 | 2 | Absent `active` = guest = today's `gala.save`, untouched. Boot does not need the network. Test 1 checks a pre-update save opens unchanged. |
| 4 | 2 | `hasProgress` gates an "adopt" prompt. If the child already has an online school, both are shown side by side, and the loser goes to `ProgressBackup` and stays in `gala.guest`. Nothing is deleted. |
| 5 | 2 | Local-first: every press is already persisted. `rev > sentRev` queue, backoff and `online`/visibility retries, `opId` idempotency, CAS on `version`, three-way `mergeSaves` with a backup of the loser, a swap only in `prep`. One weak rule: two offline galas of the same season both count (stars added twice). Nothing is lost, but it is a balance hole. |
| 6 | 2 | Nine named functions, each with caller rules and checks. `pushProgress` is spelled out step by step (size/shape, version skew, idempotency, CAS, backups, pruning). |
| 7 | 2 | Nickname plus avatar only, no email or DOB for children. Parent can delete everything. Child sees only its own data, parent only their family's. Consent is one line ("belongs on `/Pages/Family`"). The offline sign-in without a secret is flagged as a parent-switchable choice. |
| 8 | 2 | Noticed the existing accounts, the first-come global `grownup`, public `GameChange` and the house style (cloud-function writes, closed collections, one checker source). Kept them apart and patched `claimGrownup`. Reuses `su_open`, `dispatch`, Static Data words, `Season Letter` as a sheet model. Small seams: `createFamily` vs the "public sign-up can't make a parent" test, and the parent's and child's sessions sharing a browser. |
| 9 | 2 | Hosting → pure scripts with `check-sync.mjs` → backend + security → pages → boot → picker → Sync → adopt prompt → words. Baseline checks are kept green. The end-to-end script uses two browser profiles and covers offline mid-gala, a conflict, clearing storage, reset and rude names. These are checks that would catch real failures. |

**Total 18/18. P(ship without redesign) = 75%.**
**Biggest risk:** the no-email account design rests on unverified platform capabilities. These are Create User (no email) plus
Add User To Role inside a cloud function, `onlyIfUnchanged` as a real compare-and-set, and per-account login throttling for a
low-entropy picture secret. If `addChild` can't create users on the server, the sign-in design has to move. The stranger lists
all of these as open itself, which is why the number is not lower.

---

## E. Thought process

**Stranger's account (part 4).** Easy: `--graph` gave "the whole app on one page", with per-component descriptions and
"why" comments on nodes. The disciplined architecture (one event channel, one dispatcher, two writers) made "where does
progress live and who writes it" "a few greps over the graph". Hard or surprising: `reference/src` is missing; `cloud-save.glue.js`
reads like a progress cloud-save and isn't; `grownup` reads like "a parent" and is the game's operator; the Grownups page is
"(being built)". Unsure: whether the Global Store persists extra keys, Create User without email, `onlyIfUnchanged`, rate limiting,
and the absence of a scheduled-job node.

**Does it match the numbers?** Yes. 6.2 wall minutes, 30 tool calls (28 Bash, 7 of them `npx … --graph`), first look at the save
at 0.6 min, plan written at 6 min, `componentsRead: 0`. Every component fact came through the graph text, not through opening
`nodes.json`. Its 14 files read were the right ones (`save.js`, `dispatch.js`, `actions.js`, `security.json`, `project.json`,
`check.cloud.js`, `cloud-save.glue.js`, `view/grownups.js`, the node catalog). "A few greps over the graph" is literally what it did.
The 5 errors were permission denials (the `~/.noodl/backends` deny, a `/tmp` write), not misreadings. That is why it couldn't check
the backend config and says so. The quiz took 46 s with zero tools, and it still scored 21/22.

**Strongest:** the save's path end to end (store, key, the two writers, `mend` behaviour, the read-only subscribers). It reached
these at node-id precision, with no wrong claim. The identity model around `grownup`/`claimGrownup` is just as strong: it read the
trap the key was built around and designed against it.

**Weakest:** game content it didn't need for the feature: which classes and mechanics each season adds (Q8 = 1), the score
formula, the seed determinism. Also files it chose not to open (`stage.js`, hence the one wrong "all generated" aside), and the
backend platform's real capabilities, which it could only read from a node catalog. The "fit" gap in secrets (prefix/wrapper,
`fromRound1` dead, `fields` as text) is the same pattern: precise where it looked, silent where it didn't.
