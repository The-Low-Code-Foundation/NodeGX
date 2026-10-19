# NodeGX Scene — an editor for the 3D scenes in a NodeGX app

The custom editor for three-kit (`library/modules/three-kit`, `@nodegx/three-kit`): one 3D scene of an app at a time,
with the real app running in the middle. Built from the npm kit the way the P112 editors are (`@nodegx/preview` renders
the app in the page, `@nodegx/project-contract` reads and writes the files), so what it saves is an ordinary NodeGX
project that the main editor, the MCP and `nodegx deploy` all open. A prototype (2026-10-19, s4 of
[THREE-IN-NODES](../../THREE-IN-NODES.md)).

## Start

```
cd dev-docs/parked/three-in-nodes/editor
npm start                      # opens the page: open a project folder, or "Try the demo"
node server.mjs <project-dir>  # straight into a project (add --open to open the browser, --port to pick one)
```

The demo is a fresh copy of `../fixture` (a bar chart, a ball, a robot) in a temp folder, so trying it never edits the
repo. A project with no 3D scene gets a card: pick a page and **Add a 3D scene** puts a Scene with a sky, a sun and a box
on it, installing three-kit into its `noodl_modules/` first if it has none (the same copy `npx @nodegx/three-kit add`
makes).

## Use

| | |
|---|---|
| **Add** (left) | Box, Ball, Cylinder, Cone, Ring, Tile, Group, Sun, Lamp, Sky. A shape lands on a free spot of the floor, inside the selected 3D Group if one is selected. |
| **In the scene** (left) | the scene's tree. Drag a row onto a Group to put it inside, or between rows to reorder. A For Each shows its row template under it, in italics: select it to change how every row looks. |
| click in the view | selects what is under the pointer. Alt-click selects the 3D Group around it. A light is its marker. |
| drag in the view | moves it along the floor (snapped to a quarter; Alt: free); Shift-drag moves it up and down. Pressing on anything inside the selected Group moves the whole Group. A position wired from the graph stays with its wire; the other axes still drag. |
| drag empty space / wheel | orbit / zoom (three-kit's own orbit) |
| the inspector (right) | the selected thing's settings, from the kit's own port definitions; drag a label or an axis letter to scrub a number. **Use this view** on the Scene makes the orbit you have now the camera the app opens with. |
| **Edit / Play** | Edit renders a *stage*: the scene's own page as the app's root, so a scene behind a sign-in or a router is on screen, lifted to fill the view (**Fill the view** turns that off). Play renders the real app, as it will run, and gives it your clicks. |
| ⌫ ⌘D ⌘Z ⇧⌘Z ⌘S | delete, duplicate, undo, redo, save. E / P edit / play, F fill the view, Esc selects the scene. |

A setting reaches the running app as you change it (the runtime's own `setParameter`, the way the main editor's live
preview does it, every instance at once). An edit to the tree (add, delete, move under) re-renders the app, keeping your
orbit. **Save** writes the changed components through the kit's store: every file validated first, written only if the
file on disk is still the one read (a file another editor or an agent changed since is refused, never overwritten).

## How it is built

| file | what it is |
|---|---|
| `server.mjs` | serves the page, reads the project, saves (`core/commit.mjs`), installs the kit (`/api/add-kit`), copies the demo |
| `core/model.mjs` | the component files in memory: set, add, remove, reparent, duplicate, rename; undo with merged drags |
| `core/commit.mjs` | the save path, copied from the map editor (`own-008/map/editor/core`) |
| `public/viewport.mjs` | the preview frame and the layer over it: pick, drag on a plane in the parent's own space, orbit, the selection box (a `BoxHelper` in the scene), light markers, the stage's fill |
| `public/app.mjs` | the outline, the palette, the inspector, the stage tree, save, the no-scene card |
| `public/icons.mjs`, `style.css`, `index.html` | the look |
| `tools/drive.mjs` | headless Chrome over CDP (copied from the map editor; adds `dragAt` / `clickAt`) |
| `tests/*.json` | the drives: `editor.json` (the fixture), `add-scene.json` (the todo app, no scene), `demo.json` (the open screen) |

One seam in the kit made it possible: every three.js object three-kit makes carries `userData.nodeId`, the id of the node
in the project's files that made it (`nodeIdOf`, `src/kit.js`), and the census reports it. Every row of a For Each
shares its template's id, which is how a picked bar finds its For Each.

## Test

```
node server.mjs <a copy of a project> --port 8650
node tools/drive.mjs http://127.0.0.1:8650/ tests/editor.json <shots-dir>
```

`editor.json` wants a copy of `../fixture` with the kit in it: `node scripts/devtools/drive-three-kit.js assemble <dir>`
from the repo root. `add-scene.json` wants a copy of `templates/todo-list`; `demo.json` a server started with no project.
Headless Chrome draws on software GL, slowly, and grants no pointer lock or real GPU: the feel of a drag on a real
screen is a person's check.
