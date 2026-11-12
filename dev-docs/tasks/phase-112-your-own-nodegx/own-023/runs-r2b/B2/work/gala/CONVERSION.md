# Converting "Le Gala de danse" to NodeGX — the log

The coded game is in `reference/` (plain ES modules + three.js r177). The NodeGX app is in `app/`. The rules
(`gala-rules/`) are shared, unchanged.

## Before I started

### How I read the existing code

I read it in the order the game runs: `index.html` (the page: a canvas, a top bar, a camera bar, a side sheet with
tabs/body/"go" bar, a float toolbar, a toast and a modal), `main.js` (start-up, the frame loop, pointer and keys on
the canvas), `state.js` (one shared object `G`: the save `G.S` in localStorage `gala-game-v2` plus what is on screen
now: screen, tab, picked number, the run…), then `ui.js` (752 lines: every tab is a `paint…()` function that builds
an HTML string and sets `innerHTML`, then binds `onclick`s that mutate `G.S.plan` / `G.S.school` and call
`changed()` = save + re-simulate + repaint everything), `i18n.js` (every sentence, FR/EN, many of them functions
with plurals and `<b>`), and finally the code that draws and sounds: `world.js` (three.js school, stage, loge, car
park, camera), `people.js` (dancers), `play.js` (plays the engine's schedule over time, emits "say" lines), and
`music.js` (Web Audio synth that follows the run).

The rules are already pure: `engine.js`, `data.js`, `plan.js`, `tunes.js` have no DOM and are byte-identical in
`reference/src` and `gala-rules/src` (I diffed them).

What I learned that drives the plan:

1. The UI is **"state → whole HTML string → innerHTML"** on every change. There is no component model: the "card",
   "chip", "stepper", "shop row", "verdict" are string helpers. Each one becomes a NodeGX component, and each
   `.map(...).join('')` becomes a Repeater (`For Each`) over an array.
2. All mutation goes through `changed()`, which means **one** shared store. That maps onto a NodeGX **Global
   Store** (with `persist` on for the save), so every component reads the same state without wires.
3. The 3D and the sound read `G` directly every frame. They can't become nodes (nothing in NodeGX draws three.js
   or synthesises audio), so they stay code — but they must stop reading `G`: the graph will *push* the state to
   them.
4. `i18n.js` mixes words with logic (plurals, `<b>`, conditionals). The words can be data; the logic that picks
   them stays in the code that builds each row.

### The plan: what becomes what

| coded part | becomes in NodeGX | why |
|---|---|---|
| `index.html` layout, `style.css` look | `Pages/Game`: Groups for the top bar, camera bar, side sheet, toast, intro dialog; the project's design tokens set to the theatre palette (plum, gold, velvet) | every visible element must be a node |
| `state.js` (`G.S`, save/load/mend) | a persisted **Global Store** `save` (the save) + a non-persisted Global Store `ui` (tab, screen, picks); a small "Mend save" Function on start-up that calls `gala-rules/plan.js` | state must live in nodes; the mend calls rules code |
| `ui.js` tab painters | one component per tab (`Tabs/Order`, `Tabs/Formation`, `Tabs/Gouter`, `Tabs/Costumes`, `Tabs/Build`, `Tabs/Parking`, `Tabs/Shop`, `Tabs/Notebook`), the run sheet, the results | one named section = one component |
| string helpers (`stepper`, `card`, chips, `facts`, meters, shop `row`, verdict `card`) | shared components in `UI/` (Chip, Stepper, Fact, Meter, OrderCard, ItemButton, ShopRow, Verdict…), drawn by Repeaters | repetition is data |
| `onclick` handlers that mutate the plan | each row publishes a click; the tab wires it to a small Function that returns the new plan, written back with **Set Global Store** | the nested plan edit (splice a card, clamp a time) is the code part; the wiring is nodes |
| `i18n.js` words | a **Static Data** table of words (key, fr, en) in the App, read by the view Functions; the sentences with numbers in them are templates in that table | words are data, not code |
| `engine.js` / `data.js` / `plan.js` / `tunes.js` | **project script files** `scripts/rules/*.js`, generated mechanically from `gala-rules/src` (only `import`/`export` lines rewritten to the script-file form); called from Functions with `Scripts.engine.simulate(…)` | the brief says to use them as they are; NodeGX script files are CommonJS-style, so a generator keeps them identical |
| `world.js`, `people.js`, `play.js`, `music.js` (three.js, Web Audio) | script files wrapped as factories that receive `THREE`, `window` and `document` from one **Function** node ("3D stage"), which mounts the renderer's canvas in a Group | no node draws 3D or makes sound; the brief allows this |
| `main.js` pointer handling on the canvas | stays inside the 3D code (it is input *on the canvas*) and reports taps to the graph as events | |
| run playback's feed / toasts / "done" | the 3D code sends **events** (`Noodl.Events`) that **Receive Event** nodes turn into store writes | the graph, not the code, decides what the screen shows |
| `confirm()` / `prompt()` dialogs | NodeGX popups / inline Text Input | browser dialogs are not nodes |
| the grown-ups' settings (new) | `Pages/Grownups` + a backend collection `GameChange` + cloud functions that check every change | must survive a cleared browser and another computer; a child must not be able to bypass the checks |

