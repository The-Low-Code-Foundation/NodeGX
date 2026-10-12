/**
 * Image (`Image`) — read from `packages/noodl-viewer-react/src/nodes/visual/image.ts`, `components/visual/Image/Image.tsx` (the
 * component), `nodes/visual/media-source.ts` and `noodl-runtime/src/utils.ts` `getAbsoluteUrl` (what Source becomes),
 * `node-shared-port-definitions.ts` (the pointer, file-drop and drag ports — the Text's), `pointerlisteners.ts`, `drag-drop.ts` and
 * `react-component-node.ts` (what every visual node shares) on 2026-10-07 (NSP-016 s53).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. An Image is the Text's element drawing a PICTURE instead of a string (Image.tsx :67-77 — always an
 * `<img>`, which has no children). How it is drawn — its fit, its border, its shadow, its size — is look (R10). Everything the Text
 * spec (text.ts) says of the pointer, the keyboard, the drag, the zone side and the drag from the desktop holds here word for word
 * (the same shared ports, the same `drag-drop.ts`, the same opacity rule, Image.tsx :53-55 `style.opacity === 0`), and is not
 * repeated; as on the Shape (circle.ts) there is no Tag, so only a mount makes a new element, and Drop Index is 0 (an `<img>` has no
 * children for `slots` to count). What it adds is the picture's own outcome:
 *
 *   - **Source** (image.ts :94-108, `resolveMediaSource`, media-source.ts :29-32): null, nothing, or anything empty as text (`""`,
 *     `[]`), is NO source — the element gets no `src` and asks for nothing; anything else is made text (`String`) and, unless it
 *     starts with `/`, holds `://` or starts with `data:`, put after the app's base URL — `/` here (`getAbsoluteUrl`, utils.ts
 *     :9-19: `Noodl.baseUrl || '/'`). Image.tsx :57-62 then puts a project Base URL in front of a source that starts with `/`; this
 *     page has none.
 *   - **Source Set** goes onto the element as written (`propPath: 'dom'`): a `srcset` attribute for text, a number or an object, none
 *     for nothing, null or a boolean (React 19 warns that a boolean is not a value here). React 19.0 itself breaks that once: an
 *     element it CREATES with `true` gets `srcset="true"` (an update to `true` removes it), so the browser fetches a picture called
 *     "true" — row **C94**, a known row on the runtime target (`booleanSrcSetAtMount`), not copied here (R11).
 *   - **the browser's fetch** (`fetched`, an act: the browser finishes fetching the picture the element names — it loads, or it
 *     cannot). The browser fetches only for an element on the page with a source to fetch — a `src`, or a `srcset` that is not
 *     empty; with neither, the act is nothing. A load fires **On Load** (`onLoad`, the element's `load` event, `propPath: 'dom'`). A
 *     failure (Image.tsx :37-45, `reportImageError`) sets **Error** — "The image could not be loaded: " and the element's `src`, or
 *     "The image could not be loaded — no Source was set" when only Source Set named one — then fires **On Error**. (It also raises a
 *     runtime error, `image/load-failed`, on the app's error bus: not an output of the node.)
 *   - **Alternate text** is what a screen reader says; it changes nothing a port shows.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';

type Phase = 'idle' | 'pending' | 'holding' | 'lifted';

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted */
  onPage: boolean;
  /** which element is on the page — a new one each time one is made (a mount) */
  elem: number;
  /** the element that holds the keyboard (`document.activeElement`), or -1 — a new element never does (row C77, P109 s31: so a paint
   * writes nothing about the keyboard) */
  focusedElem: number;
  /** the hit test (Image.tsx :53-55, :366-375, :772-793) */
  visible: boolean;
  opacityZero: boolean;
  /** the style's `pointerEvents` as the two Pointer Events inputs left it — `undefined` when removed */
  peStyle: 'auto' | 'none' | undefined;
  /** `_internal.pointerEventsEnabled` — `undefined` until written */
  peEnabled: boolean | undefined;
  /** the drag inputs (`_internal`) */
  draggable: boolean;
  holdToDrag: unknown;
  holdTime: unknown;
  acceptDrops: boolean;
  acceptKind: unknown;
  /** the gesture (drag-drop.ts :199-225) — this node is its source when it is not idle */
  phase: Phase;
  input: 'mouse' | 'touch' | 'keyboard' | undefined;
  /** a card's gesture is over this node as its zone; never the node's own gesture (C78, fixed in P109 ISL-031) */
  inZone: boolean;
  /** THE ZONE SIDE — the card whose gesture it is (its index in `CARDS`; -1: none), and what lifted it. A card's gesture is always lifted */
  carry: number;
  carryBy: 'mouse' | 'keyboard' | undefined;
  /** the card that holds the keyboard (`document.activeElement`), its index in `CARDS`; -1: none (a card takes it at its press, or at a pick-up) */
  cardFocused: number;
  /** :920-927 — a click is swallowed until the event loop turns */
  swallow: boolean;
  /** the outputs */
  isLifted: boolean;
  isDropTarget: boolean;
  droppedValue: unknown;
  dropIndex: unknown;
  /** image.ts :104-107 — the element's `src`: `resolveMediaSource` of Source (none: no source) */
  src: string | undefined;
  /** image.ts :111-124 — Source Set as written, on the element as its `srcset` */
  srcSet: unknown;
  /** Image.tsx :37-45 — Error, the last failure's reason */
  imageError: unknown;
  /** file drop (`_internal`, node-shared-port-definitions.ts :956-1137) */
  acceptFileDrops: boolean;
  acceptedFileTypes: unknown;
  dragDepth: number;
  /** the element the count belongs to: an enter on another starts it again (C81, fixed in P109); -1: none */
  depthOn: number;
  isDragOver: boolean;
  droppedFiles: unknown;
  droppedFile: unknown;
  /** the browser's drag from the desktop: the files it carries (`undefined`: no drag), and the element it is over (-1: none of this node's) */
  fileCarry: readonly FileLike[] | undefined;
  fileOn: number;
};

/** A file the browser hands (adapter.ts `file`): what the filter and the outputs read of it. */
type FileLike = { readonly name?: unknown; readonly type?: unknown; readonly size?: unknown };

