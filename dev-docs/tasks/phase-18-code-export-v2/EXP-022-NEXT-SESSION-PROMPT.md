# Next session — EXP-022 S7: the stores in JavaScriptCore, then the reveal (BOARD lane 6, the Swift session)

**Swift session 7 of at most 12.** Written 2026-10-22 at the end of S6 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session. The first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S6: **Richard's ruling, with the questions he answered** (the table at
   its top), and S6's result.
2. [`exp-022/s6/README.md`](exp-022/s6/README.md) and `exp-022/s6/side-by-side.png`: add and close, all three arms equal.
3. [`exp-022/s5/README.md`](exp-022/s5/README.md): the graph scenarios' line, the 9 store scenarios by name, and "what the
   13 would cost" (S3's route for the client is the route to measure first for the stores).

## Ruled (Richard, 2026-10-22), in order

1. ~~Fix add and close before the reveal~~ **done in S6.**
2. **"Yes, after add & close"**: Swift learns the `@nodegx/core` stores (Global Store, State History, Optimistic Update,
   Action Dispatcher) so its scorecard can match React's (2 of 85 now, React 11). The route to measure first: the stores'
   own JavaScript in the `JSContext`, the way S3 carried the React export's client. Measure before building; the 9
   scenarios are named in `tests/node-spec-graph-swift.test.ts` V3.
3. **The reveal, "private page first, then site"**: an artifact for Richard to read (the running app, the web export and
   the phone side by side, and the numbers: S4/S6's wire, S5's traces, the cost). nodegx.io only after he rules on its
   words.

## What is true at the end of S6 (measured 2026-10-22)

- **Adding a task and closing one work in both exports**; at every step of S4's drive the three arms read the same tabs
  and rows and send the same writes. Three defects fixed (P18-EXP022-S4-DIALOGREFUSED, -ADDREFUSED, -S6-NOOVERLAY).
- **The plan changed** in S6 (a record's Id in its Done chain, `verb-id`; States empty texts; CSS Style read as the
  runtime reads it). The package's whole suite read 163 of 163 files, 5,361 passed, 28 skipped, 0 failed.
- **Still refused by name in todo-list**, not the reveal's path: Add routine lifts its Create's Id as a Component Output
  (`VERB_ID_OUTSIDE`); the "Was it a project's task?" prompt after a close; drag to reorder; a routine's dates. Open,
  other lanes': `P18-EXP022-S5-THROWDIVERGES`, `-S4-LABELDROP` (React draws no Sign in labels).
- The Swift printer: 3,575 + 37 net lines over S6.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, as its own step, never chained into the build command.**
  S6 broke this once (a check chained into the drive's command); do not. Before any `swift build`/`swift test`/
  `xcodebuild`, a simulator boot, a drive, and the whole suite, run `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and
  `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`, and wait (a background `until ! kill -0 <pid>` loop).
- 🔴 **Never edit `src/` while the whole suite runs** (ts-jest compiles each file as it reaches it).
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- A planner change goes through the package's whole suite (`cd packages/nodegx-export && nice -n 19 npx jest
  --runInBand`, about 13 minutes), its count in the commit message.
- 🔴 Mutate the **printed** Swift (`playSwiftGraphs`' `mutate`, `exp-022/s5/mutants.ts`), never the printer source a
  peer's suite reads.
- 🔴 A drive's iOS "Save Password?" sheet can come late: `exp-022/s6/Drive.swift` answers it whenever it comes.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S7-<WORD>`.
- End: update EXP-022 §9 (S7), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Signing, TestFlight, a real iPhone, Kotlin. Publishing to nodegx.io before Richard rules on the page's words.
