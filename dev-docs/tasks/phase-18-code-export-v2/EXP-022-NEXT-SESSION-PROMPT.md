# Next session — EXP-022 S2: todo-list's state and scripts in Swift (BOARD lane 6, the Swift session)

**Swift session 2 of at most 12.** Written 2026-10-22 at the end of S1 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session; the first (React, EXP-021 §101) runs on
[NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md) in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S1 (what is built and measured), §8 (the ruling: with the backend,
   hard stop at 12), §3 (the table; §9 notes where S1 changed it).
2. Richard's bar, verbatim in §7: *not* "100 sessions like the React stuff". **The session count is the result.**
   Write it at the top of every handoff: "Swift session N of at most 12".

## What is true at the end of S1 (measured 2026-10-22)

- `packages/nodegx-export/src/emit/swift/` (1,447 lines, 6 files) prints a Swift package + a generated `.xcodeproj`
  from `planProject` and `computeNodeStyle`. `tests/the-same-graph-in-swift.test.ts` is 7/7, with
  `NODEGX_SWIFT_BUILD=1` running a real `swift build`. story-engine builds with `xcodebuild` and draws in the iPhone 17
  simulator (`exp-022/s1/`). pixel-game and todo-list also `swift build`, untuned.
- **The backend route is decided: one client in two hosts.** The React export's `noodl.ts` + `api/client.ts`,
  bundled by esbuild into one IIFE, runs unchanged in a `JSContext` with `fetch` → `URLSession` and a `localStorage`
  object. Its results and wire log are byte-identical to Node's (`exp-022/s1/jsc-spike/`). The host code is in
  `jsc-spike/swift/Sources/JSCSpike/main.swift` and `host-prelude.js`; S2/S3 lift it into the printed package.
- **S2's work list is todo-list's `EXPORT-PREFLIGHT.md`** (print it with the test's recipe): 334 Swift-side gaps.
  Chiefly: logic components not run (36 components, 48 placements), lifted values left empty (76), press actions
  (`states-go` 45, `state-set` 44, `jsfun-run` 12, `store-set` 8, `api-call` 3, `branch` 2), and bindings from
  `jsfun-out` (25) and from `states-out` with a field other than `value` (10).
- Open, low: `P18-EXP022-S1-COLLAPSE` (the page collapse's merge lives in `component.ts`; Swift copies it).

## S2 — the plan (§8: state, effects, lifts and hooks printed from the plan; Functions in the `JSContext`)

1. **The JavaScriptCore host in the package.** A `Scripts.swift` (one `JSContext` per app) that loads the Function
   bodies verbatim, through the EXP-019 wrapper contract (`Inputs`, `Outputs`, `Noodl`, `this`), and the bundled
   client for `Noodl.*`. The emitter needs the bundle as text: build it with esbuild at export time from the same
   sources `emitApp` writes, or ship it prebuilt. Measure which is simpler before choosing.
2. **Print, in order of the work list's counts:** a logic component as an `ObservableObject` (React's hook); lifted
   values; `state-set`, `states-go`, `store-set` and `jsfun-run` actions; `jsfun-out` bindings; Global Variables as an
   app-wide `ObservableObject` (story-engine's untyped `storyCarrying` is one).
3. **Graded by `swift test` on macOS** against the same desk predictions the React arm reads (the Hook Desk,
   `tests/helpers/hook-desk.ts`): emit the desk to Swift, drive the objects in a test target, compare the readings.
   No simulator is needed for this.
4. **`nodegx export --target swift`** (`cli/args.ts`, `cli/run.ts`, `USAGE`), with the whole package suite after
   (`cd packages/nodegx-export && nice -n 19 npx jest --runInBand`) and its count in the commit message.

## Rules this session must keep

- 🔴 **One heavy job on the box.** Before any `xcodebuild`, simulator boot or the whole suite:
  `pgrep -fl 'vitest|jest|xcodebuild'` and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`. If an OWN-026 grade
  or a full suite is running, wait (Monitor with an until-loop). Run builds at `nice -n 19`. Shut the simulator down
  when done (`xcrun simctl shutdown all`). A simulator screenshot taken right after `launch` catches the launch
  animation: shoot until two frames are the same.
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a
  temporary index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare
  `git reset`.
- `plan.ts` is read, not changed. If Swift needs a planner change, it goes through the React session's suite first,
  and that suite's count is in the commit message.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S2-<WORD>`.
- End: update EXP-022 §9 (S2), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

The backend graded against the fake Parse backend (S3), the todo-list driven in the simulator (S4), the ledger line
(S5), signing, TestFlight, a real iPhone, Kotlin.
