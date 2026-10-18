# Report: a big-block editor built from the NodeGX kit

For the people who made the kit, as `nodegx-your-own-editor` asks. The person asked for this report in a file
rather than an issue.

## What was built

`./editor`, a block editor for children for the `./todo-list` app (80 components, 888 nodes, 2042 wires).
`npm start` opens `../todo-list`. It has four blocks to add (Words, Button, Box, Picture), huge targets and plain
words. The real app runs beside the blocks through `@nodegx/preview`'s in-page bundle, updated on every change
before saving. A ring on the app shows the picked block (`elementsOf`), and blocks flash when the app uses them
(`onTrace`). Saves go through `V2ProjectStore` with `ifRevision`.

Kit versions from npm: `@nodegx/project-contract` 0.1.0, `@nodegx/node-spec` 0.1.0, `@nodegx/preview` 0.2.2.
I installed `@nodegx/canvas-look` 0.1.0 and then removed it: the person wanted a children's look, not the
NodeGX canvas.

## How long it took

About 25 minutes of wall-clock time, 09:21–09:46 CEST on 2026-10-18. That covers reading the skill and the kit,
writing the editor, writing the tests, and testing in a browser.

## The suite's output

On a copy of the todo list (`test/edits.json`, 21 edits covering all eight kinds across two components):

```
PASS — big-block editor on suite (80 ms)
```

The control arm (`test/broken-adapter.mjs`, the real adapter with one number saved as a string on the way out):

```
FAIL — big-block editor (broken on purpose) on suite (79 ms): 1 difference(s)
1. node "kidWords" in components/Pages/Sign in/nodes.json: "parameters.fontSize" is "32"; the official editor saves 32.
```

A second control broke the editor's own code instead: `putInside` ignored its index, which is the path behind the
Up and Down buttons. The suite read:

```
FAIL — big-block editor on suite (79 ms): 1 difference(s)
1. node "siCard" in components/Pages/Sign in/nodes.json: "children" is ["siTitle","siEmail","siPassword","siError","siButtons","kidBox","siLead"]; the official editor saves ["siLead","siTitle","siEmail","siPassword","siError","siButtons","kidBox"].
```

I reverted it, and the suite said PASS again.

**The graph half was not graded.** The editor has no graph runner of its own; its Logic is the real app in the
preview. So the adapter offers neither `graphTarget()` nor `playGraph()`, and the grade covers files only. See
question 4: the PASS line doesn't say so.

## The other checks

- `validate_project` (the `nodegx` server, `@nodegx/mcp@0.2.2`) on a copy saved by pressing through the editor
  in Chrome: **0 errors, 0 warnings, 28 infos**. That is the same as the untouched app (0, 0, 28). An earlier build
  wrote raw hex colours and got 1 warning (`raw-color-literal`); the editor now writes only design tokens.
- `drive_page` from the app's start page, on that saved copy, passed all 8 steps. The start page redirected to
  `/sign-in` (there is no backend). The changed title showed, red. The sun and moon buttons switched the theme;
  the moon is the button whose wire the editor had cut and joined again. No console errors.
- `../todo-list` is byte for byte unchanged. `diff -r` against a snapshot taken before any code was written
  reports no difference. `npm test` fingerprints it before and after, and `node test/start-check.mjs` does the
  same around `npm start` on the real app.
- The official NodeGX editor was not run on the saved copy. It isn't installed here, and I didn't ask the person
  to open it, because they asked me not to wait on questions.

## Questions the skill and the kit didn't answer (where I guessed)

1. **"Visual nodes have no spec" is not true of `@nodegx/node-spec` 0.1.0.** `specFor('Text')`, `'Group'`,
   `'net.noodl.controls.button'`, `'Image'` and `'net.noodl.controls.textinput'` all return specs with full port
   lists, and `drawnPorts` works on them. I took every setting name and the button's `onClick` from those specs
   (`test/words.test.mjs` checks them). Which one is authoritative for visual ports, the spec or the preview's
   `nodeLibrary`? I guessed the spec. `test/probe-browser.mjs` compares the two: the running app's `nodeLibrary` has every
   one of the 13 port names the editor uses.
2. **The format version.** This project says `"version": "4"`; the skill says the format is `5`. The store's
   comment says the MCP adds run-on-value-change pins in `prepare` for projects older than 5. Must a third-party
   editor saving into a version-4 project apply those pins too? I guessed no and pinned nothing. The validator and
   the server's validator were both clean.
