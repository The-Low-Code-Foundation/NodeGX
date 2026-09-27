# TPL-010-M — The money: one list of what comes in and goes out, and a page that knows it

**Opened 2026-09-21**, from Richard's second look at the demo, after he found the money events inside Settings.
**Status: 🟩 BUILT and driven 2026-09-21 (s2): gates, a real-click drive on the deployed demo, three viewports. M-14 (Richard builds his own month on his laptop) is the one criterion left, and it is his.** Rulings M1–M9 are Richard's own words; M10–M16 were
proposed here and **agreed by Richard on 2026-09-21** (s1), with one addition, **M11a** (lost and part-paid money).
**Step 0 is a mockup**, approved before any graph.

**Supersedes:** R2.2's R18 (`Invoice`), R20 (invoice events derived from projects) and most of R19; the *Money* section
of R2.5's R24; the board's *"explicitly later: customisable cash events"*. Keeps R21 (over the agreed hours is a plan)
and R2.2's should / will / agreed numbers on the project card. See §6 for exactly what changes in R2.

**Sanitisation rule, unchanged:** invented clients and figures only. The figures in this file are the demo's.

---

## 1. What Richard asked for

> *"Can you please move the whole 'money coming and going' section to another modal with its own icon on the header
> bar? It's super useful. It could have like a 'upcoming' and 'past' filter or something, and it always shows the
> recurring payments or maybe auto-pastes the amount of the recurring payment in each month's list, but you can tweak
> each month's value if you want, while still seeing the recurring payment it came from, and see the list of recurring
> payments to add, delete or change them too. Then the money calculations at the bottom of the main page would take into
> consideration the money in and out to show you how far off you are of your target or at least breaking even and not
> being in the red."*

> *"The partner's money should also be a recurring 'money event'. Getting paid by a particular client is a money event,
> not 'I always invoice on the 7th' because it's different for every client. The project settings should show the
> billing cycle and payment terms as fields maybe. But this settings modal should really be a finance management modal
> […] the monthly config will really come from you adding recurring and punctual events, with the option for 'once a
> year on this date' too for stuff that's like tax payments, maybe even once a week?"*

Then, answering three questions:

> *"[Past items] tick it. I think the user should be responsible for confirming that things happened, noting what
> happened every time like the todo list, and knowing everything that's actually late."*

> *"Yep hoped money with a percentage likeliness to do a sort of 'here's what you might earn' sub calculations on the
> main dashboard page at the bottom, with links to any tasks on how to move it towards reality."*

