---
id: P18-EXP022-S4-FIRSTPRESS
title: In the running todo-list, the first press on "Close task" after typing a note does nothing; the second closes the task
status: wontfix
severity: medium
area: runtime or template — todo-list's `Todo/Note dialog` and `Todo/Dialog flow` (the note field and the confirm press); not measured which
found: EXP-022 session 4, 2026-10-22, the runtime arm of the drive (`render-from-disk.js`, viewer bundle built 07:42 that day, headless Chrome at 390 × 844)
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/readings-runtime.json (D4: `pressedAgain: true`, the requests after the second press), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/drive-web.cjs (the D4 step)
reason: does not reproduce — the drive's own D4 timing closes the task on the first press, 4 of 4, on the bundle it was filed against (10-22 07:42) and on HEAD's viewer (Beta sweep s16); left is a press inside the one frame after the last keystroke
owner: Beta sweep s16
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

**Re-measured (Beta sweep s16, 2026-10-27): does not reproduce.** A scratch copy of `drive-web.cjs` (outputs in the
scratchpad, `work/proj` and the backend helper as they are), runtime arm, the same D4 sequence (`Input.insertText`, then
`CENTRE` and a real press with no wait), then a reading 1.5 s later of whether the dialog's OK is still on screen:

| viewer | first press closed the task |
|---|---|
| `packages/noodl-editor/src/external/viewer` (built 2026-10-22 07:42, the bundle this row was filed on) | 2 of 2 |
| HEAD's viewer built into the scratchpad | 2 of 2 |

So the note does arrive while typing (the Text Input's Value is sent per keystroke, `TextInput.tsx` `onChange` →
`setText`), and the press reads it. **The one window left:** OK's `enabled` comes from `Has something been written?`
(a Function on the field's Value), so it turns on at the frame after the keystroke. A probe read 5 ms after the
`insertText` found the button still `disabled`; 300 ms after, enabled. A press inside that frame lands on a disabled
button and is lost. On 10-22 the machine was building the Swift arm beside the drive, which makes frames longer; that
fits all three of that day's runs and today's clean ones, but it was not measured. Reopen with a drive that shows a
press later than a frame being lost.
