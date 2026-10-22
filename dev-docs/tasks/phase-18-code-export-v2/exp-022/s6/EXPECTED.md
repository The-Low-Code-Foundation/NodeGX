# EXP-022 S6, add and close in both exports: predicted before the drive ran (2026-10-22, Opus 5.5)

S4's drive, again, after the plan's two fixes (P18-EXP022-S4-ADDREFUSED, -DIALOGREFUSED). The harness is S4's, copied
here unchanged except for this folder (`work/`, `shots/`, the readings): the same bound copy of `templates/todo-list`, the
same seeded backend per arm on :8644, the same steps, the same iPhone 17 simulator.

## Measured before this file (not predictions)

- The plan's report on todo-list: 857 notes at HEAD, 806 now. Gone: `Todo/Dialog flow`'s States refusal and the six
  Conditions behind it, `Commands/Add task`'s Create, and the whole of `Logic/Write history`, which every command that
  writes a history line places (19 of them).
- The printed `AddTask.tsx` and `AddTaskLogic.swift`: the Create's answer bound, its id written into the row the history
  line's `taskId` reads, then the history line's pulse, in that order.
- Left refused on the close path: after a close, "Was it a project's task?" (`Pages/Todo` `tdNextFor`, its `taskId`
  from `Todo/Dialog flow`'s lifted output). "Write the release notes" belongs to no project, so in the running app that
  prompt does not show either.

## The predictions

| step | the running app | the React export | the Swift app |
|---|---|---|---|
| D0–D2, D5, D6 | as S4 | as S4 | as S4 |
| D3 add "Pick up the dry cleaning" | `List (4)`, the task fourth; `POST /classes/Task 201`, `POST /classes/Event 201`, the lists read again | **the same** | **the same** |
| D4dialog the release notes' circle | "What happened?", its field, Cancel and "Close task" | **the same** | **the same** |
| D4 a note, then Close task | `PUT /classes/Task/<id>`, `POST /classes/Event 201`, the lists read again; `List (3)` (MOT, VAT, dry cleaning), `Done (2)`; on the second press (P18-EXP022-S4-FIRSTPRESS) | **the same, on the first press** | **the same, on the first press** |

So the S4 line "the Swift app reads and sends what the React export does at every step" should now hold with the
running app as a third column on D3 and D4, not only between the two exports.

## Not predicted (read, not graded)

- The look, the placeholder, the Sign in labels (as S4).
- How many times each arm reads the lists after a write (the runtime reads `Task` once more than the exports at
  sign-in, S4). The count is recorded; the requests that write are graded.
