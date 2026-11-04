# HTX-004: todo-list in Chrome, three arms, one fresh backend each

The account is in [README §10](../README.md#10-sessions), session 7. This folder holds what it rests on.
[`EXPECTED.md`](EXPECTED.md) was written before any arm was driven.

**The picture to read:** [`side-by-side.png`](side-by-side.png). It shows the running app, the React export and the
HTML export at 390 px wide, in three rows: the MOT pressed, after adding "Pick up the dry cleaning", and after closing
"Write the release notes".

## The drive

EXP-022 S6's harness, copied (`backend.ts`, `run-backend.cjs`, `backend-arm.cjs`, `sheet.cjs`), with a third arm.
`templates/todo-list` is copied and bound to a real `nodegx-backend` from `src` on :8644. The backend runs the
template's own policy, and the account (Ann, four tasks, two actions, a routine) is seeded through the REST API.
**Every arm gets its own fresh backend**, and every arm's wire is that backend's own request log, split by step.

- **runtime**: `render-from-disk.js` on the bound copy (the viewer bundle of 2026-11-03 14:03, newer than every
  runtime source commit).
- **react**: s137's `emit.ts` from the tree's `src`, `npm run build` against s137's installed packages.
- **html**: `nodegx export --target html` from the tree's `src`, served by `python3 -m http.server` in the folder.
  Nothing built, nothing edited: `env.js` is empty and `api/client.js` defaults to the project's own binding.

All three run in one headless Chrome at 390 × 844 (CDP device metrics), with a fresh profile per arm.

The steps: D0 open; D1 sign in through the page; D2 press "Book the van in for its MOT"; D2tickdialog its "Ring the
garage" ✓; D2tick a note, then "Tick off"; D2back "← Back"; D3 add "Pick up the dry cleaning", typed as "Pick up the
cleaning" and then "dry " put in at position 12 (HTX-003's cursor); D4dialog the release notes' ✓; D4 a note, then
"Close task"; D5 reload; D6 Sign out; D6relaunch reload. **There is no delete in todo-list**: its graph has 5 Create
and 17 Update nodes and no Delete (S4 found the same).

## The result (`compare.py` → `compare.json`)

| step | the running app | the React export | the HTML export |
|---|---|---|---|
| D0 open | Sign in | the same | **the same** |
| D1 sign in | `List (3)` `Today (2)` `Done (1)`; `/login` + 10 queries | `/login` + 9 | **React's 10 requests, one for one** |
| D2 the MOT | its summary: next actions, history, "← Back"; one `Event` read | nothing opens | **nothing opens, as React** |
| D2tick | the note dialog; "Tick off": `PUT /classes/Action/<id> 200`, `POST /classes/Event 201` + 6 reads | nothing to press | nothing to press |
| D2back | the list | (the list) | (the list) |
| D3 add | "Pick up the dry cleaning", caret at 16; `List (4)`; `Task 201`, `Event 201` once each + 5 reads | **the same, caret at 16** | **the same, caret at 16** |
| D4dialog | "What happened?", its field, Cancel, "Close task" | the same | **the same** |
| D4 close | `PUT /classes/Task/<id> 200`, `Event 201` once each + 5 reads; `List (3)` `Done (2)`; first press | the same | **the same** |
| D5 reload | signed in, `List (3)` `Done (2)`; `GET /users/me` + 10 queries | signed in; 9 queries | **as React** |
| D6, D6relaunch | `POST /logout`; Sign in, both times | the same | **the same** |

**The HTML export equals the React export at all 12 steps:** the same page, tabs, rows and fields, and the same
requests. **All three arms show the same thing and send the same writes on sign in, add, close, reload and sign
out.** Nothing is sent twice. The field keeps its cursor: with a word put in the middle, the caret sits right after it (16) in every arm. No arm logged an
error or an exception.

The one difference is the plan's, and it is shared by both exports: **neither export can open a task**
(P134-HTX004-SELECTREFUSED, high). So the tick and the back behind it cannot be reached either. Every way todo-list
opens something sets a Variable from a placed component's output, and the plan refuses all 14 of those wires. Across
the templates there are 180 such wires.

## Read, not graded (the picture)

- **The React export is light, the other two dark.** The HTML export carries the app shell's CSS Definition (the dark
  palette, which theme icon shows, the bell) into `styles/app.css`. The React export drops it (P18-S140-SHELLUNSAID,
  open), so it also shows all four header icons (🔕 🔔 ☾ ☼) where the other two show ☼. **Fixed this session:** the
  HTML preflight had listed that stylesheet as "left out by the plan" though it prints it. It is now listed apart,
  under "Carried here, though the React export leaves it out" (todo-list: 120 → 119 left out).
