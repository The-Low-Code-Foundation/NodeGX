/**
 * Group (`Group`) — read from `packages/noodl-viewer-react/src/nodes/visual/group.ts`, `components/visual/Group/Group.tsx` (the
 * component), `focus-tracker.ts` (Focused and Focus Lost), `react-component-node.ts` (`withInnerComponent` :2014-2031,
 * `outcomeOnInnerComponent` :2032-2056, the inner ref :1044-1048, `updateChildrenCount` :1628-1638, what every visual node
 * shares), `node-shared-port-definitions.ts` (the pointer, file-drop and drag ports — the Text's), `pointerlisteners.ts` and
 * `drag-drop.ts` on 2026-10-06 (NSP-016 s52).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Group is the Text's element with CHILDREN instead of a string (Group.tsx render — the tag Tag
 * names, `as || 'div'`). Everything the Text spec (text.ts) says of the pointer, the keyboard, the drag, the zone side and the drag
 * from the desktop holds here word for word (the same shared ports, the same `drag-drop.ts`, the same opacity rule, Group.tsx
 * `style.opacity === 0`), and is not repeated. What the Group adds:
 *
 *   - **its children** (`CHILDREN`, the values of `tap`): the page puts three Texts inside it before the first render — `one`,
 *     `two` placed Position Absolute, `three` — with the Group's own `addChild`. **Children Count** is 3, sent in the first frame
 *     (`updateChildrenCount` counts the node's children, mounted or not). A person can `tap` one: a click on the child, which
 *     reaches the Group as a click on it does (React's events bubble: Pointer Down, Pointer Up, Click; the hit test is the
 *     Group's, as a child inherits `visibility` and `pointer-events`), and the press puts the keyboard on the Group when it can
 *     take it (a browser focuses the nearest focusable ancestor), else takes it off whatever held it.
 *   - **Drop Index counts the slots** (drag-drop.ts `slots` :531-541): the zone element's laid-out children, the dragged element
 *     left out, a child Position Absolute or Fixed left out — two here. A card picked up from the KEYBOARD starts where it already
 *     is (`keyboardLift` :858-866): it is not inside the Group, and every slot comes before it on the page, so at index 2; the
 *     Group's own keyboard lift starts at 0 (its children are inside it, not before it). **ArrowDown / ArrowUp** move the index
 *     one place, held between 0 and the slot count (:803-807); ArrowRight / ArrowLeft entering the Group starts at 0 (`keep` is
 *     -1 outside a zone, :813-816). Enter or Space drops it there: Drop Index is the index. A POINTER drop's index is where the
 *     pointer comes up among the children (`indexAt` :573-585, geometry): a face choice, written down — every act's pointer is at
 *     (0, 0), before the middle of every child, so a pointer drop's Drop Index is 0 (graded with geometry after NSP-017).
 *   - **Focus, Focused, Focus Lost** (focus-tracker.ts; group.ts `focus`, `_focus`, `_blur`): a Group is not focusable, so the
 *     viewer keeps a LIST of the focused nodes. The Focus action lists it — Focused when it was not listed — and reports Done.
 *     Off the page it reports Unchanged and lists nothing, as a field's Focus does (R16, after R13: a Focus is not kept for later).
 *     (group.ts `_canFocus`, the inner component existing; the Unchanged port — v3. Row **C95**: the runtime listed it and
 *     reported Done, fixed in P109 ISL-038.) A person's click is walked from the element it landed on up through
 *     its ancestors (`onClickCapture` :118-136): a click on the Group or a child lists it (Focused when it was not), a click
 *     anywhere else drops it (Focus Lost when it was listed). The walk finds the Group by the property its component puts on
 *     EVERY element it draws (Group.tsx `rootRef`), a new Tag's element too — v3 (row **C86**, fixed in P109 ISL-038: the
 *     component stamped only the element it mounted with, so a click after a new Tag counted as a click elsewhere). Leaving the page
 *     drops it from the list without a Focus Lost (`nodeUnmounted`, react-component-node.ts :1013). A click the drag module
 *     swallows (text.ts) reaches neither the walk nor Click: the swallow is the window's, the walk the app root's.
 *   - **Scroll To Index, Scroll To Element** (group.ts :98-148): each runs after the frame's inputs (`scheduleAfterInputsHaveUpdated`,
 *     reading Index or Element THEN), on the component when there is one (the inner ref, set while the Group is on the page), else
 *     waiting for it (`withInnerComponent`): the waiting ones run, in order, at the paint that puts the Group on the page. At most 16
 *     wait; the 17th pushes the oldest out, which reports Failure. Scroll To Index: Done when the element has a child at Index (an
 *     HTMLCollection read with the property key Index makes: a canonical array index below 3), else Failure. Scroll To Element:
 *     Done for nothing on Element (`if (!noodlChild) return undefined` — it scrolled nothing), else Failure (a value is not a node;
 *     a reference to another node is not yet a trace value). **When the frame's work runs** (pointerlisteners.ts :173-186): every
 *     pointer handler on the page drains every dirty node — the Group's, a child's, a card's — and so does the drag module's
 *     `flush` (a lift, a zone entered or left, a drop, a lifted drag's cancel). So an act that reaches a handler or moves the drag
 *     runs the frame's scrolls at the act; one that does neither leaves them for the frame's end. The trace prints a frame's
 *     outcomes together, in the order they were resolved, so what an act resolves is held (`ran`) and reported first at the frame's
 *     end — and a Focus that comes after it waits behind it.
 *   - The Scroll outputs come only from the non-native scroller's events, which no act here makes; **Scroll Position**, **Scroll
 *     Start** and **Scroll End** are never sent. **Layout** is the style's (an invalid one is raised, not sent).
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';

type Phase = 'idle' | 'pending' | 'holding' | 'lifted';
type ScrollOp = 'scrollToIndex.do' | 'scrollToElement.do';

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element is on the page: mounted and painted (the inner component and its ref exist) */
  onPage: boolean;
  /** Group.tsx render — the element type the next paint draws: `props.as || 'div'` */
  tag: unknown;
  /** the element type the element on the page was made with; a NEW element is made when it changes */
  shownTag: unknown;
  /** which element is on the page — a new one each time one is made (a mount, a new tag) */
  elem: number;
  /** the element that carries the node for the focus tracker's walk (Group.tsx `rootRef`: every element it draws); -1: none */
  stampOn: number;
  /** the focus tracker lists the Group (focus-tracker.ts `nodes`) */
  listed: boolean;
  /** the element that holds the keyboard (`document.activeElement`), or -1 — a new element never does (row C77, P109 s31: so a paint
   * writes nothing about the keyboard) */
  focusedElem: number;
  /** the hit test (Group.tsx `style.opacity === 0`, node-shared-port-definitions.ts :366-375, :772-793) */
  visible: boolean;
  opacityZero: boolean;
  peStyle: 'auto' | 'none' | undefined;
  peEnabled: boolean | undefined;
  /** Block Pointer Events, as the last paint drew it: a blocker on every pointer event, each wrapped with the drain (pointerlisteners.ts :113-133) */
  blocks: boolean;
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
  /** the gesture's index in this zone (`g.index`): -1 while it is in none */
  index: number;
  /** THE ZONE SIDE — the card whose gesture it is (its index in `CARDS`; -1: none), and what lifted it */
  carry: number;
  carryBy: 'mouse' | 'keyboard' | undefined;
  /** the card that holds the keyboard, its index in `CARDS`; -1: none */
  cardFocused: number;
  /** :920-927 — a click is swallowed until the event loop turns */
  swallow: boolean;
  /** the outputs */
  isLifted: boolean;
  isDropTarget: boolean;
  droppedValue: unknown;
  dropIndex: unknown;
  /** file drop (`_internal`, node-shared-port-definitions.ts :956-1137) */
  acceptFileDrops: boolean;
  acceptedFileTypes: unknown;
  dragDepth: number;
  /** the element the count belongs to: an enter on another starts it again (C81, fixed in P109); -1: none */
  depthOn: number;
  isDragOver: boolean;
  droppedFiles: unknown;
  droppedFile: unknown;
  fileCarry: readonly FileLike[] | undefined;
  fileOn: number;
  /** group.ts :129-146 — `_internal.scrollIndex` (default 0) and `_internal.scrollElement` */
  scrollIndex: unknown;
  scrollElement: unknown;
  /** the frame's scheduled scrolls (`scheduleAfterInputsHaveUpdated`), in order: each reads Index or Element when it runs */
  scheduled: readonly ScrollOp[];
  /** the scrolls waiting for the component (`_pendingInnerActions`, at most 16): each with the Index or Element it read */
  waiting: ReadonlyArray<{ readonly op: ScrollOp; readonly arg: unknown }>;
  /**
   * the outcomes resolved since the frame began and not yet reported — a scroll an act ran, a waiting one a mount at an act ran, and
   * a Focus that came after them: the trace prints a frame's outcomes together, in the order they were resolved, so the frame's end
   * reports them first (docblock)
   */
  ran: readonly Resolved[];
};