type O = typeof Image extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'onLoad' | 'onError' | 'didMount' | 'willUnmount' | 'onClick' | 'pointerDown' | 'pointerUp' | 'pointerEnter' | 'hoverStart' | 'hoverEnd' | 'pickedUp' | 'landed' | 'dragCancelled' | 'dropped' | 'filesDropped' | 'filesRejected';
type Val = 'imageError' | 'isLifted' | 'isDropTarget' | 'droppedValue' | 'dropIndex' | 'isDragOver' | 'droppedFile' | 'droppedFiles' | 'droppedFileName' | 'droppedFileType' | 'droppedFileSizeInBytes';
type Act = { set: Partial<State>; send: Val[]; emit: Pulse[]; after?: Array<{ ms: unknown; tag: string }>; cancel?: string[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { set: {}, send: [], emit: [] };
const KEYS = [' ', 'Enter', 'Escape', 'Tab', 'ArrowRight', 'ArrowDown', 'x'] as const;
/** what a drag from the desktop carries: an image (its extension upper-case), a PDF, both, a file of no known type, or no file (text) */
const PNG = { $file: { name: 'photo.PNG', type: 'image/png', size: 3 } };
const PDF = { $file: { name: 'notes.pdf', type: 'application/pdf', size: 5 } };
const BARE = { $file: { name: 'README', type: '', size: 0 } };
const FILE_DRAGS = [[PNG], [PDF], [PNG, PDF], [BARE], []] as const;
/** THE ZONE SIDE — the Draggable cards on the page beside the Image: one of the kind `card`, one of ` task ` (trimmed when read), one of no kind */
const CARDS: ReadonlyArray<{ readonly dragValue: unknown; readonly dragKind?: string }> = [{ dragValue: 'card-1', dragKind: 'card' }, { dragValue: 7, dragKind: ' task ' }, { dragValue: 'loose' }];

export const Image = defineNode({
  type: 'Image',
  // v1 (NSP-016 s53): the Text v5's machinery (text.ts), with no Tag (as the Image), and the picture's fetch
  // v2 (P109 ISL-038, s29): a key during a keyboard carry leaves a zone taken off the page first, so Space cancels (row C83)
  // v3 (P109 ISL-038, s29): a file drop zone tracks itself — an enter on a new element starts the count again, and Accept File Drops off or leaving the page turns Is Dragging Over off (row C81)
  // v4 (P109 ISL-031, s30): a drag never takes its own node as its zone — a keyboard lift does not start in itself, Enter or Space then cancels, and a pointer drag over a new element of its own finds no zone (row C78)
  // v5 (P109 ISL-031, s30–31): every element of a Draggable node takes the keyboard — a remount, a new Tag or a mount however late gets the attributes (row C77); which element is on the page is the paint's sync (`synced`), and the keyboard is held by an element (`focusedElem`), so a paint writes nothing about it
  version: 5,
  source: 'packages/noodl-viewer-react/src/nodes/visual/image.ts',
  needs: ['person', 'clock'],
  // the page's syncs (spec.ts `synced`): which element is on the page, written only by a paint. Not branches (row C77, P109 s31):
  // with every element of a Draggable taking the keyboard, whether an act's paint or the frame end made the element is not a branch
  synced: ['onPage', 'elem'],
  // the hold timer: the default half second, either side of it, a second (Hold Time 1), and the turn that unswallows a click
  worldPool: { advances: [0, 1, 499, 500, 1000] },

  state: {
    mounted: true,
    onPage: false,
    elem: 0,
    focusedElem: -1,
    visible: true,
    opacityZero: false,
    peStyle: undefined,
    peEnabled: undefined,
    draggable: false,
    holdToDrag: undefined,
    holdTime: undefined,
    acceptDrops: false,
    acceptKind: undefined,
    phase: 'idle',
    input: undefined,
    inZone: false,
    carry: -1,
    carryBy: undefined,
    cardFocused: -1,
    swallow: false,
    isLifted: false,
    isDropTarget: false,
    droppedValue: undefined,
    dropIndex: undefined,
    acceptFileDrops: false,
    acceptedFileTypes: undefined,
    dragDepth: 0,
    depthOn: -1,
    isDragOver: false,
    droppedFiles: undefined,
    droppedFile: undefined,
    fileCarry: undefined,
    fileOn: -1,
    src: undefined,
    srcSet: undefined,
    imageError: undefined
  } as State,

  acts: {
    hover: { description: 'the pointer moves onto the image' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up' },
    click: { description: 'a press, a release and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it — a `<div>` takes it only with a tabindex' },
    blur: { description: 'the keyboard is taken off it' },
    key: { description: 'a key is pressed with the keyboard put on it first, if it takes it', values: KEYS },
    move: { description: 'the mouse, or the finger that is down, moves across it by more than a few pixels', values: ['mouse', 'touch'] },
    fileEnter: { description: 'a drag from the desktop moves onto it: a new drag carries these files (none: something that is not a file), one under way keeps its own', values: FILE_DRAGS },
    fileLeave: { description: 'the drag from the desktop moves off it and out of the window' },
    fileDrop: { description: 'the drag from the desktop is let go over it' },
    grab: { description: 'the mouse goes down on the Draggable card beside it that carries this Drag Value and Drag Kind, and moves it past a few pixels', values: CARDS },
    pickUp: { description: 'the keyboard is put on the card beside it that carries this Drag Value and Drag Kind, and Space is pressed', values: CARDS },
    fetched: { description: 'the browser finishes fetching the picture the element names: it loads it, or it cannot', values: ['load', 'error'] },
    away: { description: 'the mouse, or the finger that is down, moves off it onto nothing by more than a few pixels', values: ['mouse', 'touch'] }
  },

  inputs: {
    // ---- logic ----
    // react-component-node.ts :2276-2295
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts :784-793, :800-822 (pointerlisteners.ts — what reaches the nodes around it)
    pointerEventsEnabled: { when: (p) => p.pointerEventsMode === 'explicit', type: 'boolean', default: true, coerce: 'none', displayName: 'Pointer Events Enabled', group: 'Pointer Events', description: 'When disabled, mouse and touch events pass through to whatever is behind this element', portability: 'logic' },
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands here from reaching the nodes this one sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click here also fires Click on the nodes this one sits inside. Automatic keeps it here as soon as this node's own Click is connected, so a button inside a clickable card runs the button and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not. Note that an element at zero opacity takes no pointer events at all", portability: 'logic' },
    // node-shared-port-definitions.ts :1146-1218 — the drag source
    draggable: { type: 'boolean', default: false, coerce: 'none', displayName: 'Draggable', group: 'Drag Source', description: 'Lets a person pick this element up and drop it on an element with Accept Drops on. A see-through copy follows the pointer; the element itself stays put until the graph moves it', portability: 'logic' },
    dragValue: { when: (p) => p.draggable === true, type: '*', coerce: 'none', displayName: 'Drag Value', group: 'Drag Source', description: 'What this element carries — usually the id of the item it shows. A drop zone reports it as Dropped Value', portability: 'logic' },
    dragKind: { when: (p) => p.draggable === true, type: 'string', coerce: 'none', displayName: 'Drag Kind', group: 'Drag Source', description: 'Optional name for what this is — "card", "task". A zone with an Accept Kind only takes sources whose Drag Kind matches', portability: 'logic' },
    holdToDrag: { when: (p) => p.draggable === true, type: 'enum', enums: ['touch', 'always', 'never'], default: 'touch', coerce: 'none', displayName: 'Hold To Drag', group: 'Drag Source', description: 'Whether a press must be held before it picks up. On touch (the default) a finger holds for Hold Time while a ring fills, so a moving finger still scrolls; a mouse picks up as soon as it moves', portability: 'logic' },
    holdTime: { when: (p) => p.draggable === true, type: 'number', default: 0.5, coerce: 'none', displayName: 'Hold Time', group: 'Drag Source', description: 'How long a held press takes to pick up, in seconds', portability: 'logic' },
    // :1209-1262 — the drop zone
    acceptDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept Drops', group: 'Drop Zone', description: 'Lets a Draggable element be dropped here, which reveals the Drop Zone outputs. The innermost zone under the pointer takes the drop', portability: 'logic' },
    acceptKind: { when: (p) => p.acceptDrops === true, type: 'string', coerce: 'none', displayName: 'Accept Kind', group: 'Drop Zone', description: 'Comma-separated Drag Kinds this zone takes; leave blank to take any Draggable. A source of another kind never lights this zone up', portability: 'logic', examples: ['card', 'task, card', 'note', ''] },
    makeRoom: { when: (p) => p.acceptDrops === true, type: 'boolean', default: true, coerce: 'none', displayName: 'Make Room', group: 'Drop Zone', description: 'Slides the children apart to open a gap where the drop will land, while it hovers. Off keeps the children still and only reports Drop Index', portability: 'logic' },
    dropZoneName: { when: (p) => p.acceptDrops === true, type: 'string', coerce: 'none', displayName: 'Zone Name', group: 'Drop Zone', description: "What a screen reader hears this zone called while a card is moved with the keyboard — \"Thursday\". Falls back to the element's accessible label", portability: 'logic' },
    // :956-982 — file drop
    acceptFileDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept File Drops', group: 'File Drop', description: 'Lets a file dragged from the desktop be dropped onto this element, which reveals the File Drop outputs below', portability: 'logic' },
    acceptedFileTypes: { when: (p) => p.acceptFileDrops === true, type: 'string', coerce: 'none', displayName: 'Accepted file types', group: 'File Drop', description: 'Comma-separated extensions or MIME types this element will take — ".png, .jpg" or "image/*"; leave blank to accept every file. A drop of nothing but rejected files fires Files Rejected instead of Files Dropped', portability: 'logic', examples: ['.png', 'image/*', ' .PDF , image/', 'application/pdf', ''] },
    // image.ts :94-108 — written to the element's `src` (`resolveMediaSource`), drawn at the frame's end
    src: { type: 'image', coerce: 'none', displayName: 'Source', group: 'Image', description: 'URL or project file to display; leave blank to show nothing rather than request a missing image', portability: 'logic' },
    // :111-124, :125-137 — on the element as written (`propPath: 'dom'`)
    srcSet: { type: 'string', coerce: 'none', displayName: 'Source Set', group: 'Image', description: 'A srcset list letting the browser pick a resolution, e.g. "small.png 480w, large.png 1080w"', portability: 'web-only' },
    alt: { type: 'string', default: '', coerce: 'none', displayName: 'Alternate text', group: 'Image', description: "The alt text is used by screen readers, or if the image can't be downloaded or displayed", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    // (Visible, Opacity and Pointer Events Mode are read by the page: the hit test)
  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
  borderBottomColor: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the bottom edge only, overriding Border Color", portability: "look-shared" },
  borderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the bottom edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-bottom-style' },
  borderBottomWidth: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-bottom-width' },
  borderColor: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the border, which has no effect while Border Style is None", portability: "look-shared" },
  borderLeftColor: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the left edge only, overriding Border Color", portability: "look-shared" },
  borderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the left edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-left-style' },
  borderLeftWidth: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-left-width' },
  borderRadius: { type: "number", default: 0, coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds all four corners, except any corner that sets its own radius", portability: "look-shared" },
  borderRightColor: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the right edge only, overriding Border Color", portability: "look-shared" },
  borderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the right edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-right-style' },
  borderRightWidth: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-right-width' },
  borderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "none", coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for all four edges; None hides the border and leaves Border Width and Color inactive", portability: "look-expressible", layout: 'border-style' },
  borderTopColor: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the top edge only, overriding Border Color", portability: "look-shared" },
  borderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the top edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-top-style' },
  borderTopWidth: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-top-width' },
  borderWidth: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", default: 2, coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: "look-shared", layout: 'border-width' },
  boxShadowBlurRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 5, coerce: 'none', displayName: "Blur Radius", group: "Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: "look-expressible" },
  boxShadowColor: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "color", default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Box Shadow", description: "Colour of the shadow, including how transparent it is", portability: "look-expressible" },
  boxShadowEnabled: { type: "boolean", default: false, coerce: 'none', displayName: "Shadow Enabled", group: "Box Shadow", description: "Turns the drop shadow on", portability: "look-expressible" },
  boxShadowInset: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "boolean", default: false, coerce: 'none', displayName: "Inset", group: "Box Shadow", description: "Draws the shadow inside the element instead of behind it", portability: "web-only" },
  boxShadowOffsetX: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 0, coerce: 'none', displayName: "Offset X", group: "Box Shadow", description: "How far to the right the shadow is cast from the element", portability: "look-expressible" },
  boxShadowOffsetY: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 0, coerce: 'none', displayName: "Offset Y", group: "Box Shadow", description: "How far down the shadow is cast from the element", portability: "look-expressible" },
  boxShadowSource: { when: (p) => p.boxShadowEnabled === true, type: "enum", enums: ["custom", "token"], default: "custom", coerce: 'none', displayName: "Shadow Source", group: "Box Shadow", description: "Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together", portability: "look-shared" },
  boxShadowSpreadRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 2, coerce: 'none', displayName: "Spread Radius", group: "Box Shadow", description: "How much larger than the element the shadow is drawn", portability: "look-expressible" },
  boxShadowToken: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource === 'token', type: "string", default: "var(--shadow-md)", coerce: 'none', displayName: "Shadow Token", group: "Box Shadow", description: "The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel", portability: "look-shared" },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
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
  objectFit: { when: (p) => p.sizeMode === 'explicit', type: "enum", enums: ["fill", "contain", "cover", "none", "scale-down"], default: "contain", coerce: 'none', displayName: "Image Fit", group: "Dimensions", description: "How the image fills its box when the two have different proportions; only available with an explicit size", portability: "layout-shared", layout: 'content' },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  pointerEventsMode: { type: "enum", enums: ["inherit", "explicit"], default: "inherit", coerce: 'none', displayName: "Pointer Events Mode", group: "Pointer Events", description: "Whether pointer handling is inherited from the parent or set explicitly on this element", portability: "web-only" },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "contentSize", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared", layout: 'size-mode' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentHeight', type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'width' },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  },

  outputs: {
    // image.ts :138-172 — the picture's outcome (the `fetched` act)
    onLoad: { type: 'signal', displayName: 'On Load', group: 'Events', description: 'Fires once the image has finished downloading and is on screen' },
    onError: { type: 'signal', displayName: 'On Error', group: 'Events', description: 'Fires when the image could not be loaded, after the reason has been reported on Error' },
    imageError: { type: 'string', from: (s: State) => s.imageError, displayName: 'Error', group: 'Error', description: 'Why the image could not be loaded, naming the source that failed' },
  didMount: { type: "signal", displayName: "Did Mount", group: "Mounted", description: "Fires once this element has been added to the page and can be measured" },
  dragCancelled: { when: (p) => p.draggable === true, type: "signal", displayName: "Cancelled", group: "Drag Source", description: "Fires when a lifted element is let go over nothing that takes it, or Escape puts it back" },
  dropped: { when: (p) => p.acceptDrops === true, type: "signal", displayName: "Dropped", group: "Drop Zone", description: "Fires when a Draggable is dropped here, after Dropped Value and Drop Index are up to date. Move the data here — the engine moves nothing" },
  filesDropped: { when: (p) => p.acceptFileDrops === true, type: "signal", displayName: "Files Dropped", group: "File Drop", description: "Fires when one or more accepted files are dropped here, after every File Drop output is up to date" },
  filesRejected: { when: (p) => p.acceptFileDrops === true, type: "signal", displayName: "Files Rejected", group: "File Drop", description: "Fires when a drop landed here but every file in it was excluded by Accepted file types" },
  hoverEnd: { type: "signal", displayName: "Hover End", group: "Hover Events", description: "Fires when the pointer leaves this element" },
  hoverStart: { type: "signal", displayName: "Hover Start", group: "Hover Events", description: "Fires when the pointer moves over this element or any of its children" },
  landed: { when: (p) => p.draggable === true, type: "signal", displayName: "Landed", group: "Drag Source", description: "Fires when this element is dropped on a zone that took it, after the zone's Dropped" },
  onClick: { type: "signal", displayName: "Click", group: "Events", description: "Fires when this element is clicked or tapped" },
  pickedUp: { when: (p) => p.draggable === true, type: "signal", displayName: "Picked Up", group: "Drag Source", description: "Fires when this element is lifted — after the hold on touch, on the first move with a mouse, on Space from the keyboard" },
  pointerDown: { type: "signal", displayName: "Pointer Down", group: "Pointer Events", description: "Fires when a mouse button is pressed or a finger touches this element" },
  pointerEnter: { type: "signal", displayName: "Pointer Enter", group: "Pointer Events", description: "Fires when the pointer moves onto this element, not counting its children" },
  pointerUp: { type: "signal", displayName: "Pointer Up", group: "Pointer Events", description: "Fires when the mouse button is released or the finger lifts over this element" },
  willUnmount: { type: "signal", displayName: "Will Unmount", group: "Mounted", description: "Fires just before this element is removed from the page, while it still exists" },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (image.ts :60)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' },
    // node-shared-port-definitions.ts :1292-1330
    isLifted: { when: (p) => p.draggable === true, type: 'boolean', from: (s: State) => s.isLifted, displayName: 'Is Lifted', group: 'Drag Source', description: 'True while this element is being dragged' },
    droppedValue: { when: (p) => p.acceptDrops === true, type: '*', from: (s: State) => s.droppedValue, displayName: 'Dropped Value', group: 'Drop Zone', description: 'The Drag Value of the element dropped here' },
    dropIndex: { when: (p) => p.acceptDrops === true, type: 'number', from: (s: State) => s.dropIndex, displayName: 'Drop Index', group: 'Drop Zone', description: "Where among this zone's children it landed, counting from 0 and leaving the dropped element itself out — so it is the index to insert at once it is removed from where it was" },
    isDropTarget: { when: (p) => p.acceptDrops === true, type: 'boolean', from: (s: State) => s.isDropTarget, displayName: 'Drag Over', group: 'Drop Zone', description: 'True while something this zone takes is held over it — wire it to a background or border so the zone lights up' },
    // :1079-1135 — read off `_internal`
    droppedFile: { when: (p) => p.acceptFileDrops === true, type: '*', from: (s: State) => s.droppedFile, displayName: 'File', group: 'File Drop', description: 'The first accepted file, in the form an Upload File node takes' },
    droppedFiles: { when: (p) => p.acceptFileDrops === true, type: 'array', from: (s: State) => s.droppedFiles, displayName: 'Files', group: 'File Drop', description: 'Every accepted file in the drop, as an array — a drop can carry more than one' },
    droppedFileName: { when: (p) => p.acceptFileDrops === true, type: 'string', from: (s: State) => firstFile(s, 'name'), displayName: 'File Name', group: 'File Drop', description: 'Name of the first accepted file, extension included' },
    droppedFileType: { when: (p) => p.acceptFileDrops === true, type: 'string', from: (s: State) => firstFile(s, 'type'), displayName: 'File Type', group: 'File Drop', description: 'MIME type the browser reports for the first accepted file, blank for one it does not recognise' },
    droppedFileSizeInBytes: { when: (p) => p.acceptFileDrops === true, type: 'number', from: (s: State) => firstFile(s, 'size'), displayName: 'File Size In Bytes', group: 'File Drop', description: 'Size of the first accepted file, in bytes' },
    isDragOver: { when: (p) => p.acceptFileDrops === true, type: 'boolean', from: (s: State) => s.isDragOver, displayName: 'Is Dragging Over', group: 'File Drop', description: 'True while a file is being dragged over this element — wire it to a border or background so the drop zone reacts' }
  }
}).on(
  {
    // react-component-node.ts :2283-2294 — what the node wants; the page follows at the next paint. The value it holds already: nothing
    mounted: (s, v) =>
      !!v !== s.mounted
        ? { says: 'a change: the element is put on the page, or taken off it, at the next paint', set: { mounted: !!v }, send: [] }
        : { says: 'the value it already holds: nothing', send: [] },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the element can be seen', send: [] }),
    // :366-375
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, it takes no pointer', set: { visible: !!v }, send: [] }),
    // :320-328 — the style holds the value as written; Image.tsx :53-55 compares it with the number 0
    opacity: (_s, v) => ({ says: 'always: how see-through it is; at exactly 0 it takes no pointer, and an act goes to what is behind it', set: { opacityZero: v === 0 }, send: [] }),
    // :772-781 — `inherit` removes the style; anything else writes it from the last Enabled (`auto` before one)
    pointerEventsMode: (s, v) =>
      v === 'inherit'
        ? { says: 'Inherit: its own pointer style comes off', set: { peStyle: undefined }, send: [] }
        : { says: 'Explicit: the last Pointer Events Enabled is written back (on, before one was set)', set: { peStyle: s.peEnabled === false ? 'none' : 'auto' }, send: [] },
    // :787-793 — written whatever the mode
    pointerEventsEnabled: (_s, v) => ({ says: 'always, whatever the mode: off, the pointer passes through to what is behind it', set: { peEnabled: !!v, peStyle: v ? 'auto' : 'none' }, send: [] }),
    // drag-drop.ts `setDraggable`, `elementChanged` — the attributes go on every element the node has while Draggable is on (a
    // remount, a new Tag, a mount however late), and come off the one on the page with it (row C77, fixed in P109 ISL-031)
    draggable: (_s, v) => ({ says: 'always: on, every element it draws can be picked up, by pointer or keyboard; off, the one on the page cannot', set: { draggable: !!v }, send: [] }),
    // read by the zone it is dropped on: this page's only zone is itself, and a drag never takes its own node (C78, fixed in P109 ISL-031)
    dragValue: () => ({ says: 'always: read by the zone it is dropped on, which reports it as Dropped Value', send: [] }),
    dragKind: () => ({ says: 'always: read by a zone with an Accept Kind as it is dragged over one', send: [] }),
    holdToDrag: (_s, v) => ({ says: 'always: read at the next press — whether it must be held before it picks up', set: { holdToDrag: v }, send: [] }),
    holdTime: (_s, v) => ({ says: 'always: read at the next held press — how many seconds it is held before it picks up', set: { holdTime: v }, send: [] }),
    // drag-drop.ts :112-120 — off while the gesture is over this zone: it leaves it (`leaveZone` :489-512)
    acceptDrops: (s, v) => {
      if (v) return { says: 'on: a Draggable can be dropped here', set: { acceptDrops: true }, send: [] };
      if (s.inZone) return { says: 'off while a drag is over it: the drag leaves it — Is Drop Target goes false', set: { acceptDrops: false, inZone: false, isDropTarget: false }, send: ['isDropTarget'] };
      return { says: 'off: nothing can be dropped here', set: { acceptDrops: false }, send: [] };
    },
    acceptKind: (_s, v) => ({ says: 'always: read as a drag comes over it — a source of another kind does not light it up', set: { acceptKind: v }, send: [] }),
    // :958-981 — read at each drag event, never at a render
    // C81 (fixed in P109 ISL-038): switched off, the zone forgets the count and goes dark — it could not hear the leave
    acceptFileDrops: (s, v) =>
      v
        ? { says: 'on: a file dragged from the desktop can be dropped here', set: { acceptFileDrops: true }, send: [] }
        : {
            says: 'off: no file can be dropped here, and a drag over it is forgotten — Is Dragging Over goes false if it was true',
            set: { acceptFileDrops: false, dragDepth: 0, isDragOver: false },
            send: s.isDragOver ? ['isDragOver'] : []
          },
    acceptedFileTypes: (_s, v) => ({ says: 'always: read at a drop — which files count as accepted', set: { acceptedFileTypes: v }, send: [] }),
    // image.ts :104-107 — `resolveMediaSource`; the frame end draws it
    src: (_s, v) => ({ says: 'always: the picture drawn at the end of the frame — a project file, a URL, or nothing', set: { src: mediaSource(v) }, send: [] }),
    srcSet: (_s, v) => ({ says: 'always: the sizes the browser may pick from instead, drawn at the end of the frame', set: { srcSet: v }, send: [] })
  },
  {
    world: {
      // placed on the page with its params set — the first render: Did Mount, unless a Mounted parameter said no
      place: (s) => painted(s),
      // drag-drop.ts :267-269 — the hold timer lifts a gesture still held; :920-927 — the turn that unswallows a click
      timer: (s, _i, tag) => {
        if (tag === 'unswallow') return { set: { swallow: false }, send: [] };
        // the lift tracks where the pointer is: the element the last pointer act landed on, while it is on the page (`lift` :372-375)
        if (tag === 'hold' && s.phase === 'holding') return lifted(s) as Act;
        return NOTHING;
      }
    },
    // every frame's end is a paint (react-component-node.ts :1675-1689)
    afterInputs: (s) => painted(s),
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first, then the act meets what is there
    person: {
      // node-shared-port-definitions.ts :826-848 — Hover Start and Pointer Enter
      hover: (s) => pointerAct(s, (p) => (hits(p) ? { ...NONE, emit: ['hoverStart', 'pointerEnter'] } : NONE)),
      leave: (s) => pointerAct(s, (p) => (hits(p) ? { ...NONE, emit: ['hoverEnd'] } : NONE)),
      press: (s) => pointerAct(s, (p) => {
        const down = pointerDown(p, 'mouse');
        if (!hits(p)) return down;
        const after = { ...p, ...down.set };
        return { ...down, set: { ...down.set, ...takesKeyboard(after) }, emit: [...down.emit, 'pointerDown'] };
      }),
      release: (s) => pointerAct(s, (p) => {
        const up = pointerUp(p, 'mouse');
        return hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up;
      }),
      // the press, the release, then the click — swallowed after a drop until the event loop turns (drag-drop.ts :920-927)
      click: (s) => pointerAct(s, (p) => {
        const down = pointerDown(p, 'mouse');
        const pressedOn: Act = hits(p) ? { ...down, set: { ...down.set, ...takesKeyboard({ ...p, ...down.set }) }, emit: [...down.emit, 'pointerDown'] } : down;
        const mid = { ...p, ...pressedOn.set };
        const up = pointerUp(mid, 'mouse');
        // the click reaches the window first: a swallow waiting there eats it, wherever it lands
        const eaten = { ...mid, ...up.set }.swallow;
        const on: Pulse[] = hits(p) ? (eaten ? ['pointerUp'] : ['pointerUp', 'onClick']) : [];
        return join(pressedOn, { ...up, set: { ...up.set, ...(eaten ? { swallow: false } : {}) }, emit: [...up.emit, ...on] });
      }),
      touch: (s) => pointerAct(s, (p) => {
        const down = pointerDown(p, 'touch');
        return hits(p) ? { ...down, emit: [...down.emit, 'pointerDown'] } : down;
      }),
      lift: (s) => pointerAct(s, (p) => {
        const up = pointerUp(p, 'touch');
        return hits(p) ? { ...up, emit: [...up.emit, 'pointerUp'] } : up;
      }),
      focus: (s) => onPainted(s, (p) => ({ ...NONE, set: takesKeyboard(p) })),
      blur: (s) => onPainted(s, (p) => (holdsKeyboard(p) ? { ...NONE, set: { focusedElem: -1 } } : NONE)),
      key: (s, _i, value) => onPainted(s, (p) => {
        const f = takesKeyboard(p);
        const k = keyDown({ ...p, ...f }, String(value));
        return { ...k, set: { ...f, ...k.set } };
      }),
      // drag-drop.ts :285-306 — a window listener: the pointer's move is heard wherever it lands
      move: (s, _i, value) => pointerAct(s, (p) => pointerMove(p, value === 'touch' ? 'touch' : 'mouse', hits(p))),
      // THE ZONE SIDE — the pointer moves onto nothing: heard by the window wherever the Image is
      away: (s, _i, value) => paintedThen(s, (p) => pointerMove(p, value === 'touch' ? 'touch' : 'mouse', false)),
      // a press on the card (the keyboard goes onto it), then its move: the card lifts when no gesture is under way; else the move is
      // the gesture's pointer moving off the Image
      grab: (s, _i, value) => paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return NONE;
        const off: Partial<State> = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? pointerMove(at, 'mouse', false) : { ...NONE, set: { carry: i, carryBy: 'mouse' as const } };
        return { ...a, set: { ...off, ...a.set } };
      }),
      // the keyboard onto the card, then Space: the card lifts from the keyboard when no gesture is under way; else the key is the gesture's
      pickUp: (s, _i, value) => paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return NONE;
        const off = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? keyDuringGesture(at, ' ') : cardLifted(at, i);
        return { ...a, set: { ...off, ...a.set } };
      }),
      // the drag from the desktop: the browser moves its target first (a leave, then an enter), then a `dragover`
      fileEnter: (s, _i, value) => paintedThen(s, (p) => {
        const carry = p.fileCarry ?? (Array.isArray(value) ? (value as FileLike[]) : []);
        return dragTo({ ...p, fileCarry: carry }, under(p), { fileCarry: carry });
      }),
      fileLeave: (s) => paintedThen(s, (p) => (p.fileCarry === undefined ? NONE : join(dragTo(p, -1), { ...NONE, set: { fileCarry: undefined } }))),
      // :1021-1068 — let go: at the element under it, which takes it only when its last `dragover` was cancelled (armed); else
      // the browser fires a leave there instead. The drag is over either way
      // the browser's fetch of what the element names: nothing without a source on the page; a load, On Load; a failure, Error and On Error
      fetched: (s, _i, value) => onPainted(s, (p) => {
        if (!fetches(p)) return NONE;
        if (value === 'load') return { ...NONE, emit: ['onLoad'] };
        const reason = p.src !== undefined ? 'The image could not be loaded: ' + p.src : 'The image could not be loaded — no Source was set';
        return { set: { imageError: reason }, send: ['imageError'], emit: ['onError'] };
      }),
      fileDrop: (s) => paintedThen(s, (p) => {
        if (p.fileCarry === undefined) return NONE;
        const here = under(p);
        const moved = dragTo(p, here);
        const at = { ...p, ...moved.set };
        const end: Act = { ...NONE, set: { fileCarry: undefined, fileOn: -1 } };
        if (here === -1) return join(moved, end);
        return join(join(moved, armed(at) ? fileDropped(at) : fileLeft(at)), end);
      })
    }
  }
);

