# TPL-010 — The planner

**Opened 2026-09-20**, Richard's own, after a day of mockups. The ask, in his words:

> *"A way of tracking how much client income is coming and when … managing project deadlines using the todo app in tandem …
> and a way of understanding what I COULD be doing, what I'm NOT doing … not just target 'scraping by' every month."*
>
> And the frame that landed: *"You've billed X hours this month, you're on track to miss the end of the month by Y hours,
> you need Z per day for the remaining days, and that still leaves A hours for B and C that should generate revenue next month."*

**Status: 🟡 TEMPLATE BUILT, DEMO NOT.** `npm run template:planner` writes `templates/planner/` — 43 components,
`validate_project` 0 errors, 0 console errors, page width equals the viewport. `templates/planner-demo/`, the gates
and every acceptance criterion that needs a running backend are **not done** (§6 s1). Mockup approved: `mockups/envelopes-b.html` (proposal B, *"a damn good base"*). Five earlier mockups
were rejected and the reasons are rulings below, so nobody rebuilds them.

**The person sentence:** *Richard opens one screen on Monday morning and sees, without scrolling, how many billable hours the
month still needs per day, how many hours are left for building, and which one email to send first.*

---

## 1. Rulings (2026-09-20, from six mockups)

| # | Question | Ruling |
|---|---|---|
| R1 | Tone | **Plan, never judge.** The first mockup (Hard Numbers) was *"mostly just preachy … only telling you how bad things are"*. Every sentence the app produces is a plan for the remaining days, not a verdict. |
| R2 | The unit | **Hours, not project prices.** *"I went hours a long time ago because I realised how much I was getting ripped off with project rates."* The month target is billable hours = (household need − partner contribution) ÷ rate, all four from Settings. |
| R3 | Capacity | **Six focused hours a day** is the ceiling; a day over it says *"Over the focus ceiling. Nothing else goes here."* Per-day need = hours left ÷ working days left, checked against the ceiling; the remainder is the building budget. |
| R4 | Envelopes | **Four: Billable, Building, Admin and asks, Hobby.** Budgeted once a month, like giving every hour a job. Hobby is budgeted at zero and going over it is reported, never flagged: *"not budgeted, not counted, not a problem."* Asks to dormant clients count as Admin. |
| R5 | The only main view | **The week.** *"Seeing the weekly view made me think 'aaah this is what I need'."* Columns Mon–Sat, blocks per project, envelopes strip above, cash strip below. **It must fit above the fold on a laptop and never grow.** No tabs. No second page. |
| R6 | Projects | **Behind a button, as a card over the week** (the Trello frame): grouped list on the left, one project on the right. Rejected: a card grid (*"no mental frame of reference"*), inline expanding rows in a timesheet (*"too long … below the fold gets forgotten"*), tabs. |
| R7 | Moves | **One line of chips under the envelopes, sorted by urgency, dormant projects included.** Each project carries one *next move* with a worth and a when. Clicking a chip puts 30 minutes into the next day with room; the chip then reads as placed. |
| R8 | Dormant projects | **They stay on the board.** *"It helps remind you of older projects you might want to follow up with."* Group `dormant`, listed last, each with a move; the shutdown notices when a dormant move has no time in the week. |
| R9 | Building work | **Counts only if it points at a rung** of the long-term destination (a learning brand). A project of kind `building` names its rung; free work with no rung is `hobby`. The card for a finished building asset says *"fixes only"* so it stops absorbing hours. |
| R10 | Money | **Invoices go out at month end, cash is due by the 7th.** The cash strip lists the next six weeks of events (partner contract, invoices out, household costs, invoices due) with the balance after each; events with a negative balance-after are outlined red. Dates and amounts come from Settings and `CashEvent`. |
| R11 | The todo list | **Left alone.** *"I like my current todo app."* The planner links to it (TPL-010-L); it does not replace it and ships no todo tab. |
| R12 | The coach | **In the template, the shutdown drawer is rules over data**: today's hours, the month position, one concern, carry/drop for unfinished blocks, tomorrow as it stands. The MCP coach is a later task (README). The one behavioural rule already ruled: **a concern is raised once; an override is logged with a review date and never re-argued.** |
| R13 | Look | **TPL-008's tokens by ruling** (system font, three sizes, light and dark, theme switch), with one addition: **four envelope colours are data colours, not accents** — blue/violet/grey/amber, validated for colour-vision deficiency in both modes (`mockups/` did this with the dataviz validator; keep the hexes). Red stays reserved for overdue and over-ceiling. |
| R14 | Hosting | **Signed in, on nexus-1, same account as the todo list** (TPL-010-H). The demo on nodegx.io is browser-only with the invented data (R9 of TPL-008 applies). |
| R16 | **The hours a block really took** | **A modal, like the todo app's** (Richard, 2026-09-21): *"when you click to interact with a card or whatever you get a modal where you can add hours, what happened"*. The week does not grow a field of its own — R5 says it fits a laptop and never grows, and a row of editable boxes across six columns is the quickest way to break that. The tick keeps its one-press meaning (*it took as long as it was meant to*) and is still the fast path; the words and the hours open the sheet. |
| R17 | **The phone** | **One day column and a day picker** under a breakpoint (Richard, 2026-09-21). Six columns do not fit at 390px, and `bodyScroll: false` CLIPS rather than scrolls, so 53 of 205 texts were on the page and unreachable. R5 keeps its meaning where it was ruled — on a laptop the week fits and nothing scrolls — and the phone looks at one day of that same week at a time. Under the breakpoint the page scrolls **down**; it never scrolls sideways. |
| R15 | Width | 🔴 A scroll container inside a page-level grid once blew the page to 5,800px. **Page grids use `minmax(0,1fr)`; scroll containers get `min-width:0`; every build is rendered headless at 1280px and looked at before it is shown.** |

