# HTX-004's Chrome drive: predicted before any arm was driven (2026-11-04, session 7, Opus 5.5)

EXP-022 S6's drive (its harness copied here), with a third arm: the HTML export of the same bound copy of
`templates/todo-list`, served by `python3 -m http.server` in the folder, nothing built. Each arm gets its own fresh
backend on :8644 with the same seeded rows; the wire is that backend's own request log, split by step.

## Measured before this file (not predictions)

- **There is no delete in todo-list.** Its graph has 5 Create and 17 Update record nodes and no Delete (S4 found the
  same). The task's "delete" step cannot be driven in any arm; it is left out, not lost.
- **"Open a task's page" is a pane, not a page.** todo-list has two pages (Sign in, Todo). A task row's `open` and
  `taskId` set the Variable `todoSelected`; at phone width the Todo page then shows the task's summary in place of the
  list, with "← Back" (`Todo/Task summary` `tsBack` → `tdDeselect`).
- **The plan refuses that selection in both exports.** The HTML preflight (and the React one: "the same nodes the React
  export leaves out") lists `Pages/Todo` "Select from the list", "Select from Today", "Select from Done", "Select from
  the log", "Open the one just added" and "One pane or two?" as left out: "the value wire has no statically known
  source". Nothing in the printed `pages/` reads `todoSelected`.
- The HTML export of the bound copy writes 210 files and leaves 120 things out (91 the plan's, 29 the HTML printer's);
  `env.js` is empty and `api/client.js` defaults to `http://127.0.0.1:8644`, app `backend_todo_s4`, from the binding.
- S6's measured wire (runtime and React) is the base: D1 `/login` + 9 queries (the runtime asks for `Task` twice); D3
  `Task 201`, `Event 201` + 5 reads; D4 `PUT Task/<id> 200`, `Event 201` + 5 reads; D5 the runtime adds `GET /users/me`.

## The predictions

| step | the running app | the React export | the HTML export |
|---|---|---|---|
| D0 open | Sign in | the same | **the same** (fields unlabelled, as React: the 10 label rows in the preflight) |
| D1 sign in | `List (3)` `Today (2)` `Done (1)`; `/login` + 10 queries | `/login` + 9 | **React's 9, request for request** |
| D2 the MOT's title | its summary: "Ring the garage", "Find the logbook", "← Back" | **nothing opens** (the plan's refusal) | **nothing opens**, as React |
| D2tick "Ring the garage" ✓ | `PUT /classes/Action/<id> 200`, `POST /classes/Event 201` | nothing to press | nothing to press |
| D2back "← Back" | the list again | nothing to press | nothing to press |
| D3 add, a word put in the middle | the field reads "Pick up the dry cleaning", caret after "dry " (16); `List (4)`; `Task 201` and `Event 201` once each + 5 reads | the same | **the same, the caret at 16** |
| D4dialog the release notes' ✓ | "What happened?", its field, Cancel, "Close task" | the same | **the same** |
| D4 a note, Close task | `PUT Task/<id> 200`, `Event 201` once each + 5 reads; `List (3)` `Done (2)` | the same | **the same** |
| D5 reload | signed in, `List (3)` `Done (2)`; `GET /users/me` + queries | signed in, the queries only | **as React** (the session read from `Parse/<appId>/currentUser`, the runtime's key) |
| D6 Sign out | `POST /logout`; Sign in | the same | **the same** |
| D6relaunch | Sign in | the same | **the same** |

"Nothing run twice" is read off the wire: every write once per press, in every arm.

## Not predicted (read, not graded)

- The look: images, icons and custom nodes the HTML export does not draw yet (README §10's still-undrawn list).
- How many times each arm reads the lists after a write (S4: the runtime reads `Task` once more at sign-in).
- The runtime's D2tick wire beyond the two writes (it may read the lists again).
