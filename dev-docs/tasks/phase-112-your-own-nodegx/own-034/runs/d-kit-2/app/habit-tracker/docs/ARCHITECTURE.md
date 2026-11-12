# Architecture

## Page map

- **Home** (`Pages/Home`) — The whole app: today's list of habits, each row showing the name, a tick box for today, a seven-day strip and a streak count, with a field at the top to add a habit and a delete control on each row.

## Data model

### Habit

One thing the person means to do each day, e.g. 'Read 10 pages'.

Fields:
- id (from a Function, not the name)
- name
- createdOn (YYYY-MM-DD, local date)
- archived/deleted by removal, not a flag

Relationships:
- owns its Ticks

### Tick

The record that a habit was done on a particular day — the only thing a tick box ever creates or removes.

Fields:
- habitId
- date (YYYY-MM-DD, local date)

Relationships:
- belongs to one Habit

## Backend contracts

Nothing is shared, so nothing goes on a server. Every habit and every tick is kept in this browser's localStorage on this device, as one JSON object under a single key, read and written whole by a Function whenever something changes. No accounts, no sign-in, no sync.

## Decisions

Considered during scoping and deliberately not done:

- **A NodeGX backend with accounts and a collection per object** — One person, one device, nothing shared. A backend would add a server, a sign-in and a network dependency in exchange for nothing the request asked for; localStorage already satisfies 'remember everything when I come back'.
- **A monthly calendar grid as the history view** — The request was the last seven days. A month grid is a lot more screen and code for information that was not asked for, and it would push the tick box — the thing used daily — further down.
- **Streak shown as a percentage or as days-since-creation** — When people say streak they mean consecutive days done, so that is what is computed; anything else would need explaining on the screen.
- **A second 'History' page per habit** — The seven-day strip already answers 'how has this week gone' at a glance on the same row, so a second page would duplicate the same information behind a tap.
- **Storing ticks as a timestamp per tick** — Two ticks in one local day, or one at 23:59 and one at 00:01, would then split or merge unpredictably; a local-date string is what the tick box actually means.

Left open:

> TODO: Renaming and reordering habits were never discussed; if they are wanted they are a small follow-up on top of this build.
> TODO: Whether the history should later grow beyond seven days (a month, or all time) is undecided — the stored data already supports it.

_Scoping record: `docs/decisions/000-initial-scope.md`._