## 2. The data

Collections in `templates/planner.security.json`, all `authenticated` for find/get/create/update, `delete: "nobody"` except
`Block` (a dropped block is deleted; nothing else is), `creatorOwns: true`, `signup: "public"` with the same START-HERE warning as
TPL-008.

| Collection | Fields | Notes |
|---|---|---|
| `Project` | `name`, `sub` (one-line description), `kind` (`earning` `building` `hobby` `dormant` `admin`), `rate` (€/h, earning only), `slot` (1–3 or null), `rung` (building only), `move`, `moveWorth`, `moveWhen`, `moveDue` (date or null), `moveStop` (bool: "fixes only"), `facts` (array of `[label, value]`), `history` (six monthly numbers for the sparkline), `say` (one line, optional), `position` | One row per project. `admin` is a fixed row created on first run. |
| `Block` | `projectId`, `date` (`YYYY-MM-DD`), `what`, `planned` (h), `actual` (h or null), `done`, `isMove`, `todoTaskId` (null unless TPL-010-L), `position` | The week is `Block` rows for six dates. Logging sets `done` and `actual`. |
| `MonthPlan` | `month` (`YYYY-MM`), `billable`, `building`, `admin`, `hobby` (budgets in h), `workingDays`, `openingBalance` | One row per month, written by the settings screen from the four inputs plus overrides. |
| `CashEvent` | `date`, `amount` (signed), `label`, `kind` (`income` `cost` `invoice-out` `invoice-due`), `recurring` (`monthly` or null) | The cash strip. Recurring rows are expanded on read for the next six weeks. |
| `Settings` | `rate`, `householdNeed`, `partnerIncome`, `partnerDay`, `costsDay`, `invoiceDay`, `paymentTermsDays`, `focusHours` | One row per user. **These are the only fields that hold real money in the hosted app.** |

The demo variant stores the same shapes in `localStorage['nodegx-planner-demo-v1']`, seeded with the invented data in
`mockups/envelopes-b.html` (`P`, `B`, `G`, the cash events).

## 3. How it is built

Through the plan door, like TPL-008: `packages/noodl-mcp/tests/tpl010Components.ts`, `tpl010Template.ts`, `tpl010Theme.ts`,
`tpl010Demo.ts`; generator `scripts/generate-planner-template.ts`; `npm run template:planner` writes `templates/planner/` and
`templates/planner-demo/`, then copies `templates/planner.security.json` in last. Gates assert the directory is byte-identical to a
fresh build. Category `data-app`.

