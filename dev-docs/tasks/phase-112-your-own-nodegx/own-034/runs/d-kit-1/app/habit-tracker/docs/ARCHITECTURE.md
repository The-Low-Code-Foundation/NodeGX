# Architecture

## Page map

- **Home** (`Pages/Home`) — the whole app on one page: a field and a button to add a habit; then one row per habit showing its name, its streak, the last 7 days, a button that ticks today off, and a delete button.

## Components

- **`Components/HabitRow`** — one habit as a card. Inputs: `id`, `name`, `streakLabel`, `doneToday`, `days`. It holds no storage and knows nothing about the list it is part of; the one thing it sends upward is a command string, published on the app-wide `habit-command` variable.
- **`Components/DayMark`** — one of the seven days. Inputs: `letter`, `done`, `isToday`. It contains no code at all: three `Boolean To String` nodes pick the fill, the letter's colour and the ring.

## Data model

### Habit

One thing the user wants to do every day, with the days it has been done.

Fields:
- id (generated when added; never the name)
- name
- createdAt
- ticks — the days this habit was done, each a local date key YYYY-MM-DD

### Day key

The calendar day a tick belongs to, in the user's own timezone.

Fields:
- YYYY-MM-DD

Relationships:
- a habit's streak and its last-7-days row are both computed from its tick keys against today's key

## The saved state

One key in `localStorage`, holding the whole list as JSON — written whole on every change, so there is never a second place to look:

```
habit-tracker.habits.v1

[
  {
    "id": "hm1x2y3z",
    "name": "Read 10 pages",
    "createdAt": "2026-10-30T13:51:46.358Z",
    "ticks": ["2026-10-30", "2026-10-29"]
  }
]
```

- `id` is generated when the habit is added; nothing is ever identified by its name.
- `ticks` holds day keys only — a day the habit was done. Nothing about a streak, and nothing about the seven-day row, is stored.
- A **day key** is the local calendar date as `YYYY-MM-DD`, built from `Date` in the browser's own timezone, so a tick belongs to the user's day and not to UTC's.
- A stored list that will not parse is treated as an empty list, not as an error.

This is the only persistent state in the app. The `habit-command` variable below is in memory and is meant to be: it carries a press from a row to the store, not a habit.

## The command contract

A press is a signal, and a signal carries no value. So every press reaches the store as **one string**, on the single input of the one `Function` node in `Pages/Home` (`in-command`):

| Command | Means |
| --- | --- |
| `add:<name>` | add a habit, unless a habit already has that name (trimmed, case-insensitive) |
| `set:<id>:<0\|1>` | set today's tick for one habit to the value given — applying it twice changes nothing |
| `remove:<id>` | delete the habit, and its ticks with it |

Anything else — including nothing at all — is a plain re-read. That is how the app draws itself when it opens: the Function has **no `run` wire**, so it runs once when the page mounts and again whenever the string on `in-command` changes.

The command's name is parsed from its prefix only, never by splitting on `:` — a habit may be called `Read: 10 pages`.

## How a press becomes a command

`onClick` is a signal, and a `String` node in latch mode is what turns a press into a value: the button commits the node's pending value with `saveValue`, and only then does `savedValue` change. Both buttons in `Components/HabitRow` sit behind such a gate:

- **tick** — pending `set:<id>:<flag>`, where `flag` is the **opposite** of the state the button shows (`1` to tick, `0` to untick). That is what makes each press carry a string the previous press did not.
- **delete** — pending `remove:<id>`.

`runOnChange-value` is off on both gates: without it, the data behind a pending value changing (the day being ticked, say) would commit a command on its own.

Each gate then writes its committed command onto the one app-wide variable `habit-command` (a `Set Variable` in the row, a `Variable` in the page). The store is wired to that variable's value, so the write is what runs it. A row therefore never knows anything about storage, the store never knows which row pressed, and both buttons report through the same channel.

