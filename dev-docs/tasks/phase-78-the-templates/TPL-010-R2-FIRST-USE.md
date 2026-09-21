# TPL-010-R2 — The planner, round two: what the first hour of use found

**Opened 2026-09-21**, from Richard's first session with `templates/planner-demo/` in a browser, with the approved mockup
open beside it. Six pieces of feedback, each researched against the build below and written as a task with its own
acceptance criteria. **Status: ⬜ nothing built; every ruling approved 2026-09-21.** Prerequisite: TPL-010 as it stands (gates 30/30).

The seventh ask from the same message — Claude Code as the coach, with every row and every setting open to it over MCP —
is its own task, [TPL-010-MCP](TPL-010-MCP-THE-COACH.md), because it lives on the hosted backend and not in the template.

**The person sentence, unchanged from TPL-010:** *Richard opens one screen on Monday morning and sees how many billable
hours the month still needs per day, how many hours are left for building, and which one email to send first* — and now
he can also put a project, a move and a block there himself, log a half hour without closing the block, and see when each
client's next invoice goes out and what it will say.

**Sanitisation rule, still non-negotiable:** invented clients and figures only (Bramble & Co, Northline, €700 add-ons).
Nothing here names a real client, rate, income or cost.

**Order:** R2.6 first (one setting; it unblocks looking at the page at all), then R2.1, R2.4, R2.3, R2.2, R2.5.
R2.4 before R2.3 and R2.2 because both need the editors R2.4 adds.

---

## R2.1 — The look: it is close, and it is not the mockup — ✅ built s1, waiting on R2.1-6 (Richard)

**Richard:** *"it's close, but ugly in comparison. Font needs changing to match mockup, background colours of the cards
aren't the same transparency maybe? Moves by urgency is very hard to navigate scrolling left to right. The 'cash next six
weeks' bit is weirdly aligned. It all looks too tight together … the left thick border makes me think it's a visual
language but it's not (maybe it should be). If you look at the todo app, our goal is visual simplicity, no distracting
visual noise for ADHD people like me."*

### What the build does, and why

