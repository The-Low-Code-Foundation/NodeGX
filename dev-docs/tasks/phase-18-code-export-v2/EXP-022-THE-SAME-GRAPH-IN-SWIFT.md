# EXP-022 — The same graph in Swift

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), from Richard's ruling of 2026-10-21: "I want that offramp promise
fulfilled in React and Swift." **Status: 🔵 Swift session 1 of at most 12 done (2026-10-22, §9): AC1 met on story-engine; the backend route measured (one client in two hosts works). Next: S2. Ruled 2026-10-22 (§8, DIRECTION D6): the bounded cut with the backend, hard stop at 12 sessions.** Takes [P110](../phase-110-the-app-in-your-pocket/README.md)
out of the parked table: its reveal sentence stands ("one graph, three homes"), its rulings R1–R7 carry, and **its route
changes**: P110 §0 scoped *a NodeGX runtime written in Swift that loads the project as data*; this task is *an emitter
that writes a SwiftUI app from the same IR the React export reads*. Same reveal, and the person leaves with Swift source
they own, which is the off-ramp promise. Swift first, Kotlin after (P110 R1).

## 1. The person sentence

> "I ran `nodegx export --target swift` on my app and opened the folder in Xcode. It builds, it runs on my iPhone, the
> screens are my screens, and the Functions I wrote run inside it."

## 2. What was measured first (s132)

- **The toolchain is on this box**: Xcode 26.3 (build 17C529), Swift 6.2.4, `xcode-select` at `/Applications/Xcode.app`.
  A spike can compile today.
- **The visual vocabulary the templates use** (13,057 nodes, 484 types; python over every `nodes.json`): Group 2,302 ·
  Text 1,684 · Button 774 · For Each 250 · Text Input 226 · States 153 · Page 114 · Options 39 · Checkbox 26 · Image 25
  · Icon 21 · Router 17. Nine visual types cover the templates (P110 §1 fact 6 said the same from the todo alone).
- **Half the logic is script** (P110 §1 facts 2–4, still true: 1,285 Function bodies, 602 pure). Swift cannot host
  JavaScript natively; **JavaScriptCore can**, and it ships in every iOS. The React export's wrapper contract (`Inputs`,
  `Outputs`, `Noodl`, `this`; EXP-019) is the contract a `JSContext` host gives the same body.
- **10 of the todo's scripts touch the browser** (P110 fact 3: `document`, `window`, `localStorage`). Those are the ones a
  phone cannot run as written; PKT-002's answer (each becomes a node) stands, and EXP-019's classifier already names them.

## 3. The rule

