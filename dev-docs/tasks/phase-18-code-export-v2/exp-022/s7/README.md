# EXP-022 S7: the stores in JavaScriptCore

The account is in [EXP-022 §9 S7](../../EXP-022-THE-SAME-GRAPH-IN-SWIFT.md). Richard ruled it on 2026-10-22: "Yes, after
add & close". The Swift app carries the `@nodegx/core` stores so its scorecard can match React's. The predictions in
[`EXPECTED.md`](EXPECTED.md) were written after measuring and before building.

## The result

```
P18 ledger (Swift): 11 of 85 graph scenarios conform on the Swift export — 14 played (11 conform, 3 differ as declared,
0 known rows, 0 fail on filed rows); 25 outside on the exporter's verdict (21 the plan's, 4 the Swift printer's),
46 on this harness's limits
P18 ledger:         11 of 85 graph scenarios conform on the export — 18 played (11 conform, 3 differ as declared,
0 known rows, 4 fail on filed rows); 21 outside on the exporter's verdict, 46 on this harness's limits
```

**The two exports conform on the same 11 scenarios. On every scenario both play (14), the Swift app's trace equals the
React export's, event for event.** The 4 the Swift printer still leaves out are On App Error (t07), which no ruling carries.
React plays them and fails them on filed rows.

## The route, measured first

| measured | so |
|---|---|
| The 9 scenarios miss three things in Swift: the store modules, a Set and a Subscribe, and the plan's `streams` (6 node kinds over `lib/history` and `lib/actions`) | nothing else had to move |
| Under the React hooks, `createStateHistoryNode(source, store, rerender)` and its five siblings are plain JavaScript; each hook is about 20 lines | Swift writes the hook again (`StreamNode`); the nodes are the React export's own |
| S3's loader takes `lib/history.ts` and `lib/errors.ts` as they are; `lib/actions.ts` has one parameter property, which Node's strip mode refuses | strip first; Node's transform only on that error |
| `@nodegx/core` is not a dependency of the exporter, and its `dist/` is not in git | a constant transpiled from its source (`coreJs.ts`), made by `tests/helpers/swift-core-js.ts` and compared to it on every run (S7 A1), as S2's runner is |
| React's graph target loads the store modules and the libraries fresh for each scenario, over a cleared store registry | `Scripts.shared.fresh()` before each play |

**Printed:** `Stores.swift` (one `JSStore` per Global Store, the web export's own `stores/<name>` module); a Set is
`Stores.app.set("count", value)`; a Subscribe read as the view draws observes the store, as `useStore` subscribes. Each
streaming node is a `@StateObject var history = StreamNode(module:factory:source:with:)`. Its options and listeners are
applied at every draw, its setup (`setupTracking`, `setupSubscription`, the handler's registration) runs before the
component's pushes, and it is disposed on disappear: React's hook, line for line.

## What I predicted wrong

- **The world.** I predicted the 9 would play on the first build. The runner plays a scenario that declares a world
  under that world's clock (standing at 0) and its seeded random. The React target installs both over `Date.now` and
  `Math.random`, and the store nodes read both (history entries, transaction ids, action ids). The Swift target had no
  `install`, so the runner refused all 9 (`P18-EXP022-S7-NOWORLD`, fixed: each play is handed the world's clock and its
  first 512 random numbers).
- **One line of output.** S5 read the plays from one output line. With 14 plays `swift test` cut it at 15,559
  characters (`P18-EXP022-S7-LONGLINE`, fixed: a file).
- **todo-list "unchanged, byte for byte".** Measured against HEAD's printer: of todo-list's 165 Swift files, every view,
  module and the preflight are the same. The 2 constant host files every app carries are not: `Scripts.swift` and
  `nodegx-host.js` gained `JSStore`, `StreamNode` and their helpers.
- **M3, a store that never notifies.** I predicted t01 and t03 would fail. Only t01 did: in t03 the Optimistic Update node
  draws the view again on its own, so the Subscribe read comes back through that.
- **A name the socket scan reads.** The whole suite's one red was hls006: my host helper was called `listen`, and the
  scan reads `.listen(` as a server opening a socket. Renamed `setListeners`.
- **The 96 I pinned for todo-list** was the plan's 91 refusals plus the Swift printer's 5. It is pinned as two numbers now.

## Mutants (`mutants.ts`, on the printed Swift; `mutants.out`)

| mutant | predicted | read |
|---|---|---|
| M1 no `fresh()` between plays | store scenarios after the first fail | **killed**: t02 ×3 and t03 ×2 fail. The two t04 scenarios pass; I did not measure why |
| M2 Undo sends Redo | t02:0, t02:1, t02:3 fail | **killed**, exactly those three |
| M3 a store write tells no view | t01:0 and t03:0 fail | **killed** on t01:0. t03:0 passes (above) |
| M4 State History's setup after the pushes | equivalent | **equivalent**: a settle records the last value |
| M5 no listener is ever set | equivalent on this corpus | **0 files changed**: no played P107 scenario wires a store node's signal, so the corpus never compiles or grades one. Closed by S7 §E (below) |
| M6 Dispatch drops its Action | t04:0 and t04:2 fail | **killed**, both |
| §E's control: the listener graph with every `on([...])` removed | the Counter never moves | **killed**: Swift `[0]`, React `[0, 1, 3]` (`listener-mutant.ts`) |

**§E, a graph of my own for the listeners:** t02's first graph, plus a Counter stepped by History Changed and by
Undone. It is played on both exports and projected to the same reach, and the Counter reads 0, 1, 3 in each.

## A hazard the one package carries, guarded

All 14 probes are one package, so a Global Store's name is one store across them, and its Initial State is the merge of
every probe's declarers. No played scenario authors one (t01's second does, and it stays outside on the harness's limits).
`playSwiftGraphs` now refuses by name a store with an Initial State that more than one probe declares.

## The cost (§7's number)

| | lines |
|---|---|
| the Swift printer, written by hand (`view.ts` +104, `scripts.ts` +177, `client.ts` +31, `emitSwift.ts` +14) | **+326 net**, 3,612 → 3,938 |
| `coreJs.ts`, generated (the core's source transpiled, one string) | 11 |
| the plan, the React printer, any React module | **0** |

Predicted +250 to +400. The stores cost one session and no change to anything the React export reads.

## Re-running

```sh
cd packages/nodegx-export
npx jest tests/the-same-graph-in-swift-s7.test.ts tests/node-spec-graph-swift.test.ts          # no build
NODEGX_SWIFT_BUILD=1 npx jest tests/node-spec-graph-swift.test.ts tests/the-same-graph-in-swift-s7.test.ts   # two swift builds
npx ts-node --transpile-only -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s7/mutants.ts
npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/swift-core-js.ts                                 # regenerate the core constant
```

Heavy (a `swift build` each): check `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and the lab's `series-*.log` first, as
its own step.