> *"I'll push back on the 'billing and payment dates should be automatic'. In a perfect world sure. In reality sometimes
> I bill someone in the middle of the month, next month at the end. You just never know. I'd still go for when you add a
> project, you add in a money line about when the billing is going to happen, either monthly (with a set start and end
> date so it's not billing forever) or you just punctually put in when you're going to send a bill and when it's due.
> The payment terms can be auto filled from project settings, but your money items list thing is cool and I don't think
> we need to automate it that much, let users build it themselves without too many constraints."*

## 2. What the build does today

- **Money lives in Settings.** `Week/Settings sheet` (`tpl010Components.ts:2259`) holds rate, household need, partner's
  contribution, focus hours, and four days (`partnerDay`, `costsDay`, `invoiceDay`, `paymentTermsDays`), plus
  `Week/Cash editor` / `Week/Cash row` (`:1730`, `:1684`) for the `CashEvent` rows.
- **`CashEvent` knows two schedules:** once, or `recurring: 'monthly'`, walked forward from its own day of the month
  (`Logic/Cash line`, `:2929`). A monthly row cannot be changed for one month, cannot end, and there is no weekly,
  quarterly or yearly.
- **Nothing is ever confirmed.** An event whose date has passed simply drops off the strip (`when >= today`). There is
  no *paid*, no *late*, and the balance is `Settings.openingBalance` / `MonthPlan.openingBalance`, typed once.
- **The target ignores the money list.** Billable target = ⌈(`householdNeed` − `partnerIncome`) ÷ `rate`⌉
  (`Logic/Envelopes`, `:2548`). The household costs are typed twice: once as a number in Settings, once as a cash event.
- **Client money is typed as anonymous events**: *"Invoices go out"* (€0) and *"Last month's invoices due"* (€3,400) in
  the seed (`tpl010Demo.ts:498`). They belong to no project.
- **The bottom of the page** (`Week/Cash strip`, `:1275`) is six weeks of events with the balance after each, a red
  edge under zero, *"Balance today"*, *"invoiced so far"* (logged hours × rate) and one line of terms.

## 3. Rulings

### From Richard's words (2026-09-21)

- **M1 — Money gets its own modal**, opened from its own icon in the app bar beside *Projects*. Settings keeps no list
  of money.
- **M2 — Everything is a money item**: the partner's contract, household costs, tax, a subscription, a client's bill. No
  money field survives in Settings that a money item can express (`householdNeed`, `partnerIncome`, `partnerDay`,
  `costsDay`, `invoiceDay`, `paymentTermsDays` all go).
- **M3 — Schedules:** once on a date · every week · every month · every three months · once a year on a date. A
  repeating item has a **start date and an optional end date**, so a retainer bill or a partner's contract does not run
  for ever.
- **M4 — Each repeat can be changed on its own**, and still shows the item it came from: *"€1,380 · usually €1,500 ·
  Partner's contract, monthly"*. Changing the item changes every repeat not changed by hand. Items can be added, changed
  and removed from a Recurring list.
- **M5 — Client money is typed by the user, not derived.** Adding a project's bills is adding money items to that
  project: a monthly series with a start and an end, or one bill at a time with the date it goes out and the date it is
  due. **Nothing is generated from the project's terms.** The project holds **payment terms** (days) and they
  **pre-fill** the due date when a bill is added; that is the whole of the automation.
- **M6 — Nothing happened until it is ticked.** Every item, in or out, is confirmed by hand, like a todo. An item whose
  date has passed and is not ticked is **late**, and late items are listed first. Ticking records the date it happened
  and the amount that actually moved.
- **M7 — Hoped money has a likelihood**, a percentage. It is never in the balance. The bottom of the week page shows
  *what you might earn* from it, weighted, **with a link to what moves it towards real**: the project's move and its
  blocks.
- **M8 — The bottom of the week page answers "how far off am I"** — from the target, and at least from breaking even
  and not going into the red — using the money in and out, not a typed household number.
- **M9 — Few constraints.** A label, an amount, a date and a schedule are all an item needs. Project, likelihood, note,
  end date and bill date are optional.

### Proposed, agreed by Richard 2026-09-21 (s1)

- **M10 — The data**. Two collections replace `CashEvent`; one records the balance.

  | Collection | Fields | Notes |
  |---|---|---|
  | `MoneyItem` | `label`, `amount` (signed: + in, − out), `repeat` (`once` `weekly` `monthly` `quarterly` `yearly`), `date` (the only date, or the first), `until` (last date, or null), `monthEnd` (bool: "the last day of the month", for monthly and quarterly), `projectId` (null unless it is a client's), `billDate` (for a one-off bill: when it goes out; null otherwise), `billLeadDays` (for a repeating bill: bill goes out this many days before it is due; null otherwise), `likelihood` (0–100; **100 = expected**, anything less = hoped), `note`, `position` | One row per thing that happens to money, once or on a schedule. `delete: nobody` — *remove* sets `until` to the last repeat that should stand, so the past keeps its history (the coach's rule, TPL-010-MCP: nothing is deleted). |
  | `MoneyMark` | `itemId`, `occurs` (the scheduled date this mark is about, `YYYY-MM-DD`), `amount` (this repeat's changed amount, or null), `date` (this repeat moved to, or null), `skip` (bool), `doneOn` (date it happened — the latest payment when paid in parts — or null), `doneAmount` (what actually moved, the running total when paid in parts, or null), `lostOn` (the rest was written off on this day, or null — M11a), `sentOn` (a client bill: the day it went out, or null), `note` | Written **only** when one repeat differs from its item or is ticked. A repeat with no mark is exactly its item. A one-off item's tick is a mark too, so there is one way to tick. (Not `on`: it is a Noodl Object's own method — the reserved-name gate already lists it; see R2.4 s2.) |
  | `BalanceReading` | `date`, `amount`, `note` | The bank balance as read on a day. The latest one is where every projection starts. Replaces `Settings.openingBalance` and `MonthPlan.openingBalance`. |

  Why a mark rather than writing each month out: changing the rent must change every month that was not touched by
  hand (M4), and a year of weekly items is 52 rows that nobody asked for.

- **M11 — Recording the balance is the moment of truth**. The *Record balance* sheet lists every item dated
  on or before today that is not ticked, and asks for each: *happened* (tick) or *not yet*. After a reading, the
  projection is: the reading, plus every item dated after it, plus every item before it still marked *not yet* — which
  is counted **as if it happens today** (a late client payment is still coming; a late cost is still going). This is
  the only reconciliation, and it is by hand, like M6.
- **M11a — Money can be lost, or come in part** (Richard, 2026-09-21: *"there needs to be a way to mark a payment as
  'lost' or partially paid, when clients disappear or go out of business or can only pay part of their bill (it
  happens)"*). Ticking asks for the amount that actually moved, pre-filled with the expected one. When it is **less**,
  the tick asks what happens to the rest: **still owed** or **lost**.
  - *Still owed:* the repeat stays open — *"€400 of €640 paid · €240 still owed"* — keeps its due date (so it is late
    if that has passed), and the next tick adds to `doneAmount`. Only the rest counts in the projection.
  - *Lost:* `lostOn` is set, the repeat closes, and Past shows *"€400 paid · €240 lost"* (or *"€640 lost"* for a
    bill that never came). A whole unpaid bill can be marked lost from its pane without a tick (**Mark as lost**).
  - Lost money is never in a balance and is not a concern; it is history. Record balance (M11) offers the same four
    answers for each past unticked item: *happened* · *part of it* · *not yet* · *lost*. For money out the words are
    *won't be paid* rather than *lost*; the mechanics are the same.
- **M12 — Two views of the same money**.
  - **The month's target smooths:** a yearly item counts as a twelfth a month, quarterly a third, weekly × 52 ÷ 12.
    Otherwise the month the tax lands in asks for thirty more billable hours.
  - **The cash line uses real dates:** the tax is a dip on its day, visible six weeks ahead.
- **M13 — Break-even and target**, all from expected items (likelihood 100) **without a project**:
  - **Break-even** = the month-equivalent of money out − the month-equivalent of money in.
  - **Target** = break-even + `Settings.savingsTarget` (a month, default 0).
  - **Billable target hours** = ⌈target ÷ `Settings.rate`⌉. *(Superseded by M22: fixed bills are counted first.)* This replaces ⌈(need − partner) ÷ rate⌉ in
    `Logic/Envelopes`, and the Billable tile keeps its sentence and its formula line.
  - Client items do **not** reduce the target: they are what the billable hours turn into. They are how the month is
    *doing* against it (M14).
- **M14 — The bottom of the week page, three lines and the boxes**:
  1. **The month** (wording illustrative) — *"Break-even €3,308 · target €3,808. In so far €1,500 · expected by month end €2,120 · €188 to
     target — about 3 h."* When the month is past target: *"€412 past target."* Never red; this is a plan (R1).
  2. **Might earn** (only when a hoped item exists) — *"Might earn €1,320 more, weighted (€3,800 if all come through):
     Coaching offer 40% → send the email to the 500-person list · The Jazz Room 30% → ask if the fundraiser is
     happening."* Each name opens the project card; each move is the project's `move`.
  3. **Lowest point** — *"Lowest in six weeks: €200 on Thu 1 Oct."* Red only under `Settings.lowWaterMark` (default
     0), the one red the strip was built for (R10).
  4. The six boxes as now, **late items first** with a *late* mark, each opening the modal on that item.
- **M15 — Late money is the drawer's first concern**. R12's order grows at the front: *"Bramble & Co's
  €1,120 was due on Wed 7 Oct and is not ticked. Chase it, or tick it."* — before the unsent building move. A cost that
  is late is not a concern (it is almost always paid and not ticked); it is listed in the modal.
- **M16 — A move can become hoped money**. The project card's move has *"Add as hoped money"*: an item on
  that project, amount typed, likelihood 25% by default. The Moves strip keeps its `moveWorth` words; the two are not
  kept in step by the app.

### Billing types, from Richard 2026-09-21 (s1, after the mockup)

> *"Some projects bill differently than others. Some are hourly billed at [one rate], some at [another]. Some are project rate so the
> hours don't actually count towards the payment, I just have to deliver a feature or service within the month as
> agreed to be allowed to bill, though keeping an hourly record is still important, it just means if I do more or less
> hours on a project that's fixed rate, the monthly total shouldn't change."*

His real rates go in his hosted `Settings` and projects, never in this repo; the demo uses invented ones (§5.9).

- **M21 — Every earning project is hourly or fixed.** `Project.billing`: `hourly` (with its own `rate`) or `fixed` (a
  set amount for the agreed work, typed as its money items). A fixed project's hours are still logged, as a record;
  they never change what it bills.
- **M22 — The billable target counts fixed bills first** (replaces M13's last step). Billable target hours =
  ⌈(target − the fixed bills that go out this month) ÷ `Settings.rate`⌉ + the agreed hours of the fixed projects
  billing this month. `Settings.rate` is **your usual hourly rate**, one number (Richard chose it over an average of
  the hourly clients). Demo: target €3,808.33; Bramble & Co (fixed, €1,120, 14 h agreed) and the Northline workshop
  (fixed, €1,120) bill in September, so €2,240 is covered; €1,568.33 ÷ €50 = 31.4 → 32 h, plus Bramble's 14 → **46 h**.
- **M23 — An hourly bill fills from the hours.** A money item on an hourly project can leave its amount to the hours
  (`fromHours`): until it is marked sent, its amount is the hours logged on that project since its previous bill went
  out × the project's rate, and it grows as blocks are logged. It can be changed before sending; marking it sent
  records the amount on the mark, and from then on it is fixed.
- **M24 — A fixed project's card shows the hours and what they came to per hour.** *"11.5 h logged of 14 agreed ·
  the bill is €1,120 whatever the hours · €97 an hour so far"*. The €/h is a check on the price. It is never a
  target and never red.

## 4. The design

### 4.1 The Money modal (`Week/Money sheet`)

Same frame as the Projects card: the list on the left, the selected item on the right, full-screen under 700px.
A three-way filter at the top of the list — **Upcoming · Past · Recurring** — and **+ Add money** and **Record balance**
at its foot.

```
MONEY                                   [Upcoming] Past  Recurring          Balance €3,200 on Mon 21 Sep  ✕

LATE                                                          ← only when there is one
☐ Wed 16 Sep  Salon Collective · bill 0914       +€640    due 5 days ago

SEPTEMBER                      in €1,500 · out €25 · net +€1,475 · ends at €4,675
☐ Sat 26 Sep  Co-working day   ↻ weekly                 −€25     €3,175
☐ Mon 28 Sep  Partner's contract  ↻ monthly            +€1,500   €4,675
  Wed 30 Sep  Bramble & Co · bill goes out  ↻ monthly    (€1,120 due 7 Oct)

OCTOBER                        in €4,120 · out €4,600 · net −€480 · ends at €4,195
☐ Thu 1 Oct   Household costs  ↻ monthly               −€4,500    €175
☐ Wed 7 Oct   Bramble & Co  ↻ monthly                  +€1,120  €1,295
☐ Wed 28 Oct  Partner's contract  €1,380 · usually €1,500  +€1,380  €2,675
  ┆ Thu 29 Oct  Coaching offer · hoped 40%               +€1,800     —
…                                                        [ show three more months ]
```

*(The figures in this sketch are illustrative; the mockup computes them from the seed, M11's late-as-today rule included.)*

- **Upcoming** runs from the oldest late item to three months ahead, grouped by month. Each month's heading carries in,
  out, net and **the balance at its end**. Each row: the tick, the date, the label (and the project, if any), where it
  came from (`↻ monthly`, or *"usually €1,500"* when changed by hand), the amount, the balance after it.
- **A client bill shows twice:** a quiet line on the day it goes out (no amount in the balance, the amount in brackets
  with its due date) and the payment on the day it is due. Ticking the first records `sentOn`; ticking the second
  records the payment.
- **Hoped** rows are dashed, show their percentage, and have no balance after them.
- **Past** is everything ticked, newest first, with the amount that actually moved; a client payment shows its days late
  (*"paid 12 Oct · 5 days late"*), a skipped repeat shows *skipped*.
- **Recurring** is the items that repeat, grouped *in* / *out* / *clients*, each with its schedule in words (*"every
  month on the 28th, from Jan 2026, no end"*), its month-equivalent, and whether it has ended.

**The right pane**, for a repeat: its date, amount and note, with **Tick it** (date and amount pre-filled from the
repeat), **Change this one**, **Skip this one**, and below a rule, the item it comes from with **Change the item** and
**End it**. For a one-off: the same without the item section. **The tick opens this pane** rather than ticking
silently (R16a's pattern), so the actual date and amount are asked every time.

**The item editor** (grows out of `Week/Cash editor`): label · in / out · amount · schedule (five choices) · date ·
*last day of the month* · until · project (optional) · for a project: bill goes out (one-off: a date; repeating: days
before due, pre-filled 7) and due (pre-filled from the project's payment terms) · likelihood (100 unless changed) ·
note. Nothing is required but label, amount and date (M9).

### 4.2 The project card

`Week/Project detail` for an earning project gains **Billing**:

```
BILLING                                     Payment terms  7 days   Agreed  14 h a month
Bills          ↻ monthly, due on the 7th, Jul 2026–Mar 2027            [ + Add a bill ]
Next           goes out Wed 30 Sep · €1,120 · due Wed 7 Oct
This period    logged 11.5 h €920 (will) · planned 14 h €1,120 (should) · agreed 14 h, on plan
Past           Aug  €1,120  due 7 Sep  paid 5 Sep   2 days early
               Jul  €1,120  due 7 Aug  paid 12 Aug  5 days late
```

*This period* is R2.2's should / will / agreed, from hours: information beside the bill, never written into it. The
period is from the day after the last bill that went out to the next one's date. `+ Add a bill` opens the item editor
with the project set and the terms pre-filled. The project editor gains **payment terms** (days) and **agreed hours**
(a month, optional). R19's `invoiceDay` and `cycle` are **not** built: the bills themselves say when (M5).

### 4.3 Settings

Money leaves. Settings keeps (with R2.5): capacity, the split, guardrails — plus **rate** (the default for new
projects and the target's divisor), **savings target** (a month), and **lowest balance before red** (`lowWaterMark`).
The *Money* section of R24 becomes these three fields.

### 4.4 The app bar

A **€** icon button between *Projects* and ⚙, labelled *Money* for screen readers, same size as ⚙. On the phone it
stays in the bar (the bar already wraps).

## 5. The work

0. **Mockup first**, in `nodegx-template-crm/mockups/money.html` (outside the repo, invented data), extending
   `envelopes-b.html`: the modal on each filter, the right pane for a changed repeat, the item editor, the project
   card's Billing, and the new bottom of the week page. Rendered at 1280×900, 1423×680 and 390×844 and looked at before
   Richard sees it (memory: *mockup-render-check*). **Richard approves it before step 1.**
1. `templates/planner.security.json`: `MoneyItem`, `MoneyMark`, `BalanceReading` appended, `delete: nobody`,
   `creatorOwns`; `CashEvent` removed (no hosted data exists yet — TPL-010-H is not built — so there is nothing to
   migrate). `COLLECTIONS` in `tpl010Components.ts:40` follows. `Settings` loses the six money columns, gains
   `savingsTarget` and `lowWaterMark`; `MonthPlan` loses `openingBalance`.
2. `Logic/Planner data` reads the three collections (this user; marks and readings bounded to the last 13 months). The
   gate *"only Planner data reads the backend"* holds.
3. **`Logic/Money`** (new, replaces `Logic/Cash line`): expands items into repeats between two dates, applies marks,
   and returns: late rows, the month groups with in/out/net/end balance, the past list, the recurring list, the
   month-equivalents, break-even, target, the month line, the might-earn line with its moves, the lowest point, and the
   six boxes. **Pure arithmetic, run as gates with the clock held** — the same way AC2 ran `Logic/Envelopes`.
   - Monthly on the 31st in a 30-day month lands on the 30th (and on the 28th/29th in February); `monthEnd` always
     lands on the last day. Quarterly steps three months from `date`. Yearly on 29 Feb lands on 28 Feb in other years.
4. `Logic/Envelopes`: the target from M13 (the month-equivalents come in from `Logic/Money`).
5. `Logic/Shutdown`: the late-client-money concern first (M15).
6. Components: `Week/Money sheet`, `Week/Money row`, `Week/Money month` (the month heading), `Week/Money pane` (the
   right-hand side), `Week/Money editor` (from `Week/Cash editor`), `Week/Balance sheet`; `Week/App bar` gains the €
   button; `Week/Cash strip` gains the three lines (M14) and late-first boxes that open the modal; `Week/Project detail`
   gains Billing; `Week/Project editor` gains billing (hourly / fixed, M21), payment terms and agreed hours; `Week/Settings sheet` loses money.
   `Week/Cash row` goes.
7. Commands: `Add money item`, `Edit money item`, `End money item` (sets `until`), `Mark money` (one command for tick /
   change this one / skip / sent — it creates or updates the mark for `itemId` + `occurs`), `Record balance` (writes the
   reading and the ticks it asked about), `Add hoped money` (M16, a thin `Add money item`). `Add cash event` and
   `Edit cash event` go.
8. **Apply the sheet traps up front** (memory: *nodegx-sheet-traps*): `clickBubbling: 'never'` on every panel; pulse
   `Clear` on every box as a sheet closes (D78); re-tick while open, not on the open edge; no `Outputs[name]` in a loop.
9. **Demo seed**, storage key **v3** (so a browser holding v2 gets the new week). Invented:
   - Partner's contract **+€1,500** monthly on the 28th, no end; one repeat changed to €1,380 in October.
   - Household costs **−€4,500** monthly on the 1st.
   - Income tax **−€2,400** yearly on 30 November.
   - Co-working day **−€25** weekly on Saturdays.
   - Bramble & Co **+€1,120** monthly, due the 7th, bill 7 days before, from July to March; July and August ticked
     (5 days late, 2 days early), September's bill not yet sent.
   - Salon Collective **+€640** once, bill 9 Sep, due 16 Sep, **not ticked** — the late item.
   - Salon Collective **+€400** once, bill 30 Sep, due 7 Oct (September's hours; the move chip already says *"with the
     30 Sep invoice"*). Added in s1: without it the six-week low is **−€190 on 1 Nov** and the demo opens in the red.
   - Northline Languages **+€1,120** once, after the Thursday workshop, due 14 days later.
   - Coaching offer **+€1,800** hoped 40%, The Jazz Room **+€2,000** hoped 30%.
   - Settings: rate **50** (M22: the usual hourly rate; the published demo's figure), savings target 500, low-water
     mark 0; one balance reading €3,200 dated the Monday of the seed week.
   - Billing (M21): Bramble & Co **fixed** (14 h agreed), Northline Languages **fixed** (per workshop), Salon
     Collective **hourly €18**, Uplift **hourly €65**. Salon's September bill is `fromHours` (M23).
   - These give break-even **€3,308.33**, target **€3,808.33**, billable target **46 h** (M22). The Billable tile
     changes from 55 to 46, which is the point of M21.
10. Gates in `tpl010Template.test.ts`: the seed walk for real names/figures stays; the collection count assertion
    follows; every `MoneyItem` / `MoneyMark` field the editors write is a column in the policy note; the sheet traps
    (8) are asserted as R2.4's are.
11. Drive it on a deployed build with real clicks (`drive-tpl010-money.js`, patterned on `drive-tpl010-r24.js`), then
    measure at the three viewports.

## 6. What changes in TPL-010-R2

- **R2.2** keeps: should / will / agreed on the card (now *This period* in §4.2), R21's sentence, the past list (now
  from ticked marks). It loses: R18 `Invoice` (a client bill is a `MoneyItem` on a project; its `MoneyMark` is the
  invoice record — `sentOn`, `doneOn`, the amount), R20 (nothing is derived, M5), and R19's `invoiceDay` and `cycle`.
  R19's `termsDays` and `agreedHours` stay, on the project. **R2.2 is built as part of this task**, not separately.
  *Raise the invoice* with its block list (R2.2-4) is **not** in this task; the mark can carry `blockIds` later.
- **R2.5** loses the *Money* section of R24 (§4.3 replaces it). The other three sections are unchanged.
- **The board's** *"customisable cash events (recurring rules with exceptions)"* moves out of *explicitly later*: it is
  this task.

## 7. Acceptance

Figures are the demo seed's (§5.9); *clock held* means the gate fixes today at **Fri 25 Sep 2026**.

| AC | Criterion |
|---|---|
| M-1 | The € button opens the Money modal; Settings shows no money list and none of the six retired fields; the Projects card, the drawer and the modal close with Escape and a click outside, and **not** with a click inside |
| M-2 | *Gate, clock held:* break-even €3,308.33, target €3,808.33, billable target 46 h (M22); changing the tax to €3,600 moves break-even to €3,408.33, the target to €3,908.33 and the billable target to 48 h, and the week's Billable tile says so on reload |
| M-3 | *Gate:* monthly on the 31st gives 30 Sep, 31 Oct, 30 Nov, 31 Dec, 31 Jan, 28 Feb; `monthEnd` gives the last day each month; quarterly from 15 Jan gives 15 Apr, 15 Jul, 15 Oct; weekly Saturdays from 26 Sep over six weeks gives six repeats; `until` stops a series on its last date inclusive |
| M-4 | Changing October's partner repeat to €1,380 shows *"€1,380 · usually €1,500"*; changing the item to €1,600 then changes September and November to €1,600 and leaves October at €1,380 |
| M-5 | *End it* on the co-working item keeps every ticked repeat in Past and shows no repeat after the end date; no row is deleted (the policy says `delete: nobody` and the gate asserts it) |
| M-6 | The Salon Collective bill, due 16 Sep and not ticked, is the first row of Upcoming under **Late**, the first box on the week page with a late mark, and the drawer's concern; ticking it on 25 Sep with €640 moves it to Past as *"paid 25 Sep · 9 days late"* and the concern moves on to R12's next |
| M-7 | Adding a bill from Bramble & Co's card pre-fills the project and a due date 7 days (the project's terms) after the bill date; changing the project's terms to 14 changes the pre-fill for the next bill and changes no existing one |
| M-8 | The hoped items are dashed in Upcoming, are not in any balance, and the week page reads *"Might earn €1,320 more, weighted (€3,800 if all come through)"* with each project's move beside it; clicking a name opens that project's card |
| M-9 | *Record balance* on 25 Sep lists exactly the unticked items dated on or before 25 Sep; answering *not yet* for Salon Collective and recording €2,900 makes the projection start at €2,900 with Salon's €640 counted on 25 Sep |
| M-10 | The bottom of the week page shows the month line, the might-earn line and the lowest point; a balance under `lowWaterMark` outlines that box red and nothing else on the page turns red |
| M-11 | Bramble's card shows Billing as §4.2: next bill, *This period* with should / will / agreed, and July and August in Past with their days early/late |
| M-12 | 1280×900, 1423×680, 390×844: 0 unreachable, `scrollWidth` = viewport, 0 console errors; the modal is full-screen at 390 with no sideways scroll |
| M-13 | Driven with real clicks on a deployed `templates/planner-demo`, every clause above that a person can do; the state survives a reload under `nodegx-planner-demo-v3` |
| M-16 | *Gate, clock held:* with the seed, the billable target is 46 h (⌈(3,808.33 − 2,240) ÷ 50⌉ + 14); making Bramble hourly at €80 with no fixed bill moves it to ⌈(3,808.33 − 1,120) ÷ 50⌉ = 54 h; logging 2 more hours on Bramble changes no € figure anywhere, and logging 2 more on Salon raises its September bill by €36 until the bill is marked sent |
| M-17 | Bramble's card reads *"… h logged of 14 agreed · the bill is €1,120 whatever the hours · €… an hour so far"*; Salon's reads its hours × €18 as the next bill |
| M-15 | Ticking Salon Collective with €400 and *still owed* shows *"€400 of €640 paid · €240 still owed"*, late, with €240 in the projection; ticking €240 more closes it. Marking Bramble's September repeat *lost* shows it in Past as *"€1,120 lost"* and takes it out of every balance |
| M-14 | Richard, on his laptop: he builds his own month from nothing — household, partner, tax, two clients — and the target it gives is the one he expects |

## 8. Not in this task

- **Raise the invoice** with the period's blocks and entries (R2.2-4): the mark can carry `blockIds` later.
- **Tax as a percentage** of client income: a fixed yearly item is enough for now (Richard, 2026-09-21).
- **Bank import.** The balance reading is typed.
- **Keeping a move's `moveWorth` in step with its hoped item** (M16 makes one from the other, once).
- **The coach's access** to the new collections is TPL-010-MCP's work item: add `MoneyItem`, `MoneyMark`,
  `BalanceReading` to its list when it is built.

## 9. Session log

### s2 — 2026-09-21: built, gated, driven

**Built** (all in `packages/noodl-mcp/tests/`, generated by `npm run template:planner`):
- `tpl010Money.ts` (new) — `MONEY_FNS`, the arithmetic every money Function pastes in: repeats (M3), marks (M4,
  M10), ticks as payments, late-as-today (M11), lost and part-paid (M11a), smoothing and the target (M12, M13, M22),
  the month by bill day (M17), hours bills (M23), might earn, lowest point. UTC string dates throughout.
- Components: `Week/Money sheet` (the modal) placing `Week/Money summary`, `Week/Money repeat`, `Week/Money end`,
  `Week/Money balance`, `Week/Money editor`; leaves `Week/Money row`, `Week/Money month`, `Week/Balance row`,
  `Week/Might link`, `Week/Key line`. `Week/Cash strip` is M14's three lines and late-first boxes that open the
  modal; `Week/App bar` has the € and a late count; `Week/Project detail` has Billing (§4.2) and *Add as hoped money*
  (M16); `Week/Project editor` has billing / terms / agreed hours (M21); `Week/Settings sheet` keeps rate, focus,
  savings target, low-water mark (§4.3); the drawer raises late client money first with *Open it in Money* (M15).
  `Week/Cash row`, `Week/Cash editor`, `Logic/Cash line`, `Commands/Add|Edit cash event` are gone.
- Logic: `Logic/Money` (list, strip, target hours, late), `Logic/Money pane` (the right side and the card's Billing),
  `Logic/Mark` (one press → the whole mark: tick, change, reset, skip, lost, untick, sent, unsend, happened).
  `Logic/Envelopes` takes `targetHours` from Money (M22); `Logic/Planner data` reads `MoneyItem`, `MoneyMark` (from
  13 months back) and `BalanceReading` (latest 12).
- Commands: `Add money item`, `Edit money item`, `End money item`, `Agree money item`, `Add mark`, `Edit mark`,
  `Record balance`. Each button that changes a repeat is a one-line Function (`Outputs.action = …; Outputs.go();`),
  so its action travels with its press (GAM-011); `Logic/Mark` then says `add` or `edit`.
- Policy: `CashEvent` → `MoneyItem`, `MoneyMark`, `BalanceReading`, all `delete: nobody`, `creatorOwns`.
- Demo: key **v3**; the seed of §5.9, dated from the visit; Salon's sittings since its last bill are seeded (and
  taken out of the month's quota) so its hours bill is real and the week does not open in the red.

**Decided in the build (not Richard's):**
- **Part payments are a list on the mark** (`payments: [{ day, amount }]`, like a block's entries), with `doneOn` /
  `doneAmount` kept in step. A reading counts only payments dated after it.
- **A ticked repeat stays closed when its item changes.** Found by the M-4 gate: raising the partner's contract to
  €1,600 turned July and August (ticked at €1,500) into *€100 late*. Now only a part tick with the rest *still owed*
  stays open, and `Logic/Mark` keeps what was due on that mark so the rest is still measured against it.
- **Marks are read from 13 months back**; a repeat older than that is history, never late.
- **Record balance answers each line where it stands**: *Happened* and *Lost* write at once (the list shortens),
  *Part of it…* opens that repeat to type the amount, *not yet* is doing nothing. (The mockup had a part amount
  inline; one write per press is what the graph can do without a loop.)
- **An hours bill counts the blocks from four weeks back** (the move-blocks window). A bill period longer than that
  undercounts. Widen `moveSince` if it matters.
- *Save this one* and *Back to the item* close the change form on the press, not the write.

**Readings (2026-09-21, on `cline-dev` after `d1f7fc18b`):** `tpl010Template.test.ts` **61/61** (§6 is new: M-2 to
M-17, the guards, the drawer order, the action wiring); `tpl008Template.test.ts` 25/25; `drive-tpl010-money.js`
**40/40** on the deployed demo (real clicks, including the phone breakpoint's list/pane turn at 600 px and a reload
under v3); `drive-tpl010-r23.js` 19/19; `drive-tpl010-r24.js` 22/22 (its three cash-event clauses moved to the money
drive); `measure-from-disk` at 1280×900 / 1423×680 / 390×844: layout = viewport, 0 console errors, no reach warnings.
**Page height at 1280×900 is 1229 px** (1087 before): the strip grew three lines. That is R2.6-2's question.

**Found and fixed on the way:** the stale pick after *End it* (the pane kept showing a repeat that no longer
existed); a blank likelihood read as 0%; the door refused four hand-copied billing rows (now `Week/Key line` in a
repeater), a Text with padding, and a duplicate node id.

### s1 — 2026-09-21: rulings agreed, mockup published

**Mockup:** `nodegx-template-crm/mockups/money.html` (extends `envelopes-b.html`; outside the repo, invented data),
published privately for Richard: https://claude.ai/artifact/212cJarJjemstvgLdiPGjg. It is a working prototype: the
money logic (repeats, marks, late-as-today, part-paid, lost, balance readings, smoothing, the three lines) runs for real,
so every figure comes out of the seed. `?view=money|past|rec|pane|late|editor|balance|card|drawer` opens a state.
Rendered at 1280×900, 1423×680 and 390×844 (CDP device metrics; a headless window will not go under 500 px):
`scrollWidth` = viewport at all three. At 1423×680 the money strip is below the fold. That is the mockup's
seven-line chip strip, not the money, and it is R2.6-2's question.
Seed readings (clock Wed 23 Sep): break-even €3,308.33, target €3,808.33, 55 h; month line *"Billed €640 so far,
€3,280 with the bills still to go out this month · €528 to target, about 8 h"*; might earn €1,320 (€3,800); lowest
€210 on Sun 1 Nov.

**Choices the mockup made that the rulings did not settle. Richard approved all four with the mockup (2026-09-21: *"I like it, the four choices are fine"*). They are rulings M17–M20 now:**
1. **The month line counts bills by the day they go out, not the day they are paid.** Money paid in September is
   mostly August's work, so counting payments would ask for hours that pay next month. (M14 said *"in so far"*
   without saying which.)
2. **Weekly items get no box** on the week page. They are in every balance, and one footnote names them. Otherwise
   co-working took four of the six boxes.
3. **One-off items are not in the month's target** (M12's smoothing has no share for a one-off). They show on the cash line
   on their day. The summary pane says so.
4. **A bill's "goes out" line is its own tickable row** (§4.1 as written), and an unsent bill whose day has passed
   sits under Late as *"not sent yet"*.

**For the build, not for Richard:** the mockup keeps a list of payments per mark (`pays[]`). The schema's scalar
`doneAmount` + `doneOn` cannot tell which part of a part-paid bill came before a balance reading, so a reading taken
between two part payments would count the first one twice. Either `MoneyMark` holds the payments as a list, or
Record balance folds a part-paid mark's running total into the reading. Decide at step 1.

**Billing types (M21–M24)** came after the approval, from Richard's own note; see §3. The mockup was updated for them (version 2): demo rate €50, Bramble and Northline fixed, Salon hourly €18 with its September bill filled from 22 h (€396); billable target **46 h**; month line *"Billed €640 so far, €3,276 with the bills still to go out this month · €532 to target, about 11 h"*; lowest €206 on 1 Nov; Bramble's card *"11.5 h logged of 14 agreed … the bill is €1,120 whatever the hours · €97 an hour so far"*.

**Rulings:** 
Richard agreed M10–M16 as written (M10/M11 after a plain-words restatement: a hand-changed repeat keeps its value when
the item changes; ending keeps ticked history; *not yet* counts as coming today). He added **M11a**: a payment can be
lost or come in part. The acceptance gains M-15. Next: the mockup (step 0).

### s0 — 2026-09-21: researched and written, nothing built
Two messages from Richard and his answers to three questions, traced against the build (§2). He overruled the first
draft's automatic client money (M5): bills are money items he types, and the project only pre-fills the terms. Seven
proposed rulings (M10–M16) wait for his word; the mockup (step 0) comes before any graph.
