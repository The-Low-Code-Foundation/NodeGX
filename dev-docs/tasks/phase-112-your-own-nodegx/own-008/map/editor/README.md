# NodeGX map

Your NodeGX app as a 3D map you fly through and rewire. Every component is a plate in its folder's
district, and every node is a card where the files put it. As on a NodeGX card, a card has a row for
each wired port, with a dot on its edge: inputs on the left, outputs on the right. Every wire leaves
its output dot level, arcs over, and comes down level into its input dot. Signals are blue and
values are green.

Hover a wire and it glows, firing glowing balls from its output to its input, so you can see which
way it runs. Hover a card and all of its wires do the same. Whatever you hover is outlined in the
running app in the corner, if it draws something on that screen. While you use the app, a ball
runs along each wire that carries a value.

## Start

```
cd editor
npm start
```

That opens `../todo-list` in your browser. The first start installs the kit. For another app, run
`node server.mjs <the app's folder> --open`, or press **Open…** in the page.

## Fly

| | |
|---|---|
| W / S or ↑ / ↓ | fly forward / back, level, the way you're facing |
| A / D or ← / → | fly left / right |
| E / Q (or Space / C) | up / down |
| Shift | faster |
| drag | look around |
| right-drag or Shift-drag | pan |
| wheel | zoom: in and out along your line of sight |

Click the map first if you've been typing in the app's preview, so the keys come back to the map.
| click | select a card or a plate |
| double-click, or F | fly to it |
| Home, or **Whole map** | the whole map |
| **Fly to a component…** | jump to one by name |

## Change the app

Select a card. The panel on the right is where you change it:

- **Rewire.** **wire →** on an output (or **← wire** on an input), then click the card at the other
  end and pick its port. **cut** removes a wire.
- **Rename** a node, change its **parameters**, or set one it doesn't have yet. **×** takes a
  parameter off, so it goes back to its default.
- **Move** a card: drag the selected card, or type its x and y.
- **Put inside…** puts a node inside another one: click the new parent on the map.
- **Add a node…** adds one of any node type, or one of your components. With a visual node selected,
  it goes inside that node.
- **Remove** (or Delete) removes the node, everything inside it, and their wires.
- **Undo** (Ctrl/Cmd+Z). **Save** (Ctrl/Cmd+S) writes into the app's files.

Port lists come from `@nodegx/node-spec`. For a component, they come from its Component Inputs
and Component Outputs. For anything else, they come from the runtime's own node library.

## Saving, safely

- Nothing is written until you press Save, and only the components you changed are written. Each
  goes through the kit's store (`@nodegx/project-contract`): it is validated against the format's
  schemas first, an unchanged component writes nothing, and the registry stays true.
- If someone else (your agent, the NodeGX editor) changed a component after the map read it, that
  component's Save is refused rather than overwriting their work. A component you haven't touched
  just shows their version. For one you have touched, a banner lets you load theirs instead.
- After every save, the kit's validator reads the whole project and says whether it is clean.
- Cloud functions are deployed, not saved: after changing one, ask your agent to run
  `deploy_cloud_functions`.

## Checked with the kit's editor suite

```
npm run suite -- <a copy of the app> suite/edits.json          # PASS
npm run suite:control -- <a copy of the app> suite/edits.json  # FAIL on purpose: the suite really reads what the map saves
```

`suite/adapter.mjs` drives the same model methods the panel's buttons call (`core/model.mjs`) and
saves the same way the Save button does (`core/commit.mjs`). `tools/run-suite.mjs` is the kit's
command (same `runSuite`, graph grader and report), except that it loads the adapter with `import()`.
The kit's own `editor-suite-node.js` uses `require()`, which can't load an `.mjs` adapter before
Node 22.

`tests/edit-session.json` is a session in the page itself (rewire, cut, rename, set, drag, add,
save), run by `node --experimental-websocket tools/drive.mjs <the page's URL> tests/edit-session.json <shots-dir>`
against an editor started on a copy of the app.

## Files

| | |
|---|---|
| `server.mjs` | serves the page; reads the project; ports from node-spec; saves through the kit's store |
| `core/model.mjs` | the project in memory and the eight changes; the page and the suite both use it |
| `core/commit.mjs` | validate, then write with each component's revision |
| `public/map3d.mjs` | the 3D map (three.js) in the NodeGX canvas look (`@nodegx/canvas-look`) |
| `public/app.mjs` | the panel, the running app (`@nodegx/preview`), save, watching the disk |
| `suite/` | the editor suite's adapter, its control, and the edit script |
| `tools/` | developer scripts: copy, diff, check, a headless-Chrome driver |
