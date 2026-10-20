/**
 * NSP-023 AC4 — THE PAGE MODEL, and the guard that keeps React-made state out of a visual spec.
 *
 * R11 / R12 (README §7): a visual spec says what a person sees and what the wire carries, in words any renderer can
 * honour. The sort (NSP-023 §3) asked of every state field: *would a renderer that writes the element directly, at once,
 * still keep this?* This file is that question as something that fails. Every visual spec (one with `acts` or a
 * `world.place`) has a model here, hand-kept like `scripts/node-spec/tiers.json`, that puts each of its state keys in
 * one class:
 *
 *   - `node` — what the node's code holds (its `_internal`, its props as written, its outputs).
 *   - `attr` — what the paint writes onto the element from the node: after every paint it equals its projection of
 *     the node's keys (`follows`). `KEEP` from a projection means "not drawn now" (off the page): no check.
 *   - `element` — which element is on the page (a counter): it changes only in a paint where one of `changesWith` does.
 *   - `held` — what the BROWSER holds on the element and a person moves: the keyboard, the caret, a select's selection,
 *     a range's handle. The paint may move it (the browser's own rules), but something other than a paint must move it
 *     too — a person's act, or the node writing the element at once. Each says what it is: either it `shows` a node value
 *     (the selection shows the Value wherever the list offers it — R14, "show whatever the last value it received was"),
 *     checked after every paint like an attribute, or it `keeps` one of the few things only the browser has.
 *
 * The rules (`checkSpec`), each measured on the interpreter over the spec's scenarios and its generated sequences:
 *
 *   G1  the model classifies every state key exactly once, and every visual spec has a model.
 *   G2  THE PAINT WRITES NO NODE KEY except the spec's `frameEnd` list — the node's own frame-end work, each with its
 *       line. (A copy of a node value "as last rendered", or a value waiting for a commit, is written only by the paint.)
 *   G3  THE NODE READS NO PAGE KEY: an input, a signal or a world event does not depend on an `attr`, `element` or `held`
 *       key — measured by perturbing the key and comparing the reducer's patch — except the `elementCalls` a node makes
 *       on its element (a Focus action meets the element's `disabled`), each with its line.
 *   G4  AN ATTRIBUTE FOLLOWS, WHAT IS SHOWN SHOWS, and an element changes with its element: after every paint, each
 *       `attr` equals its projection and each held key that `shows` equals its; an `element` key changes only beside one
 *       of its `changesWith`. (A component's own copy of a value the node holds is a held key that stops showing it.)
 *   G5  THE PAINT HAS NO MEMORY: the paint run on the state with every `attr` already drawn (preset to its projection)
 *       leaves the same node keys, sends the same outputs and fires the same pulses, Did Mount and Will Unmount aside.
 *       (React's effect keyed on "the value it last rendered" is exactly a paint that remembers.)
 *   G6  A HELD KEY IS HELD: something other than a paint moves it, somewhere in the run. A copy only the paint writes
 *       is an attribute, and must say what it follows.
 *   G7  A PERSON'S EVENTS FIRE FROM THE PERSON: the paint fires Did Mount, Will Unmount and the spec's `framePulses`
 *       (the node's own frame-end pulses) and nothing else. ("Who made it", read at a paint, is how React decided.)
 *   G8  THE WORLD'S KINDS ARE THE FORMAT'S: each spec's world handlers are among the format's, and the format's list is
 *       pinned here — a new kind (a `turn`, "React commits") has to be sorted before it lands.
 *
 * "The paint" is what the interpreter runs at a frame's end (`afterInputs`) and at the placing (`world.place`). An act
 * paints first too; the act's own writes are told from its paint by playing the paint alone beside it (G6).
 */

import { interpreterAdapter, runConformance } from '../src';
import type { AnyNodeSpec } from '../src';

export const KEEP = Symbol('not drawn now');

/** The few things a browser keeps on an element that show no node value. A held key that is none of these `shows` one. */
export type Keeps =
  | 'the keyboard'
  | 'the caret'
  | 'what a module put on the element'
  | 'a drag from outside the page'
  | 'where the pointer is'
  // s54 — the Video: what a media element holds (playing or paused, its position, its load, its size) and the page's activation
  | 'the media'
  | "a person's activation"
  // s60 — the Columns: the width the page lays its container out at (columns.ts THE WIDTH), which only a `resize` moves
  | 'the layout';
export type Held = { shows: (s: Readonly<Record<string, unknown>>) => unknown } | { keeps: Keeps };

