/**
 * Drag (`Drag`) — read from `packages/noodl-viewer-react/src/nodes/visual/drag.ts` (the node), `components/visual/Drag/Drag.tsx` (the
 * component), the `react-draggable` 4.5.0 it wraps (`Draggable.js`, `DraggableCore.js`, `utils/positionFns.js`), the scheduler the
 * snaps run on (`packages/noodl-runtime/src/timerscheduler.ts`, as animate-to-value.ts reads it), `easecurves.ts` (ease-curves.ts
 * here, verbatim) and `react-component-node.ts` (Mounted, Did Mount, Will Unmount, the Advanced and Bounding Box outputs,
 * `addChild`, `outcomeOnInnerComponent` :2014-2056) on 2026-10-07 (NSP-016 s55; the reading is NSP-016 §7.16).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from. R11: the spec says what a person gets;
 * where the runtime does otherwise only because of how it is built, that is a known row on the runtime target (C102, C105 and C106
 * were, until P109 ISL-048 fixed them).
 *
 * THE CHILD. A Drag has no element of its own (drag.ts `noDataAttributes`); it moves its child's element with a CSS `translate`.
 * With more than one child it wraps them in one element and moves that (Drag.tsx `render`, row C103, fixed in P109 ISL-048: it drew
 * only the first; graded in the viewer's tests). Its page holds one child, a Group, which is the element a person presses. With no
 * child on the page there is nothing to press.
 *
 * THE GESTURE (the acts `pressAt`, `moveTo`, `releaseAt`: a pointer at a point, in pixels from the page's corner). Pure arithmetic —
 * the face lays nothing out, so the pointer is read against the page (DraggableCore `getControlPosition`: the offset parent is the
 * body, at 0, 0). In order:
 *   - **a press** on the child (a mouse's main button, or a finger), while the Drag is on the page and Enabled is not `false`
 *     (Draggable `disabled={enabled === false}`): the drag starts where the pointer is. **Drag Started**; Drag X / Y are sent as the
 *     element's position and Delta X / Y as 0 (`setDragValues`); both snaps stop. Another mouse button starts nothing. A press while
 *     a drag is under way starts it again from the new point.
 *   - **a move** of the pointer that is down: the element moves by the pointer's movement divided by Scale (`createDraggableData`:
 *     `x + deltaX / scale`; Scale is the prop `scale || 1`). **Drag Moved**; Drag X / Y, Delta X / Y.
 *   - **a let go**: the element takes the position the pointer's last movement gives, on the axes Axis allows (Drag.tsx `onStop`).
 *     Drag X / Y are sent as where the element is, then **Drag Ended**.
 *   - **Axis** says which axes the element moves on: X, Y or Both (any other value: neither). On an axis it does not allow, Drag X / Y
 *     report where the element is and Delta X / Y is 0 (row C102, fixed in P109 ISL-048: the runtime reported the pointer's movement
 *     there, and sent the element's position again at the next press).
 *   - **Constrain to parent** keeps the element inside its parent's box. That is geometry (NSP-016 §7.16): the face lays nothing out,
 *     so the parent has no box and nothing is constrained. What the runtime does with it in a world with no layout (the slack it keeps
 *     past an edge, with every bound unreadable) is copied, since it reaches the outputs when a position is not a number.
 *   - **a finger**: the same, from the touch's own point. Its moves and its end go to the element it went down on (the face's
 *     browser), so once that element has left the page the drag hears neither.
 *
 * **Start Drag X / Y** (inputProps, at the paint): a change (`Object.is`: NaN again is none, row C106) moves the element there and sends Drag X / Y and Delta X / Y (the change
 * from the last one painted — from nothing, NaN; Drag.tsx `componentDidUpdate`). At the mount the element starts at Start Drag X / Y,
 * or 0 when it is not truthy (`componentDidMount`), and all four are sent. Text is read as a number (v3, row C138: v2 kept it as
 * it came, and it joined onto the numbers the drag adds); any other value that is not a number is kept as it came.
 *
 * **Snap To Position X / Y — Do** (drag.ts :61-79): at the frame's end (`scheduleAfterInputsHaveUpdated`), with the Value and Duration
 * held then, on the component when it exists — else it waits for the component (at most 16; the 17th pushes the oldest out, which
 * reports Failure) and runs at the mount. **Done** once it has run. Running it: nothing when the element is already at Value (`===`);
 * else the axis's snap stops and a new one starts from where the element is (Drag.tsx `snapToPosition`) — one scheduler timer,
 * Duration as stored (300 when it is nothing), Ease Out, no delay: it joins at the frame's timer pass and runs at 0 at once, then each
 * frame moves the element along the curve and sends Drag X / Y (no Delta, no Drag Moved), and ends at Value. A Value that is
 * nothing, null or empty changes nothing; one that cannot be read as a number changes nothing (and is reported as a runtime error,
 * off the wire).
 *
 * **Mounted** off takes the Drag and its child off the page at the next paint — Will Unmount; both snaps stop and a drag under way
 * ends with no Drag Ended (DraggableCore removes its listeners). On again: a NEW component — Did Mount, the element back at Start
 * Drag X / Y, all four outputs sent, and what waited runs from there (row C105, fixed in P109 ISL-048: the runtime ran it before
 * the mount's own write landed, from the constructor's 0, so the element jumped to 0 first).
 *
 * **Child Index** 0, **Children Count** 1 (its child, scheduled for the frame's end by `addChild`), **This**, the **Bounding Box**
 * never measured here, **Scroll Into View** nothing on the wire. CSS Class and CSS Style go on the element the Drag moves (row C104,
 * fixed in P109 ISL-048: they reached no element) — the look (R10), graded in the viewer's tests; Variant is stored.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { EaseCurves } from './ease-curves';

/** The points the generator draws for the gesture (THE GESTURE): a press may be a finger's or another mouse button's. */
export const PRESS_POINTS: readonly unknown[] = [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 0, by: 'touch' }, { x: 7, y: 3, by: 'touch' }, { x: 5, y: 5, button: 2 }];
export const MOVE_POINTS: readonly unknown[] = [{ x: 10, y: 50 }, { x: 30, y: 80 }, { x: -20, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 3.3, y: 0.1 }];

