# EXP-022 S4: todo-list driven in the simulator, against a real backend

The account is in [EXP-022 §9 S4](../../EXP-022-THE-SAME-GRAPH-IN-SWIFT.md#s4--swift-session-4-of-at-most-12-2026-10-22-opus-55).
This folder holds what it rests on. [`EXPECTED.md`](EXPECTED.md) was written before any arm was driven.

**The picture to read:** [`side-by-side.png`](side-by-side.png). It shows the running app, the React export and the Swift
app at 390 points wide. The rows are opened signed out, signed in as Ann, and after closing "Write the release notes".

## The drive

`templates/todo-list`, copied and bound to a real `nodegx-backend` from `src` on :8644. The backend runs the template's
own policy, and the account is seeded through the REST API exactly as s137's is (`backend.ts`, a copy of s137's on its own
port). **Every arm gets its own fresh backend** (`backend-arm.cjs`), so each starts from the same rows. The wire of every
arm is that backend's own request log, split by the time of each reading. A query is tunnelled as `POST` with
`_method: 'GET'`, so `POST /classes/Task 200` is a query and `201` a create.

- **swift**: `nodegx export --target swift` from the tree's `src` (`build.sh`), then `xcodebuild build-for-testing` for the
  simulator. [`Drive.swift`](Drive.swift) is copied into the printed `TodoListUITests/` folder and run by
  `xcodebuild test-without-building` on the iPhone 17 simulator (iOS 26.3), after the app is uninstalled (a fresh install).
  It presses by label and placeholder, as a person finds things. It uses a node id only for the ✓ (no words on it,
  so it takes the ✓ level with the task's title) and the dialog's OK (its label is bound). Each reading is every text
  and button accessibility exposes ([`drive-swift.cjs`](drive-swift.cjs)).
- **runtime**: `render-from-disk.js` on the bound copy, in headless Chrome at 390 × 844 ([`drive-web.cjs`](drive-web.cjs)).
  The viewer bundle was built at 07:42 today (s137's rebuild). One viewer file changed since (`deploy-config.ts`,
  12:23). The arm signs in and reaches the backend, so the bundle reads this app.
- **react**: the tree's React export of the same copy, `npm run build` against s137's installed npm packages
  ([`build-web.sh`](build-web.sh)), in the same Chrome.

The steps: D0 open; D1 sign in through the page; D2 the list; D3 add "Pick up the dry cleaning"; D4 close "Write the
release notes" (its ✓, a note, the dialog's OK); D5 relaunch (Swift: terminate and launch; web: reload); D6 Sign out, then
relaunch. There is no "delete" in the app as it ships (EXPECTED.md).

## Measured first

- **App Transport Security lets plain `http` to 127.0.0.1 through.** No `Info.plist` key is needed: the app as printed
  sent nine queries to the backend, every one 200. So the printer gained no `NSAllowsLocalNetworking`.
- **The drive is an XCUITest in the printed project**, not the package's macOS `Drive`. The controls are real SwiftUI
  `Button`s and fields, which accessibility reads by label, and an XCUITest presses them on the phone the app ships to.
  The printer now writes a UI test target whose sources are the folder `TodoListUITests/`, an Xcode 16 synchronized
  folder, so any `.swift` file dropped there is a UI test. The autocreated `TodoList` scheme builds and runs it, so no
  shared scheme file is written. The export's own launch test forwards the run's `VITE_NODEGX_*` variables to the app
  (`TEST_RUNNER_VITE_NODEGX_ENDPOINT=… xcodebuild test`).

## The result (`compare.py` → `compare.json`)

| step | the running app | the React export | the Swift app |
|---|---|---|---|
| D0 open | Sign in, fields labelled Email and Password | Sign in, **two unlabelled fields** | Sign in, labelled (after this session's fix) |
| D1 sign in | Todo: `List (3)` `Today (2)` `Done (1)`, MOT / VAT / notes | the same | the same; iOS offers "Save Password?", answered "Not Now" |
| D1 wire | `/login`, 9 queries + `Task` again (11) | `/login`, 9 queries (10) | **the same 10** |
| D3 add | `List (4)`; `Task 201`, `Event 201`, lists read again | `List (3)`, **no request** | **the same: no request** |
| D4 close | the dialog, then `PUT /classes/Task/<id>`, `Event 201`; `List (3)` `Done (2)` (on the second press) | **no dialog**, no request | **the same: no dialog** |
| D5 relaunch | signed in, the list back (`GET /users/me` + the queries) | signed in, the list back (9 queries) | **the same 9** |
| D6 sign out, relaunch | `POST /logout`; Sign in, and still after relaunch | the same | the same |

**At every step the Swift app reads what the React export reads, and sends the same requests.** The one difference is
the Sign in labels. Swift draws them now; the React export does not (P18-EXP022-S4-LABELDROP). Where both exports
differ from the running app, the difference is the plan's, shared, and named in both preflights:

- **Add** is refused: `Commands/Add task` "Add the task", "its Id output is consumed" (P18-EXP022-S4-ADDREFUSED, high).
- **Every dialog** is refused: `Todo/Dialog flow`'s seven States nodes leave `heading` unauthored in the state `none`
  (P18-EXP022-S4-DIALOGREFUSED, high). That loses close, reopen, tick and untick, a routine's tick and stop.

Neither is a Swift printer defect. `plan.ts` is the React lane's, so both are filed for it with this drive as evidence.

### What I predicted wrong

- **D3 and D4 in both exports.** I predicted add and close working in all three. I had not read the preflight's plan
  refusals for `Commands/Add task` and `Todo/Dialog flow` before predicting. That is s137's lesson again: read the
  emitted page's refusals before driving.
- **The runtime's close.** I predicted one press. It takes two: the first press on "Close task" after a typed note does
  nothing (P18-EXP022-S4-FIRSTPRESS, the runtime or the template, not the export). Measured three ways: a synthetic
  click, one real press, and two real presses. Only the last closed it.
- **The Swift app drawing "Also keep track of projects and money".** I recorded it as a difference to read. It was a Swift
  printer defect (P18-EXP022-S4-MOUNTEDFALSE, fixed): an authored Mounted false node was drawn.

## Changed in the printer (`packages/nodegx-export/src/emit/swift/`)

- **A Text Input a phone can use** (P18-EXP022-S4-SIGNINFIELDS, found by reading the printed Sign in page before the
  drive): `password` prints `SecureField`; `email`, `url` and `number` choose the keyboard (`.inputKind`, iOS only);
  `useLabel` draws the label above the field and names it for a screen reader; a bound `placeholder` is read. The five
  label parameters left the "looks a phone has no counterpart for" list.
- **Authored Mounted false is not drawn** when the plan carries no Mounted wire, as the React printer does (P18-EXP022-S4-MOUNTEDFALSE).
- **Every drawn Text and Button carries its graph node id as its accessibility identifier**, and every field its own.
- **The UI test target** (`xcodeproj.ts`: `objectVersion 77`, a synchronized `<App>UITests/` folder, `TEST_TARGET_NAME`,
  the dependency on the app) and its launch test (`emitSwift.ts`).

Graded by `tests/the-same-graph-in-swift-s4.test.ts` (9 rows). Six mutants, each killed by the row named for it (M1
password, M2 the label, M3 the web-only list, M4 Mounted false, M5 the UI target, M6 the bound placeholder). M2's first
form did not compile and read "0 total". It was re-run in a form that compiles, and killed A2.

## Re-running

Heavy: check `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and the lab's `series-*.log` before each of these.

```sh
./build.sh            # export the bound copy to work/swift, add Drive.swift, xcodebuild build-for-testing
./build-web.sh        # the React export of the same copy, built (needs s137's work/deps)
node drive-swift.cjs  # readings-swift.json, shots/swift-*.png (boots the iPhone 17 simulator; shut it down after)
node drive-web.cjs    # readings-runtime.json, readings-react.json, shots/{runtime,react}-*.png
python3 compare.py && node sheet.cjs
xcrun simctl shutdown CF38CA15-0E0F-4EDD-A8FE-BFC642026A36
```

`shots/` keeps D0, D1 and D4 per arm. The other steps' screenshots are written there too on a re-run.