The add field is the same shape one level up: the field's live text is the gate's pending value, the **Add** button's click and Enter in the field both commit it, and the store clears the field when an add succeeds.

## What is derived, and where

- The streak and the seven-day row are computed on every read from the stored tick keys and today's key. Nothing about them is stored, so a day passing is enough to change them.
- A streak counts back from today, or from yesterday while today is unticked: it is lost when a whole day is missed, not at midnight.
- `namesLower` — the existing names, lowercased — is handed to two `Expression` nodes that keep **Add** disabled and mount a hint when the field is empty or the name is already taken. The store refuses a duplicate name as well, so the rule holds even if a command arrives another way.

## Look

- Style preset `modern`.
- Element styles are set for **Button** and **Text Input**, so every control of each type matches without being styled one at a time. A single node overrides one only for what is particular to it — the quiet Delete button.
- Colour, spacing, radius and type come from design tokens (`var(--space-4)`, `var(--text-sm)`); there is no raw hex or px in any component.

## Backend contracts

No server. Habits are one person's private list on one device, so they are saved to localStorage by a Function and read back when the app opens. Nothing to run, nothing to sign in to, works offline.

## Decisions

Considered during scoping and deliberately not done:

- **A NodeGX backend collection to store the habits** — The habits are one person's, on one device; nothing is shared with anyone else, so a server would be a thing to run and deploy for no benefit. Saved to localStorage by a Function instead: it works offline and needs no setup.
- **A separate stored record for each day's tick** — A habit's ticks are always read and written with the habit itself. One record per habit means one read on load and one write per tick, and no tick can outlive a habit that was deleted.
- **A date library for the last-7-days window** — Seven day keys from the built-in Date in a Function is a few lines and keeps the app dependency-free.
- **A streak that breaks as soon as today is not yet ticked** — That would show a streak of 0 every morning. The streak counts back from today, or from yesterday while today is still unticked, so it is only lost when a whole day is missed.

Decided while building:

- **One Function for the whole store, not one per action** — Add, tick and delete are one read-modify-write of one list; splitting them would put the read, the save and the seven-day row in three places. The command string is what keeps it one node.
- **A `String` gate per button rather than the button's signal alone** — The store is driven by a value change, so that it still runs by itself when the app opens. A signal cannot carry the command, and wiring `run` would take that first run away.
- **A row publishes on the `habit-command` variable, not through the Repeater's item output** — This one was measured, not assumed. A row's Component Outputs value never reached the page: with the row committing `set:h1:1` (shown on screen in the row), the Repeater's `itemOutput-command` stayed empty, because the Repeater fills an item output as part of its own action flow rather than mirroring the row's values. The row writes the shared variable instead, and the store reads it — the documented shape for a value crossing between two components. `HabitRow` therefore exposes no Component Outputs at all.
- **Boolean To String nodes in `Components/DayMark` rather than an Expression** — A boolean cannot be wired into a colour port; three library nodes say what they do and leave the mark free of code.
- **Unique habit names** — Adding a name that is already in the list does nothing, and the Add button is disabled with a hint saying why. Without that rule, a second press of Add carrying the same string would be indistinguishable from the first and would be silently dropped.
- **Delete is one press, with no confirmation** — Deleting takes the habit's history with it. The button is quiet and sits at the far end of the row, away from the tick button; a confirmation step was left out to keep the row readable.

Left open:

> TODO: Streak at the start of a day: built so an unticked today does not break a streak (it counts through yesterday until the day is missed entirely). Say so if you would rather see it drop to 0 until you tick today.
> TODO: Renaming a habit is not built — you delete it and add it again. Worth adding if you expect to change names often.
> TODO: The last 7 days end today, so no week boundary is involved; a Monday-to-Sunday view would be a change to that window only.
> TODO: Delete has no undo and no confirmation. If a mis-tap ever costs a streak, this is the thing to add.

_Scoping record: `docs/decisions/000-initial-scope.md`._
