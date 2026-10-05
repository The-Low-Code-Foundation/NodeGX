# TPL-010-L — The link to the todo list

**Opened 2026-09-20.** *"Make sure the link between this new page and todo.digitalbricks.io is set up."* And the earlier ruling
that shapes it: *"When I need to do some shit, put it in the todo app. When the todo app has a todo that's linked to making
actual money … but I haven't updated it or hit a deadline, knock me over the head."* **Status: ⬜ never built.** Prerequisites:
TPL-010 AC1, TPL-010-H AC4 (one backend, one account).

**Status, 2026-09-23 (s8–s9): 🟢 ALL BUILT, GATED AND DRIVEN — NOT YET ON THE BOX.** Richard added a task due today in
the todo list and did not see it in Planning, because none of this had been built. Then (s9) he changed L3: *"it would be
cool if we could open the todo task when it appears and assign it to a project, convert it into an hour block like every
other one"* — ruling **L3a** below. Built: **L1–L7 and L3a, AC6**.
- **Reading (L1, L2, L6).** `Logic/Planning data` reads `Task` (`status` = open, limit 500) and `Event` (`summary` =
  *Sent from Planning*, limit 500) — **only when `Settings.todoUrl` is set**: `pnTodoGate` runs when the settings arrive
  and fires both queries. `Logic/Todo tasks` projects each open task with a deadline into a quarter-hour block
  (`todoProjected`, id `todo-<taskId>`; a late one dated today with `todoLate`, above every stored block) — **unless a
  stored `Block` already carries its `todoTaskId`** (the blocks on screen and the four weeks back). The columns and the
  block sheet get these; the budgets, card and drawer keep the stored blocks.
- **Drawn (L7).** *From todo* (or *From todo · was due Tue 22*), Admin grey; **red edge** when the title starts with `€`
  or *Invoice*, or the task's history says Planning sent it.
- **Pressed (L3a).** Tick, name, words or hours on a task all open the **block sheet** as a new block made from it:
  *From todo · <day>*, its words, half an hour, its day, no project. *Make it a block* is `Commands/Add block` with the
  task's `todoTaskId` on the row; the task leaves the week because the block now stands for it. The sheet's
  **Open in Todo ↗** opens `todoUrl?task=<id>` — on the new block and on any block made from a task. Planning still never
  changes a `Task` (L1): logging the block does not close the task, and closing the task leaves the block.
- **Sending (L4).** `Commands/Send to todo` (two writes: `Task` at the end of the open list with the move's words and
  `moveDue`, then `Event` `created` / *Sent from Planning* on its id). The card's move box shows **Send to todo** only
  with a todo address and while no open task has the move's words; after, *✓ In your todo list, due Sun 27*.
- **The link (L5).** TPL-008: `app_link` keeps `?task=` in session storage at load (so the sign-in detour cannot drop
  it); `Pages/Todo`'s `tdLinkOpen` reads it once when signed in and selects the task through its own Set Variable
  (`tdSelectFromLink`), which loads its history. 🔴 Found by driving: declared below the page, the script was built
  EMPTY (a `const` read before its line is `undefined` in the compiled module) — a gate now checks the shipped text.
- **Shutdown (AC6).** Late money todos not yet made into a block are the first concern: *One money todo is overdue:
  "…". It is at the top of today — give it a time, or close it in the todo list.*
- Demo: seeds *€ Chase Salon Collective’s late payment* **due today** (red, not late — a late one would take the
  evening from the late Salon bill, M15) and *Renew the portfolio domain* in two days; `Task` and `Event` are `BORROWED`.
- ✅ Gates: tpl010 **77/77**, tpl008 **45/45**. Drives on the PRODUCTION engine: `drive-tpl010-l.js` **27/27**, money
  **40/40**, r23 **19/19**, `drive-tpl010-l5.js` **5/5**; r24 21/22 and r25 36/37 (the known date misses); 390×844 with the
  sheet open: `scrollWidth` 390, 0 errors. ⚠️ `drive-tpl008-demo.js` is **13/19 on any build from the current
  template, HEAD included** — the drive (2026-09-20) finds *Move up* and the theme switch by icon names that D77
  (2026-09-21) replaced with glyphs; pressed by glyph, both work. The live nodegx.io todo demo predates D77 (19/19).