type FileLike = { readonly name?: unknown; readonly type?: unknown; readonly size?: unknown };

type O = typeof Group extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse =
  | 'didMount'
  | 'willUnmount'
  | 'onClick'
  | 'pointerDown'
  | 'pointerUp'
  | 'pointerEnter'
  | 'hoverStart'
  | 'hoverEnd'
  | 'pickedUp'
  | 'landed'
  | 'dragCancelled'
  | 'dropped'
  | 'filesDropped'
  | 'filesRejected'
  | 'focused'
  | 'focusLost';
type Val = 'isLifted' | 'isDropTarget' | 'droppedValue' | 'dropIndex' | 'isDragOver' | 'droppedFile' | 'droppedFiles' | 'droppedFileName' | 'droppedFileType' | 'droppedFileSizeInBytes' | 'childrenCount';
type Resolved = { port: ScrollOp | 'focus'; outcome: 'done' | 'failure' | 'unchanged'; error?: string };
type Act = { set: Partial<State>; send: Val[]; emit: Pulse[]; after?: Array<{ ms: unknown; tag: string }>; cancel?: string[]; outcomes?: Resolved[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { set: {}, send: [], emit: [] };
/** react-component-node.ts :2028 — the most actions that wait for the component */
const WAIT_CAP = 16;
const KEYS = [' ', 'Enter', 'Escape', 'Tab', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'x'] as const;
const PNG = { $file: { name: 'photo.PNG', type: 'image/png', size: 3 } };
const PDF = { $file: { name: 'notes.pdf', type: 'application/pdf', size: 5 } };
const BARE = { $file: { name: 'README', type: '', size: 0 } };
const FILE_DRAGS = [[PNG], [PDF], [PNG, PDF], [BARE], []] as const;
/** THE ZONE SIDE — the Draggable cards on the page beside the Group (the Text's) */
const CARDS: ReadonlyArray<{ readonly dragValue: unknown; readonly dragKind?: string }> = [{ dragValue: 'card-1', dragKind: 'card' }, { dragValue: 7, dragKind: ' task ' }, { dragValue: 'loose' }];
/** THE CHILDREN — three Texts the page puts inside the Group (the values of `tap`): the second placed Position Absolute */
const CHILDREN: ReadonlyArray<{ readonly text: string; readonly position?: string }> = [{ text: 'one' }, { text: 'two', position: 'absolute' }, { text: 'three' }];
/** `slots` (drag-drop.ts :531-541): the laid-out children — Position Absolute or Fixed left out */
const SLOTS = CHILDREN.filter((c) => c.position !== 'absolute' && c.position !== 'fixed').length;

const FAILED_TO_MOUNT =
  'This action waited for the element to exist and was discarded after 16 more arrived behind it, so it never ran — the element has not mounted';

export const Group = defineNode({
  type: 'Group',
  // v1 (NSP-016 s52): the Text's rules (text.ts v5) on an element with children; the slots, the focus tracker, the scroll actions
  // v2 (s53, R16): a Focus off the page reports Unchanged and lists nothing, as a field's does (the runtime's Done is row C95)
  // v3 (P109 ISL-038, s29): the Unchanged outcome port (C95: group.ts reports it now), and a new Tag's element carries the node (C86)
  // v4 (P109 ISL-038, s29): a key during a keyboard carry leaves a zone taken off the page first, so Space cancels (row C83)
  // v5 (P109 ISL-038, s29): a file drop zone tracks itself — an enter on a new element starts the count again, and Accept File Drops off or leaving the page turns Is Dragging Over off (row C81)
  // v6 (P109 ISL-031, s30): a drag never takes its own node as its zone — a keyboard lift does not start in itself, Enter or Space then cancels, and a pointer drag over a new element of its own finds no zone (row C78)
  // v7 (P109 ISL-031, s30–31): every element of a Draggable node takes the keyboard — a remount, a new Tag or a mount however late gets the attributes (row C77); which element is on the page is the paint's sync (`synced`), and the keyboard is held by an element (`focusedElem`), so a paint writes nothing about it
  version: 7,
  source: 'packages/noodl-viewer-react/src/nodes/visual/group.ts',
  needs: ['person', 'clock'],
  // the page's syncs (spec.ts `synced`): which element is on the page, written only by a paint. Not branches (row C77, P109 s31):
  // with every element of a Draggable taking the keyboard, whether an act's paint or the frame end made the element is not a branch
  synced: ['onPage', 'elem', 'stampOn', 'shownTag'],
  worldPool: { advances: [0, 1, 499, 500, 1000] },
  // group.ts `outcomeOutputs({ done, failure, unchanged })` — Focus, Scroll To Element and Scroll To Index share them; only Focus is Unchanged
  outcomes: ['done', 'failure', 'unchanged'],

  state: {
    mounted: true,
    onPage: false,
    tag: 'div',
    shownTag: 'div',
    elem: 0,
    stampOn: -1,
    listed: false,
    focusedElem: -1,
    visible: true,
    opacityZero: false,
    peStyle: undefined,
    peEnabled: undefined,
    blocks: false,
    draggable: false,
    holdToDrag: undefined,
    holdTime: undefined,
    acceptDrops: false,
    acceptKind: undefined,
    phase: 'idle',
    input: undefined,
    inZone: false,
    index: -1,
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
    scrollIndex: 0,
    scrollElement: undefined,
    scheduled: [],
    waiting: [],
    ran: []
  } as State,

  acts: {
    hover: { description: 'the pointer moves onto the group' },
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
    away: { description: 'the mouse, or the finger that is down, moves off it onto nothing by more than a few pixels', values: ['mouse', 'touch'] },
    tap: { description: 'a click on the child inside it that shows this text (the second is placed Position Absolute)', values: CHILDREN },
    clickAway: { description: 'a click on the page beside it, on nothing that takes the keyboard' }
  },

  inputs: {
    // ---- logic ----
    // react-component-node.ts :2276-2295
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind', portability: 'logic', layout: 'present' },
    // group.ts :198-207 — the focus tracker (docblock)
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Focus', description: 'Gives this group keyboard focus, so key events reach it', portability: 'logic' },
    // group.ts :86-148 — the scroll actions (docblock); Duration moves no output
    'scrollToElement.do': { type: 'signal', outcome: true, displayName: 'Scroll To Element', group: 'Scroll To Element', description: 'Scrolls to the element on Element; fired in the same frame the Group mounts, it is held until the Group exists rather than dropped', portability: 'logic' },
    'scrollToElement.duration': { type: 'number', default: 500, coerce: 'none', displayName: 'Duration', group: 'Scroll To Element', description: 'How long the scroll animation takes, in milliseconds; 0 jumps', portability: 'logic' },
    'scrollToElement.element': { type: 'reference', coerce: 'none', displayName: 'Element', group: 'Scroll To Element', description: "Which element to scroll to, taken from another node's DOM Element output", portability: 'logic' },
    'scrollToIndex.do': { type: 'signal', outcome: true, displayName: 'Scroll To Index', group: 'Scroll To Index', description: 'Scrolls to the child at Index, then fires Done — or Failure with the reason it could not', portability: 'logic' },
    'scrollToIndex.duration': { type: 'number', default: 500, coerce: 'none', displayName: 'Duration', group: 'Scroll To Index', description: 'How long the scroll animation takes, in milliseconds; 0 jumps', portability: 'logic' },
    'scrollToIndex.index': { type: 'number', default: 0, coerce: 'none', displayName: 'Index', group: 'Scroll To Index', description: 'Zero-based index of the child to scroll to', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts :784-793, :800-822
    pointerEventsEnabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Pointer Events Enabled', group: 'Pointer Events', description: 'When disabled, mouse and touch events pass through to whatever is behind this element', portability: 'logic' },
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands here from reaching the nodes this one sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click here also fires Click on the nodes this one sits inside. Automatic keeps it here as soon as this node's own Click is connected, so a button inside a clickable card runs the button and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not. Note that an element at zero opacity takes no pointer events at all", portability: 'logic' },
    // :1146-1218 — the drag source
    draggable: { type: 'boolean', default: false, coerce: 'none', displayName: 'Draggable', group: 'Drag Source', description: 'Lets a person pick this element up and drop it on an element with Accept Drops on. A see-through copy follows the pointer; the element itself stays put until the graph moves it', portability: 'logic' },
    dragValue: { type: '*', coerce: 'none', displayName: 'Drag Value', group: 'Drag Source', description: 'What this element carries — usually the id of the item it shows. A drop zone reports it as Dropped Value', portability: 'logic' },
    dragKind: { type: 'string', coerce: 'none', displayName: 'Drag Kind', group: 'Drag Source', description: 'Optional name for what this is — "card", "task". A zone with an Accept Kind only takes sources whose Drag Kind matches', portability: 'logic' },
    holdToDrag: { type: 'enum', enums: ['touch', 'always', 'never'], default: 'touch', coerce: 'none', displayName: 'Hold To Drag', group: 'Drag Source', description: 'Whether a press must be held before it picks up. On touch (the default) a finger holds for Hold Time while a ring fills, so a moving finger still scrolls; a mouse picks up as soon as it moves', portability: 'logic' },
    holdTime: { type: 'number', default: 0.5, coerce: 'none', displayName: 'Hold Time', group: 'Drag Source', description: 'How long a held press takes to pick up, in seconds', portability: 'logic' },
    // :1209-1262 — the drop zone
    acceptDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept Drops', group: 'Drop Zone', description: 'Lets a Draggable element be dropped here, which reveals the Drop Zone outputs. The innermost zone under the pointer takes the drop', portability: 'logic' },
    acceptKind: { type: 'string', coerce: 'none', displayName: 'Accept Kind', group: 'Drop Zone', description: 'Comma-separated Drag Kinds this zone takes; leave blank to take any Draggable. A source of another kind never lights this zone up', portability: 'logic', examples: ['card', 'task, card', 'note', ''] },
    makeRoom: { type: 'boolean', default: true, coerce: 'none', displayName: 'Make Room', group: 'Drop Zone', description: 'Slides the children apart to open a gap where the drop will land, while it hovers. Off keeps the children still and only reports Drop Index', portability: 'logic' },
    dropZoneName: { type: 'string', coerce: 'none', displayName: 'Zone Name', group: 'Drop Zone', description: "What a screen reader hears this zone called while a card is moved with the keyboard — \"Thursday\". Falls back to the element's accessible label", portability: 'logic' },
    // :956-982 — file drop
    acceptFileDrops: { type: 'boolean', default: false, coerce: 'none', displayName: 'Accept File Drops', group: 'File Drop', description: 'Lets a file dragged from the desktop be dropped onto this element, which reveals the File Drop outputs below', portability: 'logic' },
    acceptedFileTypes: { type: 'string', coerce: 'none', displayName: 'Accepted file types', group: 'File Drop', description: 'Comma-separated extensions or MIME types this element will take — ".png, .jpg" or "image/*"; leave blank to accept every file. A drop of nothing but rejected files fires Files Rejected instead of Files Dropped', portability: 'logic', examples: ['.png', 'image/*', ' .PDF , image/', 'application/pdf', ''] },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    // (Tag, Visible, Opacity and Pointer Events Mode are read by the page: the element's type and the hit test)
    alignContent: { type: "enum", enums: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"], coerce: 'none', displayName: "Align Content", group: "Layout", description: "Where the wrapped lines sit as a group; only applies once Multi Line Wrap is on", portability: "layout-not-shared" },
    alignItems: { type: "enum", enums: ["flex-start", "flex-end", "center", "stretch"], default: "flex-start", coerce: 'none', displayName: "Align Items", group: "Align and justify content", description: "Where children sit across the layout direction", portability: "layout-shared", layout: 'cross-align' },
    alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
    alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
    as: { type: "enum", enums: ["div", "section", "article", "aside", "nav", "header", "footer", "main", "span"], default: "div", coerce: 'none', displayName: "Tag", group: "Advanced HTML", description: "HTML element to render as, which changes nothing visually but matters for screen readers and SEO", portability: "web-only" },
    backdropBlur: { type: "number", default: 0, coerce: 'none', displayName: "Backdrop Blur", group: "Style", description: "Blurs whatever is painted BEHIND this element, so a translucent panel reads as frosted glass over the ground it sits on. Needs a see-through Background Color to show at all", portability: "web-only" },
    backgroundColor: { type: "color", default: "transparent", coerce: 'none', displayName: "Background Color", group: "Style", description: "Fill colour behind the children", portability: "look-shared" },
    backgroundGradient: { type: "string", coerce: 'none', displayName: "Gradient", group: "Style", description: "A CSS gradient painted as the ground — normally a design token such as \"var(--gradient-brand)\". It is drawn ON TOP of Background Image, which is what makes it usable as a legibility scrim", portability: "look-expressible" },
    backgroundImage: { type: "image", coerce: 'none', displayName: "Background Image", group: "Style", description: "A picture painted behind the children. Combine it with Background Gradient to lay a scrim over the picture so text on top stays readable", portability: "look-expressible" },
    backgroundPosition: { type: "enum", enums: ["center", "top center", "bottom center", "center left", "center right"], default: "center", coerce: 'none', displayName: "Background Position", group: "Style", description: "Which part of the picture stays in view when Cover crops it", portability: "look-expressible" },
    backgroundSize: { type: "enum", enums: ["cover", "contain", "auto"], default: "cover", coerce: 'none', displayName: "Background Size", group: "Style", description: "How the background picture fills the box. Cover crops it to fill; contain fits it whole", portability: "look-expressible" },
    borderBottomColor: { type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the bottom edge only, overriding Border Color", portability: "look-shared" },
    borderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-left corner only, overriding Corner Radius", portability: "look-shared" },
    borderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-right corner only, overriding Corner Radius", portability: "look-shared" },
    borderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the bottom edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-bottom-style' },
    borderBottomWidth: { type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-bottom-width' },
    borderColor: { type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the border, which has no effect while Border Style is None", portability: "look-shared" },
    borderLeftColor: { type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the left edge only, overriding Border Color", portability: "look-shared" },
    borderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the left edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-left-style' },
    borderLeftWidth: { type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-left-width' },
    borderRadius: { type: "number", default: 0, coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds all four corners, except any corner that sets its own radius", portability: "look-shared" },
    borderRightColor: { type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the right edge only, overriding Border Color", portability: "look-shared" },
    borderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the right edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-right-style' },
    borderRightWidth: { type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-right-width' },
    borderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "none", coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for all four edges; None hides the border and leaves Border Width and Color inactive", portability: "look-expressible", layout: 'border-style' },
    borderTopColor: { type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the top edge only, overriding Border Color", portability: "look-shared" },
    borderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-left corner only, overriding Corner Radius", portability: "look-shared" },
    borderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-right corner only, overriding Corner Radius", portability: "look-shared" },
    borderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the top edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-top-style' },
    borderTopWidth: { type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-top-width' },
    borderWidth: { type: "number", default: 2, coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: "look-shared", layout: 'border-width' },
    boxShadowBlurRadius: { type: "number", default: 5, coerce: 'none', displayName: "Blur Radius", group: "Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: "look-expressible" },
    boxShadowColor: { type: "color", default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Box Shadow", description: "Colour of the shadow, including how transparent it is", portability: "look-expressible" },
    boxShadowEnabled: { type: "boolean", default: false, coerce: 'none', displayName: "Shadow Enabled", group: "Box Shadow", description: "Turns the drop shadow on", portability: "look-expressible" },
    boxShadowInset: { type: "boolean", default: false, coerce: 'none', displayName: "Inset", group: "Box Shadow", description: "Draws the shadow inside the element instead of behind it", portability: "web-only" },
    boxShadowOffsetX: { type: "number", default: 0, coerce: 'none', displayName: "Offset X", group: "Box Shadow", description: "How far to the right the shadow is cast from the element", portability: "look-expressible" },
    boxShadowOffsetY: { type: "number", default: 0, coerce: 'none', displayName: "Offset Y", group: "Box Shadow", description: "How far down the shadow is cast from the element", portability: "look-expressible" },
    boxShadowSource: { type: "enum", enums: ["custom", "token"], default: "custom", coerce: 'none', displayName: "Shadow Source", group: "Box Shadow", description: "Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together", portability: "look-shared" },
    boxShadowSpreadRadius: { type: "number", default: 2, coerce: 'none', displayName: "Spread Radius", group: "Box Shadow", description: "How much larger than the element the shadow is drawn", portability: "look-expressible" },
    boxShadowToken: { type: "string", default: "var(--shadow-md)", coerce: 'none', displayName: "Shadow Token", group: "Box Shadow", description: "The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel", portability: "look-shared" },
    boxSizing: { type: "enum", enums: ["border-box", "content-box"], default: "border-box", coerce: 'none', displayName: "Box Sizing", group: "Margin and padding", description: "Whether Width and Height include this element's padding and border, or only its content", portability: "web-only" },
    clip: { type: "boolean", default: false, coerce: 'none', displayName: "Clip Content", group: "Layout", description: "Hides any child that overflows the group instead of letting it spill out", portability: "layout-shared", layout: 'clip' },
    columnGap: { type: "number", default: 0, coerce: 'none', displayName: "Horizontal Gap", group: "Layout", description: "Space between children on the horizontal axis", portability: "layout-shared", layout: 'gap-column' },
    cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
    dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
    flexDirection: { type: "enum", enums: ["none", "column", "row"], default: "column", coerce: 'none', displayName: "Layout", group: "Layout", description: "How children are stacked: None positions them absolutely, Vertical stacks them down, Horizontal across", portability: "layout-shared", layout: 'axis' },
    flexWrap: { type: "enum", enums: ["nowrap", "wrap", "wrap-reverse"], default: "nowrap", coerce: 'none', displayName: "Multi Line Wrap", group: "Layout", description: "Lets children wrap onto another line when they do not fit on one", portability: "layout-not-shared" },
    height: { type: "dimension", default: 100, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'height' },
    justifyContent: { type: "enum", enums: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"], default: "flex-start", coerce: 'none', displayName: "Justify Content", group: "Align and justify content", description: "Where children sit along the layout direction when they do not fill it", portability: "layout-shared", layout: 'main-align' },
    marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
    marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
    marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
    marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
    maxHeight: { type: "number", coerce: 'none', displayName: "Max Height", group: "Dimension Constraints", description: "Largest height the element may grow to, taking priority over Height", portability: "layout-shared", layout: 'max-height' },
    maxWidth: { type: "number", coerce: 'none', displayName: "Max Width", group: "Dimension Constraints", description: "Largest width the element may grow to, taking priority over Width", portability: "layout-shared", layout: 'max-width' },
    minHeight: { type: "number", coerce: 'none', displayName: "Min Height", group: "Dimension Constraints", description: "Smallest height the element may shrink to, taking priority over Height", portability: "layout-shared", layout: 'min-height' },
    minWidth: { type: "number", coerce: 'none', displayName: "Min Width", group: "Dimension Constraints", description: "Smallest width the element may shrink to, taking priority over Width", portability: "layout-shared", layout: 'min-width' },
    mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
    nativeScroll: { type: "boolean", default: true, coerce: 'none', displayName: "Native platform scroll", group: "Scroll", description: "Uses the browser's own scrolling, which is smoother; turn it off to get snapping and the Scroll To actions", portability: "web-only" },
    opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
    paddingBottom: { type: "number", default: 0, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: "layout-shared", layout: 'padding-bottom' },
    paddingLeft: { type: "number", default: 0, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: "layout-shared", layout: 'padding-left' },
    paddingRight: { type: "number", default: 0, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: "layout-shared", layout: 'padding-right' },
    paddingTop: { type: "number", default: 0, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: "layout-shared", layout: 'padding-top' },
    pointerEventsMode: { type: "enum", enums: ["inherit", "explicit"], default: "inherit", coerce: 'none', displayName: "Pointer Events Mode", group: "Pointer Events", description: "Whether pointer handling is inherited from the parent or set explicitly on this element", portability: "web-only" },
    position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
    rowGap: { type: "number", default: 0, coerce: 'none', displayName: "Vertical Gap", group: "Layout", description: "Space between children on the vertical axis", portability: "layout-shared", layout: 'gap-row' },
    scrollBounceEnabled: { type: "boolean", default: true, coerce: 'none', displayName: "Bounce at boundaries", group: "Scroll", description: "Lets the content overscroll and spring back at the ends", portability: "layout-not-shared" },
    scrollEnabled: { type: "boolean", default: false, coerce: 'none', displayName: "Enable Scroll", group: "Scroll", description: "Lets the user scroll the children when they do not all fit", portability: "layout-shared", layout: 'scroll' },
    scrollSnapEnabled: { type: "boolean", default: false, coerce: 'none', displayName: "Snap", group: "Scroll", description: "Makes scrolling settle on item boundaries rather than anywhere", portability: "layout-expressible" },
    scrollSnapToEveryItem: { type: "boolean", default: false, coerce: 'none', displayName: "Snap To Every Item", group: "Scroll", description: "Snaps to each item in turn instead of allowing a fast flick past several", portability: "layout-expressible" },
    showScrollbar: { type: "boolean", default: false, coerce: 'none', displayName: "Show Scrollbar", group: "Scroll", description: "Shows a scrollbar rather than scrolling invisibly", portability: "layout-shared", layout: 'drawn-only' },
    sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "explicit", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared", layout: 'size-mode' },
    styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
    transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
    transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
    transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
    transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
    transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
    transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
    variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
    visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
    width: { type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'width' },
    zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  },

  outputs: {
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    dragCancelled: { type: 'signal', displayName: 'Cancelled', group: 'Drag Source', description: 'Fires when a lifted element is let go over nothing that takes it, or Escape puts it back' },
    dropped: { type: 'signal', displayName: 'Dropped', group: 'Drop Zone', description: 'Fires when a Draggable is dropped here, after Dropped Value and Drop Index are up to date. Move the data here — the engine moves nothing' },
    filesDropped: { type: 'signal', displayName: 'Files Dropped', group: 'File Drop', description: 'Fires when one or more accepted files are dropped here, after every File Drop output is up to date' },
    filesRejected: { type: 'signal', displayName: 'Files Rejected', group: 'File Drop', description: 'Fires when a drop landed here but every file in it was excluded by Accepted file types' },
    focused: { type: 'signal', displayName: 'Focused', group: 'Focus', description: 'Fires when this group takes keyboard focus' },
    focusLost: { type: 'signal', displayName: 'Focus Lost', group: 'Focus', description: 'Fires when keyboard focus leaves this group' },
    hoverEnd: { type: 'signal', displayName: 'Hover End', group: 'Hover Events', description: 'Fires when the pointer leaves this element' },
    hoverStart: { type: 'signal', displayName: 'Hover Start', group: 'Hover Events', description: 'Fires when the pointer moves over this element or any of its children' },
    landed: { type: 'signal', displayName: 'Landed', group: 'Drag Source', description: "Fires when this element is dropped on a zone that took it, after the zone's Dropped" },
    onClick: { type: 'signal', displayName: 'Click', group: 'Events', description: 'Fires when this element is clicked or tapped' },
    // Group.tsx `setupIScroll` — only the non-native scroller raises these; no act here scrolls one
    onScrollEnd: { type: 'signal', displayName: 'Scroll End', group: 'Scroll', description: 'Fires when scrolling settles, including after a flick has coasted to a stop' },
    onScrollStart: { type: 'signal', displayName: 'Scroll Start', group: 'Scroll', description: 'Fires when the user starts scrolling' },
    pickedUp: { type: 'signal', displayName: 'Picked Up', group: 'Drag Source', description: 'Fires when this element is lifted — after the hold on touch, on the first move with a mouse, on Space from the keyboard' },
    pointerDown: { type: 'signal', displayName: 'Pointer Down', group: 'Pointer Events', description: 'Fires when a mouse button is pressed or a finger touches this element' },
    pointerEnter: { type: 'signal', displayName: 'Pointer Enter', group: 'Pointer Events', description: 'Fires when the pointer moves onto this element, not counting its children' },
    pointerUp: { type: 'signal', displayName: 'Pointer Up', group: 'Pointer Events', description: 'Fires when the mouse button is released or the finger lifts over this element' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444, :1628-1638 — Children Count counts the node's children (docblock)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    childrenCount: { type: 'number', from: () => CHILDREN.length, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' },
    onScrollPositionChanged: { type: 'number', from: () => undefined, displayName: 'Scroll Position', group: 'Scroll', description: 'How far the content is scrolled, in pixels from the start' },
    // node-shared-port-definitions.ts :1292-1330
    isLifted: { type: 'boolean', from: (s: State) => s.isLifted, displayName: 'Is Lifted', group: 'Drag Source', description: 'True while this element is being dragged' },
    droppedValue: { type: '*', from: (s: State) => s.droppedValue, displayName: 'Dropped Value', group: 'Drop Zone', description: 'The Drag Value of the element dropped here' },
    dropIndex: { type: 'number', from: (s: State) => s.dropIndex, displayName: 'Drop Index', group: 'Drop Zone', description: "Where among this zone's children it landed, counting from 0 and leaving the dropped element itself out — so it is the index to insert at once it is removed from where it was" },
    isDropTarget: { type: 'boolean', from: (s: State) => s.isDropTarget, displayName: 'Drag Over', group: 'Drop Zone', description: 'True while something this zone takes is held over it — wire it to a background or border so the zone lights up' },
    // :1079-1135
    droppedFile: { type: '*', from: (s: State) => s.droppedFile, displayName: 'File', group: 'File Drop', description: 'The first accepted file, in the form an Upload File node takes' },
    droppedFiles: { type: 'array', from: (s: State) => s.droppedFiles, displayName: 'Files', group: 'File Drop', description: 'Every accepted file in the drop, as an array — a drop can carry more than one' },
    droppedFileName: { type: 'string', from: (s: State) => firstFile(s, 'name'), displayName: 'File Name', group: 'File Drop', description: 'Name of the first accepted file, extension included' },
    droppedFileType: { type: 'string', from: (s: State) => firstFile(s, 'type'), displayName: 'File Type', group: 'File Drop', description: 'MIME type the browser reports for the first accepted file, blank for one it does not recognise' },
    droppedFileSizeInBytes: { type: 'number', from: (s: State) => firstFile(s, 'size'), displayName: 'File Size In Bytes', group: 'File Drop', description: 'Size of the first accepted file, in bytes' },
    isDragOver: { type: 'boolean', from: (s: State) => s.isDragOver, displayName: 'Is Dragging Over', group: 'File Drop', description: 'True while a file is being dragged over this element — wire it to a border or background so the drop zone reacts' }
  }
}).on(
  {
    mounted: (s, v) =>
      !!v !== s.mounted
        ? { says: 'a change: the element is put on the page, or taken off it, at the next paint', set: { mounted: !!v }, send: [] }
        : { says: 'the value it already holds: nothing', send: [] },
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the element can be seen', send: [] }),
    as: (_s, v) => ({ says: 'always: the HTML element the next paint draws (a div when empty) — a new Tag draws a new element', set: { tag: v || 'div' }, send: [] }),
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, it takes no pointer', set: { visible: !!v }, send: [] }),
    opacity: (_s, v) => ({ says: 'always: how see-through it is; at exactly 0 it takes no pointer, and an act goes to what is behind it', set: { opacityZero: v === 0 }, send: [] }),
    pointerEventsMode: (s, v) =>
      v === 'inherit'
        ? { says: 'Inherit: its own pointer style comes off', set: { peStyle: undefined }, send: [] }
        : { says: 'Explicit: the last Pointer Events Enabled is written back (on, before one was set)', set: { peStyle: s.peEnabled === false ? 'none' : 'auto' }, send: [] },
    pointerEventsEnabled: (_s, v) => ({ says: 'always, whatever the mode: off, the pointer passes through to what is behind it', set: { peEnabled: !!v, peStyle: v ? 'auto' : 'none' }, send: [] }),
    // pointerlisteners.ts :113-133 — read at the render, and every act paints first
    blockTouch: (_s, v) => ({ says: 'always: on, a pointer act that lands here goes no further — the nodes it sits inside do not hear it', set: { blocks: !!v }, send: [] }),
    // drag-drop.ts `setDraggable`, `elementChanged` — the attributes go on every element the node has while Draggable is on (a
    // remount, a new Tag, a mount however late), and come off the one on the page with it (row C77, fixed in P109 ISL-031)
    draggable: (_s, v) => ({ says: 'always: on, every element it draws can be picked up, by pointer or keyboard; off, the one on the page cannot', set: { draggable: !!v }, send: [] }),
    // read by the zone it is dropped on: this page's only zone is itself, and a drag never takes its own node (C78, fixed in P109 ISL-031)
    dragValue: () => ({ says: 'always: read by the zone it is dropped on, which reports it as Dropped Value', send: [] }),
    dragKind: () => ({ says: 'always: read by a zone with an Accept Kind as it is dragged over one', send: [] }),
    holdToDrag: (_s, v) => ({ says: 'always: read at the next press — whether it must be held before it picks up', set: { holdToDrag: v }, send: [] }),
    holdTime: (_s, v) => ({ says: 'always: read at the next held press — how many seconds it is held before it picks up', set: { holdTime: v }, send: [] }),
    acceptDrops: (s, v) => {
      if (v) return { says: 'on: a Draggable can be dropped here', set: { acceptDrops: true }, send: [] };
      if (s.inZone) return { says: 'off while a drag is over it: the drag leaves it — Is Drop Target goes false', set: { acceptDrops: false, inZone: false, index: -1, isDropTarget: false }, send: ['isDropTarget'] };
      return { says: 'off: nothing can be dropped here', set: { acceptDrops: false }, send: [] };
    },
    acceptKind: (_s, v) => ({ says: 'always: read as a drag comes over it — a source of another kind does not light it up', set: { acceptKind: v }, send: [] }),
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
    // focus-tracker.ts :56-75 — listed, Focused only when it was not listed; off the page, Unchanged and nothing listed (R16)
    // a Focus behind outcomes the frame has resolved and not yet reported waits its turn (`ran`), as the runtime reports it after them
    // s74 (NSP-018): the listed / not-listed cases written out, so each says what it sends (it was a spread of a computed listing)
    focus: (s) => {
      if (!s.onPage) {
        if (s.ran.length === 0) return { says: 'off the page: nothing is listed', send: [], outcome: 'unchanged' };
        return {
          says: 'off the page, after outcomes this frame resolved and has not reported: nothing is listed, and Unchanged comes after them',
          set: { ran: [...s.ran, { port: 'focus' as const, outcome: 'unchanged' as const }] },
          send: [],
          outcome: 'pending'
        };
      }
      const ran = [...s.ran, { port: 'focus' as const, outcome: 'done' as const }];
      if (s.listed) {
        if (s.ran.length === 0) return { says: 'already listed as focused', set: {}, send: [], emit: [], outcome: 'done' };
        return { says: 'already listed, after outcomes this frame has not reported: Done comes after them', set: { ran }, send: [], emit: [], outcome: 'pending' };
      }
      if (s.ran.length === 0) return { says: 'on the page: listed as focused', set: { listed: true }, send: [], emit: ['focused'], outcome: 'done' };
      return { says: 'on the page, after outcomes this frame has not reported: listed as focused, and Done comes after them', set: { listed: true, ran }, send: [], emit: ['focused'], outcome: 'pending' };
    },
    // group.ts :129-146
    'scrollToIndex.index': (_s, v) => ({ says: 'always: read when Scroll To Index runs, at the end of the frame', set: { scrollIndex: v }, send: [] }),
    'scrollToElement.element': (_s, v) => ({ says: 'always: read when Scroll To Element runs, at the end of the frame', set: { scrollElement: v }, send: [] }),
    // group.ts :98-122 — after the frame's inputs; the outcome is reported when it runs (docblock)
    'scrollToIndex.do': (s) => ({
      says: 'always: runs at the end of the frame — Done when there is a child at Index, else Failure; before the Group is on the page it waits for it (at most 16 wait, and the oldest pushed out reports Failure)',
      set: { scheduled: [...s.scheduled, 'scrollToIndex.do'] },
      send: [],
      outcome: 'pending'
    }),
    'scrollToElement.do': (s) => ({
      says: 'always: runs at the end of the frame, waiting as Scroll To Index does — Done when Element is empty (nothing to scroll to), Failure for a value that is not an element',
      set: { scheduled: [...s.scheduled, 'scrollToElement.do'] },
      send: [],
      outcome: 'pending'
    })
  },
  {
    world: {
      // placed on the page with its params set — the first render: Did Mount, and Children Count from the children added before it
      place: (s) => {
        const p = painted(s);
        return { set: p.set, send: ['childrenCount', ...p.send], emit: p.emit };
      },
      timer: (s, _i, tag) => {
        if (tag === 'unswallow') return { set: { swallow: false }, send: [] };
        if (tag === 'hold' && s.phase === 'holding') return toPatch(heldOver(s, withDrain(s, lifted(s) as Act, false)));
        return NOTHING;
      }
    },
    // the frame's end: the scheduled scrolls run first (after the inputs, before the paint), then the paint
    afterInputs: (s) => {
      const w = frameWork(s);
      const s1 = { ...s, ...w.set };
      const p = painted(s1);
      return toPatch({ set: { ...w.set, ...p.set, ran: [] }, send: p.send, emit: p.emit, outcomes: [...s.ran, ...(w.outcomes ?? []), ...(p.outcomes ?? [])] });
    },
    person: {
      hover: (s) => toPatch(pointerAct(s, (p) => (hits(p) ? reach({ ...NONE, emit: ['hoverStart', 'pointerEnter'] }) : NONE))),
      leave: (s) => toPatch(pointerAct(s, (p) => (hits(p) ? reach({ ...NONE, emit: ['hoverEnd'] }) : NONE))),
      press: (s) => toPatch(pointerAct(s, (p) => {
        const down = pointerDown(p, 'mouse', hits(p));
        if (!hits(p)) return down;
        const after = { ...p, ...down.set };
        return reach({ ...down, set: { ...down.set, ...takesKeyboard(after) }, emit: [...down.emit, 'pointerDown'] });
      })),
      release: (s) => toPatch(pointerAct(s, (p) => {
        const up = pointerUp(p, 'mouse', hits(p));
        return hits(p) ? reach({ ...up, emit: [...up.emit, 'pointerUp'] }) : up;
      })),
      click: (s) => toPatch(pointerAct(s, (p) => clicked(p, hits(p), false))),
      touch: (s) => toPatch(pointerAct(s, (p) => {
        const down = pointerDown(p, 'touch', hits(p));
        return hits(p) ? reach({ ...down, emit: [...down.emit, 'pointerDown'] }) : down;
      })),
      lift: (s) => toPatch(pointerAct(s, (p) => {
        const up = pointerUp(p, 'touch', hits(p));
        return hits(p) ? reach({ ...up, emit: [...up.emit, 'pointerUp'] }) : up;
      })),
      focus: (s) => toPatch(onPainted(s, (p) => ({ ...NONE, set: takesKeyboard(p) }))),
      blur: (s) => toPatch(onPainted(s, (p) => (holdsKeyboard(p) ? { ...NONE, set: { focusedElem: -1 } } : NONE))),
      key: (s, _i, value) => toPatch(onPainted(s, (p) => {
        const f = takesKeyboard(p);
        const k = keyDown({ ...p, ...f }, String(value));
        return { ...k, set: { ...f, ...k.set } };
      })),
      // a move meets a handler only through Block Pointer Events' blockers (the Group listens for no move of its own)
      move: (s, _i, value) => toPatch(pointerAct(s, (p) => {
        const m = pointerMove(p, value === 'touch' ? 'touch' : 'mouse', hits(p));
        return hits(p) && p.blocks ? reach(m) : m;
      })),
      away: (s, _i, value) => toPatch(paintedThen(s, (p) => pointerMove(p, value === 'touch' ? 'touch' : 'mouse', false))),
      // a card's press reaches the card's own handler, which drains the page (docblock)
      grab: (s, _i, value) => toPatch(paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return NONE;
        const off: Partial<State> = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? pointerMove(at, 'mouse', false) : { ...NONE, set: { carry: i, carryBy: 'mouse' as const } };
        return reach({ ...a, set: { ...off, ...a.set } });
      })),
      pickUp: (s, _i, value) => toPatch(paintedThen(s, (p) => {
        const i = cardIndex(value);
        if (i < 0) return NONE;
        const off = cardTakesKeyboard(p, i);
        const at = { ...p, ...off };
        const a = busy(at) ? keyDuringGesture(at, ' ') : cardLifted(at, i);
        return { ...a, set: { ...off, ...a.set } };
      })),
      fileEnter: (s, _i, value) => toPatch(paintedThen(s, (p) => {
        const carry = p.fileCarry ?? (Array.isArray(value) ? (value as FileLike[]) : []);
        return dragTo({ ...p, fileCarry: carry }, under(p), { fileCarry: carry });
      })),
      fileLeave: (s) => toPatch(paintedThen(s, (p) => (p.fileCarry === undefined ? NONE : join(dragTo(p, -1), { ...NONE, set: { fileCarry: undefined } })))),
      fileDrop: (s) => toPatch(paintedThen(s, (p) => {
        if (p.fileCarry === undefined) return NONE;
        const here = under(p);
        const moved = dragTo(p, here);
        const at = { ...p, ...moved.set };
        const end: Act = { ...NONE, set: { fileCarry: undefined, fileOn: -1 } };
        if (here === -1) return join(moved, end);
        return join(join(moved, reach(armed(at) ? fileDropped(at) : fileLeft(at))), end);
      })),
      // a click on a child: the Group's own click, from inside it; the press focuses the nearest focusable ancestor, or nothing
      tap: (s, _i, value) => toPatch(pointerAct(s, (p) => (childIndexOf(value) < 0 ? NONE : clicked(p, hits(p), true)))),
      // a click on the page beside it: the pointer is off the Group; the press takes the keyboard off whatever held it
      clickAway: (s) => toPatch(paintedThen(s, (p) => clicked(p, false, true)))
    }
  }
);

/** Two acts in order, as one. */
function join(a: Act, b: Act): Act {
  const outcomes = [...(a.outcomes ?? []), ...(b.outcomes ?? [])];
  return {
    set: { ...a.set, ...b.set },
    send: [...a.send, ...b.send],
    emit: [...a.emit, ...b.emit],
    ...(a.after || b.after ? { after: [...(a.after ?? []), ...(b.after ?? [])] } : {}),
    ...(a.cancel || b.cancel ? { cancel: [...(a.cancel ?? []), ...(b.cancel ?? [])] } : {}),
    ...(outcomes.length > 0 ? { outcomes } : {}),
    ...((a as Reached).reached || (b as Reached).reached ? { reached: true } : {})
  } as Act;
}

type Reached = Act & { reached?: boolean };

/** The act reached a pointer handler on the page (the Group's, a child's, a card's): its wrapper drains the page (pointerlisteners.ts :180-183). */
function reach(a: Act): Act {
  return { ...a, reached: true } as Reached;
}

/** An act's patch as a reducer returns it: the internal `reached` mark dropped, `outcomes` only when there are some. */
function toPatch(a: Act): Act {
  const { reached: _r, ...rest } = a as Reached;
  void _r;
  if (rest.outcomes && rest.outcomes.length === 0) delete rest.outcomes;
  return rest;
}

function hits(s: Readonly<State>): boolean {
  return s.onPage && s.visible && !s.opacityZero && s.peStyle !== 'none';
}

/** The element on the page holds the keyboard: the one that took it is still there. */
function holdsKeyboard(s: Readonly<State>): boolean {
  return s.onPage && s.focusedElem === s.elem;
}

function takesKeyboard(s: Readonly<State>): Partial<State> {
  if (holdsKeyboard(s)) return {};
  return canTake(s) ? { focusedElem: s.elem, cardFocused: -1 } : {};
}

/** `el.focus()` succeeds: the element on the page has the module's tabindex and can be seen. */
function canTake(s: Readonly<State>): boolean {
  return s.onPage && s.visible && s.draggable;
}

function cardTakesKeyboard(_s: Readonly<State>, i: number): Partial<State> {
  return { focusedElem: -1, cardFocused: i };
}

/**
 * The frame's scrolls, run now (`scheduleAfterInputsHaveUpdated`'s callbacks, in order): each reads Index or Element, then runs on the
 * component when the Group is on the page, else waits for it — the 17th pushes the oldest out, which fails (react-component-node.ts
 * :2014-2031).
 */
function frameWork(s: Readonly<State>): { set: Partial<State>; outcomes: Resolved[] } {
  // s51's lesson: what the frame's end always does, it always writes — the scheduled list emptied, the waiting list as it stands
  if (s.scheduled.length === 0) return { set: { scheduled: [], waiting: s.waiting }, outcomes: [] };
  const outcomes: Resolved[] = [];
  let waiting = [...s.waiting];
  for (const op of s.scheduled) {
    const arg = op === 'scrollToIndex.do' ? s.scrollIndex : s.scrollElement;
    if (s.onPage) {
      outcomes.push(scrolled(op, arg));
      continue;
    }
    if (waiting.length >= WAIT_CAP) {
      const dropped = waiting[0];
      waiting = waiting.slice(1);
      outcomes.push({ port: dropped.op, outcome: 'failure', error: 'visual/action-dropped' });
    }
    waiting = [...waiting, { op, arg }];
  }
  return { set: { scheduled: [], waiting }, outcomes };
}

/** Group.tsx `scrollToIndex` / `scrollToElement`: Done, or Failure with the code the node reports (group.ts :111, :91). */
function scrolled(op: ScrollOp, arg: unknown): Resolved {
  if (op === 'scrollToElement.do') {
    // `if (!noodlChild) return undefined` — nothing on Element scrolls nothing and is Done; a value that is not a node has no element
    return arg ? { port: op, outcome: 'failure', error: 'group/scroll-to-element-failed' } : { port: op, outcome: 'done' };
  }
  return hasChild(arg) ? { port: op, outcome: 'done' } : { port: op, outcome: 'failure', error: 'group/scroll-to-index-failed' };
}

/** `scrollParent.children[index]` — an HTMLCollection read with the property key the value makes: a canonical array index below the count. */
function hasChild(index: unknown): boolean {
  let key: string;
  try {
    key = typeof index === 'symbol' ? '' : String(index);
  } catch {
    return false;
  }
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return false;
  return Number(key) < CHILDREN.length;
}

/** The waiting scrolls, run in order at the paint that puts the Group on the page (the inner ref, :1044-1048). */
function flushed(s: Readonly<State>): { set: Partial<State>; outcomes: Resolved[] } {
  if (s.waiting.length === 0) return { set: {}, outcomes: [] };
  return { set: { waiting: [] }, outcomes: s.waiting.map((w) => scrolled(w.op, w.arg)) };
}

/** The drag module moved — a lift, a zone entered or left, a drop, a lifted cancel: its `flush` drains the page (drag-drop.ts `flush`). */
function dragMoved(before: Readonly<State>, after: Readonly<State>): boolean {
  return (before.phase === 'lifted') !== (after.phase === 'lifted') || before.carry !== after.carry || before.inZone !== after.inZone;
}

/**
 * The act, then the frame's scrolls when it reached a handler or moved the drag (docblock). s51's lesson: every act writes the scroll
 * lists, drained or not, and what a drain resolves is held for the frame's end (`heldOver`): a drain never doubles an act's shapes.
 */
function withDrain(p: Readonly<State>, a: Act, reached: boolean): Act {
  const after = { ...p, ...a.set };
  if (!(reached || (a as Reached).reached || dragMoved(p, after)) || after.scheduled.length === 0) return join(a, { ...NONE, set: { scheduled: after.scheduled, waiting: after.waiting } });
  const w = frameWork(after);
  return join(a, { ...NONE, set: w.set, outcomes: w.outcomes });
}

/** A pointer act on the painted page. */
function pointerAct(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  return onPainted(s, then);
}

/**
 * A paint: the page follows what the node wants. A mount makes a new element the Group component mounts with (it carries the node for
 * the focus tracker) and runs the scrolls that waited; leaving the page drops the Group from the focus list (`nodeUnmounted`); a new Tag
 * makes a new element, which carries the node too (Group.tsx `rootRef`; row C86 before P109).
 */
function painted(s: Readonly<State>): { set: Partial<State>; send: Val[]; emit: Pulse[]; outcomes?: Resolved[] } {
  if (s.mounted && !s.onPage) {
    const f = flushed(s);
    return { set: { onPage: true, elem: s.elem + 1, stampOn: s.elem + 1, shownTag: s.tag, ...f.set }, send: [], emit: ['didMount'], outcomes: f.outcomes };
  }
  if (!s.mounted && s.onPage) return { set: { ...fileDark(s).set, onPage: false, listed: false }, send: fileDark(s).send, emit: ['willUnmount'] };
  if (s.onPage && s.tag !== s.shownTag) return { set: { elem: s.elem + 1, stampOn: s.elem + 1, shownTag: s.tag }, send: [], emit: [] };
  return { set: {}, send: [], emit: [] };
}

/** The act on the painted page: nothing to act on when the element is not there. The act's drain (docblock) after its own work. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? withDrain(after, then(after), false) : { ...NONE, set: { scheduled: after.scheduled, waiting: after.waiting } };
  return heldOver(s, { ...a, set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...a.emit], outcomes: [...(p.outcomes ?? []), ...(a.outcomes ?? [])] });
}

/** What an act or a timer resolved, held for the frame's end in the order resolved (`ran`, docblock); written every time. */
function heldOver(s: Readonly<State>, a: Act): Act {
  const { outcomes, ...rest } = a;
  return { ...rest, set: { ...rest.set, ran: [...s.ran, ...(outcomes ?? [])] } };
}

/** The act on the painted page, whether or not the element is there. */
function paintedThen(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = withDrain(after, then(after), false);
  return heldOver(s, { ...a, set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...a.emit], outcomes: [...(p.outcomes ?? []), ...(a.outcomes ?? [])] });
}

function under(s: Readonly<State>): number {
  return hits(s) ? s.elem : -1;
}

/**
 * A click — the press, the release, then the click (`onGroup`: it lands on the Group or a child inside it). The click reaches the window
 * first: a swallow waiting there eats it, so neither the focus tracker's walk nor Click hears it. Else the walk lists the Group when the
 * element it landed in carries the node (`stampOn`), and drops it otherwise; then Click. `browserFocus` (`tap`, `clickAway`): the press
 * puts the keyboard where a browser does — on the Group when the click is inside it and it can take it, else off whatever held it.
 */
function clicked(p: Readonly<State>, onGroup: boolean, browserFocus: boolean): Act {
  const down = pointerDown(p, 'mouse', onGroup);
  const focusAt = { ...p, ...down.set };
  const kb: Partial<State> = browserFocus
    ? onGroup && canTake(focusAt)
      ? { focusedElem: focusAt.elem, cardFocused: -1 }
      : { focusedElem: -1, cardFocused: -1 }
    : onGroup
      ? takesKeyboard(focusAt)
      : {};
  const pressedOn: Act = onGroup ? reach({ ...down, set: { ...down.set, ...kb }, emit: [...down.emit, 'pointerDown'] }) : { ...down, set: { ...down.set, ...kb } };
  const mid = { ...p, ...pressedOn.set };
  const up = pointerUp(mid, 'mouse', onGroup);
  const at = { ...mid, ...up.set };
  const eaten = at.swallow;
  const walk: Act = eaten ? NONE : tracked(at, onGroup);
  const on: Pulse[] = onGroup ? (eaten ? ['pointerUp'] : ['pointerUp', ...walk.emit, 'onClick']) : walk.emit;
  return join(pressedOn, { ...up, set: { ...up.set, ...walk.set, ...(eaten ? { swallow: false } : {}) }, emit: [...up.emit, ...on] });
}

/** focus-tracker.ts `onClickCapture` :118-136 — the Group listed when the click landed in the element it carries the node on, else dropped. */
function tracked(s: Readonly<State>, onGroup: boolean): Act {
  const found = onGroup && s.stampOn === s.elem;
  if (found) return s.listed ? NONE : { ...NONE, set: { listed: true }, emit: ['focused'] };
  return s.listed ? { ...NONE, set: { listed: false }, emit: ['focusLost'] } : NONE;
}

function pointerMove(s: Readonly<State>, input: 'mouse' | 'touch', over: boolean): Act {
  if (s.carry >= 0) return s.carryBy === input ? track(s, over) : NONE;
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase === 'holding') return cancelled(s);
  // the node's own lifted drag finds no zone wherever the pointer is (C78, fixed in P109 ISL-031)
  if (s.phase === 'pending') return lifted(s) as Act;
  return NONE;
}

function busy(s: Readonly<State>): boolean {
  return s.phase !== 'idle' || s.carry >= 0;
}

function cardIndex(value: unknown): number {
  const named = JSON.stringify(value);
  return CARDS.findIndex((c) => JSON.stringify(c) === named);
}

function childIndexOf(value: unknown): number {
  const named = JSON.stringify(value);
  return CHILDREN.findIndex((c) => JSON.stringify(c) === named);
}

/**
 * `track` (:466-477): the Group is the zone under the pointer when the pointer lands on it and it is the gesture's zone; entering it
 * starts at the index the pointer is at — 0 (docblock: no geometry).
 */
function track(s: Readonly<State>, over: boolean): Act {
  const here = over && zoneFor(s);
  if (here === s.inZone) return NONE;
  return { ...NONE, set: { inZone: here, isDropTarget: here, index: here ? 0 : -1 }, send: ['isDropTarget'] };
}

/** `keyboardLift` (:841-878) of a card: into the first zone that takes it — the Group, when it is one — after every slot (docblock). */
function cardLifted(s: Readonly<State>, i: number): Act {
  const zone = zoneFor({ ...s, carry: i });
  return { set: { carry: i, carryBy: 'keyboard', ...(zone ? { inZone: true, isDropTarget: true, index: SLOTS } : {}) }, send: zone ? ['isDropTarget'] : [], emit: [] };
}

function armed(s: Readonly<State>): boolean {
  return s.acceptFileDrops && (s.fileCarry?.length ?? 0) > 0;
}

/** C81 (P109): what a file act always does it always writes — the count, its element and Is Dragging Over as they end up, sent only
 * when they change. A write made only when one changes split each act's branch by whether it did (0 over 0 after a clear). */
function heldDrag(s: Readonly<State>): Partial<State> {
  return { dragDepth: s.dragDepth, depthOn: s.depthOn, isDragOver: s.isDragOver };
}

/** The browser moves the drag's target to `here`; a drag event that reaches the element drains (its handler is wrapped). */
function dragTo(s: Readonly<State>, here: number, extra: Partial<State> = {}): Act {
  if (s.fileOn === here) return here === -1 ? { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(s) } } : reach({ ...NONE, set: { ...extra, fileOn: here, ...heldDrag(s) } });
  const leaving = s.onPage && s.fileOn === s.elem;
  const left = leaving ? reach(fileLeft(s)) : NONE;
  const mid = { ...s, ...left.set };
  const entered = here === -1 ? NONE : reach(fileEntered(mid, here));
  const after = { ...mid, ...entered.set };
  return join(join(left, entered), { ...NONE, set: { ...extra, fileOn: here, ...heldDrag(after) } });
}

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

function fileLeft(s: Readonly<State>): Act {
  if (!armed(s)) return NONE;
  const depth = Math.max(0, s.dragDepth - 1);
  const over = depth === 0 ? dragOver(s, false) : NONE;
  return { ...over, set: { ...over.set, dragDepth: depth } };
}

function dragOver(s: Readonly<State>, value: boolean): Act {
  return s.isDragOver === value ? NONE : { ...NONE, set: { isDragOver: value }, send: ['isDragOver'] };
}

const FILE_VALUES: Val[] = ['droppedFile', 'droppedFiles', 'droppedFileName', 'droppedFileType', 'droppedFileSizeInBytes'];

function fileDropped(s: Readonly<State>): Act {
  const over = dragOver(s, false);
  const accepted = (s.fileCarry ?? []).filter((f) => matchesType(f, s.acceptedFileTypes));
  const files: Partial<State> = accepted.length === 0 ? { droppedFiles: [], droppedFile: undefined } : { droppedFiles: accepted, droppedFile: accepted[0] };
  return { set: { ...over.set, dragDepth: 0, ...files }, send: [...over.send, ...FILE_VALUES], emit: [accepted.length === 0 ? 'filesRejected' : 'filesDropped'] };
}

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

function firstFile(s: Readonly<State>, key: 'name' | 'type' | 'size'): unknown {
  const f = s.droppedFile as FileLike | undefined;
  return f && f[key];
}

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

/** `onPointerDown` (drag-drop.ts :232-271): a press on the Group or a child inside it starts the Group's gesture (`innermostDraggable`). */
function pointerDown(s: Readonly<State>, input: 'mouse' | 'touch', on: boolean): Act {
  if (busy(s) || !s.draggable || !on) return NONE;
  if (holds(s, input)) return { set: { phase: 'holding', input }, send: [], emit: [], after: [{ tag: 'hold', ms: holdMs(s) }] };
  return { set: { phase: 'pending', input }, send: [], emit: [] };
}

/** `onPointerUp` (:308-323) — the same pointer only; `over`: it comes up on the Group (or a child inside it). */
function pointerUp(s: Readonly<State>, input: 'mouse' | 'touch', over: boolean): Act {
  if (s.carry >= 0) {
    if (s.carryBy !== input) return NONE;
    const t = track(s, over);
    const d = cardDrop({ ...s, ...t.set });
    return join(t, { ...d, set: { ...d.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] });
  }
  if (s.phase === 'idle' || s.input !== input) return NONE;
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  // let go of its own lifted drag: never over a zone that takes it — its own node is not one (C78, fixed in P109 ISL-031) — so a cancel
  const c = cancelled(s);
  return { ...c, set: { ...c.set, swallow: true }, after: [{ tag: 'unswallow', ms: 0 }] };
}

/** `drop` (:379-399) of a card: on the Group, its Drag Value and the gesture's index, then Dropped, and the zone left; over none, the card's cancel. */
function cardDrop(s: Readonly<State>): Act {
  if (!s.inZone) return { ...NONE, set: { carry: -1, carryBy: undefined } };
  return {
    set: { carry: -1, carryBy: undefined, inZone: false, index: -1, droppedValue: CARDS[s.carry].dragValue, dropIndex: s.index, isDropTarget: false },
    send: ['droppedValue', 'dropIndex', 'isDropTarget'],
    emit: ['dropped']
  };
}

function cardCancelled(s: Readonly<State>): Act {
  return { set: { carry: -1, carryBy: undefined, ...(s.inZone ? { inZone: false, index: -1, isDropTarget: false } : {}) }, send: s.inZone ? ['isDropTarget'] : [], emit: [] };
}

function ended(): Partial<State> {
  return { phase: 'idle', input: undefined };
}

function lifted(_s: Readonly<State>): Send {
  return { set: { phase: 'lifted', isLifted: true }, send: ['isLifted'], emit: ['pickedUp'] };
}

function cancelled(s: Readonly<State>): Act {
  // its own drag is never in a zone (C78, fixed in P109 ISL-031)
  if (s.phase !== 'lifted') return { set: ended(), send: [], emit: [], cancel: ['hold'] };
  return { set: { ...ended(), isLifted: false }, send: ['isLifted'], emit: ['dragCancelled'], cancel: ['hold'] };
}

function acceptsSource(s: Readonly<State>): boolean {
  const wanted = String(s.acceptKind || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (wanted.length === 0) return true;
  const kind = CARDS[s.carry].dragKind;
  return wanted.includes(String(kind || '').trim());
}

function zoneFor(s: Readonly<State>): boolean {
  // a card's: never its own gesture — a drag never takes its own node as its zone (C78, fixed in P109 ISL-031)
  return s.carry >= 0 && s.acceptDrops && s.onPage && acceptsSource(s);
}

/** `onKeyDown` (:768-839) */
function keyDown(s: Readonly<State>, key: string): Act {
  if (!busy(s)) {
    if (key === ' ' && !holdsKeyboard(s) && s.cardFocused >= 0) return cardLifted(s, s.cardFocused);
    if (key !== ' ' || !holdsKeyboard(s) || !s.draggable) return NONE;
    // Space on the live, Draggable element that holds the keyboard: `keyboardLift` — never into itself (C78, fixed in P109 ISL-031),
    // and no other zone on this page takes it
    // it holds the keyboard: written whether the key act just put it there or it was there (one branch either way)
    return { set: { phase: 'lifted', input: 'keyboard', isLifted: true, focusedElem: s.elem, cardFocused: -1 }, send: ['isLifted'], emit: ['pickedUp'] };
  }
  return keyDuringGesture(s, key);
}

function keyDuringGesture(s: Readonly<State>, key: string): Act {
  const card = s.carry >= 0;
  const input = card ? s.carryBy : s.input;
  const lifted = card || s.phase === 'lifted';
  if (input !== 'keyboard') return key === 'Escape' && lifted ? (card ? cardCancelled(s) : cancelled(s)) : NONE;
  // C83 (fixed in P109 ISL-038): a zone taken off the page under the carried card is left at the next key (drag-drop.ts
  // `onKeyDown`, `liveElement`) — Drag Over false — so Enter or Space cancels and an arrow key looks only at the zones on the page
  if (s.inZone && !s.onPage) {
    const gone: Act = { set: { inZone: false, index: -1, isDropTarget: false }, send: ['isDropTarget'], emit: [] };
    return join(gone, keyDuringGesture({ ...s, ...gone.set }, key));
  }
  switch (key) {
    case 'Enter':
    case ' ':
      return card ? cardDrop(s) : cancelled(s);
    case 'Escape':
    case 'Tab':
      return card ? cardCancelled(s) : cancelled(s);
    case 'ArrowDown':
    case 'ArrowUp': {
      // :803-807 — one place, between 0 and the slot count, in the zone it is in
      if (!s.inZone) return NONE;
      const to = Math.max(0, Math.min(SLOTS, s.index + (key === 'ArrowDown' ? 1 : -1)));
      return to === s.index ? NONE : { ...NONE, set: { index: to } };
    }
    case 'ArrowRight':
    case 'ArrowLeft':
      // :808-819 — the zones in reading order: the Group, if it takes the source now, entered at 0
      return !s.inZone && zoneFor(s) ? { set: { inZone: true, isDropTarget: true, index: 0 }, send: ['isDropTarget'], emit: [] } : NONE;
    default:
      return NONE;
  }
}