type Axis = 'x' | 'y';
type Finger = 'none' | 'child' | 'body' | 'gone';
/** One scheduler timer (timerscheduler.ts :30-41): queued until the next timer pass, then running from `start`. */
type Timer = { queued: boolean; running: boolean; start: number; from: unknown; to: unknown; duration: unknown };
type Resolved = { port: 'snapToPositionX.do' | 'snapToPositionY.do'; outcome: 'done' | 'failure'; error?: string };

type State = {
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the component is on the page: mounted and painted */
  onPage: boolean;
  // ---- the props as written (inputProps: reach the component at the next paint) ----
  axis: unknown;
  enabled: unknown;
  useParentBounds: unknown;
  scale: unknown;
  startX: unknown;
  startY: unknown;
  // ---- the props the component last rendered (`componentDidUpdate`'s `prevProps`; what an act reads) ----
  shown: { axis: unknown; enabled: unknown; useParentBounds: unknown; scale: unknown; startX: unknown; startY: unknown };
  // ---- the component's state (Drag.tsx) ----
  x: unknown;
  y: unknown;
  // ---- the library's (Draggable: its position while dragging, the position prop it last took, the slack; DraggableCore: the pointer) ----
  dragging: boolean;
  libX: unknown;
  libY: unknown;
  prevX: unknown;
  prevY: unknown;
  slackX: unknown;
  slackY: unknown;
  lastX: number;
  lastY: number;
  /** react-draggable's module-level `dragEventFor`: the kind of pointer the last press on any Drag was */
  kind: 'mouse' | 'touch';
  /** the document listeners DraggableCore holds, per kind */
  heardMouse: boolean;
  heardTouch: boolean;
  /** DraggableCore's `touchIdentifier` is a number: the drag under way started from a finger */
  touchStart: boolean;
  /** the face's finger (node-spec-target.ts `touchAt`): down on the child, on the page beside it, on an element that left the page, or none */
  finger: Finger;
  // ---- the snaps (drag.ts `_internal`) ----
  snapX: number;
  snapY: number;
  durationX: unknown;
  durationY: unknown;
  timerX: Timer | null;
  timerY: Timer | null;
  /** the Dos whose frame-end callback has not run yet (`scheduleAfterInputsHaveUpdated`), in order */
  scheduled: Axis[];
  /** what waits for the component (`withInnerComponent`, at most 16) */
  waiting: Axis[];
  /** the Dos a person's act drained (THE DRAIN), resolved and held for the frame's end (group.ts `ran`) */
  ran: Resolved[];
  // ---- the outputs as last written ----
  posX: unknown;
  posY: unknown;
  dX: unknown;
  dY: unknown;
};

type O = typeof Drag extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Val = 'positionX' | 'positionY' | 'deltaX' | 'deltaY';
type Pulse = 'didMount' | 'willUnmount' | 'onStart' | 'onDrag' | 'onStop';
type Act = { set: Partial<State>; send: Val[]; emit: Pulse[]; outcomes?: Resolved[] };

const NONE: Act = { set: {}, send: [], emit: [] };
const WAIT_CAP = 16;
const DROPPED = 'visual/action-dropped';
const DEFAULT_DURATION = 300;
const POSITIONS: Val[] = ['positionX', 'positionY', 'deltaX', 'deltaY'];

const LOOK = (displayName: string, group: string, description: string, extra: Record<string, unknown> = {}) => ({ coerce: 'none' as const, displayName, group, description, ...extra });

