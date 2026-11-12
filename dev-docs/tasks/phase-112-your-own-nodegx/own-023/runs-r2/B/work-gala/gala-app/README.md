# Le Gala de danse — the NodeGX app

The dance-school gala game from `../reference/`, rebuilt as a NodeGX app, with a **👪 Parents / Grown-ups** page where
the grown-ups at home change the game themselves.

## Opening it

```
npx @nodegx/preview gala-app --open        # from the folder above, or `npm start` in this one
```

That starts the app and its own backend (the database that keeps the grown-ups' changes). The game opens on `/`; the
grown-ups' page is the **👪 Parents** button in the game's top bar (`/grown-ups`).

## The grown-ups' page

1. **Set the household key once.** It is what makes an account a grown-up's. Open `gala-app/.env`, write a key of
   8 characters or more after `GROWNUP_KEY=` (a few words are best, e.g. `GROWNUP_KEY=purple-tutu-under-the-stairs`),
   save, and ask the assistant to move it into the backend ("the household key is in .env"). It never goes into the page
   and is never served: the preview refuses to send `.env` to a browser.
2. **Create an account** on the grown-ups' page, then type the household key once. That account is now a grown-up's,
   on every computer. Children can make accounts too, but without the key they can't change anything.
3. **Change the game:** rename steps (French and English), make a step easier or harder, change prices of costumes,
   hairstyles, shoes and accessories, the minutes a costume or hairdo takes, the stars a new school starts with; add up
   to 20 new steps and 20 new costumes (each based on one the game has, so it dances or looks like it). Every row has
   **Back to the game's own** to undo.

Changes reach the game the next time it opens. The stars apply to a *new* school (in the game: Carnet ▸ Recommencer,
or a computer that has never played).

## Where the changes live, and why they last

- In the backend's database (`GameChange`, one record per changed row), **not in the browser**: clearing the browser
  doesn't lose them, and every computer that opens this app sees them.
- **Another computer** sees them when it opens the app served from this one: the backend lives on this computer
  (under `~/.noodl/backends/`). On the home network: `npx @nodegx/preview gala-app --host 0.0.0.0`, then open
  `http://<this computer's name>:8575` there. For computers outside the home, deploy the app and its backend
  (`nodegx-deploy`); the backend's security policy goes with it.
- As **changes over the game's own rows**, not as a copy of the game's data: installing a new version of the game (a new
  `gala-rules/`) keeps them. A change to a row a new version no longer has is skipped, not half-applied; a step or
  costume a child was using that has since gone is quietly swapped for the number's own.
- When the backend can't be reached, the game opens with the last changes this computer saw (or the game's own).

## Why a child can't break it

- **Only a grown-up's account can write**, checked on the server: the `Save Change` / `Remove Change` cloud functions are
  callable only by the `grownup` role (`nodegx.security.json`), and check the role again inside. Nobody can write the
  `GameChange` collection directly. Becoming a grown-up needs the household key; wrong guesses wait 2 s and are rate-limited.
- **Only allowed changes**: one rule book (`scripts/gala/rows.js`, `checkChange`) lists every table, row and field a
  grown-up may change and its range (difficulty 1–3, prices 0–200, stars 0–300, minutes 1–15…). Anything else is refused:
  the game's timings, the classes, the engine, unknown fields, odd ids. The server runs it on every save, and the game
  runs it again on every change it loads (`tests/rows-guard.test.mjs` fails if the two copies ever differ).
- **No rude words, no markup**: names are 1–24 letters, digits, spaces and `' - . , ! ? ( )` (no `<`, `>`, `&`, quotes,
  emoji), and are checked against a French and English list of rude words, including spaced-out or l33t spellings.
  Icons for new steps and costumes come from a fixed list.

## Files

| | |
|---|---|
| `components/` | the NodeGX graphs: `Pages/Home` (starts the game with the changes), `Pages/Grown-ups` and `Grown-ups/*` (the settings), `__cloud__/Grown-ups/*` (the four cloud functions) — change them with the `nodegx` tools, not by hand |
| `scripts/gala/rows.js` | the rule book (`checkChange`) and `buildOverrides` (saved changes → `applyRows`) |
| `scripts/gala/editing.js` | the settings page's logic: rows to edit, the change a row sends, new steps and costumes |
| `game/` | the reference game's screen modules (three.js world, dancers, playback, side sheet, music, words); `game/src/{data,engine,plan,tunes}.js` only pass on `gala-rules/` |
| `gala-rules/` | a link to `../gala-rules`, used as it is |
| `nodegx.security.json` | who may do what on the backend |
| `tests/` | `npm test` runs these and `gala-rules`' own tests |
