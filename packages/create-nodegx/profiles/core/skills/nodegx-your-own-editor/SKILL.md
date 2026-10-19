---
name: nodegx-your-own-editor
description: "How to build your own editor for NodeGX apps — a table, a map, a big-block canvas, a form, anything — from the published kit, and how to know it is right. LOAD when the person asks for an editor, a viewer, an inspector or any tool of their own that reads or changes a NodeGX project's files, rather than asking the nodegx server to change the app for them."
user-invocable: false
---

# Build your own NodeGX editor

Someone has asked you for an editor and said what they want it to be. This page doesn't say what it should look
like. It says what makes it a NodeGX editor and which package answers which question. It says how you know you're
done. It lists the mistakes the editors before yours made. Read it once before you start. It's written for Claude
Code. Any coding agent can follow it.

A tag in brackets at the end of a line, such as (OWN-017), names the record in the NodeGX project where that lesson
was learned. You don't need to read those records.

## What a NodeGX app is

A NodeGX app is a folder of JSON files. Nothing else holds the app: no database, no binary, no hidden state.

| file | what it holds |
|---|---|
| `nodegx.project.json` | the project's name, its id, the format version (`5`) |
| `nodegx.routes.json`, `nodegx.styles.json` | the pages a router lists, the design tokens |
| `components/_registry.json` | every component by path, with the three files below |
| `components/<path>/component.json` | the component's own settings |
| `components/<path>/nodes.json` | a flat list of nodes: `id`, `type`, `parameters`, `children` (ids) |
| `components/<path>/connections.json` | the wires: from one node's output port to another node's input port |

A node is visual or logic. A visual node (a Group, a Text, a Button) draws part of the screen and sits in a parent's
`children`. A logic node (a Counter, a Condition, a Function) does something when a value or a signal arrives. A wire
carries a value or a signal from an output port to an input port. The NodeGX editor, the `nodegx` server and your
editor all write the same files.

## The six questions every editor answers

An editor answers six questions. The kit has an answer for each one. You don't invent any of them.

| part | the question | answered by |
|---|---|---|
| **Format** | What is in the project, and how do I save a change? | `@nodegx/project-contract`: the file types, the schemas, a store that reads and writes with the rules |
| **Vocabulary** | Which nodes exist, what are their ports, what do they say they do? | `@nodegx/node-spec` for most node types, visual ones included; the runtime's own node library (through `@nodegx/preview`) for the rest |
| **Logic** | What does the graph do when this changes? | the real engine, in a page, from `@nodegx/preview` |
| **Screen** | What does the app look like right now? | the real app, shown by `@nodegx/preview` beside your editor; or the screen drawn from the node specs by `@nodegx/node-spec/draw`. Both are taught below, with what each costs |
| **Look** | Does it look like NodeGX? | `@nodegx/canvas-look`, if you want it to; your own look, if the person doesn't |
| **Done** | Is it right? | the editor suite in `@nodegx/project-contract`: PASS, or a sentence naming what differs |

## The kit

```
npm install @nodegx/project-contract @nodegx/node-spec @nodegx/preview @nodegx/canvas-look
```

All four are on npm under the GPL-3.0 licence. The source is in the public repository
`The-Low-Code-Foundation/NodeGX`, under `packages/`.

**Import the kit's files with their `.js` extension from an ES module.** `@nodegx/project-contract` has no `exports`
map. `import … from '@nodegx/project-contract/editor-suite'` fails in Node's ESM loader with
`ERR_UNSUPPORTED_DIR_IMPORT`. Write `'@nodegx/project-contract/editor-suite.js'`. `require()` resolves either form.
(Measured on 0.1.0, P112-OWN007-ESMSUBPATH.)

### `@nodegx/project-contract` — the format

`format.js` is the in-memory path. It runs in a page. It exports `V2ProjectStore`, `memoryFiles`, `SchemaValidator`
and `validateSchema`, with the TypeScript types for every file and the JSON Schemas. `format-node.js` adds
`diskFiles(projectDir)` for a folder on disk.

```js
import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

const store = new V2ProjectStore(diskFiles('/path/to/a/copy/of/the/app'));
store.componentKeys();                       // every component
const { files, revision } = store.readComponent('Pages/Home');
files.nodes.nodes;                           // the flat node list
store.writeComponent('Pages/Home', changed, { ifRevision: revision });
```

