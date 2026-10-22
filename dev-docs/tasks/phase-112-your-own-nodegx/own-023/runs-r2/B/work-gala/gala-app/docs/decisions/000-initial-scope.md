# 000 — Initial scope

_Recorded 2026-10-21T09:25:34.787Z, from the scoping conversation held before this project was created._

> This conversation was ended before a scope was agreed. What is written below is what had been
> established at that point — nothing here was inferred to fill the gaps.

## What was asked for

> This is a dance-school game my kids play: you run a dance school's gala night, plan the running order, the formations, the dances, the costumes and the snacks, then watch the evening play out. I want the grown-ups at home to be able to change the game themselves, without asking anyone and without touching code: rename a dance step, change how hard a step is, change what a costume costs, start a new school with more stars, add a new costume or a new step. Their changes must be theirs for good: still there after clearing the browser, on another computer, and after I install the next version of the game. Kids use this game too, so a child who finds the settings mustn't be able to break the game, put rude words on the screen, or make it do something it was never meant to do. The game in reference/ is the current version (plain JavaScript and three.js; `npm start` in that folder serves it). Rebuild it in this folder as a NodeGX app, the same game, and add the grown-ups' settings to it. The game's rules are in gala-rules/, with their tests: use them as they are (gala-rules/src/data.js's applyRows is there for changed rows). Please just build it without waiting for me to answer questions.

## What was decided

**The app.** The dance-school gala game (plan the running order, formations, dances, costumes and snacks, then watch the 3D evening play out), rebuilt as a NodeGX app, plus a grown-ups' settings page whose changes are stored in the app's backend and laid over the game's rows with gala-rules' applyRows.

**Who it is for.** Children play the game; the grown-ups of the family sign in to a settings page to rename steps, change difficulty and prices, the starting stars, and add costumes or steps.

**Pages.**

- Home — The game: the 3D school, the side sheet with the eight tabs, the live evening, the shop — the reference game, with the grown-ups' changes applied before it starts.
- Grown-ups — Sign in as a grown-up; rename steps, change difficulty and prices, the starting stars; add a new costume or step; undo a change.

**Records.**

- GameChange — One changed or added row of the game's tables (moves, outfits, start…), as a delta over the shipped defaults, so a new version of the game keeps the family's changes. — table, rowId, fields

**Backend.** The grown-ups' changes to the game's rows are shared across every computer the family uses, so they live in the backend, not the browser. Only signed-in grown-ups may write them, and only through a cloud function that checks every field against an allow-list, ranges and a word filter. The children's own save (their plan, their school) stays on their device as in the reference game.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Keep the grown-ups' changes in localStorage** — rejected: They must survive clearing the browser and follow to another computer.
- **Edit gala-rules/src/data.js directly** — rejected: The next version of the game would overwrite it; changes are stored as deltas and applied with applyRows.
- **A PIN in the page** — rejected: Anything in the page a child can read; the server checks a signed-in grown-up account instead.

## Deliberately out of scope

- Changing the rules' code (engine.js) — only rows of data change
- Free-form fields or HTML/script in settings
- Children signing up or writing settings

## Still open

> TODO: Which other fields (beyond names, difficulty, prices, start stars, new costumes and steps) grown-ups want to change

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: GameChange. People sign in, so it keeps user accounts. The conversation said: The grown-ups' changes to the game's rows are shared across every computer the family uses, so they live in the backend, not the browser. Only signed-in grown-ups may write them, and only through a cloud function that checks every field against an allow-list, ranges and a word filter. The children's own save (their plan, their school) stays on their device as in the reference game.
2. **create `Pages/Grown-ups`** — Sign in as a grown-up; rename steps, change difficulty and prices, the starting stars; add a new costume or step; undo a change. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **update `Pages/Home`** — The game: the 3D school, the side sheet with the eight tabs, the live evening, the shop — the reference game, with the grown-ups' changes applied before it starts. Sibling pages in this app: Grown-ups. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "This is a dance-school game my kids play: you run a dance school's gala night, plan the running order, the formations, the dances, the costumes and the snacks, then watch the evening play out. I want the grown-ups at home to be able to change the game themselves, without asking anyone and without touching code: rename a dance step, change how hard a step is, change what a costume costs, start a new school with more stars, add a new costume or a new step. Their changes must be theirs for good: still there after clearing the browser, on another computer, and after I install the next version of the game. Kids use this game too, so a child who finds the settings mustn't be able to break the game, put rude words on the screen, or make it do something it was never meant to do. The game in reference/ is the current version (plain JavaScript and three.js; `npm start` in that folder serves it). Rebuild it in this folder as a NodeGX app, the same game, and add the grown-ups' settings to it. The game's rules are in gala-rules/, with their tests: use them as they are (gala-rules/src/data.js's applyRows is there for changed rows). Please just build it without waiting for me to answer questions.",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: GameChange. People sign in, so it keeps user accounts. The conversation said: The grown-ups' changes to the game's rows are shared across every computer the family uses, so they live in the backend, not the browser. Only signed-in grown-ups may write them, and only through a cloud function that checks every field against an allow-list, ranges and a word filter. The children's own save (their plan, their school) stays on their device as in the reference game.",
        "provision": {
          "name": "App backend",
          "collections": [
            {
              "name": "GameChange",
              "columns": [
                {
                  "name": "table",
                  "type": "String"
                },
                {
                  "name": "rowId",
                  "type": "String"
                },
                {
                  "name": "fields",
                  "type": "String"
                }
              ]
            }
          ],
          "needsAuth": true
        }
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Grown-ups",
        "intent": "Sign in as a grown-up; rename steps, change difficulty and prices, the starting stars; add a new costume or step; undo a change. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-2",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The game: the 3D school, the side sheet with the eight tabs, the live evening, the shop — the reference game, with the grown-ups' changes applied before it starts. Sibling pages in this app: Grown-ups. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