### What stays code, and why

- the rules (gala-rules), called from Functions — required by the brief;
- the three.js view and its pointer handling, and the Web Audio music — no node does this;
- small Functions that turn the save + the rules' answer into rows for the Repeaters, and the plan edits.
  Everything a row *shows* is a node; the Function only decides *which* rows and *what text*.

### Safety, decided up front

- The settings page needs a grown-up account. The first account made claims the `grownup` role; after that, no
  other account can (checked in a cloud function, not in the page).
- Writes go only through a cloud function that accepts known tables and known fields, clamps every number to a
  sensible range, accepts names only as short plain text from a word filter (FR + EN), and picks icons/styles/themes
  only from lists the game already knows. The collection itself is closed to direct writes.
- The browser checks the same rules again before laying a change over the game, so a bad row can never reach the
  screen even if it got into the database some other way.

---

## As I went

### 1. Checking the unknowns before building anything

Before converting a single screen I built a throw-away page with one Group, one Function and two Texts to answer
four questions the plan depended on. All four answered yes, in the headless preview (`drive_page`):

- a Function can use the rules as project script files (`uses: rules/engine`) — `simulate()` returned 91 points;
- a Group's `this` output gives the Function its DOM element (to host the 3D canvas);
- three.js loads from the project's `assets/vendor/` with a dynamic `import()` (r177, no build step);
- a Function can still set its outputs *after* it has returned (from a timer or an animation frame), and
  `Noodl.Events.emit` reaches a Receive Event. So the 3D code can report the evening back into the graph.

Wrong the first time: I passed the Function's `uses` as a JSON array; NodeGX wants one comma-separated string. And
a `String` node has `saveValue`, not `set`. The server refused both writes and named the fix, so nothing broke.

### 2. The rules: `gala-rules/src/*.js` → `app/scripts/rules/*.js`

- **Was:** four ES modules with `import`/`export`.
- **Became:** four NodeGX script files. NodeGX script files are CommonJS-style (`exports`, and `use('rules/data')`
  to reach another file), so `tools/sync-rules.mjs` copies the files and rewrites only the `import`/`export` lines.
  Every other line is gala-rules' own. `tools/check-rules.mjs` loads the copy the way NodeGX does and checks it
  plays exactly the same evening as gala-rules for 4 seasons × 3 modes, and the same tunes. `npm test` in
  `gala-rules/` still passes; I changed nothing there.
- **Didn't map cleanly:** "use them as they are" and "NodeGX script files have no `import`" pull in opposite
  directions. A generator + an equality check is my answer: the rules are byte-for-byte the same apart from
  module syntax, and re-running one command picks up a new gala-rules.

### 3. The words: `i18n.js` → a Static Data table + one small template filler

- **Was:** an object of ~350 FR/EN entries, a third of them functions (`(n) => \`${n} poste${n > 1 ? 's' : ''}\``),
  some with `<b>` inside.
- **Became:** 389 rows `{ key, fr, en }` for a **Static Data** node (`tools/extract-words.mjs` produced them by
  calling each sentence function with `{0}`, `{1}`… as its arguments). Plurals became `{0:s}`, lower-casing
  `{0:lower}`; the ~25 functions with real logic (a sentence that changes with the floor, the season, a count)
  became two rows each (`say_floorSwap_bois` / `_tapis`), written by hand. `scripts/game/text.js` (56 lines) fills a
  template and formats times, durations and numbers.