The store refuses a write when the files changed since you read them (`ifRevision`). It writes nothing when nothing
changed. It keeps the registry true. Those are the rules the `nodegx` server writes by. Validate before you write,
with `validateSchema(schemaId, data)` for one file or `SchemaValidator` for all of them. The store doesn't validate for
you.

The published README of this package describes its side modules and never mentions the store. Until it's rewritten,
the `.d.ts` files and this page are the documentation. (P112-S16-CONTRACTREADME.)

### `@nodegx/node-spec` — what a logic node does

```js
import { specFor, specs } from '@nodegx/node-spec';
const spec = specFor('Counter');
spec.inputs;      // name → { type, default?, description? } or { type: 'signal' }
spec.outputs;     // the same shape
spec.needs;       // what the node needs from the world: 'clock', 'random', 'registry', …
```

Port names come from here, never from your memory of other tools. A Counter's limit is `limitsMax`, not `limit`. A
Number's output is `savedValue`. A Button's click is `onClick`. The suite below doesn't grade a port name. A wrong one
passes the suite and fails in the app. (OWN-011 §9, OWN-004 §6.2.)

Some ports depend on a node's parameters, such as a States node's `value-<state>` inputs. For those the spec has a
function that takes the parameters and returns the ports. A port that isn't in the spec at a given parameter setting
doesn't exist for that node.

**Most visual nodes have a spec too.** `specFor('Group')`, `'Text'`, `'Image'`, `'net.noodl.controls.button'` and
`'net.noodl.controls.textinput'` return full port lists, and `drawnPorts` works on them. For a type node-spec doesn't
know (`Page`, `CSS Definition`, `Component Inputs`, `Component Outputs`), read the runtime's `nodeLibrary` on the
preview below. A component instance's ports are the `ports` of its component's Component Inputs and Component
Outputs nodes, in that component's `nodes.json`. All three OWN-008 strangers worked this out the same way. A visual
spec also says which part of the layout each layout port sets. Don't draw the screen from what you think a Group or a
Text looks like. Show the real app, or draw it with the kit's drawer, which reads those layout roles (see "The screen:
show it or draw it"). (OWN-008, NSP-016, OWN-012.)

node-spec 0.1.0's browser entry (`dist/index.mjs`) imports `fast-xml-parser` by bare name, so a page with no bundler or
import map can't load it. Work out ports on your server, or bundle node-spec. (P112-OWN008-NODESPECBARE.)

A Function's ports come from its script: `functionScriptPortNames(script)` in `@nodegx/project-contract/function-ports.js`
gives the names, and its wires use them with `in-` and `out-` in front. (OWN-008, the table stranger.)

### `@nodegx/preview` — the real app beside your editor, and the real engine

The simplest Screen is the published preview in a frame. It watches the project folder and reloads the app when a file
changes. Every save your editor makes shows in the app a second later:

```
npx @nodegx/preview /path/to/the/app         # serves it on http://127.0.0.1:8575
```

Your editor may live in a page and want the app's live values. Then load the preview into the page instead. The
package ships two browser bundles under `node_modules/@nodegx/preview/dist/browser/`. The runtime they need is under
`dist/external/deploy/`. Serve those two folders. The first bundle defines `NodegxPreview`:

```js
const preview = await NodegxPreview.mountPreview(container, { runtimeBase: '/runtime/' });
await preview.update(files);                 // the project's files as path → text; the app rebuilds
preview.onTrace((batch) => { … });           // every value and signal the running app sends, by node id and port
preview.elementsOf(nodeId);                  // the elements a visual node draws, so a card can point at its screen
preview.nodeLibrary;                         // the runtime's node types with their ports, visual nodes included
```

What comes back, as the package's own types say (`src/inPage/index.ts` in the repository; the published bundle is
minified):

- `update(files)` resolves `{ status: 'ok', warnings, exportMs, frameMs }`, or a status that says why the app isn't
  on screen. The last good app stays up.
