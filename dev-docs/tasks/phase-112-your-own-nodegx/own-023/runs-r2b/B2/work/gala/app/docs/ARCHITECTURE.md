# Architecture

## Page map

- **Game** (`Pages/Game`) — The game: top bar, 3D view, camera bar, the side sheet with its tabs (programme, formation, snacks, costumes, dressing room, car park, shop, notebook), the live evening, the results and the season intro.
- **Grown-ups** (`Pages/Grown-ups`) — Sign-in for grown-ups, then the settings: rename/re-rate steps, costume prices, starting stars, add a costume or a step; checked server-side.

## Data model

### GameChange

One grown-up change to one row of a game table (a move, an outfit, the start row...), laid over the defaults with gala-rules applyRows.

Fields:
- table
- rowId
- fields

### Save

The child's game save, on the device, as in the original.

Fields:
- season
- plan
- school
- notebook
- lang
- sound
- seed

## Backend contracts

Holds the grown-ups' changes to the game's tables so they survive clearing the browser, a different computer and a new version of the game. Every write goes through a cloud function that only accepts known tables and fields, clamps numbers, and refuses rude or non-plain text. Reading is open; writing needs the grown-up sign-in. The children's game save stays on the device (localStorage) like the original.

## Decisions

Considered during scoping and deliberately not done:

- **Keep grown-ups' changes in localStorage** — They must survive clearing the browser and follow to another computer.
- **Load reference/'s ui.js inside a page** — The brief requires every screen element to be NodeGX nodes.
- **Validate settings only in the page** — A child could bypass the page; the cloud function is the gate.

_Scoping record: `docs/decisions/000-initial-scope.md`._