- **Lost:** the bold words inside sentences (`<b>21 h</b>`). A Text node draws plain text, and building HTML is
  exactly what the brief rules out. The sentences read the same; the emphasis is gone.

### 4. The screens' logic: `ui.js` → `scripts/view/*.js` (rows) and `scripts/game/actions.js` (presses)

- **Was:** 752 lines in which each tab's painter computes what to show, *and* writes it as an HTML string, *and*
  binds the clicks, *and* mutates the plan inside the click handler.
- **Became:** two halves of code, so the third — the screen — can be nodes:
  - `view/frame.js`, `view/prep.js`, `view/formation.js`, `view/run.js`: one function per tab that returns plain
    rows (`{ id, label, pressed, dot }` for a chip, `{ id, name, dur, locked }` for a programme card…). These are
    the painters with the HTML taken out; a row has exactly the fields its row component declares.
  - `game/actions.js`: every handler as a pure function `(save, ui, …) → { save, ui, toast }`. Nothing in it
    touches the page; the graph writes what comes back into the stores.
  - `game/save.js`: `state.js`'s fresh / mend / round-1 import, without localStorage (the store persists itself).
  - `tools/check-views.mjs` runs every view and action in Node for seasons 1–5 in both languages, including a
    played gala, and reports any word key that has no row. It found nothing missing, which surprised me; the
    extraction had kept the keys' shape.
- **Didn't map cleanly:** the stage plan was an SVG with draggable circles. NodeGX has no SVG node for that, so
  `view/formation.js` computes each dancer's place in **pixels** on a 340 px plan and the graph will draw it with
  absolutely-positioned Groups inside **Drag** nodes. The ruler (a draggable, rotatable SVG ruler) is the one
  thing I chose not to rebuild; the metre marks along the plan's edges stay.

### 5. The 3D view and the music: `world.js`, `people.js`, `play.js`, `music.js` → `scripts/stage/*.js`

- **Was:** modules that import three.js, read the global `G` every frame, find `#gl` in the page, and draw their
  textures on `document.createElement('canvas')`.
- **Became:** the same code as factories, generated by `tools/sync-stage.mjs`: `exports.create(env)` receives
  three.js, the window and a `G` of its own. The texture canvases became `OffscreenCanvas` (never on the page),
  and the renderer makes its own canvas, which the "3D stage" Function puts into its Group — the only element any
  code places. `scripts/stage/stage.js` is the hand-written glue that was `main.js` plus the camera/run half of
  `ui.js`. The graph calls `sync(save, ui)` whenever a store changes; the stage answers through `emit()`:
  the live evening four times a second, a tap that places a piece of furniture, the camera's state, where the
  floating toolbar should be.
- **Didn't map cleanly:** `G` was shared by the sheet and the 3D. Now there are two copies: the graph's (the
  stores) and the stage's, refreshed by `sync()`. The stage never changes the save itself: a tap that places a
  bench is sent to the graph as `place`, which runs the same action a button would.

### 6. The row components (`UI/*`): the string helpers of `ui.js`

- **Was:** helpers returning HTML strings: `stepper()`, the programme `.card`, `.cat` buttons, chips with
  `aria-pressed`, `.facts` lists, `.meter`s, shop `row()`s, verdict `card()`s with `<details>`, the step-by-step list.
- **Became:** 25 small components, each a Component Inputs → a few Groups and Texts → Component Outputs (its
  click). Every "pressed / locked / done / now" look is a **States** node driven by a **Boolean To String**, so
  there is no colour logic in code: `UI/Chip`, `UI/ItemButton`, `UI/Fact`, `UI/Stepper`, `UI/OrderCard`,
  `UI/ShopRow`, `UI/Meter`, `UI/Swatch`, `UI/FeedLine`, `UI/SumLine`, `UI/PtsItem`, `UI/KcalRow`, `UI/NoteEntry`,
  `UI/LiveCard`, `UI/GoButton`, `UI/StepChip`, `UI/ChainChip`, `UI/TryStep`, `UI/TryBlock` (a Repeater of
  TrySteps), `UI/Verdict` (a **Switch** opens the "Why?" sum, a Repeater of SumLines), `UI/HairRow` (a Repeater of
  Chips that re-publishes the picked one), `UI/DancerDot` (a **Drag** node), `UI/PlanMark`, `UI/MusicSeg`.