- A trace batch is `{ dictionary?, events }`. Each event is `{ seq, t, cause, fromNode, fromPort, toNode, toPort, value,
  kind }`, with `kind` `'value'` or `'signal'` and `value` a short preview. `dictionary` comes when the live nodes
  change: `nodes[id]` is `{ name, type, component }`, and `edges` lists the live wires. Node ids aren't scoped. The
  same id in two instances of one component is one id.
- `nodeLibrary` is `undefined` until the first `update`. Its `nodetypes` each carry `name`, `category` and `ports` (`{
  name, plug, type }`). To read it before you show the person's app, update once with a one-Group project.
  (P112-OWN008-LIBRARYFIRST.)
- `mountPreview` also takes `traceIntervalMs` (default 150) and `frameTimeoutMs` (default 20 000).

Three things the strangers hit (OWN-008). An outline set on what `elementsOf` returns is wiped when the app
re-renders. Draw your ring as an overlay positioned from `getBoundingClientRect`. The preview shows the app from its
start page, and there's no call to open another page or to mount one component. On an app with sign-in, that start
page is the sign-in page. The frame shares your editor's origin. The app and your editor share one `localStorage`.

The second bundle is `noodl-graph-target.js`. It defines `NodegxGraphTarget`. Each call of
`NodegxGraphTarget.graphTarget()` returns a fresh copy of the real engine with no screen. You mount a graph, set an
input, send a signal, settle a frame and read the trace. Use it when your editor wants to run a node or a graph without
the whole app. The suite's Logic half is graded on it.

### The screen: show it or draw it

NodeGX teaches both ways equally. Pick by where the screen has to go.

| | show the real app | draw it from the descriptions |
|---|---|---|
| what you get | the app itself: every node, every stylesheet, the backend | one box per visual node, in pixels. You paint them |
| where it can go | a frame in a web page | anywhere you can paint: a canvas, a texture on a 3D object, SVG, a native window |
| what it loads | about 3.6 MB of scripts (`@nodegx/preview` 0.2.2: the in-page bundle 1.70 MB, the engine 1.75 MB, React 0.14 MB) | 12.5 KB gzipped |
| runs the graph | yes | no. The values on the wires come from the running app's trace, or from the graph runner |
| how exact | it is the app | the same boxes as the app, except where a named limit says otherwise (below) |
| look | the app's own | yours. A node's colours and text are there to read. The boxes are what the drawer gives you |

Show the real app when the screen sits beside your editor and must be right. Draw it when it has to go where a frame
can't, or when the person wants the screen in their own look. For live values, keep the real app running out of sight
and draw from its trace. Orbit, the 3D editor the kit was built with, does both. Its phone is drawn from the
descriptions. The real app is one press away. (OWN-012.)

The drawer is `@nodegx/node-spec/draw`, in releases of `@nodegx/node-spec` after 0.1.0. 0.1.0 has no drawer. Run
`npm view @nodegx/node-spec version` first. Files and values go in. Boxes come out. It reads no CSS. Unlike the
package's main entry, it imports nothing by bare name, so a page with no bundler can load it:

```js
import { draw, canvasTextMeasurer, traceValue } from '@nodegx/node-spec/draw';

const values = {};                                        // node id → input port → value, from the app's trace
preview.onTrace(({ events }) => {
  for (const e of events) if (e.kind === 'value') (values[e.toNode] ??= {})[e.toPort] = traceValue(e.value);
});
const drawing = draw({
  nodes: components['/App'],                              // a component's parsed nodes.json
  components,                                             // every component by path, '/Pages/Home', for the ones it places
  values,
  viewport: { width: 390, height: 844 },
  measure: canvasTextMeasurer({ context: document.createElement('canvas').getContext('2d'), token: tokenValue }),
  token: tokenPx,                                         // a design token's value in px, or undefined
  pageOf: (router, path) => pageTheAppShows,              // optional: which page a Router shows (default: its start page)
  bodyScroll: project.settings?.bodyScroll === true       // the project's Body Scroll setting
});
drawing.boxes;  // { id, path, type, parent, x, y, width, height, present, needs, limits, outside }
```