/**
 * `resolveMediaSource` (media-source.ts :29-32) then `getAbsoluteUrl` (utils.ts :9-19) with the app's base URL `/`: none for null,
 * nothing or `""`; else the text, after `/` unless it is already absolute, a URL or a data URL.
 */
function mediaSource(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const url = String(v);
  // `getAbsoluteUrl` returns a value that is empty as text (`[]`) as it is, and React 19 writes no empty `src`
  if (url === '') return undefined;
  return url[0] === '/' || url.includes('://') || url.startsWith('data:') ? url : '/' + url;
}

/**
 * The browser fetches for an element with a `src`, or a `srcset` attribute that is not empty (React 19 writes none for null, nothing
 * or a boolean; the runtime leaves a boolean off itself, since React would write `true` on an element it creates — P107-C94).
 */
function fetches(s: Readonly<State>): boolean {
  if (s.src !== undefined) return true;
  const v = s.srcSet;
  return v !== null && v !== undefined && typeof v !== 'boolean' && String(v) !== '';
}

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

/** The element is under the pointer: on the page, not hidden, not `pointer-events: none` (Image.tsx :53-55 beats the style). */
function hits(s: Readonly<State>): boolean {
  return s.onPage && s.visible && !s.opacityZero && s.peStyle !== 'none';
}

