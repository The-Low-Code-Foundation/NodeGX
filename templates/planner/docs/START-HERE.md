# Planner

One screen that says what this week is for. It is a planner for someone who sells their hours,
and its unit is **hours**, not project prices.

- **Four envelopes**, budgeted once a month: Billable, Building, Admin and asks, Hobby. Every hour
  gets a job before the month starts.
- **Billable** does not tell you how far behind you are. It tells you how many hours a day the rest
  of the month needs. That is the only kind of sentence this app makes.
- **Building** is what your focus ceiling has left over once the billable day is paid for. A month
  that needs more billable hours shrinks it by itself, which is the trade made visible.
- **Hobby** is budgeted at zero and going over it is reported, never flagged. Not budgeted, not
  counted, not a problem.
- **The moves strip** is one line of next steps, most urgent first, dormant clients included.
  Pressing one puts half an hour in the first day with room under the ceiling.
- **The evening drawer** says what today came to, where the month stands, and **one** thing worth
  raising — never a list. Carry what did not get done, or drop it.
- **Money** (the € in the app bar) is every money item — your partner’s contract, the household
  costs, tax, each client’s bills — once, weekly, monthly, every three months or yearly, each repeat
  changeable on its own. **Nothing happened until you tick it**; an unticked one whose day has passed
  is late. Hoped money carries a likelihood and is never in a balance. The bottom of the week says
  break-even, the target, what you might earn and the lowest point in six weeks.

## It needs a backend

Your week lives in the NodeGX backend, so every device you sign in on sees the same one. In the
editor, open **Backend Services**, start a local backend and connect this project to it, then press
**Run**. The first screen asks you to sign in or create an account.

⚠️ **Use a new backend for this project.** A backend installs `nodegx.security.json` only when it has no
security settings of its own yet, so one you have already used keeps its old rules.

The access rules ship as `nodegx.security.json`:

- `Project`, `Block`, `MonthPlan`, `MoneyItem`, `MoneyMark`, `BalanceReading`, `Settings` can be read and written by anyone signed in, and **creator owns** is
  on, so each row is private to the person who made it.
- `delete` is `nobody` on everything except `Block`. A block you drop is deleted; a project, a
  month’s plan, a money item, a mark, a balance reading and your settings are not deletable by this
  app or by the backend. Ending a money item sets the last day it happens and keeps its history.
- 🔴 **`signup` is `public`**, so that you can make your account. If you deploy this for yourself,
  create your account first and then set `signup` to `nobody`, or anyone who finds the address can
  make one (they would only ever see their own week, but it is your server).

🔴 **`MoneyItem`, `MoneyMark` and `BalanceReading` hold your actual income, costs and bank balance**,
`Settings` your actual rate, and `Block` where your hours actually went. That is the reason for every
rule above.

## How it is built

- **`Commands/`** — one component for each thing a person can do: Add block, Save block, Add time, Carry block, Drop block, Place move, Move block, Add project, Edit project, Set month plan, Edit settings, Add money item, Edit money item, End money item, Agree money item, Add mark, Edit mark, Record balance.
  Each one is a guard that decides whether there is anything to write, one record write, and one
  sentence when it fails. Read one and you have read the pattern.
- **`Logic/`** — the only places a number or a sentence is decided. `Planner data` is the only
  thing that reads the backend; `Envelopes` works out the four tiles; `Day columns` the six days;
  `Moves` the strip; `Money` the money and `Money pane` its right-hand side; `Mark` what a tick writes;
  `Shutdown` the evening; `Card rows` the projects card.
- **`Week/`** — everything you can see. **`Pages/Week`** places it all and holds no arithmetic of
  its own, so "where does this number come from?" always has one answer.
- **Light and dark.** The page follows your system until you press the moon or sun in the app bar.
  Both palettes are in `App`’s CSS Definition; `App` also puts your choice back when the app opens.
- **The envelope colours carry data**, so they are held to a categorical palette’s standard in both
  palettes: blue is Billable wherever it appears, violet Building, grey Admin, amber Hobby.

## Getting started

1. Open **Settings** in the app bar and put in your usual hourly rate, your focus ceiling, what you
   want to save a month and how low the balance may go before it turns red.
2. Open **Money** (€), **Record balance** with what your bank says, and add what comes in and goes
   out: the household costs, a partner’s contract, tax once a year. The month’s billable target
   follows from those.
3. Add your projects — hourly or fixed, with their payment terms — and give each one a **next move**.
   From a project’s card, **+ Add a bill** puts its bills in Money with the due date pre-filled.
4. Press **Plan this month**. The envelopes start from the target; nothing is written for you on
   the 1st, because a budget nobody agreed to is not a budget.

## The data

| collection | fields |
|---|---|
| `Project` | `name`, `sub`, `kind` (`earning`/`building`/`hobby`/`dormant`/`admin`), `billing` (`hourly`/`fixed`), `rate`, `termsDays`, `agreedHours`, `slot`, `rung`, `move`, `moveWorth`, `moveWhen`, `moveDue`, `moveStop`, `facts`, `history`, `say`, `position` |
| `Block` | `projectId`, `date` (`YYYY-MM-DD`), `what`, `planned`, `actual`, `entries`, `done`, `isMove`, `todoTaskId`, `position` |
| `MonthPlan` | `month` (`YYYY-MM`), `billable`, `building`, `admin`, `hobby`, `workingDays` |
| `MoneyItem` | `label`, `amount` (signed: + in, − out), `repeat` (`once`/`weekly`/`monthly`/`quarterly`/`yearly`), `date`, `until`, `monthEnd`, `projectId`, `billDate`, `billLeadDays`, `fromHours`, `likelihood` (100 = expected), `note`, `position` |
| `MoneyMark` | `itemId`, `occurs` (the scheduled date), `amount` and `date` (this repeat changed), `skip`, `payments` (`[{ day, amount }]`), `doneOn`, `doneAmount`, `lostOn`, `sentOn`, `note` |
| `BalanceReading` | `date`, `amount`, `note` |
| `Settings` | `rate` (your usual hourly rate), `focusHours`, `savingsTarget`, `lowWaterMark` |

