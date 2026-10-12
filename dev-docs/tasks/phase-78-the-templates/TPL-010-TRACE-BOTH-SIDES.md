# TPL-010-T — Next actions into blocks, and a history on both sides

**Opened 2026-09-23**, straight after TPL-010-L shipped. Richard, in his words:

> *"It'd be nice to be able to pull in the next actions when you pull in the todo item, not sure how it'd work but I guess
> they all kind of become time blocks? Also would be cool to see in the todo app in the logs for the todo item that it's
> been imported into the planning system and linked to a project, so there's traceability on both sides. Actually having
> the same log concept in the Planning app would be awesome."*

**Status: 🟢 BUILT, GATED AND DRIVEN 2026-09-23 (s10) — NOT ON THE BOX.** Record in §5; ship steps in §6 (**the policy goes
first**). Richard's answers, asked as the worked examples in §2:
- **T1 → (a)**: the sheet lists the task's open actions with ticks; each ticked one becomes its own half-hour block under
  the same project on the day picked, named after its action.
- **T1b → yes**: finishing a block made from an action ticks that action in Todo, with the block's note as its
  *"what happened?"* answer. **L1 is amended**: Planning may now tick an `Action` (and only that — it still never closes,
  renames, moves or deletes a `Task`).
- **T1c** was not put to him separately; built as the table states (no open actions → one block from the task, L3a as
  built; every open action already a block → the task leaves the week). One line to change if he disagrees.
- **T2 → both lines**: *Planned in Planning* when it becomes a block, *Logged in Planning* when the block is done.
- **T3 → both, from one log**: the block sheet shows that block's lines, the project card every line for the project.
- **Settled by the builder (s10), not a ruling:** the log is its own collection (`PlanEvent`), not TPL-010-MCP's `Note`.
  A `Note` is words a person or the coach chose to write; a `PlanEvent` is what the app saw happen. The coach reads both;
  the history can draw `Note`s beside it later without a migration.

**Prerequisites:** TPL-010-L 🟢 (shipped 2026-09-23: a task opens the block sheet and becomes a block carrying
`todoTaskId`; *Send to todo*; `?task=`). Read [TPL-010-L](TPL-010-LINK-THE-TODO.md) §Status first.

**The person sentence (draft, confirm with T1–T3):** *Richard opens "Invoice Bramble" in his week, ticks two of its next
actions, and gets two half-hour Bramble blocks; the task's history in the todo list says they were planned, and the
Bramble card in Planning shows the same story from its side.*

## 1. What exists today (read before designing)

| Where | Shape |
|---|---|
| Todo `Task` | `title`, `position`, `status` (open/done), `deadline`, `closingNote`, `closedAt` |
| Todo `Action` | `taskId`, `title`, `position`, `done`, `note`, `description` — a task's next actions, in order |
| Todo `Event` | `taskId`, `kind`, `summary`, `body`, `at`. Kinds today: `created`, `renamed`, `deadline`, `note`, `closed`, `reopened`, `action-added`, `action-renamed`, `action-described`, `action-done`, `action-undone`. Written ONLY through TPL-008's `Logic/Write history` (it merges repeats within two minutes). Planning already writes one: `created` / *Sent from Planning* (L4). |
| Planning `Block` | `projectId`, `date`, `what`, `planned`, `actual`, `entries` (sittings), `done`, `isMove`, `todoTaskId`, `position` |
| Planning history | **none.** Nothing records who made a block, when it moved, or where it came from. |
| Rule L1 | Planning never changes a `Task`. It reads Task/Event and creates Task/Event. T1b would be the first exception. |
| Ticking an action in Todo | asks *"what happened?"* and writes the answer as the action's `note` and an `action-done` line. |

## 2. Rulings to ask (worked examples, never schema terms)

| # | Question, as put to Richard | Options | Recommended |
|---|---|---|---|
| T1 | *"Invoice Bramble"* has three next actions: *Draft the invoice*, *Send it*, *Chase in a week*. You open it in Planning. | **(a)** the sheet lists all three with ticks; each ticked one becomes its own block under the same project, half an hour each, on the day you pick · **(b)** one block for the task, the actions inside it as a checklist · **(c)** only the first open action becomes a block; the next appears once that one is done | **(a)** |
| T1b | You finish the *Send it* block in Planning. Does *Send it* tick itself in Todo? | **yes**, with the block's note as the "what happened?" answer (first time Planning changes a Todo row — L1 amended) · **no**, Todo is left alone as today | ask; no default |
| T1c | (if T1a) A task with no open actions — as today? And a task whose actions are all already blocks? | one block from the task itself (L3a as built) · nothing left to plan, the task leaves the week | as stated |
| T2 | The task's history in Todo gains *"Planned in Planning: Bramble & Co, Wed 23, 0.5 h"* when it becomes a block, and *"Logged in Planning: 0.5 h — sent it"* when the block is done. | both lines · only the first · also moved/taken out | **both** |
| T3 | A history in Planning like Todo's, nothing deleted: *created from todo · moved Wed → Thu · 0.5 h logged: "first pass" · done · sent to todo* — at the bottom of the block sheet and on the project card. | per block · per project · **both, from one log** | **both, one log** (also what TPL-010-MCP's coach reads) |