/** The element on the page holds the keyboard: the one that took it is still there. */
function holdsKeyboard(s: Readonly<State>): boolean {
  return s.onPage && s.focusedElem === s.elem;
}

/** `el.focus()` — the element takes the keyboard when it has the module's tabindex and can be seen; it keeps it once it has it. */
function takesKeyboard(s: Readonly<State>): Partial<State> {
  if (holdsKeyboard(s)) return {};
  return s.onPage && s.visible && s.draggable ? { focusedElem: s.elem, cardFocused: -1 } : {};
}

/** The card's element takes the keyboard (it has drag-drop.ts's tabindex): off the Image, onto card `i`. */
function cardTakesKeyboard(s: Readonly<State>, i: number): Partial<State> {
  return { focusedElem: -1, cardFocused: i };
}

/** A pointer act on the painted page. */
function pointerAct(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  return onPainted(s, then);
}

/**
 * A paint: the page follows what the node wants (button.ts `painted`). A new element whenever one is made — at a mount (no Tag:
 * the element is always a `<div>`) — which does not hold the keyboard (`focusedElem` names the element that does).
 */
function painted(s: Readonly<State>): { set: Partial<State>; send: Val[]; emit: Pulse[] } {
  if (s.mounted && !s.onPage) return { set: { onPage: true, elem: s.elem + 1 }, send: [], emit: ['didMount'] };
  if (!s.mounted && s.onPage) return { set: { ...fileDark(s).set, onPage: false }, send: fileDark(s).send, emit: ['willUnmount'] };
  return { set: {}, send: [], emit: [] };
}

