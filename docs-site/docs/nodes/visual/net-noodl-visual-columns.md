---
title: "Columns"
---
Responsive multi-column layout: distributes its children into columns whose relative widths come from a layout string.

Columns lays out its visual children in a grid of columns described by `layoutString`: a space-separated list of relative widths, so '1 2 1' means three columns where the middle one is twice as wide as the outer ones (default '1 2 1'). Children fill the columns in order and wrap into further rows when there are more children than columns. `marginX` (Horizontal Gap) and `marginY` (Vertical Gap) set the spacing in pixels (default 16). Three things make it responsive, and they are separate: `minWidth` (Min Column Width) folds columns away from the end when the container is too narrow to honour the minimum; `sizing` set to Auto Fit ignores the layout string and takes as many equal columns of `minWidth` as will fit; and the Breakpoints group swaps in a different layout string entirely below `mediumBreakpoint` and again below `smallBreakpoint`. The breakpoints measure this node's own container, not the viewport, so the same Columns behaves correctly inside a sidebar, a modal or a repeater cell. The node reports which of the three it is at on `onBreakpointChanged` and pulses `onAtMedium` / `onAtSmall` as the container crosses a boundary, so a graph can react to a layout change without re-deriving the thresholds itself. `direction` flips the fill order between row and column, `packing` set to Masonry lets each column stack independently, and `justifyContent` aligns partial rows. The node warns in the editor if `layoutString` is bound to a non-string.

## When to use it

Card grids, dashboards, magazine-style layouts — anywhere content should reflow across a variable number of columns. For a fixed row or column of items a plain Group with `flexDirection` is simpler; for one instance per data record put a For Each inside the Columns.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `net.noodl.visual.columns` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `direction` | Enum (`row`, `column`) | `row` | Whether items fill across rows or down columns |
| `justifyContent` | Enum (`flex-start`, `flex-end`, `center`) | `flex-start` | Where the columns sit as a group when they do not fill the container |
| `layoutString` | String | `1 2 1` | Column widths as space-separated proportions, so "1 2 1" makes the middle column twice as wide |
| `marginX` | Number | `16` | Space between columns, drawn as a gutter rather than as padding on the items |
| `marginY` | Number | `16` | Space between rows |
| `mediumBreakpoint` | Number | — | Container width below which Medium Layout replaces Layout String; this is the container, not the viewport |
| `mediumLayout` | String | — | Layout String to use below Medium Below; leaving it blank makes the breakpoint inert |
| `minWidth` | Number | `0` | Columns are dropped from the end rather than shrink below this; with Auto Fit it decides how many there are |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `packing` | Enum (`rows`, `masonry`) | `rows` | Rows makes every item in a row as tall as the tallest; Masonry lets each column pack independently |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `sizing` | Enum (`layoutString`, `autoFit`) | `layoutString` | Layout String sets the columns explicitly; Auto Fit derives them from Min Column Width and the space available |
| `smallBreakpoint` | Number | — | Container width below which Small Layout replaces the others; it wins over Medium Below |
| `smallLayout` | String | — | Layout String to use below Small Below; leaving it blank makes the breakpoint inert. For more bands than these two, install the Advanced Columns prefab from the library — it drives these same inputs from a States node, so each band can set its own layout and gaps |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Mounted** (`mounted`)

- always: the container is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the columns can be seen

**Layout String** (`layoutString`)

- always: the column proportions, whatever it is handed; one that cannot be read draws the children bare, in the Default band

**Column Sizing** (`sizing`)

- always: Layout String or Auto Fit; while Auto Fit, the band is Default

**Medium Layout** (`mediumLayout`)

- always: the layout below Medium Below; blank makes that breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render

**Small Layout** (`smallLayout`)

- always: the layout below Small Below; blank makes that breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render

**Horizontal Gap** (`marginX`)

- always: a size (a bare number in the unit it holds, else pixels); the container is measured again, less the gap

**Medium Below** (`mediumBreakpoint`)

- always: a size (a bare number in the unit it holds, else pixels); nothing, or 0, makes the Medium breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render

**Small Below** (`smallBreakpoint`)