## 3. Design notes for whoever builds it (after the rulings)

- **T1a** needs `Block.todoActionId` (additive column) and `Logic/Planning data` reading `Action` for the open tasks
  (gated like `Task`, by `todoUrl`; `Action` goes in the demo's `BORROWED`). A task stays in the week while it has open
  actions with no block. The sheet grows a tick list — beware the sheet traps in memory (reused modal: clear on close,
  checkbox races, one command for many buttons).
- **T2** writes Todo `Event`s from Planning. Use kinds Todo already draws (probably `note`) or add `planned` / `logged`
  to TPL-008's history rendering — a new kind Todo cannot draw is a line nobody sees. Planning cannot reuse
  `Logic/Write history`'s merge; decide whether it needs to.
- **T3** is a new Planning collection (working name `PlanEvent`: `blockId`, `projectId`, `kind`, `summary`, `body`, `at`),
  `delete: nobody` in `templates/planning.security.json`, merged onto the box with `merge-policy.js` (policy change =
  one `todo-backend` restart). Every block/project command writes one line. It overlaps TPL-010-MCP's `Note` /
  `Decision` — settle whether they are one collection before building either.
- Demo: every new collection seeded or borrowed; `drive-tpl010-l.js` extended, not replaced.
- ⚠️ Deploys: in auto mode the session guard refuses ssh/rsync to nexus-1 — hand Richard the commands (TPL-010-L s9
  shows the five that worked, run from `~/vscode_projects/OpenNoodl`).

## 4. Acceptance criteria (draft; finalise with the rulings)

| AC | Criterion | Result |
|---|---|---|
| AC1 | (T1) A task with three open actions opens a sheet listing them; ticking two and saving writes two blocks with the task's project, each carrying its action | 🟢 driven: demo (production engine) and a **real `nodegx-backend`** (scratch, merged policy) |
| AC2 | (T1c) the task leaves the week once every open action is a block | 🟢 driven (demo: both actions planned → gone; backend: one left unplanned → stays) |
| AC3 | (T2) the task's history in the todo list shows the planned line, and the logged line once the block is done | 🟢 written on both builds; **drawn by the todo list** (lines planted in the todo demo's store: both shown, note under the tick, 0 errors) |
| AC4 | (T3) the block sheet and the project card show their history, newest first; nothing in it can be deleted | 🟢 driven; on the backend `PUT` and `DELETE` on a `PlanEvent` → 403, signed-out `find` → 403 |
| AC5 | gates and every existing drive still pass; the demo shows all of it without a backend | 🟢 tpl010 **90/90**, tpl008 **45/45**; `drive-tpl010-l.js` **44/44**; money 40/40, r23 19/19, r24 21/22 and r25 36/37 (the known date misses, unchanged) |
| AC6 | **Richard's own week**: one real task pulled in with its actions, and its story readable from both apps | ⬜ Richard — after §6 |

## 5. Built (s10, 2026-09-23)

