# TPL-008-PJ — Planning folds into the todo list as a Projects tab

**Opened 2026-10-05.** Status: 🟢 **s3 live on todo.digitalbricks.io (`index-57f134c7…`, 2026-10-05) — s2 Planning's editing back (the money popup, change the move, add a task, edit the project, tasks ↔ projects); s3 by kind in your own order, a task's project from its pane or the project. AC8 (Richard's mornings) and the Change-the-move device question are his.** Mockup approved:
<https://claude.ai/artifact/UkHvQfFKeybQTojKVQEQm3> (Richard: *"Yeah I like it, let's do that redesign of the todo app and
push it, and retire the planning template for now (not delete, just set it aside)"*).

## 0. Why

Richard, 2026-10-05, after two weeks of hosted Planning: *"I don't really like the planning app and I'm not using it. I've
stopped using the todo app as a result I think."*

| He likes | He does not like |
|---|---|
| **The list of projects** — *"what I normally look at in the morning to reflect on 'who should I focus on today' … what's waiting, what deadlines are, who's paying or not and when"* | *"The interface is ugly as sin, complicated, assault on the eyes"* |
| **The next actions** from the projects — *"don't let me forget what I'm supposed to be doing to either get money or progress a project towards getting money"* | The week plan and hour budgets — *"it just doesn't fit my ADHD disorganised working style which after several years I might just have to accept and live with rather than fighting it"* |
| **The money** — what he got paid, the problems coming in the next month; *"putting in a snap account balance helps as a workaround"* | |

## 1. Rulings (2026-10-05)

| # | Question | Ruling |
|---|---|---|
| PJ1 | Merge, or keep Planning separate? | **Merge.** A *Projects* tab inside the todo list, switched on in the app (opt-in); off, the todo list is exactly what it is today. |
| PJ2 | Is a project's next move a todo task? | **Yes.** A move is an ordinary `Task` with `projectId`; it is in the List with the project's name under it, and ticking it asks *"What's the next move for X?"*. No more *Send to todo*. |
| PJ3 | The old hour blocks | **Kept in the data, out of sight.** Nothing reads or writes `Block` / `MonthPlan` from the todo list. |
| PJ4 | The Planning template | **Set aside, not deleted.** Unpublished from the shelf and the nodegx.io homepage; planning.digitalbricks.io redirects to the todo list; the source stays in the repo and is committed; the data stays in the backend. |
| PJ5 | The look | **The todo list's v2 look** (TPL-008 R8: *one system font, three sizes, one accent, red only for late* — *"Love it"*). None of Planning's four kind colours, mono numbers or chips. |

## 2. What the tab shows (the mockup, top to bottom)

1. **Money** — the latest `BalanceReading` and the day it was read; **New balance**; a 30-day line of the projected balance;
   one sentence for the lowest point (*"Dips to −€380 around Thu 15 Oct · rent and the tax bill go out before Northline's
   €4,000 lands on the 19th"*), red only below zero. Arithmetic: `MONEY_FNS` from `tpl010Money.ts`, pasted as-is
   (`moneyContext`, `balanceNow`, `projection`, `lowestPoint`), with `blocks = []` — see §5 *hourly bills*.
2. **Your move** — one row per project whose first open task is his: name; money state on the right
   (*€1,200 a month · Sept unpaid*, *paid 1 Oct*, *€4,000 on signing · likely*); the move and its deadline under it.
   Late money is the only red (and a red left edge). Ordered: late money, then overdue move, then by deadline, then no date.
3. **Waiting on someone** — projects whose first open task has `waitingOn` set: *Waiting: Sam sends the data access ·
   since Tue 29 Sep*.
4. **A project opened** — its billing facts (from its `MoneyItem`s), last paid and days-to-pay, its last few history lines;
   **Done** (or **They did it**) → *What's the next move?* + *Mine / Waiting on someone* → closes the task with TPL-008's
   own close and adds the next one; **Change the move**; **Edit project**; **Been paid? Tick it** on an open bill.
5. **+ Add a project** (name, kind, optional bill).

## 3. Data

| Where | Change |
|---|---|
| `Task` | + `projectId` (string or null), + `waitingOn` (string or null, who it waits on). Policy unchanged: fields are not enumerated. |
| `Project`, `MoneyItem`, `MoneyMark`, `BalanceReading` | Already on the same backend (TPL-010-H, H1). Read; write only what §2 names. `delete: nobody` stays. |
| `todo-list.security.json` | Gains the four collections above (copied from `planning.security.json`), so a fresh template has them. 🔴 Merge on the box from the LIVE policy — both provision scripts refuse a staged policy that drops a live collection. |
| Settings | The opt-in switch: on when the person has any `Project`, or pressed on; remembered per device the way the theme is (R10). |

## 4. The carry-over from Planning (one-off, in the app, signed in as him)

Reading the live data to size this was **refused by the session's permission guard** (2026-10-05), so the rules are written
for any shape:

1. Strip display prefixes from every `Project.move` and every open `Task.title`:
   `/^(?:(?:→|!) |✓ (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} · )+/u` — the damage `P78-TPL010-MOVEARROW` did.
2. A project with a non-empty cleaned `move`: if an open `Task` already has that cleaned title (it was *Sent to todo*), set
   its `projectId`; otherwise create one at the end of the list (`deadline` = `moveDue`), with the usual `created` Event
   (*Moved from Planning*).
3. Then set `Project.move` to empty, **in the same command**, so it never runs twice
   ([[an-on-load-migration-owes-its-own-save]]).

## 5. Known limits, said up front

- **Hourly bills worked out from logged hours** (`fromHours`, M23) have no hours to read once blocks are gone: they show
  their item amount, not hours × rate. Fixed and monthly bills are unaffected.
- The template's demo (nodegx.io) needs the same tab on `localStorage`; the hosted app ships first.

## 6. Retiring Planning (PJ4)

- Commit `scripts/generate-planning-template.ts`, `templates/planning*`, `tpl010*` and the TPL-010 docs — **uncommitted
  since s8–s11 (2026-09-23) while live** — so setting it aside loses nothing.
- Shelf: unpublish `planning`. nodegx.io: take the card off the homepage; keep `/templates/planning/` answering or redirect
  it to the todo demo.
- `planning.digitalbricks.io` → redirect to `todo.digitalbricks.io` in `planning.caddy`; leave `/srv/planning` in place.
- Board ([TPL-010-BOARD](TPL-010-BOARD.md)): every row marked *set aside 2026-10-05*.

## 7. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | Signed in on todo.digitalbricks.io, the Projects tab lists every project with its next move and money state, in the todo list's look | 🟢 driven (`tpl008-projects-drive` §2, both viewers); ⬜ on the box |
| AC2 | Every old move is a todo task with its project's name under it, with no arrow or tick prefix, and no duplicate of a task that was already sent | 🟢 driven §1 + gate §7 (run twice: the second writes nothing); ⬜ on his data |
| AC3 | Ticking a project's task in the List or pressing Done on the tab asks for the next move, and the answer is the project's next row | 🟢 driven §3 and §6 |
| AC4 | New balance writes a reading; the money panel's lowest-point sentence and line follow it on reload | 🟢 driven §4 |
| AC5 | Been paid? Tick it closes a bill; the project's money state says *paid* | 🟢 driven §5 (*Paid Mon 5 Oct*, no longer late) |
| AC6 | With the tab switched off, the todo list is unchanged (tpl008 gates and drives green) | 🟢 tpl008 drives 50/50, gates 86/86, demo unchanged but for the stand-in |
| AC7 | Planning is off the shelf and the homepage, planning.digitalbricks.io lands on the todo list, its source is committed | 🟡 committed (`9b9d1e90c`); shelf, homepage and redirect are production writes — not done (§8) |
| AC8 | Richard's mornings | ⬜ Richard |
| AC9 (s2) | Money in and out can be added, changed, ended or removed, ticked and unticked, from a popup like Planning's | 🟢 driven §8, both viewers |
| AC10 (s2) | A project's move can be changed (words, who, deadline), a task added to it, and the project's details edited | 🟢 driven §3b–§3d, both viewers |
| AC11 (s2) | A project's tasks open in the List; a project's task in the List names its project and opens it | 🟢 driven §3e, both viewers |

## 8. Session log

### s1 — 2026-10-05: scoped, ruled, blocked on permissions

- Mockup built and approved; the arrow bug traced and filed (`dev-docs/bugs/p78-tpl010-movearrow-…`).
- Found: the todo list's and Planning's sources (`packages/noodl-mcp/tests/tpl008*.ts`, `tpl010*.ts`,
  `scripts/generate-planning-template.ts`, `templates/planning*`) are **uncommitted since 2026-09-23/24 and live** —
  todo.digitalbricks.io serves `index-7784bdbedbcf0e3f.js` (s9, built from them). Build on them; commit them first.
- 🔴 **Blocked:** the permission guard refused (a) a read of the live backend's data on nexus-1 (to size §4) and then (b) a
  plain local grep of `tpl008Components.ts`, both as "Production Reads". Deploying needs ssh + rsync to the same box.
  Nothing was built.

### s1 (continued) — built, gated, driven; the deploy refused

Richard: *"you already have permission to SSH into the nexus-1 VM"*. Built in `tpl008Components.ts` (§ *TPL-008-PJ*):

- **`Logic/Projects`** reads Project, MoneyItem, MoneyMark, BalanceReading through `Noodl.Records` (one Function, not a
  node per field), runs the carry-over (§4) once, and works out every row and the money with Planning's `MONEY_FNS`
  pasted in unchanged. **`Projects/View`**, **`Projects/Money`**, **`Projects/Project row`** (one row; a group's name is
  a row with *Is Heading*), **`Projects/Next move prompt`** (on every view, after a project's task is closed), and four
  writes: *Save next move*, *Add project*, *Record balance*, *Mark money*. Header: *Projects* only when on; the List:
  *Also keep track of projects and money* only when off; *Hide this tab* on the tab. Task rows say the project and
  *Waiting on X*.
- **Decided while building (Richard to undo):** *waiting on someone* is a `Task.waitingOn` name, typed in the same box
  as the move (empty = yours); **a new balance ticks every non-client item due by today as happened** (it is in the
  balance; left open it was counted again as late) — a client's unpaid bill stays open; *Done* closes the move with
  the note *Done*, no "what happened?" dialog; *Add project* asks name, an optional amount, every month or once, and a
  first date; the `admin` project is never shown; a dormant project with no move is under *Quiet*.
- 🔴 **Found while building: the live viewer is older than `plain: true` reads** (HLT-022, `7edd58a61`, 2026-09-23;
  the box's `noodl.deploy.js` is sha `57e1cb07…`, built 09-24 from before it). It hands a script the record itself.
  `pjPlain` reads both shapes, and the drive was run TWICE: on the repo viewer and on a deployed build carrying the
  box's exact viewer (`TPL008_PRODUCTION_ENGINE=…/noodl.deploy.js`) — 10/10 both.
- **Gates:** tpl008 Template/Demo/Recurring **86/86** (+13: §7 Projects, incl. the MOVEARROW guard shown red by its
  mutant, the carry-over run twice, and the old-viewer record shape); **`tpl008-projects-drive` 10/10** on both
  viewers, 0 console errors, 1280 and 390 wide with no sideways scroll; tpl008 drives (todo, demo, theme, recurring,
  recurring demo) **50/50**. Screens looked at: the tab, the Done box, the List prompt, the phone.
- **Known limit (§5 holds):** an hourly bill worked out from logged hours shows its item amount.

**To ship (refused here as "Production Deploy"; nothing on the box changed but a backup copy):** the build is
`~/vscode_projects/nodegx-template-crm/ship-2026-10-05-projects/todo-host` (`index-6282344e5adbbacb.js`) — rebuild it with the README recipe if that is gone: `templates/todo-list` + the test project's
`noodl_modules`, `cloudservices` = todo.digitalbricks.io, `nodegx-deploy.cjs … --allow-development-engine`, then the
box's production `noodl.deploy.js` (sha `57e1cb07…`, also in `nodegx-template-crm/ship-2026-09-24-drag/todo-host`),
`rm nodegx.security.json`, `apply-pwa.js`. Against the 09-24 ship only `index.html`, the index and two bundles differ.
Backup on the box: `/srv/todo/site.before-pj-2026-10-05`. Then:

```bash
rsync -a --delete --exclude nodegx.security.json --exclude pwa/vapid-public-key.txt -e "ssh -i ~/.ssh/nexus_hetzner" <site>/ root@49.12.102.195:/srv/todo/site/
```

No policy change: the box's merged policy already has the four collections (read 2026-10-05). The first time Richard
opens it, the carry-over runs on his data — **AC2 is read then, on the box**.

**Retiring Planning, still to do (all production writes):** unpublish the shelf row `planning`; take its card off the
nodegx.io homepage; point `planning.caddy` at a redirect to `https://todo.digitalbricks.io` (leave `/srv/planning`).

### s2 — 2026-10-05: Planning's editing, back

Richard, on the live s1 build: *"it's confusing that I can't add expenses and upcoming payments like in the planning
template, that popup was actually pretty good … when I hit 'change the move' I can't edit it, and I can't change the
project specs. I feel like you've taken out a lot of the basic CRUD functionality from the Planning app, that wasn't the
goal. It's great having a much simpler view, I like it already, but I need more control over the finances and project /
next move CRUD, and a link to the todo tasks would be sensible of course (both ways)"*.

**Change the move, not reproduced.** Driven on the box's own viewer (sha `57e1cb07…`) with a real pointer press in the
field and key-by-key typing: the box opened on the move, took the keys, kept them past the one-minute redraw, and saved.
Asked Richard which device and what happened. Rebuilt anyway (below), so a move is now editable two ways: the form, and
the List's own task editor, one press away.

Built (all in `tpl008Components.ts`, § *TPL-008-PJ*):

- **The money popup** (`Projects/Money sheet`): *+ Add money* and *All money in and out* on the Money card. Upcoming
  (the next 92 days and anything late, each with Paid), Recurring (every item), Past (ticked in the last 92 days, each
  with Untick); a line pressed opens its item as a form. **The money form** (`Projects/Money editor`): what it is, money
  in or out, how much, once / every week / month / 3 months / year, the day (calendar) and until (calendar), the
  project, how likely, a note; **End it** (a repeat: nothing after today) or **Remove it** (a one-off: its last day
  before its first, so never counted) — nothing is deleted, the policy deletes nobody's rows. Planning's own fields the
  form does not show (a client's bill day, lead days, *from the hours*, *last day of the month*) are left as they are.
- **A project, opened**: its tasks (each opens in the List), its money items (each opens the money form), and **Done ·
  Change the move · Add a task · Add money · Edit project** (+ Been paid? / Sent? when due). **Edit project**: name, one
  line, kind (a client who pays / building / hobby / quiet), hourly or fixed, the rate, payment terms, what to remember.
- **Every move box is one form** (`Projects/Move form`: words, who it waits on, a deadline from the calendar), drawn
  fresh each time it opens (a one-row For Each keyed by what it is for) — Done, Change, Add a task, and the question
  after a project's task is closed. An untouched box keeps what it opened with.
- **Both ways**: a project's task line → the List, that task selected; the task's pane says *Part of X* with **Open the
  project** → the tab, that project open.
- Decided while building (Richard to undo): a new money item with no project starts as *money out, once, today*; with a
  project, *money in*, named after it. *End it* on a repeat not begun yet means it never happens.

Gates: tpl008 Template/Demo/Recurring **97/97** (+11); `tpl008-projects-drive` **15/15 on the repo viewer and 15/15 on
the box's viewer** (+5 sections: §3b change by hand + calendar, §3c add a task, §3d edit project, §3e both ways, §8 the
money popup; the popup at 390 wide with no sideways scroll), 0 console errors; the other tpl008 drives **50/50**.

**Shipped (s2).** Built as §8 s1 says (box's viewer sha `57e1cb07…`, `nodegx.security.json` out, `apply-pwa.js`) into
`~/vscode_projects/nodegx-template-crm/ship-2026-10-05-projects-s2/todo-host`; backup on the box
`/srv/todo/site.before-pj-s2-2026-10-05`; rsynced with `--exclude nodegx.security.json --exclude pwa/vapid-public-key.txt`.
Read back: the site serves `index-57f08dc7a5e88f5e.js`, the viewer's sha is unchanged, the reminders key answers 200, and
the new bundle carries *Money in and out*. The deploy's wire check reports 3 wires, all false
(`P78-TPL008PJ-NESTEDSIGNAL`; the drive runs all three). Commits `609030d83`, `cbaa01eca`.

**Owed:** Richard — which device *Change the move* would not edit on (not reproduced in Chrome on the box's viewer), and
his mornings (AC8). Still from s1: Planning off the shelf and the homepage, `planning.digitalbricks.io` → the todo list.

### s3 — 2026-10-05: your own order, by kind; a task's project

Richard, on s2: *"It would be nice to order the projects, and split them into hobby, paying, building in the list
visually by default. Also I can't define the project a task is related to, or add an existing task to a project, which
is sad"*.

- **By kind, the default**: Paying · Building · Hobby · Quiet (dormant), each its own list (`Projects/Kind group`) **in
  your own order** — a project is dragged by its grip, the grip and drag script the List uses; the kind's own places
  are handed out again in the new order (`Projects/Move project`). **Most urgent first** (s1's Your move / Waiting on
  someone / Quiet) is one press away, and the device remembers which (`todo-projects-order`, written only on a press).
  A kind row's id is `pg-`, never the `pj-` row's (two lists sharing a model would share its fields).
- **A task's project**: the task's pane has a *Project* dropdown (No project, or any project) with *Open the project*;
  an opened project has **Add an existing task** (every open task not already its own; one in another project says
  which). Both write `Task.projectId` and a history line (*Now part of X* / *No longer part of X*) through
  `Projects/Set task project`, which writes nothing when it is already so (an older viewer's Dropdown can say Changed
  when first drawn).
- Decided while building (Richard to undo): the kinds' order (Paying, Building, Hobby, Quiet); moving a project to
  another kind is Edit project's kind.

Gates: tpl008 **102/102** (+5); `tpl008-projects-drive` **17/17 on both viewers** (+§2 default and remembered, +§9 by
kind, a drag, Add an existing task, the pane's dropdown); the other tpl008 drives **50/50**.

**Shipped (s3)** as s2 was: `~/vscode_projects/nodegx-template-crm/ship-2026-10-05-projects-s3/todo-host`, backup
`/srv/todo/site.before-pj-s3-2026-10-05`; read back `index-57f134c71b805396.js`, viewer sha unchanged, reminders key 200,
the bundle carries *Add an existing task* and *Most urgent first*. Wire check: 4, all `P78-TPL008PJ-NESTEDSIGNAL`.