export const Drag = defineNode({
  type: 'Drag',
  // v2 (P109 ISL-048, s31): a Start Drag X / Y that is NaN again is no change — `Object.is` (row C106)
  // v3 (P109 ISL-048, s32): a Start Drag X / Y that is text is read as a number (row C138)
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/visual/drag.ts; packages/noodl-viewer-react/src/components/visual/Drag/Drag.tsx; react-draggable 4.5.0',
  needs: ['person', 'clock'],
  worldPool: { advances: [0, 16, 100, 150, 300, 301, 1000] },
  // drag.ts :250-256 `outcomeOutputs({ done, failure })` — the two Dos share them
  outcomes: ['done', 'failure'],

  state: {
    mounted: true,
    onPage: false,
    axis: 'x',
    enabled: true,
    useParentBounds: true,
    scale: 1,
    startX: undefined,
    startY: undefined,
    shown: { axis: 'x', enabled: true, useParentBounds: true, scale: 1, startX: undefined, startY: undefined },
    x: 0,
    y: 0,
    dragging: false,
    libX: 0,
    libY: 0,
    prevX: 0,
    prevY: 0,
    slackX: 0,
    slackY: 0,
    lastX: NaN,
    lastY: NaN,
    kind: 'mouse',
    heardMouse: false,
    heardTouch: false,
    touchStart: false,
    finger: 'none',
    snapX: 0,
    snapY: 0,
    durationX: DEFAULT_DURATION,
    durationY: DEFAULT_DURATION,
    timerX: null,
    timerY: null,
    scheduled: [],
    waiting: [],
    ran: [],
    posX: undefined,
    posY: undefined,
    dX: undefined,
    dY: undefined
  } as State,

  acts: {
    pressAt: { description: 'a person presses the element the Drag moves, at a point (a mouse button, or a finger with `by: "touch"`)', values: PRESS_POINTS },
    moveTo: { description: 'the pointer that is down moves to a point', values: MOVE_POINTS },
    releaseAt: { description: 'the pointer that is down comes up at a point', values: MOVE_POINTS }
  },

  inputs: {
    // ---- logic ----
    // drag.ts :61-79
    'snapToPositionX.do': { type: 'signal', outcome: true, displayName: 'Do', group: 'Snap To Position X', description: 'Animates the element to Value on the X axis; does nothing if it is already there', portability: 'logic' },
    // drag.ts :80-101 `readSnapCoordinate`
    'snapToPositionX.value': { type: 'number', default: 0, coerce: 'none', displayName: 'Value', group: 'Snap To Position X', description: 'X position the element animates to when Snap To Position X — Do fires. An empty value leaves the current position alone', portability: 'logic', examples: [0, 50, -30, 12.5, null, '', '40', 'x'] },
    // drag.ts :102-112 — raw
    'snapToPositionX.duration': { type: 'number', default: 300, coerce: 'none', displayName: 'Duration', group: 'Snap To Position X', description: 'How long the X snap animation takes, in milliseconds', portability: 'logic', examples: [0, 100, 300, -5, '100'] },
    'snapToPositionY.do': { type: 'signal', outcome: true, displayName: 'Do', group: 'Snap To Position Y', description: 'Animates the element to Value on the Y axis; does nothing if it is already there', portability: 'logic' },
    'snapToPositionY.value': { type: 'number', default: 0, coerce: 'none', displayName: 'Value', group: 'Snap To Position Y', description: 'Y position the element animates to when Snap To Position Y — Do fires. An empty value leaves the current position alone', portability: 'logic', examples: [0, 50, -30, 12.5, null, '', '40', 'x'] },
    'snapToPositionY.duration': { type: 'number', default: 300, coerce: 'none', displayName: 'Duration', group: 'Snap To Position Y', description: 'How long the Y snap animation takes, in milliseconds', portability: 'logic', examples: [0, 100, 300, -5, '100'] },
    // drag.ts inputProps — at the paint
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'Drag', description: 'Lets the user drag this element; when off it still renders and still responds to the Snap actions', portability: 'logic', examples: [true, false, 0, 'false'] },
    axis: { type: 'enum', enums: ['x', 'y', 'both'], default: 'x', coerce: 'none', displayName: 'Axis', group: 'Drag', description: 'Which axes dragging is allowed on', portability: 'logic', examples: ['z'] },
    useParentBounds: { type: 'boolean', default: true, coerce: 'none', displayName: 'Constrain to parent', group: 'Drag', description: "Stops the element being dragged outside its parent's bounds", portability: 'logic' },
    inputPositionX: { type: 'number', coerce: 'none', displayName: 'Start Drag X', group: 'Values', description: 'Sets the X position the element starts at, before any dragging', portability: 'logic', examples: [0, 25, -40, 7.5] },
    inputPositionY: { type: 'number', coerce: 'none', displayName: 'Start Drag Y', group: 'Values', description: 'Sets the Y position the element starts at, before any dragging', portability: 'logic', examples: [0, 25, -40, 7.5] },
    scale: { type: 'number', default: 1, coerce: 'none', displayName: 'Scale', group: 'Values', description: 'Divides pointer movement before it becomes element movement, so 2 makes the element move half as far as the pointer', portability: 'logic', examples: [1, 2, 0.5, 0, 3] },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },

    // ---- look (R10): CSS Class and CSS Style go on the element moved (row C104, fixed in P109 ISL-048) ----
    cssClassName: { type: 'string', default: '', ...LOOK('CSS Class', 'Advanced HTML', 'Extra CSS class names to put on this element, for styling from a stylesheet you supply'), portability: 'web-only' },
    styleCss: { type: 'string', default: '/* background-color: red; */', editOnly: true, ...LOOK('CSS Style', 'Advanced HTML', 'Raw CSS declarations applied to this element, overriding the styling ports above'), portability: 'web-only' },
    variant: { type: 'string', ...LOOK('Variant', 'General', 'Name of a saved variant of this node type to apply, replacing the styling set here'), portability: 'look-shared' }
  },

  outputs: {
    // drag.ts outputProps — Drag.tsx `setDragValues`, `onStop`, `componentDidMount`, `componentDidUpdate`, `snapToPosition`
    positionX: { type: 'number', from: (s) => s.posX, displayName: 'Drag X', group: 'Values', description: 'Current X position of the element relative to where it started' },
    positionY: { type: 'number', from: (s) => s.posY, displayName: 'Drag Y', group: 'Values', description: 'Current Y position of the element relative to where it started' },
    deltaX: { type: 'number', from: (s) => s.dX, displayName: 'Delta X', group: 'Values', description: 'How far the element moved on X since the last Drag Moved' },
    deltaY: { type: 'number', from: (s) => s.dY, displayName: 'Delta Y', group: 'Values', description: 'How far the element moved on Y since the last Drag Moved' },
    onStart: { type: 'signal', displayName: 'Drag Started', group: 'Events', description: 'Fires when the user starts dragging' },
    onStop: { type: 'signal', displayName: 'Drag Ended', group: 'Events', description: 'Fires when the user releases the element, including when the pointer leaves the window' },
    onDrag: { type: 'signal', displayName: 'Drag Moved', group: 'Events', description: 'Fires on every frame the element moves while being dragged' },
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    // react-component-node.ts :1599-1609 — its child (THE CHILD)
    childrenCount: { type: 'number', from: () => 1, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // drag.ts :67-78 — the callback runs at the frame's end; its outcome is decided there (`afterInputs`)
    'snapToPositionX.do': (s) => ({
      says: 'always: at the end of the frame the element starts moving on X from where it is to Value, over Duration, easing out, Drag X sent each frame (no Drag Moved) — Done once it has started, or at once when it is already at Value; a drag under way is moved too; before the Drag is on the page it waits for the mount (at most 16 wait, and the oldest pushed out reports Failure)',
      set: { scheduled: [...s.scheduled, 'x'] },
      send: [],
      outcome: 'pending'
    }),
    'snapToPositionY.do': (s) => ({
      says: 'always: at the end of the frame the element starts moving on Y from where it is to Value, over Duration, easing out, Drag Y sent each frame (no Drag Moved) — Done once it has started, or at once when it is already at Value; a drag under way is moved too; before the Drag is on the page it waits for the mount (at most 16 wait, and the oldest pushed out reports Failure)',
      set: { scheduled: [...s.scheduled, 'y'] },
      send: [],
      outcome: 'pending'
    }),
    // drag.ts :89-100 `readSnapCoordinate`: nothing, null and empty abstain; what is not a number is refused (a runtime error)
    'snapToPositionX.value': (_s, v) => {
      const c = snapCoordinate(v);
      return c === undefined
        ? { says: 'nothing, null, empty, or not readable as a number: the X the snap goes to is left as it was (what cannot be read is reported as a runtime error)', send: [] }
        : { says: 'a number, or text that reads as one: where Snap To Position X — Do takes the element', set: { snapX: c }, send: [] };
    },
    'snapToPositionY.value': (_s, v) => {
      const c = snapCoordinate(v);
      return c === undefined
        ? { says: 'nothing, null, empty, or not readable as a number: the Y the snap goes to is left as it was (what cannot be read is reported as a runtime error)', send: [] }
        : { says: 'a number, or text that reads as one: where Snap To Position Y — Do takes the element', set: { snapY: c }, send: [] };
    },
    // drag.ts :109-111 — raw
    'snapToPositionX.duration': (_s, v) => ({ says: 'always: read at the next Do — how long the X snap takes, in milliseconds; nothing means 300, and 0 or less lands at Value at the next frame', set: { durationX: v }, send: [] }),
    'snapToPositionY.duration': (_s, v) => ({ says: 'always: read at the next Do — how long the Y snap takes, in milliseconds; nothing means 300, and 0 or less lands at Value at the next frame', set: { durationY: v }, send: [] }),
    // react-component-node.ts inputProps — the prop, at the next paint
    enabled: (_s, v) => ({ says: 'always: read at the next press — off (exactly false; 0 or the text "false" is not off), a press starts no drag, a drag under way carries on to its let go, and the snaps still run', set: { enabled: v }, send: [] }),
    axis: (_s, v) => ({ says: 'always: read at the next press, move or let go, a drag under way included — X, Y or Both; on an axis it does not allow the element stays, Drag X / Y say where it is and Delta X / Y is 0; any other value moves it on neither', set: { axis: v }, send: [] }),
    useParentBounds: (_s, v) => ({ says: "always: read at the next move, a drag under way included — on, the element is kept inside its parent's box; off, it can leave it", set: { useParentBounds: v }, send: [] }),
    scale: (_s, v) => ({ says: "always: read at the next press, move or let go, a drag under way included — the pointer's movement is divided by it before it moves the element; nothing or 0 counts as 1", set: { scale: v }, send: [] }),
    // v3 (row C138, ruled "Read it as a number"): text is read as a number (`Number`); a number goes on as it came, NaN too
    inputPositionX: (_s, v) => ({ says: 'always: where the element starts on X — at the next paint a change moves it there and sends Drag X and Delta X (the change from the last one; a drag under way goes on from there); text is read as a number, and a value that is not a number again is no change', set: { startX: typeof v === 'string' ? Number(v) : v }, send: [] }),
    inputPositionY: (_s, v) => ({ says: 'always: where the element starts on Y — at the next paint a change moves it there and sends Drag Y and Delta Y (the change from the last one; a drag under way goes on from there); text is read as a number, and a value that is not a number again is no change', set: { startY: typeof v === 'string' ? Number(v) : v }, send: [] }),
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: at the next paint — off takes the Drag and its child off the page (Will Unmount; both snaps stop, and a drag under way ends with no Drag Ended); on again makes a new one at Start Drag X / Y (Did Mount, all four values sent, and the snaps that waited run from there)', set: { mounted: !!v }, send: [] }),
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: asks the page to scroll until the element it moves can be seen — nothing on the wire', send: [] })
  },
  {
    // placed on the page with its params set and its child added — the first frame's paint mounts it; Children Count at the frame's end
    world: {
      place: (s, _i, w) => {
        const f = frameEnd(s, w.now());
        return toPatch(s, f, ['childrenCount']);
      }
    },
    // the frame's end: the Dos' callbacks, the timer pass, then the paint (react-component-node.ts :1675-1689)
    afterInputs: (s, _i, w) => toPatch(s, frameEnd(s, w.now())),
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first
    person: {
      pressAt: (s, _i, v) => toPatch(s, onPaintedAct(s, (p) => press(p, v))),
      moveTo: (s, _i, v) => toPatch(s, onPaintedAct(s, (p) => move(p, v))),
      releaseAt: (s, _i, v) => toPatch(s, onPaintedAct(s, (p) => release(p, v)))
    }
  }
);

