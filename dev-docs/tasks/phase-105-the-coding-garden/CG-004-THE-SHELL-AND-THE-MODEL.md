# CG-004 — The shell and the model: Electron, a local backend, an owl in the main process

**Opened 2026-09-27**, scoped from TPL-012 §2.4–§2.5 and briefing §3–§4, §C2. **Status: 🟢 on the Mac, session 2 (2026-09-28) — AC1, AC3, AC4 (node + Electron), AC6, AC7, AC8, AC9 measured; AC5 measured on the Mac (packaged, Metal), Windows owed to CG-008; AC2 19/20 per run (§7.2). Session 3 (§8): renamed "Olive's Island" with the saves folder pinned (measured); build-app on the real template, AC8's family clauses and the no-model branch prepared. Was: ⬜ not
started.** Depends on nothing. Lane C.

## 1. The person sentence

> **A grown-up installs one file. The game opens offline with its own backend and its own owl, both on
> the loopback, and the Grown-ups page says exactly where the owl runs, how fast, and which of her
> tricks passed her exam on this machine.**

## 2. What it is

`garden-desktop/` beside this file (the Nightbook precedent: `../phase-78-the-templates/nightbook-desktop/`),
kept outside the npm workspaces:

- **The shell**, forked from Nightbook's and **parameterised** (name, port, data dir, policy, backup
  cron from one `garden.json`; no "Nightbook" left in `main.js` or `package.json`): one window, one
  instance, the backend spawned with `ELECTRON_RUN_AS_NODE --port 0 --no-admin`, `relay.js` on a fixed
  loopback origin serving the app and proxying the rest, `policy.js` adopting a changed shipped policy,
  nightly backups, `fit.js`, `timings.log`.
- **The owl sidecar**, new: `owl.js` in the main process, `node-llama-cpp` with the GGUF from
  `extraResources/model/`, loaded once, one context, one request at a time (a queue), raw ChatML with
  `SpecialTokensText` and the empty think block prefilled, a grammar per shape, `temperature` per rung,
  `maxTokens` ≤ 64, a 12 s timeout, the incomplete trailing UTF-8 stripped.
- **The route** on the relay: `POST /__garden/olive` with `{rung, slots, lang, shape, temperature}`;
  the shell **composes the prompt from its own template table** (the renderer never sends prompt text);
  slots are validated against the rung's word list, regex and length before anything reaches the model;
  the output passes the grammar, the cap, the FR/EN blocklist and a per-rung must-contain check;
  the reply is `{ok, value|text, ms, fallback}`. `GET /__garden/olive/status` returns model, load time,
  last ms, the exam's results. `POST /__garden/olive/exam` runs the exam.
- **Olive's exam**: the battery (`../phase-78-the-templates/tpl-012-olive-exam/battery.mjs`) trimmed to
  ~20 canned probes with expected answers, run on first launch and on demand, results stored in the app
  data, one pass/fail per rung; a rung the machine fails is withheld by CG-005.
- **The model file** is fetched at build by pinned URL and sha256 (`unsloth/Qwen3.5-0.8B-GGUF`,
  `Qwen3.5-0.8B-Q4_K_M.gguf`, 532 MB), cached in CI, never committed; `LICENSE` and `NOTICE` for
  Qwen (Apache 2.0), node-llama-cpp and llama.cpp (MIT) ship in `extraResources/licenses/`.
- **The app**: `build-app.js --project templates/bot-garden` exports with the loopback origin baked in
  (an EMPTY `cloudservices.endpoint` means NO backend).

## 3. Acceptance criteria

1. Shell unit tests: config parameterisation, the relay's routing, the slot validation (a slot with a
   word outside the list, over 40 characters or with a control character is refused with a named
   reason), the output checks (blocklist, must-contain, cap), the queue (two concurrent requests are
   served in order), the timeout → `fallback:true`.
2. The contract test runs the exam against the route with the real model on CPU: every "consistent"
   probe from briefing §C2 passes its expectation, every "fails reliably" probe is recorded as failing,
   and the run is green on the Mac and on a Linux runner (correctness, not timing).
3. `GET /__garden/olive/status` answers within 1 s while a completion is running.
4. The shell starts with no model file present: the game runs, every Olive block uses the written line,
   status says "no model".
5. `node-llama-cpp`'s native binary lives outside the asar (`asarUnpack`), and the packaged app on
   Windows x64 loads it CPU-only; the packaged app on macOS loads it with Metal.
6. The GGUF's sha256 is checked at build and at first launch; a mismatch refuses the model and says so
   on the Grown-ups page.
