# EXP-022 — The same graph in Swift

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), from Richard's ruling of 2026-10-21: "I want that offramp promise
fulfilled in React and Swift." **Status: 🔵 Swift session 5 of at most 12 done (2026-10-22, §9): S1 met AC1 on story-engine; S2 printed the plan's logic with the Functions in JavaScriptCore; S3 carried the backend through the React export's own client; S4 drove todo-list on the iPhone 17 simulator against a real backend, beside the running app and the React export: the Swift app reads and sends what the React export does at every step, and the two writes both exports cannot make (add, and every dialog) are the plan's, filed; S5 put AC4's line on P18's ledger beside React's (2 of 85 conform, 5 played, each with React's very trace; the 13 React plays and Swift does not are the `@nodegx/core` stores §7 cut) and wrote the cost: 5 sessions and 3,575 printer lines, nine decisions copied from the React printer. Next: AC5, the reveal (one project, web and phone, the numbers S4 and S5 measured), for Richard to read; whether a slack session carries the stores (as S3 carried the client) is his call. Ruled 2026-10-22 (§8, DIRECTION D6): the bounded cut with the backend, hard stop at 12 sessions.** Takes [P110](../phase-110-the-app-in-your-pocket/README.md)
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


### S2 — Swift session 2 of at most 12 (2026-10-22, Opus 5.5)

**Result: the plan's logic prints in SwiftUI, the Functions run in JavaScriptCore, and the Hook Desk reads exactly what
the runtime reads, at every one of its ten readings, on the first build.** Graded by `swift test` on macOS, no simulator:
`tests/the-same-graph-in-swift-s2.test.ts` §A drives the desk's nine presses in the exported app
(`tests/helpers/export-swift-arm.ts`) beside the runtime's own nodes (`runtime-mounted-arm.js`), the same arm and the
same steps `a-logic-component-is-a-hook.test.ts` grades React with. Evidence: [`exp-022/s2/`](exp-022/s2/).

**How React's model maps, and why the plan printed unchanged.** Every construct the React printer writes for a component
has a SwiftUI one with the same timing:

