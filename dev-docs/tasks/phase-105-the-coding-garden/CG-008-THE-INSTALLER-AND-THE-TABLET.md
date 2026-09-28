# CG-008 — The installer and the tablet: one file, and the numbers from the real machine

**Opened 2026-09-27.** **Status: 🟡 prepared, session 3 (2026-09-28) — the Windows workflow builds the real template, installs and drives the renamed app; never run (§8). Was: ⬜ not started.** Depends on CG-003, CG-005, CG-007. Lane C.

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
