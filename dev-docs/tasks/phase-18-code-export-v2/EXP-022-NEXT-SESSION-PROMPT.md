# Next session — EXP-022 S6: AC5, the reveal, after Richard's read of the cost (BOARD lane 6, the Swift session)

**Swift session 6 of at most 12.** Written 2026-10-22 at the end of S5 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session. The first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §4 (AC5: "one project, web and phone, and the numbers that show they
   behave the same"), §7 (Richard's bar, verbatim: *not* "100 sessions like the React stuff"; **the session count is the
   result**), §9 S5.
2. [`exp-022/s5/README.md`](exp-022/s5/README.md): the ledger line, how it is graded, and the cost table.
3. [`exp-022/s4/README.md`](exp-022/s4/README.md) and `exp-022/s4/side-by-side.png`: the drive, which is half of AC5.

## What is true at the end of S5 (measured 2026-10-22)

- **AC1, AC3, AC4 met; the app as it ships (§8's AC2) driven in S4.** AC4's line is on P18's ledger (README "The
  second line"): **2 of 85 graph scenarios conform on the Swift export, 5 played, and on all 5 the Swift app's trace
  equals the React export's, event for event.** React reads 11 of 85 (s139). The 9 between them are `@nodegx/core`
  stores (Global Store, State History, Optimistic Update, Action Dispatcher), outside §7's cut on the Swift printer's
  verdict, named scenario by scenario (`tests/node-spec-graph-swift.test.ts` V3).
- **The cost:** 5 sessions and 3,575 printer lines, against React's 140 sessions and 24,671 lines (`component.ts` and
  32 runtime helpers). `plan.ts` is read, never changed. **Where the claim leaks:** nine decisions copied from
  `component.ts` (COLLAPSE, the six of EMITDECIDES, Mounted false, a Log's Done chain). None has changed behaviour yet.
- **Open:** `P18-EXP022-S5-THROWDIVERGES` (the node-spec runner counts a throw as the declared difference; P107's, and
  React's line has the hole too; the Swift line guards itself). The plan's two refusals, `P18-EXP022-S4-ADDREFUSED` and
  `-DIALOGREFUSED` (high, the React lane's). If the React session fixes either, re-run `exp-022/s4`. Low:
  `-S4-CARDOVERFLOW`, `-S1-COLLAPSE`, `-S2-EMITDECIDES`.
- The graph play: one package, one `swift test`, 9 s warm for all five (`tests/helpers/swift-graph-target.ts`).

## S6 — the plan

1. **Ask Richard first, in plain words, with the cost table in front of him** (`exp-022/s5/README.md`): stop the build
   at 5 sessions and write the reveal, or spend slack sessions widening the line. Widening means carrying
   `@nodegx/core`'s stores into JavaScriptCore the way S3 carried the client, which would move up to 9 scenarios. Do not
   start the stores without his word.
2. **AC5, the reveal:** one project, the running app, the web export and the phone side by side, and the numbers (S4's
   wire, request for request; S5's traces, event for event; the plan refusals both share). Where it lives (a page on
   nodegx.io, an artifact) is Richard's call too. Ask it in the same question.
3. The whole package suite after any code change (`cd packages/nodegx-export && nice -n 19 npx jest --runInBand`), its
   count in the commit message. S5 read 162 of 162 files, 5,345 passed, 28 skipped, 0 failed.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, as its own step, never chained into the build command.**
  Before any `swift build`/`swift test`/`xcodebuild`, a simulator boot, and the whole suite, run `pgrep -fl
  'vitest|jest|xcodebuild|grade.mjs'` and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log`. A lab round's agent
  builds its app with `next` (a `jest-worker` in that list): wait for it too. Wait with a background `until ! kill -0
  <pid>` loop. Builds at `nice -n 19`.
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- `plan.ts` and `component.ts` are read, not changed. A planner change goes through the React session's suite first.
- 🔴 Mutate the **printed** Swift (`playSwiftGraphs`' `mutate`, `exp-022/s5/mutants.ts`), never the printer source a
  peer's suite reads.
- 🔴 A `rm -rf` of a path built from a shell variable is refused: write `"${S:?}/dir"`.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S6-<WORD>`.
- End: update EXP-022 §9 (S6), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Fixing the plan's two refusals or the runner's THROWDIVERGES (other lanes'). Signing, TestFlight, a real iPhone, Kotlin.