A component placed twice gives two boxes. `path` tells them apart (`header/title`). Start the design tokens from
`DEFAULT_TOKENS` in `@nodegx/project-contract/tokens.js`, then lay the project's own over them. On the format-4 todo
template the project's own are `metadata.designTokens.customTokens` in `nodegx.project.json`. You write the two token
functions. `tokenValue(name)` returns a token's stored value. `tokenPx(name)` returns it in px, or `undefined` when it
isn't in px.

What to know before you draw:

- A drawing can't run the graph. A text whose words come down a wire shows what its file stores, often nothing, until
  something gives the drawer the wire's value. A drawing from the trace draws what the app had, one trace batch (150 ms) ago. To compare a drawing with the
  app, pause the app first. A moving screen read one batch apart looked like a 3 px error that changed sign. (OWN-012
  s1.)
- Every box carries `needs`, the things the drawer assumed. It assumes the root fills the window. It gives a text
  with no Font Family the browser's font. A box's `limits` are the settings it couldn't honour. `drawing.needs`
  holds the assumptions for the whole screen. Show them to the person. A drawing that hides them reads as the app.
- The named limits, measured (OWN-012 s1–s3):
  - Text that wraps is drawn on one line. A three-line paragraph came out 34 px short. Everything under it moved up
    by that much.
  - A stylesheet rule (`cssClassName`, a CSS Definition node) is invisible to the drawer.
  - A canvas can't measure tabular numerals. A clock came out 9 to 10 px narrow.
  - A box the browser won't shrink below its content (flexbox's automatic minimum) is drawn shrunk.
  - A For Each draws no rows, because the drawer has no items for it.
- Everything else came within 2 px of the real app, most of it at 0 px: Orbit's nine boxes at three screen sizes, the
  todo template's sign-in page, and 316 recorded layout fixtures.
- Check your drawing the way it was checked. Read each real element's box with
  `preview.elementsOf(id)[0].getBoundingClientRect()` and compare it with the drawn one, allowing 2 px. Give every
  difference a reason. The reason is a limit above, or a box that moved because the one before it moved. A difference
  with no reason is a bug. Report it.

### `@nodegx/canvas-look` — the look, as data

This package is optional. It holds the NodeGX canvas colours, card sizes, wire colours and fonts, in both themes.
They're generated from the editor's own source, which is why they don't drift:

```js
import { look, nodeScheme, wireColors } from '@nodegx/canvas-look';
nodeScheme('visual').base;  wireColors('signal', 'light').normal;  look.card.size;
```

If the person wants their own look, don't load it. If they want it to look like NodeGX, read it and draw nothing from
memory. In the NodeGX canvas, wires are drawn under the cards. A card shows a port row only for a port that's wired.
(OWN-005, OWN-007 §3.)

## Done means PASS

Your editor is right when the editor suite says PASS. The suite opens a project in your editor. It applies a script of
edits one at a time through your editor's own code, the path a person's click goes through, not a shortcut. It takes
what your editor saved and compares that with the same edits applied through the kit's store. Then the schema
validator reads every saved file.

### The adapter

You write one small module. It exports an object, or a function returning one, with three methods:

```js
import { referenceAdapter } from '@nodegx/project-contract/editor-suite.js';

export default function () {
  return {
    name: 'my editor',
    open(files) { /* path → text: load the project into your editor */ },
    apply(edit) { /* perform one edit the way a person would; for add_node return { id } with the id you minted */ },
    save() { /* return every file your editor would write, path → text */ }
  };
}
```

There are eight edits, each a JSON object naming its `component`: `add_node`, `remove_node`, `connect`,
`disconnect`, `set_parameter`, `move`, `rename` and `add_child`. `EDIT_KINDS` and the `Edit` type in `editor-suite.js`
spell out their fields. `applyEdit` is the reference semantics, if you want to read what each one means.

Two optional methods grade the Logic half. `graphTarget()` returns a fresh engine each call, either what
`NodegxGraphTarget.graphTarget()` returns or a runner of your own. `playGraph(scenario, file)` is for an editor whose
runner lives in a page: it plays one scenario itself and returns the trace. Offer one or the other. An adapter with no
runner is graded on files only. From the next release of `@nodegx/project-contract`, the PASS line says so (`; files
only: the adapter offers no graph runner`). 0.1.0 prints a bare PASS. Say "files only" in your report yourself.
(P112-OWN008-FILESONLY.)

