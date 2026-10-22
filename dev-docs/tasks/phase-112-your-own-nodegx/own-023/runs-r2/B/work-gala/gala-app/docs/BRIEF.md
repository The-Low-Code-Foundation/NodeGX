# Brief

## What this app is

The dance-school gala game (plan the running order, formations, dances, costumes and snacks, then watch the 3D evening play out), rebuilt as a NodeGX app, plus a grown-ups' settings page whose changes are stored in the app's backend and laid over the game's rows with gala-rules' applyRows.

## Who uses it

Children play the game; the grown-ups of the family sign in to a settings page to rename steps, change difficulty and prices, the starting stars, and add costumes or steps.

## Deliberately out of scope

- Changing the rules' code (engine.js) — only rows of data change
- Free-form fields or HTML/script in settings
- Children signing up or writing settings

_Agreed in the initial scoping conversation; the full record, including what was considered and rejected, is in `docs/decisions/000-initial-scope.md`._
