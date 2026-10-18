# Report: a table editor built from the NodeGX kit

**What was built:** `./editor`, a NodeGX editor that is a table, with one row per node and one column per port. You
edit the cells, and Save writes the app's files through `V2ProjectStore`. Nothing in it is visual: no canvas and no
preview pane. It starts with `npm start`. It was built for the `./todo-list` app (80 components, 888 nodes, format
`"4"`).

**Kit versions:** `@nodegx/project-contract` 0.1.0, `@nodegx/node-spec` 0.1.0, `@nodegx/preview` 0.2.2, all from
the npm registry. `@nodegx/canvas-look` wasn't installed, because the person wanted nothing visual.

**Time:** about 18 minutes of wall clock, 09:02 to 09:20 CEST, from reading the skill to the last green run. That
includes the kit reading, the editor, the suite adapter, the unit tests and a headless-Chrome page test.

## The suite's output

Run with `node node_modules/@nodegx/project-contract/editor-suite-node.js` (through `suite/run.mjs`, which copies
the app first), on a copy of `./todo-list`, with a 22-edit script (`editor/suite/edits.json`). The script uses all
eight edit kinds across two components. It covers a string, a number, a `{value,unit}` length, a boolean, an unset,
a string that looks like a number (`"42"`), and a number, a string `"7"` and an object on ports the type doesn't
declare. It also adds a visual child at an index, a parentless logic node with x/y, re-parents with an index,
removes a subtree with its wires, and connects and disconnects.

```
PASS — table editor on table-editor-suite-P5YSUB (75 ms)
```

**Control arm** (`npm run test:control`): a switch in the editor's own cell reader keeps typed numbers as text.

```
FAIL — table editor on table-editor-suite-CxKlIw (75 ms): 4 difference(s)
1. node "hdTitle" in components/Todo/Header/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.
2. node "newText" in components/Todo/Header/nodes.json: "parameters.fontSize" is "14"; the official editor saves 14.
3. node "newCounter" in components/Todo/Header/nodes.json: "parameters.limitsMax" is "5"; the official editor saves 5.
4. node "newCounter" in components/Todo/Header/nodes.json: "parameters.note" is "3"; the official editor saves 3.
control: the suite caught the broken reader, as it must.
```

**Graph half:** the adapter offers no `graphTarget()` or `playGraph()`, because the editor doesn't run graphs, so the
suite graded files only. That's deliberate, not a skipped grader.

**A second script that FAILs on purpose** (`editor/suite/edits-format4-pin.json`, see question 1 below):

```
FAIL — table editor on table-editor-suite-I1OyRQ (57 ms): 1 difference(s)
1. node "echo" in components/Commands/Add task/nodes.json: "parameters.runOnChange-in-value" is true; the official editor does not save it.
```

## The other checks

- **`validate_project`** (the `nodegx` server, bound to a saved copy, never to `./todo-list`): 0 errors and 3
  warnings. The warnings are exactly the three undeclared Counter ports the script set on purpose (`note`, `tag`,
  `meta`), and the table marks those cells too. The 29 infos are about the app itself (`gate-starts-shown`,
  `oversized-page`).
- **The real runtime on the saved files:** `@nodegx/preview`'s `mountPreview(…).update(savedFiles)` gave `status: ok`
  with 0 warnings. It drew the same 25 elements and the same sign-in page text as the unedited app.
- **Kit schemas:** `validateStructure` on every saved file found nothing.
- **Lossless round trip over the whole app:** all 4,031 parameter values in the app were shown in their cell, typed
  back through the editor's own action, and saved. The store wrote nothing: 80 components unchanged, 0 files changed.
- **Page test** (`npm run test:page`, headless Chrome over CDP with real mouse events and keystrokes): 30 of 30
  checks pass. They cover opening writes nothing, typing, Delete to clear, a refusal shown as a sentence, removing a
  wire, the Add node dialog, adding a wire, renaming, re-parenting, removing a row, and saving. After saving, only
  `Todo/Header`'s two files and the registry changed, the project file is byte-identical (same id, version `"4"`),
  and the registry counts are true. A file changed on disk after opening is refused at Save and not overwritten. The
  console has no errors.
- **`./todo-list` untouched:** a sha256 manifest of its 244 files was taken before any work and checked at the end:
  `unchanged: all 244 files match`. All testing ran on copies (OS temp folders and `editor/test-copies/`).
- **Not done:** opening a saved copy in the official NodeGX editor. Its owner should do that.

