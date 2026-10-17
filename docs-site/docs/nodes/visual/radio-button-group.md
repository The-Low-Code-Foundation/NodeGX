---
title: "Radio Button Group"
---
Layout container that makes its child Radio Buttons mutually exclusive and outputs the selected value.

Radio Button Group is a flex container (like a Group) whose special duty is coordinating child Radio Buttons: exactly one can be checked, and the group's `value` output holds the `value` parameter of the selected one. `onChange` fires when the selection changes. Set `value` as an input to select programmatically.

## When to use it

Always wrap radio buttons in one — it is the single point logic should read. Nest plain Groups inside for layout; the grouping behaviour spans descendants.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `Radio Button Group` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alignX` | Enum (`left`, `center`, `right`) | — | Horizontal alignment of this element within the space its parent gives it |
| `alignY` | Enum (`top`, `center`, `bottom`) | — | Vertical alignment of this element within the space its parent gives it |
| `boxSizing` | Enum (`border-box`, `content-box`) | `border-box` | Whether Width and Height include this element's padding and border, or only its content |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `flexDirection` | Enum (`column`, `row`) | `column` | Stacks the radio buttons inside this group vertically or lays them out in a row |
| `height` | Dimension | `100` | Height of the element; how the value is read depends on Size Mode |
| `marginBottom` | Number | — | Space outside the element's bottom edge, between it and its neighbours |
| `marginLeft` | Number | — | Space outside the element's left edge, between it and its neighbours |
| `marginRight` | Number | — | Space outside the element's right edge, between it and its neighbours |
| `marginTop` | Number | — | Space outside the element's top edge, between it and its neighbours |
| `maxHeight` | Number | — | Largest height the element may grow to, taking priority over Height |
| `maxWidth` | Number | — | Largest width the element may grow to, taking priority over Width |
| `minHeight` | Number | — | Smallest height the element may shrink to, taking priority over Height |
| `minWidth` | Number | — | Smallest width the element may shrink to, taking priority over Width |
| `mixBlendMode` | Enum (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) | `normal` | How this element's colours blend with whatever is painted behind it |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `opacity` | Number | `1` | How opaque this element is, from 0 for invisible to 1 for solid |
| `paddingBottom` | Number | `0` | Space inside the element's bottom edge, between it and its content |
| `paddingLeft` | Number | `0` | Space inside the element's left edge, between it and its content |
| `paddingRight` | Number | `0` | Space inside the element's right edge, between it and its content |
| `paddingTop` | Number | `0` | Space inside the element's top edge, between it and its content |
| `position` | Enum (`relative`, `absolute`, `sticky`, `fixed`) | `relative` | How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `sizeMode` | Enum (`explicit`, `contentWidth`, `contentHeight`, `contentSize`) | `contentSize` | Whether Width and Height are used as given, or the element sizes itself to fit its contents |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `transformOriginX` | Number | `50` | Horizontal point the element rotates and scales around, as a fraction of its width |
| `transformOriginY` | Number | `50` | Vertical point the element rotates and scales around, as a fraction of its height |
| `transformRotation` | Number | `0` | Rotates the element clockwise in degrees, without affecting the layout |
| `transformScale` | Number | `1` | Scales the element about its transform origin; 1 leaves it unscaled |
| `transformX` | Number | `0` | Moves the element right after layout, without moving its siblings |
| `transformY` | Number | `0` | Moves the element down after layout, without moving its siblings |
| `value` | String | — | Selects the radio button whose own Value matches this; setting it from the graph does not fire Changed |
| `visible` | Boolean | `true` | Hides the element while keeping the space it occupies in the layout |
| `width` | Dimension | `100` | Width of the element; how the value is read depends on Size Mode |
| `zIndex` | Number | — | Paint order among overlapping siblings; higher numbers paint on top |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Value** (`value`)

- nothing, a value no text can be made from, or the value it already holds: the selection stays
- different text (or what a toString makes text): the selection is this and Value follows — Changed does not fire; at the next paint the button whose Value matches shows selected and the one that was loses it, each with Checked and no Changed

**Mounted** (`mounted`)

- always: the group is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint; its buttons go with it

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the group can be seen

**Width** (`width`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Height** (`height`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Visible** (`visible`)

- always: shown or hidden at the next paint, its space kept; hidden, its buttons take no click

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |
| `value` | String | — | Value of the radio button currently selected, or nothing if none is |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `onChange` | Signal | — | Fires when the user picks a different radio button; a value arriving on the Value input does not fire it |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| sizeMode = explicit OR sizeMode = contentHeight | `width` | — |
| sizeMode = explicit OR sizeMode = contentWidth | `height` | — |
| — | — | — |

## Ports at runtime

Declared-port-groups: sizing/layout port variants follow the size-mode parameters, as with other visual containers.

## Examples

**Settings form: the standard input controls bound to values**

One of each core control: Text Input's live string comes out of `onTextChanged`, Checkbox exposes `checked` (level) plus `onChange` (edge), Dropdown (net.noodl.controls.options) takes an items list and emits the selected `value`, Slider (net.noodl.controls.range) emits a numeric `value` between `min`/`max`, and a Radio Button Group reports the `value` of whichever child Radio Button is selected. Values flow into a live summary — no submit step needed for value binding.

## Related nodes

[Radio Button](./net-noodl-controls-radiobutton.md), [Dropdown](./net-noodl-controls-options.md), [Group](./group.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)

### Starting state

```json
{
  "sizes": {
    "width": {
      "held": {
        "value": 100,
        "unit": "%"
      },
      "prop": "100%"
    },
    "height": {
      "held": {
        "value": 100,
        "unit": "%"
      },
      "prop": "100%"
    }
  },
  "grow": null,
  "mounted": true,
  "onPage": false,
  "visible": true,
  "pageVisible": true
}
```

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| a wired Width in a row, or a wired Height in a column, is a percent, so it shares out the space instead of setting a size | — | `dimensions/wired-dimension-becomes-grow` |

### What a person can do to it

The conformance tests play these acts against it:

- `pick`: a person clicks the Radio Button inside this group whose Value is the one given (none given: the button with no Value)

### Version history

- **Version 3**: A wired Width in a row, or a wired Height in a column, that is a percent now shows as its warning in this spec: it became a share of the room, not a size. The runtime has always shown it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/radiobuttongroup.ts"
/**
 * Radio Button Group (`Radio Button Group`) — read from `packages/noodl-viewer-react/src/nodes/controls/radiobuttongroup.ts`,
 * `components/controls/RadioButtonGroup/RadioButtonGroup.tsx` (the component and the context it provides),
 * `components/controls/RadioButton/RadioButton.tsx` (how a button inside reads that context and answers a click) and
 * `react-component-node.ts` (Mounted, Did Mount, Will Unmount, the Advanced and Bounding Box outputs, `addChild`) on
 * 2026-10-04 (NSP-016 s42).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * v2 (NSP-023 step 5, R12, 2026-10-06): the spec states what a person gets where v1 copied how React draws. **The buttons show
 * what the group's Value says** (Richard, 2026-10-05, on C76: "Show what Value says" — every write redraws them, so the next
 * pick fires Changed). What the runtime did instead only because its component kept a copy of the selection was a known row
 * on the runtime target (C76), fixed in P109 ISL-031.
 *
 * THE FIRST VISUAL WITH CHILDREN. A group's whole behaviour is what its Radio Buttons do inside it: a person never acts
 * on the group, only on a button in it. So the group's PAGE holds its buttons — one Radio Button per value the `pick` act
 * draws (`PAGE_VALUES`, in that order; the one drawn as `undefined` is a button with no Value), each enabled, each a real
 * child of the group (`addChild`) — and `pick` is a person clicking the button whose Value is the act's (no value: the
 * button with none). A target builds that page when it puts the group on it; a pick of a Value no button on the page
 * carries raises nothing. The buttons are the page, not subjects: what they report is the Radio Button's spec.
 *
 * THE RULE, before the citations. A Radio Button Group is a `<div>` that provides a context to the buttons inside it
 * (RadioButtonGroup.tsx :49-53): the SELECTION, its `name`, and `checkedChanged`.
 *   - **the selection is the node's Value** (`_internal.value`, radiobuttongroup.ts :20-23, :93): whatever wrote it last, a
 *     person's pick or the graph. The runtime's component keeps a copy instead (`useState`, RadioButtonGroup.tsx :21) and
 *     follows the node through an effect keyed on the Value its last PAINT rendered (:37-39; each paint hands React a fresh
 *     copy of the props, react-component-node.ts :1076-1103): a Value written back to that one in the frame of a pick is no
 *     change to the effect, and the picked button stayed selected under a Value that says another (row C76; fixed in P109
 *     ISL-031 — the node counts every write of its Value and the effect is keyed on the count).
 *   - **a button is selected** when the selection `===` its Value (RadioButton.tsx :58) — a strict compare: the number 1
 *     is not the text `"1"`, and while the group's Value has never been written the button with NO Value is the selected
 *     one (`undefined === undefined`).
 *   - **a pick** (RadioButton.tsx :187-189): a click on a selected radio changes nothing in a browser — no `change`, no
 *     `onChange`. A click on any other selects it (the context's `checkedChanged(<its Value>)`, :27-30): the node takes the
 *     button's Value (radiobuttongroup.ts :20-29), sends **Value** and fires **Changed**.
 *   - **Value** (radiobuttongroup.ts :84-99): a value that is not text but has a `toString` is converted by it (a number,
 *     a boolean, an object, an array); what is still not text then (null, undefined) is ignored. A change sends Value and
 *     NOT Changed (the description). The same value again: nothing.
 *   - **Mounted**, **Did Mount**, **Will Unmount**, **Child Index** (0, a lone node), **This**, the **Bounding Box** outputs,
 *     **Scroll Into View**: the Icon's. **Children Count** (react-component-node.ts :1599-1609, :1611-1620): the buttons
 *     on its page — each `addChild` schedules the count for the frame's end, so it is sent in the first frame, whether or
 *     not the group is mounted. A person's pick on a group off the page reaches no button.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { growChange, sizeAtDefault, sizeReducer, wiredGrowDiagnostic, withGrow, type Sizes } from './wired-grow';

/** The Values of the Radio Buttons on the group's page, in order (THE FIRST VISUAL WITH CHILDREN, above): `undefined` is a button with no Value. */
export const PAGE_VALUES: readonly unknown[] = ['a', 'b', 1, undefined];

type State = {
  /** radiobuttongroup.ts :21-22, :93 — `_internal.value`: the selection — a button is selected when it `===` the button's Value */
  value: unknown;
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted */
  onPage: boolean;
  /** NSP-016 s43 — Visible as written (node-shared-port-definitions.ts :366-375 `visibility: hidden`) */
  visible: boolean;
  /** NSP-016 s43 — as painted: a hidden group's buttons inherit `visibility: hidden`, so a pick finds none under the pointer */
  pageVisible: boolean;
  /** NSP-019 R38 — what the size ports hold, and what the last render on the page said of them (wired-grow.ts) */
  sizes: Sizes;
  grow: string | null;
};

type O = typeof RadioButtonGroup extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'onChange';
type Act = { set?: Partial<State>; send: Array<'value'>; emit?: Pulse[] };

const NONE: Act = { send: [] };

export const RadioButtonGroup = defineNode({
  type: 'Radio Button Group',
  // v2 (NSP-023 step 5, 2026-10-06): the selection is the node's Value — v1 copied the component's selection and its effect (row C76)
  // v3 (NSP-019 R38): a wired Width in a row, or a wired Height in a column, that is a percent shows as its warning (wired-grow.ts)
  version: 3,
  changes: [growChange(3)],
  diagnostics: wiredGrowDiagnostic,
  source: 'packages/noodl-viewer-react/src/nodes/controls/radiobuttongroup.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches
  synced: ['pageVisible'],

  state: { sizes: { width: sizeAtDefault(), height: sizeAtDefault() }, grow: null, value: undefined, mounted: true, onPage: false, visible: true, pageVisible: true } as State,

  acts: {
    pick: { description: 'a person clicks the Radio Button inside this group whose Value is the one given (none given: the button with no Value)', values: PAGE_VALUES }
  },

  inputs: {
    // ---- logic ----
    // radiobuttongroup.ts :77-99
    value: { type: 'string', coerce: 'none', displayName: 'Value', group: 'General', description: 'Selects the radio button whose own Value matches this; setting it from the graph does not fire Changed', portability: 'logic', examples: ['a', 'b', '1', 1] },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----

  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
  boxSizing: { type: "enum", enums: ["border-box", "content-box"], default: "border-box", coerce: 'none', displayName: "Box Sizing", group: "Margin and padding", description: "Whether Width and Height include this element's padding and border, or only its content", portability: "web-only" },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
  flexDirection: { type: "enum", enums: ["column", "row"], default: "column", coerce: 'none', displayName: "Layout", group: "Layout", description: "Stacks the radio buttons inside this group vertically or lays them out in a row", portability: "layout-shared", layout: 'axis' },
  height: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentWidth', type: "dimension", default: 100, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'height' },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
  maxHeight: { type: "number", coerce: 'none', displayName: "Max Height", group: "Dimension Constraints", description: "Largest height the element may grow to, taking priority over Height", portability: "layout-shared", layout: 'max-height' },
  maxWidth: { type: "number", coerce: 'none', displayName: "Max Width", group: "Dimension Constraints", description: "Largest width the element may grow to, taking priority over Width", portability: "layout-shared", layout: 'max-width' },
  minHeight: { type: "number", coerce: 'none', displayName: "Min Height", group: "Dimension Constraints", description: "Smallest height the element may shrink to, taking priority over Height", portability: "layout-shared", layout: 'min-height' },
  minWidth: { type: "number", coerce: 'none', displayName: "Min Width", group: "Dimension Constraints", description: "Smallest width the element may shrink to, taking priority over Width", portability: "layout-shared", layout: 'min-width' },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  paddingBottom: { type: "number", default: 0, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: "layout-shared", layout: 'padding-bottom' },
  paddingLeft: { type: "number", default: 0, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: "layout-shared", layout: 'padding-left' },
  paddingRight: { type: "number", default: 0, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: "layout-shared", layout: 'padding-right' },
  paddingTop: { type: "number", default: 0, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: "layout-shared", layout: 'padding-top' },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "contentSize", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared", layout: 'size-mode' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentHeight', type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'width' },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },

  },

  outputs: {
    // radiobuttongroup.ts :103-110
    value: { type: 'string', from: (s) => s.value, displayName: 'Value', group: 'States', description: 'Value of the radio button currently selected, or nothing if none is' },
    // radiobuttongroup.ts :112-117
    onChange: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the user picks a different radio button; a value arriving on the Value input does not fire it' },
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    // react-component-node.ts :1599-1609, :2299-2311 — the buttons on its page
    childrenCount: { type: 'number', from: () => PAGE_VALUES.length, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // radiobuttongroup.ts :84-99 — text, or what a `toString` makes text; anything else ignored; a change sends Value, never Changed
    value: (s, v) => {
      const text = asGroupValue(v);
      if (text === undefined || text === s.value) return { says: 'nothing, a value no text can be made from, or the value it already holds: the selection stays', send: [] };
      return { says: "different text (or what a toString makes text): the selection is this and Value follows — Changed does not fire; at the next paint the button whose Value matches shows selected and the one that was loses it, each with Checked and no Changed", set: { value: text }, send: ['value'] };
    },
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: the group is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint; its buttons go with it', set: { mounted: !!v }, send: [] }),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the group can be seen', send: [] }),
    // NSP-019 R38 — node.ts :446-458, react-component-node.ts :706-753 (wired-grow.ts)
    width: sizeReducer('width'),
    height: sizeReducer('height'),
    // node-shared-port-definitions.ts :366-375 — the page follows at the next paint
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, its buttons take no click', set: { visible: !!v }, send: [] })
  },
  {
    // placed on the page with its params set and its buttons added — the first render: Did Mount; the buttons' count at the frame's end
    world: { place: (s, i, w) => ({ ...withGrow(s, painted(s), i.sizeMode, i.position, w), send: ['childrenCount'] }) },
    // every frame's end is a paint (react-component-node.ts :1675-1689)
    afterInputs: (s, i, w) => ({ ...withGrow(s, painted(s), i.sizeMode, i.position, w), send: [] }),
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first
    person: {
      pick: (s, _i, v) =>
        onPainted(s, (p) => {
          // a Value no button on the page carries, or a hidden group (its buttons inherit the visibility): nothing to click
          if (!PAGE_VALUES.includes(v) || !p.pageVisible) return NONE;
          // RadioButton.tsx :58 — the picked button is the selected one: a click on a selected radio changes nothing
          if (p.value === v) return NONE;
          // RadioButton.tsx :187-189 → RadioButtonGroup.tsx :27-30 → radiobuttongroup.ts :20-29: the node takes the button's Value
          return { set: { value: v }, send: ['value'], emit: ['onChange'] };
        })
    }
  }
);

/**
 * radiobuttongroup.ts :89-90 — what the Value input takes: text, or what a `toString` makes text; `undefined` for anything it
 * ignores (null, undefined). Shared with the Radio Button, whose world writes its group's Value (world.ts GROUP).
 */
export function asGroupValue(v: unknown): string | undefined {
  let text: unknown = v;
  if (typeof text !== 'string' && (text as { toString?: unknown } | null | undefined)?.toString !== undefined) text = (text as { toString(): unknown }).toString();
  return typeof text === 'string' ? text : undefined;
}

/** The page follows what the node wants (button.ts `painted`): Visible, and Mounted — Did Mount, Will Unmount. */
function painted(s: Readonly<State>): { set: Partial<State>; emit: Pulse[] } {
  const seen: Partial<State> = s.pageVisible === s.visible ? {} : { pageVisible: s.visible };
  if (s.mounted && !s.onPage) return { set: { ...seen, onPage: true }, emit: ['didMount'] };
  if (!s.mounted && s.onPage) return { set: { ...seen, onPage: false }, emit: ['willUnmount'] };
  return { set: seen, emit: [] };
}

/** The act on the painted page (button.ts `onPainted`). */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? then(after) : NONE;
  return { set: { ...p.set, ...a.set }, send: a.send, emit: [...p.emit, ...(a.emit ?? [])] };
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
