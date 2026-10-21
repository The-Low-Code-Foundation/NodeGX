# Le Gala de danse: how to change this game

A browser game for children, made of plain ES modules and three.js (`vendor/`, r177). There's no build step, and the game
itself installs nothing. The person who asks for changes **can't read code**. They judge your work by playing the game
and reading your report. So everything below exists so they can check your work without reading code.

When you're told to "just build it", don't stop to ask questions. Where the request is unclear, pick the reading a
parent or dance teacher would most likely mean, write it under **"What I decided for you"** in the change file (see
step 1), and if the choice is a matter of taste, make it a setting (step 4).

## Running it

- `npm start` serves the game at http://localhost:5173 (`PORT=…` to change). Only this machine can reach it.
- `npm test` runs the rule tests (`node --test`, under a second).
- `npm run check` runs the browser tests (`tests/browser/`). If they don't exist yet, set them up the first time you
  need them: `npm i -D playwright`, then `npx playwright install chromium`, plus a `check` script in `package.json`.
  This is a developer tool only. The game must never import it.
- The README mentions `node drive.mjs`, but that file doesn't exist, and its `cd` path is from another repository. Fix
  the README when you first touch it.

The README's table says what each file does, and its "rules" section explains the numbers the engine uses. Read both
before you change anything.

## Every change, in this order

1. **Write the behaviour down first.** Create `changes/NNN-short-name.md` (number them in order). Copy the person's
   paragraph into it word for word. Below it, add numbered lines, each one a single thing the person could see or do:
   "When I …, I see …". Every sentence of theirs must lead to at least one line, and no line may come from nowhere.
   Then add the "What I decided for you" section.
2. **One test per line, written before the code.** Rules (timing, verdicts, points, anything `simulate()` returns) go in
   `tests/*.test.mjs`. Anything on screen goes in `tests/browser/NNN-short-name.spec.mjs`, which drives the page
   through `window.__game` and real clicks. Name each test after its line (`"3. When I …"`). Run the tests, see the
   new ones fail, then build.
3. **Build it.** Then run `npm test` and `npm run check`. Everything passes, old tests included. Never weaken or
   delete an old test to get a pass. If an old behaviour truly has to change, say so in the change file and in the report.
4. **Settings.** Anything the person might reasonably want to tune themselves (a name, a price, a time, a difficulty,
   a sound, a rule's number) goes on the settings screen. Don't hard-code it. See "Settings" below.
5. **Check it in a real browser, against their words.** Open the game at 1426×690 (the MacBook it's played on) and at
   a phone size. Follow each numbered line yourself, as a player would, and take a screenshot as evidence. Also do one
   pass in French and one in English. Watch the browser console: any error means you're not done.
6. **Report** (step 6 below). Write it at the bottom of the change file, and send the same text as your final message.

### The report (for someone who doesn't read code)

- One row per numbered line: the line itself, ✅ or ❌, what you did to check it ("I clicked Costumes, then…"), and the
  screenshot (`changes/NNN-shots/3.png`).
- "What I decided for you", in plain words, with where to change each decision in Settings.
- Anything not done or not working, stated plainly. Never write "should work". Write what you saw.
- How to try it yourself: "run `npm start`, open http://localhost:5173, then …".
- No file names, function names or jargon outside the "how to try" part.

## Settings: kept for good

Right now there's no settings screen, and `applyRows()` in `src/data.js` is never called by the page. It already
lays a grown-up's changes over the default rows (`EDITABLE` lists the tables). The first change that needs settings
builds the following:

- **A ⚙️ screen behind a grown-up gate**, so children don't change it by accident. Use, for example, a long press and
  a sum with a typed answer. Every field gets a label in both languages, limits (min/max, a maximum length) and a
  "back to default" button. Nothing typed there can break the game. The screen rejects bad values with a friendly message.
- **Where the settings are kept.** `serve.mjs` reads and writes one JSON file *outside the game folder*:
  `~/.gala-de-danse/settings.json` (and the save, `save.json`, beside it). Installing a new version replaces the
  folder, so the settings survive, and every browser on this machine sees them. `localStorage` is only a copy, used
  when the server can't be reached. On the screen, add **"Save to a file" / "Load from a file"** buttons, so settings
  can move to another computer.
- **The file format.** `{ "v": 1, "rows": { …only the EDITABLE tables… } }`. The loader keeps known tables and
  fields of the right type within limits, quietly drops anything else, and never throws. If `applyRows` would throw
  on an unknown table, filter the file first. Old files keep working the way `mend()` in `src/state.js` keeps old
  saves working. If you change the format, bump `v` and add a migration with a test.
- **The server endpoint** accepts only that one file path, valid JSON, of at most 100 KB. It stays bound to `127.0.0.1`.
- **Persistence test** (browser): change a setting, then check it's still there after a reload, in a fresh browser
  context, and after clearing `localStorage`. A second test simulates upgrading by restarting the server from a fresh
  copy of the folder: the setting must still be there.

## Children play it

- **Nothing they can reach breaks it.** Run a monkey test in `tests/browser/` that clicks, drags, types and presses
  keys at random on every screen for a minute. It passes when the console shows no errors, the game still renders,
  and the save still loads. Steppers and inputs are clamped, and no number (stars, minutes, counts) can go negative,
  become NaN or overflow the screen. Anything destructive, like "start again", asks first (as `resetAll` does now).
- **No rude words.** Free text is the school name (40 chars), block names (24 chars) and anything you add. All of it
  goes through one `clean()` filter in `src/words.js`: a French and English word list, matched regardless of case and
  accents and with letters swapped for look-alike digits. Rejected text falls back to the default name. Test the filter
  in `tests/`. Generated text (dancer names, verdicts, `i18n.js`) must stay kind: nothing mocks a child.
- **It does only what it's for.** Any text that goes into `innerHTML` passes through `esc()` (`src/ui.js`). No `eval`,
  no links out, and no network requests apart from the local server and the fonts already in `index.html`. No ads,
  accounts, chat or data leaving the machine. Nothing in the page is taken from the address bar or from a loaded file
  without checking it.

## What the folder must say afterwards

- `README.md`: how to run, test and check, with the commands above. One row per file in the "where things live" table
  (add new files, remove dead ones). The rules section matches the engine.
- `changes/`: one file per change (request, numbered lines, decisions, report, screenshots). This is the history the
  person can read.
- Keep this file as it is. Put facts about the game in the README, not here.

## Changing it later without breaking it

You won't remember earlier changes, so start from the folder. Read the README and the latest `changes/` files, then run
`npm test` and `npm run check` before touching anything. If something was already failing, say so in your report,
don't hide it.

- `src/engine.js` stays pure: no DOM, no randomness without the seed, the same input gives the same result. Screens show
  the engine's results. They never compute their own.
- New content is rows in `src/data.js` (a costume, a move, a piece of furniture). Every new sentence goes in
  `src/i18n.js`, in **both** French and English.
- The save (`gala-game-v2`, `mend()`) must open every older save and every older settings file. Add a test that loads
  an old save whenever you change what is saved.
- Keep `window.__game` (`src/main.js`) working. The browser tests depend on it, so extend it rather than rename anything.
- Each number's music must still end on its last count (`tests/music.test.mjs`).
- Copy the style of the code around you: short comments that explain why, and the same naming.
