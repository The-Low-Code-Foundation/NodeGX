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

## It needs a backend

Your week lives in the NodeGX backend, so every device you sign in on sees the same one. In the
editor, open **Backend Services**, start a local backend and connect this project to it, then press
**Run**. The first screen asks you to sign in or create an account.

⚠️ **Use a new backend for this project.** A backend installs `nodegx.security.json` only when it has no
security settings of its own yet, so one you have already used keeps its old rules.

The access rules ship as `nodegx.security.json`:

- `Project`, `Block`, `MonthPlan`, `CashEvent`, `Settings` can be read and written by anyone signed in, and **creator owns** is
  on, so each row is private to the person who made it.
- `delete` is `nobody` on everything except `Block`. A block you drop is deleted; a project, a
  month’s plan, a cash event and your settings are not deletable by this app or by the backend.
- 🔴 **`signup` is `public`**, so that you can make your account. If you deploy this for yourself,
  create your account first and then set `signup` to `nobody`, or anyone who finds the address can
  make one (they would only ever see their own week, but it is your server).

🔴 **`Settings` holds your actual rate and your actual household number**, and `Block` holds where
your hours actually went. That is the reason for every rule above.

## How it is built

- **`Commands/`** — one component for each thing a person can do: Add block, Log block, Save block, Unlog block, Carry block, Drop block, Place move, Add project, Edit project, Set month plan, Add cash event, Edit settings.
  Each one is a guard that decides whether there is anything to write, one record write, and one
  sentence when it fails. Read one and you have read the pattern.
- **`Logic/`** — the only places a number or a sentence is decided. `Planner data` is the only
  thing that reads the backend; `Envelopes` works out the four tiles; `Day columns` the six days;
  `Moves` the strip; `Cash line` the money; `Shutdown` the evening; `Card rows` the projects card.
- **`Week/`** — everything you can see. **`Pages/Week`** places it all and holds no arithmetic of
  its own, so "where does this number come from?" always has one answer.
- **Light and dark.** The page follows your system until you press the moon or sun in the app bar.
  Both palettes are in `App`’s CSS Definition; `App` also puts your choice back when the app opens.
- **The envelope colours carry data**, so they are held to a categorical palette’s standard in both
  palettes: blue is Billable wherever it appears, violet Building, grey Admin, amber Hobby.

## Getting started

1. Open **Settings** in the app bar and put in your rate, what the household needs a month, what a
   partner brings, and your focus ceiling. The month’s billable target follows from those.
2. Press **Plan this month**. The envelopes start from your settings; nothing is written for you on
   the 1st, because a budget nobody agreed to is not a budget.
3. Add your projects, and give each one a **next move** — one concrete thing, what it is worth, and
   when. That is what the moves strip is made of.

## The data

| collection | fields |
|---|---|
| `Project` | `name`, `sub`, `kind` (`earning`/`building`/`hobby`/`dormant`/`admin`), `rate`, `slot`, `rung`, `move`, `moveWorth`, `moveWhen`, `moveDue`, `moveStop`, `facts`, `history`, `say`, `position` |
| `Block` | `projectId`, `date` (`YYYY-MM-DD`), `what`, `planned`, `actual`, `done`, `isMove`, `todoTaskId`, `position` |
| `MonthPlan` | `month` (`YYYY-MM`), `billable`, `building`, `admin`, `hobby`, `workingDays`, `openingBalance` |
| `CashEvent` | `date`, `amount` (signed), `label`, `kind`, `recurring` (`monthly` or empty) |
| `Settings` | `rate`, `householdNeed`, `partnerIncome`, `partnerDay`, `costsDay`, `invoiceDay`, `paymentTermsDays`, `focusHours` |

