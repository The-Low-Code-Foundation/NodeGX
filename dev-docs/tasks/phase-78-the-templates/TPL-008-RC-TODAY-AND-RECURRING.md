# TPL-008-RC — Today, and things that repeat

**Opened 2026-09-23**, at Richard's request, for the template **and** todo.digitalbricks.io:

> *"I'd like to be able to add 'recurring tasks', like every morning I need to remember to take a certain medication I
> have, or every Friday I have to remember to catch up with a certain client about payment for the next 4 weeks. I don't
> really want these to appear in my 'priority list' because they're not organised by priority … So it's more a temporal
> view of things I need to not forget on a daily basis."*

**Status: 🚀 SHIPPED (s1, 2026-09-23, at Richard's request).** todo.digitalbricks.io serves `index-43bded82320b2d24.js`; its
policy has `Routine` + `RoutineCheck` (merged from the live file: 2 added, 0 lost, every existing rule unchanged; the old file
kept as `security.json.bak-20260923215752`); `todo-push` runs the new sender. nodegx.io/templates/todo-list serves
`index-996d9469ecbc9aaa.js`, driven LIVE: `drive-tpl008-rc.js` **10/10**, `drive-tpl008-demo.js` **19/19**. The shelf publish
(166) was not asked for and is not done. AC9 is his week.

**The person sentence:** *Richard opens Today and sees his morning tablets at 08:00 and the Friday client call at 10:00,
ticks the tablets (a note if he wants one), and they are gone until tomorrow; his phone buzzes at 10:00 for the call.*

## 1. Rulings

Asked in chat 2026-09-23 as a proposal with four questions; answered the same evening.

| # | Question | Ruling |
|---|---|---|
| RC1 | Where it lives | **A second tab, "Today".** The List stays the default and stays ordered only by what you do next (TPL-008 R2). |
| RC2 | What Today shows | Overdue tasks → today's recurring items **by time** → tasks due today → deadlines in the next 7 days. Below: every recurring item, and the box that adds one. |
| RC3 | Ticking | A **task** ticked from Today is the list's close ("What happened?", required). A **recurring** item logs that one occurrence, **a note is optional**, and it leaves Today until it is next due. |
| RC4 | A missed one | *"Maybe just logged as missed, not carried over … Can't think where carrying over would be useful."* **Shown as Missed in its history; never carried to the next day.** |
| RC5 | A push at its time | *"Yes please."* The host's sender pushes at each slot's time, unless it is already ticked. |
| RC6 | Schedules | *"Yep daily, weekly, monthly options, with multiple slots per selected timescale."* Daily: times. Weekly: weekdays × times. Monthly: days of the month (and *last day*) × times. |
| RC7 | In Planning? | *"I'd say no right now … I'll go with your recommendation."* **No.** |
| RC8 | Start and end | A start date (set things up in advance) and an optional end date; after the end it is finished. |

Settled by the builder (not asked):

- **Its own collections**, `Routine` and `RoutineCheck`, not a kind of `Task`: a task has a place in the priority order and
  closes once; a recurring item has neither.
- **A missed occurrence is derived, never written** — nobody is there to write it. The history shows the last 30 days.
- **One selection.** `todoSelected` holds a task's id **or** a routine's, so the detail pane, the history query and
  Add note serve both without a second query.
- **Stop** asks *"Why is it stopping?"* (required, like closing a task). Nothing is deleted; `RoutineCheck` is never edited
  (`update: nobody`).
- **The time is typed** (`08:00`, `8:30`, `8pm`): Text Input has no time type — noted on **D73**.

## 2. Data

| collection | fields | policy |
|---|---|---|
| `Routine` | `title`, `cadence` `daily`/`weekly`/`monthly`, `slots` (`"08:00,20:00"`, `"tue@09:00,thu@09:00"`, `"1@09:00,last@17:00"`), `startDate`, `endDate` (`YYYY-MM-DD`, end may be empty), `status` `active`/`stopped`, `stoppedAt`, `stopNote` | signed-in find/get/create/update, delete nobody, creator owns |
| `RoutineCheck` | `routineId`, `date` `YYYY-MM-DD`, `time` `HH:MM`, `doneAt`, `note` | find/get/create; **update and delete nobody** |

Lines in `Event` (`taskId` = the routine's id) keep the history: added, renamed, schedule, dates, done, stopped, notes.

## 3. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | Generates reproducibly, 0 refusals; the policy validates and names `Routine`/`RoutineCheck` with delete nobody | 🟢 tpl008Template 27/27 (byte-identical artefact, 0 warnings), tpl008Demo 18/18; backend drive §4: `RoutineCheck` PUT, DELETE and `Routine` DELETE → **403, 403, 403**; a stranger sees 0/0 |
| AC2 | The schedule rules are one source, graded on fixtures, and the host's sender carries that source byte for byte | 🟢 tpl008Recurring §1 + §5. **Sabotaged:** removing the 31st→last-day clamp reddened only the sender's byte check until a fixture with the 31st ALONE was added (the first fixture also had *last* at the same time, which hid it) — now both go red |
| AC3 | Today shows overdue, today's slots by time, due today and the next 7 days, in that order | 🟢 recurring §2; demo drive §0; production-engine `drive-tpl008-rc.js` |
| AC4 | Ticking a recurring slot writes one `RoutineCheck` and one history line, with or without a note, and the slot leaves Today | 🟢 demo drive §1–§2; backend drive §2 (on the server, owner-only ACL) |
| AC5 | A slot not ticked on a past day reads *Missed* in its history and is not in Today | 🟢 recurring §3; demo drive §6 (the example list's one missed evening, exactly one line) |
| AC6 | A new item, its schedule (weekly Tue + Thu 09:00), an end date and Stop, driven in a browser | 🟢 demo drive §3–§5, §7 (the three changes are ONE history line); backend drive §1, §3 |
| AC7 | The demo carries it with example items, and an old demo store gains them without losing its list | 🟢 recurring §6 (sabotaged: a migration that reseeds Task reddens it) |
| AC8 | The sender pushes a due slot once, inside its window, and not when it is ticked | 🟢 recurring §5 on a fixture DB; **backend drive §5 on the real backend's own SQLite file** (08:05 → nothing, it was ticked; 20:05 → 20:00; 21:05 → nothing) |
| AC9 | **Richard's own week** on todo.digitalbricks.io | ⬜ Richard |

## 4. What was built (s1)

Sources: `packages/noodl-mcp/tests/tpl008Components.ts` (everything below), `tpl008Demo.ts` (seed + migration),
`tpl008Template.ts` (START-HERE), `templates/todo-list.security.json`. `npm run template:todo` → 54 components (was 39).

- **`SCHEDULE_FNS`** — the one place that decides when something repeats (slots, `schedOn`, words, typed times). The
  Today rows, the routine pane, the commands, the demo seed and the host's `sender.js` all carry it.
- **`Todo/`** Today row, Today list, Routine row, Routine list, Day chip, Slot chip, Routine summary. **`Logic/`** Today
  rows, Selected routine. **`Commands/`** Add routine, Rename routine, Set schedule (placed ×5: daily, weekly, monthly,
  add, remove), Set routine dates (×2: start, end), Tick routine, Stop routine — each writes history through
  `Logic/Write history`; `schedule` and `routine-dates` merge within two minutes like moves (R5).
- **The Header** has a Today tab (count = overdue + slots left + due today); its nav wraps on a phone — the first
  drive measured the page 456px wide at 390 with the extra tab.
- **The dialog** has two more questions: *Done. Anything to add?* (**optional** — `Note dialog.optional`) and *Why is
  it stopping?* (required).
- **The page's clock** (`tdClock`): a Function with nothing wired, which the runtime runs once — a minute tick (a slot
  turns red when its time passes, Today turns over at midnight) and a wake when the app comes back into view (loads
  again). **`?view=today`** opens Today — the reminder's link.
- **The demo** seeds four routines (tablets twice a day with one missed evening; a Friday client call for four weeks;
  invoices on the last day; Pilates starting next week) and gives a visitor whose store predates this the routines
  without touching their list.
- **Host:** `sender.js` pushes each slot at its time (60-minute window, once per device and slot, never once ticked;
  web-push now loads lazily so the schedule can be graded in the repo); `sw.js` takes an open app to Today;
  `provision-recurring.sh`. Both provision scripts now refuse a staged policy that would drop a live collection.

**Gates:** tpl008Recurring **27/27**, tpl008Template **27/27**, tpl008Demo **18/18**, `typecheck:mcp` 0.
**Drives (checkout engine):** `tpl008-recurring-demo-drive` **9/9**, `tpl008-recurring-drive` (real backend) **8/8**,
`tpl008-todo-demo-drive` **10/10**, `tpl008-theme-drive` **9/9**, `tpl008-todo-drive` **13/14** (below).
**Production engine** (the deployed demo under `/templates/todo-list/`): `drive-tpl008-rc.js` **10/10**,
`drive-tpl008-demo.js` **19/19**. `nodegx deploy` wire check: 1,090 wires, 0 broken, 0 warnings.

- ⚠️ `tpl008-todo-drive`'s **D72** row is red since `a04263d35` (2026-09-21, D77): it counts buttons a screen reader
  calls *Move up*, and D77 made that name ▲ on purpose (`tpl008Components.ts` says *"This costs the accessible name"*).
  Not changed here — it is D72's door, not a fix to slip in. The theme drive was red for the same reason (its helper
  looked for the words); the helper now reads ☾/☼ by the names they stand for, and it is 9/9.
- ⚠️ `typecheck:backend-tests` has 3 errors, all in a peer's `hlt-024-exchange-roles.test.ts`.

### Not built, on purpose or not yet

- **Planning does not show routines** (RC7).
- **A tick cannot be undone** — nothing is deleted and a `RoutineCheck` is never edited; the dialog is the chance to
  cancel a mis-tap. Worth a ruling if it bites.
- **A stopped routine cannot be restarted**; add a new one. A past end date moved into the future does bring one back.
- When every slot today is ticked, no line says *Today · n done* (the heading rides on a row). Cosmetic.
- **D81 reaches the Ends field** only after a REFUSED pick (an end before the start): the refused day stays in the field
  if the next routine's end is also empty. Read from the script, not driven.
- The time is typed (`8`, `8:30`, `8pm`, `20.15`): **Text Input has no time type** — D73's twin, noted there.
- `Pages/Todo` is 86 nodes (the door's `oversized-page` info; it was 51 after s2). Factoring the routine wiring into a
  component is the next tidy.

## 5. To ship (Richard's)

Order does not matter any more — both provision scripts refuse a policy that would drop a live collection — but **make
each merged policy from the live file right before shipping it**. From the repo root:

```bash
K=~/.ssh/nexus_hetzner; H=root@49.12.102.195; T=dev-docs/tasks/phase-78-the-templates
S=~/vscode_projects/nodegx-template-crm/ship-2026-09-23-rc
# 1. the policy (adds Routine, RoutineCheck) and the sender
scp -i $K $H:/var/lib/todo/data/security.json /tmp/live-security.json
node $T/planning-digitalbricks/merge-policy.js /tmp/live-security.json templates/todo-list.security.json /tmp/todo-rc-security.json
ssh -i $K $H 'mkdir -p /tmp/todo-recurring'
scp -i $K /tmp/todo-rc-security.json $H:/tmp/todo-recurring/security.json
scp -i $K $T/todo-digitalbricks/push/sender.js $H:/tmp/todo-recurring/sender.js
ssh -i $K $H 'bash -s' < $T/todo-digitalbricks/provision-recurring.sh
# 2. the app (production engine, PWA applied, new sw.js)
rsync -a --delete --exclude nodegx.security.json --exclude pwa/vapid-public-key.txt -e "ssh -i $K" $S/todo-host/ $H:/srv/todo/site/
# 3. the nodegx.io demo (already rebuilt in nodegx-web/site/templates/todo-list) and the shelf (count 166)
(cd ~/vscode_projects/nodegx-web && ops/deploy.sh 49.12.102.195)
$T/publish-templates-to-shelf.sh --publish todo-list
```

After it: `https://todo.digitalbricks.io/` serves `index-43bded82320b2d24.js` (before: `index-cd16dceb0f1e42d5.js`);
`node scripts/devtools/drive-tpl008-rc.js https://nodegx.io --path /templates/todo-list/` is 10/10 (before, the live demo
was `index-25afff794ad654b0.js`). 🔴 **Whether the policy landed cannot be read anonymously**: `GET /classes/Routine`
signed out is **403 already, before the ship** (measured 2026-09-23 22:20 — the `defaults` are `nobody` for any collection
the file does not name), so it reads the same either way. Read it **signed in**: adding something that repeats in the app
saves (no *"That change did not save"* banner), or `provision-recurring.sh` printing *"Routine and RoutineCheck added"*.
Turn the bell on on the phone (it already is if deadline reminders were on).