Have your adapter call the same code your page's buttons call, and save through the same function your Save button
uses. All three OWN-008 strangers did. A second control that breaks your editor's own code is worth one run. The
blocks stranger made its "put inside" ignore the index. The suite named the out-of-order `children`.

### The command

```
node node_modules/@nodegx/project-contract/editor-suite-node.js  my-adapter.mjs  /path/to/a/project  edits.json
```

It prints `PASS — my editor on <project> (52 ms)` and exits 0. Or it prints `FAIL` with the first ten differences and
exits 1. Each difference is one sentence naming the file, the node and the field:

```
node "7de3c0e2-…" in components/Pages/Home/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.
```

The kit ships no example project or edit script, so write `edits.json` yourself: every kind at least once, over a copy
of the person's app. (P112-OWN007-NOFIXTURES.) The comparison matches your minted ids to the reference's through what
`apply` returned. It ignores `x` and `y` except on nodes the script moved or placed. It ignores timestamps. It compares
everything else. A file your editor writes that the kit's store wouldn't write is a difference.

### Prove the suite can fail

Before you trust a PASS, break one thing on purpose. Write a number as a string on the way out, and run again. If it
still says PASS, your adapter isn't going through your editor. This control was run on 0.1.0 from the registry and
read one difference, the sentence quoted above. (OWN-006 AC1, OWN-007 §6.)

### More checks

- `validateStructure(files)` in `editor-suite.js` checks a whole folder of files the way the suite does, schemas and
  tree. It's the quickest check after a save from your page. (OWN-008, the blocks stranger.)
- `validate_project` through the `nodegx` server, on the saved copy, reports 0 errors. Its warnings are the
  editor's own rules, which the kit's validator doesn't run. A raw hex colour where a design token belongs is one.
  The server's `get_style_vocabulary` lists the tokens that exist. (OWN-008.)
- Drive your editor's page as a person would, in the Chrome that's already installed, headless, over the DevTools
  protocol. The `nodegx` server's `drive_page` drives the app, not your editor. Installing `puppeteer` downloads a
  second browser of about 600 MB into the person's home folder. If you want Puppeteer, use `puppeteer-core` with the
  installed Chrome. (OWN-008, the blocks stranger.)
- The official NodeGX editor opens the saved copy with no new diagnostics. If the person has it installed, ask them
  to open it.

## What the editors before yours got wrong

Each line cost someone a wrong app or a false claim. The reason is in the sentence.

**On the files**

- Work on a copy. An editor built in a stranger round edited the app it was told not to touch. Then it said the files
  matched "byte for byte". Two didn't. Copy the folder first. Diff before you claim. (OWN-017 s16.)
- Send the revision back. The same editor read each component's `revision` and never passed it to `writeComponent`.
  A save made after the person's agent or the NodeGX editor changed the file would have overwritten them silently.
  Pass `ifRevision`. Show the refusal when it comes. (OWN-017 s16.)
- Never replace the project's `id`. It's the key the backend knows the app by. The NodeGX editor did this once on
  open. A project written by the `nodegx` server came back with a stranger's id. (P112-S11-IDREPLACE, R16.)
- Opening is reading. An open that writes anything into the project is a defect. The NodeGX editor had two such
  writes. Both were bugs. Your editor writes when a person changes something. (P112-S11-OPENWRITES,
  P112-S11-PAGEPORTS.)
- Return the id you mint. The suite finds the node you added by the id `apply` returned. It names that id in every
  later edit. Without it the next edit names a node your editor doesn't have. The run fails before a single file is
  compared. (P112-S6-SUITEIDS.)
- Keep a position you find, and write none for a child you add. Files the `nodegx` server wrote carry `x` and `y`
  on children too (all 389 children in the todo template do). The suite ignores a child's position unless the script
  moved it. If your editor lays out children from the tree, leave their `x` and `y` alone. (OWN-006 §6.2, OWN-008.)
- A visual node with no parent that isn't in the component's `visualRoots` is never drawn. `add_node` without a
  parent makes one. `validate_project` warns about it. Give a new visual node a parent. (OWN-008, the map
  stranger.)