- always: a size (a bare number in the unit it holds, else pixels); nothing, or 0, makes the Small breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
| `onBreakpointChanged` | String | — | Which layout is in force: Default, Medium or Small. It is Default until the node has been measured, and while Column Sizing is Auto Fit, where no layout string is used |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `onAtMedium` | Signal | — | Fires when the container narrows or widens into the Medium band, once per crossing |
| `onAtSmall` | Signal | — | Fires when the container narrows or widens into the Small band, once per crossing |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| — | — | — |

## Ports at runtime

Its only dynamic ports are its Data Attributes list: each data-* name listed in `dataAttributes` becomes a string input of that name, written on the element (declared-port-groups). Every other port is static.

## Patterns

- Responsive card grid: layoutString '1 1 1' + `minWidth` ~200 so three columns collapse to two, then one, as the viewport narrows.
- Named breakpoints: layoutString '1 2 1' with mediumLayout '1 1' below 1024 and smallLayout '1' below 600 — three explicit layouts rather than a fold from the end.
- React to the band: wire `onBreakpointChanged` into a Text node, or `onAtSmall` into an action, instead of re-deriving the thresholds from a States node on boundingWidth.
- For Each inside Columns: repeated component instances distribute across the columns automatically.

## Examples

**Media card row: Columns layout with Image, Icon and Circle**

A card layout composed from the visual primitives: Columns (net.noodl.visual.columns) distributes its children by a layout string ('1 2' — the second column twice as wide), the Image shows a picture from a URL/asset on `src`, the Icon (net.noodl.visual.icon) renders a themed glyph, and the Circle doubles as a status dot whose `fillColor` is data-driven. Layout is containment; only the dynamic bits (image source, status color) are wired.

## Related nodes

[Group](./group.md), [Repeater](./for-each.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)

### Starting state

```json
{
  "mounted": true,
  "onPage": false,
  "layout": "1 2 1",
  "sizing": "layoutString",
  "gap": 16,
  "gapHeld": {
    "unit": "px",
    "value": 16
  },
  "width": 1024,
  "container": false,
  "observer": null,
  "measured": null,
  "band": null
}
```

### What a person can do to it

The conformance tests play these acts against it:

- `resize`: the page is laid out again, with the Columns container this many pixels wide

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/columns.ts"
/**
 * Columns (`net.noodl.visual.columns`) — read from `packages/noodl-viewer-react/src/nodes/visual/columns.ts` (the node),
 * `components/visual/Columns/Columns.tsx` (the component), `react-component-node.ts` (`defineRegularInputProp` :698-757 — how a
 * units port and a plain one reach the props; Mounted, Did Mount, Will Unmount, the Advanced and Bounding Box outputs),
 * `packages/noodl-runtime/src/node.ts` `setInputValue` :421-437 (a bare number merged into the unit a size port holds) and
 * `nodedefinition.ts` `initializeDefaultValues` :180-199 on 2026-10-08 (NSP-016 s60; the reading is NSP-016 §7.21).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * WHAT IS LOGIC HERE. A Columns lays its children out in columns, and where each one goes is geometry (NSP-017). What it REPORTS is
 * not: **Breakpoint** (Default, Medium or Small), **At Medium** and **At Small** say which of its three layout strings is in force, and
 * that is picked from ONE number — the width its container is laid out at (Columns.tsx `pickBreakpointLayout` :277-293). So the spec
 * takes that number from the world, as the Drag takes a pointer's position (drag.ts THE GESTURE), and lays nothing out. The seven
 * inputs the band is read from are `logic` here (R10: an input an output reads is behaviour), whatever visual-params.json classes them.
 *
 * THE CHILDREN. A Columns with no children draws nothing (:609), so its page holds two (Groups): the container is drawn whenever the
 * Layout String can be read (below).
 *
 * THE WIDTH (the act `resize`, and THE LAYOUT on a target: node-spec-target.ts). The page is laid out at a width — 1024 before any
 * `resize` — and the container's `offsetWidth` is that width. The component measures it with a `ResizeObserver` (:486-515), made when
 * the container element appears and again when Horizontal Gap changes, and dropped with the element; the observer's report is the
 * width less the gap it was made with, never below 0 (`measureContainerWidth` :116-118). An observation reports when it starts and
 * then whenever the width is not the one it last reported; a report lands at the browser's next rendering step — the end of a settle,
 * or the `resize` itself (a `resize` that is not a number lays nothing out again, and still lets a waiting report land).
 *
 * THE BAND (`resolveColumnLayout` :219-255 and `pickBreakpointLayout`, at every render, from the props as they are):
 *   - **Default** when the Layout String cannot be read (`readColumnLayoutString` :421-433: a string with nothing but spaces, or
 *     anything that is neither a string nor a number) — the children are drawn bare, with no container, so nothing is measured and the
 *     width is forgotten (:487-492); when the container has not been measured yet; and while Column Sizing is Auto Fit.
 *   - else **Small** when Small Below is above 0, Small Layout is truthy and reads as a layout (v2, row C133: as Layout String is — a
 *     number as its text; v1 took any truthy value, and the runtime threw on one that was not a string) and the measured width is
 *     below Small Below; else **Medium**
 *     the same way; else **Default**. A breakpoint is read as a number (`toPixels` :60-63: a number as it is, anything else
 *     `parseFloat` of it, and 0 when that is not finite).
 * **Breakpoint** is published, and At Medium or At Small fired for the band entered, by an effect keyed on the band (:598-604): when a
 * component mounts (its first render is always Default) and whenever the band changes — so a Columns that mounts at a narrow width
 * fires At Small at once, and one that loses its container (Layout String emptied, Auto Fit, Mounted off and on) fires it again when
 * the band comes back. What leaves the band unchanged sends nothing.
 *
 * WHAT REACHES THE PROPS (react-component-node.ts `defineRegularInputProp`). Layout String is the node's own input (columns.ts :89-92):
 * whatever it is handed. Column Sizing, Medium Layout and Small Layout are plain props: the value, or nothing for `undefined`.
 * Horizontal Gap, Medium Below and Small Below are SIZE ports (:698-745): a number (or a string `isNaN` reads as one, and `null`) is
 * first merged into the `{ value, unit }` the port holds, if it holds one (node.ts :430-437) — Horizontal Gap holds `16px` from its
 * default; Medium Below and Small Below hold nothing until a size is set (`initializeDefaultValues` skips a port with no default).
 * On a port that holds no size — nothing yet, a `var(…)`, a value it refused — a finite number, or text that reads as one, is read
 * in pixels, the ports' default unit (v3, row C132: v1 and v2 kept it bare, and the setter refused it). Then a `var(…)` string is kept as it is; a `{ value, unit }` whose value is a finite number (or a numeric string, or has no
 * unit) becomes `value + unit`; `undefined`, `null`, `NaN` and an empty size clear the prop; anything else is refused (reported as a
 * runtime error, off the wire) and the prop is kept. The port remembers what it was handed either way, which is what the next number
 * merges into.
 *
 * Mounted, Did Mount, Will Unmount, **Child Index** 0, **Children Count** 2, **This**, the **Bounding Box** never measured here,
 * **Scroll Into View** nothing on the wire — as every visual node (icon.ts). A Layout String that drops entries is reported as a
 * runtime error (columns.ts `revalidateLayoutStrings`), off the wire.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';

/** THE WIDTH: the container widths the generator lays the page out at — either side of the breakpoints its examples set, and 0. */
export const WIDTHS: readonly unknown[] = [1024, 900, 800, 700, 699, 500, 480, 479, 320, 16, 0, 15.5, 'wide'];