| Richard saw | The build | Where | Why it is so |
|---|---|---|---|
| Wrong font | `--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, one family for everything; numbers only get `tabular-nums` | `tpl010Theme.ts:152`, `tpl010Components.ts:234` (`T_NUM`) | R13: *"TPL-008's tokens by ruling (system font …)"*. The approved mockup never used the system font: **Public Sans** for text, **Archivo** (width 90, weight 800) for the title and card headings, **IBM Plex Mono** for every number (`envelopes-b.html:2`, `body`, `.bar h1`, `.num`, `.detail h2`). R13 was written before the mockup was, and the mockup is what he approved. |
| Card backgrounds | Blocks sit on `--env-<k>-soft`, the same hexes as the mockup's `--bill-soft` etc. The difference is around them: the mockup draws the six columns inside **one** surface box (`.weekwrap`, 1px line, dividers between columns) and the envelopes, moves and cash each in a surface box with a 1px `--line` border; the build draws columns and strips straight on `--background` with no container | `tpl010Components.ts:1119` (`DAY_COLUMN`), `:1020` (`MOVES_STRIP`), `:1173` (`CASH_STRIP`) | Built from the component list, not from the mockup's CSS. The soft fills read as "transparent" because nothing frames them. |
| Moves scroll sideways | `SCROLL_X` (`overflow-x: auto`) on the chip row, so ten chips are one 2,000px line with a scrollbar | `tpl010Components.ts:360`, `:1032` | R7 says *"one line of chips"* and R15 (the 5,800px page) made a scroller the safe reading. **The mockup wraps** (`.chips{flex-wrap:wrap}`, `envelopes-b.html:75`) and his screenshot of it shows seven rows of chips. The build followed the ruling's words over the approved picture. |
| Cash strip alignment | Header is *"Cash, next six weeks"* left and three numbers pushed right with `space-between`; the events are content-sized boxes in a sideways scroller, so they stop at 60% of the width while the header spans all of it | `tpl010Components.ts:1182-1188`, `CASH_EVENT` `:758` | Mockup: one surface box, header line inside it, events `flex:1; min-width:110px` so six of them fill the row (`envelopes-b.html:99-101`). |
| Too tight | Block padding `var(--space-1)` all round, rows gap `space-1`; the mockup's block is `5px 6px 5px 5px` with a 5px gutter and columns `padding:5px; gap:4px`. Close on paper — but the build stretches to the full window (his is ~1,420px wide) while the mockup caps at `max-width:1060px` centred, so his columns are 40% wider and every block is a wide thin strip with wrapped 12px text | `tpl010Components.ts:660-668`; `.app{max-width:1060px}` `envelopes-b.html:41` | No max width was carried over. |
| The thick left border | Every block carries the envelope colour **four times**: the 3px left border, the tick's border, the project name, and the soft fill. Tiles carry it as a top border, chips as a dot, the card's move box as a left border | `BLOCK` `:647-740` | R13 says the four envelope colours are data, and they are — but painting the same datum four ways on a 40px block is why it reads as decoration and not as a language. |

### Rulings (proposed s0; **all ruled YES by Richard, 2026-09-21**)

- **R13a — the fonts are the mockup's.** Three tokens: `--font-sans` Public Sans, `--font-display` Archivo (the h1 and
  card titles), `--font-mono` IBM Plex Mono (every number: hours, money, day totals, the week label). Loaded by one
  `@import` at the top of the App's CSS Definition (`themeCss()`), with the fallback stacks the mockup has. A template
  ships no module, but a CSS import is CSS; both the nodegx.io demo and the hosted app are online. Offline, the fallback
  stack shows and nothing breaks. ✅ *ruled 2026-09-21*
- **R13b — one carrier per block.** The envelope colour is painted **once** on a block: the left border. Tick, project
  name and words are `--foreground`/`--muted-foreground`; the soft fill stays as the ground because it is what makes a
  column readable at a glance. Same rule for a tile (top border only) and a chip (the dot only). The colour is then a
  language: *the coloured edge says which envelope this hour belongs to*, and nothing else is coloured. ✅ *ruled 2026-09-21*
  *(Alternative on file: drop the border, keep the fill. Rejected on the evidence of the mockup he approved, which has both.)*
- **R7a — the moves strip wraps**, as the mockup does, inside its surface box. R15's fix is unaffected: a wrapping row has
  no content width to report. If the strip pushes the week under the fold on his laptop, the fallback is the six most
  urgent chips plus a *"+4 more"* chip that opens the card — but only if measured, not pre-emptively. ✅ *ruled 2026-09-21*
- **R5a — a max width.** The week is `max-width: 1100px` centred (the mockup's 1060 plus a gutter). Above that the
  page shows ground either side, and a block is a block. ✅ *ruled 2026-09-21*

### The work

1. Fonts: the three tokens in `TPL010_TOKENS`/`TPL010_DARK_TOKENS`, the `@import` line in `themeCss()`, `T_TITLE` and
   the h1 on `--font-display`, `T_NUM` on `--font-mono`. Gate: the import is present and the three tokens exist in both
   sets.
2. Containers: `Week/Day column` ×6 inside one surface group with 1px dividers; the envelopes row, the moves strip and
   the cash strip each in a surface box with the mockup's padding. Tokens exist for all of it (`--surface`, `--border`,
   `--radius-lg`).
3. The moves strip: `SCROLL_X` → a wrapping row (`flexWrap: 'wrap'`, `rowGap`). The `planner-scroll-x` class stays on
   the cash strip only.
4. The cash strip: header inside the box; each event `flex: 1 1 110px` so the row fills the width; the "invoices go out"
   event with `—` for its amount as the mockup draws it.
5. Spacing: the mockup's numbers one for one (block `5px 6px 5px 5px`, gutter 5px, column gap 4px, tiles `9px 12px`,
   strips `7px 10px`), and `max-width: 1100px` on the page group.
6. R13b: unwire `mark` from `bkWho` (colour) and `tickColor` from the tick's border; the tick's border is
   `--border-control`, filled with the mark only when done. Recheck `CONTRAST_PAIRS`: fewer pairs, not more.

### Acceptance

| AC | Criterion |
|---|---|
| R2.1-1 | Rendered at 1280×900 in both palettes beside `envelopes-b.html` at the same size: a person cannot tell which is the mockup from the type. Public Sans, Archivo and IBM Plex Mono are what `getComputedStyle` reports on body, h1 and a block's hours — ✅ s1: all three `document.fonts` loaded; body `"Public Sans"`, h1 `Archivo 800 90%`, hours `"IBM Plex Mono"`, in dark and light. The "cannot tell" half is R2.1-6 |
| R2.1-2 | The moves strip has **no horizontal scrollbar** at 1280 and at 1100; the chips wrap; `scrollWidth` still equals the viewport (R15) — ✅ s1: 1280 → 1280, 1100 → 1100, 0 overflowing; 11 chips on 8 rows |
| R2.1-3 | The cash events fill the strip's width at 1280 with no scrollbar; the header line sits inside the same box — ✅ s1: six events at `flex: 1 1 110px` span the box |
| R2.1-4 | On any block exactly one element has an envelope colour in its computed style, besides the background (R13b) — ✅ s1, measured in the DOM: 22 blocks, **0** with the mark on a second element, both palettes |
| R2.1-5 | AC10 recomputed: every remaining pair passes AA in both palettes — ✅ s1: **the gate did not exist** (the theme's header claimed one); written now, with the ten new text-on-soft pairs R13b creates. Tightest: 5.00 (light muted text on Building's soft) |
| R2.1-6 | Richard, on his laptop: *"that's the mockup"* — or one named thing that still is not |

---

## R2.2 — The project card has no money in it

**Richard:** *"I don't see where in the projects modal we can put in when the next bill is going out, i.e. which
billable hours will go into it (anything before and up to that date), and when that will be due. That is what will give
the calculation of how much I'll be paid and when, based on the actual billable hours, as well as showing me a projection
of what I SHOULD be able to bill, vs what I'll actually bill when I check off the stuff I actually did, vs how many hours
the client has agreed to and when I might be going over those hours. So the project view needs a lot more 'finance
management' functionality, showing past bills, when they were paid, how long they took to get paid, when the next one
is, etc."*

### What the build does

- **There is no invoice anywhere in the data.** §2 of TPL-010 has five collections and none is a bill. `Project` has
  `rate`, and `facts` / `history` are **typed by hand** (Q2: *"Typed in the project editor for now; derived from `Block`
  and invoices later"*). The mockup's *"Last paid, 5 Sep, on time"* and *"Budget this month, 14 of 14 h"* are strings.
- Invoice timing is **global**: `Settings.invoiceDay` and `Settings.paymentTermsDays` (R10: *"invoices go out at month end,
  cash is due by the 7th"*). A client on different terms cannot be expressed.
- *"Invoiced so far"* on the cash strip is logged hours × rate over the month (`tpl010Components.ts:2117`), with no period
  boundary, no "sent" and no "paid".
- The cash strip's `invoice-out` and `invoice-due` events are **typed `CashEvent` rows** (`Logic/Cash line`, `:2393`), so
  they never follow the hours. In the demo they are seeded constants.
- The card's *This week · 7 h · €560* line (`Logic/Card rows` `:2727`) is the only money the card computes.

So the three numbers he asked for — **should** (planned hours to the invoice date × rate), **will** (logged hours × rate),
**agreed** (the client's cap) — do not exist, and the fourth, **when** (issue date, due date, paid date), has nowhere
to live.

### Rulings (ruled YES 2026-09-21)

- **R18 — an invoice is a row.** New collection `Invoice`: `projectId`, `periodStart`, `periodEnd`, `issueDate`,
  `dueDate`, `hours`, `amount`, `sentOn` (null until sent), `paidOn` (null until paid), `reference`, `note`,
  `blockIds` (the blocks it bills — the proof of work). `delete: nobody`, `creatorOwns`. ✅ *ruled 2026-09-21*
- **R19 — billing terms belong to the project.** `Project` gains `invoiceDay` (day of month, or `0` = on delivery),
  `termsDays`, `agreedHours` (a month; `null` = no cap), `cycle` (`monthly` | `one-off`). Empty means *"use Settings"*, so
  nothing changes for a project that does not say. ✅ *ruled 2026-09-21*
- **R20 — the cash strip's invoice events are derived, not typed.** For every earning project: one `invoice-out` on its
  next issue date for the **will** amount (logged) — captioned with the **should** amount if it differs — and one
  `invoice-due` at issue + terms. An `Invoice` row that exists replaces the derived pair for its period; one with `paidOn`
  is history. `CashEvent` keeps only what cannot be derived: the partner's contract, household costs, one-offs. ✅ *ruled 2026-09-21*
- **R21 — over the agreed hours is a plan, not a flag** (R1). The sentence is *"Agreed 14 h. Planned 16.5 h. Ask
  before Friday, or drop 2.5 h."* — never red. ✅ *ruled 2026-09-21*
- **Q2 closed for earning projects:** `facts` and `history` are derived from `Invoice` and `Block`. Typed `facts` stay
  for building, hobby and dormant projects, where they are prose.

### What the card shows, earning project

```
BILLING
Next invoice   Wed 30 Sep · covers 1–30 Sep · due Wed 7 Oct
Logged         11.5 h  €920       (will)
Planned        14 h    €1,120     (should)
Agreed         14 h a month       on plan
                                                  [ Raise the invoice ]

