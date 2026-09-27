# Todo list

The simplest todo list there is. There are no tags, projects, colours or due-date sorting. There is
one list, and its order is **what you are going to do next** — which only you decide.

- A new task goes in at the bottom. Move it up if it matters more.
- Open a task to give it a deadline, next actions (in the same kind of order) and notes.
- A title — the task’s or a next action’s — is a box: type over it and press Enter, or click away.
- **Description** on a next action opens a box for what it involves. Leaving the box writes it and
  closes it, and **Save** does the same; only one is open at a time.
- **Nothing is ever deleted.** You close a task by writing what happened — even
  "not needed, dropping it" — and every move, note, rename, tick and close is kept in its history.

## It needs a backend

Your list lives in the NodeGX backend, so every device you sign in on sees the same one. In the
editor, open **Backend Services**, start a local backend and connect this project to it, then press
**Run**. The first screen asks you to sign in or create an account.

⚠️ **Use a new backend for this project.** A backend installs `nodegx.security.json` only when it has no
security settings of its own yet, so one you have already used keeps its old rules.

The access rules ship as `nodegx.security.json`:

- `Task`, `Action` and `Event` can be read and written by anyone signed in, and **creator owns** is on,
  so each row is private to the person who made it.
- `delete` is `nobody` on all three. The app has no delete button, and the backend refuses one.
- 🔴 **`signup` is `public`**, so that you can make your account. If you deploy this for yourself,
  create your account first and then set `signup` to `nobody`, or anyone who finds the address can
  make one (they would only ever see their own list, but it is your server).

## How it is built

- **`Commands/`** — one component for each thing a person can do: Add task, Move task, Close task, Reopen task, Rename task, Set deadline, Add action, Tick action, Untick action, Move action, Rename action, Describe action, Add note.
  Each one checks its input, writes the record, then writes a line of history. Read one and you have
  read the pattern.
- **`Logic/Write history`** is the only thing that writes to `Event`. Moving the same task several
  times within two minutes updates one line ("Moved #5 → #2") rather than adding one per click.
- **`Logic/Todo data`** holds the queries. **`Logic/Task rows`**, **`Logic/Selected task`** and
  **`Logic/Log rows`** turn what they load into what the screen draws.
- **`Todo/`** is everything you can see. **`Todo/Dialog flow`** asks "What happened?" before a close,
  reopen, tick or untick. **`Pages/Todo`** places it all and wires the commands to it.
- **Light and dark.** The page follows your system until you press the moon or sun at the top right
  (`Todo/Theme switch`). Pick the theme your system already uses and it goes back to following it.
  Both palettes are in `App`'s CSS Definition; `App` also puts your choice back when the app opens.
- **Deadline reminders.** `Todo/Reminders switch` is a bell that shows only when the page the app is served
  from sets `data-reminders` on the root and provides `window.todoReminders` — a service worker, a push key
  and a server that sends at 9am on the day a task is due. This project sends nothing by itself, so without
  that host there is no bell. The host keeps each device in `PushSubscription`.
- **The deadline field** is `Todo/Date picker`, the same part as the library's Date Picker: a real date
  input with a calendar that drops down on a computer, and the device's own date picker on a phone. It
  hands `Commands/Set deadline` a `YYYY-MM-DD` day when a date is picked, typed (on Enter or leaving the
  field) or cleared.

## The data

| collection | fields |
|---|---|
| `Task` | `title`, `position` (lower = sooner), `status` (`open`/`done`), `deadline` (`YYYY-MM-DD`), `closingNote`, `closedAt` |
| `Action` | `taskId`, `title`, `position`, `done`, `note`, `description` |
| `Event` | `taskId`, `kind`, `summary`, `body`, `at` |
| `PushSubscription` | `endpoint`, `p256dh`, `auth`, `timeZone`, `enabled`, `device` — one per device with reminders on |

