# Architecture

## Page map

- **Home** (`Pages/Home`, `/`): the game. A full-screen `Stage` Group; a `Query Records` of every `GameChange`; one
  Function, *Start the game with the grown-ups' changes*, that checks each change again (`Scripts.rows.buildOverrides`),
  keeps the last good set in `localStorage` for when the backend can't be reached, and calls `game/src/boot.js`, which
  lays them over the rows with gala-rules' `applyRows` and then loads the game. The game's **👪 Parents** button goes to
  the grown-ups' page with a full page load (External Link).
- **Grown-ups** (`Pages/Grown-ups`, `/grown-ups`): a `States` node *Who is here* (signedOut / checking / child /
  grownup) shows one of three panels: `Grown-ups/Sign In`, `Grown-ups/Household Key`, `Grown-ups/Settings`. Which panel
  shows is a convenience only; the server decides what is allowed.

## Components

| component | what it is |
|---|---|
| `Grown-ups/Settings` | six `Grown-ups/Section`s (a new school, steps, costumes, hairstyles, shoes, accessories), each a Repeater of `Grown-ups/Row Editor`; two `Grown-ups/Add New` forms. A Function, *What can be changed*, reads the shipped rows from `gala-rules/src/data.js` and lays the saved changes over them for display (`Scripts.editing.rowsToEdit`). Every row's `saved` and every form's `added` refetch the changes. |
| `Grown-ups/Row Editor` | one row: names, difficulty, price, minutes or stars (shown per row), Save, *Back to the game's own*. Sends only what differs from the game's own; nothing differing = undo. Shows the server's refusal on the row. |
| `Grown-ups/Add New` | a new step (`moves`) or costume (`outfits`), based on one the game has, under the next free id `x01`…`x20`. |
| `Grown-ups/Sign In`, `Grown-ups/Household Key` | the two steps before the settings. |
| `Grown-ups/Section` | heading, one sentence on what changing it does, a slot. |

## Data model

### GameChange (backend collection)

One record per changed or added row: `key` (`table:rowId`, unique index — Save Change upserts on it), `table`,
`rowId`, `fields` (only the changed fields of a game row; the whole row for a grown-up's own `x01`…`x20`).
Permissions: find/get public (the game reads them before anyone signs in), create/update/delete **nobody**: only the
cloud functions write, as system.

The unique index is declared on the running backend with `apply_backend_schema`
(`{ tables: [{ name: "GameChange", columns: [...], indexes: [{ fields: ["key"], unique: true }] }] }`); a new backend
needs it again before the first save.

The children's own save (their plan, their school, their stars) stays in `localStorage` (`gala-game-v2`), as in the
reference game. `game/src/state.js` mends it against the rows of the day (`forgetWhatIsGone`).

## Backend contracts

| function | who may call (`nodegx.security.json`) | what it does |
|---|---|---|
| `Grown-ups/Save Change` (`table`, `rowId`, `fields`) | `role:grownup`, 60/min | reads the caller's roles again, runs `checkChange`, upserts the cleaned change |
| `Grown-ups/Remove Change` (`key`) | `role:grownup`, 60/min | checks the key's shape, finds the record holding exactly that key, deletes it |
| `Grown-ups/Become Grown-up` (`householdKey`) | signed in, 5/min | compares with the `GROWNUP_KEY` secret (8+ characters, else "not set up yet"); a wrong key waits 2 s; adds the caller to `grownup` |
| `Grown-ups/Am I a Grown-up` | signed in | `grownUp: true/false`, for the page to choose a panel |

`devOpen` is **false**: a backend started from this project enforces the policy on this computer too. The policy file is
installed on a backend's first start; an existing backend keeps its own (compare with `get_backend_permissions`).

## The rule book

`scripts/gala/rows.js`, `checkChange(table, rowId, fields)`: the tables a grown-up may change (start, moves, outfits,
hairs, shoes, accs), per table the fields and their ranges, which rows have a price, what a new row must carry, the
icons, styles and themes allowed, the name rules and the rude-word check. Script files don't run in cloud functions
yet, so `Save Change` carries the same text between the `CHECKCHANGE` markers; `tests/rows-guard.test.mjs` fails if
they differ. To let grown-ups change another field: add it to `checkChange` in both places, to
`scripts/gala/editing.js` and the Row Editor, and a test.

## The game

`game/src/` is the reference game's screen code (`world.js`, `people.js`, `play.js`, `ui.js`, `music.js`, `i18n.js`,
`state.js`, `main.js`) with four changes: three.js is imported by path; `boot.js` mounts the frame into the page and
applies the changes first; a grown-up's step moves like its `like` (`play.js`) and a costume is drawn like its `like`
(`people.js`); the save forgets what has gone (`state.js`); the top bar has the 👪 button (`i18n.js`, `ui.js`).
`game/src/{data,engine,plan,tunes}.js` re-export `gala-rules/src/*`, which is `../gala-rules` linked in, unchanged.

## Decisions

- `docs/decisions/000-initial-scope.md`: the request, verbatim.
- `docs/decisions/001-grown-ups-settings.md`: how the changes are kept and guarded, and what was rejected.
