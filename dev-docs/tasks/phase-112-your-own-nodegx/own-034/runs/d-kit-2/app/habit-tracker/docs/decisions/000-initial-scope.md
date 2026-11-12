# 000 — Initial scope

_Recorded 2026-10-30T14:19:02.533Z, from the scoping conversation held before this project was created._

## What was asked for

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.

## What was decided

**The app.** A single-person habit tracker: add habits, tick each one off for today, see the last seven days and a streak for each, delete a habit. Everything is kept on this device and is there again next time.

**Who it is for.** One person on their own phone or laptop, opening the app once or twice a day to mark off a handful of habits (maybe three to ten) and glance at how the week and the streak are going. They expect yesterday's ticks to still be there, and they expect to do it in a few seconds without signing in.

**Pages.**

- Home — The whole app: today's list of habits, each row showing the name, a tick box for today, a seven-day strip and a streak count, with a field at the top to add a habit and a delete control on each row.

**Records.**

- Habit — One thing the person means to do each day, e.g. 'Read 10 pages'. — id (from a Function, not the name), name, createdOn (YYYY-MM-DD, local date), archived/deleted by removal, not a flag — owns its Ticks
- Tick — The record that a habit was done on a particular day — the only thing a tick box ever creates or removes. — habitId, date (YYYY-MM-DD, local date) — belongs to one Habit

**Backend.** Nothing is shared, so nothing goes on a server. Every habit and every tick is kept in this browser's localStorage on this device, as one JSON object under a single key, read and written whole by a Function whenever something changes. No accounts, no sign-in, no sync.

**Rules for this project.**

- All stored data lives under one localStorage key holding a single JSON object; a Function reads and writes it whole, so there is no partial state to reconcile.
- A day is a local-date string 'YYYY-MM-DD' — never a timestamp and never a UTC-derived date — so a tick belongs to the day the person was actually living in.
- The seven days shown are computed from today backwards, oldest first and today last; a day with no tick renders as an empty day rather than being omitted.
- A streak counts consecutive ticked days ending today, or ending yesterday when today is not ticked yet: an unticked today never breaks a streak that was alive yesterday, so a streak is not lost just by not having opened the app yet.
- Habit ids are generated in a Function (timestamp plus a random suffix), never derived from the habit's name, so two habits can share a name.
- Deleting a habit removes its ticks with it, and asks for confirmation first.
- A blank or whitespace-only habit name is refused, and a habit name is trimmed before it is stored.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **A NodeGX backend with accounts and a collection per object** — rejected: One person, one device, nothing shared. A backend would add a server, a sign-in and a network dependency in exchange for nothing the request asked for; localStorage already satisfies 'remember everything when I come back'.
- **A monthly calendar grid as the history view** — rejected: The request was the last seven days. A month grid is a lot more screen and code for information that was not asked for, and it would push the tick box — the thing used daily — further down.
- **Streak shown as a percentage or as days-since-creation** — rejected: When people say streak they mean consecutive days done, so that is what is computed; anything else would need explaining on the screen.
- **A second 'History' page per habit** — rejected: The seven-day strip already answers 'how has this week gone' at a glance on the same row, so a second page would duplicate the same information behind a tap.
- **Storing ticks as a timestamp per tick** — rejected: Two ticks in one local day, or one at 23:59 and one at 00:01, would then split or merge unpredictably; a local-date string is what the tick box actually means.

## Deliberately out of scope

- Editing or renaming a habit once it exists
- Reordering habits
- Showing anything older than the last seven days (the data keeps it; the screen shows seven)
- Accounts, sharing or syncing between devices
- Undoing a delete
- Partial credit or quantities (three of five glasses)
- Reminders or notifications

## Still open

> TODO: Renaming and reordering habits were never discussed; if they are wanted they are a small follow-up on top of this build.
> TODO: Whether the history should later grow beyond seven days (a month, or all time) is undecided — the stored data already supports it.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **update `Pages/Home`** — The whole app: today's list of habits, each row showing the name, a tick box for today, a seven-day strip and a streak count, with a field at the top to add a habit and a delete control on each row. Works with the Habit and Tick records described in docs/ARCHITECTURE.md. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.",
    "operations": [
      {
        "id": "op-1",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The whole app: today's list of habits, each row showing the name, a tick box for today, a seven-day strip and a streak count, with a field at the top to add a habit and a delete control on each row. Works with the Habit and Tick records described in docs/ARCHITECTURE.md. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

**You:**

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.

**Assistant:**

> Scoped from that request: one page (Home) holding the whole loop — add a habit, tick today, read the seven-day strip and the streak, delete a habit. Since it is one person on one device with nothing shared, there is no backend: habits and ticks are kept in localStorage on this device, written whole by a Function. A day is stored as a local-date string, and a streak ending yesterday still shows until today's day has passed, so a streak is never lost merely by not having opened the app yet. Not built, deliberately: renaming or reordering habits, anything older than seven days on screen, accounts or syncing, undo of a delete, and reminders.