## Where the skill and the kit didn't answer, and I guessed

1. **Format-4 projects and the run-on-value-change pin.** This was the biggest one. `store.d.ts` says the MCP pins
   run-on-value-change in `writeComponent`'s `prepare` for projects older than format 5, and `./todo-list` is format
   `"4"`. The suite's reference doesn't pin. So for this app, the "official editor" the suite compares against isn't
   the official writer. **Guess:** in a format-<5 project the editor runs `pinRunOnValueChangeDefaults` in `prepare`,
   on the nodes the person touched in this session only. Without it, the NodeGX editor's 4→5 upgrade would write
   `false` and silence an input the person just wired. The suite reports that as a difference (above). Should the
   reference pin for format-<5 fixtures? Which nodes does the MCP pin: touched ones, or every node in the written
   component? And `pinRunOnValueChangeDefaults` says "Not for user projects".
2. **The pin's input needs the whole component.** A control wire counts only when its source node is in `roots`.
   My first try passed only the touched nodes and silently pinned nothing. A unit test caught it. One line in the
   d.ts would have saved that.
3. **A parentless visual node and `visualRoots`.** `applyEdit`'s `add_node` with no parent doesn't add a visual node to
   `visualRoots`, and `add_child` doesn't take a root out of it. I followed the reference. Is that what the official
   editor does?
4. **Detaching a child, unsetting a label or a position.** There's no edit for any of these, so the table refuses
   them with a sentence. Is that right, or is there a sanctioned way?
5. **Visual nodes' ports.** The skill says they come from the runtime's `nodeLibrary` through the preview. But
   node-spec 0.1.0 has `drawnPorts` for Group, Text, Button and other visual types too. I used node-spec first and
   the runtime's library for types it lacks (`CSS Definition`, `Page`, `Component Inputs`). Which one wins?
6. **Getting `nodeLibrary` without running the person's app.** It's only exposed after `update(files)`, which renders
   an app. I boot it on a hand-built one-Group project, out of sight, read the library and dispose. The minimal
   project files were guessed from `./todo-list`'s shape. A `NodegxPreview.nodeLibrary(runtimeBase)` with no app
   would be cleaner. The library is cached in `editor/vocabulary/node-library.json`, tagged with the preview version.
7. **Runtime `dynamicports`.** The library's conditional and derived ports (`conditionalports/basic`, `namedports/…`)
   aren't evaluated. I rely on node-spec's `drawnPorts(spec, params)` for those. There's no kit function that
   evaluates the runtime's `dynamicports` for given parameters.
8. **Schema-derived ports** (`prop-*` on Record nodes) need a backend schema that the table doesn't have. They show
   only because they are wired or set. `drawnPorts` was called with an empty context.
9. **Component instance ports.** I read them from the instanced component's `Component Inputs`/`Component Outputs`
   `ports`, which the MCP guidance confirms. node-spec has no function for this.
10. **A Function's ports.** `functionScriptPortNames` gives names. I added the `in-`/`out-` prefixes by reading
    `function-ports.d.ts` and this app's wires. Types are `*`, and signals are `signal`.
11. **What a person types in a cell.** Parsing is the editor's job, and the suite only shows that the saved value is
    equal. I chose type-directed reading with an `=JSON` escape, and checked it's lossless on all 4,031 values. It
    would help if the kit said how the official editor stores a number typed into a `*` port: as a number, or as text?
12. **The suite's command reads every text file in the folder** (`docs/`, `nodegx.security.json`) into the fixture.
    Fine here. I didn't check whether a binary asset would break `readFileSync(…, 'utf8')` comparisons.
13. **Packaging:** `@nodegx/node-spec` resolves only from ESM inside a package that depends on it (`node -e` from the
    parent folder failed `ERR_MODULE_NOT_FOUND`). That's expected Node behaviour, not a kit bug. The `.js` subpath
    advice in the skill was right and needed (`format.js`, `format-node.js`, `function-ports.js`,
    `run-on-value-change-migration.js`, `editor-suite.js`).
14. **The format-4 project:** the skill says "the format version is 5", but this app is `"4"`. I wrote what I read
    and never touched `nodegx.project.json`. It's worth saying in the skill that format-4 apps are still common and
    what changes for them (question 1).

## What would have helped most

A sentence in the skill or in `store.d.ts` on question 1, for any project with `version < "5"`. It's the one place
where following the reference and following the official writers lead to different files.