| React (the web export) | SwiftUI (`src/emit/swift/view.ts`) |
|---|---|
| `useState` | `@State` |
| `useRef` | a `Ref` kept in `@State` |
| `useEffect(…, [deps])` | `.onChange(of: Same(deps), initial: true)` (`Same`: JavaScript's equality over graph values) |
| `useMemo` (a render run) | a `Memo` kept in `@State`, read in a computed property |
| a logic component, `use<Name>(props)` | `<Name>Logic`, a view that draws nothing, placed in the page's `.background` |
| a Function's body | the body verbatim in one `JSContext` (`Scripts.swift`), one `.js` file per Function |
| `functionRun.ts` | the same file compiled to JavaScript (`functionRunJs.ts`, a test fails when the two differ) |

**One measurement says the claim is not a coincidence.** The plan delays a pulse one update when a value lifted beside it
must arrive first (P18-S127-SIBLINGVALUE, an `instancePulses[].delivered` row). Printed without the delay, SwiftUI reads
`echo undefined` where the runtime reads `echo total 1`, the failure React had. So that rule is about "state drives the
view and effects run after", which both frameworks share, not about React. Two mutants (the delivered effect removed; the
pulse's taken-guard removed) each move the readings, so §A can fail (`exp-022/s2/README.md`).

**todo-list, S2's work list.** It builds (`swift build`) with all 36 logic components and all 64 Function bodies, and its
own generated `swift test` draws the first page and loads every Function with no JavaScript error. The Swift-side gaps
went **334 → 44**, and each of the 44 is either the backend, which is S3 (39: record verbs, queries, session reads, the
one body that reads `Noodl`), or one of 5 For Eaches the plan feeds no items, which the React export does not draw
either. Printed in S2, by count: press actions (`state-set`, `states-go` with the States queue and listeners,
`jsfun-run` with pulses, `store-set`, `branch`, `field-focus`), lifted values (one closure when a lift has several rows,
React's `combinedLifted`), `jsfun-out` and `states-out` reads, push, sync, value-changed, input-pulse and ticked-run
effects, a Function's late writes (the minute clock), Static Data, Global Variables (`Variables.swift`, one
`@Published` each), and field writes and blurs through one `@FocusState`.

**AC3, the scripts.** Every Function body travels, run or not (four are carried and not run: two the plan defers, as
React does, and two that run only in chains behind the session, S3). The ten that touch the browser, EXP-019's
classifier's count and P110's, are named in the pre-flight before anything is written. They run: the host gives
`window` (the global object), `setTimeout`/`setInterval` and a `localStorage` kept in `UserDefaults`, so "remember the
choice on this device" works on a phone; `document`, `location` and `matchMedia` are not there.

**`nodegx export --target swift <project> <output>`** writes the package; `--dry-run --target swift` prints its
pre-flight. `--target react` is the default, so no existing command changes.

**What the second printer had to copy from the first** (the question §7 asks; filed as `P18-EXP022-S2-EMITDECIDES`,
low): which Functions keep a node (`pulsedRunIds`), which reads are render runs and that they are memoised (LIFTLOOP),
`expandActions`' flattening rules, `combinedLifted`, which runs get a `late` handler, and which fields a chain focuses.
Each is a few lines in Swift; each is decided in `component.ts`, not in the plan, like S1's COLLAPSE. None changed
behaviour; all are places where the two targets can drift.

**Also fixed in S1's printer** (filed, fixed): a States table typed every value as text, so a boolean `false` read true
(`P18-EXP022-S2-STATESTYPE`); and a placement coerced each input to its declared type at the boundary, so undefined
became `""` or `0` and a number became text (`P18-EXP022-S2-PROPCOERCE`). Props now hold the graph's value as it is and a
sink coerces it, as JavaScript does. Found and fixed before commit, not filed: one `body` too large to type-check
(printed in stages now) and a stack of more than ten children (a placement's four lifts, now one closure).

**Cost, so far:** 2 sessions. The printer is 2,781 lines (S1 1,447): `view` 1,056, `support` 392 (Swift text), `emitSwift`
301, `scripts` 290 (Swift and JavaScript text), `xcodeproj` 285, `modifiers` 272, `theme` 173, `functionRunJs` 12
(generated). Tests: 25 rows (8 behind `NODEGX_SWIFT_BUILD=1`), and an 83-line arm. `plan.ts` was read, not changed.

**One thing to say plainly:** an OWN-026 grade (t1-nodegx-1) ran 15:56–16:25 and my `nice -n 19` Swift builds overlapped
it from about 16:01; I checked the lab log at the start of the session (a build round then) and not again before each
build. Its six fails are product findings (no access control, a stale second click, the last-ten window), not timeouts.


### S3 — Swift session 3 of at most 12 (2026-10-22, Opus 5.5)

**Result: the backend goes through the one client.** The Swift app carries the React export's own client files, their
types taken out, into its JavaScriptCore context. A Function that awaits `Noodl.Records.query`, a record verb, a query,
Log In and Log Out and the session read all reach the backend through that client. Graded by `swift test` against the
fake Parse backend the Noodl Desk uses, on two desks: the Swift app reads what the React export reads at every step,
and sends the same requests with the same bodies, in order. todo-list's Swift gaps went **44 → 5**; the 5 are For Eaches
the React export does not draw either. Evidence: [`exp-022/s3/`](exp-022/s3/).

**The client in the host, decided by measuring.** The React export writes the client per project: the endpoint and app
id, a schema table, one module per collection, and sections switched on by what the graph uses (a live record changes
how `update` answers). So a constant JavaScript copy, the way S2 ships `functionRun.ts`, would be a second client that
drifts. A bundler at export time is not there: the published package has no esbuild and no TypeScript. Node itself takes
the types out (`module.stripTypeScriptTypes`, Node 22.13 and later; types become spaces, nothing else moves). The
client's module lines have one shape each, because the React printer writes them. So `emit/swift/client.ts` (137 lines)
turns each React file into one module the host requires by path (`api/client`, `lib/noodl`). A line of a shape it does
not know throws with the line. §C loads every template's client in a bare JavaScript context: 7 templates write one, all
load.

**What the host gained** (`Scripts.swift`, `nodegx-host.js`): `fetch` over URLSession, with a count of requests in flight
that `Drive.settle` waits on; `localStorage` as a Proxy over UserDefaults, read by method and by key (the client reads
`localStorage[key]`); `window.addEventListener` as a no-op (a phone has no other tabs); the app's environment as
`import.meta.env`, so `VITE_NODEGX_ENDPOINT` points the app at another backend without editing generated code; the
`Noodl` a body reads (the client's members, and each Variable it names over the app's own Variable); an api call by its
function's name (`updateTask`, `logIn`), awaited from Swift; and `Session`, React's `useSession` over the client's own
`readSession` and `subscribeSession`.

**How an awaiting chain prints.** A JavaScript async function runs until its first `await`. Swift's `Task` starts after
the code that made it, and `Task.immediate`, which would match, needs iOS 26. So a chain where nothing can wait (a press,
a callback, an effect) prints what comes before its first wait in place and the rest in a `Task` on the main actor. An
awaiting run splits inside itself: the run and its first signals' chains now, then `await Scripts.shared.settled(run)`,
then Success and Done, which read the node's outputs as the body left them. A detached call (§90) is its own `Task`, so the
click's later wires run first. **One difference is left, and it is said here:** a detached call's request is sent when
its `Task` starts, after the click's later wires, where the web app sends it before them. No graded scenario has a later
wire that also sends a request, so the wire logs cannot show it yet.

**Printed, from todo-list's work list:** `api-call` (20: the record verbs and Log In, Sign Up, Log Out; the done chain in
the `do`, then the catch writes the Error row, raises and runs the Failure chain, as React's try/catch does), a query's
rows as its state with its Fetch (`query-fetch` 7, sent at the pulse with the wired filter values read then, the
translator's `where` built in the host from the plan's cases), a query's mount and on-value effects, `query-get` (the 6
pushes), `session-get` (4 Conditions), a Variable seeded on mount (§67), the Function that reads `Noodl`, and a For Each fed
by a query or by Static Data.

**Graded** (`tests/the-same-graph-in-swift-s3.test.ts`, 20 rows, 13 behind `NODEGX_SWIFT_BUILD=1`):

- **§A the Noodl Desk**, ten steps, signed in and signed out, three arms on one fake backend: the Swift app equals the
  runtime's own nodes (but the word "Text", P18-S122-TEXTDEFAULT) and the React export at every reading. Its wire equals
  React's, 11 requests body for body, and the runtime's but for the two no export sends. Green on the first build.
- **§D the Record Desk** (`helpers/record-desk.ts`, new): a Fetch-only query drawn by a For Each, create, update and delete
  (each Done fetches again), Log In right and wrong, a write whose Id is a Variable nothing sets (Missing Record Id), Log
  Out, the User node's Authenticated and Username. The readings were predicted before either arm ran. The Swift app reads
  exactly the prediction. The React export reads it too, but for one Text (below). The wire is the same 11 requests.
- Four mutants: three killed, one equivalent on a local backend (`exp-022/s3/README.md`).

**Found, filed:** `P18-EXP022-S3-BOOLTEXT` (low, open, the React session's): the React export prints a Text wired from the
User node's Authenticated as `{session.authenticated}`, and React draws a boolean child as nothing. The running app draws
`true` or `false` (`renderableText`). Swift draws what the runtime draws. Pinned by name in §D.

**Changed in shared test helpers, additively:** `fake-parse-backend.js` answers the record writes and the user routes
(create, update, delete, `/login`, `/logout`, `/users`); nothing the Noodl Desk asks moved. `export-react-arm.js` takes
`allowErrors`, the console errors a scenario provokes on purpose (a refused write's raise). S2's §C now reads 5 gaps, and
its C2 was wrong: "Which task did the link ask for" runs behind the session Condition in React, not "deferred by the
plan". It runs in Swift now too.

**Cost, so far:** 3 sessions. The printer is 3,363 lines (S2 2,781): `view` 1,223, `scripts` 541, `support` 397,
`emitSwift` 323, `xcodeproj` 285, `modifiers` 272, `theme` 173, `client` 137, `functionRunJs` 12. Tests: S3's 20 rows, a
131-line desk, a 44-line server for the fake backend, the backend arm (about 120 lines). `plan.ts` and `component.ts` were
read, not changed.

**Not done in S3:** todo-list run against a backend (S4 drives it in the simulator). A collection-fed For Each (the app's
Collections are not carried). A slow backend: `Drive.settle` waits for requests in flight, but no mutant could show that
on a local one.


### S4 — Swift session 4 of at most 12 (2026-10-22, Opus 5.5)

**Result: todo-list is driven on the iPhone 17 simulator against a real backend, beside the running app and the React
export. At every step the Swift app reads what the React export reads and sends the same requests.** The steps are: sign
in through the page, the list, add a task, close one, relaunch, and sign out then relaunch. Where both exports differ from
the running app, the plan refuses the node in both, and both preflights say so. The evidence is
[`exp-022/s4/`](exp-022/s4/) ([`side-by-side.png`](exp-022/s4/side-by-side.png) is the picture to read).

**How it was driven, decided by measuring.**

- **App Transport Security** lets plain `http` to 127.0.0.1 through, so the printer gained no `Info.plist` key.
- **XCUITest, not the package's macOS `Drive`.** The controls are real SwiftUI buttons and fields, which accessibility
  reads by label, and an XCUITest presses them on the phone the app ships to. So the printed project has a UI test target
  now, whose sources are the folder `<App>UITests/` (a synchronized folder, Xcode 16 and later): a drive is a `.swift` file
  dropped there. The autocreated scheme runs it, so no scheme file is written. The export's own launch test hands the
  run's `VITE_NODEGX_*` variables to the app.
- **Each arm has its own fresh backend** (s137's seeding, on :8644). The wire is the backend's own request log, split by
  the time of each reading, so the three arms are read by one instrument.

| step | the running app | the React export | the Swift app |
|---|---|---|---|
| open | Sign in, fields labelled | Sign in, **two unlabelled fields** | Sign in, labelled |
| sign in | `List (3)` `Today (2)` `Done (1)`, the three tasks; `/login` + 10 queries | the same; `/login` + 9 queries | **the same 9**; iOS offers "Save Password?" |
| add a task | `List (4)`; `Task 201`, `Event 201` | **nothing sent** | **the same** |
| close a task | the note dialog; `PUT Task`, `Event 201`; `Done (2)` | **no dialog** | **the same** |
| relaunch | signed in, the list back | the same | the same |
| sign out, relaunch | Sign in, both times | the same | the same |

**What both exports cannot do is the plan's, and neither is Swift's.** Add a task: Create's Id output is used further
down the chain, so the plan refuses the Create (`P18-EXP022-S4-ADDREFUSED`, high). Every dialog in the app: the seven
States nodes that pick a dialog leave `heading` unauthored in the state `none`, and the plan refuses a States node with
any unauthored value (`P18-EXP022-S4-DIALOGREFUSED`, high). That loses close, reopen, tick, untick, and a routine's tick
and stop. The runtime takes `undefined` (or `0` for a number) there. Fixing it changes the type both printers read, so
it is the React lane's (`plan.ts`, `component.ts`), filed with this drive as its evidence. This is the claim's own
finding: the second printer added no gap here; it inherited the plan's.

**Found in the printer and fixed:**

- **The Sign in page a phone can use** (`P18-EXP022-S4-SIGNINFIELDS`, found by reading the printed page before the
  drive). Every Text Input printed as a plain field: the password in clear, neither field named, an email keyboard that
  capitalises. Now `password` prints `SecureField`, `email`/`url`/`number` choose the keyboard (iOS only), and `useLabel`
  draws the label above the field and names it for a screen reader. A bound placeholder is read too. The React export
  drops the label as well, in 153 fields over 7 templates (`P18-EXP022-S4-LABELDROP`, open, the React session's).
- **An authored Mounted false node was drawn** when the plan carries no Mounted wire. The app showed a dead "Also keep
  track of projects and money" (`P18-EXP022-S4-MOUNTEDFALSE`). Fixed with the React printer's rule, one more decision a
  second printer copies (`P18-EXP022-S2-EMITDECIDES`).
- Every drawn Text and Button carries its graph node id as its accessibility identifier.

**Found and filed, not chased:** in the running app, the first press on "Close task" after typing a note does nothing;
the second closes it (`P18-EXP022-S4-FIRSTPRESS`, the runtime or the template). The Swift Todo page runs its detail card
past the right edge (`P18-EXP022-S4-CARDOVERFLOW`, low; the page's two-pane layout is a web-only look).

**What I predicted wrong:** I predicted add and close in all three arms. I had not read the preflight's refusals for
`Commands/Add task` and `Todo/Dialog flow` first: s137's lesson again.

**Graded:** `tests/the-same-graph-in-swift-s4.test.ts`, 9 rows on the printed text. Six mutants, each killed by its own
row. With `NODEGX_SWIFT_BUILD=1` the four Swift test files read 54 of 54 (todo-list builds and passes `swift test` on a
Mac with the new helpers). The whole package (`nice -n 19 --runInBand`, 18:28): **161 of 161 files, 5,339 passed, 24 skipped, 0 failed** (predicted 5,330 + 9, read on the first run).

**Cost, so far:** 4 sessions. The printer is 3,555 lines (S3 3,363): `view` 1,255, `scripts` 541, `support` 415,
`xcodeproj` 401, `emitSwift` 349, `modifiers` 272, `theme` 173, `client` 137, `functionRunJs` 12. Tests: S4's 9 rows.
The drive (outside the package, as s137's): a 148-line XCUITest and about 440 lines of harness. `plan.ts` and
`component.ts` were read, not changed.

**Said plainly:** once, a peer's single jest file was running when I chained the box check into the build in one
command, so my `xcodebuild` overlapped it. After that the check was its own step and I waited for the peer each time.

**Not done in S4:** the two plan refusals (the React lane's). A collection-fed For Each. Signing, a real iPhone.


### S5 — Swift session 5 of at most 12 (2026-10-22, Opus 5.5)

**Result: AC4's line is on P18's ledger beside React's, and on every scenario both exports play, the Swift app's trace
equals the React export's, event for event.** Evidence: [`exp-022/s5/`](exp-022/s5/README.md).

```
P18 ledger (Swift): 2 of 85 graph scenarios conform on the Swift export — 5 played (2 conform, 3 differ as declared,
0 known rows, 0 fail on filed rows); 34 outside on the exporter's verdict (21 the plan's, 13 the Swift printer's),
46 on this harness's limits
```

**The prediction was written before the first run** ([EXPECTED.md](exp-022/s5/EXPECTED.md)) and the line read it exactly.
The S4 prompt's "Swift equals React's 10" was wrong before any run: React reads 11 today (s139), and measuring first
showed the Swift printer prints only 5 of React's 18 played graphs. The 13 others are the `@nodegx/core` stores and On
App Error, which §7's cut put out. So the difference between the two lines is the cut, and it is named scenario by
scenario.

**How it is graded, decided by measuring.** One `swift test` per scenario (S3's way) would cost about 7 s a scenario, 10
minutes at 85. Instead `tests/helpers/swift-graph-target.ts` prints every playable scenario as its own component of one
package and plays them all in one generated XCTest (9 s warm for all five). It then replays the recorded settles through
the runner's own `playGraph` with React's settle rule, so the grading is the runner's. The bounds are React's:

- The harness's limits are read off the React target's own `canPlay`, so the two harnesses are one.
- The plan's verdict is the plan's own notes. All 21 of React's exporter-verdict outsides are there, so the plan's
  verdict is one verdict, pinned word for word (V2).
- The Swift printer's verdict is what it reports it does not print.

C7, C8 and G1 carry `divergence.export` to the Swift target and are asserted as differences.

**Found:**

- `P18-EXP022-S5-NOROUTE` (fixed): a project with no routed page printed an empty `Route` enum, and Swift 6.2.4
  crashed compiling it.
- `P18-EXP022-S5-THROWDIVERGES` (open, the node-spec runner's): a target that throws reads "differs as declared" on every
  declared difference. The first run read "3 differ as declared" from a package that did not compile. The Swift line
  refuses to count a play that threw; React's line has the same hole.

**Printed:** Log (C10's only loss). Its Done chain is following statements, one more decision copied from React's
`expandActions`.

**Graded:** `tests/node-spec-graph-swift.test.ts`, 10 rows: 6 on the verdicts and printed text in the package suite, 4
behind `NODEGX_SWIFT_BUILD=1`. Three mutants on the printed Swift (`exp-022/s5/mutants.ts`): two killed, one equivalent,
as predicted. M3's C10 I predicted wrong (README). With `NODEGX_SWIFT_BUILD=1` the five Swift test files read 64 of 64. The
whole package (`nice -n 19 --runInBand`, 19:32): **162 of 162 files, 5,345 passed, 28 skipped, 0 failed** (predicted
5,339 + 6 and 24 + 4, read on the first run).

**The cost beside React's (§7's number).**

| | React | Swift |
|---|---|---|
| sessions | 140 so far | 5 |
| printer | `component.ts` 8,828 lines + 32 runtime helpers (15,843 lines) | 3,575 lines |
| graph scenarios | 11 of 85 | 2 of 85, each the same trace as React |

The plan (23,537 lines) is built by React's sessions and only read by Swift.

**Where the claim leaks:** nine decisions copied from `component.ts`, not read from the plan. They are COLLAPSE (S1), the
six of EMITDECIDES (S2), Mounted false (S4) and a Log's Done chain (S5). None has changed behaviour yet. **Where it holds:**
every refusal is the plan's and the same in both exports, and the second printer added none.

**Cost, so far:** 5 sessions. The printer is 3,575 lines (S4 3,555): `view` 1,265, `scripts` 541, `support` 421,
`xcodeproj` 401, `emitSwift` 353, `modifiers` 272, `theme` 173, `client` 137, `functionRunJs` 12. Tests: S5's 10 rows
and a 395-line graph target. `plan.ts` and `component.ts` were read, not changed.

**Not done in S5:** the stores in JavaScriptCore, the 13. The React export's own client already runs there (S3), and the
stores are JavaScript too; that is a measurement for a slack session if Richard wants the line wider. The runner's
THROWDIVERGES fix (P107's).
