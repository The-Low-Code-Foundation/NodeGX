/**
 * Text (`Text`) — read from `packages/noodl-viewer-react/src/nodes/visual/text.ts`, `components/visual/Text/Text.tsx` (the
 * component), `node-shared-port-definitions.ts` (`addPointerEventOutputs` :757-850, `addFileDropPorts` :946-1128,
 * `addDragDropPorts` :1140-1330, `addSharedVisualInputs` — Visible :366-375, Opacity :320-328), `pointerlisteners.ts`,
 * `drag-drop.ts` (the whole gesture) and `react-component-node.ts` (what every visual node shares) on 2026-10-05 (NSP-016
 * s43; RESEARCH-DRAG-DROP.md).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Text is an element holding a string (Text.tsx :92-102 — the tag Tag names, `as || 'div'`);
 * what it SHOWS is the page, not the wire (an empty value renders nothing, `renderableText` :38-40 — look, R10). Its logic is
 * what a person's pointer and keyboard do to it, and the drag it can be picked up in:
 *
 *   - **the pointer** (node-shared-port-definitions.ts :826-848, React's events): onto it — Hover Start (`onMouseOver`) and
 *     Pointer Enter (`onMouseEnter`); off it — Hover End (`onMouseLeave`); a mouse button down — Pointer Down (`onMouseDown`),
 *     up — Pointer Up (`onMouseUp`); a finger down / up — the same two (`onTouchStart` / `onTouchEnd`); a click — Click
 *     (react-component-node.ts, every visual node's `onClick`). **Only an element under the pointer hears it**: `Visible` off
 *     (`visibility: hidden`, :366-375), Opacity exactly the number 0 (Text.tsx :88-90 → `pointer-events: none`) or Pointer
 *     Events Enabled off (:784-793; Pointer Events Mode `inherit` removes the style again, :772-781, any other value writes it
 *     from the last Enabled, `auto` when never written) leave the act to what is behind it. **Block Pointer Events** and **Click
 *     Bubbling** change what reaches the nodes AROUND it (pointerlisteners.ts) — nothing its own outputs show.
 *     That is the rule this spec states (R11: a spec says what a person gets, not how a renderer gets there). The runtime breaks
 *     it in one way, row **C79**: Pointer Events written after the element was drawn at Opacity 0 lets the invisible element
 *     take the pointer — a renderer detail (the write goes straight to the element; the opacity rule is re-applied only by a
 *     redraw that changes it), counted as a known row on the runtime target, not copied here.
 *   - **the keyboard**: a `<div>` takes none — until **Draggable** gives its ELEMENT `tabindex="0"` (drag-drop.ts :83-110):
 *     at once when the node has an element, else at the start of each of the next 60 frames until it has one (`whenMounted`
 *     :136-145; a settle is TWO frame starts here — its frame and its drain — and both come before the settle's paint commits). An element React makes later (a remount, a new Tag) has none: row **C77**. Draggable off takes them off
 *     the element they were added to (:101-109). A `visibility: hidden` element takes no keyboard (the browser's focusing rule).
 *   - **the drag** (drag-drop.ts, one gesture at a time): a `pointerdown` on the element (`onPointerDown` :232-271) of a
 *     Draggable node on the page starts it — HELD (`holding`) when Hold To Drag says so (:173-178: `always`; `never` not; else a
 *     finger and not a mouse), the hold timer Hold Time seconds (:180-183: a finite number ≥ 0, else 0.5), else `pending` (a mouse
 *     waits for a move past 4 px, which no act here makes). The timer LIFTS it (`lift` :355-376: Is Lifted true, Picked Up). A
 *     `pointerup` of the same pointer (:308-323) ends it: before the lift quietly; after it, a drop — over nothing that takes it
 *     (no other zone is on this page; a zone inside the source never takes it, :460) — so **Cancelled** and Is Lifted false
 *     (`cancel` :401-409), and the next click is swallowed until the event loop turns (:920-927). Space on the element while it
 *     holds the keyboard lifts it from the KEYBOARD (`keyboardLift` :841-878): it starts in the first zone that takes it — and
 *     with Accept Drops on, that is ITSELF (`around` leaves itself out, `list[0]` does not) — row **C78**: Enter or Space DROPS
 *     it there (Dropped Value its own Drag Value, Drop Index 0, Dropped, Landed); with no zone, Cancelled. Escape cancels a lifted
 *     drag of either kind; Tab cancels a keyboard one (:768-839).
 *   - **Mounted**, **Did Mount**, **Will Unmount**, **Child Index**, **This**, the **Bounding Box** outputs: the Icon's.
 *   - **File drop** and the rest of the **Drop Zone**: stored; no act here drags a file or another element (step (b)).
 *     Is Dragging Over, Drag Over and Is Lifted are read at the first frame — false.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';

type Phase = 'idle' | 'pending' | 'holding' | 'lifted';

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted */
  onPage: boolean;
  /** Text.tsx :50 — the element type the next paint renders: `props.as || 'div'` */
  tag: unknown;
  /** the element type the element on the page was made with; React makes a NEW element when it changes */
  shownTag: unknown;
  /** which element is on the page — a new one each time React makes one (a mount, a new tag) */
  elem: number;
  /** the element the module's `tabindex` and `aria-roledescription` are on (drag-drop.ts :87-100), or none */
  attrsOn: number;
  /** `whenMounted`'s frame starts left (:136-145): 60 at a Draggable written with no element; 0 when none is waiting */
  chain: number;
  /** the element holds the keyboard (`document.activeElement`) */
  elementFocused: boolean;
  /** the hit test (Text.tsx :88-90, :366-375, :772-793) */
  visible: boolean;
  opacityZero: boolean;
  /** the style's `pointerEvents` as the two Pointer Events inputs left it — `undefined` when removed */
  peStyle: 'auto' | 'none' | undefined;
  /** `_internal.pointerEventsEnabled` — `undefined` until written */
  peEnabled: boolean | undefined;
  /** the drag inputs (`_internal`) */
  draggable: boolean;
  dragValue: unknown;
  holdToDrag: unknown;
  holdTime: unknown;
  acceptDrops: boolean;
  acceptKind: unknown;
  dragKind: unknown;
  /** the gesture (drag-drop.ts :199-225) — this node is its source when it is not idle */
  phase: Phase;
  input: 'mouse' | 'touch' | 'keyboard' | undefined;
  /** the zone the gesture is over: this node itself (C78), or none */
  inZone: boolean;
  /** :920-927 — a click is swallowed until the event loop turns */
  swallow: boolean;
  /** the outputs */
  isLifted: boolean;
  isDropTarget: boolean;
  droppedValue: unknown;
  dropIndex: unknown;
};

