---
title: "Icon"
---
Displays a glyph from a project icon font, or an image, at a given size — tintable via color for font icons.

Icon renders a single icon. With `iconSourceType` (Type) set to 'icon' (the default) it shows a glyph from an icon set enabled in the project — `iconIconSource` (Icon Source) identifies the glyph (a CSS class plus code) and `iconColor` tints it, `iconSize` setting the font size in pixels. With `iconSourceType` 'image' it instead shows `iconImageSource` (Image Source) as a square image of `iconSize`; `iconColor` has no effect on images. The node cannot have children and carries the usual margin/padding, alignment and transform parameters (with a default 5px padding on all sides).

## When to use it

Decorative or informative glyphs next to text, in cards, headers and list rows. For a clickable icon button prefer net.noodl.controls.button with its icon settings (states and accessibility included) — or wire this node's parent Group's `onClick`. For full pictures use Image.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `net.noodl.visual.icon` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alignX` | Enum (`left`, `center`, `right`) | — | Horizontal alignment of this element within the space its parent gives it |
| `alignY` | Enum (`top`, `center`, `bottom`) | — | Vertical alignment of this element within the space its parent gives it |
| `boxSizing` | Enum (`border-box`, `content-box`) | `border-box` | Whether Width and Height include this element's padding and border, or only its content |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `iconColor` | Color | `#000000` | Colour of the icon |
| `iconIconSource` | Icon | — | Which glyph to show, picked from an installed icon set |
| `iconImageSource` | Image | — | Image file to show instead of an icon-set glyph |
| `iconSize` | Number | `16` | Height of the icon |
| `iconSourceType` | Enum (`image`, `icon`) | `icon` | Whether the icon comes from an installed icon set or from an image file, which decides the source port below |
| `marginBottom` | Number | — | Space outside the element's bottom edge, between it and its neighbours |
| `marginLeft` | Number | — | Space outside the element's left edge, between it and its neighbours |
| `marginRight` | Number | — | Space outside the element's right edge, between it and its neighbours |
| `marginTop` | Number | — | Space outside the element's top edge, between it and its neighbours |
| `mixBlendMode` | Enum (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) | `normal` | How this element's colours blend with whatever is painted behind it |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `opacity` | Number | `1` | How opaque this element is, from 0 for invisible to 1 for solid |
| `paddingBottom` | Number | `0` | Space inside the element's bottom edge, between it and its content |
| `paddingLeft` | Number | `0` | Space inside the element's left edge, between it and its content |
| `paddingRight` | Number | `0` | Space inside the element's right edge, between it and its content |
| `paddingTop` | Number | `0` | Space inside the element's top edge, between it and its content |
| `position` | Enum (`relative`, `absolute`, `sticky`, `fixed`) | `relative` | How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `transformOriginX` | Number | `50` | Horizontal point the element rotates and scales around, as a fraction of its width |
| `transformOriginY` | Number | `50` | Vertical point the element rotates and scales around, as a fraction of its height |
| `transformRotation` | Number | `0` | Rotates the element clockwise in degrees, without affecting the layout |
| `transformScale` | Number | `1` | Scales the element about its transform origin; 1 leaves it unscaled |
| `transformX` | Number | `0` | Moves the element right after layout, without moving its siblings |
| `transformY` | Number | `0` | Moves the element down after layout, without moving its siblings |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |
| `visible` | Boolean | `true` | Hides the element while keeping the space it occupies in the layout |
| `zIndex` | Number | — | Paint order among overlapping siblings; higher numbers paint on top |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Mounted** (`mounted`)

- always: the icon is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the icon can be seen

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| useIcon = true OR useIcon NOT SET | `iconSourceType`, `iconSize` | — |
| #js (params.useIcon===true \|\| params.useIcon===undefined) && params.iconSourceType === 'image' | `iconImageSource` | — |
| #js (params.useIcon===true \|\| params.useIcon===undefined) && params.iconSourceType === 'icon' | `iconIconSource`, `iconColor` | — |
| — | — | — |

## Ports at runtime

Declared-port-groups keyed on `iconSourceType`: 'icon' exposes `iconIconSource` and `iconColor`, 'image' exposes `iconImageSource`; `iconSize` and `iconSourceType` are always shown. (An internal `useIcon` flag defaults to true and has no editor input on this node.)

