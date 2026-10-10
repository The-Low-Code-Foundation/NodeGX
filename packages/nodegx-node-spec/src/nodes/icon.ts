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
  version: 1,
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
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind', portability: 'logic', layout: 'present' },
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
