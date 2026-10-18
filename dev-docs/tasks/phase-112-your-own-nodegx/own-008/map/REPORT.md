# Report: a 3D map editor built from the NodeGX kit

For the people who made the kit (`nodegx-your-own-editor`, `@nodegx/project-contract` 0.1.0,
`@nodegx/node-spec` 0.1.0, `@nodegx/preview` 0.2.2, `@nodegx/canvas-look` 0.1.0). Written
into this file instead of an issue, as asked.

## What was built

`./editor` is a NodeGX editor that shows an app as a 3D map you can fly through (three.js). Each
component is a plate in its folder's district. Each node is a card at its file x/y, coloured from
`@nodegx/canvas-look`. Each wire is an arc in the kit's signal or data colour. Purple arcs join a
component to the places it is used. The real app runs in a corner through the in-page
`@nodegx/preview`, and its trace sends a bead along each wire as values travel through the running
app.

In the panel you can rewire (connect, cut), rename, set or unset parameters, move a card (drag it, or
type x and y), put a node inside another, add any node type or component, remove a node, and undo.
Save writes only the changed components, through `V2ProjectStore` with `ifRevision`, after
validating them. A component someone else changed is refused, with a choice to load theirs. After
each save the kit's structural validator reads the whole project.

`npm start` in `./editor` installs the kit on first run and opens `../todo-list`.

**Time:** about 25 minutes from reading the skill to this report. That was 23 minutes of building
and testing (timestamped at the start and the end), plus writing this.

## The suite's output

On a copy of `todo-list`, with a 17-edit script (`editor/suite/edits.json`). It uses every one of
the eight kinds, across two components, including a subtree removal and the editor's own minted
ids:

```
$ node node_modules/@nodegx/project-contract/editor-suite-node.js suite/adapter.mjs <copy> suite/edits.json
PASS — NodeGX map editor on suite (77 ms)
```

The control (`suite/adapter-broken.mjs`, the same adapter writing one number as a string):

```
$ node node_modules/@nodegx/project-contract/editor-suite-node.js suite/adapter-broken.mjs <copy> suite/edits.json
FAIL — NodeGX map editor (broken on purpose) on suite (76 ms): 1 difference(s)
1. node "hdTitle" in components/Todo/Header/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.
```

The adapter calls the same `ProjectModel` methods the panel's buttons call, and saves through the
same `commit()` the Save button uses. It has no graph runner, so the suite graded files only (see
question 10).

## The other checks

- **A real session in the page** (headless Chrome over CDP, clicking cards and buttons as a person
  would) on a second copy. It added a wire, cut a wire, renamed a node, set a parameter, dragged a
  card, added a node, and saved. A diff against the original shows exactly those changes, plus the
  registry's counts and `lastUpdated`. **241 other files were byte-identical.**
- **`validate_project`** (nodegx MCP 0.2.2) on that saved copy: **0 errors**, 1 warning, 28 infos.
  The warning was correct and mine: the session added a Text with no parent, which is outside the
  visual tree and never drawn. The editor now says so on such a node, and "Add a node…" puts a new
  node inside the selected visual node by default. The infos are the app's own (`gate-starts-shown`,
  `oversized-page`).
- **`render_report`** on the saved copy: 0 errors, no console errors, and the sign-in screen
  rendered. Its warnings are about the app's look, not the edits.
- **A second session:** put inside, add as a child, remove and undo (the wire came back), and a
  conflict. Another writer renamed a node in a component with unsaved changes. The banner warned,
  Save was refused, and "load theirs" recovered. After that, Cmd+S saved the remaining change.
- **`./todo-list` is untouched:** all 244 files are byte-identical to the copy taken before any
  test, and no file in it is newer than the kit's install.
- I could not open the saved copy in the official NodeGX editor. It is not something I can run from
  here; please open `/tmp/nodegx-map-copies/ui` in it if you have it.

## Questions the page and the kit didn't answer (where I guessed)

