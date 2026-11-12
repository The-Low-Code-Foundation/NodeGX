---
id: P18-EXP022-S4-ADDREFUSED
title: Neither export can add a task to todo-list — the plan refuses Add task's Create because its Id output is used further down the chain
status: fixed
severity: high
area: export / the plan (`packages/nodegx-export/src/analyze/plan.ts`, a Create New Record whose Id output is consumed: "the record it names exists only inside the invoking chain, which the relation verbs would need")
found: EXP-022 session 4, 2026-10-22, the three-arm drive of todo-list on one real backend
fixed: EXP-022 session 6, 2026-10-22
commit: f42a3d8a2
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/compare.json (D3), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/readings-*.json, dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/side-by-side.png; the preflight line "`Commands/Add task` "Add the task" — its Id output is consumed"
---

Typed "Pick up the dry cleaning" into the add field and pressed Add, in all three arms on a fresh seeded backend:

| arm | after Add |
|---|---|
| the running app | `List (4)`, the task fourth; `POST /classes/Task 201`, `POST /classes/Event 201` ("Added the task"), the lists read again |
| the React export | `List (3)`; **no request** |
| the Swift app | `List (3)`; **no request** (the same) |

Both exports press into `Commands/Add task`, whose Function says `go` and whose Create is refused by the plan, so the
chain stops there. The Swift app prints `AddTaskLogic` running "Is there anything to write" and nothing after it.

The same refusal names `Commands/Add routine` "Add the thing that repeats" and `Logic/Write history` "Add the line" and
"Extend the last line", so adding a routine and the history lines are lost the same way. Not counted beyond todo-list.

**Not the Swift printer's:** the Swift app reads exactly what the React export reads here, request for request. It goes
to whoever next takes the plan's record verbs (EXP-020/021, the React lane).

**Fixed in EXP-022 session 6 (f42a3d8a2).** A Create's or an Update's Id inside its own Done chain is the awaited answer's id (`verb-id`): Add task hands it to Write history through a row written before the pulse; Write history's "Remember it" reads the Id of whichever write's Done runs it; Set as Object passes a Function output only object literals write. The S6 drive (`exp-022/s6/`): add sends `Task 201`, `Event 201` and reads the lists again, `List (4)`, in the running app and both exports. Graded by `tests/the-same-graph-in-swift-s6.test.ts` §B–§D.
