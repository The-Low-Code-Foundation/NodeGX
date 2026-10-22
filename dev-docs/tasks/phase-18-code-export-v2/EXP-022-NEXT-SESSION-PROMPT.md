# Next session — EXP-022 S4: todo-list driven in the simulator, against a real backend (BOARD lane 6, the Swift session)

**Swift session 4 of at most 12.** Written 2026-10-22 at the end of S3 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session; the first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §9 S3 (the client in the host, how an awaiting chain prints, the one
   difference left), §8 (S4 is "todo-list driven in the simulator against the same backend React's AC1 drive used: sign in,
   add, tick, delete, relaunch, beside the runtime and the React export").
2. React's AC1 drive, the recipe to copy: [`s137-todo-drive/`](s137-todo-drive/) (`build.sh`, `drive.cjs`, `README.md`):
   `BackendService` on :8597 with the template's own `security.json`, the account seeded by REST, a bound copy of the
   template (`metadata.cloudservices`), each app signed in through its own page.
3. Richard's bar, verbatim in §7: *not* "100 sessions like the React stuff". **The session count is the result.**
   Write it at the top of every handoff: "Swift session N of at most 12".

## What is true at the end of S3 (measured 2026-10-22)

- The Swift app carries the React export's client (`src/api/*`, `src/lib/noodl.ts`), types stripped by Node, as modules in
  its JavaScriptCore context (`src/emit/swift/client.ts`, `Scripts/client/`). `fetch` is URLSession, `localStorage` is
  UserDefaults (suite `io.nodegx.localStorage`), `VITE_NODEGX_ENDPOINT` in the app's environment points it elsewhere.
- **Graded:** `tests/the-same-graph-in-swift-s3.test.ts`, 20 rows (13 behind `NODEGX_SWIFT_BUILD=1`). The Noodl Desk
  (§A) equals the runtime and React, readings and wire; the Record Desk (§D, query, record verbs, Log In/Out, session)
  reads the predicted rows and sends React's 11 requests. The instrument: `swiftBackendArm` in
  `tests/helpers/export-swift-arm.ts` (one fresh `swift test` process per scenario, the fake backend behind a real port
  through `serve-fake-backend.cjs`, its `/__reset` and `/__log` routes).
- todo-list prints with **5** Swift-side gaps, each a For Each the React export does not draw either
  (`exp-022/s3/todo-list-EXPORT-PREFLIGHT.md`). It builds (`swift build`, bound to a backend or not).
- **One known difference:** a detached call's request is sent when its `Task` starts, after the click's later wires; the
  web app sends it first. Nothing graded shows it. If the drive's wire log differs in order, look here first.
- Open, low: `P18-EXP022-S3-BOOLTEXT` (React's, not yours), `P18-EXP022-S1-COLLAPSE`, `P18-EXP022-S2-EMITDECIDES`.

## S4 — the plan

1. **The app on the simulator, signed in against a real backend.** Copy s137's backend half (`BackendService` on its own
   port, the template's `security.json`, an account seeded by REST). Export a bound copy of todo-list with
   `nodegx export --target swift`, build it with `xcodebuild` for the simulator, and launch it with the endpoint in its
   environment (`SIMCTL_CHILD_VITE_NODEGX_ENDPOINT=http://127.0.0.1:<port> xcrun simctl launch …`). Measure first whether
   App Transport Security lets plain `http` to 127.0.0.1 through; if not, the generated `Info.plist` needs
   `NSAllowsLocalNetworking`, and that is a printer change with a test.
2. **Drive it.** There is no UI test target yet. Decide by measuring: an XCUITest target in the generated `.xcodeproj`
   (presses by label, reads by accessibility), or the package's own `Drive` on macOS against the real backend first
   (`swiftBackendArm` needs an option to skip the fake's `/__reset` and `/__log`). The steps are React's AC1: sign in,
   add a task, tick it, delete one, relaunch (the session and the list come back).
3. **Beside the runtime and the React export**, on the same backend, as s137 did: the same lists in all three. A
   screenshot of each, side by side, is the evidence Richard reads.
4. The whole package suite after (`cd packages/nodegx-export && nice -n 19 npx jest --runInBand`), its count in the
   commit message.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, not once.** Before any `swift build`/`swift test`/`xcodebuild`,
  a simulator boot, and the whole suite: `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and `tail -2
  /Users/Shared/nodegx-lab/own026/series-*.log` (a `grade start` with no `grade end` after it is a grade running). Wait
  with a background `until ! kill -0 <pid>` loop. Builds at `nice -n 19`. Shut the simulator down when done
  (`xcrun simctl shutdown all`).
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- `plan.ts` and `component.ts` are read, not changed. If Swift needs a planner change, it goes through the React
  session's suite first, and that suite's count is in the commit message.
- 🔴 A `rm -rf` of a path built from a shell variable is refused: write `"${S:?}/dir"`.
- 🔴 A backend you start is yours to stop: by its pid, never `pkill -f` a runner name (a peer's may be running).
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S4-<WORD>`.
- End: update EXP-022 §9 (S4), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

The ledger line and the cost beside React's (S5), signing, TestFlight, a real iPhone, Kotlin, the app's Collections.