PAST INVOICES
Aug   14 h  €1,120  sent 31 Aug  paid 5 Sep   5 days
Jul   14 h  €1,120  sent 31 Jul  paid 12 Aug  12 days
Jun   12 h  €960    sent 30 Jun  paid 3 Jul   3 days
```

*Raise the invoice* opens a sheet prefilled with the period, the logged blocks (each with its entries from R2.4 — the
detail he can send a client), the hours and the amount; it writes the `Invoice` row and marks `sentOn` when he says
sent. *Mark paid* takes a date. A one-off project has the same box with *covers* being the block list.

### The work

1. `templates/planner.security.json`: `Invoice` appended, same posture. The merge script in TPL-010-H already refuses
   collisions.
2. `Logic/Planner data` reads `Invoice` (bounded: this user, last 12 months). The gate on *"only Planner data reads the
   backend"* holds.
3. `Logic/Billing` (new): per earning project, the next period from `invoiceDay`/`termsDays`/Settings; should / will /
   agreed; the past list with days-to-pay; the derived cash events handed to `Logic/Cash line`.
4. `Week/Project detail`: the Billing section and the past list (a `For Each` over `Week/Invoice row`). Hidden for
   non-earning kinds.
5. `Commands/Raise invoice`, `Commands/Mark invoice sent`, `Commands/Mark invoice paid`; `Week/Invoice sheet`.
6. Demo seed: three past invoices per earning project, invented; the cash strip's typed invoice rows removed from the
   seed because R20 derives them. The gate that walks the seed for real names/figures stays.

### Acceptance

| AC | Criterion |
|---|---|
| R2.2-1 | Bramble & Co (invoiceDay 30, terms 7, agreed 14, rate 80) with 11.5 h logged and 14 h planned by the 30th shows *should* €1,120, *will* €920, *agreed 14 h · on plan*, next invoice Wed 30 Sep due Wed 7 Oct — run as a gate against the shipped `Logic/Billing` script with the clock held |
| R2.2-2 | Planning 2.5 h more on Bramble makes the agreed line read *"Agreed 14 h. Planned 16.5 h. Ask before Friday, or drop 2.5 h."* and nothing turns red |
| R2.2-3 | The cash strip shows one `invoice-out` and one `invoice-due` per earning project, derived; raising the invoice replaces the derived pair with the row's amount; marking it paid moves it to the past list with the days-to-pay |
| R2.2-4 | *Raise the invoice* lists the period's blocks with their log entries (R2.4), and the written `Invoice.blockIds` names exactly those |
| R2.2-5 | Salon Collective with no per-project terms falls back to Settings' invoice day and terms; the demo's typed invoice `CashEvent` rows are gone and the strip is unchanged to the eye |
| R2.2-6 | `Invoice` is in the policy with `delete: nobody`; the gate's five-collection assertion becomes six, and the seed gate finds no real figure |

---

## R2.3 — Put 30 min in the week: pick the day, then show it

**Richard:** *"'Put 30 mins in the week' is a good idea for a button, but not clear. I'd rather a date picker input
where I can pick where I want that activity to go in the project modal, then see afterwards on each 'next action' which
date the action has been set for, so I can distinguish between ones I've set or not set. Also maybe another visual
language in the project picker could be for tasks in projects' 'next action' portion that haven't been added to the
week yet, so I know which ones are outstanding and not being dealt with."*

### What the build does

- `Commands/Place move` writes 0.5 h into `firstOpenDay` — the first day from today under the ceiling, chosen by
  `Logic/Day columns` (`tpl010Components.ts:2156`, `:2278`). The person does not choose the day and is not told which one
  it went to; the only sign is the *new* outline on the block for one render.
- After placing, the card's button reads *✓ In the week* (`Logic/Card rows` `:2730`) and the chip reads placed (`Logic/Moves`
  `:2313-2322`) — neither says **when**.
- `Project.moveWhen` is free text (*"Fri, on the call"*) and `moveDue` is a date used only to sort the strip and turn a
  chip red (`:2325-2336`). Neither is where the block went.
- 🔴 `placed()` looks only at the **visible week** (`:2313-2322`): a move placed next Tuesday reads *unplaced* this week,
  and a second press writes a second block.
- The card's list rows show `→ move` in muted or `! move` in red (`:2691`); placed and unplaced look the same.

### Rulings (ruled YES 2026-09-21)

- **R7b — the move box takes a day and hours.** In the card, the move box is: the move, its worth, then a **date field**
  (TPL-008's date picker, one source: `packages/noodl-mcp/tests/datePicker.ts`, built as `Week/Date picker`) prefilled
  with `firstOpenDay`, an hours field prefilled with 0.5, and *Put it in the week*. Once placed the box reads
  **"In the week: Thu 24 · 0.5 h"** with *Move it* (changes the block's date) and *Take it out* (drops the block). The chip
  on the strip keeps its one-press default (0.5 h into the first open day, AC3) because that is the fast path; the card is
  where you choose. ✅ *ruled 2026-09-21*
- **R7c — placed means a live move block on or after today**, not "in the visible week". A done move block does not
  count; the move is then done and the project wants a new one (R2.4's editor). ✅ *ruled 2026-09-21*
- **R7d — two states, drawn differently, everywhere a move appears.** Unplaced: a hollow marker and the muted move text
  (*"→ Offer the add-on"*). Placed: a filled marker and the day (*"✓ Thu · Offer the add-on"*). On the strip a placed
  chip carries the day where the ✓ is. In the card's list, unplaced moves are what the eye should land on, so they keep
  full-strength text and placed ones go muted — the strip's line-through was the mockup's and it stays there. ✅ *ruled 2026-09-21*

### The work

1. `Week/Date picker` from `datePicker.ts` (the TPL-008 s7 graph; it needs the mount-count wire and the `dynamicports`
   the s7 log describes — copy the working instance from `tpl008Components.ts`, not the prefab).
2. `Week/Project detail`: the date and hours fields, three buttons, the *In the week* line. `Commands/Place move` gains
   `date` and `planned` inputs (defaults kept); `Commands/Move block` (a date update; also what R2.4's editor uses);
   `Commands/Drop block` already exists.
3. `Logic/Moves` and `Logic/Card rows`: `placed` per R7c; new `placedDay` (short label) and `placedDate`; the two
   states' colours and markers as row fields.
4. `Week/Move chip` and `Week/Project list row`: draw the day and the two states.

### Acceptance

| AC | Criterion |
|---|---|
| R2.3-1 | Opening Bramble & Co's card shows the date field on `firstOpenDay` and hours 0.5; picking Friday and 1 h writes one Block on Friday at 1 h; the box reads *In the week: Fri 25 · 1 h* |
| R2.3-2 | *Move it* to Thursday changes that block's date and nothing else in the store; *Take it out* deletes it and the box returns to the fields |
| R2.3-3 | A move placed on a day in **next** week still reads placed this week, and a chip press then opens the card rather than writing (R7c) |
| R2.3-4 | Logging the move block done makes the move read unplaced again with *done* beside the last day |
| R2.3-5 | In the card's list, unplaced moves are full-strength and placed ones muted with their day; on the strip a placed chip shows *✓ Thu*; the gate walks the rows for both states |
| R2.3-6 | AC3 still passes unchanged: the chip's one press writes 0.5 h into the first open day |

---

## R2.4 — Nothing can be added or edited, and a tick is not a log

**Richard:** *"The 'next moves' seem to be purely dummy data? I don't see how you can add a new 'next move' to a
project. For that matter, I don't even see how to add a new project. For that matter, I don't even see how to add a new
task to a day in the week. For what matter, I don't see how to edit a task already in a day column, I can only click to
add hours. Also, adding hours should be a progressive thing. If I work 30 mins on a task that's supposed to take 1 hour,
it's not necessarily done. I'm adding a 30 min sprint I did on that task, maybe I'll do more later or tomorrow, so it
needs to be able to either close or stay open and by default stay open unless I check a box or something. Also when I
tick the box next to a task card in a day column, it doesn't ask me what I did or how long it took, it just checks it. I
can't send that kind of detail to a client as proof of what I did when I'm billing them, bad UX."*

### What the build does

- **The commands exist and nothing presses them.** `Commands/Add block` (`tpl010Components.ts:2855`), `Add project`
  (`:3050`), `Edit project` (`:3085`) and `Add cash event` (`:3159`) are placed on `Pages/Week` (`:3477-3491`) with their
  `do` and value ports **unwired** — the grep for wires into `cmdAddBlock`, `cmdAddProject`, `cmdEditProject`,
  `cmdCashEvent` finds only the Problem banner. §3 listed the commands; no component in §3 is an editor. In the hosted app
  a person could write Settings and a month plan and **nothing else**. Every project, move and block he saw is the demo
  seed (`tpl010Demo.ts`).
- **The tick logs at once.** Block `toggle` → `Log block` with `actual: ''` (`Pages/Week` wires at `:3537-3542`; the
  command at `:2891`). R16 ruled it: *"The tick keeps its one-press meaning (it took as long as it was meant to)"*. He
  has now used it and it is the wrong default for him.
- **The log sheet holds one number.** `Save block` writes `what`, `actual`, `done` (`:2930`). A second half hour
  overwrites the first; there is no list of what happened, so there is nothing to send a client.
- **A block cannot be edited.** The sheet edits `what` and `actual` only; project, planned hours and date are fixed at
  creation. `Carry` (drawer) is the only way to move one, and only to tomorrow.

### Rulings (ruled YES 2026-09-21)

- **R16a — the tick opens the sheet** (overrides R16's fast path, on his word after using it). The sheet opens with
  *Done* ticked and the hours field holding what is left of the plan, so the old one-press meaning is **two** presses
  (tick, Save) and the hours are stated, never assumed. ✅ *ruled 2026-09-21*
- **R22 — time is logged in entries.** `Block` gains `entries`: an array of `{ on, hours, note }`. `actual` becomes the
  **sum** of entries (kept as a column so every existing `hoursOf` reader is unchanged). *Done* is a separate decision,
  **off by default** on *Add time*, on by default when the tick opened the sheet. A block with entries and not done shows
  *0.5 of 1 h* on the week. The entries are the proof of work; the invoice sheet (R2.2) lists them per block. ✅ *ruled 2026-09-21*
- **R23 — three editors, one shape each**, all over the week (R5 still holds: the week does not grow):
  - **Block sheet** (the log sheet, grown): project (a list), what, planned hours, date (the date picker); then *Add
    time* (hours, note, appends an entry), the entries so far, *Done*. Opened by a block's words, its hours, or its tick;
    also by **+** at the foot of each day column with that day prefilled (`Add block`).
  - **Project editor** in the card's right-hand pane: name, one line, kind, rate, slot, rung, the billing terms (R2.2),
    and **the move** (text, worth, when text, due date, *fixes only*). Opened by *Edit* on the detail and by **+ New
    project** at the foot of the card's list (`Add project`, then the same pane). A move is edited here and nowhere
    else; setting a new move on a project whose old move block is done is how a project gets its next move.
  - **Cash events** in the Settings sheet: a list of typed events (partner's contract, household costs, one-offs) with
    add and edit (`Add cash event`, `Edit cash event`). R20 derives the invoices, so this list is short. ✅ *ruled 2026-09-21*

### The work

1. `Block.entries` in the schema note (§2) and in `Commands/Add time` (new: appends, recomputes `actual`, writes `done`
   from the checkbox); `Commands/Save block` keeps `what`/`done` and gains `planned`, `date`, `projectId`.
2. `Week/Log sheet` → `Week/Block sheet` with the fields above; a `For Each` over `Week/Entry row`. The
   startValue/onTextChanged rule from s3 applies to every new box, and the gate that holds it grows with them.
3. `Week/Day column` gets the **+** button (`addBlock` signal with the day's key); `Pages/Week` wires `cmdAddBlock`.
4. `Week/Project editor` (new) in `Week/Project card`; `Pages/Week` wires `cmdAddProject` and `cmdEditProject`. `Add
   project` gains the move fields so a new project can be born with its first move.
5. `Week/Settings sheet`: the cash event list and `Commands/Edit cash event` (new).
6. The tick: `toggle` opens the sheet with `logged` on and `actual` prefilled with `planned − sum(entries)`;
   `Commands/Log block` and `Unlog block` stay for the sheet's *Not done yet*.
7. `Logic/Day columns` draws *0.5 of 1 h* for a block with entries and `done: false`; `hoursOf` is unchanged (sum in
   `actual`) so the envelopes and the ceiling need no new rule.
8. Demo seed: two blocks with two entries each so the state is visible on arrival.

### Acceptance

| AC | Criterion |
|---|---|
| R2.4-1 | **+ New project** writes a `Project` with a move and it appears in the card's list, on the strip, and in the block sheet's project list without a reload |
| R2.4-2 | *Edit* changes Bramble's move text; the strip's chip and the card read the new text; nothing else in the row changed |
| R2.4-3 | **+** on Thursday opens the block sheet on Thursday; saving a 1 h block for Uplift puts it in Thursday's column and Thursday's header moves by 1 h |
| R2.4-4 | On a 1 h block, *Add time* 0.5 h with a note leaves it **not done**, reading *0.5 of 1 h*; the envelope moves by 0.5; a second *Add time* 0.5 h with *Done* ticked reads *1 h* and done; the block's `entries` has two rows with both notes |
| R2.4-5 | The tick opens the sheet with *Done* on and hours prefilled with what is left; Save logs it; Escape leaves the block untouched |
| R2.4-6 | Changing a block's date in the sheet moves it between columns; changing its project changes its colour and which envelope it counts in |
| R2.4-7 | A cash event added in Settings appears on the strip on the next read; editing its amount changes the running balance after it |
| R2.4-8 | Gates: every command placed on `Pages/Week` has its `do` wired from something (the defect this task exists for becomes a permanent assertion); `Add time` three ways (no entries, one, one with done) |

---

## R2.5 — Where the numbers come from is not configurable enough

**Richard:** *"Where do I set my config? Like the number of productive hours I work in a day, the ratio of billable vs
building vs admin, recommendations for those, making sure I'm not doing too many hobby or building hours, etc.?"*

### What the build does

- The Settings sheet (⚙ in the app bar → `Week/Settings sheet`, `tpl010Components.ts:1732`) holds **eight numbers**:
  rate, household need, partner's contribution, focused hours a day, and the four days money moves. That is all of
  `Settings` (§2).
- The split is **arithmetic, not a setting**: billable target = ⌈(need − partner) ÷ rate⌉ (`:2022`); building = what
  the ceiling leaves once the billable day is paid for (`:2054`, R3). Admin's and hobby's budgets are whatever
  `Set month plan` writes, and the sheet has no field for either (`:3638-3643` wires billable, building, working days,
  opening balance).
- Working days are **Monday to Saturday, fixed** (Q4). There is no weekly hours figure, no per-day cap by envelope, no
  hobby ceiling — R4 says hobby is *"not budgeted, not counted, not a problem"*, which is right for the tile and wrong for
  a person asking to be told when hobby hours are eating the week.
- Nothing recommends. The sentences on the tiles report the plan; none says *"this split is out of shape"*.

### Rulings (ruled YES 2026-09-21)

- **R24 — Settings has four sections**, every field a `Settings` column (so the coach can reach each one, TPL-010-MCP):
  1. **Capacity** — focused hours a day (exists), **working days** (seven checkboxes, default Mon–Fri with Saturday
     *optional* as Q4 has it), hours a week (derived, shown).
  2. **Money** — the existing eight.
  3. **The split** — billable target (derived, shown with its formula as now), and **building, admin and hobby as hours a
     month**, each with a recommended figure beside it: building = capacity − billable − admin; admin = 10% of capacity
     rounded to the quarter hour; hobby = 0. *Use the recommendation* fills the field. `Set month plan` writes what the
     fields say.
  4. **Guardrails** — a weekly ceiling for hobby hours and one for building hours; a ratio floor for billable (default
     50% of focused hours). Each is a sentence when crossed, on the tile and in the shutdown drawer, and **never red**
     (R1, R4): *"Hobby is at 5 h this week against your 3 h line. Fine if it was a Saturday."* ✅ *ruled 2026-09-21*
- **R25 — recommendations are rules over the settings, not a model.** The three formulas above, stated on the sheet so
  a person can disagree with them. The coach may change the rules' inputs, never the rules. ✅ *ruled 2026-09-21*

### The work

1. `Settings` columns: `workingDays` (array of 0–6), `buildingHours`, `adminHours`, `hobbyHours`, `hobbyWeekCeiling`,
   `buildingWeekCeiling`, `billableFloorPct`, `todoUrl` (TPL-010-L's L6, so it is here and not in a later migration).
2. `Week/Settings sheet`: the four sections; seven day checkboxes; the recommendation lines and buttons.
3. `Logic/Envelopes`: reads working days from Settings for `daysLeft` (today: counts Mon–Sat); the three budgets from
   `MonthPlan`, which `Set month plan` now writes from the fields; the guardrail sentences.
4. `Logic/Shutdown`: a guardrail crossed is a candidate concern, after the unsent building move and before the dormant
   ones (R12's order grows by one).
5. Demo seed: a Settings row with the new fields, invented.

### Acceptance

| AC | Criterion |
|---|---|
| R2.5-1 | Unticking Saturday removes it from `daysLeft`; the Billable tile's per-day sentence changes accordingly (gate, clock held) |
| R2.5-2 | With focus 6, 22 working days, target 55: the recommendations read building 64, admin 13, hobby 0; *Use the recommendation* fills each field; *Plan this month* writes them to `MonthPlan` and the tiles show them |
| R2.5-3 | Logging 5 h of hobby in a week with a 3 h ceiling puts the guardrail sentence on the Hobby tile and in the drawer as the concern when no building move is unsent; nothing is red |
| R2.5-4 | Every field on the sheet round-trips: save, reload, the same values — and every one is a column in `Settings` (gate walks the sheet's fields against the schema note) |

---

## R2.6 — The page does not scroll, so the cash strip is off the bottom — ✅ built s1 (R2.6-2 re-measured after R2.1; R2.6-5 is Richard's)

**Richard:** *"Classic NodeGX app problem: I can't scroll down to the bottom of the page to see the six weeks cash stuff
if it's below the fold. Scrolling down doesn't work."*

### What the build does, and why

- `bodyScroll: false` (`tpl010Template.ts:83`) and `scroll: 'app'` in the plan (`:170`) — R5: *"It must fit above the fold
  on a laptop and never grow."* The deploy shell then pins `#root` `position: fixed; overflow: clip`
  (`packages/noodl-viewer-react/static/deploy/index.html`), which **clips** rather than scrolls — the same mechanism s2
  found on the phone (*"53 of 205 texts on the page and unreachable"*).
