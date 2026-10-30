# 000 — Initial scope

_Recorded 2026-10-30T13:51:46.496Z, from the scoping conversation held before this project was created._

## What was asked for

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.

## What was decided

**The app.** A one-person habit tracker: add a habit, tick it off for today, see the last 7 days and the current streak for each habit, and delete a habit you no longer want. Everything is kept on this device and is still there next time.

**Who it is for.** One person, on their own device — the person who asked for it. They open it once or twice a day: tick off today's habits, glance at the streaks, add a habit when they think of one, delete one they have given up on.

**Pages.**

- Home — The whole app on one page: a field to add a habit; then one row per habit showing its name, a tick control for today, the last 7 days as seven marks, the current streak, and a delete control.

**Records.**

- Habit — One thing the user wants to do every day, with the days it has been done. — id (generated when added; never the name), name, createdAt, ticks — the days this habit was done, each a local date key YYYY-MM-DD — owns its ticks; a tick has no life without its habit
- Day key — The calendar day a tick belongs to, in the user's own timezone. — YYYY-MM-DD — a habit's streak and its last-7-days row are both computed from its tick keys against today's key

**Backend.** No server. Habits are one person's private list on one device, so they are saved to localStorage by a Function and read back when the app opens. Nothing to run, nothing to sign in to, works offline.

**Rules for this project.**

- A day is identified by the local calendar date as YYYY-MM-DD, so a tick belongs to the user's day, not to UTC's.
- All saved state lives under a single localStorage key and is written whole on every change.
- Every stored habit has an id generated when it is added; nothing is ever identified by its name.
- The streak and the last-7-days row are both derived from the same stored tick keys and today's key — nothing about them is stored.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **A NodeGX backend collection to store the habits** — rejected: The habits are one person's, on one device; nothing is shared with anyone else, so a server would be a thing to run and deploy for no benefit. Saved to localStorage by a Function instead: it works offline and needs no setup.
- **A separate stored record for each day's tick** — rejected: A habit's ticks are always read and written with the habit itself. One record per habit means one read on load and one write per tick, and no tick can outlive a habit that was deleted.
- **A date library for the last-7-days window** — rejected: Seven day keys from the built-in Date in a Function is a few lines and keeps the app dependency-free.
- **A streak that breaks as soon as today is not yet ticked** — rejected: That would show a streak of 0 every morning. The streak counts back from today, or from yesterday while today is still unticked, so it is only lost when a whole day is missed.

## Deliberately out of scope

- No accounts, sign-in or profiles — it is one person's list on one device.
- No syncing or sharing between devices or people.
- No reminders or notifications.
- No partial credit: a day is done or it is not.
- No habit schedules or targets (every day only; no '3 times a week').
- No history beyond the last 7 days and no charts or statistics beyond the streak count.
- No renaming a habit — delete it and add it again.

## Still open

> TODO: Streak at the start of a day: built so an unticked today does not break a streak (it counts through yesterday until the day is missed entirely). Say so if you would rather see it drop to 0 until you tick today.
> TODO: Renaming a habit is not built — you delete it and add it again. Worth adding if you expect to change names often.
> TODO: The last 7 days end today, so no week boundary is involved; a Monday-to-Sunday view would be a change to that window only.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **update `Pages/Home`** — The whole app on one page: a field to add a habit; then one row per habit showing its name, a tick control for today, the last 7 days as seven marks, the current streak, and a delete control. Works with the Habit record described in docs/ARCHITECTURE.md. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

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
        "intent": "The whole app on one page: a field to add a habit; then one row per habit showing its name, a tick control for today, the last 7 days as seven marks, the current streak, and a delete control. Works with the Habit record described in docs/ARCHITECTURE.md. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

**You:**

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.