- **Clicks:** a row publishes `click`; the Repeater re-publishes it with the row's id; a **Send Event** on the
  channel `gala-act` carries `act` + `arg` to one place that does the work (see the dispatcher below). I proved
  this chain with a three-chip test page before building on it.
- **Got wrong:** my first Chip used an Expression for "locked dims it" — the server counts an Expression as code,
  so I replaced it with a second States node. A hidden dot still took space (`visible` hides, `mounted` removes),
  and a width wired as a number inside a row became a flex share, not a percentage (the server warned; the bar is
  now a column).

### 7. The grown-ups' changes on the backend (new)

- **Backend:** a local NodeGX backend with one collection, `GameChange` (`table`, `rowId`, `fields` as JSON
  text). Anyone may read it (the game must, before it starts); nobody may write it directly.
- **Cloud functions** (`#__cloud__/…`), each a Request → nodes → Response graph:
  - `claimGrownup`: the first signed-in account becomes the home's grown-up (role `grownup`); after that every
    other account is refused, a child's included.
  - `saveChange`: Get User Roles (must be `grownup`) → Query Records → a Function holding the checker → Create
    Record or Update Record. A change is laid over what that row already had, then checked as a whole.
  - `removeChange`: takes a change back (the row returns to how the game ships it).
- **Checked over HTTP**, not just deployed: a child's account gets `notGrownup`; "M3RDE", `<img onerror=…>`,
  100 000 stars, an unknown field and a made-up table are refused with a reason; a good change is saved and a
  second one merges into it.
- **Got wrong, and it mattered:** the backend starts in *dev-open* mode, where permission rules are reported but
  not enforced — my "nobody may write" rule let a child's account write 9 999 stars straight into the
  collection. I wrote the rules into `app/nodegx.security.json` (dev-open off, function call rules
  `role:grownup`), installed them into the backend and restarted it; the same direct write is now
  `Permission denied`, and so is a child calling `saveChange` at all. The in-graph role check stays as a second
  lock.

### 8. State and start-up: `state.js` + `main.js`'s start → `Logic/Start Up`, two Global Stores, one dispatcher