/** The act on the painted page: nothing to act on when the element is not there; else `then` on the painted state, after the paint's own pulses. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? then(after) : NONE;
  return { ...a, set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...a.emit] };
}

/** The act on the painted page, whether or not the element is there (a drag from the desktop goes on over whatever is). */
function paintedThen(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const a = then({ ...s, ...p.set });
  return { ...a, set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...a.emit] };
}

/** The element a pointer here lands on, if it is this node's (`hits`); -1, something else. */
function under(s: Readonly<State>): number {
  return hits(s) ? s.elem : -1;
}

/**
 * `onPointerMove` (drag-drop.ts :285-306) — the same pointer only: a held press cancels quietly, a pending one lifts; a lifted one of
 * the Image's own finds no zone (a zone inside the source never takes it); a card's tracks the Image (`over`: the pointer lands on it).
 */
function pointerMove(s: Readonly<State>, input: 'mouse' | 'touch', over: boolean): Act {
  if (s.carry >= 0) return s.carryBy === input ? track(s, over) : NONE;
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase === 'holding') return cancelled(s);
  // the node's own lifted drag finds no zone wherever the pointer is (C78, fixed in P109 ISL-031)
  if (s.phase === 'pending') return lifted(s) as Act;
  return NONE;
}

/** One gesture at a time (drag-drop.ts :199-225): the Image's own, or a card's. */
function busy(s: Readonly<State>): boolean {
  return s.phase !== 'idle' || s.carry >= 0;
}

