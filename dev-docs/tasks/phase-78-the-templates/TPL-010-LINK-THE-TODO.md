# TPL-010-L — The link to the todo list

**Opened 2026-09-20.** *"Make sure the link between this new page and todo.digitalbricks.io is set up."* And the earlier ruling
that shapes it: *"When I need to do some shit, put it in the todo app. When the todo app has a todo that's linked to making
actual money … but I haven't updated it or hit a deadline, knock me over the head."* **Status: ⬜ never built.** Prerequisites:
TPL-010 AC1, TPL-010-H AC4 (one backend, one account).

**The person sentence:** *A todo task that is overdue sits at the top of today in Richard's planner in red, and the move he
sends from the planner is at the bottom of his todo list with its deadline, without him opening either app to copy it.*

## 1. Rulings

| # | Question | Ruling |
|---|---|---|
| L1 | Who owns a task | **The todo list.** The planner never closes, renames, moves or deletes a `Task`. It reads `Task` and it creates `Task`. TPL-008's "what happened?" on closing stays the only way a task ends, and it happens in the todo list. |
| L2 | What the planner reads | Open `Task` rows with a `deadline`. Each becomes a **read-only red block** on its deadline day, `todoTaskId` set, 0.25 h planned, titled with the task and marked *from todo*. **A deadline before today shows at the top of today.** No `Block` row is written for these; they are projected at read time so the todo list stays the truth. |
| L3 | Ticking a red block | **Opens the task in the todo list** (L5), in a new tab. The planner does not tick it. A block whose task has since been closed disappears from the week on the next read. |
| L4 | What the planner writes | `Commands/Send to todo`: from a project's move, one `Task` at the end of the list (`position` = max + 1, `status: "open"`, `deadline` = `moveDue` or null, `title` = the move) and one `Event` (`kind: "created"`, `summary: "Sent from the planner"`) through the same shapes as TPL-008's `Add task`. The chip then reads *in todo*, and the project card shows the task's status on later reads. A move is sent once; the command refuses if a `Task` with the same title is open. |
| L5 | Deep link into the todo list | **The one change to TPL-008**, small and additive: `Pages/Todo` reads `?task=<id>` on load and sets `todoSelected` to it, so `https://todo.digitalbricks.io/?task=<id>` opens that task. Nothing else in the todo list changes. Republished by `npm run template:todo` and the todo README's redeploy step. Header link back to the planner: **not now** (R11 in TPL-010: *"leave it alone"*); revisit after a week of use. |
| L6 | Link out | The planner's app bar carries **Todo ↗** to `https://todo.digitalbricks.io`. In the template it is a setting (`Settings.todoUrl`, default empty; the bar hides the link when empty) so the demo on nodegx.io shows no dead link. |
| L7 | Where "money" comes from | A todo task is money-linked when the planner sent it (`Event.summary` = "Sent from the planner") **or** its title starts with `€` or `Invoice`. That is the rule for the red styling and for the shutdown's *"knock me over the head"* line; a plain overdue task is still shown, just not red. Cheap rule now; a tag field in TPL-008 later if it grates. |

## 2. Data touched

| Where | Change |
|---|---|
| `templates/planner` | `Logic/Todo tasks` (reader: `Task` where `status = open` and `deadline` not null; `Event` for the sender rule), `Commands/Send to todo`, `Week/Block` gains the `from todo` variant, `Settings.todoUrl`, `Block.todoTaskId` already in the schema. |
| `templates/planner.security.json` | Nothing new: `Task` and `Event` are the todo list's collections on the same backend (H1). The planner's policy file carries no `Task` entry; the merged policy on the box already has it. |
| `templates/todo-list` | `Pages/Todo`: read the query on load → `todoSelected` (L5). One node group, one test in `tpl008Template.test.ts`. |
| Demo variants | `planner-demo` seeds two fake open tasks in `localStorage` under a `Task` key so the red block and *Send to todo* can be driven without a backend; `todo-list-demo` gets the same `?task=` read. |

## 3. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | A `Task` with `deadline` = yesterday, created in the todo list, appears at the top of today's column in the planner on reload, red, titled *from todo*, and counts 0.25 h in Admin | ⬜ |
| AC2 | Closing that task in the todo list removes the block from the planner on the next read; no `Block` row was ever written for it | ⬜ |
| AC3 | Clicking the red block opens `https://todo.digitalbricks.io/?task=<id>` in a new tab with that task selected | ⬜ |
| AC4 | *Send to todo* on a project's move creates exactly one `Task` at the end of the todo list with the move's title and deadline, and one `Event` saying it came from the planner; a second click does nothing and says so | ⬜ |
| AC5 | The todo list's own gates (43/43) and drives still pass after the `?task=` change; the public demo drive is 19/19 | ⬜ |
| AC6 | Shutdown on a day with a red block not opened names it before any other concern, in the words *"one money todo is overdue"* | ⬜ |
| AC7 | On nodegx.io, both demos show the link working against `localStorage` seeds, and the planner demo shows no *Todo ↗* link | ⬜ |
| AC8 | **Richard's own week**: one real overdue invoice task appears in his planner on Monday, and one move he sent on the shutdown call is in his todo list on Tuesday | ⬜ Richard |

## 4. Not in this task

Two-way status (the planner closing tasks), tags in the todo list, and a header link from the todo list back to the planner.
Each is one ruling away if a week of use asks for it.
