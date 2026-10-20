# Big Blocks — a block editor for the todo list

A NodeGX editor for children: four kinds of block to add, huge buttons, plain words. It opens
`../todo-list`, shows the real app beside the blocks, and saves changes back into the app's files.

```
cd editor
npm install      # once
npm start        # opens http://127.0.0.1:8600/ in your browser
```

`npm start -- /path/to/another/app` opens a different NodeGX app, and `--port 9000` picks another port. The
📂 button in the editor opens a different folder too.

## What a child can do

- **Pick a part** on the left: 📱 Screens, 🧩 Pieces (parts placed on screens), ⚙️ Machines (the logic,
  folded away).
- **Tap a block** to change it on the right: what it says, how big it is, its colour, how a box arranges
  what's inside it, and its name. The app redraws a moment later and a pink ring shows where the block is on the
  screen. Blocks flash when the running app uses them.
- **Add** Words, a Button, a Box or a Picture: tap a tile to put it next to the picked block, or drag it into a
  box.
- **Move** blocks by dragging them into a box, or with ⬆️ Up, ⬇️ Down and 📦 Into another box.
- **Take it away** (it asks first), and **↩️ Undo** (Ctrl+Z) for anything.
- **"When it is pressed, make something happen"** joins a button to a helper or a piece. ✂️ unjoins it.
- **Helpers** (the logic you can't see) can be tidied by dragging them.
- **💾 Save** (Ctrl+S) writes the changed parts into the app's files. Nothing is written until then.

Sizes and colours are the app's own design tokens, so the app's light and dark themes still work.

## How it keeps the app safe

- Opening only reads. Files are written only when you press Save, and only for the parts that changed. A part
  whose content didn't change writes nothing.
- Every save goes through the kit's store (`@nodegx/project-contract`) with the revision the part was read at.
  If someone else changed that part meanwhile (another editor, an agent), the save is refused and the editor
  offers to load their version. It never saves over theirs.
- Each part is checked against the format's schemas, and its tree is checked to read the same way flat and walked
  from the roots, before it is written. A part that fails isn't written.
- `nodegx.project.json` (the project id and format version) is never written.
- A part under `#__cloud__` runs on the app's server. Saving it doesn't deploy it, and the editor says so.

## Tests

`npm test` runs on copies under `.test-copies/` and fingerprints `../todo-list` before and after:

- the kit's editor suite (`adapter.mjs`, `test/edits.json`, all eight edits): PASS
- its control arm (`test/broken-adapter.mjs` saves one number as a string): FAIL, naming that field
- `test/words.test.mjs`: every setting the editor offers is a real input port in `@nodegx/node-spec`
- `test/disk.test.mjs`: the real server on a copy. Open writes nothing, a save is valid, an empty save writes
  nothing, someone else's change is refused, a broken part is refused
- `test/browser.test.mjs`: headless Chrome pressing through the editor, then the saved files checked and the
  page reopened

`node test/start-check.mjs` starts it with `npm start` on the real app and checks nothing was written.
`node test/probe-browser.mjs` checks the editor's setting names against the running app's own node library.

## Files

| file | what it is |
|---|---|
| `server.mjs` | opens the folder, serves the page and the kit's preview runtime, saves |
| `src/model.js` | the document and the eight changes; the page and the suite adapter both use it |
| `src/project-io.mjs` | reading and saving through the kit's store and validator |
| `src/ports.mjs` | port names from the kit's node specs and the parts' Component Inputs/Outputs |
| `public/` | the page: `index.html`, `app.js`, `style.css`, `words.js` (every word a child sees) |
| `adapter.mjs` | the editor suite's adapter |
