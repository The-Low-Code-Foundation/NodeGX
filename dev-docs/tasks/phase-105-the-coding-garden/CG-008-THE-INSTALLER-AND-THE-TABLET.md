# CG-008 — The installer and the tablet: one file, and the numbers from the real machine

**Opened 2026-09-27.** **Status: ⬜ not started.** Depends on CG-003, CG-005, CG-007. Lane C.

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