One IR, two emitters. `src/emit/swift/` writes a Swift package (`Package.swift`, an `App`, one `View` per visual
component, one `ObservableObject` per component's state rows, a `Router` as `NavigationStack`):

| IR | SwiftUI |
|---|---|
| Group (column / row, flex) | `VStack` / `HStack` with the neutral layout model (P110 R2, NSP-016 option b); CSS-only settings marked web-only in the preflight |
| Text, Button, Image, Icon | `Text`, `Button`, `AsyncImage`, `Image(systemName:)` |
| Text Input, Checkbox, Options | `TextField`, `Toggle`, `Picker` |
| For Each | `ForEach` over the row component |
| States | the state rows + `withAnimation` |
| Page / Router / Navigate | `NavigationStack` + `navigationDestination` |
| a state var, a Variable | `@Published` on the component's object |
| a Function body | the verbatim body in a `JSContext`, `Inputs`/`Outputs` bridged as `JSValue`s; `Noodl` (EXP-020) bridged to the backend client |
| record verbs, Cloud Functions | a Swift client of the same backend API `src/api` calls |

The preflight prints, before anything is written, what will not travel to a phone (the browser-touching scripts by
name, CSS-only looks), as the React preflight does.

## 4. Acceptance criteria

- **AC1 — the spike.** pixel-game or story-engine (the two smallest: 10 / 13 refusals) emitted to a Swift package that
  `swift build`s and draws its first page in the simulator; a screenshot beside the running app's `render_report`.
- **AC2 — the todo, phone-only** (P110's first form, R4, R6): the todo-list template, one setting different, on an
  iPhone, works in aeroplane mode; delete the app, the list is gone.
- **AC3 — the scripts run.** The todo's pure Functions run in JavaScriptCore unchanged; the 10 browser-touching ones are
  named in the preflight, not silently dropped.
- **AC4 — graded the same way.** P107's graph scenarios, driven against the Swift app the way ISL-043 drives the React
  one; the line goes on P18's ledger beside React's.
- **AC5 — the reveal** (P110 §2): one project, web and phone, and the numbers that show they behave the same.

## 5. Order

AC1 can start the session after EXP-019 slice 1 lands (it needs only the visual tier and the wrapper contract). AC2–AC5
need EXP-020 (the backend client) and EXP-021 (logic components). Kotlin is P110 R1's "next phase".

## 6. Not this task

Phone plus cloud with offline sync (P110's second form, R3): after AC2. TestFlight and signing (R5): Richard's call when
AC2 is in hand. Reminders and the Today tab (R7): out.

## 7. The bounded cut (proposed 2026-10-22, awaits Richard)

> "I don't want to spend 100 sessions like with the React stuff on it, the point of it is supposed to be 'whatever your
> framework is, you can just build the offramp, because the spec makes it easier' and not 'yeah you'll need a Claude
> Max subscription and several weeks of constant work to get your app to Kotlin in the future'." — Richard, 2026-10-22

So the session count is the result, not an overhead. **The claim this task measures:** with the node specs, the IR and
the plan in hand, a new target costs a printer, not a rewrite. **Its number:** sessions and printer lines for Swift,
beside React's.

**Measured first (2026-10-22, housekeeping session):**

- **Nobody opens Xcode.** Xcode 26.3 and the iOS 26.3 simulator runtime are installed; `xcodebuild` builds,
  `xcrun simctl` boots, installs, launches and screenshots, all headless. `swift test` runs on macOS without a
  simulator, and JavaScriptCore is in macOS as in iOS.
- **Where React's sessions went is reusable.** `src/analyze/plan.ts` is 23,537 lines deciding *when* things run
  (arrival runs, pulses, lifts, hooks, persisted stores); 70 of them name a React construct, mostly in comments.
  SwiftUI has React's model: state drives the view; `.onChange(of:)` is an effect over a value; a closure is a lifted
  callback; an `ObservableObject` is a hook. A Swift target prints the plan's decisions in another syntax.
  `src/emit/component.ts` (8,828 lines) and the ~40 `*Lib.ts` runtime helpers are the React printer; most helpers
  (realtime, SSE, websockets, streaming) are outside this cut.

**The cut:**

| in | out (named by the preflight, not dropped silently) |
|---|---|
| one app: todo-list, phone-only, kept on the device | the other 16 templates |
| the node types it uses (Group, Text, Button, Text Input, Checkbox, For Each, States, Page, Router) | every other type |
| Function bodies verbatim in a `JSContext`, the EXP-019 wrapper contract | translating scripts to Swift |
| the plan's state rows, effects, lifts and hooks, printed | a Swift planner |
| — | the backend client (EXP-020's `Noodl.*` refused by name), signing, TestFlight, a real iPhone (R5), Kotlin |

**Grading without anyone at a screen:** the logic through `swift test` on macOS, the generated objects and their
`JSContext` read against the same desk predictions the React arm reads (the Hook Desk's shape); the screens through
simulator screenshots beside `render_report`, and one scripted drive (`xcodebuild test`, headless): add, tick,
delete, relaunch.

**Sessions:** S1, AC1 (the smallest template, the visual tier only, builds and draws in the simulator). S2, state and
scripts on todo-list's logic components, desk-graded. S3, todo-list driven in the simulator. S4, AC4's ledger line,
the preflight, and the cost written beside React's. S5 is slack. **Hard stop at eight.** If it is not done by then,
the finding is where the IR or the plan leaks React; that is a defect in the claim itself, filed and said plainly on
the site, not a reason for a ninth session.

**Kotlin after:** the same cut on Compose Desktop (JVM, no emulator) would be the third target and the real test of
"whatever your framework". Not this task.

## 8. Ruled (Richard, 2026-10-22)

Asked in plain words, four choices each, he picked **"Go, with a backend"** and **"Now, beside React"**. So §7 stands
with these changes:

- **The app is the todo-list as it ships**: it signs in and reads and writes its records on the backend. Not the
  phone-only form. The reveal is the strongest one P110 named: the same backend, the web app and the phone app side
  by side, the same lists.
- **The backend route to measure first (S1), not assume:** one client in two hosts. The React export already writes
  the Noodl API client (`src/lib/noodl.ts`, EXP-020) and the record verbs (`src/api`). Run that same client inside the
  `JSContext` that hosts the Functions, with `fetch` bridged to `URLSession`, so `Noodl.Records`, `CloudFunctions`,
  `Users` and the record nodes reach the backend through code that is already graded. Fall back to a hand-written Swift
  client only if that measures worse, and say why.
- **Hard stop at 12 sessions**, not 8. An overrun is reported on the site as evidence against "the spec makes the
  off-ramp cheap", not hidden.
- **Starts now, in a second lane-6 session**, beside the React session on EXP-021 §101. Swift lives in
  `packages/nodegx-export/src/emit/swift/` and its own tests; it touches `plan.ts` only to read it, and any change
  there goes through the React session's suite first. Xcode builds are a heavy job: none while an OWN-026 grade or a
  full test suite is running (`pgrep -fl vitest`, `pgrep -fl jest`, the lab's `series-*.log`).

**Sessions:** S1, measure, then the smallest template drawn in the simulator beside its `render_report` (AC1). S2,
todo-list's state, effects, lifts and hooks printed from the plan, Functions in the `JSContext`, desk-graded by
`swift test`. S3, the backend through the one client, graded against the fake Parse backend the Noodl Desk uses. S4,
todo-list driven in the simulator against the same backend React's AC1 drive used: sign in, add, tick, delete,
relaunch, beside the runtime and the React export. S5, the ledger line (AC4), the preflight, and the cost written
beside React's. S6–S12 are slack, not plan.

## 9. Sessions

### S1 — Swift session 1 of at most 12 (2026-10-22, Opus 5.5)

**Result: AC1 met.** story-engine goes through `emitSwiftApp` (`packages/nodegx-export/src/emit/swift/`) to a Swift
package plus a thin iOS app target; `xcodebuild` builds it for the simulator, and its first page draws on an iPhone 17
simulator beside the running app's `nodegx render` image: [`exp-022/s1/read-runtime-vs-swift.png`](exp-022/s1/read-runtime-vs-swift.png).
The printed package is kept in [`exp-022/s1/story-swift/`](exp-022/s1/story-swift/).

**What was measured first:**

1. **The two small templates.** story-engine: 88 nodes, 9 components; its drawn components use 7 roles (page, group,
   text, button, input, instance, repeater), all in §3's table. pixel-game: 97 nodes, 9 components, plus a keyboard kit
   (4 KeyboardShortcut nodes) and Counters. Picked **story-engine**: fewer nodes, and buttons, a text input and
   navigation are what a phone app has. Neither template is visual-only: both are mostly logic (Functions, Conditions,
   Set Variables, States, Static Data).
2. **The plan can be read without the React printer.** `emitApp(ir, catalog)` calls `planProject(ir, catalog)` first,
   and `planProject` is a public export of the package. Its `ComponentPlan` carries `roleOf`, `childrenOf`,
   `bindings`, `handlers`, `repeaters`, `stateVars`, `statesMachines`, `instanceLifted` as data. The style layer
   (`computeNodeStyle`, also exported) reduces a node to CSS declarations: 29 distinct properties over story-engine's
   45 drawn nodes. The Swift printer reads both and calls nothing in `component.ts`.
   **One leak found:** the page collapse's style merge is decided in `component.ts`, not the plan, so the Swift printer
   copies it (8 lines). Filed as `P18-EXP022-S1-COLLAPSE` (low).
3. **The backend route: one client in two hosts works.** The client the React export writes (`src/lib/noodl.ts` and
   `src/api/client.ts` of todo-list with a backend declared; 822 lines of TypeScript, bundled by esbuild to one 26 KB
   script) runs unchanged in a `JSContext`. The host adds `fetch` bridged to `URLSession` (~25 lines of Swift) and a
   `localStorage` object (~15 lines of JS, shared by both hosts). The Noodl Desk's own fake Parse backend
   (`tests/helpers/fake-parse-backend.js`, unchanged) is put behind a real HTTP port. One scenario — `whoAmI` signed out
   and as Ann, `Records.query` with a pointer and a date, `Users.Current`, `addTask` then a re-query, a record-verb
   `query`, a refused class, a refused Cloud Function, a signed file link — runs in Node and in the Swift `JSContext`:
   **identical results, and a byte-identical wire log (9 requests)**. So S3 needs no hand-written Swift client.
   Evidence: [`exp-022/s1/jsc-spike/`](exp-022/s1/jsc-spike/) (`out-*.json`, `log-*.json`, and the files to re-run it).

**What the Swift page shows, and what it does not.** It draws the runtime's chrome: the eyebrow, the passage rule
with its States-chosen tone, the "What you carry" card, both pill buttons, and the footer. It does not draw the passage, the
choices or the source line. The React export loses the first two to the same plan refusals: its `Read.tsx` places
`<Passage />` with no props, and its choices are a TODO. The source line is the one thing React draws and Swift S1 does
not: React runs `/Story/Source` as a hook (EXP-021), and Swift runs logic components in S2. The React export's page was
read from its source, not rendered; no React screenshot was taken.

**The preflight** (`EXPORT-PREFLIGHT.md` in the package, from `swiftPreflight` data): story-engine 21 plan refusals (the
same nodes the React export leaves out, the same reasons), 7 things the Swift printer reads and does not print yet
(by name), and 4 kinds of web-only look (the project stylesheet's classes, `useLabel`). The count is not the React
preflight's "64": that one counts dropped wires and emit notes too.

**How general it is already.** With no template-specific code, pixel-game and todo-list also emit and `swift build`.
todo-list (51 files) was red first and showed five printer defects. All were fixed in the session: arguments out of
declaration order, a prop called `rows` shadowing a helper, port names with spaces, a prop called `body`, and a frame
after an `if`. Its preflight is S2's work list: 108 plan refusals and 334 Swift-side gaps, chiefly logic components
not run (48 placements, 36 components), lifted values left empty (76), press actions not printed (state-set 44,
states-go 45, jsfun-run 12, store-set 8, api-call 3, branch 2), and 35 bindings from `jsfun-out` (25) and
`states-out` with a field other than `value` (10).

**The rule changes from §3:** Page/Router/Navigate is a `switch` over a `Route` enum in an `ObservableObject`, not
`NavigationStack`. A Router replaces the page, and a push stack is Page Stack's meaning. The app is a Swift package
(everything a person edits; `swift build` and `swift test` on macOS) plus a generated `.xcodeproj` whose one source is
the `@main` file. The `.xcodeproj` is there because a package cannot make an installable iOS `.app`, and the box has
no xcodegen.

**Cost, so far:** 1 session. The printer is 1,447 lines (`theme` 173, `modifiers` 272, `view` 389, `emitSwift` 216,
`support` 112, `xcodeproj` 285), plus a 123-line test (7 cases, one of them a real `swift build` behind
`NODEGX_SWIFT_BUILD=1`). For comparison, `component.ts` alone is 8,828 lines. `plan.ts` was read, not changed.

**Not done in S1:** `nodegx export --target swift` on the CLI. It touches `cli/args.ts` and its `USAGE`, which the
React session's suites assert on, so it moves to S2 with that suite. No scripted drive in the simulator yet (S4).

