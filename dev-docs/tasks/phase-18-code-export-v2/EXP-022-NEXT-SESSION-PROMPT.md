# Next session — EXP-022 S5: AC4's ledger line, and the cost beside React's (BOARD lane 6, the Swift session)

**Swift session 5 of at most 12.** Written 2026-10-22 at the end of S4 (Opus 5.5). Say which model you are in your first
message. This is lane 6's **second** session; the first (React, EXP-021) runs on [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md)
in this same folder and the same package. Do not touch its files.

## Read first

1. [EXP-022](EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §4 (AC4: "P107's graph scenarios, driven against the Swift app the way
   ISL-043 drives the React one; the line goes on P18's ledger beside React's"), §7 (Richard's bar, verbatim: *not* "100
   sessions like the React stuff"; **the session count is the result**), §9 S4.
2. The React line, the instrument to copy: `packages/nodegx-export/tests/node-spec-graph.test.ts` (prints
   `P18 ledger: N of M graph scenarios conform on the export …`) over `tests/helpers/node-spec-target.ts`
   `exportGraphTarget`, and [README.md](README.md) "The second line". The scenarios: `packages/nodegx-node-spec/scenarios/`.
3. [`exp-022/s4/README.md`](exp-022/s4/README.md): the drive, and what the three arms read.

## What is true at the end of S4 (measured 2026-10-22)

- todo-list is driven on the iPhone 17 simulator against a real backend by an XCUITest (`exp-022/s4/Drive.swift`), beside
  the running app and the React export in Chrome, each arm on its own fresh seeded backend. **At every step the Swift app
  reads what the React export reads and sends the same requests**: sign in, the list, add, close, relaunch, sign out.
  The picture: `exp-022/s4/side-by-side.png`.
- **Both exports cannot add a task or open any dialog.** Those are plan refusals, filed high for the React lane:
  `P18-EXP022-S4-ADDREFUSED` (a Create whose Id is used further down) and `P18-EXP022-S4-DIALOGREFUSED` (a States value
  unauthored in one state; the runtime takes `undefined`). Not yours: `plan.ts` and `component.ts` stay read-only. If
  the React session fixes either, re-run `exp-022/s4` (`build.sh`, `drive-swift.cjs`, `drive-web.cjs`) and the Swift app
  should follow with no printer change. That re-run is the claim's best evidence.
- The printed project has a UI test target (`<App>UITests/`, a synchronized folder; the autocreated scheme runs it).
  ATS needs no plist key for 127.0.0.1. A drive presses "Not Now" on iOS's "Save Password?".
- The printer is 3,555 lines; 4 sessions spent.
- Open, low: `P18-EXP022-S4-CARDOVERFLOW` (Swift's detail card past the right edge), `P18-EXP022-S1-COLLAPSE`,
  `P18-EXP022-S2-EMITDECIDES` (S4 added one more copied decision: authored Mounted false). React's, open:
  `P18-EXP022-S4-LABELDROP` (153 labelled fields lose their label), `P18-EXP022-S3-BOOLTEXT`. The runtime's or the
  template's: `P18-EXP022-S4-FIRSTPRESS`.

## S5 — the plan

1. **Measure before building:** how `exportGraphTarget` plays one scenario (it emits a tiny project, runs it, records
   events). Decide whether a `swiftGraphTarget` can play many scenarios in **one** `swift test` process (one package
   holding each scenario as a page, or one generated test per scenario). One process per scenario is S3's way and will
   be too slow for 85. Write the cost of each route before choosing.
2. **The line.** `P18 ledger (Swift): N of M graph scenarios conform`, printed beside React's, with the same three
   bounds (`outside` on the exporter's verdict; unobservable events projected out; C7/C8 asserted as differences). The
   prediction is that Swift equals React's 10 conforming, because it prints the same plan. Write that prediction down
   before the first run; a scenario where they differ is the finding.
3. **The cost, written beside React's** (EXP-022 §7's number): Swift's sessions and printer lines against React's
   (`component.ts` 8,828 lines and its sessions). Say plainly where the second printer had to copy decisions from the first
   (EMITDECIDES, COLLAPSE, S4's Mounted false). That is where the claim leaks.
4. The whole package suite after (`cd packages/nodegx-export && nice -n 19 npx jest --runInBand`), its count in the
   commit message.

## Rules this session must keep

- 🔴 **One heavy job on the box, checked BEFORE EVERY build, as its own step — never chained into the build command**
  (S4 chained it once and built over a peer's jest). Before any `swift build`/`swift test`/`xcodebuild`, a simulator boot,
  and the whole suite: `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and `tail -2
  /Users/Shared/nodegx-lab/own026/series-*.log`. Wait with a background `until ! kill -0 <pid>` loop. Builds at
  `nice -n 19`. Shut your simulator down by its id when done.
- 🔴 **A peer works in this package and this folder** (the React session). Commit only your paths, through a temporary
  index with compare-and-swap. Never `git add -A` at the folder level, never `git stash`, never a bare `git reset`.
- `plan.ts` and `component.ts` are read, not changed. If Swift needs a planner change, it goes through the React
  session's suite first, and that suite's count is in the commit message.
- 🔴 A `rm -rf` of a path built from a shell variable is refused: write `"${S:?}/dir"`.
- 🔴 A backend you start is yours to stop: by its pid, never `pkill -f` a runner name.
- A first-run all-green needs mutants. A mutant reading "0 total" did not compile; re-run it in a form that does.
- Every bug found goes to `dev-docs/bugs/` (one file per bug, `node scripts/bugs.js check` clean on your rows), id
  `P18-EXP022-S5-<WORD>`.
- End: update EXP-022 §9 (S5), this file, BOARD lane 6's Swift sentence, and memory `phase-18-code-export-v2`.

## Not this session

Fixing the plan's two refusals (the React lane's). Signing, TestFlight, a real iPhone, Kotlin, the app's Collections.
