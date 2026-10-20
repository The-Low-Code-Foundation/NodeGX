# Backend map

A map of the training app's backend, on one canvas: the app's **screens** (where people click), the
**functions** (the only doors to the data, each with its lock), the **tables** (where the data lives,
each with its shield), the wires between them, and **what just ran**, live.

## Open it

```
cd editor
npm start
```

It opens `../training` and the running backend (its address in `../BACKEND-URL`, the admin key in
`../ADMIN-TOKEN`), and opens the map in your browser at http://127.0.0.1:5190/. The admin key stays in
the editor's own server; the page never sees it.

Another app or backend: `node server.mjs <app folder> --backend <url> --token-file <file>`.

## What you can do

- **Click anything.** A table tells you who may open it, which functions reach it and who may run those,
  what's in a row and which tables it points at. A function tells you when it runs ("on Settings,
  pressing “Download my data”"), what it does step by step, which tables it reads or changes, and its
  last runs. A screen tells you what it asks the backend for.
- **Look at it as…** someone not signed in, a signed-in learner, or staff: what they can't reach dims.
- **Is it secure?** The card on the left, in sentences. Red and amber lines are the ones to read.
- **What just ran:** the strip at the bottom. A run lights its function up on the map (green worked, red
  turned away) and sends sparks along its wires.
- **Change who may open a table:** click the table, choose under "Looking at rows" and "Adding, changing
  or deleting rows", read the sentence that says what it will mean, press **Make it so**. The backend obeys
  at once, and the same rule is saved in `training/nodegx.security.json` so it holds when the backend
  restarts. The panel then shows the backend's own answer for a stranger, a learner and staff.
  **Back to the app's standard rule** undoes it the same way.

If someone else changed the rules since you opened the map, the change is refused and nothing is
written; the map reloads so you can choose again.

## Looking as a real person

- **Pick a person**: click them in the People column, or choose them in "A real person…" at the top.
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

## What it can't tell you

- Which **rows** a function hands back: that is decided in the function's own code. The map shows which
  tables each function reaches.
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
