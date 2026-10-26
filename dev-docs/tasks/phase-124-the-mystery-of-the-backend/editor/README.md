# Backend map

A map of a NodeGX app's backend, on one canvas: the app's **screens** (where people click), the
**functions** (doors to the data, each with its lock), the **tables** (where the data lives, each with
its shield), the wires between them (a screen that reads or writes records itself is wired straight to
the table), and **what just ran**, live.

## Open it

Inside a NodeGX project whose backend is running:

```
npx @nodegx/backend-map
```

It finds the backend the project is linked to on this computer (the project's `nodegx.project.json` names it;
NodeGX keeps its address and admin key in `~/.noodl/backends/<id>/`), serves the map on http://127.0.0.1:5190/ and
opens it. The admin key stays in this process; the page never sees it. Another folder: `npx @nodegx/backend-map
<folder>`. A backend elsewhere: `--backend <url> --token-file <file>`. `--port <n>`, `--no-open`, `--help`.

In NodeGX Studio it is the **Backend map** tab: Studio's own server mounts it (`handler()` from this package) on the
project's backend.

See it without a backend: https://nodegx.io/backend-map/ (a recording).

## What you can do

- **Click anything.** A table tells you who may open it, which functions reach it and who may run those,
  what's in a row and which tables it points at. A function tells you when it runs ("on Settings,
  pressing “Download my data”"), what it does step by step, which tables it reads or changes, and its
  last runs. A screen tells you what it asks the backend for: the functions it runs, and the tables it reads or writes itself.
- **Look at it as…** someone not signed in, anyone signed in, or someone in one of the groups the app's rules name
  (read from the backend and from `nodegx.security.json`): what they can't reach dims, and a note says what they may
  read, see of their own, and add or change.
- **Any app.** A table the app has and the backend doesn't yet (a screen writes it, the rules file names it; a
  backend makes a table when its first row lands) is drawn dashed and says so. Links come from the schema's
  Pointer columns first, then from `…Id` column names, and the panel says which. If the backend refuses one
  question (its groups, its people), the rest of the map still draws and the header says what it couldn't read.
- **Is it secure?** The card on the left, in sentences. Red and amber lines are the ones to read.
- **What just ran:** the strip at the bottom. A run lights its function up on the map (green worked, red
  turned away) and sends sparks along its wires.
- **Change who may open a table:** click the table, choose under "Looking at rows" and "Adding, changing
  or deleting rows", read the sentence that says what it will mean, press **Make it so**. The backend obeys
  at once, and the same rule is saved in the project's `nodegx.security.json` so it holds when the backend
  restarts. The panel then shows the backend's own answer for a stranger, a signed-in person and each group.
  **Back to the app's standard rule** undoes it the same way.

If someone else changed the rules since you opened the map, the change is refused and nothing is
written; the map reloads so you can choose again.

## Looking as a real person

- **Pick a person**: click them in the People column, or choose them under "A real person" at the top.
  The backend itself says what they may run and which tables they could open directly. Pink wires
  are theirs. Nothing runs to show this.
- **Follow a pathway**: with a person picked, click a screen. Each function that screen asks for is
  run **as that person, for real**, and the real answer is shown the way the screen lists it: the
  things, their words, their counts. A function that changes anything is never run; the panel says
  which and why.
- **One row's reach**: click a table, pick a row, press **Find who can reach it**. For each of the
  people the map asks the backend whether they could open that row directly, and runs, as them, every
  read-only function that touches the table, looking for the row in what comes back. The map shows who
  reaches it and through which function. It also lists who can't, and what it couldn't check.

How: a key bound to the person (BACKEND-2.md), used through the backend's MCP door. It is made for one
question and deleted straight after, and its secret is never shown or saved. Every run it makes shows in
"What just ran" as **run by this map, as <name>**.

## What one person can reach (round 3)

- **Pick a person** and the map measures, for real, which rows reach them: it runs as them every function they may
  run that only reads, follows what came back the way the app would (a person's id in a list → that person's rows),
  and finds every row of every table in the answers. What it knows about whoever is signed in is their id, plus the
  key of their row in any table with one row per person (`lib/people.mjs`: a column that names a person and no two
  rows share). The runs play out on the map: a table lights up,
  counts up and fills its pink bar only when rows of it come back. Tables nothing came back from stay dark.
  `lib/reach.mjs`; `POST /api/as/everything` streams one JSON line per run. `{ "person": null }` is someone not
  signed in.
- **Who sees how much?** measures everyone the same way and ranks them (`POST /api/everyone`).
- **A table's rows** come first in its panel; looking as someone, their rows are lit. Click a row, then **Who can
  access this?**.
- A function that changes data is never run, and one with many possible arguments is asked at most 16 ways: the
  panel says when, and that the count is then "at least".

## The public copy

`../static/`: `record.mjs` records every answer this server gives from a running copy; `build.mjs` copies `public/`
with `recorded.js`, which answers `/api/*` in the page from the recording. That is nodegx.io/backend-map/. This
server is never public: it holds the backend's admin credential.

## What it can't tell you

- Which rows a function hands back is decided in its own code, so the map finds out by running it as a person
  (above), never by reading the code.
- Links between tables are read from the column names (a `conceptId` points at the table whose key is
  `conceptId`); the backend doesn't declare them.
- Where a function names a table but passes it around in its code, the map says "names it" rather than
  guessing what it does.
- A request turned away at the door by the rules isn't recorded by the backend as a run, so it doesn't
  appear in "What just ran".
- Changing a function's steps is not something this map does; changes to functions reach the backend
  only when they're deployed.

## Checks

`npm test` runs everything on copies (a copy of the app's folder under `test/.work`, with a backend of its
own from the kit): the NodeGX kit's editor suite and its control, the rule change end to end with
restarts, the page driven in Chrome, and the real-person views on a copy holding the app's whole world.
The app's own `tools/setup-backend.mjs` and `tools/deploy-functions.mjs`, run from the copy, set up its
people, rows and functions.
