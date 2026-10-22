# Next session — EXP-022 S1, the same graph in Swift (BOARD lane 6, the Swift session)

**Written 2026-10-22** at the end of the housekeeping session, after Richard ruled D6. Say which model you are in your
first message. This is lane 6's **second** session; the first (React, EXP-021 §101) runs on
[NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md) in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §3 (the IR → SwiftUI table), §7 (the bounded cut and why),
   §8 (the ruling: with the backend, hard stop at 12, now).
2. [DIRECTION.md](../../DIRECTION.md) §0 pillar 3 and §5 D6.
3. Richard's bar, verbatim in §7: *not* "100 sessions like the React stuff". **The session count is the result.**
   Write it at the top of every handoff: "Swift session N of at most 12".

## What is true today (measured 2026-10-22)

- Xcode 26.3 (17C529), Swift 6.2.4, the iOS 26.3 simulator runtime are installed; `xcode-select -p` is
  `/Applications/Xcode.app/Contents/Developer`. Richard never opens Xcode: `xcodebuild`, `xcrun simctl boot / install
  / launch / io booted screenshot`, `swift build`, `swift test` all run headless.
- `packages/nodegx-export`: the planner `src/analyze/plan.ts` (23,537 lines; 70 name a React construct, mostly
  comments) decides when things run; `src/emit/component.ts` (8,828 lines), `emitApp.ts` and ~40 `*Lib.ts` are the
  React printer. The Noodl API client is `src/emit/noodlLib.ts` (emits `src/lib/noodl.ts`); its desk is
  `tests/helpers/noodl-desk.ts` (one fake Parse backend). The CLI is `nodegx` (`src/cli/main.ts`, `dist/cli.mjs`).
- The two smallest templates are `templates/pixel-game` and `templates/story-engine` (9 component files each);
  `templates/todo-list` has 80, signs in and keeps its records on the backend (EXP-021 §7 drove it on one backend
  running its policy).

## S1 — the plan

1. **Measure before building** (write the numbers into EXP-022 as §9 S1):
   - which nodes pixel-game and story-engine use, and which of them §3's table covers;
   - whether `plan.ts`'s output can be read without the React printer (what `emitApp` takes in, and from where);
   - the backend route of §8: can the client `noodlLib.ts` emits run inside a `JSContext` with `fetch` bridged to
     `URLSession`? Try it on a scratch Swift package with one `Records.query` against the Noodl Desk's fake backend
     (or a local `@nodegx/backend`). One client in two hosts is the cheap route; say plainly if it is not.
2. **AC1:** `src/emit/swift/` writes a Swift package for the smaller of the two templates (visual tier only: Group,
   Text, Button, Image, Icon, Text Input, Checkbox, For Each, Page/Router as in §3). `xcodebuild` builds it for the
   simulator; a `simctl` screenshot of its first page sits beside the running app's `render_report` screenshot.
   Keep both in `exp-022/s1/`.
3. **The preflight** names what the Swift target does not carry, before writing, as the React preflight does.

## Rules this session must keep

- 🔴 **One heavy job on the box.** Before any `xcodebuild` or simulator boot: `pgrep -fl 'vitest|jest|xcodebuild'`
  and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`. If an OWN-026 grade or a full suite is running,
  wait (Monitor with an until-loop). Shut the simulator down when done (`xcrun simctl shutdown all`).
- 🔴 **A peer works in this package and this folder** (the React session; ~39 untracked files in `phase-18-code-export-v2/`
  on 2026-10-22). Commit only your paths, through a temporary index with compare-and-swap (memory:
  *commit your delta through a temporary index*). Never `git add -A` at the folder level, never `git stash`, never a
  bare `git reset`.
- `plan.ts` is read, not changed. If Swift needs a planner change, it goes through the React session's suite first
  (whole package: `cd packages/nodegx-export && nice -n 19 npx jest --runInBand`), and that suite's count is in the
  commit message.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S1-<WORD>`.
- End: update EXP-022 §9, this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

The todo-list (S2–S4), the ledger line (S5), signing, TestFlight, a real iPhone, Kotlin.
