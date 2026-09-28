# CG-008 — The installer and the tablet: one file, and the numbers from the real machine

**Opened 2026-09-27.** **Status: 🟡 session 4 (2026-09-28) — the workflow RUN on windows-latest (Richard said push): the installer builds, installs as "Olive's Island", carries the icon; the installed app opens with the model loaded on CPU, and its first-launch exam does not finish in 15 min (Olive's calls hit the 12 s limit there) — §9. Was: 🟡 prepared s3, ⬜ before.** Depends on CG-003, CG-005, CG-007. Lane C.

## 1. The person sentence

> **A grown-up downloads one installer, runs it, and the garden opens offline on the family tablet with
> the owl awake — and we know, in numbers from that tablet, how long she takes.**

## 2. What it is

- `.github/workflows/garden-desktop.yml` (the Nightbook workflow as the template): build the prod deploy
  engine, export the template with the origin baked in, fetch the model by sha256 (cached), build the
  NSIS installer on `windows-latest`, install it silently, drive the installed app, upload the installer
  and the readouts.
- The installed-app drive: profile → island → tulip request → teach → fold → play → win → My robot →
  Grown-ups shows the model loaded → Try Olive returns a value → the exam's results are listed; the
  network log shows only 127.0.0.1.
- The tablet run (Richard installs): `timings.log` read back — model load ms, each exam probe's ms, the
  three shapes' ms, the world's repaint ms at 12×8 — into this file. This is the first real
  measurement of the tablet; every estimate in TPL-012 (2–8 s a call) is replaced by it.
- The local macOS build recipe (P78 NEXT-SESSION-PROMPT s7) kept working for a build without CI, with
  the note that it skips the installed-app drive.

## 3. Acceptance criteria

1. CI green on `windows-latest`: installer built, installed, driven; the artefacts uploaded.
2. The installer carries the model, the licences, the policy and the workflows; its size is written here.
3. The installed app runs with no network (the runner's drive blocks egress and passes).
4. The tablet's numbers are in this file, dated, with the model's ms per shape and the exam's pass/fail
   per rung on that machine.
5. If the tablet's exam withholds a rung, CG-006's request for it shows "Olive can't do this here yet"
   and the rest of the ladder plays.
6. An upgrade over a used data dir keeps everything (CG-004 AC8, run against the installed app).
7. The installer is unsigned and says so on the download page (Richard's TPL-011 ruling), and the
   first-run SmartScreen path is documented for a parent.

## 4. Traps

The deploy exits 0 when it refuses (read its output); a local build skips the Windows drive — say so; the
launcher pid's teardown sweeps a running `test:ci`; `dev:stop --list` first.

## 8. Session 3 — what was built (lane DESKTOP, 2026-09-28): the workflow, prepared

No Windows here, so nothing below is measured on Windows; the workflow was read end to end against the rename (CG-004
§8) and the real template, rewritten, and parsed (js-yaml: jobs `shell` 11 steps, `windows` 18 steps). Commit `e6ce41dea`.
**Not pushed, not triggered.**

### What the `windows` job now does

1. **Fails** (no longer skips) when `templates/bot-garden/nodegx.project.json` is absent — a skipped job read green.
2. Builds the production viewer, the backend bundle and the deploy engine; fetches the model (cached on its sha256).
3. `build-app.js --project templates/bot-garden`, then asserts `BUILD.json` says `project templates/bot-garden` and
   `developmentEngine false` (build-app now stops on the deploy's own refusal, which exits 0).
4. `npm ci` + the shell's unit tests on Windows (75), `npm run dist:win`.
5. AC5 + AC2: the unpacked `win-x64` binary, the model, the licences and the policy in `win-unpacked/resources`; the
   installer's name and size written to the step summary.
6. Installs `OlivesIsland-Setup-<v>.exe /S` (per-user, no admin), reads the product name from `package.json` (never a
   PowerShell literal: it has an apostrophe), asserts `%LOCALAPPDATA%\Programs\garden-desktop\<name>.exe` exists, its
   `FileDescription` (Task Manager's name) is the product name, and the Start-menu shortcut `<name>.lnk` exists.
7. **AC3:** `New-NetFirewallRule` blocks outbound traffic for the installed exe (the backend is the same exe in Node
   mode; Windows Firewall does not filter loopback, so the relay and the backend still talk).
8. **AC6 (CG-004 AC8) + AC9:** `drive-upgrade.js --exe "$GARDEN_EXE"` — the three launches, the family made on the real
   pages and read back after the "upgrade", the wire 127.0.0.1 only; the exam on the runner's CPU bounded at 15 min.
9. Uploads the installer, `BUILD.json` and `drive-report.json` (`garden-win32-x64-<sha>`, 30 days); job timeout 90 min.

### The trigger, and what green prints

The workflow file is NOT on the default branch, so `workflow_dispatch` / `gh workflow run` cannot start it. The
orchestrator's trigger: `git push origin <commit>:refs/heads/p105-garden-desktop`, then
`gh run list --workflow garden-desktop.yml --branch p105-garden-desktop --limit 1` and `gh run watch <id>`. Green: both
jobs ✓; the `windows` step summary lists `Installer: OlivesIsland-Setup-0.0.1.exe, <N> bytes` and `Installed:
…\Programs\garden-desktop\Olive's Island.exe (FileDescription 'Olive's Island'); shortcut …\Start Menu\Programs\Olive's
Island.lnk`; the drive step ends `"verdict": "PASS"` with all nine clauses true and `launch1.model: "ready"`.

### ACs

| AC | Status | Note |
|---|---|---|
| 1 CI green on windows-latest | 🟡 prepared | never run; first-run risks: the viewer build on Windows, `npm ci` of the `--package-lock-only` lockfile on Windows (clean on the Mac, s2), the exam's length on the runner's CPU |
| 2 installer carries model/licences/policy/workflows; size written | 🟡 prepared | the policy is the shell's CLOSED one (the template ships none); `workflows/` is empty (the template has no functions) |
| 3 no network | 🟡 prepared | egress blocked by a firewall rule on the exe; the drive's wire clause asserts it |
| 4 the tablet's numbers | ⬜ | needs Richard's install on the tablet (below) |
| 5 a withheld rung shows "Olive can't do this here yet" | ⬜ | CG-005/CG-006's page behaviour; the tablet's exam decides which |
| 6 upgrade keeps everything | 🟡 prepared | the drive simulates two versions on one install (`GARDEN_VERSION`, `GARDEN_POLICY_DIR`); a REAL v1-installer-then-v2-installer run is not in the workflow — the NSIS GUID is UUIDv5 of the unchanged appId and the install folder stays `garden-desktop`, so a v2 installer upgrades in place, and `userData` is pinned to "Bot Garden" (CG-004 §8) |
| 7 unsigned, SmartScreen documented | ⬜ | the download page is not written |

### What the tablet will need (for Richard's install)

- The installer from the run's artefact (`OlivesIsland-Setup-<v>.exe`, unsigned: SmartScreen says "Windows protected
  your PC" → "More info" → "Run anyway"); per-user, no admin; installs to `%LOCALAPPDATA%\Programs\garden-desktop\`.
- First launch loads the model on CPU and runs the exam in the background (Mac CPU path 43 s; the tablet is expected at
  4–6×, so 3–4 min) — the game plays on its written lines meanwhile.
- The readings to bring back: `%APPDATA%\Bot Garden\logs\timings.log` (model load ms, each exam probe's ms, each ask's
  ms) and `%APPDATA%\Bot Garden\island\olive-exam.json` (pass/fail per rung). The folder is "Bot Garden" on purpose: it
  is where the saves of every build live (CG-004 §8).
- Not in CI and owed to the tablet: the world's repaint ms at 12×8; the ms per shape on that CPU.

**Residuals:** the first run of this workflow (owner orchestrator); the full installed-app drive of §2 (island → tulip
request → teach → fold → play → win → Grown-ups → Try Olive) is not built — the Windows job runs the upgrade drive's
clauses only (owner CG-008, next session); the backups ruling (CG-004 §8, Richard).

## 9. Session 4 — the first runs on windows-latest (the orchestrator, 2026-09-28)

Richard said yes to the push. Trigger: `git push origin <commit>:refs/heads/p105-garden-desktop` (a fast-forward per
run; every commit on it is on `cline-dev`). Five runs, each fixing what the one before found:

| Run | Commit | What it read | Fixed by |
|---|---|---|---|
| `36419321133` | `d50170e58` | `shell` red: the Linux contract P07 (words-to-blocks) 4/4 wrong; **`windows` SKIPPED** (`needs: shell`) — nothing built | `16b68e964`: the Windows job no longer needs the contract (it grades the model; the app runs its own exam); + the icon |
| `36420678508` | `16b68e964` | `windows`: the viewer, the backend bundle, the model fetch, the app assembly all ✅ on Windows (s3's first-run risks); **`npm ci` failed**: no prebuilt `node-llama-cpp` for win-x64 → a source build of llama.cpp → failed. The lockfile (made on the Mac) held only `mac-arm64-metal`. The Linux job's `npm ci` took 3 min: the same fallback **succeeded**, so the Linux contract had graded a llama.cpp compiled on the runner | `bf6b2a191`: `@node-llama-cpp/win-x64` + `linux-x64` 3.21.1 as optionalDependencies (lockfile +36 lines) |
| `36422960335` | `bf6b2a191` | `shell` ✅ (`npm ci` 7 s; contract 30/31 → PASS on the retry); `windows`: shell tests **88/89** on Windows — the `.gitignore` test split a CRLF checkout on `\n` (an instrument fault) | `a9916e119`: `split(/\r?\n/)` |
| `36423640596` | `a9916e119` | `shell` ✅ 31/31 first attempt. `windows`: shell tests ✅, **installer built** (`OlivesIsland-Setup-0.0.1.exe`; no "default Electron icon" line), the native binary outside the asar (15 `ggml-cpu-*` variants, the model, the licences), **installed silently**: `…\Programs\garden-desktop\Olive's Island.exe`, FileDescription `Olive's Island`, Start-menu `Olive's Island.lnk`; egress blocked. **The drive:** launch 1 up in 4.2 s, title "Olive’s Island", model **ready on CPU in 8.5 s**; then "the exam has results: gave up after 900000 ms" — **80 asks, 55 fallbacks, lastMs 12001** (the 12 s limit), exam still running. Artifact 627 MB (installer + readouts) | — (below) |
| `36426590795` | `ac3698953` | the contract on the Windows CPU (a reading, `continue-on-error`) + the drive's app logs kept — **§9.1** | |

**What run 4 says about the tablet.** On this Windows runner, Olive's calls do not finish inside the page's 12 s; on
the Linux runner the same prebuilt answered a probe in ~3 s. So either this CPU/binary is ~5× slower on Windows, or the
app's own path is: `main.js` asks for a GPU (`gpu: true` unless `GARDEN_CPU`), so `owl.js` passes `threads` only when
the GPU was declined — on a machine with no GPU node-llama-cpp resolves to CPU with its OWN thread count (the math
cores), never `garden.json`'s `cpuThreads` (2), while `olive-contract.mjs` documents `--cpu` + `cpuThreads` as "what CI
on Linux and **the tablet** run". The thread count alone does not explain 5× (the default is 2–4 on a 4-vCPU runner):
**a reading that fits, not one that excludes** — run 5's Windows contract separated them (§9.1): it is NOT the threads.

**ACs after s4:** AC1 🟡 (built, installed, driven up to the exam; the drive's exam clause red), AC2 🟡 (the model, the
licences and the native binary measured in `win-unpacked`; the installer's byte count is in the run's step summary,
not read here), AC3 🟡 (the egress rule applied; the wire clause not reached), AC6 🟡 (not reached: launch 1 did not
finish), AC4/AC5/AC7 unchanged.

### 9.1 Run 5 (`36426590795`): the Windows CPU itself is too slow for the 12 s limit

- **The contract on windows-latest, `--cpu`, 2 threads, the shipped win-x64 prebuilt** (the configuration that answers in
  ~3 s a probe on ubuntu-latest): model ready on CPU in 6.8 s, then **every ask timed out** — the poem 12004 ms, the dial
  `⟂ timeout` ×10, **11/31** asserted probes "behaved" (the 🎓 ones, which pass when she fails), per probe 21–36 s, exam
  **18 min**. So the app's thread setting is **excluded** as the cause: with the configured 2 threads the same binary is
  as slow. The installed app's drive read the same as run 4 (window 2.1 s, model ready in 7.0 s, the exam not done in 15 min).
- **What it means for the tablet:** if the tablet's CPU is like this runner (4 vCPU, no GPU backend in win-x64), Olive
  would answer nothing inside 12 s — the game plays on its written lines, and the exam withholds every ✅ rung. The
  tablet run (AC4) is now the decisive measurement; the runner is not the tablet (a shared cloud VM), so it cannot say
  which. Not yet explained: why the same prebuilt is ~10× slower on Windows than on Linux on the same class of runner
  (candidates, unmeasured: which `ggml-cpu-*.dll` variant loads, Windows Defender on the mmapped model, the VM).
  The app logs are in the run's artifact (`out/logs`), not yet read.
- The Linux contract went red on sampling: 30/31 both attempts, a different probe each time (P07, then P21). The gate's
  "every probe, one retry" bar is tighter than a sampled model meets; a ruling-free fix would be to judge the retry on
  the union — not changed.