3. **`component.json`'s `modified` and `modifiedBy`.** The store writes neither, and the suite ignores both. I set
   `modified` to the save time and `modifiedBy` to `"big-block-editor"` in `prepare`, so an unchanged part still
   writes nothing. Is a third-party editor meant to sign its writes?
4. **The PASS line doesn't say "files only".** The skill says an adapter with no runner "is graded on files only.
   The report says so." In 0.1.0, `formatReport` prints a bare `PASS — … (80 ms)` when there is no runner.
   `report.graph` is simply absent. Someone reading only the line can't tell a files-only pass from a full one.
5. **"A child has no position" conflicts with this project.** All 389 children in the todo list carry `x` and `y`,
   written by the `nodegx` server. My editor writes no position for a child it adds and leaves existing ones alone.
   Should an editor strip them, keep them, or write them for consistency? The suite ignores them either way.
6. **`@nodegx/node-spec`'s browser entry doesn't load in a page as published.** `dist/index.mjs` imports
   `fast-xml-parser` by bare name, so a page with no bundler or import map can't import it. I computed ports
   on the server instead. Does the browser entry need a bundled build, or should the docs mention an import map?
7. **Which context to hand `drawnPorts`.** For instance ports I used `drawnPorts(spec, {})` plus the node's own
   `ports` array from `nodes.json`. That array is where a JavaScriptFunction's script ports and a Component
   Inputs node's ports live. I passed no `PortContext` (project, schema). For node types whose
   `portsDerivability` is `with-project`, I don't know what I'm missing.
8. **The in-page preview's trace format isn't documented.** I found its events by looking:
   `{ seq, t, cause, fromNode, fromPort, toNode, toPort, value, kind }`, with node ids unscoped. They don't say
   which component instance a node belongs to, so the same id in two instances can't be told apart.
9. **`elementsOf` and styling.** A style set on the returned elements (an outline) was wiped when the app
   re-rendered. I draw the ring as an overlay positioned from `getBoundingClientRect` instead. Worth a sentence in
   the docs.
10. **The preview has no way to show a page or component other than the start page.** A child editing
    `Todo/Header` sees the start page, which here redirects to Sign in because there's no backend. Is there a
    supported way to mount one component, or to navigate the in-page app?
11. **Which design tokens resolve isn't in the kit.** The project file lists only its custom tokens. Palette and
    size tokens (`--red-500`, `--text-5xl`) come from the runtime. I learned which exist from the `nodegx` server's
    `get_style_vocabulary`. `@nodegx/project-contract` has `tokens.js` and `token-codecs/`, which the skill and README
    don't mention, so I didn't know whether they answer this. The swatches read the real values from the running
    preview with `getComputedStyle`.
12. **Warnings need the server.** The kit's `SchemaValidator` is structural. The `raw-color-literal` warning
    my first build caused comes only from the `nodegx` server's semantic validator. An editor that wants to avoid
    warnings can't check them with the kit alone.
13. **One store per server, read again on each open.** My server keeps one `V2ProjectStore` and calls
    `readComponent` for every part each time the page opens the app. That takes a fresh snapshot, and
    `ifRevision` guards the page's older copy. I guessed this is how the snapshots are meant to be used. The
    skill only covers one read and one write.
14. **`validateStructure` (in `editor-suite.js`) validates a whole folder of files**, and it was the most useful
    check outside the suite. The skill doesn't mention it.
15. **Testing an editor's own page.** `drive_page` drives the app, not my editor, so the browser test uses
    Puppeteer (a dev dependency). A note in the skill would save the next person the search.
16. **`npm audit` reports 6 advisories (3 moderate, 3 high), all through the kit's dependencies:**
    `braces` via `chokidar` in `@nodegx/preview`, and `fast-xml-parser` via `@nodegx/node-spec` (which
    `@nodegx/project-contract` pulls in). The editor binds only to 127.0.0.1.

## What the editor deliberately doesn't do

- **Add logic.** A child can join a button's press to an existing helper or piece, rename helpers, tidy them,
  remove them and cut wires. The palette has no logic nodes, to keep the node count low.
- **Change a value wired by the app.** A setting fed by a wire shows "🔌 A helper changes this while the app runs".
- **Write project-level files.** `nodegx.project.json`, routes, tokens and the registry are left alone; the
  registry changes only through the store.
- **Deploy.** A part under `#__cloud__` gets a note saying a grown-up has to deploy it. This app has none.
- **Work on touch screens fully.** Dragging blocks into boxes uses HTML5 drag and drop, which tablets don't
  support. Every move also has a button (Up, Down, Into another box), and helpers drag with pointer events.
  The browser test covers the buttons and the helper drag, not HTML5 drag and drop.