type O = typeof Text extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'onClick' | 'pointerDown' | 'pointerUp' | 'pointerEnter' | 'hoverStart' | 'hoverEnd' | 'pickedUp' | 'landed' | 'dragCancelled' | 'dropped';
type Val = 'isLifted' | 'isDropTarget' | 'droppedValue' | 'dropIndex';
type Act = { set: Partial<State>; send: Val[]; emit: Pulse[]; after?: Array<{ ms: unknown; tag: string }>; cancel?: string[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { set: {}, send: [], emit: [] };
/** drag-drop.ts :136 — `whenMounted`'s budget */
const FRAMES = 60;
const KEYS = [' ', 'Enter', 'Escape', 'Tab', 'ArrowRight', 'ArrowDown', 'x'] as const;

export const Text = defineNode({
  type: 'Text',
  // v3 (NSP-016 s44, R11): v1's rule again — an element at Opacity 0, hidden, or with Pointer Events off takes no pointer, whatever
  // order the writes came in; the runtime's exceptions are row C79, a known row. v2 (b4c997ed9) copied the renderer's redraw rules
  // to reproduce C79 and was withdrawn the same day. Since v1: Mounted written the value it holds does nothing (:2285).
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/visual/text.ts',
  needs: ['person', 'clock'],
  // the hold timer: the default half second, either side of it, a second (Hold Time 1), and the turn that unswallows a click
  worldPool: { advances: [0, 1, 499, 500, 1000] },

  state: {
    mounted: true,
    onPage: false,
    tag: 'div',
    shownTag: 'div',
    elem: 0,
    attrsOn: -1,
    chain: 0,
    elementFocused: false,
    visible: true,
    opacityZero: false,
    peStyle: undefined,
    peEnabled: undefined,
    draggable: false,
    dragValue: undefined,
    holdToDrag: undefined,
    holdTime: undefined,
    acceptDrops: false,
    acceptKind: undefined,
    dragKind: undefined,
    phase: 'idle',
    input: undefined,
    inZone: false,
    swallow: false,
    isLifted: false,
    isDropTarget: false,
    droppedValue: undefined,
    dropIndex: undefined
  } as State,

  acts: {
    hover: { description: 'the pointer moves onto the text' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up' },
    click: { description: 'a press, a release and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it — a `<div>` takes it only with a tabindex' },
    blur: { description: 'the keyboard is taken off it' },
    key: { description: 'a key is pressed with the keyboard put on it first, if it takes it', values: KEYS }
  },

  inputs: {
    // ---- logic ----
    // react-component-node.ts :2276-2295
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind', portability: 'logic' },
    // text.ts :37-45 — what the element shows (Text.tsx :101): the page, not the wire
    text: { type: 'string', default: 'Text', coerce: 'none', displayName: 'Text', group: 'Text', description: 'The text to show; an empty value renders nothing rather than the words null or undefined', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts :784-793, :800-822 (pointerlisteners.ts — what reaches the nodes around it)
    pointerEventsEnabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Pointer Events Enabled', group: 'Pointer Events', description: 'When disabled, mouse and touch events pass through to whatever is behind this element', portability: 'logic' },
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands here from reaching the nodes this one sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click here also fires Click on the nodes this one sits inside. Automatic keeps it here as soon as this node's own Click is connected, so a button inside a clickable card runs the button and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not. Note that an element at zero opacity takes no pointer events at all", portability: 'logic' },
    // node-shared-port-definitions.ts :1146-1218 — the drag source
    draggable: { type: 'boolean', default: false, coerce: 'none', displayName: 'Draggable', group: 'Drag Source', description: 'Lets a person pick this element up and drop it on an element with Accept Drops on. A see-through copy follows the pointer; the element itself stays put until the graph moves it', portability: 'logic' },
    dragValue: { type: '*', coerce: 'none', displayName: 'Drag Value', group: 'Drag Source', description: 'What this element carries — usually the id of the item it shows. A drop zone reports it as Dropped Value', portability: 'logic' },
    dragKind: { type: 'string', coerce: 'none', displayName: 'Drag Kind', group: 'Drag Source', description: 'Optional name for what this is — "card", "task". A zone with an Accept Kind only takes sources whose Drag Kind matches', portability: 'logic' },
    holdToDrag: { type: 'enum', enums: ['touch', 'always', 'never'], default: 'touch', coerce: 'none', displayName: 'Hold To Drag', group: 'Drag Source', description: 'Whether a press must be held before it picks up. On touch (the default) a finger holds for Hold Time while a ring fills, so a moving finger still scrolls; a mouse picks up as soon as it moves', portability: 'logic' },
    holdTime: { type: 'number', default: 0.5, coerce: 'none', displayName: 'Hold Time', group: 'Drag Source', description: 'How long a held press takes to pick up, in seconds', portability: 'logic' },
    // :1209-1262 — the drop zone
    acceptDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept Drops', group: 'Drop Zone', description: 'Lets a Draggable element be dropped here, which reveals the Drop Zone outputs. The innermost zone under the pointer takes the drop', portability: 'logic' },
    acceptKind: { type: 'string', coerce: 'none', displayName: 'Accept Kind', group: 'Drop Zone', description: 'Comma-separated Drag Kinds this zone takes; leave blank to take any Draggable. A source of another kind never lights this zone up', portability: 'logic' },
    makeRoom: { type: 'boolean', default: true, coerce: 'none', displayName: 'Make Room', group: 'Drop Zone', description: 'Slides the children apart to open a gap where the drop will land, while it hovers. Off keeps the children still and only reports Drop Index', portability: 'logic' },
    dropZoneName: { type: 'string', coerce: 'none', displayName: 'Zone Name', group: 'Drop Zone', description: "What a screen reader hears this zone called while a card is moved with the keyboard — \"Thursday\". Falls back to the element's accessible label", portability: 'logic' },
    // :946-972 — file drop: no act here drags a file (step (b))
    acceptFileDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept File Drops', group: 'File Drop', description: 'Lets a file dragged from the desktop be dropped onto this element, which reveals the File Drop outputs below', portability: 'logic' },
    acceptedFileTypes: { type: 'string', coerce: 'none', displayName: 'Accepted file types', group: 'File Drop', description: 'Comma-separated extensions or MIME types this element will take — ".png, .jpg" or "image/*"; leave blank to accept every file. A drop of nothing but rejected files fires Files Rejected instead of Files Dropped', portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    // (Tag, Visible, Opacity and Pointer Events Mode are read by the page: the element's type and the hit test)
  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared" },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared" },
  as: { type: "enum", enums: ["div", "h1", "h2", "h3", "h4", "h5", "h6", "p", "span"], default: "div", coerce: 'none', displayName: "Tag", group: "Advanced HTML", description: "HTML element to render the text as, which changes nothing visually but matters for screen readers and SEO", portability: "web-only" },
  color: { type: "color", coerce: 'none', displayName: "Color", group: "Text Style", description: "Colour of the text itself, not of the element behind it", portability: "look-shared" },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
  fontFamily: { type: "font", coerce: 'none', displayName: "Font Family", group: "Text Style", description: "Typeface to render the text in, either a web-safe family name or a font file added to the project", portability: "look-shared" },
  fontSize: { type: "number", coerce: 'none', displayName: "Font Size", group: "Text Style", description: "Height of the text, in pixels", portability: "look-shared" },
  fontStyle: { type: "enum", enums: ["normal", "italic"], default: "normal", coerce: 'none', displayName: "Font Style", group: "Text Style", description: "Renders the text upright or italic", portability: "look-shared" },
  fontVariantNumeric: { type: "enum", enums: ["normal", "tabular-nums"], default: "normal", coerce: 'none', displayName: "Numerals", group: "Text Style", description: "Tabular draws every digit at the same width so columns of numbers align; Normal follows the font", portability: "look-expressible" },
  fontWeight: { type: "number", default: "Auto", coerce: 'none', displayName: "Font Weight", group: "Text Style", description: "How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets", portability: "look-shared" },
  height: { type: "dimension", default: 100, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the element; how the value is read depends on Size Mode", portability: "layout-shared" },
  letterSpacing: { type: "number", default: "Auto", coerce: 'none', displayName: "Letter Spacing", group: "Text Style", description: "Extra space added between characters; leave as Auto to use the spacing built into the font", portability: "look-shared" },
  lineHeight: { type: "number", default: "Auto", coerce: 'none', displayName: "Line Height", group: "Text Style", description: "Vertical space each line of text occupies; leave as Auto to follow the font", portability: "look-shared" },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible" },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible" },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible" },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible" },
  maxHeight: { type: "number", coerce: 'none', displayName: "Max Height", group: "Dimension Constraints", description: "Largest height the element may grow to, taking priority over Height", portability: "layout-shared" },
  maxWidth: { type: "number", coerce: 'none', displayName: "Max Width", group: "Dimension Constraints", description: "Largest width the element may grow to, taking priority over Width", portability: "layout-shared" },
  minHeight: { type: "number", coerce: 'none', displayName: "Min Height", group: "Dimension Constraints", description: "Smallest height the element may shrink to, taking priority over Height", portability: "layout-shared" },
  minWidth: { type: "number", coerce: 'none', displayName: "Min Width", group: "Dimension Constraints", description: "Smallest width the element may shrink to, taking priority over Width", portability: "layout-shared" },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  pointerEventsMode: { type: "enum", enums: ["inherit", "explicit"], default: "inherit", coerce: 'none', displayName: "Pointer Events Mode", group: "Pointer Events", description: "Whether pointer handling is inherited from the parent or set explicitly on this element", portability: "web-only" },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible" },
  sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "contentHeight", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared" },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  textAlignX: { type: "enum", enums: ["left", "center", "right"], default: "left", coerce: 'none', displayName: "Text Horizontal Align", group: "Text Alignment", description: "Aligns the text within its own box on the horizontal axis", portability: "layout-shared" },
  textAlignY: { type: "enum", enums: ["top", "center", "bottom"], default: "top", coerce: 'none', displayName: "Text Vertical Align", group: "Text Alignment", description: "Aligns the text within its own box on the vertical axis, which is only visible when the box is taller than the text", portability: "layout-expressible" },
  textOverflow: { type: "enum", enums: ["wrap", "clip", "ellipsis"], default: "wrap", coerce: 'none', displayName: "Text Overflow", group: "Text", description: "What a line too long for its box does. Needs a width the text can exceed, so it has no effect while the size mode is content-sized", portability: "look-shared" },
  textStyle: { type: "textStyle", default: "None", coerce: 'none', displayName: "Text Style", group: "Text Style", description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: "look-shared" },
  textTransform: { type: "enum", enums: ["none", "uppercase", "lowercase", "capitalize"], default: "none", coerce: 'none', displayName: "Case", group: "Text Style", description: "Forces the text to upper case, lower case or capitalised without changing the underlying value", portability: "look-shared" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared" },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared" },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared" },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared" },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared" },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared" },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared" },
  wordBreak: { type: "enum", enums: ["normal", "break-all"], default: "normal", coerce: 'none', displayName: "Word Break", group: "Text", description: "Word break Control where line breaks are allowed - Normal: Break on spaces and other whitespace characters - Break All: Allow line breaks between any two characters, including inside words", portability: "web-only" },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  },

  outputs: {
  didMount: { type: "signal", displayName: "Did Mount", group: "Mounted", description: "Fires once this element has been added to the page and can be measured" },
  dragCancelled: { type: "signal", displayName: "Cancelled", group: "Drag Source", description: "Fires when a lifted element is let go over nothing that takes it, or Escape puts it back" },
  dropped: { type: "signal", displayName: "Dropped", group: "Drop Zone", description: "Fires when a Draggable is dropped here, after Dropped Value and Drop Index are up to date. Move the data here — the engine moves nothing" },
  filesDropped: { type: "signal", displayName: "Files Dropped", group: "File Drop", description: "Fires when one or more accepted files are dropped here, after every File Drop output is up to date" },
  filesRejected: { type: "signal", displayName: "Files Rejected", group: "File Drop", description: "Fires when a drop landed here but every file in it was excluded by Accepted file types" },
  hoverEnd: { type: "signal", displayName: "Hover End", group: "Hover Events", description: "Fires when the pointer leaves this element" },
  hoverStart: { type: "signal", displayName: "Hover Start", group: "Hover Events", description: "Fires when the pointer moves over this element or any of its children" },
  landed: { type: "signal", displayName: "Landed", group: "Drag Source", description: "Fires when this element is dropped on a zone that took it, after the zone's Dropped" },
  onClick: { type: "signal", displayName: "Click", group: "Events", description: "Fires when this element is clicked or tapped" },
  pickedUp: { type: "signal", displayName: "Picked Up", group: "Drag Source", description: "Fires when this element is lifted — after the hold on touch, on the first move with a mouse, on Space from the keyboard" },
  pointerDown: { type: "signal", displayName: "Pointer Down", group: "Pointer Events", description: "Fires when a mouse button is pressed or a finger touches this element" },
  pointerEnter: { type: "signal", displayName: "Pointer Enter", group: "Pointer Events", description: "Fires when the pointer moves onto this element, not counting its children" },
  pointerUp: { type: "signal", displayName: "Pointer Up", group: "Pointer Events", description: "Fires when the mouse button is released or the finger lifts over this element" },
  willUnmount: { type: "signal", displayName: "Will Unmount", group: "Mounted", description: "Fires just before this element is removed from the page, while it still exists" },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (text.ts :13)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' },
    // node-shared-port-definitions.ts :1292-1330
    isLifted: { type: 'boolean', from: (s: State) => s.isLifted, displayName: 'Is Lifted', group: 'Drag Source', description: 'True while this element is being dragged' },
    droppedValue: { type: '*', from: (s: State) => s.droppedValue, displayName: 'Dropped Value', group: 'Drop Zone', description: 'The Drag Value of the element dropped here' },
    dropIndex: { type: 'number', from: (s: State) => s.dropIndex, displayName: 'Drop Index', group: 'Drop Zone', description: "Where among this zone's children it landed, counting from 0 and leaving the dropped element itself out — so it is the index to insert at once it is removed from where it was" },
    isDropTarget: { type: 'boolean', from: (s: State) => s.isDropTarget, displayName: 'Drag Over', group: 'Drop Zone', description: 'True while something this zone takes is held over it — wire it to a background or border so the zone lights up' },
    // :1069-1124 — no file is dropped here: read once, at the first frame
    droppedFile: { type: '*', from: () => undefined, displayName: 'File', group: 'File Drop', description: 'The first accepted file, in the form an Upload File node takes' },
    droppedFiles: { type: 'array', from: () => undefined, displayName: 'Files', group: 'File Drop', description: 'Every accepted file in the drop, as an array — a drop can carry more than one' },
    droppedFileName: { type: 'string', from: () => undefined, displayName: 'File Name', group: 'File Drop', description: 'Name of the first accepted file, extension included' },
    droppedFileType: { type: 'string', from: () => undefined, displayName: 'File Type', group: 'File Drop', description: 'MIME type the browser reports for the first accepted file, blank for one it does not recognise' },
    droppedFileSizeInBytes: { type: 'number', from: () => undefined, displayName: 'File Size In Bytes', group: 'File Drop', description: 'Size of the first accepted file, in bytes' },
    isDragOver: { type: 'boolean', from: () => false, displayName: 'Is Dragging Over', group: 'File Drop', description: 'True while a file is being dragged over this element — wire it to a border or background so the drop zone reacts' }
  }
}).on(
  {
    // react-component-node.ts :2283-2294 — what the node wants; the page follows at the next paint. The value it holds already: nothing
    mounted: (s, v) => (!!v !== s.mounted ? { set: { mounted: !!v }, send: [] } : NOTHING),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => NOTHING,
    // Text.tsx :50 — the element type the next paint renders
    as: (_s, v) => ({ set: { tag: v || 'div' }, send: [] }),
    // :366-375
    visible: (_s, v) => ({ set: { visible: !!v }, send: [] }),
    // :320-328 — the style holds the value as written; Text.tsx :88-90 compares it with the number 0
    opacity: (_s, v) => ({ set: { opacityZero: v === 0 }, send: [] }),
    // :772-781 — `inherit` removes the style; anything else writes it from the last Enabled (`auto` before one)
    pointerEventsMode: (s, v) => ({ set: { peStyle: v === 'inherit' ? undefined : s.peEnabled === false ? 'none' : 'auto' }, send: [] }),
    // :787-793 — written whatever the mode
    pointerEventsEnabled: (_s, v) => ({ set: { peEnabled: !!v, peStyle: v ? 'auto' : 'none' }, send: [] }),
    // drag-drop.ts :83-110 — on: the attributes on the element now, or at the start of each of the next 60 frames; off: taken
    // off the element they were added to, when it is the one on the page
    draggable: (s, v) => {
      if (v) return { set: { draggable: true, ...(s.onPage ? { attrsOn: s.elem } : { chain: Math.max(s.chain, FRAMES) }) }, send: [] };
      return { set: { draggable: false, ...(s.onPage && s.attrsOn === s.elem ? { attrsOn: -1 } : {}) }, send: [] };
    },
    dragValue: (_s, v) => ({ set: { dragValue: v }, send: [] }),
    dragKind: (_s, v) => ({ set: { dragKind: v }, send: [] }),
    holdToDrag: (_s, v) => ({ set: { holdToDrag: v }, send: [] }),
    holdTime: (_s, v) => ({ set: { holdTime: v }, send: [] }),
    // drag-drop.ts :112-120 — off while the gesture is over this zone: it leaves it (`leaveZone` :489-512)
    acceptDrops: (s, v) => {
      if (v) return { set: { acceptDrops: true }, send: [] };
      if (s.phase !== 'idle' && s.inZone) return { set: { acceptDrops: false, inZone: false, isDropTarget: false }, send: ['isDropTarget'] };
      return { set: { acceptDrops: false }, send: [] };
    },
    acceptKind: (_s, v) => ({ set: { acceptKind: v }, send: [] })
  },
  {
    world: {
      // placed on the page with its params set — the first render: Did Mount, unless a Mounted parameter said no
      place: (s) => ({ ...painted(s), send: [] }),
      // drag-drop.ts :267-269 — the hold timer lifts a gesture still held; :920-927 — the turn that unswallows a click
      timer: (s, _i, tag) => {
        if (tag === 'unswallow') return { set: { swallow: false }, send: [] };
        if (tag === 'hold' && s.phase === 'holding') return lifted(s);
        return NOTHING;
      }
    },
    // every frame's end is a paint (react-component-node.ts :1675-1689). `whenMounted` checks at each frame START — two in a
    // settle of the runtime target (its frame and its drain), and both before the paint: the frame end's render commits when
    // the settle's React `act` closes, after the drain (measured: an element mounted by a Mounted write is found at the NEXT
    // settle's first frame start)
    afterInputs: (s) => {
      const a = chainCheck(s);
      const b = chainCheck({ ...s, ...a });
      const p = painted({ ...s, ...a, ...b });
      return { set: { ...a, ...b, ...p.set }, send: [], emit: p.emit };
    },
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first, then the act meets what is there
    person: {
      // node-shared-port-definitions.ts :826-848 — Hover Start and Pointer Enter
      hover: (s) => onPainted(s, (p) => (hits(p) ? { ...NONE, emit: ['hoverStart', 'pointerEnter'] } : NONE)),
      leave: (s) => onPainted(s, (p) => (hits(p) ? { ...NONE, emit: ['hoverEnd'] } : NONE)),
      press: (s) => onPainted(s, (p) => {
        const down = pointerDown(p, 'mouse');
        if (!hits(p)) return down;
        const after = { ...p, ...down.set };
        return { ...down, set: { ...down.set, ...takesKeyboard(after) }, emit: [...down.emit, 'pointerDown'] };
      }),
      release: (s) => onPainted(s, (p) => {
        const up = pointerUp(p, 'mouse');
        return hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up;
      }),
      // the press, the release, then the click — swallowed after a drop until the event loop turns (drag-drop.ts :920-927)
      click: (s) => onPainted(s, (p) => {
        const down = pointerDown(p, 'mouse');
        const pressedOn: Act = hits(p) ? { ...down, set: { ...down.set, ...takesKeyboard({ ...p, ...down.set }) }, emit: [...down.emit, 'pointerDown'] } : down;
        const mid = { ...p, ...pressedOn.set };
        const up = pointerUp(mid, 'mouse');
        // the click reaches the window first: a swallow waiting there eats it, wherever it lands
        const eaten = { ...mid, ...up.set }.swallow;
        const on: Pulse[] = hits(p) ? (eaten ? ['pointerUp'] : ['pointerUp', 'onClick']) : [];
        return join(pressedOn, { ...up, set: { ...up.set, ...(eaten ? { swallow: false } : {}) }, emit: [...up.emit, ...on] });
      }),
      touch: (s) => onPainted(s, (p) => {
        const down = pointerDown(p, 'touch');
        return hits(p) ? { ...down, emit: [...down.emit, 'pointerDown'] } : down;
      }),
      lift: (s) => onPainted(s, (p) => {
        const up = pointerUp(p, 'touch');
        return hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up;
      }),
      focus: (s) => onPainted(s, (p) => ({ ...NONE, set: takesKeyboard(p) })),
      blur: (s) => onPainted(s, (p) => (p.elementFocused ? { ...NONE, set: { elementFocused: false } } : NONE)),
      key: (s, _i, value) => onPainted(s, (p) => {
        const f = takesKeyboard(p);
        const k = keyDown({ ...p, ...f }, String(value));
        return { ...k, set: { ...f, ...k.set } };
      })
    }
  }
);

/** Two acts in order, as one. */
function join(a: Act, b: Act): Act {
  return {
    set: { ...a.set, ...b.set },
    send: [...a.send, ...b.send],
    emit: [...a.emit, ...b.emit],
    ...(a.after || b.after ? { after: [...(a.after ?? []), ...(b.after ?? [])] } : {}),
    ...(a.cancel || b.cancel ? { cancel: [...(a.cancel ?? []), ...(b.cancel ?? [])] } : {})
  };
}

/** The element is under the pointer: on the page, not hidden, not `pointer-events: none` (Text.tsx :88-90 beats the style). */
function hits(s: Readonly<State>): boolean {
  return s.onPage && s.visible && !s.opacityZero && s.peStyle !== 'none';
}

/** `el.focus()` — the element takes the keyboard when it has the module's tabindex and can be seen; it keeps it once it has it. */
function takesKeyboard(s: Readonly<State>): Partial<State> {
  if (s.elementFocused) return {};
  return s.onPage && s.visible && s.attrsOn === s.elem ? { elementFocused: true } : {};
}

/**
 * A paint: the page follows what the node wants (button.ts `painted`). A new element when React makes one — mounted, or a Tag
 * that renders another type (`shownTag`) — with no attributes on it and not holding the keyboard.
 */
function painted(s: Readonly<State>): { set: Partial<State>; emit: Pulse[] } {
  if (s.mounted && !s.onPage) return { set: { onPage: true, elem: s.elem + 1, shownTag: s.tag, elementFocused: false }, emit: ['didMount'] };
  if (!s.mounted && s.onPage) return { set: { onPage: false, elementFocused: false }, emit: ['willUnmount'] };
  if (s.onPage && s.tag !== s.shownTag) return { set: { elem: s.elem + 1, shownTag: s.tag, elementFocused: false }, emit: [] };
  return { set: {}, emit: [] };
}

/** The act on the painted page: nothing to act on when the element is not there; else `then` on the painted state, after the paint's own pulses. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? then(after) : NONE;
  return { ...a, set: { ...p.set, ...a.set }, emit: [...p.emit, ...a.emit] };
}

/** `whenMounted` at a frame's start (drag-drop.ts :136-145): the element on the page takes the attributes; none, one frame fewer. */
function chainCheck(s: Readonly<State>): Partial<State> {
  if (s.chain <= 0) return {};
  return s.onPage ? { attrsOn: s.elem, chain: 0 } : { chain: s.chain - 1 };
}

/** drag-drop.ts :173-183 */
function holds(s: Readonly<State>, input: 'mouse' | 'touch'): boolean {
  const mode = s.holdToDrag || 'touch';
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return input !== 'mouse';
}
function holdMs(s: Readonly<State>): number {
  const seconds = Number(s.holdTime);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 0.5) * 1000;
}