## Patterns

- Icon + Text in a row Group: the standard labeled-metadata row in cards and lists.
- Bind `iconColor` from state (e.g. a Condition's boolean via a Switch/States color) to reflect status.

## Examples

**Media card row: Columns layout with Image, Icon and Circle**

A card layout composed from the visual primitives: Columns (net.noodl.visual.columns) distributes its children by a layout string ('1 2' — the second column twice as wide), the Image shows a picture from a URL/asset on `src`, the Icon (net.noodl.visual.icon) renders a themed glyph, and the Circle doubles as a status dot whose `fillColor` is data-driven. Layout is containment; only the dynamic bits (image source, status color) are wired.

**Icon feature strip: one item component, instantiated three times inside a Columns**

Three reassurances on a bordered band — and the shape this recipe is really about. The item is its OWN component with Component Inputs for its icon, title and body, instantiated three times; writing the subtree out three times is a `repeated-sibling-subtree` warning, not a style preference. The row is a Columns node so it collapses to one column under 700px: a Group row cannot, because no Group in the runtime has a breakpoint. The band sits on --surface with hairlines top and bottom so it reads as a rule across the page rather than another section.

**Empty state: what a list shows when it has no rows**

A list with nothing in it should say what it is and what to do, not render nothing. The designed version is small and centred inside a dashed card: an icon in a muted disc, one heading, one line of explanation capped at ~380px, and exactly one action. The switch is one wire: the query's `isEmpty` boolean into the empty state's `mounted` input. Use `mounted`, not `visible` — `mounted` takes the element out of the layout, while `visible` only hides it and keeps the space it occupies, which leaves a page-height hole above your empty state. The list needs no gate at all: a `For Each` over an empty array renders no rows and occupies no height, so nothing has to be inverted and no logic node is involved. Skipping the empty state is the difference between an app that looks unfinished on first run and one that does not, and first run is when it is always seen.

## Related nodes

[Image](./image.md), [Text](./text.md), [Shape](./circle.md), [Button](./net-noodl-controls-button.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)

### Starting state

```json
{
  "mounted": true,
  "onPage": false
}
```

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| Icon Source holds something that is not an icon | — | `visual/icon-source-not-an-icon/iconIconSource` |

### What a person can do to it

The conformance tests play these acts against it:

- `hover`: the pointer moves onto the icon
- `leave`: the pointer moves off it
- `press`: a mouse button goes down on it
- `release`: the mouse button comes up on it
- `click`: a press, a release and the click that follows
- `touch`: a finger goes down on it
- `lift`: the finger comes up
- `focus`: the keyboard is put on it — a `<div>` takes none
- `blur`: the keyboard is taken off it

### Version history

- **Version 2**: An Icon Source that is not an icon now shows as the node's warning in this spec, until an icon or nothing arrives. The runtime has always shown it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/icon.ts"
/**
 * Icon (`net.noodl.visual.icon`) — read from `packages/noodl-viewer-react/src/nodes/visual/icon.ts`,
 * `components/visual/Icon/Icon.tsx` (the component), `node-shared-port-definitions.ts` (`addIconInputs`) and
 * `react-component-node.ts` (what every visual node shares: Mounted, Did Mount, Will Unmount, the Advanced and Bounding Box
 * outputs) on 2026-10-04 (NSP-016 s41).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. An Icon is a `<div>` holding a glyph or an `<img>` (Icon.tsx :21-38, :44-48); it has no
 * logic of its own — no event, no state, no output but the eight every visual node has. Its 34 inputs are look and layout
 * (stored, written to the style or the component's props, read by no output; each with its portability class, R10), Mounted,
 * and Scroll Into View. What a spec can say of it is the page: **Mounted** (react-component-node.ts :2302-2321) puts the
 * element on the page — **Did Mount** at the frame's end that paints it (:982-990) — and takes it off — **Will Unmount**
 * (:993-1003); **Child Index** 0 (a lone node), **This** itself, the **Bounding Box** never measured here. A person's
 * pointer, finger or keyboard on it raises nothing: the component wires no handler and a `<div>` takes no keyboard. An Icon
 * Source the renderer cannot draw is dropped with an editor diagnostic (react-component-node.ts :663-678 — not on the wire).
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { iconSourceChange, iconSourceDiagnostics } from './icon-source';

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted */
  onPage: boolean;
};

