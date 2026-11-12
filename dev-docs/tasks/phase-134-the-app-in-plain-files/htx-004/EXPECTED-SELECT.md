# The Select Desk: what each arm should read (written before any arm ran, session 10)

P134-HTX004-SELECTREFUSED, small. The Sibling Desk (`packages/nodegx-export/tests/helpers/sibling-desk.ts`) with the
Shower left placed but unwired, and one Set Variable on the page, "Select": its Value from the Picker's `picked`, its Do
from the Picker's `chose`. That is todo-list's shape (Task list's `taskId` and `open` into "Select from the list").
"Choose C" sets `pickedId` from the page and sends nothing into Select.

Each reading is `[the Said text, the Shower text]`.

| step | the runtime | why |
|---|---|---|
| load | `said nothing`, `the shower` | the Variable's own value |
| Pick A | `task a` | Pick A sets `pickedId`, its Done sends `chose`; the runtime hands `picked` before the signal |
| Pick B | `task b` | |
| Pick A | `task a` | |
| Choose C | `task a` | `pickedId` is `task c` now, but nothing sends Select's Do |
| Pick A | `task a` | **the step that tells**: an export reading the value before the signal reads `task c` here |

Both exports should read the same at every step. A chain run in the press (HEAD's place for a handler) would read the
row the Picker last pushed, one behind: `undefined` at the first Pick A, then `task a` at Pick B, `task b` at the second
Pick A, and `task c` at the last step.

Two variants: Select's two wires in the other order (Do first), the same readings; and the control, no wire into
Select's Do, `said nothing` at every step in every arm.