- Write the format version you read, and never change it. Many apps are still format `4`, the todo template among
  them. A NodeGX editor older than 0.4.0 refuses a `5`. That's the editor's age, not your fault.
  (P112-S11-FORMATSKEW.)
- Write the run-on-value-change boxes of your nodes as ticked in a format-4 project. The `nodegx` server does the
  same. The NodeGX editor upgrades a format-4 project to 5 when it opens it. The upgrade writes `false` on each value
  input with no `runOnChange-<input>` key, on every node whose Run is wired. The input the person just wired then
  stops running the node. `format.js` exports the server's own rule (P109 ISL-018). When
  `projectWillBeCleanedUp(project.version)` is true, pass the store's `writeComponent`
  `prepare: (stored) => pinAuthoredRunOnChange(key, files, stored ?? null)`. `stored` is the component as it was
  before your edit. The suite's reference does the same, so an editor that writes no key fails on a format-4
  project. Don't use `pinRunOnValueChangeDefaults`. It isn't for user projects. (P112-OWN008-FORMAT4PIN.)
- The server and the preview read differently. The `nodegx` server reads `nodes.json` flat. The preview walks
  `children`. A child listed twice passes the first and breaks the second. Run the preview on your saved files, not
  only the validator. (P112-OWN019-TWOLOADERS.)
- A cloud function is deployed, not saved. A change to a component under `/#__cloud__/` isn't heard by the app until
  `deploy_cloud_functions` runs. Your editor has no deploy. Say so in the editor, and let the person ask their agent.
  (OWN-017 s16, P112-S14-UNDEPLOYED.)

**On running the graph**

- The engine has one world per graph. The clock, the registry, storage and the random stream are shared by every
  node in the app. A runner that gives each node its own world breaks every store and every signal between them. Use
  the kit's engine. (OWN-000 §6, OWN-003 §6.1.)
- Use a fresh engine per scenario. An engine that has played a scenario before answers ten of the eighty-five
  differently. Nine of them minted an id from the world's random stream. One kept a popup's state. The suite calls
  `graphTarget()` once per scenario on purpose. (P112-S8-SHAREDTARGET.)
- A new wire hands the receiver the source's current value at once, before anything changes. A runner that waits for
  the next change is wrong. (NEEDS.md row 6, contract C11.)
- Frames go one at a time. A runner that settles two frames in one step reads red on the suite's own control. Don't
  batch. (OWN-003 §6.1.)
- A page ignores a global set by assignment. `globalThis.localStorage = {}` did nothing in a page. The real session
  store then read the page's storage, which outlives a play. Install by property descriptor. (P112-S8-SESSIONLEAK.)
- The engine found a bug the hand-written runner hid. In a wave-at-a-time runner the Orbit timer worked. In the real
  engine a Skip ended the phase, because one output reached a node before another did. The order the real engine
  sends values in is the app's behaviour. Grade on the real engine. (OWN-004 §6.2.)
- A number wired into a child's `width` inside a row is a share, not a percent. The runtime's layout does that by
  design. An editor that exposes layout should know it. (OWN-004 §6.2, FLD-004.)

**On the screen and the canvas**

- Moving a card is a write, not a rebuild. Write the new position into the files. Don't rebuild the app for it.
  (OWN-004 §6.)
- A camera's first animation-frame timestamp can be earlier than the time you recorded when you started it. Measure
  elapsed time from the first frame's own timestamp. (The Orbit prototype, OWN-007 §3.)
- On a NodeGX card only wired ports show as rows. Wires are drawn under the cards. If the person wants it to look like
  NodeGX, that's the look. (OWN-005.)

## What your editor must not do

- Write into the person's project without a copy first.
- Claim a node does something its spec or the runtime's notes don't say.
- Show a drawn screen as if it were the app. Say it's drawn, and show what it assumed.
- Claim files are unchanged without diffing them.
- Skip the suite's graph half silently. An adapter with a runner and no grader isn't a pass. The command grades it
  for you.

## When you're done

Write a short report for the people who made the kit. Say how long it took. List every question this page and the kit
didn't answer, where you had to guess. Paste the suite's output. Open an issue on `The-Low-Code-Foundation/NodeGX`
with it. Every guess becomes a sentence on this page or a fix in a package.