// ---------------------------------------------------------------------------------------------
// THE FRAME
// ---------------------------------------------------------------------------------------------

/** drag.ts :89-100 — `undefined` abstains; a number is taken; anything else is refused (the runtime raises an error off the wire). */
function snapCoordinate(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** One frame's end, in the runtime's order: the drain's callbacks (the Dos), the timer pass (nodecontext.ts :500-503), the paint. */
function frameEnd(s: Readonly<State>, now: number): Act {
  // what the frame's acts drained reports first, then the callbacks still waiting for the frame's end
  let acc: Act = { ...NONE, set: { scheduled: [], ran: [] }, ...(s.ran.length > 0 ? { outcomes: [...s.ran] } : {}) };
  let at: State = { ...s, scheduled: [], ran: [] };
  for (const axis of s.scheduled) {
    const a = doSnap(at, axis);
    acc = join(acc, a);
    at = { ...at, ...a.set };
  }
  const t = timerPass(at, now);
  acc = join(acc, t);
  at = { ...at, ...t.set };
  const p = painted(at);
  return join(acc, p);
}

/** drag.ts :67-78 → `outcomeOnInnerComponent`: on the component now — Done — or waiting for it (react-component-node.ts :2014-2056). */
function doSnap(s: Readonly<State>, axis: Axis): Act {
  const port = axis === 'x' ? 'snapToPositionX.do' : 'snapToPositionY.do';
  if (!s.onPage) {
    if (s.waiting.length < WAIT_CAP) return { ...NONE, set: { waiting: [...s.waiting, axis] } };
    const [dropped, ...rest] = s.waiting;
    return { ...NONE, set: { waiting: [...rest, axis] }, outcomes: [{ port: dropped === 'x' ? 'snapToPositionX.do' : 'snapToPositionY.do', outcome: 'failure', error: DROPPED }] };
  }
  return { ...snap(s, axis), outcomes: [{ port, outcome: 'done' }] };
}

/** Drag.tsx `snapToPositionX` / `Y`: nothing when already there; else the axis's timer is replaced by a new one, queued. */
function snap(s: Readonly<State>, axis: Axis, from: unknown = axis === 'x' ? s.x : s.y): Act {
  const to = axis === 'x' ? s.snapX : s.snapY;
  if (from === to) return NONE;
  const d = axis === 'x' ? s.durationX : s.durationY;
  const timer: Timer = { queued: true, running: false, start: 0, from, to, duration: d === undefined ? DEFAULT_DURATION : d };
  return { ...NONE, set: axis === 'x' ? { timerX: timer } : { timerY: timer } };
}

/** timerscheduler.ts `runTimers` (animate-to-value.ts THE FRAME): a running timer moves along Ease Out; a queued one joins and runs at 0. */
function timerPass(s: Readonly<State>, now: number): Act {
  let acc: Act = NONE;
  let at: State = { ...s };
  for (const axis of ['x', 'y'] as const) {
    const timer = axis === 'x' ? at.timerX : at.timerY;
    if (!timer) continue;
    let next: Timer | null = { ...timer };
    let value: unknown;
    let moved = false;
    if (timer.running && now >= timer.start) {
      const d = timer.duration as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const t = d > 0 ? (now - timer.start) / (d * 1) : 1.0;
      const localT = t >= 1.0 ? 1.0 : t * 1 - Math.floor(t * 1);
      value = EaseCurves.easeOut(timer.from as number, timer.to as number, localT);
      moved = true;
      if (!(t < 1.0)) next = null;
    }
    if (timer.queued) {
      next = { ...timer, queued: false, running: true, start: now };
      value = EaseCurves.easeOut(timer.from as number, timer.to as number, 0);
      moved = true;
    }
    const set: Partial<State> = axis === 'x' ? { timerX: next } : { timerY: next };
    if (moved) Object.assign(set, axis === 'x' ? { x: value, posX: value } : { y: value, posY: value });
    const a: Act = { set, send: moved ? [axis === 'x' ? 'positionX' : 'positionY'] : [], emit: [] };
    acc = join(acc, a);
    at = { ...at, ...a.set };
  }
  return acc;
}

/**
 * The page follows what the node wants: Mounted (Did Mount, Will Unmount), and the props the component renders. A mount is a new
 * component (Drag.tsx `constructor`, `componentDidMount`, then what waited); an unmount stops both snaps and ends a drag silently.
 */
function painted(s: Readonly<State>): Act {
  const props = { axis: s.axis, enabled: s.enabled, useParentBounds: s.useParentBounds, scale: s.scale, startX: s.startX, startY: s.startY };
  if (!s.mounted && s.onPage) {
    // DraggableCore `componentWillUnmount` takes off every listener; the child's element goes with it (a finger on it is on nothing now)
    const finger: Finger = s.finger === 'child' ? 'gone' : s.finger;
    return { ...NONE, set: { onPage: false, dragging: false, lastX: NaN, lastY: NaN, heardMouse: false, heardTouch: false, touchStart: false, finger, timerX: null, timerY: null, shown: props }, emit: ['willUnmount'] };
  }
  if (!s.mounted) return { ...NONE, set: { shown: props } };
  if (!s.onPage) {
    // `constructor`: { x: 0, y: 0 }; the library takes that as its position; `componentDidMount`: the start, or 0; then what waited
    const fresh: State = { ...s, onPage: true, shown: props, x: 0, y: 0, dragging: false, libX: 0, libY: 0, prevX: 0, prevY: 0, slackX: 0, slackY: 0, lastX: NaN, lastY: NaN, heardMouse: false, heardTouch: false, touchStart: false, timerX: null, timerY: null, waiting: [] };
    const x = s.startX ? s.startX : 0;
    const y = s.startY ? s.startY : 0;
    let acc: Act = { set: { ...diff(s, fresh), posX: x, posY: y, dX: 0, dY: 0 }, send: [...POSITIONS], emit: ['didMount'] };
    // what waited runs on the new component, from where the element starts (row C105, fixed in P109 ISL-048: the runtime ran it
    // before the mount's own write landed, from the constructor's 0 — the element jumped to 0 and animated from there)
    let at: State = { ...fresh, x, y };
    for (const axis of s.waiting) {
      const a = snap(at, axis);
      acc = join(acc, { ...a, outcomes: [{ port: axis === 'x' ? 'snapToPositionX.do' : 'snapToPositionY.do', outcome: 'done' }] });
      at = { ...at, ...a.set };
    }
    // the mount's write lands, and the library takes the new position
    acc = join(acc, { ...NONE, set: { x, y } });
    return join(acc, follow({ ...at, x, y }));
  }
  // an update: `componentDidUpdate` against the props last rendered
  let acc: Act = { ...NONE, set: { shown: props } };
  let at: State = { ...s, shown: props };
  // `Object.is` (row C106, fixed in P109 ISL-048: `!==` saw NaN change at every update, which looped the runtime's)
  if (!Object.is(s.shown.startX, s.startX)) {
    const a: Act = { set: { x: s.startX, posX: s.startX, dX: (s.startX as number) - (s.shown.startX as number) }, send: ['positionX', 'deltaX'], emit: [] };
    acc = join(acc, a);
    at = { ...at, ...a.set };
  }
  if (!Object.is(s.shown.startY, s.startY)) {
    const a: Act = { set: { y: s.startY, posY: s.startY, dY: (s.startY as number) - (s.shown.startY as number) }, send: ['positionY', 'deltaY'], emit: [] };
    acc = join(acc, a);
    at = { ...at, ...a.set };
  }
  return join(acc, follow(at));
}

/** Draggable `getDerivedStateFromProps`: a position prop that changed (`!==`) becomes the library's position. */
function follow(s: Readonly<State>): Act {
  if (s.x !== s.prevX || s.y !== s.prevY) return { ...NONE, set: { libX: s.x, libY: s.y, prevX: s.x, prevY: s.y } };
  return NONE;
}

// ---------------------------------------------------------------------------------------------
// THE GESTURE
// ---------------------------------------------------------------------------------------------

type Point = { x?: unknown; y?: unknown; by?: unknown; button?: unknown };

function pointOf(v: unknown): { x: number; y: number; touch: boolean; button: number } {
  const p = (v ?? {}) as Point;
  return { x: Number(p.x ?? 0), y: Number(p.y ?? 0), touch: p.by === 'touch', button: typeof p.button === 'number' ? p.button : 0 };
}

/** `props.scale || 1` (Drag.tsx `render`). */
function scaleOf(s: Readonly<State>): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (s.shown.scale as any) || 1; // eslint-disable-line @typescript-eslint/no-explicit-any
}

