# EXP-022 S2 — evidence

Swift session 2 of at most 12 (2026-10-22, Opus 5.5). What is here:

- **`hook-desk-swift/`** — the Hook Desk (`tests/helpers/hook-desk.ts`) as `emitSwiftApp` prints it: seven logic
  components as views that draw nothing (`Sources/HookDeskKit/Logic/`), the page that places them, nine Function bodies
  verbatim (`Scripts/functions/`), the JavaScriptCore host (`Scripts.swift`, `Scripts/nodegx-host.js`). Its
  `Tests/HookDeskKitTests/HookDeskTests.swift` drives the desk's nine steps. Re-run: `cd hook-desk-swift && swift test`.
- **`hook-desk-readings-swift.json`** — what that prints: one reading after load and one after each press. It equals the
  runtime arm's readings, but the word "Text" (P18-S122-TEXTDEFAULT), at every step; the package suite asserts it
  (`tests/the-same-graph-in-swift-s2.test.ts` §A, `NODEGX_SWIFT_BUILD=1`).
- **`todo-list-EXPORT-PREFLIGHT.md`** — todo-list's Swift pre-flight after S2: 44 Swift-side gaps (S1: 334), the ten
  Functions that touch the browser named (AC3).

## The mutants (run on the printed package, no source change)

| mutant | what changed | the readings |
|---|---|---|
| M1 | the delivered-count effect removed (`echoTakeDelivered = sent`) | echo never runs: column 6 is `''` at every step |
| M2 | Tally's pulse guard removed (`go.taken.current != go.sent`) | Tally runs at load: `total 1` / `total 10` before any press |
| M3 | Echo handed the count as it is sent, not one update later | `echo undefined` at step 2, then one step behind |

M3 is a measurement, not only a mutant: SwiftUI needs the plan's P18-S127-SIBLINGVALUE ordering exactly as React does
(a value a child pushes from its effect lands one update after the pulse sent beside it). The plan's timing rule is about
"state drives the view, effects run after", which both frameworks share; it is not a React leak.