export interface PageModel {
  node: readonly string[];
  attr: Readonly<Record<string, { follows: (s: Readonly<Record<string, unknown>>) => unknown; preset?: false; why?: string }>>;
  element?: Readonly<Record<string, { changesWith: readonly string[] }>>;
  held: Readonly<Record<string, Held>>;
  /** node keys the paint (or the placing) may write: the node's own frame-end work, or what the placing hands it */
  frameEnd?: readonly string[];
  /** a node-side reducer (`on.<port>`, `world.<kind>`) that calls its element → the page keys it may depend on */
  elementCalls?: Readonly<Record<string, readonly string[]>>;
  /** pulses beyond Did Mount / Will Unmount the paint may fire: the node's own frame-end pulses */
  framePulses?: readonly string[];
}

/** never preset: an element appearing or leaving is the element's lifecycle — Did Mount, a node announcing itself (G5) */
const onPage = { follows: (s: Readonly<Record<string, unknown>>) => s.mounted, preset: false as const };
const pageEnabled = { follows: (s: Readonly<Record<string, unknown>>) => s.enabled };
const pageVisible = { follows: (s: Readonly<Record<string, unknown>>) => s.visible };
/** utils.ts :340-364 — the Focus and Blur actions call the element: they meet what is on the page */
const keyboard = { keeps: 'the keyboard' } as const;
/** s54 — the Video's media element (video.ts THE MEDIA ELEMENT) */
const media = { keeps: 'the media' } as const;
/** video.ts `kindOf` — a Source naming a YouTube or Vimeo video draws an embed (video-embed.ts) */
const videoKind = (source: unknown): 'video' | 'embed' =>
  typeof source === 'string' && [/youtu\.be\/[A-Za-z0-9_-]{6,}/i, /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:[^#]*&)?v=|embed\/|v\/|shorts\/)[A-Za-z0-9_-]{6,}/i, /player\.vimeo\.com\/video\/\d+/i, /vimeo\.com\/(?:channels\/[^/]+\/)?\d+/i].some((p) => p.test(source)) ? 'embed' : 'video';
/**
 * Video.tsx :129-201 — the component's calls meet the element: its kind, its media, whether it may play, its `src` (a reload);
 * and (v6, row C161, s92 — added here s95) Restart and Reset seek to the Start Time the component was last drawn with
 * (`this.props.dom.startTime`), `elStart`
 */
const VIDEO_CALL = ['onPage', 'kind', 'srcAttr', 'elMuted', 'elStart', 'paused', 'position', 'ready', 'failed', 'pending', 'atEnd', 'activated', 'canAutoplay', 'loading', 'width', 'height'];
const FOCUS_CALLS = {
  'on.focus': ['onPage', 'pageEnabled', 'pageVisible', 'elementFocused'],
  'on.blur': ['onPage', 'pageEnabled', 'pageVisible', 'elementFocused']
};
const FIELD_CALL = ['onPage', 'elementFocused', 'field', 'pageType', 'caret', 'hadCaret'];
/** `focusMissed` (s103, R35): the Focus action's own record of whether the element it asked for was there (focus-not-mounted.ts) */
const CONTROL_NODE = ['enabled', 'hover', 'pressed', 'focused', 'mounted', 'visible', 'focusMissed'];
/**
 * P109 ISL-031 (P107-D30, ruled "Reset and announce") — a control's element leaving the page takes its states with it: the paint
 * that unmounts it writes Focused, Hover and Pressed false and fires Blurred and Hover End for the ones that were on. That is the
 * node's own work at the leaving (utils.ts `_leftPage`, from `componentWillUnmount`), not a person's, and it reads only node keys.
 */
const LEAVES = { frameEnd: ['focused', 'hover', 'pressed'], framePulses: ['onBlur', 'hoverEnd'] };
/**
 * P109 ISL-038 (P107-C81, ruled "the zone tracks itself") — a file drop zone's element leaving the page takes the drag with it: the
 * paint that unmounts it writes the count 0 and Is Dragging Over false (node-shared-port-definitions.ts `fileDropDark`, from
 * `_fileDropLeftPage` in `componentWillUnmount`). The node's own work at the leaving, reading only node keys.
 */
const FILE_DROP_LEAVES = ['dragDepth', 'isDragOver'];
/**
 * NSP-019 R38 (s105) — the size ports and what the render said of them (wired-grow.ts): what Width and Height hold is the node's
 * (node.ts `_inputValues`, written by the ports), and the sentence is the node's own memo, written at its render on the page
 * (layout.ts `_lastMainAxisGrowDiagnostic`), so the paint writes it.
 */
const GROW = { node: ['sizes', 'grow'], frameEnd: ['grow'] };

export const PAGE_MODELS: Readonly<Record<string, PageModel>> = {
  'net.noodl.controls.button': {
    node: [...CONTROL_NODE, ...GROW.node],
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    ...LEAVES,
    frameEnd: [...LEAVES.frameEnd, ...GROW.frameEnd],
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.checkbox': {
    node: [...CONTROL_NODE, 'checked'],
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    ...LEAVES,
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.visual.icon': {
    node: ['mounted'],
    attr: { onPage },
    held: {}
  },
  Text: {
    node: ['mounted', 'tag', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'depthOn', 'isDragOver', 'droppedFiles', 'droppedFile', ...GROW.node],
    attr: {
      onPage,
      // an element's type cannot change: presetting it would claim an element the page does not have
      shownTag: { follows: (s) => (s.onPage ? s.tag : KEEP), preset: false }
    },
    element: { elem: { changesWith: ['onPage', 'shownTag'] } },
    // s50 — a file dragged from the desktop: the files it carries and the element it is over are the browser's drag, moved by a person
    held: { focusedElem: keyboard, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      // s51 — the zone side: a card beside it holds the keyboard (where the pointer is, and where its own drag started, went with C78)
      cardFocused: keyboard
    },
    frameEnd: [...FILE_DROP_LEAVES, ...GROW.frameEnd],
    elementCalls: { 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem'] }
  },
  // s53 — the Text's model with no Tag: the element is always a `<div>`, so only a mount makes a new one
  Circle: {
    node: ['mounted', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'depthOn', 'isDragOver', 'droppedFiles', 'droppedFile'],
    attr: { onPage },
    element: { elem: { changesWith: ['onPage'] } },
    held: { focusedElem: keyboard, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard
    },
    frameEnd: [...FILE_DROP_LEAVES],
    elementCalls: { 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem'] }
  },
  // s53 — the Shape's model, and the picture: the element's source and Source Set as written (node), the last failure's reason
  Image: {
    node: ['mounted', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'depthOn', 'isDragOver', 'droppedFiles', 'droppedFile', 'src', 'srcSet', 'imageError', ...GROW.node],
    attr: { onPage },
    element: { elem: { changesWith: ['onPage'] } },
    held: { focusedElem: keyboard, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard
    },
    frameEnd: [...FILE_DROP_LEAVES, ...GROW.frameEnd],
    elementCalls: { 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem'] }
  },
  // s54 — the Image's model, and the Video's: the element a Source draws (an embed or a `<video>`: a new element without a mount, as the
  // Text's Tag) with its `src` and flags, the media element the browser holds, and the component the node calls
  Video: {
    node: ['mounted', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'depthOn', 'isDragOver', 'droppedFiles', 'droppedFile',
      'source', 'startTime', 'endTime', 'muted', 'autoplay', 'loop', 'wantToPlay', 'canPlay', 'timeOut', 'videoWidth', 'videoHeight', 'playbackError', 'domElement', 'waiting', 'ran', ...GROW.node],
    attr: {
      onPage,
      // an element's type cannot change: presetting it would claim an element the page does not have
      kind: { follows: (s) => (s.onPage ? videoKind(s.source) : KEEP), preset: false },
      // the browser loads when the `src` changes: presetting it would claim a load that has not happened
      srcAttr: { follows: (s) => (s.onPage && videoKind(s.source) === 'video' ? s.srcAttr : KEEP), preset: false, why: 'a `src` taken away stays as it was (HTML: removing it loads nothing), so it follows the Source only while there is one' },
      elMuted: { follows: (s) => (s.onPage && videoKind(s.source) === 'video' ? !!s.muted : KEEP) },
      elAutoplay: { follows: (s) => (s.onPage && videoKind(s.source) === 'video' ? !!s.autoplay : KEEP) },
      elLoop: { follows: (s) => (s.onPage && videoKind(s.source) === 'video' ? !!s.loop : KEEP) },
      // v6 (row C161, s92): the Start Time the component was drawn with, where Restart and Reset seek — drawn with the flags.
      // s92 added it to the spec and not here, so G1 read it as classified 0 times (found s95)
      elStart: { follows: (s) => (s.onPage && videoKind(s.source) === 'video' ? s.startTime : KEEP) }
    },
    element: { elem: { changesWith: ['onPage', 'kind'] } },
    held: { focusedElem: keyboard, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard,
      paused: media, position: media, ready: media, loading: media, failed: media, pending: media, canAutoplay: media, atEnd: media, width: media, height: media,
      activated: { keeps: "a person's activation" }
    },
    // at a mount a new component (Video.tsx :115-127: it wants nothing and has seen no load) runs what waited
    // (`_flushPendingInnerActions`) and reports it in order; a new `<video>` is DOM Element (its ref), one that goes is nothing; a load
    // puts the media at 0, which a `timeupdate` sends
    frameEnd: ['wantToPlay', 'canPlay', 'waiting', 'ran', 'domElement', 'timeOut', ...FILE_DROP_LEAVES, ...GROW.frameEnd],
    // the actions and Source Object call the component, which calls its element: what it is, whether it may play, where it is
    elementCalls: {
      'on.acceptDrops': [],
      'world.timer': ['onPage', 'elem'],
      'on.play': VIDEO_CALL,
      'on.restart': VIDEO_CALL,
      'on.pause': VIDEO_CALL,
      'on.reset': VIDEO_CALL,
      'on.srcObject': VIDEO_CALL
    }
  },
  // s52 — the Text's model with the Group's additions: the focus tracker's list (the viewer's, moved by Focus and by clicks), the
  // element the component mounted with (the tracker finds the node on it, C86), the gesture's index, Block Pointer Events, the scrolls
  Group: {
    node: ['mounted', 'tag', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'blocks', 'draggable', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'phase', 'input', 'inZone', 'index', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'depthOn', 'isDragOver', 'droppedFiles', 'droppedFile', 'scrollIndex', 'scrollElement', 'scheduled', 'waiting', 'ran', 'focusMissed', ...GROW.node],
    attr: {
      onPage,
      shownTag: { follows: (s) => (s.onPage ? s.tag : KEEP), preset: false }
    },
    // Group.tsx's root ref puts the node on every element it meets: a mount, and since C86's fix (P109, the Group v3) a new Tag too
    element: { elem: { changesWith: ['onPage', 'shownTag'] }, stampOn: { changesWith: ['onPage', 'shownTag'] } },
    held: { focusedElem: keyboard, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard,
      // focus-tracker.ts — the viewer's list of focused nodes: a Group is not focusable, so this is its keyboard focus
      listed: keyboard
    },
    // the frame's scrolls (`scheduleAfterInputsHaveUpdated`), the ones waiting for the component, and the
    // outcomes the frame resolved before its end (reported there, in order)
    frameEnd: ['scheduled', 'waiting', 'ran', ...FILE_DROP_LEAVES, ...GROW.frameEnd],
    // the Focus action asks the tracker's list, and (v2, R16) whether the Group is on the page; the hold timer's lift meets the page
    // and drains the frame's scrolls
    elementCalls: { 'on.acceptDrops': [], 'on.focus': ['listed', 'onPage'], 'world.timer': ['onPage', 'elem'] }
  },
  'net.noodl.controls.textinput': {
    node: ['fieldType', 'runOnChange', 'maxLength', 'textToInsert', 'text', 'startValue', 'out', 'wire', 'announced', 'hasAnnounced', 'queue', 'blocksPointer', 'opacityZero', ...CONTROL_NODE, ...GROW.node],
    attr: { onPage, pageEnabled, pageVisible, pageOpacityZero: { follows: (s) => s.opacityZero }, pageType: { follows: (s) => (s.onPage ? s.fieldType : KEEP) } },
    held: {
      elementFocused: keyboard,
      // the field shows the Value (a Number field's text is the person's, which the Value only converts)
      field: { shows: (s) => (s.onPage && s.fieldType !== 'number' ? (s.out === null || s.out === undefined ? '' : String(s.out)) : KEEP) },
      caret: { keeps: 'the caret' },
      hadCaret: { keeps: 'the caret' }
    },
    // text-input.ts :190, :263 — the frame-end callbacks a Set or an Insert schedules (node.ts :1276-1279)
    frameEnd: ['startValue', 'out', 'wire', 'announced', 'hasAnnounced', 'queue', ...LEAVES.frameEnd, ...GROW.frameEnd],
    framePulses: ['textChanged', ...LEAVES.framePulses],
    // Clear, Backspace and a Start Value write the field at once when there is one (text-input.ts :423, :431
    // `innerReactComponentRef`; the spec's `componentSetText`): they meet its text, its type and its cursor
    elementCalls: { ...FOCUS_CALLS, 'on.clear': FIELD_CALL, 'on.backspace': FIELD_CALL, 'on.startValue': FIELD_CALL }
  },
  'net.noodl.controls.range': {
    // v7 (R39) — `valueWarning`: the sentence a Value that is not a number raised, the node's
    node: [...CONTROL_NODE, 'min', 'max', 'step', 'authorValue', 'out', 'percent', 'valueWarning', 'pending', ...GROW.node],
    attr: { onPage, pageEnabled, pageVisible },
    // the handle shows the Value (R14: the last word, a person's or the graph's)
    held: { elementFocused: keyboard, shown: { shows: (s) => (s.onPage ? s.out : KEEP) } },
    // slider.ts :39-54, :220-236 — the graph's word reaches the node's value at the next paint (v2, D36)
    frameEnd: ['out', 'percent', 'pending', ...LEAVES.frameEnd, ...GROW.frameEnd],
    framePulses: LEAVES.framePulses,
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.options': {
    node: [...CONTROL_NODE, 'value', 'items', ...GROW.node],
    attr: { onPage, pageEnabled, pageVisible },
    // the selection shows the Value wherever the list offers it (v3, R14); otherwise it is the browser's (dropdown.ts `painted`)
    held: { elementFocused: keyboard, domSelected: { shows: (s) => (s.onPage && offers(s.items, s.value) ? s.value : KEEP) } },
    ...LEAVES,
    frameEnd: [...LEAVES.frameEnd, ...GROW.frameEnd],
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.radiobutton': {
    node: [...CONTROL_NODE, 'checked', 'value', 'inGroup', 'gValue'],
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    // radiobutton.ts :37 — Checked is what the button shows of the group's selection, at its paint (v2, R15 C76); the
    // placing hands the button its group (world.ts GROUP)
    frameEnd: ['checked', 'inGroup', 'gValue', ...LEAVES.frameEnd],
    framePulses: LEAVES.framePulses,
    elementCalls: FOCUS_CALLS
  },
  'Radio Button Group': {
    node: ['value', 'mounted', 'visible', ...GROW.node],
    attr: { onPage, pageVisible },
    held: {},
    frameEnd: GROW.frameEnd
  },
  // s55 — the Drag (drag.ts): react-draggable's position and pointer are the component's (node), the finger is where the pointer is
  Drag: {
    node: ['mounted', 'axis', 'enabled', 'useParentBounds', 'scale', 'startX', 'startY', 'x', 'y', 'dragging', 'libX', 'libY', 'prevX', 'prevY', 'slackX', 'slackY', 'lastX', 'lastY', 'kind', 'heardMouse', 'heardTouch', 'touchStart', 'snapX', 'snapY', 'durationX', 'durationY', 'timerX', 'timerY', 'scheduled', 'waiting', 'ran', 'posX', 'posY', 'dX', 'dY'],
    attr: {
      onPage,
      // Drag.tsx `componentDidUpdate` moves the element by a Start Drag X / Y that CHANGED since the one drawn: what was drawn is read at the paint
      shown: { follows: (s) => ({ axis: s.axis, enabled: s.enabled, useParentBounds: s.useParentBounds, scale: s.scale, startX: s.startX, startY: s.startY }), preset: false, why: 'Start Drag X / Y move the element by the change since the last one drawn (Drag.tsx `componentDidUpdate`), so what was drawn is part of the page' }
    },
    held: { finger: { keeps: 'where the pointer is' } },
    // the frame's end: the Dos' callbacks, the timer pass, then the paint — a mount is a new component (its position, the library's,
    // what waited), an unmount ends the drag and both snaps (drag.ts THE FRAME)
    frameEnd: ['x', 'y', 'dragging', 'libX', 'libY', 'prevX', 'prevY', 'slackX', 'slackY', 'lastX', 'lastY', 'heardMouse', 'heardTouch', 'touchStart', 'timerX', 'timerY', 'scheduled', 'waiting', 'ran', 'posX', 'posY', 'dX', 'dY']
  },
  // s56 — the Component Stack (component-stack.ts): everything is the node's own — its pages, its queue, the handler's names; the frame's
  // end runs its callbacks (a reset, the callers' requests), the transition's tick, and the paint, which registers and so resets
  // v17 (s33, row C139) — Keep Pages When Unmounted, a reset owed while off and the address at the unmount are the node's; the paint
  // (a mount, an unmount) clears or records the last two
  // v18 (P109 s36, rows C120, C126) — a reset to the start page asked this frame, and the stack's own Backs not yet landed, are the
  // node's: the frame's end takes the first and a Pop's end counts the second; a landed Back (`popstate`) and an unmount clear it
  'Page Stack': {
    node: ['mounted', 'isMounted', 'name', 'useRoutes', 'keepPages', 'resetOwed', 'addressAtUnmount', 'regKey', 'waiting', 'pages', 'pageInfo', 'startPageId', 'stack', 'children', 'deleted', 'nextPage', 'running', 'queue', 'busy', 'hops', 'owed', 'callbacks', 'resetScheduled', 'resetTokens', 'resetToStart', 'ownBacks', 'countLate', 'top', 'depth', 'count'],
    attr: { onPage },
    held: {},
    frameEnd: ['isMounted', 'resetOwed', 'addressAtUnmount', 'regKey', 'waiting', 'stack', 'children', 'deleted', 'nextPage', 'running', 'queue', 'busy', 'hops', 'owed', 'callbacks', 'resetScheduled', 'resetTokens', 'resetToStart', 'ownBacks', 'countLate', 'top', 'depth', 'count']
  },
  // s57 — the Page Router (page-router.ts): everything is the node's own — its pages, its queue, the handler's names, the navigates
  // waiting out their millisecond; the frame's end runs its callbacks (a reset, the Navigates' hand-ons) and the paint, which
  // registers and so resets (or replays what waited)
  Router: {
    node: ['mounted', 'isMounted', 'name', 'regKey', 'waiting', 'handed', 'nextHand', 'pages', 'urlPath', 'indexName', 'current', 'currentParams', 'built', 'deleted', 'children', 'nextPage', 'queue', 'busy', 'hops', 'owed', 'callbacks', 'resetScheduled', 'resetTokens', 'countLate', 'early', 'title', 'component', 'count'],
    attr: { onPage },
    held: {},
    frameEnd: ['isMounted', 'regKey', 'waiting', 'handed', 'nextHand', 'currentParams', 'deleted', 'children', 'queue', 'busy', 'hops', 'owed', 'callbacks', 'resetScheduled', 'resetTokens', 'countLate', 'early', 'count']
  },
  // s59 — the Repeater (repeater.ts): everything is the node's own — its list, its queue, its rows (its parent's children, which it has no
  // element of its own to draw); the frame's end runs its callbacks (the copy, the rebuild) and the queue they start, which fires Items
  // Rendered and answers Refresh
  'For Each': {
    node: ['own', 'items', 'template', 'templateType', 'script', 'compiles', 'mapping', 'mapCompiles', 'copyScheduled', 'refreshScheduled', 'callbacks', 'tokens', 'queue', 'running', 'changed', 'hops', 'settling', 'owed', 'building', 'rows', 'answered', 'pending', 'dirty', 'afterFrame', 'made', 'itemId', 'warnings', 'reported', 'emptyReportedIn', 'outs'],
    attr: {},
    held: {},
    // s61 (v2) — Script and whether it compiled are the node's, written by the input; a rebuild's pending answers (`settling`) the queue's.
    // s62 (v2) — the input mapping and whether it compiled likewise (a row's mapped inputs ride in `rows`).
    // s63 (v2) — the frame's end is a drain: the rows' waiting signals are heard and reported there (Item Id, the item outputs)
    // s104 (v11, R35) — what the editor is told is the node's; the frame's end tells it too (an empty entry the copy met, a rebuild's
    // Failure, a row's problem — once per rebuild, the set it starts)
    frameEnd: ['copyScheduled', 'refreshScheduled', 'callbacks', 'tokens', 'queue', 'running', 'changed', 'hops', 'settling', 'owed', 'building', 'rows', 'answered', 'pending', 'dirty', 'afterFrame', 'made', 'itemId', 'warnings', 'reported', 'emptyReportedIn', 'outs'],
    framePulses: ['itemsRendered']
  },
  // s60 — the Columns (columns.ts): the props and what each size port holds are the node's; the page's width is the layout's, moved only
  // by a `resize`. At a frame's end the node measures its container (whether there is one to measure, the measurement that is due, the
  // width read) and reports the band — Breakpoint, and At Medium or At Small for a band entered: its own frame-end work and pulses
  'net.noodl.visual.columns': {
    node: ['mounted', 'layout', 'sizing', 'mediumLayout', 'smallLayout', 'mediumBelow', 'smallBelow', 'gap', 'mediumHeld', 'smallHeld', 'gapHeld', 'container', 'observer', 'measured', 'band', 'out'],
    attr: { onPage },
    held: { width: { keeps: 'the layout' } },
    frameEnd: ['container', 'observer', 'measured', 'band', 'out'],
    framePulses: ['onAtMedium', 'onAtSmall']
  }
};

/** A list of options (dropdown.ts `optionsOf`, read leniently: a stored-text list is not checked) offers this value. */
function offers(items: unknown, value: unknown): boolean {
  if (typeof value !== 'string' || !Array.isArray(items)) return false;
  return items.some((item) => {
    if (item === null || typeof item !== 'object') return false;
    const o = item as { Value?: unknown; Label?: unknown };
    const v = o.Value === undefined || o.Value === null || typeof o.Value === 'boolean' ? o.Label : String(o.Value);
    return v === value;
  });
}

/** A visual spec: one a person acts on, or one placed on the page. */
export const isVisual = (spec: AnyNodeSpec) => !!spec.acts || !!spec.world?.place;

/** The format's world kinds (spec.ts `WorldHandlers`), pinned: a new one is sorted (NSP-023 §3) before it lands. */
// s70 (P107) / P109 s36 — `popstate`: a `history.back()` the page made landed; a browser event, heard by the node's own listener
// NSP-022 s96 — `host`: a service of the backend process answered (world.ts HOST); a world answer as `backend` is (a promise landing),
// not a turn of the page — and only cloud-only nodes, which are never on a page, have it
// NSP-022 s97 — `invoke`: the backend process handed the function its request (world.ts HOST, THE INVOCATION); a world hand-off, as `host`
export const WORLD_KINDS = ['timer', 'response', 'change', 'resize', 'page', 'popup', 'backend', 'host', 'invoke', 'store', 'auth', 'authReturn', 'mount', 'place', 'picker', 'realtime', 'socket', 'resume', 'popstate', 'stream', 'group'] as const;

const LIFECYCLE = new Set(['didMount', 'willUnmount']);

type Patch = { set?: Record<string, unknown>; send?: unknown[]; emit?: string[] } & Record<string, unknown>;
type S = Record<string, unknown>;

const canon = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (x === undefined ? '$undefined' : typeof x === 'number' && !Number.isFinite(x) ? `$${x}` : Object.is(x, -0) ? '$-0' : typeof x === 'symbol' ? String(x) : x));

/** s56 — an attribute equals its projection: by identity, or — an attribute that is an object (the Drag's `shown`, the props last drawn) — by value */
const same = (a: unknown, b: unknown) => Object.is(a, b) || (a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && canon(a) === canon(b));

function perturb(v: unknown): unknown {
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v + 1;
  if (typeof v === 'string') return `${v}~`;
  return '~';
}

export interface Finding {
  rule: string;
  key: string;
  where: string;
  count: number;
  example?: string;
}

/**
 * The spec, wrapped: every reducer is played as before (the trace is unchanged), and each call is checked against the
 * model. Findings collect in `findings`.
 */
export function guarded(spec: AnyNodeSpec, model: PageModel, findings: Map<string, Finding>): { spec: AnyNodeSpec; heldMoved: Set<string> } {
  const page = new Set([...Object.keys(model.attr), ...Object.keys(model.element ?? {}), ...Object.keys(model.held)]);
  const node = new Set(model.node);
  const frameEnd = new Set(model.frameEnd ?? []);
  const pulses = new Set([...LIFECYCLE, ...(model.framePulses ?? [])]);
  const heldMoved = new Set<string>();
  const find = (rule: string, key: string, where: string, example?: () => string) => {
    const id = `${rule} ${key} ${where}`;
    const f = findings.get(id);
    if (f) f.count++;
    else findings.set(id, { rule, key, where, count: 1, example: example?.() });
  };
  const after = (s: S, r: Patch | undefined): S => ({ ...s, ...(r?.set ?? {}) });

  const paint =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, ...rest: unknown[]) => {
      const r = f(s, ...rest) as Patch | undefined;
      const next = after(s, r);
      // G2
      for (const k of Object.keys(r?.set ?? {})) if (node.has(k) && !frameEnd.has(k) && !Object.is(next[k], s[k])) find('G2', k, where, () => `${canon(s[k])} → ${canon(next[k])}`);
      // G4
      for (const [k, a] of Object.entries(model.attr)) {
        const v = a.follows(next);
        if (v !== KEEP && !same(next[k], v)) find('G4', k, where, () => `${canon(next[k])}, follows ${canon(v)}`);
      }
      for (const [k, h] of Object.entries(model.held)) {
        if (!('shows' in h)) continue;
        const v = h.shows(next);
        if (v !== KEEP && !same(next[k], v)) find('G4', k, where, () => `${canon(next[k])}, shows ${canon(v)}`);
      }
      for (const [k, e] of Object.entries(model.element ?? {})) if (!Object.is(next[k], s[k]) && !e.changesWith.some((c) => !Object.is(next[c], s[c]))) find('G4', k, where, () => 'changed alone');
      // G5 — s59: only when some attribute is presettable. With none, the second run is the first again, and for a spec that writes
      // the registry (the Repeater's own list) or draws from the world it would write and draw twice — noise, and a world the rest of
      // the run did not have
      const drawn: S = { ...s };
      let presettable = false;
      for (const [k, a] of Object.entries(model.attr)) {
        if (a.preset === false) continue;
        presettable = true;
        const v = a.follows(s);
        if (v !== KEEP) drawn[k] = v;
      }
      if (presettable) {
        const r2 = f(drawn, ...rest) as Patch | undefined;
        const next2 = after(drawn, r2);
        for (const k of node) if (canon(next[k]) !== canon(next2[k])) find('G5', k, where, () => `${canon(next[k])} vs ${canon(next2[k])} with the page already drawn`);
        const emits = (p: Patch | undefined) => (p?.emit ?? []).filter((e) => !LIFECYCLE.has(e));
        if (canon(r?.send ?? []) !== canon(r2?.send ?? [])) find('G5', 'send', where, () => `${canon(r?.send)} vs ${canon(r2?.send)}`);
        if (canon(emits(r)) !== canon(emits(r2))) find('G5', 'emit', where, () => `${canon(emits(r))} vs ${canon(emits(r2))}`);
      }
      // G7
      for (const e of r?.emit ?? []) if (!pulses.has(e)) find('G7', e, where);
      return r;
    };

  const nodeSide =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, ...rest: unknown[]) => {
      const r = f(s, ...rest) as Patch | undefined;
      const allowed = new Set(model.elementCalls?.[where] ?? []);
      for (const k of page) {
        if (!Object.is(after(s, r)[k], s[k])) heldMoved.add(k);
        if (allowed.has(k)) continue;
        const strip = (p: Patch | undefined) => {
          if (!p?.set || !(k in p.set)) return p;
          const { [k]: _drop, ...set } = p.set;
          return { ...p, set };
        };
        let r2: Patch | undefined;
        let threw = false;
        try {
          r2 = f({ ...s, [k]: perturb(s[k]) }, ...rest) as Patch | undefined;
        } catch {
          threw = true;
        }
        if (threw || canon(strip(r)) !== canon(strip(r2))) find('G3', k, where, () => (threw ? 'threw on a perturbed value' : `${canon(strip(r))} vs ${canon(strip(r2))}`));
      }
      return r;
    };

  const ownAfterInputs = spec.afterInputs as unknown as ((s: S, inputs: unknown, world: unknown) => Patch | undefined) | undefined;
  const act =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, inputs: unknown, value: unknown, world: unknown) => {
      const r = f(s, inputs, value, world) as Patch | undefined;
      const painted = ownAfterInputs ? after(s, ownAfterInputs(s, inputs, world)) : s;
      const next = after(s, r);
      for (const k of Object.keys(model.held)) if (!Object.is(next[k], painted[k])) heldMoved.add(k);
      return r;
    };

  const on: AnyNodeSpec['on'] = {};
  for (const [port, f] of Object.entries(spec.on)) on[port] = f && (nodeSide(`on.${port}`, f as never) as never);
  const person: Record<string, never> = {};
  for (const [name, f] of Object.entries(spec.person ?? {})) person[name] = act(`act.${name}`, f as never) as never;
  const world: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(spec.world ?? {})) world[k] = f && (k === 'place' ? paint('world.place', f as never) : nodeSide(`world.${k}`, f as never));
  return {
    spec: { ...spec, on, person: spec.person && person, world: spec.world && (world as never), afterInputs: spec.afterInputs && (paint('afterInputs', spec.afterInputs as never) as never) },
    heldMoved
  };
}