type Kind = 'mouse' | 'touch';

/** `typeof n === 'number' && !isNaN(n)` (react-draggable `isNum`): DraggableCore's `lastX` says a drag is under way (`createCoreData`). */
function isNum(n: unknown): n is number {
  return typeof n === 'number' && !isNaN(n);
}

/** The document listeners DraggableCore holds for one kind of pointer (`addEvent(ownerDocument, dragEventFor.move, …)`). */
function heard(s: Readonly<State>, kind: Kind): boolean {
  return kind === 'touch' ? s.heardTouch : s.heardMouse;
}

/**
 * `getControlPosition`: a core that started from a finger holds its touch identifier and reads only a touch (a mouse event: no
 * position, the event is ignored); one that started from a mouse reads `clientX` / `clientY`, which a touch event has none of (NaN).
 */
function readPoint(s: Readonly<State>, kind: Kind, p: { x: number; y: number }): { x: number; y: number } | null {
  if (s.touchStart) return kind === 'touch' ? p : null;
  return kind === 'mouse' ? p : { x: NaN, y: NaN };
}

/**
 * A press on the child: the face's finger goes down on it (or on the page, with no Drag there); DraggableCore's `onMouseDown` /
 * `onTouchStart` sets the module's pointer kind first (`dragEventFor`), then `handleDragStart`: only the main mouse button, not while
 * disabled; the start reports the movement since the last point when a drag is already under way (`createCoreData`); then Drag.tsx
 * `onStart`; then the listeners for the kind.
 */
