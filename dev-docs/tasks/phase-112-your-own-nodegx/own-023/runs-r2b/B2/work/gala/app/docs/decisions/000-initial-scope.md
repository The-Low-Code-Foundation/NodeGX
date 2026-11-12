# 000 — Initial scope

_Recorded 2026-10-21T12:40:08.885Z, from the scoping conversation held before this project was created._

## What was asked for

> This is a dance-school game my kids play: you run a dance school's gala night, plan the running order, the formations, the dances, the costumes and the snacks, then watch the evening play out. I want the grown-ups at home to be able to change the game themselves, without asking anyone and without touching code: rename a dance step, change how hard a step is, change what a costume costs, start a new school with more stars, add a new costume or a new step. Their changes must be theirs for good: still there after clearing the browser, on another computer, and after I install the next version of the game. Kids use this game too, so a child who finds the settings mustn't be able to break the game, put rude words on the screen, or make it do something it was never meant to do. Convert the game in reference/ into a NodeGX app: the same game, rebuilt in NodeGX, with the grown-ups' settings added.

## What was decided

**The app.** A dance-school gala management game (French/English) converted from a plain-JS + three.js game: every screen, tab, list and the game state are NodeGX nodes; the 3D view, the synthesised music and the gala-rules engine stay code in Function/Script nodes. Grown-ups can change the game's tables (step names and difficulty, prices, starting stars, new costumes and steps) through a guarded settings page, stored in the backend.

**Who it is for.** Children who play the game (prepare a gala, rehearse, play gala night, shop with stars) and the grown-ups at home who tune the game's content for them.

**Pages.**

- Game — The game: top bar, 3D view, camera bar, the side sheet with its tabs (programme, formation, snacks, costumes, dressing room, car park, shop, notebook), the live evening, the results and the season intro.
- Grown-ups — Sign-in for grown-ups, then the settings: rename/re-rate steps, costume prices, starting stars, add a costume or a step; checked server-side.

**Records.**

- GameChange — One grown-up change to one row of a game table (a move, an outfit, the start row...), laid over the defaults with gala-rules applyRows. — table, rowId, fields
- Save — The child's game save, on the device, as in the original. — season, plan, school, notebook, lang, sound, seed

**Backend.** Holds the grown-ups' changes to the game's tables so they survive clearing the browser, a different computer and a new version of the game. Every write goes through a cloud function that only accepts known tables and fields, clamps numbers, and refuses rude or non-plain text. Reading is open; writing needs the grown-up sign-in. The children's game save stays on the device (localStorage) like the original.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Keep grown-ups' changes in localStorage** — rejected: They must survive clearing the browser and follow to another computer.
- **Load reference/'s ui.js inside a page** — rejected: The brief requires every screen element to be NodeGX nodes.
- **Validate settings only in the page** — rejected: A child could bypass the page; the cloud function is the gate.

## Deliberately out of scope

- Changing the game's rules code or the engine's formulas
- Free-form HTML or scripts in any setting
- Multiplayer or sharing saves between children

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: GameChange. People sign in, so it keeps user accounts. The conversation said: Holds the grown-ups' changes to the game's tables so they survive clearing the browser, a different computer and a new version of the game. Every write goes through a cloud function that only accepts known tables and fields, clamps numbers, and refuses rude or non-plain text. Reading is open; writing needs the grown-up sign-in. The children's game save stays on the device (localStorage) like the original.
2. **create `Pages/Game`** — The game: top bar, 3D view, camera bar, the side sheet with its tabs (programme, formation, snacks, costumes, dressing room, car park, shop, notebook), the live evening, the results and the season intro. Sibling pages in this app: Grown-ups. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **create `Pages/Grown-ups`** — Sign-in for grown-ups, then the settings: rename/re-rate steps, costume prices, starting stars, add a costume or a step; checked server-side. Sibling pages in this app: Game. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "This is a dance-school game my kids play: you run a dance school's gala night, plan the running order, the formations, the dances, the costumes and the snacks, then watch the evening play out. I want the grown-ups at home to be able to change the game themselves, without asking anyone and without touching code: rename a dance step, change how hard a step is, change what a costume costs, start a new school with more stars, add a new costume or a new step. Their changes must be theirs for good: still there after clearing the browser, on another computer, and after I install the next version of the game. Kids use this game too, so a child who finds the settings mustn't be able to break the game, put rude words on the screen, or make it do something it was never meant to do. Convert the game in reference/ into a NodeGX app: the same game, rebuilt in NodeGX, with the grown-ups' settings added.",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: GameChange. People sign in, so it keeps user accounts. The conversation said: Holds the grown-ups' changes to the game's tables so they survive clearing the browser, a different computer and a new version of the game. Every write goes through a cloud function that only accepts known tables and fields, clamps numbers, and refuses rude or non-plain text. Reading is open; writing needs the grown-up sign-in. The children's game save stays on the device (localStorage) like the original.",
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
        "id": "op-2",
        "kind": "create",
        "target": "Pages/Game",
        "intent": "The game: top bar, 3D view, camera bar, the side sheet with its tabs (programme, formation, snacks, costumes, dressing room, car park, shop, notebook), the live evening, the results and the season intro. Sibling pages in this app: Grown-ups. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Grown-ups",
        "intent": "Sign-in for grown-ups, then the settings: rename/re-rate steps, costume prices, starting stars, add a costume or a step; checked server-side. Sibling pages in this app: Game. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