Components (`components/_registry.json`), following the mockup one for one:

- **`App`** — root; CSS Definition with both palettes (TPL-008's `themeCss()` plus the four envelope colours); boot Function.
- **`Pages/Week`** — the only page (`urlPath: ""`); gates on `net.noodl.user.User` → `/Pages/Sign in`. **`Pages/Sign in`** as TPL-008.
- **`Logic/`** — `Planner data` (the only reader: Project, Block for the visible week, MonthPlan, CashEvent, Settings), `Envelopes`
  (used/budget/left/per-day per envelope; the four sentences), `Day columns` (focus hours vs ceiling per day, the header line),
  `Moves` (projects with a move, sorted by `moveDue`, placed flag), `Cash line` (expand recurring, running balance), `Shutdown`
  (today's totals, the month sentence, the one concern, tomorrow's focus total).
- **`Commands/`** — `Add block`, `Log block`, `Unlog block`, `Carry block`, `Drop block`, `Place move` (30 min in the next day under
  the ceiling), `Add project`, `Edit project`, `Set month plan`, `Add cash event`, `Edit settings`. Each = guard Function → record
  write, as TPL-008. (`Send to todo` arrives with TPL-010-L.)
- **`Week/`** — `Envelope tile`, `Moves strip`, `Move chip`, `Day column`, `Day header`, `Block`, `Cash strip`, `Cash event`,
  `Shutdown drawer`, `Carry row`, `Project card` (the modal), `Project list row`, `Project detail`, `Day boxes` (the six small day
  totals in the card), `Sparkline`, `Settings sheet`, `Theme switch`.

Behaviour that the mockup already specifies and the build copies: the placed-chip rule, the "new" outline on a just-placed
block, the over-ceiling header, the red outline on a negative cash event, the shutdown concern order (unsent building move first,
then dormant moves with no time), Escape closes card and drawer, the card opens from the Projects button or a block's project name.

## 4. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | `npm run template:planner` builds both directories; gates green; 0 validator errors; 0 console errors in a browser | 🟢 **done.** Both `templates/planner/` and `templates/planner-demo/` build from one run; `tpl010Template.test.ts` is **25/25** and asserts both directories are byte-identical to a fresh build; 0 validator errors; the driven browser reports **0 console errors** across every interaction below. |
| AC2 | With the demo's Settings {rate 70, need 5000, partner 1200, focus 6} and 41 h logged with 5 working days left, the target is 55 h, the Billable tile reads *"2.75 h a day for the 5 days left"* and Building's left equals (6 − 2.75) × 5 rounded to the quarter hour | 🟢 **done.** Run as a gate against the shipped `Logic/Envelopes` script with the clock held at Friday 25 September 2026: target 55, used 41, daysLeft 5, perDay 2.75, buildingLeft 16.25, and the sentence word for word. |
| AC3 | Clicking the first chip on the strip writes one `Block` of 0.5 h on the first day with focus < 6, the chip reads as placed, and a second click opens the card instead of writing again | 🟢 **driven.** The first chip (Founder A, overdue) wrote exactly one Block: 0.5 h on Tuesday — Monday was over the ceiling, so it went to the first day with room. The chip then read ✓ placed, and a second press opened the card on Founder A with the store unchanged (62 blocks before and after). |
| AC4 | Logging a block with `actual` ≠ `planned` shows the actual, moves the envelope, and the day header's segment bar changes width | 🟢 **done and driven (s3).** R16 answered the open half: `Week/Log sheet` opens on a block from its words or its hours, prefilled from the block itself. Driven on the demo — Bramble & Co's Tuesday block, planned 2 h, logged at **3.5 h** with the words changed: the block reads 3.5 h, Tuesday's header goes **5 / 6 h “Planned” → 6.5 / 6 h “Over the focus ceiling”**, Billable **13 h left → 9.5 h left** and its sentence **1.5 → 1 h a day**. Reopening shows 3.5 and the button reads *Save*, with *Not done yet* beside it; pressing that puts the block back to 2 h and Billable back to 13 h, **keeping the edited words**. Opening a **different** block then shows that block's words and an empty hours box — the trap this design could most easily have had, and the one the gate holds. 0 console errors. 🔴 For the record, this AC also found the build's worst defect (s2): an empty `actual` was read as nought, so every logged block counted as zero. |
| AC5 | Shutdown on a day with an unlogged building move names it as the one concern; once logged, the concern becomes the first dormant project with no time; with neither, *"No concerns tonight."* | 🟢 **driven and gated.** The drawer on a Monday read: the day line, the month line, and one concern — *"Founder A is on the strip with no time in the week. One email, and it is a yes or a no."* The order and the empty case are run as a gate against the shipped `Logic/Shutdown` script. |
| AC6 | Carry moves the block to tomorrow and tomorrow's focus total updates in the drawer before it is closed; Drop deletes it and nothing else in the database changes | 🟢 **driven.** Carry moved a 2 h block to the 22nd: it left *Not done today*, appeared in *Tuesday as it stands*, and the focus total went 5 → 7 / 6 h **with the drawer still open**. Drop took the store from 61 blocks to 60 and left Project, MonthPlan, CashEvent and Settings counts untouched. |
| AC7 | The card lists projects grouped `earning` `building` `hobby` `dormant` with hours this week and the move; opening it from a block's project name preselects that project; Escape closes it and the week is unchanged | 🟢 **done.** The card lists all four groups with hours this week and each move; pressing a placed chip opens it on that project. The list scrolls (measured: 681 px of box, 878 px of content). **Escape now closes the card, the drawer and the sheet** — there is no keyboard node in the product, so it is a Function holding one `document` listener, keyed on `window` so a remount replaces it rather than stacking a dead one. |
| AC8 | **Rendered headless at 1280×900, everything from the app bar to the cash strip is visible without scrolling, and `document.documentElement.scrollWidth` equals the viewport width** (R15) | 🟢 **done, and looked at, at both sizes (s3).** At **1280×900**: 0 errors, `scrollWidth` 1280, `pageHeight` 900 — the week still fits above the fold and still does not grow, in both palettes, with the log sheet and the day picker added. At **390×844** (R17): `scrollWidth` 390 — it never scrolls sideways — **0 texts unreachable**, where it was 53 in s2, and 0 console errors. ⚠️ 16 elements are wider than a 390px viewport: they are the move chips and the cash events, which live inside the two `overflow-x: auto` strips R7 and R10 ruled, so they are reached by scrolling the strip. The measure tool counts any element wider than the viewport and does not look for a scrollable ancestor, so it calls them clipped; they are not. **A 685px chip in a 390px strip is still a poor read on a phone** — worth a ruling, not a quiet redesign. |
| AC9 | The demo at `https://nodegx.io/templates/planner/` is driven with real clicks: AC3, AC5 and AC7 pass against the public URL, and reload keeps the state in `localStorage` | 🟡 **half.** `templates/planner-demo/` is built, gated, and driven with real clicks at `127.0.0.1` — AC3, AC5, AC6 and AC7 all pass against it, Reset demo puts the example week back, and the state survives a reload in `localStorage['nodegx-planner-demo-v1']`. It is **not published** to nodegx.io yet. |
| AC10 | Light and dark: every contrast pair in `CONTRAST_PAIRS` passes AA against both palettes, including the four envelope colours on their soft fills | 🟢 **41 pairs × 2 palettes, 0 failures**, recomputed from the token sets. See s1 on the two hexes this changed, and s2 for both palettes rendered and looked at. |
| AC11 | **Richard's week of real use, hosted (TPL-010-H)**, with his own settings and projects, and one report of a sentence that read as a verdict rather than a plan (R1) | ⬜ Richard |

## 5. Open questions, decided by building then asking

| Q | Question | Proposed |
|---|---|---|
| Q1 | Does the week start on the current week or the week containing "today" from Settings? | The current week; the `‹ ›` nav moves by seven days and rewrites `Planner data`'s date window. |
| Q2 | Where do `facts` and `history` come from in the hosted app? | Typed in the project editor for now; derived from `Block` and invoices later. |
| Q3 | Is `MonthPlan` written automatically on the 1st? | No. The settings sheet has "Plan this month" which writes it; the week shows a one-line prompt until it exists. |
| Q4 | Saturday | Shown narrow, `optional`; hours there count in their envelope like any other day. |

## 6. Session log

### s0 — 2026-09-20: six mockups, fifteen rulings, this file
Hard Numbers (rejected: preachy) → Two Clocks (rejected: report-shaped) → Envelopes week (approved shape) → Projects grid (rejected)
→ merged tabs (rejected) → week timesheet with expanding rows (rejected: too long) → three proposals with research (Akiflow,
Sunsama, Harvest, Toggl Plan, Trello card, YNAB) → **proposal B built as `mockups/envelopes-b.html` and approved**, with the moves
strip carrying dormant projects (the piece of proposal A that survived). Width defect found by headless render and fixed (R15).

### s1 — 2026-09-20 (evening): the template builds, and the approved palette had a defect in it

Built through the plan door, TPL-008's route, against `packages/noodl-mcp/src/server` — the working-tree source, which is
newer than both registered MCP servers (the `nodegx` one runs `dist/`, and `nodegx-puppy-test-3` is the shipped app bundle
pointed at an old project; Richard: *"avoid anything that talks about the 'puppy test' MCP"*).

**Written:** `templates/planner.security.json`, `packages/noodl-mcp/tests/tpl010Theme.ts` (312 lines),
`tpl010Components.ts` (~3,300 lines, 43 components), `tpl010Template.ts`, `scripts/generate-planner-template.ts`,
and the `template:planner` npm script.

**🔴 R13 said "keep the hexes" and two of them could not be kept.** The ruling's own justification is that the four
envelope colours were *"validated for colour-vision deficiency in both modes"*. Three of four were. Measured:

- **Dark Building `#9085e9` vs dark Billable `#3987e5` under protanopia: ΔE 4.6.** The two envelopes the whole app is
  about — the hours that pay now against the hours that pay later — were the same colour for a protanope at night.
  Moved to `#a66bb8`; worst pair across normal, deuteran, protan and tritan is now ΔE 22.0. Its soft fill moved with it.
- **Light Hobby `#c98500` on its own soft fill: 2.73**, under the 3:1 a non-text mark needs. Darkened to `#bf7e00`.

Also split each envelope into a **mark** (floor 3.0) and an **ink** (floor 4.5): the colours are painted as borders,
fills, dots and bars everywhere except one place — the group label in the card — and no mark colour here clears 4.5 on
every ground it sits on. AC10 is 41 pairs × 2 palettes, 0 failures.

**What the door refused, and was right about.** Six hand-written sibling subtrees for six fixed months
(`repeated-sibling-subtree`) — now `Week/Spark bar`, `Week/Day box`, `Week/Fact row` and `Week/Project group`, four
components the task file did not list and the build is shorter for. And `wired-dimension-becomes-grow`, which is **not
cosmetic**: a lone fill in a track takes a main-axis percentage as flex-grow and fills the whole track whatever number it
is given, so every bar now carries a transparent remainder sibling and the two numbers add to 100 — which is how the
approved mockup draws its day segments.

**Four port names that are not what they look like**, all found by the door or the render, all silent failures otherwise:
a text box's value is `onTextChanged` (`textChanged` is a signal, and wiring it into a value port lands `false` there);
its value input is `startValue`, not `text`; signing in reports `done`, not `success`; and Delete Record fires on
`store` — `storageDelete` is the method behind the port, and wiring to it produced the one console error this build had.
⚠️ **`tpl008Components.ts` still wires `text` and `success` on its sign-in page.** Either those ports changed under it
or the shipped todo template has a dead sign-in — worth ten minutes before the next publish.

**A deviation from §3 worth knowing:** `Logic/Card rows` is a seventh `Logic/` component. The card needs as much
derivation as the week does and the alternative was `Pages/Week` growing a second brain. `Week/App bar` came out of the
page for the same reason (the door's `oversized-page`); the page is still 52 nodes and still over the advisory 40.

**NEXT, in order:** (1) `tpl010Demo.ts` — the browser-only variant, which is also the only way to *see* the week and so
the thing AC3–AC8 are all waiting on; (2) `tpl010Template.test.ts`, the gates; (3) Escape closes the card and the drawer
(AC7); (4) Richard's ruling on AC4 (above).

**🔴 A loss, in this session, that nobody has recovered:** `cp -R tasks/. <phase-78>/` overwrote
`dev-docs/tasks/phase-78-the-templates/README.md`, which had **uncommitted** changes on top of `2ad64ccee`. Local
history, Time Machine, APFS snapshots, every Claude transcript, the index, stashes and all 18 dangling blobs: nothing.
The committed version is restored and this board now lives at `TPL-010-BOARD.md`. Whatever that edit said is gone.

### s2 — 2026-09-21: the demo, and the first time anybody looked at the week

The next steps s1 left are done: the demo (1), the gates (2) and Escape (3). (4), the ruling on
AC4, is still Richard's.

**Written:** `packages/noodl-mcp/tests/tpl010Demo.ts` (the transform, TPL-008's route: the demo is
*computed* from `TPL010_COMPONENTS`, so it can never be older than the template),
`tpl010Template.test.ts` (**25 assertions, all green**), the demo variant in `tpl010Template.ts`
and `npm run template:planner` now writes `templates/planner-demo/` as well.

**The demo is the only way to see this app, and seeing it found five defects in one hour.** Every
one of them was invisible to the door, to `validate_project` and to a signed-out render, and four
of the five would have met Richard on his first evening with it.

- 🔴 **Every logged block counted as nought.** `Logic/Log block` writes an empty `actual` on
  purpose — *"an empty field means it took as long as it was meant to"*, and its comment says
  exactly that — but `hoursOf` only fell back for `null` and `undefined`, and `Number('')` is 0. So
  the envelopes stayed empty however much work went in, and the same rule, **written out a second
  time** in `Logic/Day columns`, put "0 h" on every block on the screen. Both now go through one
  `hoursOf`, and the gate runs it three ways.
- 🔴 **The week opened with the settings sheet and the evening drawer over it.** `shown` was wired
  straight from a Variable nobody had set yet, and `undefined` is not `false`: the group kept its
  own default, which is mounted. The card never had the fault because it asks a Function whether
  its id is empty. The other two ask the same kind of question now.
- 🔴 **`loaded → refresh` on the page was an endless fetch loop** — every fetch finished, said so,
  and asked for another. Gone; and because the arrows had been relying on nothing to re-read the
  window, the fetch now follows the window itself (`Outputs.fetch()` on the last line of
  `pnWindow`, after the query parameters it acts on).
- 🔴 **`›` moved the week exactly once, ever.** Two Functions saying `Outputs.step = -1` and
  `= 1`: **a Function publishes an output only when the value changes**, so the second press of an
  arrow published nothing. The arrows step a **Counter** now — a number that is different after
  every press — and one Function turns the count into a Monday, then pulses. Held back on its first
  run, so mounting does not start a fetch for a visitor who has not signed in.
- 🔴 **Nine icon buttons were 8 × 8 empty boxes** — the week arrows, the settings, the theme
  switch, a chip's plus and all three close buttons. Lucide is a *module*, and a template ships
  none. Filed as **D77**; every icon here is a character now (`‹ › ⚙ ☾ ☼ + ✕ ✓`), which is what the
  approved mockup used in the first place, and the gate fails if one comes back. ⚠️ **TPL-008 has
  the same icon buttons and has not been re-measured.**

**What the demo seeds.** The approved mockup's week, invented end to end, dated from the visit: a
fixed Monday-to-Saturday story whose logged/planned split follows whichever day you arrive on, plus
the month before it filled day by day so the envelopes have a history. The sanitisation rule is a
gate assertion, not a good intention.

**🔴 The phone is a different design, and this task does not have one.** At 390 × 844 the six day
columns cannot fit and `bodyScroll: false` (R5) means the overflow is **clipped, not scrollable**:
53 of 205 texts are on the page and unreachable, and 16 elements are wider than the viewport.
Desktop is clean. R5 was ruled for a laptop and the approved mockup is a laptop mockup, so this is
not a defect to fix quietly — it is **TPL-010-H's first question**, because that task's acceptance
is the planner *on a phone* and a PC. The cheapest honest answer is probably: under a breakpoint,
the page scrolls and the week becomes one day column with the day picker — but that is Richard's
call, not this session's.

**NEXT, in order:** (1) Richard's ruling on AC4 and on the phone; (2) publish
`templates/planner-demo/` to `nodegx.io/templates/planner/` and re-drive AC9 against the public
URL; (3) TPL-010-H (hosting), which the phone question now belongs to.

### s3 — 2026-09-21: the two rulings, built and driven

Both questions s2 left came back the same day, and both are built: **R16** (the log sheet) and
**R17** (the phone). Richard also ruled **fix TPL-008's icons now**, and **do not publish yet** —
so `templates/planner-demo/` is still local and AC9 is still 🟡 half.

**The readings, taken first.** `npm run template:planner` builds both directories,
`tpl010Template.test.ts` was **25/25** and is now **30/30**, and both artefacts are byte-identical
to a fresh build. s2's numbers held.

**🔴 One of s1's two warnings was wrong, and it would have cost a session.** s1 wrote that
*"`tpl008Components.ts` still wires `text` and `success` on its sign-in page"*. It does not:
the sign-in page uses `onTextChanged` and `done` throughout, and the string `'success'` does not
appear anywhere in the file. The shipped todo sign-in was never broken. **The other warning was
right**, and is now measured rather than suspected — see D77 below.

**AC4, the log sheet (R16).** New: `Week/Log sheet` and `Commands/Save block`; `Week/Block`'s
words and hours became Buttons carrying an `openLog` signal, forwarded by `Week/Day column`.
One command, not two, with `logged` as a **parameter** on two instances rather than a wire —
*Log it* and *Not done yet* would otherwise have been two producers on one value port, which is
the stale-value trap this file opens with. The sheet closes on the **write**, not on the press,
so a refusal leaves the words in the box.

🔴 **The one thing that makes it safe is a product behaviour, so the gate holds it.** A Text
Input's value goes in at `startValue` and comes out at `onTextChanged`, and setting `startValue`
while the box is unfocused **re-publishes** `onTextChanged` (`text-input.ts` `setText`). Without
that the sheet would carry one block's words into the next block it opened on. Checked in the
source before the sheet was wired, then driven: opening a second block shows the second block.

**The phone (R17).** The whole answer is one string: every column carries a `columnClass`, and
exactly one of the six carries `planner-day-picked`. Under `max-width: 700px` the stylesheet
draws that one at full width and hides the other five; above it, the day picker is what is
hidden. Which day survives the week arrows — a day picked last week falls back to today, and
then to the Monday, rather than leaving the phone showing nothing.

**Four defects the render found, none of which the door or the gates could.** The s2 lesson
again: the only way to know is to look.

- 🔴 **A row field called `fill` put two console errors on the week** — *"`fill` is one of a
  Noodl Object's own names … `row.fill` reads that and never the data"* — and every day chip
  was painted the same. Renamed `chipFill`; a gate now walks every row field against the
  reserved names.
- 🔴 **The day picker was on screen on the laptop too**, taking a row off the week it exists to
  avoid. A Group renders its own `display: flex` **inline**, and an inline style beats a class
  whatever the specificity — which is why the theme switch's hide has always carried an
  `!important` and this one had to as well.
- 🔴 **The app bar lost its last three controls at 390px**, one of them **Shut down** — the
  evening the whole app is built around. It is one row of five; it wraps now.
- 🔴 **Everything that opens over the week was sized for a laptop.** 50% of 390px is a 195px
  sheet, and the projects card is two columns of 148px and 242px. Under the breakpoint they
  take the room and the card's two columns stack.

**And one the tool could not answer.** `measure-from-disk` calls text unreachable when its top
is past `document.documentElement.scrollHeight`, and with `bodyScroll: false` the deploy shell
pins `#root` `position: fixed; overflow: clip`. Making the **page group** the scroll container
left the count at 28 — the tool cannot see an inner scroller, and `drive-page.js` cannot help
because Chrome will not make a window narrower than about 500px. So the phone uses the deploy
shell's **own** `.body-scroll > #root` rule under the breakpoint: `bodyScroll` is a project
setting and cannot be turned on for narrow screens alone, and this is the layout the product
already supports, applied where it is needed. **0 unreachable**, and the metric means something
again.

**TPL-008's icons (D77), fixed on Richard's word.** Measured first: `templates/todo-list-demo`
rendered *"17 text elements and not one picture or glyph"* while four of its components asked
for Lucide. Same character swap as TPL-010, same gate. After: **27 texts**, ten glyph buttons at
26–28px, every one reachable, **zero empty-text visible buttons**. ⚠️ **It cost the accessible
names** — `checkLabel` used to say *Mark done* / *Mark not done*, and the label now has to carry
the tick, because D72 leaves a Button no second port to put a name in. That is a trade between
two faults, not a regression from a working state: the names were being read off buttons nobody
could see. **D72 is the port that would give both back.**
🔴 **TPL-008 is on the community shelf and has NOT been republished.** Richard said not to
publish this session. `templates/todo-list/` and `templates/todo-list-demo/` on disk are now
ahead of the shelf.

**GATES, this session.** tpl010 **30/30** (five new: the two AC4 shapes, the reserved-row-name
walk, what `Save block` writes three ways, and the picked day's fallbacks). tpl008 **25/25**
(its D72 gate became the D77 gate, keeping the eleven-button control list). Rendered at
1280×900 and 390×844, **0 console errors at both**, and looked at in **both palettes**.

**NEXT, in order:** (1) publish `templates/planner-demo/` to `nodegx.io/templates/planner/` and
re-drive AC9 against the public URL — **and republish `todo-list` to the community shelf in the
same pass**, because its icons changed; (2) TPL-010-H (hosting), whose phone question R17 has
now answered; (3) TPL-010-L. **Richard's calls still open:** whether a 685px move chip inside a
390px strip is acceptable on a phone (AC8), and whether D72 is worth opening so the glyph
buttons can have names again.

### s4 — 2026-09-21: Richard's first hour with the demo — six findings, written up, nothing built

Richard used `templates/planner-demo/` locally with `envelopes-b.html` open beside it. Every finding is researched
against this file's rulings and the build's lines in **[TPL-010-R2](TPL-010-R2-FIRST-USE.md)**; the seventh ask, the coach
over MCP, is **[TPL-010-MCP](TPL-010-MCP-THE-COACH.md)**. The short version, and what each one says about the rulings above:

- **The look is not the mockup's** (R2.1). R13 said *"TPL-008's tokens (system font)"* and the mockup he approved uses
  Public Sans, Archivo and IBM Plex Mono; R7 said *"one line"* and the mockup wraps; no max width was carried over so his
  columns are 40% wider than the mockup's; the envelope colour is painted four times on every block. **R13a, R13b, R7a,
  R5a proposed.**
- **No invoice exists in the data** (R2.2): should / will / agreed / when have nowhere to live. **R18–R21 proposed;** Q2
  closes for earning projects.
- **Place move chooses the day for him and does not say which** (R2.3). `placed()` also only looks at the visible week.
  **R7b–R7d proposed.**
- 🔴 **Four commands are placed on the page and nothing presses them** (R2.4): `Add block`, `Add project`, `Edit
  project`, `Add cash event`. In the hosted app he could write Settings and a month plan and nothing else. And **R16's
  one-press tick is the wrong default for him** after use: *"I can't send that kind of detail to a client."* **R16a, R22,
  R23 proposed.**
- **Settings is eight numbers** (R2.5); the split is arithmetic and nothing recommends. **R24, R25 proposed.**
- 🔴 **R5's `bodyScroll: false` clips his 1,423×800 window** (R2.6) — AC8 measured 900px tall, his laptop is 800. The
  mockup scrolls; the build pins. **R5b proposed:** the fit is a target, the page scrolls.

**Rulings waiting on Richard before any of it is built:** R13a, R13b, R16a, R5b. The rest is additive.

**NEXT, in order:** (1) Richard's four rulings; (2) R2.6 (one setting), then R2.1; (3) R2.4, R2.3, R2.2, R2.5; (4) publish
and TPL-010-H as s3 left them; (5) TPL-010-MCP.