1. **Format version.** The page says the version is `5` and to write what you read. `todo-list` is
   `"version": "4"`. The store's header says the nodegx server adds run-on-value-change pins for
   projects older than 5, in `writeComponent`'s `prepare` hook. Should a stranger's editor do that
   too? The reference adapter doesn't, so neither does mine, and the suite can't tell. Is a v4
   project saved without the pins what the official editor would write?
2. **Visual nodes do have specs.** The page says "Visual nodes have no spec". In node-spec 0.1.0,
   `specFor('Group')`, `Text`, `net.noodl.controls.button` and `textinput` all return specs (92, 66,
   88 and 101 ports). I used node-spec first and the runtime's `nodeLibrary` only for types it lacks
   (`Page`, `CSS Definition`, `Component Inputs/Outputs`). Which source is right for visual ports?
3. **Node type → canvas-look category.** `nodeScheme(category)` needs `visual`, `data`, `logic`,
   `javascript` or `component`. Nothing in the kit maps a node type to one, and specs carry no
   category. I mapped the runtime library's categories (`Visual`, `Data`, `Cloud Services`,
   `CustomCode`…) and fell back to name patterns. Two editors will colour the same node differently.
4. **The PortContext builder.** node-spec's `PortContext` says "a project-model builder
   (`@nodegx/project-contract`) makes one from a project". I found no such export. I built `wired`,
   `wiredOutputs`, `instancePorts` and `components` myself. I guessed that `components` is keyed by
   legacy name (`/Todo/Header`), and left `routers`, `stacks`, `schema` and `siblings` empty.
5. **`npx @nodegx/preview` fails.** The package has two bins (`noodl-preview`, `nodegx-deploy`) and
   none named `preview`, so `npm exec @nodegx/preview` answers "could not determine executable to
   run" (tried on 0.2.2, installed locally). This folder's CLAUDE.md and the package README both
   give that command. The editor's `npm run preview` calls `noodl-preview` instead.
6. **The in-page preview isn't documented.** The README covers the CLI only. I read `mountPreview`'s
   options (`runtimeBase`, `traceIntervalMs`, `frameTimeoutMs`), `update()`'s
   `{ status, warnings | message }` and the trace batch `{ dictionary?, events }` from the bundle.
   The batch's events are `{ seq, t, fromNode, fromPort, toNode, toPort, value, kind }`, and
   `dictionary.nodes[id].component` is the legacy name. These worked, but they were read from
   minified code.
7. **The shape of `nodeLibrary`** is undocumented. I read `nodetypes[]` with
   `name/category/ports[{name, plug, type}]`. I didn't check every field.
8. **Visual roots.** The edit vocabulary can't add a node to `visualRoots`. `add_child` doesn't take
   a former root out of `visualRoots` either. So an editor that matches the reference can make a
   node that is never drawn (question 9), and can't make a new root. Is that intended?
9. **A child's position.** The page says a child has no position. The reference keeps `x`/`y` when
   `add_child` makes a node a child, and every child in `todo-list` carries `x`/`y`. I matched the
   reference: I keep what is there, and write none for a new child.
10. **"The report says so"** for a files-only adapter: it doesn't. The PASS line is the same with or
    without a graph half, and only names the graph when there is one. My editor runs logic only
    through the whole app in the preview, so it offers no `graphTarget()`. A line like "files only:
    the adapter has no runner" in the PASS would make that visible.
11. **Component interfaces.** No edit adds or removes a port on a Component Inputs/Outputs node
    (`ports`). So an editor that stays within the eight edits can't let a person rewire across
    components by adding a port. I said so in the editor's message when a wire is refused across
    components.
12. **The preview frame isn't sandboxed.** It shares the editor's origin, so the running app shares
    `localStorage` with the editor page. That was harmless here. Is it intended?
13. **Store behaviour I relied on but didn't find documented:** `writeComponent` didn't change
    `component.json` (or its `modified`) when only `nodes.json` and `connections.json` changed. The
    registry entry's `modified` and `lastUpdated` did change. I treated that as right because the
    reference does the same.