/** `onPointerDown` (drag-drop.ts :232-271): a gesture starts on this element when none is under way and it is Draggable. */
function pointerDown(s: Readonly<State>, input: 'mouse' | 'touch'): Act {
  if (s.phase !== 'idle' || !s.draggable || !hits(s)) return NONE;
  if (holds(s, input)) return { set: { phase: 'holding', input }, send: [], emit: [], after: [{ tag: 'hold', ms: holdMs(s) }] };
  return { set: { phase: 'pending', input }, send: [], emit: [] };
}

/** `onPointerUp` (:308-323) — the same pointer only; the window hears it wherever it lands. */
function pointerUp(s: Readonly<State>, input: 'mouse' | 'touch'): Act {
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  const d = drop(s);
  return { ...d, set: { ...d.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] };
}

/** What `finish` (:418-436) leaves of the gesture. */
function ended(): Partial<State> {
  return { phase: 'idle', input: undefined, inZone: false };
}

/** `lift` (:355-376): Is Lifted, then Picked Up. */
function lifted(_s: Readonly<State>): Send {
  return { set: { phase: 'lifted', isLifted: true }, send: ['isLifted'], emit: ['pickedUp'] };
}

/** `cancel` (:401-409): the gesture ends; a lifted one says Cancelled. */
function cancelled(s: Readonly<State>): Act {
  const zone: Partial<State> = s.inZone ? { isDropTarget: false } : {};
  if (s.phase !== 'lifted') return { set: { ...ended(), ...zone }, send: s.inZone ? ['isDropTarget'] : [], emit: [], cancel: ['hold'] };
  return { set: { ...ended(), ...zone, isLifted: false }, send: [...(s.inZone ? (['isDropTarget'] as Val[]) : []), 'isLifted'], emit: ['dragCancelled'], cancel: ['hold'] };
}