- AC8 measured 1280×**900**. His screenshot is 2,846×1,600 at 2×, a **1,423×800** window. At 800px the cash strip is
  under the fold and there is no way to reach it. The approved mockup does not pin anything; its `body` scrolls, and his
  screenshot of the mockup is cut off at the bottom in exactly the same way — but scrollable.
- The phone breakpoint already undoes the pin under 700px with the deploy shell's own `.body-scroll > #root` rule
  (`tpl010Theme.ts` `themeCss()`, the `body > #root` override) — so the app has two scrolling behaviours and the wrong
  one on a laptop.
- ⚠️ The plan door's `page-cannot-scroll` warning (D56) fires for a plan with no `scroll`; the gate here asserts the door
  raised only the bars warning, so **`scroll: 'app'` asked for a clipping page and nothing said so**. Worth a product
  note if it recurs; not filed from a template task.

### Ruling (ruled YES 2026-09-21)

- **R5b — the week fits a laptop as a design target; the page scrolls when it does not.** `bodyScroll: true`, `scroll:
  'page'`. Nothing else in R5 changes: still no tabs, no second page, the week still the only main view. The phone override
  in `themeCss()` goes, because it is now the default. R2.1's max-width and R2.1's wrapping strip are measured against
  this: at 1280×900 the cash strip should still be above the fold; at 1423×800 it is one scroll away, not gone. ✅ *ruled 2026-09-21*

