---
id: P18-EXP022-S4-FIRSTPRESS
title: In the running todo-list, the first press on "Close task" after typing a note does nothing; the second closes the task
status: open
severity: medium
area: runtime or template — todo-list's `Todo/Note dialog` and `Todo/Dialog flow` (the note field and the confirm press); not measured which
found: EXP-022 session 4, 2026-10-22, the runtime arm of the drive (`render-from-disk.js`, viewer bundle built 07:42 that day, headless Chrome at 390 × 844)
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/readings-runtime.json (D4: `pressedAgain: true`, the requests after the second press), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/drive-web.cjs (the D4 step)
---

The drive types "Sent to the printer." into the dialog's "What happened?" field (`Input.insertText`, the field focused),
then presses "Close task" with a real mouse press at its centre. Measured in three runs:

1. A synthetic `click()` on the button: the dialog stays, no request.
2. A real mouse press: the press blurs the field (the caret goes), the dialog stays, no request.
3. The same press, then, 1.5 s later, a second one: `PUT /classes/Task/<id> 200`, `POST /classes/Event 201`, the lists
   read again, `List (3)`, `Done (2)`.

So a person who types a note and presses Close task once sees nothing happen. The shape matches a press that reads the
note before the field hands it over on blur (memory: a press that also saves loses the press). That is a hypothesis: not
measured is whether the note arrives on blur or on change in the runtime's Text Input, or whether the template's confirm
reads it at the press.

Neither export can show this: both refuse the dialog (P18-EXP022-S4-DIALOGREFUSED).