type Band = 'Default' | 'Medium' | 'Small';
/** The ResizeObserver the component holds (:500): the gap it subtracts, and the width it last reported (null: none yet). */
type Observer = { gap: unknown; last: number | null };

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the component is on the page: mounted and painted */
  onPage: boolean;
  // ---- the props (what the component renders with at the next paint) ----
  layout: unknown;
  sizing: unknown;
  mediumLayout: unknown;
  smallLayout: unknown;
  mediumBelow: unknown;
  smallBelow: unknown;
  gap: unknown;
  // ---- what each size port holds (node.ts `_inputValues`: what the next number merges into) ----
  mediumHeld: unknown;
  smallHeld: unknown;
  gapHeld: unknown;
  // ---- the page (THE WIDTH) ----
  width: number;
  // ---- the component (Columns.tsx) ----
  /** the container element is on the page (`containerElement`, :478) */
  container: boolean;
  observer: Observer | null;
  /** `containerWidth` (:454) */
  measured: number | null;
  /** the band the breakpoint effect last ran for (:598-604); null on a component whose effect has not run */
  band: Band | null;
  /** Breakpoint as last published */
  out: unknown;
};

type O = typeof Columns extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'onAtMedium' | 'onAtSmall';
type Act = { set: Partial<State>; send: Array<'onBreakpointChanged'>; emit: Pulse[] };

const NOTHING: Send = { send: [] };

