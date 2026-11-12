# EXP-021 AC1, the todo-list drive: predicted before any arm ran (P18 session 137, 2026-10-22)

## The subject

`templates/todo-list`, copied and bound to one real `nodegx-backend` from `src` on :8597, running the template's own
policy (`todo-list.security.json`, `devOpen: false`). One account, seeded through the REST API with that account's
session:

| collection | rows |
|---|---|
| `Task` | "Book the van in for its MOT" (position 1, open) · "Chase the accountant about VAT" (2, open, deadline **today**) · "Write the release notes" (3, open) · "Renew the domain" (4, `done`, closing note "Paid for three years.", closed yesterday) |
| `Action` | on the MOT task: "Ring the garage" (1, not done) · "Find the logbook" (2, done) |
| `Event` | on the MOT task: kind `added`, summary "Added the task", at one hour ago |
| `Routine` | "Take the tablets", daily, slot `08:00`, started yesterday, active |

## The arms

- **runtime**: `render-from-disk.js` on the bound copy (viewer bundle rebuilt 07:42 today from HEAD; HEAD's last runtime
  commit is 2026-10-20).
- **export-head**: the bound copy emitted by HEAD's export `src` (the tree before this session's change), built with its
  own `npm run build` (tsc 0, vite) against npm's packages.
- **export-fixed**: the same, emitted after the change (an arrival run's value lifts through Component Outputs).

Each arm: open `/`, sign in through the app's own Sign in page (email, password, "Sign in"), then read.

## Predictions

| step | runtime | export-head | export-fixed |
|---|---|---|---|
| D0 open `/` | the Sign in page (the Todo page's Did Mount sends it there) | the same | the same |
| D1 sign in | the Todo page | the same | the same |
| D2 header | `List (3)` · `Today (2)` · `Done (1)` · `Log` | **three blank buttons** and `Log` (the labels are Task rows' and Today rows' outputs, never lifted) | as runtime |
| D2 list | MOT, VAT, release notes, in that order; MOT's line says `Next: Ring the garage`; VAT's says `Due today`; the field says `Add a task (it goes in at #4)` | **no task** (the rows are fetched and dropped in `useTaskRows`) | as runtime |
| D3 Done | "Renew the domain", "Paid for three years." | no button to press (blank label: pressed by position, the list is empty) | as runtime |
| D4 Today | "Take the tablets" and "Chase the accountant about VAT" | empty | as runtime |
| D5 Log | "Added the task" beside "Book the van in for its MOT" | empty (Log rows' `rows` dropped) | as runtime |
| requests | one `GET /classes/Task`, `Action`, `Event`, `Routine`, `RoutineCheck` after sign-in, plus whatever `/Logic/Projects` asks | the same five (the hook fetches; only the lift was missing) | the same five; **none** of `/Logic/Projects`'s (its loader reads `Noodl.Records`, refused by name) |

## Not predicted to agree (recorded, not graded here)

- **Selecting a task** (pressing a row): the export drops the row's `taskId` into the Set Variable that selects it
  ("instance output feeds an unrendered sink"). Not AC1; read if the drive gets there.
- **Projects and money**: refused (`Noodl.Records` in its loader). The runtime may show a "Projects and money" button the
  export does not.
- Header widths, colours, fonts: not graded.

## The Hook Desk's seventh column, predicted before it ran (added after the drive)

`/Logic/Stamp` (Component Inputs `x` → a Function that reads the clock and says `'rows ' + x * 3` → Component Outputs
`rows`), `x` ← bump's `n`, a page Text reading `rows`. No Run wire: an arrival run, as todo-list's Task rows, Today rows
and Log rows are. Steps More, Go A, Go B, Go A, More:

| reading | load | More | Go A | Go B | Go A | More |
|---|---|---|---|---|---|---|
| runtime | rows 0 | rows 3 | rows 3 | rows 3 | rows 3 | rows 6 |
| export, HEAD | '' (the value is dropped in the hook) | '' | '' | '' | '' | '' |
| export, fixed | as runtime | | | | | |

The other six columns do not move.