function press(s: Readonly<State>, v: unknown): Act {
  const a = pressed(s, v);
  // on the child, the press's handler drains (THE DRAIN) — after the library's start, whatever it did
  return s.onPage ? join(a, drain({ ...s, ...a.set })) : a;
}

function pressed(s: Readonly<State>, v: unknown): Act {
  const p = pointOf(v);
  const finger: Finger = p.touch ? (s.onPage ? 'child' : 'body') : 'none';
  if (!s.onPage) return { ...NONE, set: { finger } };
  const kind: Kind = p.touch ? 'touch' : 'mouse';
  if ((!p.touch && p.button !== 0) || s.shown.enabled === false) return { ...NONE, set: { finger, kind } };
  const sc = scaleOf(s);
  const cdx = isNum(s.lastX) ? p.x - s.lastX : 0;
  const cdy = isNum(s.lastY) ? p.y - s.lastY : 0;
  // `createDraggableData`; on an axis Axis locks, where the element is and 0 (row C102)
  const canX = canDrag(s, 'x');
  const canY = canDrag(s, 'y');
  return {
    set: {
      finger,
      kind,
      touchStart: p.touch,
      posX: canX ? (s.libX as any) + cdx / sc : s.x, // eslint-disable-line @typescript-eslint/no-explicit-any
      posY: canY ? (s.libY as any) + cdy / sc : s.y, // eslint-disable-line @typescript-eslint/no-explicit-any
      dX: canX ? cdx / sc : 0,
      dY: canY ? cdy / sc : 0,
      timerX: null,
      timerY: null,
      dragging: true,
      lastX: p.x,
      lastY: p.y,
      ...(kind === 'touch' ? { heardTouch: true } : { heardMouse: true })
    },
    send: [...POSITIONS],
    emit: ['onStart']
  };
}

