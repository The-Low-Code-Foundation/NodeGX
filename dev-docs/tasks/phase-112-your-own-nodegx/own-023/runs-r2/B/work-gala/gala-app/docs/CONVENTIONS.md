# Conventions

The rules below are read by the assistant on every authoring turn, and they outrank its own defaults.

## The game's rules

- `gala-rules/` is used as it is. Nothing in this project edits it; the game imports it only through
  `game/src/{data,engine,plan,tunes}.js`, which re-export it.
- The grown-ups' changes reach the game only as `applyRows(over)`, called once in `game/src/boot.js` before
  `main.js` loads.

## The grown-ups' changes

- They are written only by the cloud functions under `Grown-ups/`. The `GameChange` collection stays
  find/get public, create/update/delete nobody (`nodegx.security.json`).
- Every cloud function under `Grown-ups/` has a `call` rule in `nodegx.security.json`. A function that writes is
  `role:grownup` and also checks the role inside its graph.
- `checkChange` is one text in two places, `scripts/gala/rows.js` and `Grown-ups/Save Change`, between the
  `CHECKCHANGE` markers; `npm test` must pass after any change to either.
- Every saved change is checked again when the game loads it (`buildOverrides`). Never apply a stored row unchecked.
- No setting is free text that reaches the screen unchecked: names go through `checkName`, icons come from `ICONS`.

## Pages and components

- The game and the grown-ups' page link to each other with a full page load (External Link), never a Navigate.
- The `Stage` Group on Home has no children: the game replaces its contents.
- Colours and spacing are design tokens (`var(--…)`); the theatre look is set once in the project tokens and the
  element styles of Text Input and Dropdown.
- A panel a page shows or hides declares its own `mounted` input.