### The work

1. `tpl010Template.ts`: `bodyScroll: true`, `scroll: 'page'`; the gate that pins the door's warnings updated if the door
   says something new.
2. `themeCss()`: remove the `body > #root` override block and its comment; keep `.planner-page { overflow-x: hidden }`.
3. Re-measure with `measure-from-disk.js` at **1280×900, 1440×800 and 390×844** — three viewports from now on
   (the memory's two were not enough; his laptop is the third).

### Acceptance

| AC | Criterion |
|---|---|
| R2.6-1 | At 1440×800 every text on the page is reachable (`measure-from-disk` 0 unreachable) and `scrollWidth` = 1440 — ✅ s1: 0 unreachable, 1440, `pageHeight` 806, 0 console errors. The case he hit, **1423×680** (a 1423×800 screen less the browser's chrome): **28 unreachable before, 0 after**, the page 806 tall and scrolling |
| R2.6-2 | At 1280×900 `pageHeight` ≤ 900 — the week still fits where R5 was ruled — in both palettes, after R2.1 — ❌ **as written; ✅ as R5b means it.** Before R2.1: 900. After: `pageHeight` **990** — the week ends at ~855 and is inside the fold; the cash strip is one scroll below. The approved mockup renders the same way at 1280×900 (its cash strip is below the fold too), so "that's the mockup" and "≤ 900" cannot both hold. **Richard's call** — R7a's six-chips-plus-"+N more" fallback would buy ~100px |
| R2.6-3 | At 390×844 nothing regressed from s3: 0 unreachable, `scrollWidth` 390, 0 console errors — ✅ s1: identical to the committed s3 build (0 / 390 / 993 tall / 16 overflowing / 0 errors — the 16 were there before; R7a is the likely fix) |
| R2.6-4 | The card, the drawer and the sheets still open **fixed** over a scrolled page (they are `position: fixed`; measured after scrolling 300px) — ✅ s1: card 49–564 in a 613 viewport and the drawer's heading at 16, both after `scrollTop = 300`; **the log sheet** opened at scrollTop 213 (the page's maximum at 1423×680) sits at 35–557 inside a 593 viewport, under a fixed scrim. The card and the drawer are opened from the app bar, which is scrolled away at that point — not yet measured |
| R2.6-5 | Richard, on his laptop: the cash strip is there when he scrolls |

---

## Not in this round

- The MCP coach — [TPL-010-MCP](TPL-010-MCP-THE-COACH.md).
- Month view, recurring cash rules with exceptions (board, *"explicitly later"*).
- The phone reading of a 685px chip (AC8's open question) — R7a's wrapping may answer it; measure after R2.1.

## Session log

### s0 — 2026-09-21: researched and written, nothing built
Six items from one message, each traced to the line and the ruling that produced it. Four proposed ruling changes need
Richard's word before the build: **R13a** (fonts), **R13b** (one carrier), **R16a** (the tick opens the sheet), **R5b**
(the page scrolls). The rest is additive.

### s1 — 2026-09-21: every ruling approved, nothing built yet
Richard ruled on all of them in one pass: **R13a** (the mockup's fonts), **R13b** (one colour carrier per block), **R7a**
(the strip wraps), **R5a** (1100px max width), **R16a** (the tick opens the sheet), **R5b** (the page scrolls), and the
additive **R7b–d, R18–R25** as written. No wording changed. Build order stands: R2.6, R2.1, R2.4, R2.3, R2.2, R2.5.
TPL-010 as built (gates 30/30) committed before any of it, so R2 builds on a tracked base.

### s1 (cont.) — R2.6 built
`bodyScroll: true` and `scroll: 'page'` in `tpl010Template.ts`; `themeCss()` loses the phone-only `body > #root` override
(the shell's own `.body-scroll` rule now applies at every width) and keeps `.planner-page { overflow-x: hidden }` at
every width. One new gate pins both (**tpl010 31/31**). Readings: see R2.6's table. **What the tool could and could
not see:** `measure-from-disk` at 1423×800 showed the cash strip on screen and would have passed the old build too —
the bug only appears at the viewport a 1423×800 *screen* leaves, which is ~1423×593–680. Measure at that height from
now on, not at the screen size.

### s1 (cont.) — R2.1 built
**Done, gated, rendered and looked at** in both palettes at 1280, 1100, 1423×680 and 390. Gates **tpl010 33/33** (two new:
AC10's contrast recomputed in both palettes, R13a's import and tokens), tpl008 25/25. 0 console errors, 0 unreachable
at every viewport. Where the build departs from the task's own words, and why:
- **A done tick is filled with `--foreground`, not the envelope mark** (work item 6 said mark). With the mark, a logged
  block carries its colour twice and R2.1-4 fails; ink keeps R13b's one carrier and the ✓ still reads at a glance.
- **The chip keeps its `+`.** The mockup has none, and removing it would have fitted two chips per line at once — but
  the chip's Group is not focusable, so the `+` is the only keyboard path to *put it in the week*. Instead the strip's
  label moved **into** the wrapping row as its first item, which gave every later row the full width.
- **T_META is 12px** (`--text-xs`), where the vocabulary's `meta` is 14. The mockup's small line is 12 everywhere, and
  at 14 no two chips fit one line. It reaches the card and the sheets too.
- **Two defects found by rendering, fixed:** a chip's `late` (a boolean) was wired into `borderColor`, so a late move
  never drew its red edge (now `edge`, a colour); and AC10's contrast gate, which the theme's header comment described,
  was never written.
- **The phone's 685px chip (AC8's open question) is answered by R7a:** `.planner-chip { max-width: 100% }` and the
  move's words end in an ellipsis, as the mockup's do. 390×844: overflowing 16 → 1 (the cash row, which scrolls by design).
- **Not done:** the week's Saturday column is not narrowed (the mockup's `.6fr`), the day header's bar is one colour
  (the mockup segments it by envelope), and done blocks are not struck through. None is in R2.1's work list.