- 🔴 **Not shipped: every deploy was refused by the session's production guard.** Builds are in
  `~/vscode_projects/nodegx-template-crm/ship-2026-09-23/` (hosted Planning with the PWA, hosted Todo with its PWA);
  the nodegx.io demos are already in `nodegx-web/site/templates/`; the shelf counts are 220 / 121.

**2026-09-23 (s10) — TPL-010-T built on top of this** ([T](TPL-010-TRACE-BOTH-SIDES.md)): **L1 is amended by T1b** — Planning
now ticks an `Action` (its `done` and `note`, nothing else) when the block made from it is done, and writes *Planned in Planning* /
*Ticked off … in Planning* / *Logged in Planning* lines in a task's history. It still never closes, renames, moves or deletes a
`Task`. **L4's chip is done**: a move that is an open task reads *in todo* on the strip, not only on the card. The todo list's
drive is **19/19 again** (`drive-tpl008-demo.js` finds ▲ ☾ ☼ by glyph since D77), so AC5 is green.

**The person sentence:** *A todo task that is overdue sits at the top of today in Richard's planner in red, and the move he
sends from the planner is at the bottom of his todo list with its deadline, without him opening either app to copy it.*

## 1. Rulings

| # | Question | Ruling |
|---|---|---|
| L1 | Who owns a task | **The todo list.** The planner never closes, renames, moves or deletes a `Task`. It reads `Task` and it creates `Task`. TPL-008's "what happened?" on closing stays the only way a task ends, and it happens in the todo list. |
| L2 | What the planner reads | Open `Task` rows with a `deadline`. Each becomes a **read-only red block** on its deadline day, `todoTaskId` set, 0.25 h planned, titled with the task and marked *from todo*. **A deadline before today shows at the top of today.** No `Block` row is written for these; they are projected at read time so the todo list stays the truth. |
| L3 | Ticking a red block | **Opens the task in the todo list** (L5), in a new tab. The planner does not tick it. A block whose task has since been closed disappears from the week on the next read. |
| L3a | **Changed by Richard, 2026-09-23** | A press on a task opens the **block sheet**, pre-filled from it, to be given a project and hours and saved as an ordinary block carrying `todoTaskId`; the task then leaves the week. The sheet's *Open in Todo ↗* is how the task itself is opened. Todo still owns the task: no close, no rename. |
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
| AC1 | A `Task` with `deadline` = yesterday, created in the todo list, appears at the top of today's column in the planner on reload, red, titled *from todo*, and counts 0.25 h in Admin | 🟢 demo, production engine (drive 27/27, the late task it adds); red only for money (L7); the 0.25 h is in the day's planned bar. ⬜ on the host |
| AC2 | Closing that task in the todo list removes the block from the planner on the next read; no `Block` row was ever written for it | 🟢 by construction (open tasks only; projected at read time) — gated and driven |
| AC3 | Clicking the red block opens `https://todo.digitalbricks.io/?task=<id>` in a new tab with that task selected | 🟢 now through the sheet's *Open in Todo ↗* (L3a); the task is selected (L5, drive 5/5) |
| AC4 | *Send to todo* on a project's move creates exactly one `Task` at the end of the todo list with the move's title and deadline, and one `Event` saying it came from the planner; a second click does nothing and says so | 🟢 driven; the button becomes *✓ In your todo list* |
| AC5 | The todo list's own gates (43/43) and drives still pass after the `?task=` change; the public demo drive is 19/19 | 🟢 2026-09-23 s10 — tpl008 45/45; `drive-tpl008-demo.js` 19/19 on the current build (the drive was updated for D77's glyphs) |
| AC6 | Shutdown on a day with a red block not opened names it before any other concern, in the words *"one money todo is overdue"* | 🟢 driven |
| AC7 | On nodegx.io, both demos show the link working against `localStorage` seeds, and the planner demo shows no *Todo ↗* link | ⬜ |
| AC8 | **Richard's own week**: one real overdue invoice task appears in his planner on Monday, and one move he sent on the shutdown call is in his todo list on Tuesday | ⬜ Richard |

## 4. Not in this task

Two-way status (the planner closing tasks), tags in the todo list, and a header link from the todo list back to the planner.
Each is one ruling away if a week of use asks for it.