/** The card an act names, by what it carries (its index in `CARDS`), or -1. */
function cardIndex(value: unknown): number {
  const named = JSON.stringify(value);
  return CARDS.findIndex((c) => JSON.stringify(c) === named);
}

/** `track` (:472-484) for a card's gesture: the Image is the zone under the pointer when the pointer lands on it and it is the card's zone. */
function track(s: Readonly<State>, over: boolean): Act {
  const here = over && zoneFor(s);
  if (here === s.inZone) return NONE;
  return { ...NONE, set: { inZone: here, isDropTarget: here }, send: ['isDropTarget'] };
}

/** `keyboardLift` (:841-878) of a card: into the first zone that takes it — the Image, when it is one. */
function cardLifted(s: Readonly<State>, i: number): Act {
  const zone = zoneFor({ ...s, carry: i });
  return { set: { carry: i, carryBy: 'keyboard', ...(zone ? { inZone: true, isDropTarget: true } : {}) }, send: zone ? ['isDropTarget'] : [], emit: [] };
}

/** `fileDropArmed` (:253-261): Accept File Drops on, and the drag carries files. */
function armed(s: Readonly<State>): boolean {
  return s.acceptFileDrops && (s.fileCarry?.length ?? 0) > 0;
}

/** C81 (P109): what a file act always does it always writes — the count, its element and Is Dragging Over as they end up, sent only
 * when they change. A write made only when one changes split each act's branch by whether it did (0 over 0 after a clear). */
