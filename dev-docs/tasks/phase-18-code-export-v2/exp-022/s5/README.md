# EXP-022 S5 — the graph scenarios on the Swift export (AC4), and the cost beside React's

**Result.** P107's 85 graph scenarios are graded on the Swift export by the same runner, the same projection and the
same three bounds as on the React export. The line, as predicted in [EXPECTED.md](EXPECTED.md) before the first run:

```
P18 ledger (Swift): 2 of 85 graph scenarios conform on the Swift export — 5 played (2 conform, 3 differ as declared,
0 known rows, 0 fail on filed rows); 34 outside on the exporter's verdict (21 the plan's, 13 the Swift printer's),
46 on this harness's limits
P18 ledger:         11 of 85 graph scenarios conform on the export — 18 played (11 conform, 3 differ as declared,
0 known rows, 4 fail on filed rows); 21 outside on the exporter's verdict, 46 on this harness's limits
```

**On every scenario both exports play (5), the Swift app's trace equals the React export's, event for event**, and
that includes the three places both differ from the running app (G1, C7, C8). The 9 conforming scenarios React has and
Swift does not are all `@nodegx/core` stores (Global Store, State History, Optimistic Update, Action Dispatcher), which
§7's cut left out. They stand outside on the Swift printer's verdict, by name, so nothing is hidden.

```
cd packages/nodegx-export
npx jest tests/node-spec-graph-swift.test.ts                          # the verdicts, no build (6 rows)
NODEGX_SWIFT_BUILD=1 npx jest tests/node-spec-graph-swift.test.ts     # + one swift build, one swift test (4 rows)
```

## The route, decided by measuring first

The React target is driven step by step in the jest process: a press is an `act`. A Swift app runs in its own process.

| route | cost, measured | at 85 scenarios |
|---|---|---|
| one `swift test` per scenario (S3's way) | a warm process is most of the ~9 s one run takes | about 85 × 7 s ≈ 10 minutes, and 85 links |
| **one package, every played scenario a component of it, one generated test that plays them all** | first build and play 14.4 s; warm 8.8–9.7 s for all 5 | one build, one process: seconds per added scenario |

The second was taken. `tests/helpers/swift-graph-target.ts` has three parts:

1. **`swiftGraphVerdicts`** decides each scenario in the React target's bounds. The harness is one harness: its
   limits are read off the React target's own `canPlay`. The exporter's verdict is the plan's own notes (both printers
   read them), then what the Swift printer reports it does not print. The reach is the lifted outputs whose push Swift
   printed.
2. **`playSwiftGraphs`** prints each playable scenario as its own component (`Probe<k>`) of one package and writes one
   XCTest. The test plays each scenario's steps through the package's own `Drive` (a press by label, a prop moved, a
   settle), and records what each lifted callback last delivered at every settle.
3. **`swiftGraphTarget`** replays those snapshots through the runner's own `playGraph`. Its settle rule is the React
   target's, line for line, so the grading is the runner's, untouched.

**Measured before building:** every one of React's 21 exporter-verdict outsides is in the plan's notes. The React
printer adds no refusal of its own on this corpus, so the plan's verdict is one verdict (row V2 pins it, scenario for
scenario and word for word).

## The first runs, said plainly

1. **The package did not compile, and the line still read "3 differ as declared".** A probe project has no routed
   page. The Swift printer wrote an empty `Route` enum held by a `@Published` with no value, and Swift 6.2.4 crashed in
   SILGen instead of saying so (`P18-EXP022-S5-NOROUTE`, fixed: one `none` case). The runner counts a throw as a
   difference, so every declared difference read "diverged" (`P18-EXP022-S5-THROWDIVERGES`, open, the runner's; React's
   line has the same hole). **The Swift line now refuses to count a play that threw** (B1). The second run showed the
   guard working: B1 red, by name.
2. The generated test's `value(_:)` collided with `NSObject`'s `value(forKey:)` inside an `XCTestCase`. Renamed.
3. Third run: 8 of 8, and the line read exactly the prediction.

## Mutants (`mutants.ts`, on the printed Swift, so no peer's suite ever reads a mutant printer)

| mutant | predicted | read |
|---|---|---|
| M1 Value Changed's chain adds 2 | C2 fails; B2 red on C2 and C8 | **killed**, as predicted |
| M2 Value Changed's same-value guard removed | equivalent (`.onChange(of: Same(…))` already drops a repeat) | equivalent, as predicted |
| M3 a lifted output not pushed at mount (`initial: false`) | C2 and C10 fail; B2 red | **killed** on C2, G1, C7. **C10 passes: I predicted wrong.** Its values start undefined and arrive only through `set`, so a mount push carries nothing a trace records (C8 likewise moves before its first settle) |
| the throw guard | — | the second run (a compile error in the test) read B1 red by name |
| Log not printed | — | measured before the fix: C10 was among the Swift printer's 14 losses, playable 4 |

## What S5 changed in the printer (+20 lines, 3,555 → 3,575)

- **Log** (`view.ts`, `support.ts` `JS.log`): one console line at the node's level, what the web export's `log` writes.
  Its Done chain is following statements, copied from React's `expandActions`: one more decision a second printer
  copies (`P18-EXP022-S2-EMITDECIDES`, now 8). It was C10's only loss (two buttons the scenario never presses).
- **The Router of a project with no page** (`emitSwift.ts`, NOROUTE).

## The cost beside React's (EXP-022 §7's number)

| | React | Swift |
|---|---|---|
| sessions | 140 P18 sessions so far, the next is 141 (the plan, the IR and the printer together) | **5** (of at most 12) |
| printer | `component.ts` 8,828 lines + 32 runtime helpers (`*Lib.ts`) 15,843 lines | **3,575 lines** (and the React export's own client and `functionRun`, carried as JavaScript) |
| the plan | `plan.ts` 23,537 lines, built in those sessions | read, never changed |
| graph scenarios | 11 of 85 conform (18 played) | 2 of 85 conform (5 played), and on all 5 the same trace as React |
| todo-list on a phone | — | driven in the simulator against a real backend, the same requests as React at every step (S4) |

**Where the claim leaks** (the second printer copying a decision the first made outside the plan): the page
collapse's style merge (S1, `COLLAPSE`); six in S2 (`EMITDECIDES`: kept Functions, render runs, `expandActions`,
`combinedLifted`, late handlers, field refs); a node authored Mounted false (S4); a Log's Done chain (S5). **Nine
decisions, each a few lines of Swift.** None has changed behaviour: every desk and every graph scenario both play reads
the same. Each is a place where one printer can move and the other not. **Where it does not leak:** the plan's
refusals (add a task, every dialog, the 21 graph scenarios) are the same in both exports, in the same words. The
second printer added no refusal and removed none.

**What the 13 would cost.** React's line went from 2 to 11 in sessions 106 (§77), 107 (§78), 108 and 139, each store
family printed through a runtime helper of its own. S3's route says Swift may not need a second copy. The React export's own client runs
unchanged in JavaScriptCore, and `@nodegx/core`'s stores are JavaScript too. That is a measurement for a slack
session, not a claim.