/** G1 and G8 — what is read from the spec's shape alone. */
export function staticFindings(spec: AnyNodeSpec, model: PageModel | undefined): string[] {
  const out: string[] = [];
  if (!model) return [`G1 ${spec.type} is a visual spec with no page model`];
  const classes = [model.node, Object.keys(model.attr), Object.keys(model.element ?? {}), Object.keys(model.held)].flat();
  for (const k of Object.keys(spec.state)) {
    const n = classes.filter((c) => c === k).length;
    if (n !== 1) out.push(`G1 ${k}: classified ${n} times`);
  }
  for (const k of classes) if (!(k in spec.state)) out.push(`G1 ${k}: not a state key`);
  for (const k of model.frameEnd ?? []) if (!model.node.includes(k)) out.push(`G1 frameEnd ${k}: not a node key`);
  for (const k of Object.keys(spec.world ?? {})) if (!(WORLD_KINDS as readonly string[]).includes(k)) out.push(`G8 world.${k}: not a kind of the format`);
  return out;
}

/** The format's world kinds, read from spec.ts's `WorldHandlers` (its text, so a copy of it can be planted). */
export function formatWorldKinds(specTs: string): string[] {
  const body = /export interface WorldHandlers<[^>]*>[^{]*\{([\s\S]*?)\n\}/.exec(specTs)?.[1] ?? '';
  return [...body.matchAll(/^ {2}(\w+)\?:/gm)].map((m) => m[1]);
}

/** Every finding the guard has for one spec under one model: the static ones, then what the plays measured. */
export async function guardFindings(spec: AnyNodeSpec, model: PageModel | undefined, seeds: readonly number[], sequences: number): Promise<string[]> {
  const out = staticFindings(spec, model);
  if (!model || out.length > 0) return out;
  const findings = new Map<string, Finding>();
  const { spec: wrapped, heldMoved } = guarded(spec, model, findings);
  for (const seed of seeds) await runConformance(wrapped, interpreterAdapter({ resolve: () => wrapped }), { sequences, seed, mutants: false });
  for (const f of findings.values()) out.push(`${f.rule} ${f.key} in ${f.where} ×${f.count}${f.example ? `: ${f.example}` : ''}`);
  for (const k of Object.keys(model.held)) if (!heldMoved.has(k)) out.push(`G6 ${k}: held, but only a paint ever moved it — an attribute: say what it follows`);
  return out;
}