7. `timings.log` records model load ms, each exam probe's ms, and each request's ms.
8. Upgrade: a v2 installer over a used v1 data dir keeps the island, the profiles and the exam results,
   and adopts the new policy (seed the old version's leavings in the drive).
9. Nothing on the wire leaves the loopback: the drive's network log shows no host but 127.0.0.1.

## 4. How to build it

- Read `../phase-78-the-templates/TPL-011-DESKTOP-THE-JOURNAL-ON-WINDOWS.md` (untracked, on this Mac) and
  the P78 NEXT-SESSION-PROMPT s7 recipe for building the installer on macOS without CI.
- node-llama-cpp's Electron guide: main process only, prebuilt binaries per platform, its CI workflow
  as the template for ours.
- The prompt template table and the word lists are data files the exam and the game share.
- Keep the system prompt short; prompt processing is the slow part on the tablet.

## 5. Gates

`garden-desktop/shell/tests/` (AC1, AC3–AC7), `garden-desktop/tests/olive-contract.mjs` (AC2), the
upgrade drive (AC8), the network log clause in CG-008's installed-app drive (AC9).

## 6. Traps

Ollama cannot load this model (0.13.5 → 412) and is not used; the `Qwen` chat wrapper leaks `</think>`
and the Jinja wrapper returns "" — raw ChatML only; a packaged backend installs its policy only into a
folder with none; an empty endpoint is no backend; `build:editor:_viewer` rewrites a peer's `external/`
— build the prod engine into a scratch `OUT_PATH`.

## 7. Session 1 — what was built (lane C, 2026-09-27)

**Built:** `garden-desktop/` beside this file — the Nightbook shell forked and parameterised by `shell/garden.json`
(id `garden`, "Bot Garden", port **47633**, data dir `island`, doors `/__garden/` + header `x-garden`, the backup
cron, the model's file/URL/sha256), the owl sidecar `shell/owl.js`, the prompt table `shell/olive-templates.json`
(15 entries: the twelve rungs, two each for rungs 2 and 8, plus `voice-hint`), the checks `shell/olive-check.js`, the
doors `shell/olive-route.js`, the exam `shell/exam.js` (23 probes trimmed from the battery), `shell/model-check.js`,
`shell/timings.js`, `fetch-model.mjs`, `build-app.js`, `drive-lib.js` (+ `watchNetwork`), `drive-upgrade.js`,
`tests/olive-contract.mjs`, `licenses/`, `README.md`, and `.github/workflows/garden-desktop.yml`. `grep -a -i nightbook`
over `main.js`, `relay.js`, `package.json`: **0 lines** outside a "forked from" comment (asserted by `config.test.js`).
The model is NOT in the repo (`shell/.gitignore`: `node_modules/ build-output/ dist/ model/`); `fetch-model.mjs --from`
hard-linked the local copy and verified **sha256 bd258782e35f7f45… , 532,517,120 bytes** (478 ms). The pinned URL
answers 200 (HEAD, 2026-09-27).

### The ACs

| AC | Status | Instrument and reading |
|---|---|---|
| 1 shell unit tests | ✅ measured | `cd garden-desktop/shell && node --test tests/*.test.js` → **59/59** (Nightbook's 23 + 36 new: config, checks, owl with a fake engine, route, model check, exam). Slot refusals named `not-in-list` / `too-long` (41st char) / `control-char` / `regex` / `blocklist` / `missing-slot` / `unknown-slot`; outputs `blocklist` / `must-contain` / `cap` / `grammar`; two concurrent POSTs served in order (`calls[1].start >= calls[0].end`); the timeout → `{ok:false, fallback:true, reason:'timeout'}` (default **12 000 ms**, `DEFAULTS.timeoutMs`). |
| 2 contract test, real model | 🟡 measured, 19/20 per run | `node garden-desktop/tests/olive-contract.mjs [--cpu]`, plain node, the exam through the route. **Metal: 19/20** asserted probes as the ladder says (2 runs with majority sampling; the single-sample run before it was 20/20); **CPU 2 threads: 19/20** (last run; 18/20 the run before). Every 🎓 probe is recorded as failing in every Metal run; the reds move between P02, P05, P07, P18 (table below). Linux runner: prepared in the workflow, not run. |
| 3 status < 1 s during a completion | ✅ measured | inside the contract test: a 64-token poem in flight, `GET /__garden/olive/status` → **2 ms** (Metal), **2 ms** (CPU); the poem itself 422–742 ms. Unit test: 400 ms fake completion, status < 1000 ms, `busy:1 queued:1`. |
| 4 no model | ✅ measured (node) · ✅ Electron s2 (§7.2) | `owl.test.js`, `olive-route.test.js`: a missing path → `status.model = 'none'`, every ask `{ok:false, fallback:true, reason:'no-model'}` in < 50 ms. In Electron: `drive-laneC.sh` step 5 (the model folder moved away), predicted readout in `$SCRATCH/EXPECTED-DRIVE.md`. |
| 5 asarUnpack / Metal / Windows CPU | ✅ Mac packaged s2 (§7.2) · ⬜ Windows (CG-008) | `package.json` `build.asarUnpack`: `node-llama-cpp/bins/**`, `@node-llama-cpp/**` (asserted by `config.test.js`); the Mac loads with **Metal** (`gpu: metal`, contract test) and CPU-only with `--cpu` (`gpu: cpu`, threads 2). Packaging not run in the lane; **Windows x64 is unmeasurable on this Mac** — the workflow's Windows job runs `npm ci` there (`@node-llama-cpp/win-x64`), checks `app.asar.unpacked/…/win-x64/bins` and drives the installed app. |
| 6 sha256 at build and first launch | ✅ measured | build: `fetch-model.mjs --from <18-byte file>` → "DOES NOT MATCH … refusing the model", exit **1**, nothing left in the folder; launch: `model-check.test.js` 3/3 (match remembered on size+mtime, mismatch → `sha256-mismatch`, a changed file re-hashed); `main.js` builds a **refused** owl on a mismatch and `status.model = 'refused'` with the reason for the Grown-ups page (`owl.test.js`). |
| 7 timings.log | ✅ measured | contract test: `{"model-load":1, "olive":50, "exam-probe":23}` lines, each with `ms`; `olive-route.test.js` asserts the three kinds after a fake run. |
| 8 upgrade | ✅ measured s2, PASS (§7.2) | `garden-desktop/drive-upgrade.js` (three launches: 0.0.1 with policy A → 0.0.2 with policy B → fresh control; `GARDEN_VERSION`, `GARDEN_POLICY_DIR` overrides in `main.js`); predicted readout in `EXPECTED-DRIVE.md`. Two steps are `STEP-NEEDS-CG-003` (a profile written and read back). |
| 9 loopback only | ✅ measured s2: 150 requests, all 127.0.0.1 (§7.2) | `drive-lib.js` `watchNetwork` (CDP `Network.enable`, armed right after launch) → `hosts` / `offLoopback`; `drive-upgrade.js` fails on any host but 127.0.0.1. |

**Arms: 10/10 killed** (`$SCRATCH/mut-summary.txt`): a slot over 40 chars accepted, a control char accepted, the
blocklist skipped, must-contain skipped, the queue running two at once, the timeout never firing, the sha check
skipped, a prompt composed from renderer text, the POST header check skipped, a 🎓 probe graded like a ✅ one — each
killed by the named shell test, restored, suite 59/59 after.

### The numbers

| reading | Metal (M-series Mac) | CPU, 2 threads (the tablet's path) |
|---|---|---|
| model load (`getLlama` + `loadModel` + context) | **1955–1993 ms** (first ever load 6833 ms: the Metal shader cache) | **1834–1873 ms** (one run 4878 ms) |
| sha256 of the 532 MB file | 400–478 ms | — |
| per probe, single sample | 163–2337 ms, mean ≈ 830 | 259–3338 ms, mean ≈ 1050 |
| per probe, majority of 3 (the shipped exam) | 372–2735 ms, mean 1517; exam **33 s** | 569–4348 ms, mean 1906; exam **43 s** |
| status during a completion | 2–3 ms | 2 ms |
| a 64-token poem | 422–743 ms | 654–766 ms |

The tablet is expected at 4–6× the CPU column (briefing §C2): a first-launch exam of ~3–4 minutes in the background.

### The exam, per rung (last Metal run; CPU differs where marked)

| rung | ladder | Metal | CPU | what she said |
|---|---|---|---|---|
| say-thanks (1) | ✅ | FR pass; **EN must-contain ×2** | pass | FR "Merci Mamie Rose, tes tulipes…"; EN sometimes has no "thank"/"grateful" |
| name-one / name-three (2) | ✅ | pass | pass (one CPU run: 1 distinct at 1.2) | temp 0 → "Pipette" ×3 every run; 1.2 → three names |
| words-to-blocks (3) | ✅ | pass | pass (one CPU run: D2 → `droite` 2/3) | D1/D2/D4 exact on Metal in every run |
| count-in-words (4) | 🎓 | pass | pass | "Avance de trois cases." → `["avancer"]` or `[]`, every run |
| what-wants (5) | ✅ | pass | pass | `croquettes`, `lettre` — with the key `objet` (with `reponse`: 0/2) |
| is-it-a (6) | ✅ | pass | pass | rose→oui, chat→non, every run |
| count-tulips (7) | 🎓 | pass | pass | 4 tulips → 5, 6, 7 |
| maths-seeds / maths (8) | ✅ / 🎓 | pass | pass | 2+3 → 5 (story phrasing; "2 + 3 = ?" gave 2 once); 14+9 → 14 every run |
| under-five-words (9) | 🎓 recorded | **obeys** | **obeys** | "Merci, Pip." — B5 does NOT reproduce (0/3 obeyed in the battery, 6/6 runs obeyed here) |
| tall-tales (10) | 🎓 | pass | **held the fence 2/3 once** | "Canberra n'existe pas", "Sydney" — but sometimes "je ne connais que le jardin" |
| translate (11) | ✅ | pass | pass | FR→EN exact every run; EN→FR "en honte"/"vif" every run |
| poem (12) | ✅ | pass | pass | two lines (one single-sample run gave one) |
| voice-hint | ✅ recorded | met | met | mostly repeats the written line verbatim |

**Findings for the content (owner: CG-006, and Richard for the ladder):** (a) **rung 9 as written does not hold** —
"under 5 words" is obeyed 6 runs out of 6 today; the exam gate withholds it, but the lesson needs a rule she does fail
(the battery's G1 "no letter e" / G2 "never mention water" failed 3/3 and are candidates). (b) On the **CPU path** the
D2 route ("…et arrose la tulipe") ends in `droite` 1–2 times in 3, and the fence (H1) holds 1 run in 3: rung 3's route
list and rung 10's questions should be chosen on CPU readings, not Metal's. (c) The EN thank-you needs a must-contain
she meets: her English answers thank without the word (widen to a list, or drop must-contain for EN). (d) The JSON key is
part of the prompt: `objet` works where `reponse` did not (`olive-check.js` `KEYS`). (e) The model sometimes emits a
literal `</think>` in prose even with the block prefilled — stripped in `tidy`.

### Residuals

- AC2 as a CI gate: 19/20 per run with the reds moving; the workflow runs the contract test once more on a red (the
  repo's own rule). Owner: NONE (the numbers are the numbers); the content fixes above shrink it.
- AC5 Windows, AC8, AC9, AC4-in-Electron: prepared, not run — `$SCRATCH/drive-laneC.sh` on the primary checkout after the
  cherry-pick; the Windows job waits for `templates/bot-garden` (CG-003). Owner: orchestrator / CG-008.
- `shell/package-lock.json` was generated with `--package-lock-only` against the registry; `npm ci` in CI is its first
  real install. Owner: CG-008.
- CG-005 §4 names the rung table `garden-desktop/shell/olive/rungs.json`; it is `shell/olive-templates.json` here (the
  lane prompt's name). One of the two sentences moves. Owner: orchestrator.
- The exam's first-launch cost on the tablet (est. 3–4 min, background) is unmeasured. Owner: CG-008.

### Where a merge could touch

Nothing in a workspace package. New files only: `garden-desktop/**` (this folder), `.github/workflows/garden-desktop.yml`,
this section. The root `package-lock.json` is untouched (0 lines of diff).

### 7.1 The orchestrator's drive runs (2026-09-27, 20:35–21:25, on `cline-dev` after the cherry-pick)

`drive-laneC.sh` steps 1–3 as predicted: `fetch-model --from` hard-linked the local GGUF, **sha256 MATCHES (432 ms)**;
`build-app.js --project templates/todo-list` → `{"ok":true}`, the origin `http://127.0.0.1:47633` baked in; `node --test`
**59/59**.

**Step 4, the upgrade drive — three instrument faults found and fixed in `drive-upgrade.js` / `drive-lib.js`:**
1. The seeded policy A carried a private top-level key `_driveMarker`; the real backend refuses it (`FATAL … unknown
   top-level key "_driveMarker"`, exit 1), the shell showed its "couldn't open" box, and the window never served the origin:
   0 launches. The marker is now a LEGAL collection (`collections.DriveMarkerV1`, a copy of `Task`).
2. `launch()` now waits for the relay port and the CDP port to be free before spawning, and `quit()` waits for every
   process of the shell's Electron binary to be gone (SIGKILL after 10 s) — a launcher can exit before its app.
3. Both were necessary; neither was the blocker below.

**What the drive then MEASURED (run at 19:03 UTC+2 local 21:03, home A, the model on Metal):** launch 1 → page drawn,
`status.model = ready`, the exam ran on first launch, **15 rungs**, `examAt` set; disk after 0.0.1: `database`,
`policyInstalled` (A), `backupPolicy`, `examKept` all **true**, `backendsLeftRunning []`; launch 2 (0.0.2, policy B) →
`examKept` **true** (same `at`); disk after 0.0.2: `policyIsB` **true**, `oldPolicyKeptAs = ["security.before-0.0.2-…json"]`,
`oldPolicyIsA` **true**, `launchLines = [["0.0.1","first"],["0.0.2","replaced"]]`, `backendsLeftRunning []`; the wire so far:
`hosts = {"127.0.0.1": 141}` and nothing else. **AC8's substance (the island, the policy adoption, the exam survive an
upgrade) is measured; AC9's clause held for launches 1–2.** The report is `scratchpad/cg004-drive/drive-upgrade.json`
of session 1's orchestrator.

**The blocker — measured, not inferred:** from ~21:04 local every Electron launch of this bundle, the shell and a
three-line minimal `main.js` alike, logged `will-finish-launching` and never `ready` (no window, CDP bound, 0 % CPU);
`screencapture` showed the wallpaper with no menu bar, and
`ioreg -n Root -d1 -a | grep -A1 CGSSessionScreenIsLocked` read **`<true/>`**. **A GUI Electron app does not reach
`ready` while the macOS session is locked.** Headless Chrome (the CG-001 drive) is unaffected. Six trials varied
polling delay, `detached`, and stdio; none mattered. So launch 3 (the fresh-home control: `examAtDiffers`,
`noOldPolicy`), step 5 (AC4 in Electron, no model) and step 6 (AC5 packaging) are **owed to the next session with the
screen unlocked** — run `zsh <scratch>/laneC/drive-laneC.sh` steps 4–6, or `node garden-desktop/drive-upgrade.js`
directly; check the lock state first.

Residual for the drive, owner CG-008: `quit()` returns `code: 1` from `Browser.close` every time — the launcher's exit
code, not the app's; the installed-app drive should read the app's own exit.

### 7.2 Session 2 — the control launch, AC4 in Electron, the packaged Mac app (orchestrator, 2026-09-27 22:16 → 2026-09-28 07:14)

**The locked screen was not the blocker.** With the screen UNLOCKED (`IOConsoleLocked = No`) launch 3 hung twice in a row,
exactly as in §7.1: CDP bound, the relay port not bound, no log, no data folder. `/usr/bin/sample` of the main process:
`-[NSApplication _handleAEOpenEvent:]` → `NSPersistentUIRestorer promptToIgnorePersistentStateWithCrashHistory` →
`NSAlert runModal` — AppKit's "reopen windows?" alert, shown BEFORE `applicationDidFinishLaunching`, so Electron never
emits `ready`. The drive ends launches 1 and 2 with `Browser.close` (the launcher exits 1); macOS counts two unexpected
quits of the dev binary's shared bundle id `com.github.Electron` and prompts on the third. Six fresh-home launches ended by
SIGTERM opened in 1 s each (so a fresh home is not the cause). **Fix, in the instrument:** `drive-lib.js` passes
`-ApplePersistenceIgnoreState YES` on darwin. The screenshot of the hang is a dimmed wallpaper with no menu bar — the
picture §7.1 read as a lock.

**AC8 + AC9 — `drive-upgrade.js`, PASS, exit 0** (`scratchpad/cg004-drive/run3/drive-upgrade.json` of session 2):
launch 1 drawn at 1449 ms, `model: ready`, 15 exam rungs; disk after 0.0.1 all true, no backend left; launch 2
`examKept: true`; disk after 0.0.2 `policyIsB`, `oldPolicyKeptAs: [security.before-0.0.2-…json]`, `oldPolicyIsA`,
`launchLines [[0.0.1, first], [0.0.2, replaced]]`; **launch 3 (the fresh-home control) `examAtDiffers: true`,
`noOldPolicy: true`**, quit code 0; `hosts {"127.0.0.1": 150}`, `offLoopback []`, `backendsLeftRunning []`. The two
`STEP-NEEDS-CG-003` clauses (a profile kept across the upgrade) still wait for the pages.

**AC4 in Electron:** `drive-upgrade.js` with `build-output/model` moved away drew the page at 996 ms with `status.model =
"none"` and the reason ("no model file at …"), then stopped — the drive waits for exam results, and with no model no
exam runs (§7.1's prediction "every reply a fallback" was the instrument's guess, not the product's rule). Graded directly
instead: the dev shell with `GARDEN_MODEL_PATH=/nonexistent.gguf`, three `POST /__garden/olive` → `{"ok":false,
"fallback":true,"reason":"no-model"}` in **0.8–1.6 ms** each; without the `x-garden` header → **403**; the page → 200.
Owner of the drive's no-model branch (skip the exam wait when `model` is `none`): CG-008.

**AC5 on the Mac — a packaging defect found and fixed.** `npm run dist:mac` first failed inside electron-builder
(`Yallist is not a constructor`): the primary checkout's `shell/node_modules` had been MOVED from session 1's worktree and
lost 22 of its 87 nested packages (`node_modules/.package-lock.json` still listed them). `npm ci` in `shell/`: **380
packages in 9 s, exit 0, neither lockfile changed** — the first real install of the `--package-lock-only` lockfile
(§7 residual) is clean. `dist:mac` then built `dist/mac-arm64/Bot Garden.app` (835 MB, unsigned), and the packaged app
**could not load the model**: `owl: load failed: ENOENT, node_modules/node-llama-cpp/llama/binariesGithubRelease.json
not found in …/app.asar`, status `failed`, every ask `reason: load-failed`. Cause: `build.files` excluded
`node_modules/node-llama-cpp/llama/**`; node-llama-cpp reads three small JSON files there at run time. Fix: exclude only
`llama/gitRelease.bundle` (the 34 MB source bundle). Gate: `config.test.js` "no build.files exclusion drops a file
node-llama-cpp reads at run time" — the old line restored → 1 failure naming `binariesGithubRelease.json`; suite **60/60**.
Re-packaged and launched (`GARDEN_HOME` throwaway): sha256 matches (1249 ms), **`owl: loaded in 21942 ms on metal`** (the
first launch of a new bundle builds its Metal shader cache; §7's dev reading was 6.8 s on its first ever load), `gpu:
metal`, `app.asar.unpacked/node_modules/@node-llama-cpp/mac-arm64-metal/bins/mac-arm64-metal` present; `say-thanks` EN in
747 ms, FR "Merci Mamie Rose, c'est un grand plaisir !" in 1106 ms. A slot from the other language's list is refused
`not-in-list` before the model is asked. Windows x64: CG-008.

**Traps paid for here (in memory):** `/opt/homebrew/bin/sample` is a broken shim — `/usr/bin/sample`; this shell's
environment carries `ELECTRON_RUN_AS_NODE=1`, so a packaged binary launched from it runs as Node (`bad option:
-ApplePersistenceIgnoreState`) — `env -u ELECTRON_RUN_AS_NODE`; `pgrep -f <absolute path>` misses an Electron started by
a relative path and matches the backend (the same binary in Node mode); a hung main ignores SIGTERM; `curl` to a hung
app's CDP port never returns without `-m`.


## 8. Session 3 — what was built (lane DESKTOP, 2026-09-28)

Base `83888c07d`; shell suite **69/69** at base, **75/75** after. Commits `92d268961` (the name, the pin), `55fd6db92` (build-app, the drive), `e6ce41dea`
(CG-008's workflow). Nothing here was launched: every Electron run is PREPARED, with commands and readouts in the lane's
`EXPECTED-DRIVE.md` (orchestrator, serially, on the primary).

| # | Deliverable / ruling | Status | Reading |
|---|---|---|---|
| 1 | **The name (ruling 7)** — "Olive's Island" / "L'île d'Olive" wherever a person sees it | ✅ measured (unit + electron-builder's own functions) · 🟡 the packaged bundle's name | `garden.json` `name`, `nameFr`; `package.json` `productName` + `build.productName`; the window title pinned by `fit.js windowTitle` (the exported page's `<title>` passes only if it is one of the two names — the template's `htmlTitle` still says "Bot Garden"); the dialogs' French halves say `nameFr`; the backups folder "Olive's Island backups" (an existing install keeps the folder its `backups.json` names); NOTICE + README headings. Kept: package `name` `garden-desktop`, `appId` `io.digitalbricks.garden`, `garden`, `/__garden/`, `island`. `config.test.js` + `fit.test.js`. |
| 1a | **Where her saves live** | ✅ measured (fake-Electron load of `main.js`) | The island is NOT in the backend: the template keeps the family in the page's localStorage (key `bot-garden`), which Chromium writes under `sessionData` → `userData` → `<appData>/<app name>`. A rename would have opened an EMPTY island. `main.js pinUserData()` sets `userData` AND `sessionData` to `<appData>/` + `garden.json userDataDirName` = **"Bot Garden"** before anything reads them (the single-instance lock reads userData). Test: `main.js` required with `electron` intercepted — `final('userData') = final('sessionData') = <appData>/Bot Garden`, set before the first read and before the lock, no `Olive's Island` folder made; with `GARDEN_HOME` all three paths under the home. Also: `before-quit` now calls `session.defaultSession.flushStorageData()` (her last move committed before the app goes; graded by the drive's launch-2 storage clause). |
| 1b | **The apostrophe in file names** | ✅ measured (read + `node -e` on app-builder-lib 26.15.3) | `sanitizeFileName("Olive's Island")` keeps the `'`; the oneClick per-user install folder is `getWindowsInstallationDirName → garden-desktop` (the product name is tried only for assisted/per-machine installs, and its regex `^[-_+0-9a-zA-Z .]+$` would refuse the `'` anyway); the NSIS `-D` defines escape only `$` and `"`; every NSIS use of `APP_EXECUTABLE_FILENAME` sits in a backtick or double-quoted string; the exe's `FileDescription` (Task Manager) = productName. **Chose:** the exe and the Mac bundle keep the product name (`Olive's Island.exe`, `Olive's Island.app`); only the installer FILE drops it: `artifactName OlivesIsland-Setup-${version}.${ext}` (typed, linked, globbed). No `executableName`. The workflow reads the name from `package.json` (no PowerShell single-quoted literal left to double). |
| 2 | **`build-app.js` builds the real template** | ✅ measured (probe) · 🟡 the build itself | `--project` defaults to `templates/bot-garden` of the checkout the script sits in (primary when run there). The template ships **no `nodegx.security.json`** (measured: `ls templates/bot-garden`), which made the old script fail `missing policy`: now the shell's `CLOSED_POLICY` is shipped (every rule `nobody`, `devOpen false`; nodegx-backend's own `validateSecurityConfig` → **0 errors**, a control with an unknown key refused; without any policy the backend would mint `devOpen: true` + `signup: public`). The staged copy's `htmlTitle` = the game's name. The deploy's JSON verdict is READ (it exits 0 on a refusal — the old `execFileSync` believed the exit code). Probe in the lane (no deploy engine in the worktree): no args → passes the project check, stops at `missing deploy engine`, exit 1; `--project templates/nope` → `missing project`; bare `--project` → refused. |
| 3 | **AC8's two `STEP-NEEDS-CG-003` clauses** | 🟡 prepared, drive pending | `drive-upgrade.js`: launch 1 → Profiles → New player "Ada", robot box (default Pip) → "Robo" → Let's go → `/island` → storage holds Ada/Robo → My robot → rename to "Bolt" (ruling 7's rename, verified not rebuilt) → storage holds Ada/Bolt; launch 2 (0.0.2) → storage still Ada/Bolt → her `.bg-profile` card shows Ada and Bolt → chosen → My robot's box says Bolt; launch 3 (fresh home) has no Ada. The storage walk accepts `robot.name` or `robotName` at any depth of any `bot-garden` key — ruling 8's save-version bump cannot break it, and no island field is read. The in-page expressions compile; the walk run in a `vm` on both save shapes returns Ada/Bolt; the words come from the template's own table in EN and FR. |
| 4 | **No model → no exam wait** (AC4 in Electron) | 🟡 prepared | The drive waits for the owl to SETTLE (past `unloaded`/`loading`); `ready` → the exam wait as before (bound now `GARDEN_EXAM_WAIT_MS`, default 10 min); `none` → one `POST /__garden/olive` (a sample built from the table: the first rung whose slots are all lists, `say-thanks` today, passes the real slot check) must answer `{ok:false, fallback:true, reason:'no-model'}`; exam clauses become "still none". |

**Arms: 9/9 killed** (`$SCRATCH/arms.out`, each file copied first, restored by `cp`, suite 75/75 after): the pin removed;
userData pinned without sessionData; the pinned folder renamed to the new name; the page title passed through; the closed
policy opened (`devOpen: true`); an apostrophe in the installer's name; the package renamed (would move the install
folder); productName reverted; the French dialog naming the English game.

**Findings (new):**
- 🔴 **The nightly backups hold nothing of the game.** The backend's copy is of its own database; the family (every
  profile, robot, request done) is in Chromium's localStorage under `userData`, which no backup reads. A parent sees an
  "Olive's Island backups" folder in Documents that cannot bring a garden back; the save code on Grown-ups is the only
  copy. **For Richard** (a new ruling): either the shell copies the Local Storage folder (or the page hands the save to
  the shell's copy door), or the backups folder and cron go. Until then it is honest to say nothing about backups.
- The primary's `shell/node_modules/electron/dist` is ABSENT (the Electron binary was never downloaded there, or was
  lost when the folder moved, §7.2): `drive-upgrade.js` without `--exe` cannot start. The prepared drives use the
  packaged Mac app. Owner: orchestrator (`node node_modules/electron/install.js` in `shell/` if the dev path is wanted).
- The template still says "Bot Garden" in `settings.htmlTitle` and the `brand` word (EN and FR). The shell covers the
  window title; the page's own words are lane LOOK's / the orchestrator's (`templates/`, `cg003*.ts`).

**Residuals:** the three drives of `EXPECTED-DRIVE.md` (model, no model, packaged name) — owner orchestrator; whether
Electron creates an empty `<appData>/Olive's Island` folder before `main.js` runs (harmless, unmeasured) — owner CG-008's
tablet run; the backups ruling above — Richard.

### 8.1 Backups of the real save (lane BACKUP, 2026-09-28, Richard's ruling R14)

**R14, as asked:** "The desktop app makes a nightly 'Olive's Island backups' folder in Documents, but it copies the wrong
thing … What should the app do?" → **"Back up the real save"**: each night the app writes the family's save (the same
thing the save code holds) into the backups folder, and a parent can restore it. Small, on this computer only.

Base `b16751f28`; shell suite **80/80** at base, **89/89** after (`node --test tests/*.test.js`).

**Re-measured first** (the finding above was a claim until then):
- **Where the family lives:** the runtime's persisted Global store writes `localStorage[ 'noodl_store_' + storageKey ]`
  (`packages/noodl-runtime/…/agent/globalstore.ts` `STORAGE_KEY_PREFIX`, `persistNow`), the template's App store
  persists under `STORAGE_KEY = 'bot-garden'` (`cg003Components.ts`) and writes the one key `model` → the entry is
  **`noodl_store_bot-garden`** = `{"model":{v:3,family,profiles,island}}`. The packaged build (`build-output/app`, project
  `templates/bot-garden`) carries `noodl_store_`. (§8's "key `bot-garden`" is the storage key without the runtime's prefix.)
- **What the SQLite copy held:** a drive home's `local.db` (after launch 1 of s3's drive): 11 tables, `_Schema` 9 rows,
  **every other table 0 rows** (`_User`, `_Session`, `_Role`, `_Files`, `_Audit`, …); the backups folder of that home was
  empty (19:00 never came during a drive). BUILD.json: `policySource: shell-closed`, `workflows: []`. It held nothing a
  family needs.
- **🔴 The save code is one-way.** The Grown-ups page SHOWS the code (`Grown/House panel`: `ghEncode` → `ghCode`) but no
  page places `Logic/Decode save code` and no input takes a code (`saveCodePaste` / `saveCodeBad` are words nothing
  uses; grep of `cg003Components.ts` and `templates/bot-garden`). "The save code on the Grown-ups page is the only real
  copy" was true, and nothing could bring it back. So the restore could not be "paste the code into Grown-ups".

**Decisions:**
1. **What a backup holds — both, one file:** `island-backup-YYYY-MM-DD.json` = `{ kind: "olive-island-backup", v: 1, at,
   players, saveCode, store }`. `store` is the stored JSON itself, and it is what a restore writes back: the page runs
   the save-model migration on every load (`Read family` → `migrated` → re-save, CG-002 §8), so a backup made today
   restores after a save-model change by the SAME path every upgrade already has to keep working (AC8) — no second
   decoder to keep in step. `saveCode` is the Grown-ups code for the same family (so a parent who copies codes, or a
   future paste box, has it), packed by the shell (`copies.js saveCodeOf`, v3 only; any other version → `null`, never a
   guess) and **byte-identical to the page's own encoder**: `copies.test.js` runs the TEMPLATE's `Logic/Encode save code`
   and `Logic/Decode save code` scripts in a vm against it, on a family the template's own `Add profile` / `Complete
   request` made plus the edges the page normalises (7 players → 6, 30-char names, a string band, no tricks, a repeated
   request).
2. **The read:** `webContents.executeJavaScript(readExpression('bot-garden'))` — one constant built from garden.json's
   key at load, `(() => { try { return window.localStorage.getItem("noodl_store_bot-garden"); } catch (e) { return null; } })()`:
   it reads one key, writes nothing, never throws. Never built from page data (the test feeds two different families and
   records the same single string both times).
3. **When:** after the page loads if the day has no backup yet (the old policy's "run once on start" for a missed
   evening; 2 s after load, past the page's own on-load re-save), every day at `backups.dailyAt` 19:00 while open, and
   **at quit** — the window's `close` and the app's `before-quit` both pass through `createLeaving`, which holds the
   first one, runs one backup, and lets the quit/close go when it settles or after **3 s**. A later run the same day
   replaces the day's file. **A family with no players writes nothing** (not even the folder). Retention: the newest
   **31 days** (`keepDays`); a restore's safety copy counts in its day; no other file in the folder is ever touched (an
   old build's `.ngxbackup.tar.gz` stays). A `README.txt` (EN + FR) says what the files are and how to restore.
4. **The restore — the shell's menu, one item** (the fewest new surfaces, given no paste box exists): "Restore a backup…
   / Restaurer une sauvegarde…" (Mac: in the app menu beside Quit; Windows: the window's one
   menu, `autoHideMenuBar`, shown by Alt — out of the children's way). A file picker opens on the backups folder; a file
   that is not a backup (`kind`), or a backup of nobody, is refused before anything is touched; a confirm dialog names
   the day and the players (Cancel is the default); then the family now is kept as
   `island-backup-<today>-before-restore.json`, the store is written back
   (`restoreExpression`: the shell's re-serialisation passed as a JSON string literal — a name made of code stays a name,
   tested with `"); globalThis.pwned = 1; (" </script>`), the page reloads, and the players are read back: the
   dialog says "The islands are back." with the names, or that it could not (with the log's path). No page door
   restores: a page that could restore could be made to.
5. **The backend's SQLite backup — stopped.** `main.js` no longer seeds `backups.json` (the backend then has no schedule,
   `BackupConfigStore.defaults().schedule = null`); one an older build seeded is switched off in place
   (`schedule.enabled = false`, everything else kept, logged once). The relay's POST `copy` / `restore` doors (which ran
   the backend CLI) are gone with it — no page ever called them; `GET /__garden/copies` stays, read-only, listing the
   island backups (Olive's route test still reads it). `runBackendCli`, `restoreCopy`, the `restarting` flag: removed.

| # | Deliverable | Status | Reading |
|---|---|---|---|
| 1 | Re-measure; the decision written | ✅ | above; `$SCRATCH/MEASURED.md` |
| 2 | The copy: fixed read, dated file, schedule + quit, nothing for no players, local only | ✅ unit · 🟡 drive | `copies.test.js`: a family → `island-backup-2026-09-28.json` whose `store` deep-equals the stored JSON, `players` [Ada, Béa ✿], `saveCode` `BG1.…`, README EN+FR; the evaluated expressions `=== [READ]` for two families; no players / no entry / not JSON / no model / no window → `wrote: null` with the reason, the folder empty; runIfNoneToday reads the page once a day; the evening timer 18:00 → +1 h, 20:30 → next day 19:00; `createLeaving`: one backup for a quit and a close together, then everything passes; a hung backup given up at the bound. `config.test.js` (fake Electron): `backupsFolder()` = `<documents>/Olive's Island backups`, and under `GARDEN_HOME` `<home>/Documents/…`; before a window, `run` → `no-window`, no folder. The quit wiring in `main.js` (the `close` / `before-quit` holds) is graded by the drive clause only. |
| 3 | The restore a parent can do | ✅ unit (core) · ⬜ the native dialogs (a person's 2-minute check, `EXPECTED-DRIVE.md`) | `copies.test.js`: a vm page holding a later family → restore → safety copy holds the later family, storage holds the day's JSON exactly, one reload, the players read back; hostile name stays data; not-a-backup / empty refused; the menu template (Mac: item, separator, quit; Windows: the item) and its click. |
| 4 | The SQLite backup decided | ✅ measured + unit | 0 rows measured; `retireBackendBackups`: none → nothing written; seeded → `enabled: false`, the rest deep-equal; again → `already`; `main.js` code has no `backups.json` / cron / backend CLI backup (config test). |
| 5 | Unit tests, arms | ✅ **89/89**, arms **14/14** | `$SCRATCH/arms.out`, each file copied to `$SCRATCH/arms/` first and restored by copy, 89/89 after: the read also writes; the expression varies per call; a no-player family written; retention 30; a string band packed as 2; seven players packed; the store embedded as code; no safety copy before a restore; the quit waits forever; the SQLite schedule left on; the POST copy door still answering; backups under userData; the storage key drifting from the page; main.js seeding backups.json again. |
| 6 | The drive clause | 🟡 prepared | `drive-upgrade.js`: `disk1.noBackendBackup`, `disk1.island` (the files in `<home A>/Documents/Olive's Island backups`, each read as stored AND decoded by the template's own decoder), clause `islandBackup` = exactly one day file + README + both readings hold Ada with Bolt; the control (home B) now also needs `noBackup`. Run on synthetic homes by `$SCRATCH/probe-drive-clause.js` (the drive's own functions, no launch): a copies.js-written Ada/Bolt → `holds Ada/Bolt: true`, Ada/Robo `false`; a fresh home → `files: []`. Command + readout: `$SCRATCH/EXPECTED-DRIVE.md` (re-package `npm run dist:mac` first — a shell change). |

**Findings (new):**
- 🔴 **Grown-ups has no way to take a save code back** (above). Owner: the pages (CG-003 / the orchestrator) — a paste
  box wired to `Logic/Decode save code` → the App store's write, using the existing `saveCodePaste` / `saveCodeBad`
  words. Until then the backup's `saveCode` is for moving by hand only in the sense that nothing can read it back in-app.
- On a Mac the shell had NO menu (`setApplicationMenu(null)`), which on macOS leaves no Quit item for Cmd+Q (Electron's
  documented behaviour, not measured here); the new menu carries `role: quit`. There is still no Edit menu, so Cmd+C /
  Cmd+V in the page's text boxes are expected not to work on a Mac (unmeasured; Windows is unaffected). Owner: NONE for
  the tablet (Windows); CG-008 if the Mac build is shipped to a family.

**Residuals:** the drive (orchestrator, `EXPECTED-DRIVE.md`); the restore dialogs in the packaged app, a person's check
(Richard or the orchestrator); whether the drive's `Browser.close` passes through `before-quit` (inferred from s2's logs,
graded by the clause — if it does not, the instrument's quit changes, `EXPECTED-DRIVE.md` says how).

**Where a merge could touch:** `garden.json` `backups` changed shape (`cron` / `retention` → `dailyAt` / `keepDays` /
`storageKey`); `copies.js` exports changed (`createShellDoors` takes `{ folder }` only; `listCopies` lists island
backups; `isCopyName`, `ARCHIVE_EXT` gone); `tests/helpers.js` `withRelay` and `loadMainWithFakeElectron` (returns
`exports`); `main.js` exports `{ islandBackups, backupsFolder }`. Nothing outside `garden-desktop/` but this file; the
sibling lane (HOOKS) edits only the pages — but the pages' STORAGE_KEY and App store (`persist: true, storageKey`) are
now a contract `copies.test.js` reads from `cg003Components.ts`.