/**
 * THE DRAIN (pointerlisteners.ts :170-186): every pointer handler on the child's element — the library's own `onMouseDown` and
 * `onTouchEnd`, which win over the Group's, and the Group's `onTouchStart` — drains the graph after it runs (`updateDirtyNodes`), so a
 * Do waiting for the frame's end runs there and then, on the state React has committed (a handler's own `setState` lands after it).
 * Its Done is held for the frame's end. A mouse's release lands on the document, which drains nothing.
 */
function drain(s: Readonly<State>): Act {
  if (s.scheduled.length === 0) return NONE;
  let acc: Act = { ...NONE, set: { scheduled: [] } };
  let at: State = { ...s, scheduled: [] };
  for (const axis of s.scheduled) {
    const a = doSnap(at, axis);
    acc = join(acc, a);
    at = { ...at, ...a.set };
  }
  const { outcomes, ...rest } = acc;
  return { ...rest, set: { ...rest.set, ran: [...s.ran, ...(outcomes ?? [])] } };
}

/** The pointer that is down moves (the face: a finger's move goes to the element it went down on, a mouse's to the document). */
function move(s: Readonly<State>, v: unknown): Act {
  const kind: Kind = s.finger !== 'none' ? 'touch' : 'mouse';
  if (s.finger === 'gone' || !heard(s, kind) || !s.dragging) return NONE;
  const at = readPoint(s, kind, pointOf(v));
  if (!at) return NONE;
  const sc = scaleOf(s);
  const coreDX = isNum(s.lastX) ? at.x - s.lastX : 0;
  const coreDY = isNum(s.lastY) ? at.y - s.lastY : 0;
  let ux: any = (s.libX as any) + coreDX / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  let uy: any = (s.libY as any) + coreDY / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  let udx: any = coreDX / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  let udy: any = coreDY / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  let slackX: unknown = 0;
  let slackY: unknown = 0;
  if (s.shown.useParentBounds) {
    // Draggable `onDrag` with bounds: the slack is added, the parent's bounds (unreadable with no layout) clamp nothing, the slack is kept
    const nx = ux + (s.slackX as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const ny = uy + (s.slackY as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    slackX = (s.slackX as any) + (ux - nx); // eslint-disable-line @typescript-eslint/no-explicit-any
    slackY = (s.slackY as any) + (uy - ny); // eslint-disable-line @typescript-eslint/no-explicit-any
    udx = nx - (s.libX as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    udy = ny - (s.libY as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    ux = nx;
    uy = ny;
  }
  // the element moves only on the axes Axis allows (Draggable `render`): on a locked axis the outputs report where the element is, and
  // a Delta of 0 (row C102, fixed in P109 ISL-048: the runtime reported the pointer's movement there)
  const canX = canDrag(s, 'x');
  const canY = canDrag(s, 'y');
  return {
    set: { posX: canX ? ux : s.x, posY: canY ? uy : s.y, dX: canX ? udx : 0, dY: canY ? udy : 0, libX: ux, libY: uy, slackX, slackY, lastX: at.x, lastY: at.y },
    send: [...POSITIONS],
    emit: ['onDrag']
  };
}

/** Draggable `canDragX` / `canDragY` on the Axis last rendered: `x`, `y` or `both`; any other value moves neither. */
function canDrag(s: Readonly<State>, axis: Axis): boolean {
  return s.shown.axis === axis || s.shown.axis === 'both';
}

/**
 * The pointer comes up. A finger's end lands on the element it went down on: the child's own `onTouchEnd` (DraggableCore hands it to
 * the child: the module's kind becomes touch, then `handleDragStop`), then the document's listener; a finger whose element left the page
 * reaches neither. A mouse's lands on the document. Each is a stop only while a drag is under way (the second does nothing).
 */
function release(s: Readonly<State>, v: unknown): Act {
  const p = pointOf(v);
  const kind: Kind = s.finger !== 'none' ? 'touch' : 'mouse';
  const face: Partial<State> = kind === 'touch' ? { finger: 'none' } : {};
  if (s.finger === 'gone') return { ...NONE, set: face };
  let acc: Act = NONE;
  let at: State = { ...s };
  if (s.finger === 'child') {
    const a = stop({ ...at, kind: 'touch' }, 'touch', p);
    // then the drain (THE DRAIN), before React commits the stop's position: a Do drained here snaps from where the element was
    const d = drain({ ...at, kind: 'touch', ...a.set, x: at.x, y: at.y });
    acc = join(join({ ...NONE, set: { kind: 'touch' } }, a), d);
    at = { ...at, kind: 'touch', ...a.set, ...d.set };
  }
  if (heard(at, kind)) acc = join(acc, stop(at, kind, p));
  return join(acc, { ...NONE, set: face });
}

/** DraggableCore `handleDragStop` → Draggable `onDragStop` → Drag.tsx `onStop`; then the library goes back to the position prop. */
function stop(s: Readonly<State>, kind: Kind, p: { x: number; y: number }): Act {
  if (!s.dragging) return NONE;
  const at = readPoint(s, kind, p);
  if (!at) return NONE;
  const sc = scaleOf(s);
  const dataX = (s.libX as any) + (isNum(s.lastX) ? at.x - s.lastX : 0) / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  const dataY = (s.libY as any) + (isNum(s.lastY) ? at.y - s.lastY : 0) / sc; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Drag.tsx `onStop`: the element takes the position on the axes Axis allows, and Drag X / Y report where it is (row C102, fixed in
  // P109 ISL-048: the runtime sent the pointer's position on a locked axis)
  const x = canDrag(s, 'x') ? dataX : s.x;
  const y = canDrag(s, 'y') ? dataY : s.y;
  // Draggable `onDragStop` (controlled): its position goes back to the prop it was last handed; the re-render then follows the new state.
  // DraggableCore takes off the listeners of the module's CURRENT kind (`dragEventFor`)
  const back: State = { ...s, x, y, dragging: false, slackX: 0, slackY: 0, lastX: NaN, lastY: NaN, libX: s.prevX, libY: s.prevY };
  const f = follow(back);
  return {
    set: { x, y, posX: x, posY: y, dragging: false, slackX: 0, slackY: 0, lastX: NaN, lastY: NaN, libX: s.prevX, libY: s.prevY, ...f.set, ...(s.kind === 'touch' ? { heardTouch: false } : { heardMouse: false }) },
    send: ['positionX', 'positionY'],
    emit: ['onStop']
  };
}

/** A person's act on the painted page: the paint's work first (it may mount, unmount or move the element), then the act (which reads whether the Drag is there). */
function onPaintedAct(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  return join(p, then({ ...s, ...p.set }));
}

// ---------------------------------------------------------------------------------------------
// patches
// ---------------------------------------------------------------------------------------------

/** The four value outputs: within one frame the wire keeps the last DEFINED value written to each (the format's wire rule). */
const WIRED: ReadonlyArray<keyof State> = ['posX', 'posY', 'dX', 'dY'];

function join(a: Act, b: Act): Act {
  const outcomes = [...(a.outcomes ?? []), ...(b.outcomes ?? [])];
  const set: Partial<State> = { ...a.set, ...b.set };
  // a later write of nothing does not take back what the frame already sent (the timer pass's Drag Y, then a paint's `undefined`)
  for (const k of WIRED) if (k in b.set && b.set[k] === undefined && k in a.set && a.set[k] !== undefined) (set as Record<string, unknown>)[k] = a.set[k];
  return { set, send: [...a.send, ...b.send], emit: [...a.emit, ...b.emit], ...(outcomes.length > 0 ? { outcomes } : {}) };
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** The keys of `to` that differ from `from` (a mount's reset, written as a patch). */
function diff(from: Readonly<State>, to: Readonly<State>): Partial<State> {
  const out: Partial<State> = {};
  for (const k of Object.keys(to) as Array<keyof State>) if (!Object.is(from[k], to[k])) (out as Record<string, unknown>)[k] = to[k];
  return out;
}

/** The state a frame, a paint or an act leaves: every one of these written on every path, as it stands (s54's lesson, video.ts `heldElement`). */
const HELD: ReadonlyArray<keyof State> = ['onPage', 'shown', 'x', 'y', 'dragging', 'libX', 'libY', 'prevX', 'prevY', 'slackX', 'slackY', 'lastX', 'lastY', 'kind', 'heardMouse', 'heardTouch', 'touchStart', 'finger', 'timerX', 'timerY', 'scheduled', 'waiting', 'ran', 'posX', 'posY', 'dX', 'dY'];

/**
 * A reducer's patch: the whole held state as the work leaves it — so a branch is what it emits and resolves, never which keys a path
 * happened to change (a write made only when it changed something split every branch by it, s54) — and the sends, once each.
 */
function toPatch(s: Readonly<State>, a: Act, extra: string[] = []): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const after: State = { ...s, ...a.set };
  const set: Partial<State> = {};
  for (const k of HELD) (set as Record<string, unknown>)[k] = after[k];
  const send = dedupe([...a.send, ...extra]);
  const base = { set, send, emit: a.emit };
  return a.outcomes && a.outcomes.length > 0 ? { ...base, outcomes: a.outcomes } : base;
}
