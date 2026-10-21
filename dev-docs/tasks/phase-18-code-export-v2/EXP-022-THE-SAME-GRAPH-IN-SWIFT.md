# EXP-022 — The same graph in Swift

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), from Richard's ruling of 2026-10-21: "I want that offramp promise
fulfilled in React and Swift." **Status: ⬜ scoped, not started.** Takes [P110](../phase-110-the-app-in-your-pocket/README.md)
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
