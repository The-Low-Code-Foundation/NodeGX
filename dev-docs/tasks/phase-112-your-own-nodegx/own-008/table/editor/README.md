# Table editor for NodeGX apps

One row per node, one column per port. Edit a cell, press **Save**, and the app's files change.

```
cd editor
npm start                      # opens ../todo-list
npm start -- /path/to/an/app   # or any other NodeGX app folder
```

The first start installs the NodeGX kit. The page opens at http://127.0.0.1:8590/. You can also type another app
folder at the top and press **Open**. Opening only reads; nothing is written until you press Save.

## Using it

- **Left:** the app's components. A ● marks one with unsaved changes.
- **Rows:** the nodes, with visual trees indented under their parent. **Columns:** `id`, `type`, `label`, `parent`
  (`hdRoot #2` means the second child of hdRoot) and `position` (`x, y`), then `→ port` for inputs and `port →` for
  outputs. By default only ports that have a value or a wire show; **Show every port** lists the rest.
- **Click a cell** (or press Enter on it) to change it. Enter sets the value, Esc cancels, and Delete on a cell clears
  its value back to the default. Plain text is read by the port's type: `28` and `100%` on a number port, `true` on a
  yes/no port, and everything else as text. Start with `=` to type JSON (`="28"`, `={"a":1}`).
- **Wires:** an input's cell lists its `← from` wires and an output's lists its `→ to` wires. Remove one with ✕, or
  add one by typing the other end as `node.port`.
- A **hatched cell** is a port the node's type doesn't have. A cell with an orange edge holds a value or wire on a
  port the vocabulary doesn't know.
- **+ Add node** adds a row. The **✕** at the start of a row removes that node, everything under it, and their wires.
- **Undo my changes here** drops your unsaved changes to the component you're looking at.
- **Save** writes only the components you changed. If someone else changed a component's file since you opened
  it, that component is refused, not overwritten, and your edits stay on screen.

## Tests

```
npm test            # unit tests, the kit's editor suite (PASS), and the suite's control arm (must FAIL)
npm run test:page   # headless Chrome: clicks and keys on the real page, on a copy of ../todo-list
```

Every test works on a copy. `../todo-list` is only read.

## Where things are

| file | what it does |
|---|---|
| `src/session.mjs` | the editor: one working copy per component, an action for each thing a person does, saving through the kit's store with `ifRevision` |
| `src/cells.mjs` | the text a cell shows, and the value typed text means |
| `src/vocabulary.mjs` | which ports a node has: node-spec, the app's own components, a Function's script, and the runtime's node library |
| `src/actions.mjs` | the one entry point for the page's requests and the suite's adapter |
| `server.mjs`, `public/` | the local page and its API |
| `suite/adapter.mjs` | the kit's editor-suite adapter: it drives the same actions with the text a person would type |
| `vocabulary/node-library.json` | the runtime's node list, read once from `@nodegx/preview` in the page |
