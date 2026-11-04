---
id: P134-HTX004-SELECTREFUSED
title: "export plan: a Set Variable whose value comes from a placed component's output is left out, so neither export can open a task in todo-list"
status: open
severity: high
area: the export plan (`packages/nodegx-export/src/analyze/plan.ts`, the Set Variable and Global Store Set actions, ~16530 and ~16716; the lifted value outputs, `pendingLifted`, ~4574); shared by the React and HTML exports
found: P134 HTX-004 session 7, 2026-11-04, the Chrome drive of todo-list on three fresh backends
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/htx-004/ (README.md, compare.json, shots/*-D2*.png)
kit: export
---

Driven in Chrome at phone width, each arm on its own fresh backend: in the running app, pressing "Book the van in for
its MOT" opens its summary (its next actions, its history, "← Back"), and ticking "Ring the garage" there sends
`PUT /classes/Action/<id> 200` and `POST /classes/Event 201`. In the React export and the HTML export the press does
nothing, nothing is sent, and the list stays. Both exports equal each other at that step, request for request.

Why: a task row's `open` signal and its `taskId` reach `Pages/Todo` as `Todo/Task list`'s outputs (a For Each's
`itemOutputSignal-open` and `itemOutput-id`), and set the Variable `todoSelected`. The plan refuses the Set Variable:
"the value wire has no statically known source". A placed component's lifted value output reaches a For Each's items, a
parent's output and a child's input (`pendingLifted`), but not a Set Variable's value read when its `do` fires.

The same root draws a pane the runtime does not: at phone width both exports show the empty detail card ("Select a
task, or something that repeats, to see its details.") under the list, because `Pages/Todo` "One pane or two?" is
refused too (its `found` input comes from `/Logic/Selected task`, a placed component's output).

Reach, counted on the project files: **180 wires across 11 templates** set a Variable or a Global Store key from a
placed component's output, more than from a Function (152) or an Expression (73). In todo-list all 14 are refused,
which is every way the app opens something: a task from the list, Today, Done and the log, a routine, the one just added,
an action's description, a project's task. Five more are refused as "two wires feed its Value input".

Fix (the plan, so both exports gain it): resolve a placed component's lifted output as an expression in a Set
Variable's (and a Global Store Set's) value, read when the pulse arrives. Mind the one-commit lag the plan documents
for lifted values (~3348): the row's id must be the pressed row's, not the last one lifted. The HTX-004 drive
(`htx-004/drive.cjs`, D2 to D2back) is the grading drive.