function heldDrag(s: Readonly<State>): Partial<State> {
  return { dragDepth: s.dragDepth, depthOn: s.depthOn, isDragOver: s.isDragOver };
}

/** The browser moves the drag's target to `here`: a leave at the element it was over, if that is this node's element on the page, then an enter at `here`. */
function dragTo(s: Readonly<State>, here: number, extra: Partial<State> = {}): Act {
  if (s.fileOn === here) return { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(s) } };
  const left = s.onPage && s.fileOn === s.elem ? fileLeft(s) : NONE;
  const mid = { ...s, ...left.set };
  const entered = here === -1 ? NONE : fileEntered(mid, here);
  const after = { ...mid, ...entered.set };
  return join(join(left, entered), { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(after) } });
}

/** `onDragEnter` (:1009-1019) */
function fileEntered(s: Readonly<State>, here: number): Act {
  if (!armed(s)) return NONE;
  const over = dragOver(s, true);
  // C81 (fixed in P109 ISL-038): the count belongs to the element it counted; an enter on a new one starts it again
  return { ...over, set: { ...over.set, dragDepth: (s.depthOn === here ? s.dragDepth : 0) + 1, depthOn: here } };
}

/** C81 (fixed in P109 ISL-038): the element leaving the page takes the drag with it — the count forgotten, Is Dragging Over false
 * (node-shared-port-definitions.ts `fileDropDark`, from `_fileDropLeftPage`). Written at every leave; sent only when it changes. */
function fileDark(s: Readonly<State>): { set: Partial<State>; send: Val[] } {
  return { set: { dragDepth: 0, isDragOver: false }, send: s.isDragOver ? ['isDragOver'] : [] };
}

/** `onDragLeave` (:1030-1035) */
function fileLeft(s: Readonly<State>): Act {
  if (!armed(s)) return NONE;
  const depth = Math.max(0, s.dragDepth - 1);
  const over = depth === 0 ? dragOver(s, false) : NONE;
  return { ...over, set: { ...over.set, dragDepth: depth } };
}

/** `setDragOver` (:264-269): sent only when it changes. */
function dragOver(s: Readonly<State>, value: boolean): Act {
  return s.isDragOver === value ? NONE : { ...NONE, set: { isDragOver: value }, send: ['isDragOver'] };
}

const FILE_VALUES: Val[] = ['droppedFile', 'droppedFiles', 'droppedFileName', 'droppedFileType', 'droppedFileSizeInBytes'];

/** `onDrop` (:1036-1068) — the count to 0, Is Dragging Over false, the files that pass the filter, then one of the two signals. */
function fileDropped(s: Readonly<State>): Act {
  const over = dragOver(s, false);
  const accepted = (s.fileCarry ?? []).filter((f) => matchesType(f, s.acceptedFileTypes));
  const files: Partial<State> = accepted.length === 0 ? { droppedFiles: [], droppedFile: undefined } : { droppedFiles: accepted, droppedFile: accepted[0] };
  return { set: { ...over.set, dragDepth: 0, ...files }, send: [...over.send, ...FILE_VALUES], emit: [accepted.length === 0 ? 'filesRejected' : 'filesDropped'] };
}