/**
 * `drop` (:379-399): over a zone — this node itself, row C78 — Dropped Value (the Drag Value now), Drop Index, Dropped, Landed,
 * then the gesture ends (the zone left, Is Lifted false); over none, a cancel.
 */
function drop(s: Readonly<State>): Act {
  if (!s.inZone) return cancelled(s);
  return {
    set: { ...ended(), droppedValue: s.dragValue, dropIndex: 0, isDropTarget: false, isLifted: false },
    send: ['droppedValue', 'dropIndex', 'isDropTarget', 'isLifted'],
    emit: ['dropped', 'landed']
  };
}

/** `accepts` (:166-171): no Accept Kind takes anything; else the source's Drag Kind, trimmed, among the kinds. */
function acceptsItself(s: Readonly<State>): boolean {
  const wanted = String(s.acceptKind || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (wanted.length === 0) return true;
  return wanted.includes(String(s.dragKind || '').trim());
}

/** This node is an armed zone on the page that takes itself (`orderedZones` :753-766). */
function zoneOfItself(s: Readonly<State>): boolean {
  return s.acceptDrops && s.onPage && acceptsItself(s);
}

/** `onKeyDown` (:768-839) — a key reaches the document wherever the keyboard is. */
function keyDown(s: Readonly<State>, key: string): Act {
  if (s.phase === 'idle') {
    // Space on the live, Draggable element that holds the keyboard: `keyboardLift` — into the first zone, itself (C78)
    if (key !== ' ' || !s.elementFocused || !s.draggable || !s.onPage) return NONE;
    const zone = zoneOfItself(s);
    return {
      set: { phase: 'lifted', input: 'keyboard', isLifted: true, inZone: zone, ...(zone ? { isDropTarget: true } : {}) },
      send: zone ? ['isLifted', 'isDropTarget'] : ['isLifted'],
      emit: ['pickedUp']
    };
  }
  if (s.input !== 'keyboard') return key === 'Escape' && s.phase === 'lifted' ? cancelled(s) : NONE;
  switch (key) {
    case 'Enter':
    case ' ':
      return drop(s);
    case 'Escape':
    case 'Tab':
      return cancelled(s);
    case 'ArrowRight':
    case 'ArrowLeft':
      // the zones in reading order: itself, if it takes itself now (a zone switched on mid-drag is entered)
      return !s.inZone && zoneOfItself(s) ? { set: { inZone: true, isDropTarget: true }, send: ['isDropTarget'], emit: [] } : NONE;
    default:
      return NONE;
  }
}