- **Was:** `load()` from localStorage into `G.S`, `save()` after every change, `G` also holding the screen state.
- **Became:**
  - Global Store **`gala`**, persisted (`storageKey: gala-game-v2`), key `save` — the child's save, on this device,
    as before. I checked persistence across a reload with a two-button test page first.
  - Global Store **`ui`**, not persisted: `ui` (tab, screen, picks), `live` (the evening as it plays, written four
    times a second by the 3D stage), `res` (the rules' answer for the evening), `cam`, `float`, `toast`. Splitting
    `live` from `ui` matters: only the run sheet and the clock subscribe to it, so the tabs don't recompute four
    times a second.
  - **`Logic/Start Up`** (in the App, beside the Router): the Words Static Data → a Variable; Query Records on
    `GameChange` → "Lay the grown-ups' changes over the game" (checks each row again, then gala-rules'
    `applyRows`, once) → "Open the save" (repairs or creates it — a new school gets the grown-ups' starting stars)
    → Variable `ready`, which mounts the Game page. A Delay of 4 s lets the game open with the shipped tables if
    the backend can't be reached.
  - **`Game/Dispatcher`**: one Receive Event on `gala-act` → one Function (`game/dispatch.js`) → Set Global Store
    nodes. Every button in every tab is a Send Event with a fixed `act` (`order:up`, `form:addMove`, `go`) and
    the row's id as `arg`. This is the coded `changed()`, spread out: the graph shows which button sends what.
- **Got wrong:** "Open the save" writes the store it reads, and NodeGX stopped it with *Cyclic loop detected*;
  unticking Run On Value Change for the store input fixed it. A view Function ran once before the save existed
  and threw; every view now starts with `if (!Inputs.save || !Inputs.save.school) return;`.

### 9. The screen: `index.html` + `ui.js` painters → `Pages/Game` and its sections

- `Game/Stage 3D` (the 3D Group and its Functions), `Game/Top Bar`, `Game/Camera Bar`, `Game/Sheet` (tabs row,
  scrolling body, buttons row), `Game/Toast` (a Switch and a 2.6 s Delay), `Game/Season Letter` (the modal),
  `Game/Furniture Toolbar` (the coded `#float`, placed by the 3D stage's `float` output), `Game/Live`,
  `Game/Results`, and the eight tabs `Tabs/Order`, `Formation`, `Gouter`, `Costumes`, `Build`, `Parking`, `Shop`,
  `Notebook`. Each tab: one Subscribe per store key it needs, one view Function, Texts and Repeaters, and a Send
  Event per kind of press. The sheet mounts the tab whose `show_<tab>` is true.
- **Driven like a child arrives** (`drive_page` from the start page, no page named): the season letter, "C'est
  parti !", every tab, ▼ on a programme card (the order changed), a dress rehearsal (live clock in the top bar),
  "Aller à la fin", the verdicts and a "Pourquoi ?" opened, back, gala night: **96 ⭐, 30 → 126**, and the
  notebook's entry. No console errors at the end.
- **Didn't map cleanly:**
  - `confirm()` (delete a block, start again) and `prompt()` (rename a block) are browser dialogs, not elements;
    they became an inline "are you sure?" box and an inline Text Input, driven by `ui.confirm` / `ui.renaming`.
  - Drag-to-reorder of programme cards (pointer tracking over `getBoundingClientRect`) — the cards keep their ▲▼
    buttons, which the coded game also had; dragging them is gone. The hint now says "move the cards up or down".
  - The enlarged plan pop-over (`#planpop`, built with `createElement`) and the ruler are not rebuilt.
  - Sizes: a percentage sent as a string ("48.5%") is refused by a Group's width; it wants a number in the
    port's unit. Two components had that wrong and the browser console said so.

### 10. The grown-ups' settings page (new): `Pages/Grownups`

- **Built from:** a User node, Log In / Sign Up / Log Out, three Cloud Function nodes (`claimGrownup`,
  `saveChange`, `removeChange`), a Query Records on `GameChange`, a Repeater of `Grownups/Row Editor` (names in
  both languages, and the table's numbers: difficulty and counts for a step, price and minutes for a costume…),
  `Grownups/New Step` and `Grownups/New Costume` (Text Inputs and `UI/Labelled Pick` dropdowns — the server
  refused six hand-copied label+dropdown boxes and asked for one component, rightly), the stars box, and a
  `Grownups/Words` Static Data. Four small Functions: what the page shows, the change to send (one check run in
  the browser first so a grown-up hears *why* at once), the stars, and the error sentence.
- **Driven from the game's start page:** ⚙︎ → sign in as the test grown-up → "M3RDE" as a step name → refused
  with the reason, nothing saved → "Plié royal" → *Enregistré ✓* → a new costume "Pirate" → 80 stars for a new
  school → "Open the game with the changes" → **"Plié royal" is in the step palette, "Pirate" in the costumes**.
  A fresh browser (nothing in localStorage) opens a school with **80 ⭐**. A second account ("petitmalin") is
  told it is not the grown-ups' account, and the editor never mounts.
- **Why it lasts:** the changes are rows in the backend, laid over gala-rules' tables by `applyRows` each time the
  game opens. Clearing the browser loses only the child's save; another computer reading the same backend sees
  the same changes; a new version of the game ships new default tables and the same rows are laid over them
  (a row whose id the new version no longer knows is refused by the checker and simply skipped).
- **Didn't map cleanly:** a Repeater re-publishes a row's value outputs, but the value it holds is the last row
  that *changed* one, not the row whose button was pressed — so typing in row A then saving row B would have sent
  A's text with B's id. The row now packs its own values into one object at the moment its Save is pressed. And
  the Log Out node's trigger is called `login` (the server said so).

### 11. Clean-up after testing

My tests left three accounts and three changes in the backend. I took the changes back through `removeChange`,
took the test account out of the `grownup` role, and gave the three test accounts long random passwords nobody
knows (the backend has no delete-user tool I could reach). Nobody holds the `grownup` role now: **the first
account the real grown-up creates on the settings page becomes the grown-ups' account** — do that before the
children find the ⚙︎.

---

## At the end

### What was easy

- **The rules.** They were already pure, so "convert" meant a 30-line copier and an equality check.
- **Rows → Repeaters.** Every `.map(...).join('')` in `ui.js` became a For Each over the same rows, and the 25 row
  components were quick once `UI/Chip` had settled the pattern (Component Inputs → States → Component Outputs).
- **State.** A persisted Global Store *is* the localStorage save, with change notification for free.
- **One dispatcher.** Send Event (`act`, `arg`) from every button into one Receive Event made 60-odd different
  presses manageable, and it reads well on the canvas.
- **The server.** Every refused write named the port, the reason and usually the fix. I never had a write
  silently accepted that then didn't work, except the dimension-as-string case (caught by the console).

### What was hard

- **Volume.** `ui.js` is 752 dense lines; as nodes it is 54 components and 762 nodes. Each tab is one large
  `create_component` call of 30–90 nodes, and a big page has to be resent whole to change it.
- **Things a string of HTML does for free:** the SVG stage plan (now Groups placed in pixels plus Drag nodes),
  `<details>` (a Switch), `<b>` in a sentence (dropped), `confirm()`/`prompt()` (inline boxes),
  `scrollIntoView` on the step being danced (not rebuilt).
- **Two copies of state.** The 3D code wants to read the state every frame; the graph wants to own it. `sync()`
  in, `emit()` out works, but it is the one seam where a bug could hide.
- **Security defaults.** The backend started in dev-open mode; a "nobody may write" rule wasn't enforced until I
  switched enforcement on. Without testing the direct write over HTTP I would have shipped it open.
- **Speed in the test browser.** In the headless browser (software WebGL, no GPU) each tap takes 3–7 s to
  settle; JavaScript is only ~5 ms a frame, the rest is the 3D scene drawn without a GPU. The coded game draws the
  same scene. I couldn't measure on real hardware from here.

### What was lost or changed

- Lost: bold words inside sentences; dragging programme cards (the ▲▼ buttons remain); the ruler and the enlarged
  stage plan; scrolling the try-out list to the step being danced; the bottom-sheet layout on narrow screens
  (the sheet stays a 400 px side panel); `window.__game`, the coded game's handle for its own test driver; the
  import of a round-1 save from another origin.
- Changed: the programme hint says "move the cards up or down"; renaming a block and the two confirmations are
  inline; the school name is checked like a grown-up's name (a rude name is refused with a toast).
- Added: the grown-ups' settings, the backend, the checker in two places, the ⚙︎ in the top bar.
- Fonts: as before, Fredoka/Nunito/Playball come from Google Fonts when online; offline the system fonts take over.

### How much is nodes, how much is code

Counted from the project files (`components/**/nodes.json`, `scripts/**`):

| | count |
|---|---|
| components | 54 (UI 25, Game 10, Tabs 8, Grownups 4, cloud functions 3, pages 2, Logic 1, App 1) |
| nodes | **762**, of which 363 draw (Group, Text, controls, Repeaters…) and 74 are Send Events |
| code nodes | **33** Function nodes (no Expression, no Script node) — 4.3 % of the nodes; the server's own measure says "95.1 % known" |
| lines inside those Functions | 390, most of them `Outputs.x = v.x` lines handing rows to Repeaters, plus the ~200-line checker pasted into `saveChange` |
| script files | 21 files, 3 369 lines: **2 112 are generated copies** (gala-rules 990, the 3D/music modules 1 014, the checker 108) and **1 257 hand-written** (view rows 585, actions/dispatch/save/text 462, the 3D glue 189, settings 21) |

So: every screen, tab, list, button, label, dialog, message and the game's state are nodes; the code is the rules
(unchanged), the 3D view and the music (the reference's own modules), and the layer that turns the save into
rows and a press into a new save. The words are data in two Static Data nodes (389 game rows, 66 grown-up rows).

### How to see it

`npx @nodegx/preview app --open` (from this folder) — it starts the game's backend too. The game opens on the
season's letter; the grown-ups' settings are behind ⚙︎ in the top bar. `node tools/check-rules.mjs` and
`node tools/check-views.mjs` re-check the code layers; `node tools/sync-rules.mjs` / `sync-stage.mjs` /
`sync-check.mjs` regenerate the copies when gala-rules or the checker changes.
