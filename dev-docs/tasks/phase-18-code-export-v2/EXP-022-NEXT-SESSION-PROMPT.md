# Next session — EXP-022 S3: todo-list's backend in Swift, through the one client (BOARD lane 6, the Swift session)

**Swift session 3 of at most 12.** Written 2026-10-22 at the end of S2 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session; the first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S2 (what is printed and graded), §9 S1 point 3 (the backend route:
   the React export's `noodl.ts` + `api/client.ts`, bundled, run unchanged in a `JSContext`; `exp-022/s1/jsc-spike/`),
   §8 (the ruling: with the backend, hard stop at 12).
2. Richard's bar, verbatim in §7: *not* "100 sessions like the React stuff". **The session count is the result.**
   Write it at the top of every handoff: "Swift session N of at most 12".

## What is true at the end of S2 (measured 2026-10-22)

- `packages/nodegx-export/src/emit/swift/` (2,781 lines, 8 files) prints every component, drawn or logic, from the
  plan: a logic component is `<Name>Logic`, a view that draws nothing; React's hooks map one to one (`@State`, `Ref`,
  `.onChange(of: Same(…), initial: true)`, `Memo`). Functions run verbatim in one `JSContext` (`Scripts.swift`,
  `Scripts/functions/*.js`) through `functionRun.ts` compiled to JavaScript (`functionRunJs.ts`; a test fails on drift).
- **Graded:** `tests/the-same-graph-in-swift-s2.test.ts` (and S1's `the-same-graph-in-swift.test.ts`), 25 rows, 8 behind
  `NODEGX_SWIFT_BUILD=1`. §A drives the Hook Desk in the exported app (`tests/helpers/export-swift-arm.ts`: writes the
  package to `$TMPDIR/nodegx-swift-arm/<name>`, adds a test that draws `RootView()` through the package's own `Drive`,
  presses by label, reads every Text) against `runtime-mounted-arm.js`: equal at every step. The arm is the instrument
  for S3 and S4 too.
- **S3's work list is todo-list's `EXPORT-PREFLIGHT.md`** (`exp-022/s2/todo-list-EXPORT-PREFLIGHT.md`): 44 Swift-side
  gaps, 39 of them the backend — `api-call` actions 20 (record verbs, sign-out), `query-fetch` 7, queries (6, and the
  six lists pushed from `query-get`), `session-get` Conditions 4, and the one Function that reads `Noodl`
  (`Read_the_projects_and_the_money`). The other 5 are For Eaches the React export does not draw either.
- `nodegx export --target swift <project> <out>` and `--dry-run --target swift` work.
- Open, low: `P18-EXP022-S1-COLLAPSE`, `P18-EXP022-S2-EMITDECIDES` (printer decisions copied from `component.ts`).

## S3 — the plan (§8: the backend through the one client, graded against the fake Parse backend)

1. **The client in the host.** Bundle the React export's `src/lib/noodl.ts` + `src/api/*` for the project (S1's spike
   did it with esbuild by hand: `exp-022/s1/jsc-spike/`). Decide, by measuring, whether the emitter builds that bundle
   at export time (the published package has no esbuild) or ships the client as plain JavaScript the way S2 ships
   `functionRun.ts` (`functionRunJs.ts`, generated, guarded by a test). Lift S1's `fetch` → `URLSession` bridge into
   `Scripts.swift`; `localStorage` is already there (UserDefaults).
2. **Print, in order of the work list's counts:** `api-call` (an awaited call into the client; its done chain after,
   its Error row in the catch — `component.ts` `case 'api-call'`), queries and `query-fetch`, `session-get`, and
   `Noodl` in a Function body (the body's third parameter, as `jsWrapperLines` binds it).
3. **Graded by `swift test` against the fake Parse backend** (`tests/helpers/fake-parse-backend.js`, behind a real port
   as S1's `serve-fake.cjs` did), the way the Noodl Desk grades React (`tests/helpers/noodl-desk.ts`,
   `export-react-arm.js` with `backend:`): the same scenario, the same wire log.
4. The whole package suite after (`cd packages/nodegx-export && nice -n 19 npx jest --runInBand`), its count in the
   commit message.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, not once.** S2 checked at the start, then overlapped an
  OWN-026 grade with its builds. Before any `swift build`/`swift test`/`xcodebuild` and the whole suite:
  `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and `tail -2 /Users/Shared/nodegx-lab/own026/series-*.log` (a `grade
  start` with no `grade end` after it is a grade running). Wait with a background `until ! kill -0 <pid>` loop. Builds
  at `nice -n 19`. Shut the simulator down when done (`xcrun simctl shutdown all`).
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- `plan.ts` and `component.ts` are read, not changed. If Swift needs a planner change, it goes through the React
  session's suite first, and that suite's count is in the commit message.
- 🔴 A `rm -rf` of a path built from a shell variable is refused: write `"${S:?}/dir"`.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S3-<WORD>`.
- End: update EXP-022 §9 (S3), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

todo-list driven in the simulator (S4), the ledger line and the cost beside React's (S5), signing, TestFlight, a real
iPhone, Kotlin.