export const Columns = defineNode({
  type: 'net.noodl.visual.columns',
  // v2 (P109 ISL-050, s32): a Medium or Small Layout that is no layout leaves its band to the base layout (row C133)
  // v3 (P109 ISL-050, s33): a number on a size port that holds no size is read in pixels (row C132)
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/visual/columns.ts',
  needs: ['person'],

  state: {
    mounted: true,
    onPage: false,
    // columns.ts :69-76 `initialize`; react-component-node.ts :1318-1325 (Column Sizing's default)
    layout: '1 2 1',
    sizing: 'layoutString',
    mediumLayout: undefined,
    smallLayout: undefined,
    mediumBelow: undefined,
    smallBelow: undefined,
    gap: 16,
    // nodedefinition.ts :180-199 — only a port with a default holds a size at creation
    mediumHeld: undefined,
    smallHeld: undefined,
    gapHeld: { unit: 'px', value: 16 },
    width: 1024,
    container: false,
    observer: null,
    measured: null,
    band: null,
    out: undefined
  } as State,

  acts: {
    resize: { description: 'the page is laid out again, with the Columns container this many pixels wide', values: WIDTHS }
  },

  inputs: {
    // ---- logic ----
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // columns.ts :84-93; Columns.tsx :421-433
    layoutString: { type: 'string', default: '1 2 1', coerce: 'none', displayName: 'Layout String', group: 'Layout Settings', description: 'Column widths as space-separated proportions, so "1 2 1" makes the middle column twice as wide', portability: 'logic', examples: ['1 2 1', '1 1', '', '  ', 0, 3, null, true, '1 a 1'] },
    // react-component-node.ts :746-757 (plain); Columns.tsx :245
    sizing: { type: 'enum', enums: ['layoutString', 'autoFit'], default: 'layoutString', coerce: 'none', displayName: 'Column Sizing', group: 'Layout Settings', description: 'Layout String sets the columns explicitly; Auto Fit derives them from Min Column Width and the space available', portability: 'logic', examples: ['autoFit', 'layoutString', null, 'masonry'] },
    // react-component-node.ts :698-745 (a size); Columns.tsx :116-118, :515
    marginX: { type: 'number', default: 16, coerce: 'none', displayName: 'Horizontal Gap', group: 'Layout Settings', description: 'Space between columns, drawn as a gutter rather than as padding on the items', portability: 'logic', examples: [0, 16, 40, 124, -5, '20', 'var(--gap)', { value: 30, unit: 'px' }, { value: 10, unit: '%' }, { value: null, unit: 'px' }, null, 'wide', NaN, true, {}] },
    mediumBreakpoint: { type: 'number', coerce: 'none', displayName: 'Medium Below', group: 'Breakpoints', description: 'Container width below which Medium Layout replaces Layout String; this is the container, not the viewport', portability: 'logic', examples: [{ value: 700, unit: 'px' }, { value: 900, unit: 'px' }, { value: '800', unit: 'px' }, { value: 0, unit: 'px' }, 700, '900', 'var(--md)', null, NaN, { value: 900 }] },
    mediumLayout: { type: 'string', coerce: 'none', displayName: 'Medium Layout', group: 'Breakpoints', description: 'Layout String to use below Medium Below; leaving it blank makes the breakpoint inert', portability: 'logic', examples: ['1 1', '', ' ', null, 2, 0] },
    smallBreakpoint: { type: 'number', coerce: 'none', displayName: 'Small Below', group: 'Breakpoints', description: 'Container width below which Small Layout replaces the others; it wins over Medium Below', portability: 'logic', examples: [{ value: 480, unit: 'px' }, { value: 1200, unit: 'px' }, { value: -1, unit: 'px' }, 480, 1100, '480', null] },
    smallLayout: { type: 'string', coerce: 'none', displayName: 'Small Layout', group: 'Breakpoints', description: 'Layout String to use below Small Below; leaving it blank makes the breakpoint inert. For more bands than these two, install the Advanced Columns prefab from the library — it drives these same inputs from a States node, so each band can set its own layout and gaps', portability: 'logic', examples: ['1', '', null, 0] },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
    dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
    direction: { type: "enum", enums: ["row", "column"], default: "row", coerce: 'none', displayName: "Layout Direction", group: "Layout Settings", description: "Whether items fill across rows or down columns", portability: "layout-not-shared" },
    justifyContent: { type: "enum", enums: ["flex-start", "flex-end", "center"], default: "flex-start", coerce: 'none', displayName: "Justify Content", group: "Justify Content", description: "Where the columns sit as a group when they do not fill the container", portability: "layout-shared", layout: 'main-align' },
    marginY: { type: "number", default: 16, coerce: 'none', displayName: "Vertical Gap", group: "Layout Settings", description: "Space between rows", portability: "layout-not-shared" },
    minWidth: { type: "number", default: 0, coerce: 'none', displayName: "Min Column Width", group: "Constraints", description: "Columns are dropped from the end rather than shrink below this; with Auto Fit it decides how many there are", portability: "layout-shared", layout: 'min-width' },
    packing: { type: "enum", enums: ["rows", "masonry"], default: "rows", coerce: 'none', displayName: "Item Packing", group: "Layout Settings", description: "Rows makes every item in a row as tall as the tallest; Masonry lets each column pack independently", portability: "layout-not-shared" },
    styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
    variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" }
  },

  outputs: {
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // columns.ts `outputProps` :170-188; Columns.tsx :598-604
    onBreakpointChanged: { type: 'string', from: (s) => s.out, displayName: 'Breakpoint', group: 'Breakpoints', description: 'Which layout is in force: Default, Medium or Small. It is Default until the node has been measured, and while Column Sizing is Auto Fit, where no layout string is used' },
    onAtMedium: { type: 'signal', displayName: 'At Medium', group: 'Breakpoints', description: 'Fires when the container narrows or widens into the Medium band, once per crossing' },
    onAtSmall: { type: 'signal', displayName: 'At Small', group: 'Breakpoints', description: 'Fires when the container narrows or widens into the Small band, once per crossing' },
    // react-component-node.ts :1428-1444, :1628-1638 — its two children
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    childrenCount: { type: 'number', from: () => 2, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: the container is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the columns can be seen', send: [] }),
    // columns.ts :89-92 — whatever it is handed
    layoutString: (_s, v) => ({ says: 'always: the column proportions, whatever it is handed; one that cannot be read draws the children bare, in the Default band', set: { layout: v }, send: [] }),
    // react-component-node.ts :746-757 — the value, or nothing for `undefined`
    sizing: (_s, v) => ({ says: 'always: Layout String or Auto Fit; while Auto Fit, the band is Default', set: { sizing: v }, send: [] }),
    mediumLayout: (_s, v) => ({ says: 'always: the layout below Medium Below; blank makes that breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render', set: { mediumLayout: v }, send: [] }),
    smallLayout: (_s, v) => ({ says: 'always: the layout below Small Below; blank makes that breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render', set: { smallLayout: v }, send: [] }),
    // react-component-node.ts :698-745 — a size (WHAT REACHES THE PROPS)
    marginX: (s, v) => {
      const r = sized(s.gapHeld, s.gap, v);
      return { says: 'always: a size (a bare number in the unit it holds, else pixels); the container is measured again, less the gap', set: { gapHeld: r.held, gap: r.prop }, send: [] };
    },
    mediumBreakpoint: (s, v) => {
      const r = sized(s.mediumHeld, s.mediumBelow, v);
      return { says: 'always: a size (a bare number in the unit it holds, else pixels); nothing, or 0, makes the Medium breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render', set: { mediumHeld: r.held, mediumBelow: r.prop }, send: [] };
    },
    smallBreakpoint: (s, v) => {
      const r = sized(s.smallHeld, s.smallBelow, v);
      return { says: 'always: a size (a bare number in the unit it holds, else pixels); nothing, or 0, makes the Small breakpoint inert — the band (Breakpoint, At Medium, At Small) is picked again from it at the next render', set: { smallHeld: r.held, smallBelow: r.prop }, send: [] };
    }
  },
  {
    world: {
      // placed on the page with its params set — the first render: Did Mount, Children Count, and the first Breakpoint
      place: (s) => (s.mounted ? toPatch(s, rendered(s), ['childrenCount']) : { send: ['childrenCount'] })
    },
    // every frame's end is a paint (react-component-node.ts :1675-1689), then the rendering step's report (THE WIDTH)
    afterInputs: (s) => {
      const a = rendered(s);
      const b = reported({ ...s, ...a.set });
      return toPatch(s, join(a, b));
    },
    person: {
      // the page follows first (adapter.ts `act`); then it is laid out at the new width, and the report lands
      resize: (s, _i, value) => {
        const a = rendered(s);
        const after = { ...s, ...a.set, ...(typeof value === 'number' ? { width: value } : {}) };
        const b = reported(after);
        return toPatch(s, join({ ...a, set: { ...a.set, width: after.width } }, b));
      }
    }
  }
);

/** `readColumnLayoutString` (:421-433): the Layout String the container is drawn for, or null — the children drawn bare. */
function readable(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v).trim() || null;
  return null;
}

/** `toPixels` (:60-63) */
function px(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(v as string);
  return Number.isFinite(n) ? n : 0;
}

/** The band a render picks (THE BAND). */
function bandOf(s: Readonly<State>): Band {
  if (readable(s.layout) === null) return 'Default';
  if (typeof s.measured !== 'number') return 'Default';
  if (s.sizing === 'autoFit') return 'Default';
  const small = px(s.smallBelow);
  // v2 (row C133, ruled "Read a number as its text, and anything else as no layout"): a band layout must be truthy AND read as a
  // layout (`readColumnLayoutString`) — a list, an object or a blank string leaves the band to the base layout
  if (small > 0 && s.smallLayout && readable(s.smallLayout) !== null && s.measured < small) return 'Small';
  const medium = px(s.mediumBelow);
  if (medium > 0 && s.mediumLayout && readable(s.mediumLayout) !== null && s.measured < medium) return 'Medium';
  return 'Default';
}

/** The breakpoint effect (:598-604): the band published, and the pulse for the band entered. */
function published(b: Band): Act {
  return { set: { band: b, out: b }, send: ['onBreakpointChanged'], emit: b === 'Medium' ? ['onAtMedium'] : b === 'Small' ? ['onAtSmall'] : [] };
}

/**
 * A size port (WHAT REACHES THE PROPS): node.ts :430-437 merges a number into the size the port holds, then react-component-node.ts
 * :698-745 decides the prop. `isNaN` as the runtime reads it — `null`, `true`, `''` and a numeric string are numbers to it. On a port
 * that holds no size, node.ts `isBareMagnitude` is narrower: a finite number, or text that is not blank and reads as one (row C132).
 */
function sized(held: unknown, prop: unknown, value: unknown): { held: unknown; prop: unknown } {
  const unit = held !== null && typeof held === 'object' ? (held as { unit?: unknown }).unit : undefined;
  const v = isNaN(value as number) === false && unit ? { ...(held as object), value } : bare(value) ? { value, unit: 'px' } : value;
  if (typeof v === 'string' && v.startsWith('var(')) return { held: v, prop: v };
  const magnitude = v !== null && typeof v === 'object' ? (v as { value?: unknown }).value : undefined;
  if (v && magnitude !== undefined && usable(v as { value?: unknown; unit?: unknown })) {
    return { held: v, prop: (magnitude as number) + ((v as { unit?: unknown }).unit as number) };
  }
  if (v === undefined || v === null || empty(v)) return { held: v, prop: undefined };
  return { held: v, prop };
}

/** node.ts `isBareMagnitude` (P107-C132) */
function bare(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

/** react-component-node.ts `dimensionIsUsable` :637-643 */
function usable(v: { value?: unknown; unit?: unknown }): boolean {
  if (!v.unit) return true;
  if (typeof v.value === 'number') return Number.isFinite(v.value);
  if (typeof v.value === 'string') return v.value.trim() !== '' && Number.isFinite(Number(v.value));
  return false;
}

/** react-component-node.ts `isEmptyMagnitude` :654-659 */
function empty(v: unknown): boolean {
  if (typeof v === 'number') return Number.isNaN(v);
  if (!v || typeof v !== 'object' || !('value' in v)) return false;
  const m = (v as { value?: unknown }).value;
  return m === null || (typeof m === 'number' && Number.isNaN(m));
}

/**
 * A paint: the page follows Mounted (Did Mount, Will Unmount — a component gone takes its container, observer and width with it),
 * then the component renders with the props as they are: its effect publishes a new component's first band or a changed one, and the
 * container element comes and goes with the Layout String — a new element, or a new Horizontal Gap, is a new observer (:486-515).
 */
function rendered(s: Readonly<State>): Act {
  if (!s.mounted && s.onPage) return { set: { onPage: false, container: false, observer: null, measured: null, band: null }, send: [], emit: ['willUnmount'] };
  if (!s.mounted) return { set: {}, send: [], emit: [] };
  const mount: Act = s.onPage ? { set: {}, send: [], emit: [] } : { set: { onPage: true }, send: [], emit: ['didMount'] };
  const st: State = { ...s, ...mount.set };
  const b = bandOf(st);
  const effect = st.band === null || st.band !== b ? published(b) : { set: {}, send: [], emit: [] };
  const has = readable(st.layout) !== null;
  const element: Partial<State> = has
    ? !st.container
      ? { container: true, observer: { gap: st.gap, last: null } }
      : !Object.is(st.observer?.gap, st.gap)
        ? { observer: { gap: st.gap, last: null } }
        : {}
    : st.container
      ? { container: false, observer: null, measured: null }
      : {};
  return { set: { ...mount.set, ...effect.set, ...element }, send: effect.send, emit: [...mount.emit, ...effect.emit] };
}

/** The rendering step's report (THE WIDTH): the width less the observer's gap, and the band it picks if it changes. */
function reported(s: Readonly<State>): Act {
  const o = s.observer;
  if (!o || o.last === s.width) return { set: {}, send: [], emit: [] };
  const measured = Math.max(0, s.width - px(o.gap));
  const set: Partial<State> = { observer: { gap: o.gap, last: s.width } };
  if (Object.is(measured, s.measured)) return { set, send: [], emit: [] };
  const st: State = { ...s, ...set, measured };
  const b = bandOf(st);
  if (b === st.band) return { set: { ...set, measured }, send: [], emit: [] };
  const e = published(b);
  return { set: { ...set, measured, ...e.set }, send: e.send, emit: e.emit };
}

function join(a: Act, b: Act): Act {
  return { set: { ...a.set, ...b.set }, send: [...new Set([...a.send, ...b.send])], emit: [...a.emit, ...b.emit] };
}

/** The state a paint or an act leaves: every one of these written on every path, as it stands (drag.ts `HELD`). */
const HELD: ReadonlyArray<keyof State> = ['onPage', 'width', 'container', 'observer', 'measured', 'band', 'out'];

function toPatch(s: Readonly<State>, a: Act, extra: string[] = []): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const after: State = { ...s, ...a.set };
  const set: Partial<State> = {};
  for (const k of HELD) (set as Record<string, unknown>)[k] = after[k];
  return { set, send: [...new Set([...a.send, ...extra])], emit: a.emit };
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
