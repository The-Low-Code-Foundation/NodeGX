# EXP-022 S4, todo-list driven on one backend: predicted before the drive ran (2026-10-22, Opus 5.5)

## The subject

`templates/todo-list`, copied and bound to one real `nodegx-backend` from `src` on :8644, running the template's own
policy (`todo-list.security.json`), seeded by `backend.ts` exactly as s137's (four tasks, two next actions, one history
line, one routine; one account, Ann).

## Measured before this file (not predictions)

- **App Transport Security lets plain `http` to 127.0.0.1 through.** The app as printed (no `Info.plist` key), launched
  in the iPhone 17 simulator with a session written into its own `io.nodegx.localStorage` preferences, sent nine
  queries (`Task`, `Project`, `Action`, `Event`, `Routine`, `RoutineCheck`, `MoneyItem`, `MoneyMark`, `BalanceReading`),
  every one answered 200 as the user. No `NSAllowsLocalNetworking` needed for the loopback address.
- That launch drew `List (3)` `Today (2)` `Done (1)` `Log` `Sign out`, the three open tasks with "Next: Ring the garage"
  and "Due today" (`work/m0-session-seeded.png`, not committed).
- **There is no "delete" in the app as it ships.** §8's "delete one" came from the phone-only cut. A task is closed
  (the circle on its row, then a "What happened?" note dialog and its OK), and closing is the step driven in its place.
- Read on the printed Sign in page: both fields are `TextField("")`. The password shows in clear, neither field says
  which it is (`useLabel` + `label` are filed as "looks a phone has no counterpart for"), and the email field
  capitalises its first letter on a phone keyboard. Fixed before the drive (see README), so the drive signs in through
  labelled fields.

## The arms

- **swift**: the bound copy exported by `nodegx export --target swift` (the tree's `src`), built by `xcodebuild` for the
  simulator, driven by an XCUITest (`Drive.swift`) on the iPhone 17 simulator (iOS 26.3): presses by label, reads every
  text and button label accessibility exposes.
- **runtime**: `render-from-disk.js` on the bound copy, in headless Chrome.
- **react**: the bound copy exported by the tree's `src` (React), `npm run build`, served, in the same Chrome.

## The steps and the predictions

| step | all three arms (where one differs, it says) |
|---|---|
| D0 open (a fresh install / a fresh browser profile) | the Sign in page: "Todo list", the lead line, an Email field, a Password field, "Sign in", "Create account" |
| D1 sign in as Ann | the Todo page. Wire: `POST /login`, then a query each of `Task`, `Action`, `Event`, `Routine`, `RoutineCheck` and `Project`, `MoneyItem`, `MoneyMark`, `BalanceReading` (the runtime may ask `Task` once more, as in s137) |
| D2 the list | `List (3)` `Today (2)` `Done (1)` `Log`; MOT · "Next: Ring the garage"; VAT · "Due today"; "Write the release notes" |
| D3 add "Pick up the dry cleaning" (the field, then Add) | `List (4)`, the new task fourth; the field empty again. Wire: a `Task` create, an `Event` written ("Added the task"), `Task` read again |
| D4 close "Write the release notes" (its circle, then the dialog's OK) | the dialog shows the "What happened?" field, Cancel and one other button; after OK: `List (3)` (MOT, VAT, dry cleaning), `Done (2)`. Wire: an update of that `Task`, an `Event` written, `Task` read again |
| D5 relaunch (swift: terminate and launch; web: reload) | still signed in, straight onto the Todo page: `List (3)`, `Done (2)`, the same three rows in the same order |
| D6 Sign out, then relaunch | the Sign in page, and still the Sign in page after the relaunch (the session is gone from the device) |

## Not predicted to agree (recorded, not graded)

- The look (s137: the runtime opens dark and two-column; both exports light and one column on a phone width).
- "Also keep track of projects and money": the Swift app draws it (seen in the measured launch); s137's React export
  did not. Read, not graded.
- The order of a detached call's request against a press's later wires (S3's one known difference).
- The add field's placeholder: the graph binds it ("Add a task (it goes in at #4)" in the runtime); Swift prints the
  literal "Add a task" (read on the printed `TaskListView`). Recorded.