/** `fileMatchesAcceptedTypes` (:293-311) */
function matchesType(file: FileLike, accept: unknown): boolean {
  const patterns = String(accept || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const name = String(file.name || '').toLowerCase();
  const mime = String(file.type || '').toLowerCase();
  return patterns.some((p) => (p.startsWith('.') ? name.endsWith(p) : p.endsWith('/*') ? mime.startsWith(p.slice(0, -1)) : mime === p));
}

/** The File Drop outputs' getters (:1080-1134): a field of the first accepted file, none without one. */
function firstFile(s: Readonly<State>, key: 'name' | 'type' | 'size'): unknown {
  const f = s.droppedFile as FileLike | undefined;
  return f && f[key];
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
  if (busy(s) || !s.draggable || !hits(s)) return NONE;
  if (holds(s, input)) return { set: { phase: 'holding', input }, send: [], emit: [], after: [{ tag: 'hold', ms: holdMs(s) }] };
  return { set: { phase: 'pending', input }, send: [], emit: [] };
}

/** `onPointerUp` (:308-323) — the same pointer only; the window hears it wherever it lands. */
function pointerUp(s: Readonly<State>, input: 'mouse' | 'touch'): Act {
  if (s.carry >= 0) {
    // a card's: tracked where the mouse came up (over the Image, when the hit test finds it), then dropped there
    if (s.carryBy !== input) return NONE;
    const t = track(s, hits(s));
    const d = cardDrop({ ...s, ...t.set });
    return join(t, { ...d, set: { ...d.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] });
  }
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  // let go of its own lifted drag: never over a zone that takes it — its own node is not one (C78, fixed in P109 ISL-031) — so a cancel
  const c = cancelled(s);
  return { ...c, set: { ...c.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] };
}

/** `drop` (:379-399) of a card: on the Image, its Drag Value and Drop Index 0, then Dropped, and the zone left; over none, the card's cancel. */
function cardDrop(s: Readonly<State>): Act {
  if (!s.inZone) return { ...NONE, set: { carry: -1, carryBy: undefined } };
  return {
    set: { carry: -1, carryBy: undefined, inZone: false, droppedValue: CARDS[s.carry].dragValue, dropIndex: 0, isDropTarget: false },
    send: ['droppedValue', 'dropIndex', 'isDropTarget'],
    emit: ['dropped']
  };
}

/** `cancel` (:401-409) of a card's gesture: the zone left; the Cancelled is the card's. */
function cardCancelled(s: Readonly<State>): Act {
  return { set: { carry: -1, carryBy: undefined, ...(s.inZone ? { inZone: false, isDropTarget: false } : {}) }, send: s.inZone ? ['isDropTarget'] : [], emit: [] };
}

/** What `finish` (:418-436) leaves of the gesture. */
function ended(): Partial<State> {
  return { phase: 'idle', input: undefined };
}

/** `lift` (:355-376): Is Lifted, then Picked Up. */
function lifted(_s: Readonly<State>): Send {
  return { set: { phase: 'lifted', isLifted: true }, send: ['isLifted'], emit: ['pickedUp'] };
}

/** `cancel` (:401-409): the gesture ends; a lifted one says Cancelled. */
function cancelled(s: Readonly<State>): Act {
  // its own drag is never in a zone (C78, fixed in P109 ISL-031)
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  return { set: { ...ended(), isLifted: false }, send: ['isLifted'], emit: ['dragCancelled'], cancel: ['hold'] };
}

/** `accepts` (:166-171): no Accept Kind takes anything; else the source's Drag Kind — the card's, or its own — trimmed, among the kinds. */
function acceptsSource(s: Readonly<State>): boolean {
  const wanted = String(s.acceptKind || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (wanted.length === 0) return true;
  const kind = CARDS[s.carry].dragKind;
  return wanted.includes(String(kind || '').trim());
}

/** This node is an armed zone on the page that takes the gesture's source — itself, or the card (`orderedZones` :753-766, `zoneAt` :446-464). */
function zoneFor(s: Readonly<State>): boolean {
  // a card's: never its own gesture — a drag never takes its own node as its zone (C78, fixed in P109 ISL-031)
  return s.carry >= 0 && s.acceptDrops && s.onPage && acceptsSource(s);
}

/** `onKeyDown` (:768-839) — a key reaches the document wherever the keyboard is. */
function keyDown(s: Readonly<State>, key: string): Act {
  if (!busy(s)) {
    // Space on a card that holds the keyboard (the Image did not take it): the card's `keyboardLift`
    if (key === ' ' && !holdsKeyboard(s) && s.cardFocused >= 0) return cardLifted(s, s.cardFocused);
    if (key !== ' ' || !holdsKeyboard(s) || !s.draggable) return NONE;
    // Space on the live, Draggable element that holds the keyboard: `keyboardLift` — never into itself (C78, fixed in P109 ISL-031),
    // and no other zone on this page takes it
    // it holds the keyboard: written whether the key act just put it there or it was there (one branch either way)
    return { set: { phase: 'lifted', input: 'keyboard', isLifted: true, focusedElem: s.elem, cardFocused: -1 }, send: ['isLifted'], emit: ['pickedUp'] };
  }
  return keyDuringGesture(s, key);
}

/** A key while a gesture is under way — the Image's own or a card's (`onKeyDown` :783-839). */
function keyDuringGesture(s: Readonly<State>, key: string): Act {
  const card = s.carry >= 0;
  const input = card ? s.carryBy : s.input;
  const lifted = card || s.phase === 'lifted';
  if (input !== 'keyboard') return key === 'Escape' && lifted ? (card ? cardCancelled(s) : cancelled(s)) : NONE;
  // C83 (fixed in P109 ISL-038): a zone taken off the page under the carried card is left at the next key (drag-drop.ts
  // `onKeyDown`, `liveElement`) — Drag Over false — so Enter or Space cancels and an arrow key looks only at the zones on the page
  if (s.inZone && !s.onPage) {
    const gone: Act = { set: { inZone: false, isDropTarget: false }, send: ['isDropTarget'], emit: [] };
    return join(gone, keyDuringGesture({ ...s, ...gone.set }, key));
  }
  switch (key) {
    case 'Enter':
    case ' ':
      return card ? cardDrop(s) : cancelled(s);
    case 'Escape':
    case 'Tab':
      return card ? cardCancelled(s) : cancelled(s);
    case 'ArrowRight':
    case 'ArrowLeft':
      // the zones in reading order: the Image, if it takes the source now (a zone switched on mid-drag is entered)
      return !s.inZone && zoneFor(s) ? { set: { inZone: true, isDropTarget: true }, send: ['isDropTarget'], emit: [] } : NONE;
    default:
      return NONE;
  }
}