- **"Also keep track of projects and money"** shows under the list in the running app only. The Projects and money
  tab's Functions call `Noodl.Records` beyond `query`, which neither export's client carries
  (P134-HTX004-PROJECTSTAB, medium, filed).
- **Both exports show the empty detail card under the list** at phone width ("Select a task, …"). The cause is "One
  pane or two?", refused by the same root as SELECTREFUSED. (Session 10: fixed with it; one pane in all three.)
- Row grips (⠿) and the custom date picker are drawn by the running app only (README §10's undrawn list).

## What I predicted wrong

Nothing in the graded columns. Two of my readers were wrong before the drive was. An action's title is a text
field, so the first reading found no "Ring the garage". And a ✓ on an action opens the same note dialog as a task's
✓, so the first tick sent nothing. Both are fixed in `drive.cjs` (field values are read; `answerDialog` answers both
dialogs), and the run above is the third.

## Session 10: SELECTREFUSED fixed, driven again

The plan was fixed in session 10 (README §10). The React and HTML arms were built and driven again, each on its own
fresh backend (`S4_ARMS=react,html`). The runtime arm's readings are session 7's, kept: the running app did not change.
`compare.py` now reads **`html==react yes; all three: seen same, writes same` at all 12 steps**, with no console error
in any arm. `side-by-side.png` was redrawn from the new shots.

| step | session 7, both exports | session 10, both exports (= the running app) |
|---|---|---|
| D2 the MOT | nothing opens | its summary on its own page at 390 px, "← Back", one request, as the runtime |
| D2tick | nothing to press | the note dialog; "Tick off": `PUT /classes/Action/<id> 200`, `POST /classes/Event 201`, 8 requests in all, as the runtime |
| D2back | (the list) | the list again |
| D4 close | (closed, by a different row press) | `PUT /classes/Task/<id> 200`, `Event 201`; `List (3)`, `Done (2)` |

It took three runs. On the first, the task opened but both exports drew both panes: "One pane or two?" reads a placed
component's value as a Function input, which the first cut left out. On the second, React equalled the runtime and the
HTML export still drew two panes: its printer could not read a Screen Resolution (P134-S10-SCREENREAD, fixed). The
third is the table above. There was one more thing between runs: View's `toggle` runs a Function whose input is View's
own `projectId`, and the first cut ran it at the press. The sweep now follows a Function's inputs too.

Still drawn by the running app only, in every run: the row grips (⠿), the task's Deadline date field, and "Also keep
track of projects and money" (PROJECTSTAB). The first two are the plan's "a Function fed by another Function" refusal
(the Date picker's Value, "Drag a row by its grip to move it"), in both exports.

## Re-running

Heavy: check the box first (`ps -A -o pid,comm | grep -E 'jest|vitest|xcodebuild'`, and `lsof -nP -iTCP:8644
-sTCP:LISTEN`). Chrome from Claude's bash needs the sandbox off.

```sh
./build.sh                 # work/proj (bound), work/html (the HTML export), work/react (built); --html-only skips React
node drive.cjs             # readings-{runtime,react,html}.json, shots/<arm>-<step>.png (S4_ARMS=… for fewer)
python3 compare.py && node sheet.cjs
```