type O = typeof Icon extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount';
type Act = { set?: Partial<State>; send: never[]; emit?: Pulse[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { send: [] };

export const Icon = defineNode({
  type: 'net.noodl.visual.icon',
  // v2 (NSP-019 R35): an Icon Source that is not an icon shows as its warning until an icon or nothing arrives (`diagnostics`)
  version: 2,
  changes: [iconSourceChange(2)],
  diagnostics: iconSourceDiagnostics(),
  source: 'packages/noodl-viewer-react/src/nodes/visual/icon.ts',
  needs: ['person'],

  state: { mounted: true, onPage: false } as State,

  acts: {
    hover: { description: 'the pointer moves onto the icon' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press, a release and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it — a `<div>` takes none' },
    blur: { description: 'the keyboard is taken off it' }
  },

  inputs: {
    // ---- logic ----
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
  iconColor: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'icon', type: "color", default: "#000000", coerce: 'none', displayName: "Color", group: "Icon", description: "Colour of the icon", portability: "look-shared" },
  iconIconSource: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'icon', type: "icon", coerce: 'none', displayName: "Icon Source", group: "Icon", description: "Which glyph to show, picked from an installed icon set", portability: "look-shared" },
  iconImageSource: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'image', type: "image", coerce: 'none', displayName: "Image Source", group: "Icon", description: "Image file to show instead of an icon-set glyph", portability: "look-shared" },
  iconSize: { when: (p) => p.useIcon === true || p.useIcon === undefined, type: "number", default: 16, coerce: 'none', displayName: "Size", group: "Icon", description: "Height of the icon", portability: "look-shared" },
  iconSourceType: { when: (p) => p.useIcon === true || p.useIcon === undefined, type: "enum", enums: ["image", "icon"], default: "icon", coerce: 'none', displayName: "Type", group: "Icon", description: "Whether the icon comes from an installed icon set or from an image file, which decides the source port below", portability: "look-shared" },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  paddingBottom: { type: "number", default: 0, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: "layout-shared", layout: 'padding-bottom' },
  paddingLeft: { type: "number", default: 0, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: "layout-shared", layout: 'padding-left' },
  paddingRight: { type: "number", default: 0, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: "layout-shared", layout: 'padding-right' },
  paddingTop: { type: "number", default: 0, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: "layout-shared", layout: 'padding-top' },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  },

  outputs: {
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (icon.ts :9)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
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
    mounted: (_s, v) => ({ says: 'always: the icon is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the icon can be seen', send: [] })
  },
  {
    // placed on the page with its params set — the first paint: Did Mount
    world: { place: (s) => ({ ...painted(s), send: [] }) },
    // every frame's end is a paint (react-component-node.ts :1675-1689)
    afterInputs: (s) => ({ ...painted(s), send: [] }),
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first; the act itself raises nothing
    person: {
      hover: (s) => onPainted(s),
      leave: (s) => onPainted(s),
      press: (s) => onPainted(s),
      release: (s) => onPainted(s),
      click: (s) => onPainted(s),
      touch: (s) => onPainted(s),
      lift: (s) => onPainted(s),
      focus: (s) => onPainted(s),
      blur: (s) => onPainted(s)
    }
  }
);

/** The page follows what the node wants (button.ts `painted`). */
function painted(s: Readonly<State>): { set: Partial<State>; emit: Pulse[] } {
  if (s.mounted && !s.onPage) return { set: { onPage: true }, emit: ['didMount'] };
  if (!s.mounted && s.onPage) return { set: { onPage: false }, emit: ['willUnmount'] };
  return { set: {}, emit: [] };
}

/** The act on the painted page: the paint's pulses, and nothing of the act's own. */
function onPainted(s: Readonly<State>): Act {
  const p = painted(s);
  return Object.keys(p.set).length === 0 ? NONE : { set: p.set, send: [], emit: p.emit };
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
