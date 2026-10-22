# EXP-022 S6: adding a task and closing one, in both exports

The account is in [EXP-022 §9 S6](../../EXP-022-THE-SAME-GRAPH-IN-SWIFT.md). Richard ruled first (2026-10-22): fix the
two writes S4 found neither export could make, then the stores, then the reveal. This folder is S4's drive, copied and
run again after the fixes. [`EXPECTED.md`](EXPECTED.md) was written before any arm was driven.

**The picture to read:** [`side-by-side.png`](side-by-side.png). It shows the running app, the React export and the Swift
app at 390 points wide: after adding "Pick up the dry cleaning", with the note dialog open on "Write the release notes",
and after a note and "Close task".

## The result (`compare.py` → `compare.json`)

| step | the running app | the React export | the Swift app |
|---|---|---|---|
| D1 sign in | `List (3)` `Today (2)` `Done (1)` | the same | the same |
| D3 add | `List (4)`, the task fourth; `POST /classes/Task 201`, `POST /classes/Event 201`, five lists read again | **the same, request for request** | **the same, request for request** |
| D4dialog the ✓ | the note dialog over the dimmed list: "What happened?", its field, Cancel, "Close task" | **the same** | **the same** (a full-screen cover) |
| D4 a note, then Close task | `PUT /classes/Task/<id> 200`, `POST /classes/Event 201`, five lists read again; `List (3)`, `Done (2)` | **the same** | **the same** |
| D5 relaunch | signed in, `List (3)` `Done (2)` | the same | the same |
| D6 sign out, relaunch | the Sign in page, both times | the same | the same |

**At every step all three read the same tabs and rows and send the same writes.** S4's line ("the Swift app reads and
sends what the React export does") now holds with the running app as the third column. The reads that differ are S4's:
the runtime asks for `Task` once more at sign-in and `GET /users/me` at a relaunch.

The running app closed on the first press this time (`pressedAgain: false`); S4's P18-EXP022-S4-FIRSTPRESS did not recur.

## What it took (three defects, not two)

1. **The dialog's switch** (`P18-EXP022-S4-DIALOGREFUSED`). `Todo/Dialog flow`'s States node leaves its heading, help and
   OK empty in the state `none`. The runtime reads an empty text as `''` and an empty boolean as `false` on both its
   roads (`typedStateValue`, P107-D19); the plan now does too. A number or a colour left empty still refuses (0 on a
   jump, undefined on a move). **Then measured, not predicted:** the switch's values go into a *placed* component (Note
   dialog), and Pass 4f had no binding for a States value into a placed component's input. Added, for States reads only.
2. **A record's Id** (`P18-EXP022-S4-ADDREFUSED`). Inside a Create's or an Update's Done chain the Id is the awaited
   answer's id (`verb-id`). It reaches:
   - a Function only verbs' Ids feed, read at each run from the verb whose Done runs it (Write history's "Remember it";
     a Function whose own chain is open feeds the same way, its `pending`);
   - a placed component's input, as a row written before the Done chain, so the pulse the chain sends arrives in the
     same commit (Add task → Write history's `taskId`);
   - a relation verb (RECORD-VERBS-TARGET §4c's designed chain-local read, now built).

   A read anywhere else refuses the reader by name; a Delete's Id stays refused. Write history also needed **Set as
   Object** over a Function output that only object literals write (the runtime converts only a string).
   Write history is placed by 19 commands: every history line in both exports was being lost, not only Add's.
3. **The dialog drew below the page** (`P18-EXP022-S6-NOOVERLAY`, found by this drive). The scrim is `position: fixed`
   with its `top`, `left` and colour in its CSS Style, which the export dropped. React now reads CSS Style as the
   runtime does (`readStyleCss`) and puts it in the class after the ports. Swift prints the full-screen fixed scrim as a
   full-screen cover (`fixedOverlay`). Any other fixed element stays a named loss.

## What I predicted wrong

- **Add and close on the first run.** Predicted both working after the two plan fixes. Add did. Close needed two more:
  the switch's values into the placed dialog (it opened nowhere), then the overlay (it opened below the fold). The first
  I would have found by reading the printed `DialogFlow.tsx` before driving; the second only a drive shows.
- **The Swift drive's first rerun** stopped at D3: iOS's "Save Password?" sheet came after the drive's five-second wait
  and covered the add field. `Drive.swift` now answers it whenever it comes, from the app or the system.

## The cost (the Swift tally, §7's number)

The fixes are in the plan and both printers. By the ruling they are counted as shared planner work, named apart:

| | lines (`git diff --numstat`, added / removed) |
|---|---|
| the plan (`plan.ts`, `jsfun.ts`) | +244 / −20 |
| the React printer (`component.ts`, `style.ts`) | +70 / −7 |
| the Swift printer (`view.ts`, `modifiers.ts`, `support.ts`) | +45 / −8 |

The Swift printer's share is 37 net lines; the rest is shared work, and both exports gained the same three writes from it.

## Re-running

S4's, from this folder. Heavy: check `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and the lab's `series-*.log` first,
as its own step, before each.

```sh
./build.sh && ./build-web.sh
node drive-swift.cjs && node drive-web.cjs
python3 compare.py && node sheet.cjs
xcrun simctl shutdown CF38CA15-0E0F-4EDD-A8FE-BFC642026A36
```
