---
title: Writing your own nodes
sidebar_position: 4
---

*Describes NodeGX 0.1.7.*

If you came here from Noodl's `create-react-lib` guide and gave up, read this paragraph and then
decide whether to keep going.

That guide asked you to install an SDK, configure webpack, and build a bundle. The bundle it
produced contained **a second copy of React**. Two copies of React means two internal hook
dispatchers, which means `Invalid hook call` the moment your component used a hook — and you could
not fix it from inside your project, because the second copy was baked into the artefact the
toolchain told you to build. A lot of people spent a weekend on that and concluded custom components
were out of reach.

They are not, and there is no toolchain. A custom node in NodeGX is **one hand-written `.js` file in
a folder in your project**. No SDK, no bundler, no `npm install`, no build step. What follows is the
whole mechanism.

:::note Two kinds of node, and both are covered
Most of this page describes **visual** nodes — the ones that draw something. NodeGX also has a
non-visual half: **logic nodes**, which take values in, do something, and send values out without
rendering anything. They are covered in [Logic nodes](#logic-nodes-no-react-no-dom) near the end.

Everything on this page has been run end to end. Where something is known not to work, it is named
in [The rough edges](#the-rough-edges) rather than left for you to discover.
:::

## The smallest node that works

This is a complete, working custom node. Save it as `noodl_modules/my-kit/index.js` in your project,
alongside a `manifest.json`, and it appears in the node picker.

```js title="noodl_modules/my-kit/index.js"
(function () {
  var h = React.createElement;

  var Badge = {
    name: 'my-kit.Badge',
    displayNodeName: 'Badge',
    noodlNodeAsProp: true,

    getReactComponent: function () {
      return function BadgeComponent(props) {
        var el = React.useRef(null);
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);

        return h('div', { ref: el, style: props.style }, props.label);
      };
    },

    defaultCss: { display: 'inline-flex' },

    inputProps: {
      label: { type: 'string', displayName: 'Label', group: 'Content', default: 'New' }
    }
  };

  Noodl.defineModule({ reactNodes: [Badge] });
})();
```

Twenty-eight lines, and the only one that describes what the node *shows* is the port. That is the
thesis of this page, so everything below is an elaboration of it rather than a prerequisite for it.

The `manifest.json` beside it is four lines:

```json title="noodl_modules/my-kit/manifest.json"
{
  "name": "My Kit",
  "main": "index.js"
}
```

Two details in that file are load-bearing and easy to skip:

- **`noodlNodeAsProp: true` plus the `setDOMElement` handoff.** This is what lets the editor
  highlight your node on the canvas and what the shared bounding-box outputs measure. It is written
  as a hook deliberately: if the page ever did have a second React, that line throws loudly instead
  of misbehaving quietly.
- **`name` must be unique across the whole project.** Prefixing it with your kit's folder name
  (`my-kit.Badge`) is the convention, and it is what makes the node picker able to group your nodes
  under your kit's name.
- **`React` bare, never `window.React`.** The runtime installs React as a global, so there is
  nothing to unpack — and the two are not interchangeable. A project deployed with SSR or SSG
  renders your node in Node first, where there is no `window`: a kit that opens with
  `var React = window.React;` throws at import, is missing from the server-rendered HTML, and then
  appears when the browser hydrates. That is a hydration mismatch, and it is silent unless you go
  looking. Kits already written against `window` still load — the server render puts a shim carrying
  `React` alone in front of them — but nothing else is on that shim, so `document` and the rest of
  the browser stay absent by design.

## Why it works, when the old path did not

The runtime loads React from a plain `<script>` tag **before** any module script runs, and publishes
it as a global. Your file reads that global by name, which works in a browser and on a server
render alike. There is exactly one React on the page because there is exactly one script tag that
installs one.

The part that makes this robust is on our side of the line. React 18 shipped ready-made UMD builds
for exactly this pattern; React 19 removed them. So NodeGX builds its own global React bundles from
the npm packages, and the build aliases `react-dom`'s internal `require('react')` to the
`window.React` that the React script tag has already installed
(`packages/noodl-viewer-react/scripts/build-react-globals.js`). That alias is the whole difference
between this page and the old guide: it is the reason a second dispatcher cannot exist.

To be precise about the credit — `Noodl.defineModule({ reactNodes })` is **inherited from Noodl, not
invented here**. What is ours is keeping that contract alive across React 19's removal of the UMD
builds, which is a smaller claim and a truer one.

Your node goes through `createNodeFromReactComponent`, the same bridge every built-in visual node in
NodeGX goes through. This is not a plugin sidecar with a reduced feature set; there is no capability
a built-in node has that yours cannot reach.

### Both React versions, one file

The runtime vendors two React pairs under **identical filenames**: React 18.3.1 at the runtime folder
root, and React 19.0.0 under `react19/`. A project opts in with `runtimeVersion: 'react19'`, and the
only thing that changes is which directory is copied
(`packages/noodl-editor/src/editor/src/utils/compilation/build/deploy-index.ts`).

Because the filenames are identical, **your kit runs on both with nothing to recompile.** You are
writing against the global React, not against a version.

:::info Which one am I on?
Projects **created** in current NodeGX are set to `runtimeVersion: 'react19'`. Projects that predate
the opt-in carry no `runtimeVersion` at all and run the 18.3.1 pair — the field is deliberately not
auto-defaulted, so an old project's behaviour never changes underneath it. One wart worth knowing
before it confuses you: the legacy value in the type is spelled `'react17'`, but the files it selects
are React **18.3.1**.
:::

## Ports are the product

This is the rule the rest of this page is organised around, and it is the one thing that separates a
node people can build with from a node only you can use:

> **Every decision someone building an app should be able to make is a port. JavaScript is the
> escape hatch, not the place decisions live.**

Colour, spacing, radius, font size — and the one almost everybody gets wrong, **every threshold**.

The test is simple: if you can imagine wanting to change it from the graph, it was a decision, and it
belongs on a port. If it is what makes the node a box at all — `display: flex`, `flexDirection` — it
is structure, and it belongs in `defaultCss`.

:::caution `defaultCss` is an inline style
`defaultCss` and `inputCss` reach your root as `props.style`, an **inline style**. Inline beats any
rule in your kit's own stylesheet, so set a property in one place, never in both: a `display: grid`
in your `.world` class loses, silently, to a `display: block` in `defaultCss`, and every cell of the
grid draws at zero size. The same object is applied in the editor canvas, on a deployed page and in
an exported app, so what you put there is what draws everywhere.
:::

Here is the same idea as code. This node does **not** decide when something counts as over budget:

```js title="the threshold is not in here"
// Wrong — the rule is trapped in the file.
color: props.amount > 5000 ? 'red' : 'black'

// Right — the graph decided, and sent the answer in.
color: props.overBudget ? props.alertColor : props.textColor
```

`overBudget` arrives from a stock `Expression` node. Now the threshold is visible on the canvas, and
changing it does not mean opening a JavaScript file.

### Where a port goes

There are three places, and picking the wrong one is the most common early mistake:

| Declare it in | For | Reaches your component as |
|---|---|---|
| `inputProps` | values your component draws with — inner text colour, a label, a count | `props.<name>` |
| `inputCss` | styles on **this node's own outer box** — background, padding, border | `props.style`, applied for you |
| `outputProps` | signals and values your node sends back to the graph | a function on `props.<name>` |

`inputCss` only ever styles the node's own element. A colour for text *inside* your component has to
be an `inputProps` entry, because your component is what draws that text.

### Default to design tokens, not to hex

Give colour and spacing ports a design token as their default:

```js title="port defaults"
inputCss: {
  backgroundColor: { type: 'color', displayName: 'Background', group: 'Style', default: 'var(--surface-raised)' },
  padding: {
    type: { name: 'number', units: ['px'], defaultUnit: 'px' },
    displayName: 'Padding',
    group: 'Style',
    default: 'var(--space-4)'
  }
}
```

A node whose defaults are tokens inherits the project's design system instead of fighting it: change
a token once and every node follows. Nothing *enforces* this — brand colours and data-visualisation
palettes are legitimate reasons to hardcode — but tokens are what the scaffold emits and what you
should reach for first. The one exception is a colour your component hands to anything that is not CSS — a
canvas, WebGL, a library's theme object. `var(--surface-raised)` means nothing there, so look the colour
up first ([how](#a-theme-colour-has-to-be-looked-up-before-a-library-can-use-it)); the port's default
stays a token.

One thing to know if you hardcode anyway: a `color`-typed port carries no units, so a `var(--token)`
string passes straight through. A **units-typed** port (like `padding` above) is a different path,
and it is one the runtime had to be taught explicitly.

### A size port hands your component a string

An `inputProps` port with units does not give your component a number. A wired 40 and a typed 40
both arrive as `"40px"`, and a token default arrives as `"var(--space-4)"`. The `{ value, unit }`
object you may have seen is what the port's setter receives; your component never sees it.

Passing the prop straight into `style` needs nothing more, because the string is already valid CSS.
Arithmetic does: `Number("40px")` is `NaN`, so a node that reads a size that way draws its fallback
whatever was wired. Read the magnitude with `readPx`, which the scaffold writes into your `index.js`:

```js title="reading a size"
var size = readPx(props.size); // "40px" reads 40
if (size === undefined) size = 64; // a token, a percentage, or nothing set: your call
```

`readPx` reads only `"<number>px"`. Everything else reads `undefined`, so your node decides what an
unreadable size means instead of guessing.

### A signal port hands your component a count

A prop cannot hold an event, so a signal declared in `inputProps` arrives as a number. It starts at
`0` and goes up by one each time the signal fires, and your node re-renders. Wire a Button's
**Click** into it and react when the number changes:

```js title="noodl_modules/burst-kit/index.js"
// @ts-check
(function () {
  var h = React.createElement;

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Burst = {
    name: 'burst-kit.Burst',
    displayNodeName: 'Burst',
    noodlNodeAsProp: true,

    getReactComponent: function () {
      return function BurstComponent(props) {
        var el = React.useRef(null);
        var shown = React.useState(false);
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);

        React.useEffect(function () {
          if (!props.play) return; // 0: the signal has not fired yet
          shown[1](true);
          var timer = setTimeout(function () { shown[1](false); }, 600);
          return function () { clearTimeout(timer); };
        }, [props.play]);

        return h('div', { ref: el, style: props.style }, shown[0] ? 'Boom' : '');
      };
    },

    inputProps: {
      play: { type: 'signal', displayName: 'Play', group: 'Actions' }
    }
  };

  Noodl.defineModule({ reactNodes: [Burst] });
})();
```

A signal fires on a change from off to on, so two pulses sent in the same frame can count as one.
If your node needs to run code as well as re-render, a `valueChangedToTrue` on the same port still
runs, just after the count goes up.

### Sizing a kit node: put it in a Group

A kit node has no Width or Height inputs. The **Width** and **Height** it shows are outputs: the size
it ended up after layout. To give it a size a person can set in the property panel, place it inside a
Group, size the Group, and have your component fill it (`width: '100%'`, `height: '100%'` on its root
element). The Group's Width and Height take `px`, `%`, `vw` and `vh`, like any other Group's.

If a number decides the size, such as a count of rows, declare a size port in `inputProps` instead
and read it with `readPx`, as above.

## What you get without asking

Every visual kit node inherits a set of ports from the bridge. You do not declare any of these:

| Port | Direction | What it is |
|---|---|---|
| **Width**, **Height** | output | the size this element *actually* ended up after layout, in pixels |
| **Screen Position X / Y** | output | distance from the window's left/top edge to this element's edge |
| **Did Mount** | output (signal) | fires once the element is on the page and can be measured |
| **Will Unmount** | output (signal) | fires just before removal, while the element still exists |
| **This** | output | a reference to the node itself, for ports that take a node rather than a value |

Two defaults come with it, both `true` unless you say otherwise:

- **`allowChildren`** — your node can contain other visual nodes.
- **`useVariants`** — your node participates in style variants and visual states.

The bounding-box outputs are observed lazily: the observer is attached when something connects to
one and detached when the last connection goes, so declaring them costs nothing until used.

For scale: the kit scaffold's example node declares **15** ports and shows up in the editor with
**28**.

## A worked example: the cashflow kit

A one-node example can show you the mechanism but it cannot show you the rule, because with one node
there is nothing to compose and no decision big enough to misplace. The cashflow kit is the example
that can.

It is five visual nodes — a lane, a draggable pill, a balance strip, a day axis and a safety banner —
that together make an interactive cashflow timeline. What makes it worth reading is the division of
labour:

- **The JavaScript does two things a node graph genuinely cannot**: measure the DOM, and follow a
  pointer at frame rate. That is it.
- **Everything else is a port.** Roughly sixty of them. Thresholds, colours, radii, snap steps, date
  formats, currency symbols, decimal places.
- **The running-balance rule — the actual business logic — lives in a stock `Function` node in the
  graph**, not in the kit. The kit draws balances; it does not decide them.
- **It composes with built-ins**: `Static Data` and `For Each` supply the rows, `Object` and `Set
  Object Properties` carry the edits, `Array Changed` triggers the recalculation.

The pill node is the clearest single illustration. It handles pointer drag at frame rate and snaps to
a day — genuinely imperative work — and then hands the result back to the graph as a `Day (dropped)`
output. It does not write anything anywhere. What the drop *means* is the graph's business.

Its colours are ports whose defaults are tokens:

```js title="cashflow-kit/index.js — the pill's style ports"
positiveColor: { type: 'color', displayName: 'Positive Color', group: 'Style', default: 'var(--green-600)' },
negativeColor: { type: 'color', displayName: 'Negative Color', group: 'Style', default: 'var(--red-600)' },
textColor: { type: 'color', displayName: 'Text Color', group: 'Style', default: 'var(--primary-foreground)' }
```

and the component reads them plainly:

```js title="no second copy of the decision"
background: positive ? props.positiveColor : props.negativeColor,
color: props.textColor,
```

That last snippet used to read `props.positiveColor || '#1F8A4C'`. The fallback looked harmless and
was not: a declared `default` is assigned to props when the node initialises, so the `||` arm was a
**second copy of the same decision**, sitting in the JavaScript, free to drift from the port it
shadowed. If you find yourself writing a fallback next to a port that already has a `default`, the
port is the answer and the fallback is a future bug.

:::tip Status colours
NodeGX's semantic token set has `--destructive` but no `--success` or `--warning`. A kit with
three status bands is better off reading all three from the palette scale — `--green-600`,
`--amber-600`, `--red-600` — so they stay one system, rather than mixing one semantic token with two
palette ones.
:::

## Ports that appear only when they are relevant

A node with a fixed port list is a widget. A node whose ports depend on its own settings is a
building block. Declare a **conditional port group** and the editor shows or hides those ports as
the condition changes:

```js title="a port that appears only in list mode"
var Panel = {
  name: 'mykit.Panel',

  inputProps: {
    mode: {
      type: { name: 'enum', enums: [{ label: 'List', value: 'list' }, { label: 'Grid', value: 'grid' }] },
      displayName: 'Mode',
      group: 'Layout',
      default: 'list'
    },
    itemCount: { type: 'number', displayName: 'Item Count', group: 'Layout', default: 3 }
  },

  // `condition` is read by the editor. `inputs` names ports you declared above.
  dynamicports: [{ condition: 'mode = list', inputs: ['itemCount'] }]
};
```

`Item Count` now appears when **Mode** is *List* and disappears when it is *Grid*, reversibly. It is
a real port throughout: connectable through the connection popup, saved to the project, and it
carries its value at runtime.

:::caution `channelPort` is refused, and the editor will tell you
`dynamicports` inherits a second form from Noodl — `channelPort` — that this build **does not
implement**. The ports it names appear nowhere: not in the property panel, not in the Ports tab, not
in the connection popup, and not at runtime. Rather than let them vanish silently, a kit declaring
one is reported with an error naming the kit, the node and the mechanism. Use a conditional group
like the one above instead; it works end to end.
:::

## Telling people what your node is for

Two fields, and they are not interchangeable:

```js title="both are optional, and both are read"
var Chip = {
  name: 'mykit.Chip',

  // Prose. One sentence. This is the node's help text in the property panel, and
  // it is what the AI assistant and an MCP agent are told the node does.
  docs: 'Shows a short status label with a coloured background.',

  // A link, if your kit has a page. Rendered as "read more", not as the help text.
  docsUrl: 'https://example.com/docs/mykit/chip'
};
```

Write `docs` even if you write nothing else. Without it your node reaches the property panel — and
every agent authoring against your project — with a name and no statement of what it is for.

:::tip
Do not put a URL in `docs`. On NodeGX's own built-in nodes that field happens to hold a
documentation link, which is why the two are separate here: your sentence is rendered as text, and
putting a URL there produces a paragraph that reads like a broken link rather than a working one.
:::

## Logic nodes: no React, no DOM

A kit does not have to draw anything. Put definitions in `nodes` instead of `reactNodes` and you get
a node that takes values in, does something, and sends values out:

```js title="noodl_modules/tally-kit/index.js"
/** @type {import('./types/nodegx-node-kit').LogicNodeDefinition} */
var Accumulator = {
  name: 'tally.kit.Accumulator',
  category: 'Math',
  displayNodeName: 'Tally Accumulator',
  docs: 'Adds Step to a running total each time Add fires.',

  initialize: function () {
    this._internal.total = 0;
  },

  inputs: {
    step: { type: 'number', displayName: 'Step', default: 1, set: function (v) { this._internal.step = Number(v); } },
    add: {
      type: 'signal',
      displayName: 'Add',
      valueChangedToTrue: function () {
        this._internal.total += this._internal.step;
        // Tell the graph the output changed. Without this nothing downstream runs.
        this.flagOutputDirty('total');
      }
    }
  },

  outputs: {
    total: { type: 'number', displayName: 'Total', getter: function () { return this._internal.total; } }
  }
};

Noodl.defineModule({ nodes: [Accumulator] });
```

This is measured, not assumed: a built-in node's signal reaches a kit logic node's signal input, the
node holds state across the call and publishes through `flagOutputDirty`, and a kit node's own
`sendSignalOnOutput` reaches **another kit node's** signal input — so kit-to-kit signal edges work.

:::caution `runOnValueChange` declares ports; it does not wire them
If you declare `runOnValueChange`, the runtime synthesises a `Run On Change` checkbox per named
input for you. It does **not** make your setters respect it. Each governed input's own `set` has to
ask first:

```js
set: function (value) {
  this._internal.reading = Number(value);
  if (!this.shouldRunOnValueChange('reading')) return;
  this.doTheWork();
}
```

Forget it and the checkbox is drawn, is togglable, and changes nothing. The first kit written against
these types got this wrong.
:::

## Wrapping a library

Most of what a kit is for is a library someone else wrote: a block editor, a chart, a map, a 3D
scene. Such a library wants a DOM element of its own, it brings its own stylesheet, and it wants
colours it can do arithmetic on. Each of those goes wrong the first time, in a way you notice before
you understand it.

### Edits vanish when the page re-renders

**What you notice:** a person types or drags something in your node, something else on the page
changes, and what they did is gone.

The library owns the element it draws into, and React re-renders your component whenever any prop
changes: a colour, a size, the parent. If every render hands the graph's value to the library, a
render that still carries the graph's *old* value puts it back over the person's edit. Your node's own
output, wired back into its input, does the same a moment later.

The rule: make the library once, into an element React never renders into, and keep it in a ref.
Load a value into it only when the graph sends a new value, and never your own output coming back.

```js title="noodl_modules/note-kit/index.js"
// @ts-check
(function () {
  var h = React.createElement;

  // Stands in for any library that owns its own DOM: a code editor, a map, a block editor.
  function createEditor(host, onEdit) {
    var area = document.createElement('textarea');
    area.addEventListener('input', function () { onEdit(area.value); });
    host.appendChild(area);
    return {
      load: function (text) { area.value = text; },
      destroy: function () { host.removeChild(area); }
    };
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Note = {
    name: 'note-kit.Note',
    displayNodeName: 'Note',

    getReactComponent: function () {
      return function NoteComponent(props) {
        var host = React.useRef(null);
        var editor = React.useRef(null);
        var seen = React.useRef({ incoming: undefined, emitted: undefined });
        var onChange = React.useRef(props.onChange);
        onChange.current = props.onChange;

        // Made once, into an element React never renders into: no re-render can replace it.
        React.useEffect(function () {
          editor.current = createEditor(host.current, function (text) {
            seen.current.emitted = text;
            if (onChange.current) onChange.current(text);
          });
          return function () { editor.current.destroy(); };
        }, []);

        // Load only a NEW value from the graph, and never the node's own text coming back.
        React.useEffect(function () {
          var text = props.text || '';
          if (!editor.current || text === seen.current.incoming) return;
          seen.current.incoming = text;
          if (text !== seen.current.emitted) editor.current.load(text);
        });

        return h('div', { ref: host, style: props.style });
      };
    },

    inputProps: {
      text: { type: 'string', displayName: 'Text', group: 'Content' }
    },
    outputProps: {
      onChange: { type: 'string', displayName: 'Text Changed', group: 'Content' }
    }
  };

  Noodl.defineModule({ reactNodes: [Note] });
})();
```

`seen` holds the two things the rule needs: the last value the graph sent (`incoming`) and the last
text the node sent (`emitted`). A render whose graph value has not changed loads nothing, whatever
else changed; a value equal to what the node just sent is its own echo and loads nothing either.

### The library's CSS reaches the whole page

**What you notice:** buttons or text elsewhere in the app change their look when your node is on
the page.

Many libraries inject a global stylesheet, and a rule you write to restyle the library is just as
global unless you scope it. It reaches the whole page your node is on, other kits' nodes included.
It does not reach the editor: the canvas draws your app in a document of its own, apart from the
editor's panels. Put every rule of your own under a class on your node's root (`.note-kit .toolbar`,
never `.toolbar`), and when you test, look at an element *outside* your node, because a check inside
it only reads your own rules.

### A theme colour has to be looked up before a library can use it

**What you notice:** the library draws in its fallback colour, often black or grey, while the port
says `var(--primary)`.

Default colour ports to a token, as above; that does not change. But a colour handed to anything
that is not CSS (a canvas, WebGL, a chart's palette, a library's theme object) has to be the colour
itself, because `var(--primary)` means nothing outside a stylesheet. Look it up on your own element:

```js title="a token, looked up for a library"
function colourOf(value, el) {
  var probe = document.createElement('span');
  probe.style.color = value; // a token, a hex, a name: anything CSS accepts
  el.appendChild(probe);
  var rgb = getComputedStyle(probe).color; // e.g. "rgb(37, 99, 235)"
  el.removeChild(probe);
  return rgb;
}
```

Call it in an effect, once your element is on the page: a token has a value only there. The port's
value does not change when the theme does (it is still `var(--primary)`), so look it up each time you
hand colours to the library rather than once. A value CSS cannot read comes back as the colour the
element inherits, not as an error.

### A library ships only as modern modules

**What you notice:** the library's guide says `import * as THREE from 'three'`. You list its file in
`manifest.dependencies`. The page logs *Cannot use import statement outside a module*. Your node
draws nothing.

NodeGX loads each file in `dependencies` as a plain script, one after another, before your kit's own
file. A file written with `import` and `export` cannot load that way. Many libraries now publish
only files like that, three.js among them.

Turn the library into one plain script, once, on your own machine. The tool for it is esbuild:

1. In an empty folder, run `npm install three esbuild`.
2. Write an entry file that imports what your kit needs and puts it on one global name:

```js title="entry.js"
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
window.THREE = Object.assign({}, T, { OrbitControls });
```

3. Bundle it into your kit's folder:

```bash
npx esbuild entry.js --bundle --format=iife --minify --outfile=noodl_modules/cube-kit/three.bundle.js
```

4. List the result in `manifest.json`: `"dependencies": ["three.bundle.js"]`.

Run step 3 again when you move to a new version of the library. Three.js with its camera controls
comes out at about 760 KB. Most kits in the NodeGX library ship their libraries this way already.

**Read the global when your node mounts, not when your file loads.** An AI agent working on the
project reads your kit by loading your own file alone, without its dependencies. A server render has
no page to draw into. In both, `THREE` is not there yet when your file runs. A line like
`var THREE = window.THREE` at the top leaves it undefined for good. Look it up inside an effect:

```js title="noodl_modules/cube-kit/index.js"
// @ts-check
(function () {
  var h = React.createElement;

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Cube = {
    name: 'cube-kit.Cube',
    displayNodeName: 'Cube',

    getReactComponent: function () {
      return function CubeComponent(props) {
        var host = React.useRef(null);

        React.useEffect(function () {
          // Here, not at the top of the file: the dependency has loaded by the time a node mounts.
          var THREE = /** @type {any} */ (window).THREE;
          var el = /** @type {HTMLElement} */ (host.current);
          var renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(el.clientWidth || 300, el.clientHeight || 300);
          el.appendChild(renderer.domElement);

          var scene = new THREE.Scene();
          var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
          camera.position.set(2, 2, 3);
          var controls = new THREE.OrbitControls(camera, renderer.domElement);
          scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()));

          var frame = 0;
          function draw() {
            controls.update();
            renderer.render(scene, camera);
            frame = requestAnimationFrame(draw);
          }
          draw();

          return function () {
            cancelAnimationFrame(frame);
            controls.dispose();
            renderer.dispose();
            el.removeChild(renderer.domElement);
          };
        }, []);

        return h('div', { ref: host, style: props.style });
      };
    }
  };

  Noodl.defineModule({ reactNodes: [Cube] });
})();
```

NodeGX may later load modern files directly. For now, bundle them.

## Where your kit runs

A kit is a `<script>` tag, so the browser is the default and needs no declaration. `manifest.json`'s
`runtimes` field controls the rest:

| `runtimes` | What loads your kit |
|---|---|
| *omitted* | the browser. Right for any visual kit |
| `["browser"]` | the same thing, said out loud |
| `["browser", "cloud"]` | the browser **and** cloud functions |
| `["cloud"]` | cloud functions **only** — the browser injector skips it |

Two things worth knowing before you reach for `cloud`:

- **It carries logic nodes only.** A cloud function has no DOM to render into.
- **It cannot `require`.** A deployed backend is a single prebuilt bundle with no `node_modules`, so
  there is nowhere for an npm package to land. Reaching for one fails with a message saying so
  rather than a bare `require is not defined`.

:::note There is no `"ssr"`, and you do not need one
Server-side rendering is the *browser* app rendered on a server, so a kit reaches a server render by
declaring **`browser`**. A kit declaring only `"ssr"` is in no page and runs nowhere.

One real limit: a kit whose `manifest.dependencies` points at an `http(s)` URL cannot be fetched
during a server render, so that kit is skipped there and its nodes appear only after the page
hydrates in the browser. Vendor the dependency into your kit folder to avoid it.
:::

## A kit that reads another kit

Two kits sometimes need the same thing. A flat view and a 3D view of one world parse the same map. A chart kit and its legend
kit share a colour scale. Put the shared code in one kit and let the other kit read it.

The kit that shares names what it shares in `exports`:

```js
// noodl_modules/garden-kit/index.js
Noodl.defineModule({
  reactNodes: [Garden],
  exports: { parseMap: parseMap, legend: LEGEND }
});
```

The kit that reads lists the other kit in `requires`, in its own `manifest.json`. It then asks for it by that kit's folder or
its manifest `name`:

```json
{ "name": "Garden 3D Kit", "main": "index.js", "requires": ["garden-kit"] }
```

```js
// noodl_modules/garden-3d-kit/index.js
var garden = Noodl.getModule('garden-kit');
var world = garden.parseMap(rows);
Noodl.defineModule({ reactNodes: [Garden3D] });
```

`requires` is what makes this safe. A kit named there loads before yours, whatever the folders are called. That holds in the
browser, on a server render, in cloud functions and in the MCP server's list of node types. So you can call `getModule` at the
top of your file, not only inside a render. Without the entry, kits load alphabetically by folder. Whether yours finds the
other kit then depends on the names.

If a kit you require is not installed, your kit is not loaded at all. The browser console, the server log and
`get_project_info` name the kit it needed. If you want your kit to work alone, keep your own copy of what you need and leave
`requires` out.

:::caution Don't walk `window.__noodl_modules`
It is the runtime's own list. Its order is the load order, which only `requires` guarantees. The MCP server's reader has no
such list. Use `Noodl.getModule`.
:::

## Autocomplete, without a build step

NodeGX publishes the definition shape as a TypeScript declaration file, and you can have full
autocomplete for it in any editor that speaks TypeScript — with no `npm install` and no `tsconfig`.

The mechanism is a JSDoc annotation pointing at a **relative path**. Here is the Badge from the top
of this page again, with the two lines that turn autocomplete on — `// @ts-check` and the `@type`:

```js title="noodl_modules/my-kit/index.js — the same node, typed"
// @ts-check
(function () {
  var h = React.createElement;

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Badge = {
    name: 'my-kit.Badge',
    displayNodeName: 'Badge',
    noodlNodeAsProp: true,

    getReactComponent: function () {
      return function BadgeComponent(props) {
        var el = React.useRef(null);
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);

        return h('div', { ref: el, style: props.style }, props.label);
      };
    },

    defaultCss: { display: 'inline-flex' },

    inputProps: {
      label: { type: 'string', displayName: 'Label', group: 'Content', default: 'New' }
    }
  };

  Noodl.defineModule({ reactNodes: [Badge] });
})();
```

Every field, port type and callback signature is now typed, and a misspelled field is reported as
you type it.

The relative path matters. A bare package specifier (`import('@nodegx/node-kit-types')`) only
resolves when the package is physically installed — and a kit folder has no `node_modules`. With an
unresolvable specifier the annotation is not merely useless, it is worse than nothing: your editor
falls back to offering you every DOM global instead. So the types are delivered as **a copy of the
`.d.ts` inside your kit folder**, which is what the scaffold writes for you.

Add `// @ts-check` at the top of the file and your editor will also check it as you type.

## Start from the scaffold

You do not have to type any of this from scratch. In the editor, **Project Settings → New node kit**
writes a complete working kit — `manifest.json`, an annotated `index.js` with one example node, a
copy of the types, and a README — and opens `index.js` for you.

An agent working through the NodeGX MCP server has the same scaffold as the `create_node_kit` tool.
It is not listed until asked for: call `find_tools` with the group `project`. A kit written by hand
works too, and the server reads a kit's files again whenever they change, but the scaffold's README
carries the traps under [Wrapping a library](#wrapping-a-library) as well.

The example node it writes is built to be read: it declares 15 ports across all three groups,
defaults every colour and spacing port to a design token, and carries a `Highlighted` boolean input
specifically to demonstrate the rule above — the node draws the highlight, the graph decides when.

## The rough edges

You will hit these within an hour. Having them written down is worth more than a page that looks
clean.

- **A kit node can be a component's only visual node.** You may read, in older kits and notes, that
  a kit node must sit inside a Group to draw. That stopped being true: a component whose only visual
  node is your kit's node draws on a deployed page and in the editor canvas. Wrap it in a Group only
  when you want the Group's size ports ([Sizing a kit node](#sizing-a-kit-node-put-it-in-a-group)).

- **Editing a kit file does not hot-reload.** Save, then reload the preview by hand — there is a
  refresh path in the runtime that is dead at both ends, which is why the editor tells you to reload
  rather than doing it for you. What *does* work after that reload is the editor catching up: a node
  you added appears in the picker and a port you renamed shows its new name, without restarting.
- **A kit is arbitrary JavaScript with full access to the page.** A kit you wrote in your own project
  runs freely, and that is deliberate — gating your own code would make the scaffold useless. Kits
  from other people are a different question, and install-time verification for them is not finished
  yet. Read a third-party kit before you run it.
- **`name` collisions across kits are last-wins.** Two kits registering the same node type name will
  not warn you loudly today. Prefix with your kit's folder name.
- **Nothing validates your token names.** A typo in `var(--surace-raised)` resolves to nothing and
  the style silently does not apply.
- **The design system has no `--success` or `--warning` token.** There is a `--destructive`, but a
  node with three status bands has to reach into the palette scale (`--green-600`, `--amber-600`) for
  two of them. That is what the cashflow kit does, and it is a gap in the token set rather than a
  mistake in the kit.
- **A broken kit costs its own nodes, and nothing else.** Whether it fails to parse or throws while
  registering a node, the whole kit is skipped — none of its nodes appear — and the rest of the app
  runs normally. The failure is named on the console (kit and file) and in **Settings → Kits**, and
  the kit recovers on one preview reload once you fix it. ⚠️ It is *all* of the kit, deliberately: a
  half-registered kit that looks present while missing whatever came after the bad definition is
  harder to diagnose than one that is plainly absent.
- **Under SSR/SSG your kit runs in Node before it runs in a browser.** There is no `document` and no
  DOM there. Touching either at import time throws, and the console names your kit and says what the
  consequence is — its nodes are missing from the server-rendered HTML and appear only after
  hydration. Guard browser work behind `React.useEffect`, which does not run on the server.
- **An open property panel does not refresh itself** when you edit a kit. The node library does — the
  picker and the ports update on one preview reload — but a panel that was already open keeps showing
  the previous version until you click another node and back.

## Where to go next

- [Node, port, wire](./concepts/node-port-wire.md) — if the vocabulary above was unfamiliar
- [Signal vs value](./concepts/signal-vs-value.md) — before you declare your first `signal` output
- [The node reference](./nodes/index.md) — the built-ins your kit composes with