| Where | What |
|---|---|
| `Logic/Planning data` | `pnActions` (`Action`, newest 1,000 by `createdAt`, only with a todo address — the todo list's own read, no filter: the demo compares strings and `done` is a boolean) and `pnHistory` (`PlanEvent`, newest 1,000 by `at`, every load). |
| `Logic/Todo tasks` | each projected task carries `todoActions` — its open actions with no block yet, in the todo list's order. T1c: a task leaves the week once it has a block **and** no open action without one. |
| `Week/Block sheet` + `Week/Action pick` | a task with actions shows *Its next actions — each one ticked becomes a block* (☑/☐ buttons, not Checkboxes — the sheet traps) in place of the words box; the first is ticked on opening; the button reads *Make it a block* / *Make 2 blocks* / *Tick one to plan it*. Ticks live in `VAR.pickedActions` as `<blockId>|ids`, so another task opens on its own first action. History at the foot (`Week/Log line`). |
| `Commands/Add block` | rewritten as a **queue**: `do` steps one Counter, each finished block another, and the queue Function runs on the counts changing (a Function has one signal in and coalesces runs in a frame). Per item: `Block` (with `todoActionId`) → `PlanEvent` → `Event` *Planned in Planning: <action> — <project>, Wed 23, 0.5 h* when from a task → next. |
| `Commands/Tell todo` (new) | after *Add time*, on the save that makes the block done: an open action → `Action.done` + `note` (the block's note, else *Done in Planning, 0.5 h.*) and `Event` `action-done` *Ticked off “…” in Planning · 0.5 h*; a block from the task itself → `Event` `logged` *Logged in Planning: 0.5 h*, note as body. What to say is decided in *Add time*'s guard (`becameDone`, `doneNote`, `doneHours`) before the week reads again. The sheet now closes on *Tell todo*'s `done`. |
| `command()` `history` | every block and project command writes one `PlanEvent` after its record and is `done` when the line is: Save block (names what changed; nothing changed → no line), Add time, Carry, Drop/Take out, Place move, Move block, Add project, Edit project (name, kind, move, fixes only, else *details changed*), Send to todo (project line). |
| `Logic/Card rows` + `Week/Project detail` | *History* at the foot of the card: the project's latest 50 lines, each naming its block. |
| L4's chip | `Logic/Moves` reads the open tasks; a chip whose move is one says **in todo** (owed since TPL-010-L). |
| Policy | `PlanEvent`: find/get/create authenticated, **update and delete nobody**, `creatorOwns`. |
| Demo | `Action` borrowed; `PlanEvent` in `ADDED_LATER` (a store without it reads as empty — nobody's own week is reseeded); seeds *Renew the portfolio domain*'s actions (one done, two open) and the coaching offer's history. |
| Ops | `merge-policy.js` skips a collection the live policy holds **word for word** (so a re-run adds only `PlanEvent`) and still refuses one with different rules; `provision.sh` installs when `PlanEvent` is absent. Shelf count 220 → **229**. |

**Readings (2026-09-23, uncommitted work on `7df454df6`):** tpl010 **90/90** (§8 is new: 11 T gates, and §3 gained *every wire into
a Function names an input its script reads*), tpl008 **45/45**, `typecheck:mcp` **0 errors** (it was red before this session on
`Week/Day pick`'s root button and a test fixture — both fixed). Sabotaged: the T1c rule (→ T1 and T1c red), the D80 wire (→ the new
gate red on exactly that wire). Drives on the production engine: `drive-tpl010-l.js` **44/44** (16 new clauses), money 40/40, r23
19/19, r24 21/22, r25 36/37; 1423×680 and 390×844 with the action sheet open: `scrollWidth` = width, 0 errors. **Against a real
`nodegx-backend`** (scratch data dir, merged policy, signed up through the API, driven through sign-in): **13/13**.
⚠️ `npm run tsfixme` is red across the checkout (+145 `any` in tests, +52 in src) — none of it in a tpl010/tpl008 file.

**Found:** [D80](DEFECTS-THE-TEMPLATES-FOUND.md) — the door accepts a wire into a Function input the script never reads; only the
deploy's wire check saw it. Fixed and gated.

**Not done, and why:** the hosted apps signed in with Richard's data (only he can); the todo list's own screens were not driven
against the backend (its history rendering is kind-agnostic, read in `tpl008Components.ts` and seen in the todo demo). Opening a
block again does not untick its action in Todo (not asked; one line in *Tell todo* if he wants it).

## 6. Ship — ✅ DONE 2026-09-23 evening (s11), with TPL-010-B; record in [B §5](TPL-010-BILLING-MADE-CLEAR.md). The shelf publish is still open.

From `~/vscode_projects/OpenNoodl`. **The policy goes first**: a site that writes `PlanEvent` before the backend knows it shows
*That change did not save* after every change (the block itself still saves).

```bash
K=~/.ssh/nexus_hetzner; BOX=root@49.12.102.195; P=dev-docs/tasks/phase-78-the-templates/planning-digitalbricks
ssh -i $K $BOX 'cat /var/lib/todo/data/security.json' > /tmp/live-security.json
node $P/merge-policy.js /tmp/live-security.json templates/planning.security.json /tmp/security.merged.json   # must say: added 1: PlanEvent
ssh -i $K $BOX 'mkdir -p /tmp/planning-provision' && scp -i $K /tmp/security.merged.json $BOX:/tmp/planning-provision/security.json
ssh -i $K $BOX 'bash -s' < $P/provision.sh        # installs it (PlanEvent absent), restarts todo-backend (a few seconds), reloads Caddy
rsync -a --delete -e "ssh -i $K" ~/vscode_projects/nodegx-template-crm/ship-2026-09-23-b/planning-host/ $BOX:/srv/planning/site/   # s11: -b is T + TPL-010-B, and supersedes -t
(cd ~/vscode_projects/nodegx-web && ops/deploy.sh 49.12.102.195)                       # the demo at nodegx.io/templates/planning/
dev-docs/tasks/phase-78-the-templates/publish-templates-to-shelf.sh --publish planning   # 229 files
```

The todo list needs nothing: TPL-008 is unchanged, and it already draws any kind of history line.

