/**
 * HLT-017 — picking an element up and dropping it on another one.
 *
 * Before this the runtime had two halves of a drag and no whole one. `Drag` moves an element and
 * never learns what is under it; DEF-029's `Accept File Drops` is a drop target that only a file
 * off the desktop can reach. A kanban — the planner's day columns, the Todo template's lists —
 * could only be built with arithmetic on pixel offsets, which breaks the moment two columns differ
 * in width and does nothing at all on a phone.
 *
 * ## The shape, as Richard ruled it (HLT-017 §5, 2026-09-22)
 *
 * - **R1 — a copy follows the pointer.** The original stays where it is, faded, until the graph
 *   moves the data. The engine never moves data: a drop fires `Dropped` on the zone and the graph's
 *   own command does the move, so a refused or failed move leaves nothing half done.
 * - **R2 — on touch, press and hold.** A ring fills beside the finger for `Hold Time`; when it is
 *   full the copy lifts. Moving first scrolls instead, letting go early picks nothing up. A mouse
 *   picks up at once — as soon as it has moved a few pixels, so a plain click is still a click.
 * - **R3 — it lands where it is dropped, and the others make room.** A zone with `Make Room` on
 *   slides its children apart to open a gap where the drop will land. Transforms only: nothing is
 *   re-rendered and the graph hears one signal, after.
 *
 * ## Why one controller on the document, not React props
 *
 * A gesture outlives the element it started on: the pointer leaves the card, crosses other
 * columns, and ends somewhere the card knows nothing about. So the listeners live on the document
 * for the length of one gesture, and the only per-node state is two registries of armed nodes,
 * read through `getDOMElement()` at event time. That is also DEF-029's rule for the same reason —
 * a port set while the preview runs does not re-render the node, so a render-time answer would be
 * stale exactly when an author is testing it. And it keeps this out of `pointerlisteners.ts`
 * entirely: `blockTouch` and `clickBubbling` govern the sixteen pointer events React delivers, and
 * a card whose Click is wired must still be pickable.
 *
 * Pointer events, not HTML5 drag-and-drop: HTML5 DnD does not fire on touch, which is the gap the
 * planner's workaround already has on the phone layout.
 *
 * @module noodl-viewer-react/drag-drop
 */

/** The slice of a visual node this module touches. Structural, like DEF-029's `FileDropInstance`. */
export interface DragDropNode {
  _internal: {
    draggable?: boolean;
    dragValue?: unknown;
    dragKind?: string;
    holdToDrag?: HoldMode;
    holdTime?: number;
    isLifted?: boolean;

    acceptDrops?: boolean;
    acceptKind?: string;
    makeRoom?: boolean;
    dropZoneName?: string;
    isDropTarget?: boolean;
    droppedValue?: unknown;
    dropIndex?: number;
    [extra: string]: unknown;
  };
  _deleted?: boolean;
  getDOMElement(): HTMLElement | null;
  hasOutput(name: string): boolean;
  flagOutputDirty(name: string): void;
  sendSignalOnOutput(name: string): void;
  context?: { updateDirtyNodes?: () => void };
}

/** `Hold To Drag`: when a press must be held before it picks up. */
export type HoldMode = 'touch' | 'always' | 'never';

const DEFAULT_HOLD_SECONDS = 0.5;
/** How far a mouse must move before a press becomes a drag — below it, a press is a click. */
const MOUSE_SLOP_PX = 4;
/** How far a held finger may drift before the hold gives up and the page scrolls instead. */
const HOLD_SLOP_PX = 8;

const draggables = new Set<DragDropNode>();
const zones = new Set<DragDropNode>();

// ── Registries ──────────────────────────────────────────────────────────────

/** Attributes this module added to an element, so switching the port off takes back only those. */
const addedAttributes = new WeakMap<Element, string[]>();

export function setDraggable(node: DragDropNode, on: boolean): void {
  if (on) {
    draggables.add(node);
    install();
    whenMounted(node, (el) => {
      // Something a keyboard can reach and a screen reader can name. Only added where the author
      // has not already decided — an element with its own tabindex keeps it.
      const added: string[] = [];
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
        added.push('tabindex');
      }
      if (!el.hasAttribute('aria-roledescription')) {
        el.setAttribute('aria-roledescription', 'draggable');
        added.push('aria-roledescription');
      }
      if (added.length) addedAttributes.set(el, added);
    });
  } else {
    draggables.delete(node);
    const el = node.getDOMElement();
    const added = el && addedAttributes.get(el);
    if (el && added) {
      for (const name of added) el.removeAttribute(name);
      addedAttributes.delete(el);
    }
  }
}

export function setAcceptsDrops(node: DragDropNode, on: boolean): void {
  if (on) {
    zones.add(node);
    install();
  } else {
    zones.delete(node);
    if (gesture && gesture.zone === node) leaveZone(gesture);
  }
}

/** Called from a node's delete listener. */
export function forget(node: DragDropNode): void {
  draggables.delete(node);
  zones.delete(node);
  if (gesture && gesture.source === node) cancel(gesture);
  else if (gesture && gesture.zone === node) leaveZone(gesture);
}

/**
 * Run `fn` with the node's element once it has one. A port's `set` runs before the first render,
 * when there is no element yet; a few frames is always enough for a mounted node, and a node that
 * never mounts (in a hidden branch) is simply not reachable by keyboard until it does — pointer
 * pickup does not depend on this at all.
 */
function whenMounted(node: DragDropNode, fn: (el: HTMLElement) => void, framesLeft = 60): void {
  if (typeof window === 'undefined') return;
  const el = node.getDOMElement();
  if (el) {
    fn(el);
    return;
  }
  if (framesLeft <= 0 || node._deleted) return;
  window.requestAnimationFrame(() => whenMounted(node, fn, framesLeft - 1));
}

function liveElement(node: DragDropNode): HTMLElement | null {
  if (node._deleted) return null;
  const el = node.getDOMElement();
  return el && el.isConnected ? el : null;
}

// ── Reading a node ──────────────────────────────────────────────────────────

function kindsOf(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Does `zone` take what `source` carries? A zone with no `Accept Kind` takes anything; one with a
 * kind takes only a source that names that kind (AC4 — a mismatch never lights up, never fires).
 */
function accepts(zone: DragDropNode, source: DragDropNode): boolean {
  const wanted = kindsOf(zone._internal.acceptKind);
  if (wanted.length === 0) return true;
  const kind = (source._internal.dragKind || '').trim();
  return wanted.includes(kind);
}

function holdsFor(node: DragDropNode, pointerType: string): boolean {
  const mode = node._internal.holdToDrag || 'touch';
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return pointerType !== 'mouse';
}

function holdMs(node: DragDropNode): number {
  const seconds = Number(node._internal.holdTime);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_HOLD_SECONDS) * 1000;
}

function publish(node: DragDropNode, name: string): void {
  if (node.hasOutput(name)) node.flagOutputDirty(name);
}

function signal(node: DragDropNode, name: string): void {
  if (node.hasOutput(name)) node.sendSignalOnOutput(name);
}

function flush(node: DragDropNode): void {
  node.context && node.context.updateDirtyNodes && node.context.updateDirtyNodes();
}

// ── The gesture ─────────────────────────────────────────────────────────────

type Phase = 'pending' | 'holding' | 'lifted';

interface Gesture {
  phase: Phase;
  source: DragDropNode;
  sourceEl: HTMLElement;
  /** `mouse`, `touch`, `pen`, or `keyboard` for a Space pickup. */
  input: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Where in the source the pointer took hold, so the copy does not jump to its corner. */
  grabX: number;
  grabY: number;
  holdTimer?: ReturnType<typeof setTimeout>;
  ring?: HTMLElement;
  copy?: HTMLElement;
  zone?: DragDropNode;
  zoneEl?: HTMLElement;
  index: number;
  /** Children this gesture has translated, and the inline `translate` each had before. */
  shifted: Map<HTMLElement, string>;
}

let gesture: Gesture | null = null;

/** Exposed for tests and drives: what is happening right now, in words. */
export function currentPhase(): Phase | 'idle' {
  return gesture ? gesture.phase : 'idle';
}

function onPointerDown(e: PointerEvent): void {
  if (gesture) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const target = e.target as Element | null;
  if (!target || !(target instanceof Element)) return;
  // A field inside a card keeps its own press: selecting text in it must not pick the card up.
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;

  const source = innermostDraggable(target);
  if (!source) return;

  const rect = source.el.getBoundingClientRect();
  const g: Gesture = {
    phase: 'pending',
    source: source.node,
    sourceEl: source.el,
    input: e.pointerType || 'mouse',
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    x: e.clientX,
    y: e.clientY,
    grabX: e.clientX - rect.left,
    grabY: e.clientY - rect.top,
    index: -1,
    shifted: new Map()
  };
  gesture = g;
  listenForGesture();

  if (holdsFor(source.node, g.input)) {
    g.phase = 'holding';
    document.documentElement.setAttribute('data-ndl-holding', '');
    g.ring = showRing(e.clientX, e.clientY, holdMs(source.node));
    g.holdTimer = setTimeout(() => {
      if (gesture === g && g.phase === 'holding') lift(g);
    }, holdMs(source.node));
  }
}

function innermostDraggable(target: Element): { node: DragDropNode; el: HTMLElement } | null {
  let best: { node: DragDropNode; el: HTMLElement } | null = null;
  for (const node of Array.from(draggables)) {
    if (!node._internal.draggable) continue;
    const el = liveElement(node);
    if (!el || !el.contains(target)) continue;
    // Innermost wins: a draggable card inside a draggable column picks up the card.
    if (!best || best.el.contains(el)) best = { node, el };
  }
  return best;
}

function onPointerMove(e: PointerEvent): void {
  const g = gesture;
  if (!g || e.pointerId !== g.pointerId) return;
  g.x = e.clientX;
  g.y = e.clientY;
  const moved = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);

  if (g.phase === 'holding') {
    // R2: a finger that moves before the ring fills is scrolling, not picking up.
    if (moved > HOLD_SLOP_PX) cancel(g);
    else if (g.ring) placeRing(g.ring, e.clientX, e.clientY);
    return;
  }
  if (g.phase === 'pending') {
    if (moved <= MOUSE_SLOP_PX) return;
    lift(g);
  }
  if (g.phase === 'lifted') {
    moveCopy(g);
    track(g);
  }
}

function onPointerUp(e: PointerEvent): void {
  const g = gesture;
  if (!g || e.pointerId !== g.pointerId) return;
  if (g.phase !== 'lifted') {
    // Released before it lifted: a press, and nothing else happened (R2's early release).
    cancel(g);
    return;
  }
  g.x = e.clientX;
  g.y = e.clientY;
  track(g);
  // The press ends on whatever is under it; after a drag that would be a stray Click on the card
  // or the column. Swallow exactly one, in the capture phase, for this turn of the event loop.
  swallowNextClick();
  drop(g);
}

function onPointerCancel(e: PointerEvent): void {
  const g = gesture;
  if (!g || e.pointerId !== g.pointerId) return;
  // The browser took the touch for a scroll (or the OS took it): nothing was dropped.
  cancel(g);
}

/**
 * Once lifted, a touch must not scroll the page under the copy. `touch-action` cannot be changed
 * mid-gesture, so the only lever left is `preventDefault` on `touchmove`, which needs a
 * non-passive listener. Before the lift it is left alone, so a finger that moves early scrolls.
 */
function onTouchMove(e: TouchEvent): void {
  if (gesture && gesture.phase === 'lifted' && e.cancelable) e.preventDefault();
}

function onContextMenu(e: Event): void {
  // A long press is also the OS's context-menu gesture. While one is ours, it is ours.
  if (gesture && gesture.phase !== 'pending') e.preventDefault();
}

function onDragStart(e: Event): void {
  // An image or a link inside a card would otherwise start the browser's own drag on a mouse move.
  if (gesture) e.preventDefault();
}

function onSelectStart(e: Event): void {
  if (gesture && gesture.phase === 'lifted') e.preventDefault();
}

function lift(g: Gesture): void {
  if (g.holdTimer) clearTimeout(g.holdTimer);
  removeRing(g);
  g.phase = 'lifted';

  const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (selection && selection.removeAllRanges) selection.removeAllRanges();

  g.sourceEl.setAttribute('data-ndl-drag-source', '');
  document.documentElement.setAttribute('data-ndl-dragging', '');
  if (g.input !== 'keyboard') g.copy = makeCopy(g);

  g.source._internal.isLifted = true;
  publish(g.source, 'isLifted');
  signal(g.source, 'pickedUp');
  flush(g.source);

  if (g.input !== 'keyboard') {
    moveCopy(g);
    track(g);
  }
}

/** Drops on the zone under the pointer, or cancels when there is none. */
function drop(g: Gesture): void {
  const zone = g.zone;
  if (!zone) {
    cancel(g);
    return;
  }

  zone._internal.droppedValue = g.source._internal.dragValue;
  zone._internal.dropIndex = g.index;
  publish(zone, 'droppedValue');
  publish(zone, 'dropIndex');
  signal(zone, 'dropped');
  signal(g.source, 'landed');

  const name = zoneName(zone, g.zoneEl);
  const index = g.index;
  finish(g, { settleGap: true });
  flush(zone);
  flush(g.source);
  if (g.input === 'keyboard') announce(`Dropped in ${name}, position ${index + 1}.`);
}

function cancel(g: Gesture): void {
  const wasLifted = g.phase === 'lifted';
  finish(g, { settleGap: false });
  if (wasLifted) {
    signal(g.source, 'dragCancelled');
    flush(g.source);
    if (g.input === 'keyboard') announce(`Cancelled. ${sourceName(g.sourceEl)} is back where it was.`);
  }
}

/**
 * Takes down everything a gesture put on the page.
 *
 * `settleGap` is the drop: the graph is about to move the data, and a gap that animated shut
 * while the new row animated in would play the move twice. So the children snap back without a
 * transition and the zone's re-render puts the row where the gap was.
 */
function finish(g: Gesture, { settleGap }: { settleGap: boolean }): void {
  if (g.holdTimer) clearTimeout(g.holdTimer);
  removeRing(g);
  leaveZone(g, settleGap);
  if (g.copy) {
    g.copy.remove();
    g.copy = undefined;
  }
  g.sourceEl.removeAttribute('data-ndl-drag-source');
  document.documentElement.removeAttribute('data-ndl-dragging');

  if (g.source._internal.isLifted) {
    g.source._internal.isLifted = false;
    publish(g.source, 'isLifted');
  }

  if (gesture === g) gesture = null;
  stopListeningForGesture();
}

// ── Where the pointer is ────────────────────────────────────────────────────

/**
 * The innermost armed zone that takes this source, walking out from the element under the
 * pointer. A zone that refuses the kind is passed over, so an outer zone that takes it still can
 * (AC3's nesting rule is about the innermost TAKER). A zone inside the source is never a target:
 * a card cannot be dropped into itself.
 */
function zoneAt(g: Gesture, x: number, y: number): { node: DragDropNode; el: HTMLElement } | null {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return null;

  const byElement = new Map<Element, DragDropNode>();
  for (const node of Array.from(zones)) {
    if (!node._internal.acceptDrops) continue;
    const el = liveElement(node);
    if (el) byElement.set(el, node);
  }

  for (let el: Element | null = hit; el; el = el.parentElement) {
    const node = byElement.get(el);
    if (!node) continue;
    if (g.sourceEl.contains(el)) continue;
    if (accepts(node, g.source)) return { node, el: el as HTMLElement };
  }
  return null;
}

function track(g: Gesture): void {
  const found = zoneAt(g, g.x, g.y);
  if (!found) {
    if (g.zone) leaveZone(g);
    return;
  }
  if (found.node !== g.zone) {
    leaveZone(g);
    enterZone(g, found.node, found.el);
  }
  setIndex(g, indexAt(g, g.x, g.y));
}

function enterZone(g: Gesture, zone: DragDropNode, el: HTMLElement): void {
  g.zone = zone;
  g.zoneEl = el;
  g.index = -1;
  el.setAttribute('data-ndl-drop-target', '');
  zone._internal.isDropTarget = true;
  publish(zone, 'isDropTarget');
  flush(zone);
}

function leaveZone(g: Gesture, settle = false): void {
  const zone = g.zone;
  const el = g.zoneEl;
  if (el) {
    if (settle) el.setAttribute('data-ndl-drop-settle', '');
    restoreShifted(g);
    el.removeAttribute('data-ndl-drop-target');
    // Two frames: one for the snap-back to be computed without a transition, one for the
    // re-render the drop caused to have happened, before transitions are allowed again.
    if (settle && typeof window !== 'undefined') {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => el.removeAttribute('data-ndl-drop-settle'))
      );
    }
  }
  g.zone = undefined;
  g.zoneEl = undefined;
  g.index = -1;
  if (zone && zone._internal.isDropTarget) {
    zone._internal.isDropTarget = false;
    publish(zone, 'isDropTarget');
    flush(zone);
  }
}

// ── The index, and the gap ──────────────────────────────────────────────────

/** A zone's axis: a row lays out left to right, everything else top to bottom. */
function axisOf(el: HTMLElement): 'x' | 'y' {
  const direction = getComputedStyle(el).flexDirection;
  return direction === 'row' || direction === 'row-reverse' ? 'x' : 'y';
}

/**
 * The children a drop is counted among: the zone's own laid-out children, minus the source.
 *
 * Minus the source because that is what an index means to the command that moves the data —
 * take it out, put it back at `Drop Index`. A card dragged one place down in its own column
 * therefore reports the index it will HAVE, not one more than it.
 */
function slots(g: Gesture, zoneEl: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of Array.from(zoneEl.children)) {
    if (!(child instanceof HTMLElement) || child === g.sourceEl) continue;
    const style = getComputedStyle(child);
    if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') continue;
    out.push(child);
  }
  return out;
}

/** A child's box as it would be without this gesture's translate. */
function restingRect(g: Gesture, el: HTMLElement): DOMRect {
  const r = el.getBoundingClientRect();
  const shift = g.shifted.has(el) ? currentShift(el) : { x: 0, y: 0 };
  return new DOMRect(r.left - shift.x, r.top - shift.y, r.width, r.height);
}

/**
 * The translate the child is drawn with THIS frame. The computed value, not the inline one: while
 * the gap animates, the box is somewhere between the two, and subtracting the inline target from a
 * mid-transition box put the index one row off and made the gap flicker between two places.
 */
function currentShift(el: HTMLElement): { x: number; y: number } {
  const computed = getComputedStyle(el).translate;
  if (!computed || computed === 'none') return { x: 0, y: 0 };
  const [x = '0', y = '0'] = computed.split(/\s+/);
  return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
}

function indexAt(g: Gesture, x: number, y: number): number {
  const zoneEl = g.zoneEl;
  if (!zoneEl) return -1;
  const axis = axisOf(zoneEl);
  const at = axis === 'x' ? x : y;
  let index = 0;
  for (const child of slots(g, zoneEl)) {
    const r = restingRect(g, child);
    const mid = axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
    if (mid < at) index++;
  }
  return index;
}

function setIndex(g: Gesture, index: number): void {
  if (!g.zone || !g.zoneEl || index === g.index) return;
  g.index = index;
  if (g.zone._internal.makeRoom === false) return;
  if (index === homeIndex(g, g.zoneEl)) closeGap(g);
  else openGap(g, g.zoneEl, index);
}

/**
 * Where the source already is, when it is one of this zone's own children — otherwise -1.
 *
 * Hovering there is a drop that changes nothing, and the faded original is already standing in the
 * slot, so no gap opens. That is not only tidier: the pointer is over this slot at the moment of
 * pickup, and on a phone, where columns stack, a gap opened there grew the column and moved every
 * column under it by a card's height under the finger — the drive's first phone run then dropped
 * one card lower than it aimed.
 */
function homeIndex(g: Gesture, zoneEl: HTMLElement): number {
  if (g.sourceEl.parentElement !== zoneEl) return -1;
  return slots(g, zoneEl).filter((c) => c.compareDocumentPosition(g.sourceEl) & Node.DOCUMENT_POSITION_FOLLOWING).length;
}

/** Every card back to rest (animated) and the zone back to its own size, still hovering. */
function closeGap(g: Gesture): void {
  for (const child of Array.from(g.shifted.keys())) child.style.translate = '0px 0px';
  if (g.zoneEl) {
    g.zoneEl.removeAttribute('data-ndl-drop-room');
    g.zoneEl.style.removeProperty('--ndl-drop-room');
  }
}

/**
 * R3 — slide every child from `index` on along the zone's axis by the size of the thing being
 * dropped, plus the zone's own gap between children. Inline `translate`, which composes with any
 * `transform` the node already has and which React never writes, so a re-render cannot fight it
 * and nothing re-renders because of it.
 */
function openGap(g: Gesture, zoneEl: HTMLElement, index: number): void {
  const axis = axisOf(zoneEl);
  const sourceRect = g.sourceEl.getBoundingClientRect();
  const style = getComputedStyle(zoneEl);
  const between = parseFloat(axis === 'x' ? style.columnGap : style.rowGap) || 0;
  const size = (axis === 'x' ? sourceRect.width : sourceRect.height) + between;

  // The zone grows by the gap as well. Translates alone move the last card OUT of its zone — the
  // first frames of the drive showed it painted over the column's footer on a desktop and over the
  // next column on a phone. A pseudo-element spacer grows the zone without adding a child (Drop
  // Index and the no-re-render rule both count children), and it is also the gap itself when the
  // drop is at the end, where no card moves at all.
  zoneEl.setAttribute('data-ndl-drop-room', axis);
  zoneEl.style.setProperty('--ndl-drop-room', `${size}px`);

  slots(g, zoneEl).forEach((child, i) => {
    const want = i >= index ? size : 0;
    if (!g.shifted.has(child)) {
      if (want === 0) return;
      g.shifted.set(child, child.style.translate);
    }
    child.style.translate = axis === 'x' ? `${want}px 0px` : `0px ${want}px`;
  });
}

function restoreShifted(g: Gesture): void {
  for (const [child, before] of Array.from(g.shifted)) child.style.translate = before;
  g.shifted.clear();
  if (g.zoneEl) {
    g.zoneEl.removeAttribute('data-ndl-drop-room');
    g.zoneEl.style.removeProperty('--ndl-drop-room');
  }
}

// ── The copy, the ring, the live region ─────────────────────────────────────

/**
 * R1 — a see-through copy of the source, on top of everything, that the pointer carries.
 * `pointer-events: none` is load-bearing: `elementFromPoint` must see through it to the zone.
 */
function makeCopy(g: Gesture): HTMLElement {
  const rect = g.sourceEl.getBoundingClientRect();
  const copy = g.sourceEl.cloneNode(true) as HTMLElement;
  copy.removeAttribute('data-ndl-drag-source');
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  copy.setAttribute('data-ndl-drag-copy', '');
  const s = copy.style;
  s.position = 'fixed';
  s.left = `${rect.left}px`;
  s.top = `${rect.top}px`;
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.margin = '0';
  s.boxSizing = 'border-box';
  document.body.appendChild(copy);
  return copy;
}

function moveCopy(g: Gesture): void {
  if (!g.copy) return;
  const rect = g.sourceEl.getBoundingClientRect();
  const dx = g.x - g.grabX - rect.left;
  const dy = g.y - g.grabY - rect.top;
  g.copy.style.left = `${rect.left}px`;
  g.copy.style.top = `${rect.top}px`;
  g.copy.style.translate = `${dx}px ${dy}px`;
}

const RING_SIZE = 28;

/**
 * R2 — the ring that fills while a press is held, drawn beside the pointer (not under it, where a
 * finger would hide it) in the project's primary colour. It appears the moment the press starts;
 * the fill is a CSS animation of exactly the hold time, so what a person sees full is the moment
 * it lifts.
 */
function showRing(x: number, y: number, ms: number): HTMLElement {
  const ring = document.createElement('div');
  ring.setAttribute('data-ndl-hold-ring', '');
  ring.setAttribute('aria-hidden', 'true');
  const r = RING_SIZE / 2 - 3;
  const circumference = 2 * Math.PI * r;
  ring.innerHTML =
    `<svg width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">` +
    `<circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" data-ndl-hold-track />` +
    `<circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" data-ndl-hold-fill ` +
    `style="stroke-dasharray:${circumference};stroke-dashoffset:${circumference};animation-duration:${ms}ms" />` +
    `</svg>`;
  ring.style.setProperty('--ndl-hold-circumference', String(circumference));
  placeRing(ring, x, y);
  document.body.appendChild(ring);
  return ring;
}

function placeRing(ring: HTMLElement, x: number, y: number): void {
  // Up and to the right of the contact point, clear of a fingertip.
  ring.style.left = `${x + 14}px`;
  ring.style.top = `${y - 14 - RING_SIZE}px`;
}

function removeRing(g: Gesture): void {
  document.documentElement.removeAttribute('data-ndl-holding');
  if (g.ring) {
    g.ring.remove();
    g.ring = undefined;
  }
}

let liveRegion: HTMLElement | null = null;

function announce(message: string): void {
  if (typeof document === 'undefined') return;
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('data-ndl-drag-announcer', '');
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = message;
}

function sourceName(el: HTMLElement): string {
  const label = el.getAttribute('aria-label') || (el.textContent || '').trim().replace(/\s+/g, ' ');
  return label.length > 60 ? label.slice(0, 57) + '…' : label || 'item';
}

function zoneName(zone: DragDropNode, el: HTMLElement | undefined): string {
  const named = (zone._internal.dropZoneName || '').trim();
  if (named) return named;
  const label = el && el.getAttribute('aria-label');
  if (label) return label;
  const all = orderedZones(zone);
  const i = all.findIndex((z) => z.node === zone);
  return `drop area ${i + 1}`;
}

// ── The keyboard (AC6) ──────────────────────────────────────────────────────

/** Every armed zone that takes this source, in reading order (top to bottom, then left to right). */
function orderedZones(source: DragDropNode): { node: DragDropNode; el: HTMLElement }[] {
  const out: { node: DragDropNode; el: HTMLElement; left: number; top: number }[] = [];
  for (const node of Array.from(zones)) {
    if (!node._internal.acceptDrops || !accepts(node, source)) continue;
    const el = liveElement(node);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    out.push({ node, el, left: r.left, top: r.top });
  }
  // Reading order, row by row: a board's columns share a top and read across, and on a phone the
  // same columns stack and read down. Left-first was wrong the first time it was driven — a box
  // under the board sat further left than the second column, so → jumped out of the board.
  return out.sort((a, b) => (Math.abs(a.top - b.top) > 24 ? a.top - b.top : a.left - b.left));
}

function onKeyDown(e: KeyboardEvent): void {
  const g = gesture;

  if (!g) {
    if (e.key !== ' ' && e.key !== 'Spacebar') return;
    const active = document.activeElement;
    if (!active) return;
    let source: DragDropNode | null = null;
    for (const node of Array.from(draggables)) {
      if (node._internal.draggable && liveElement(node) === active) source = node;
    }
    if (!source) return;
    e.preventDefault();
    keyboardLift(source, active as HTMLElement);
    return;
  }

  if (g.input !== 'keyboard') {
    if (e.key === 'Escape' && g.phase === 'lifted') {
      e.preventDefault();
      cancel(g);
    }
    return;
  }

  const list = orderedZones(g.source);
  const at = list.findIndex((z) => z.node === g.zone);
  const count = (z: HTMLElement) => slots(g, z).length;

  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      if (!g.zoneEl) break;
      setIndex(g, Math.max(0, Math.min(count(g.zoneEl), g.index + (e.key === 'ArrowDown' ? 1 : -1))));
      break;
    }
    case 'ArrowRight':
    case 'ArrowLeft': {
      if (list.length === 0) break;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const target = list[Math.max(0, Math.min(list.length - 1, (at < 0 ? 0 : at) + step))];
      if (target.node !== g.zone) {
        const keep = g.index;
        leaveZone(g);
        enterZone(g, target.node, target.el);
        setIndex(g, Math.max(0, Math.min(count(target.el), keep < 0 ? 0 : keep)));
      }
      break;
    }
    case 'Enter':
    case ' ':
    case 'Spacebar':
      e.preventDefault();
      drop(g);
      return;
    case 'Escape':
      e.preventDefault();
      cancel(g);
      return;
    case 'Tab':
      // Leaving the card with Tab would strand a lifted card; putting it back is the honest answer.
      cancel(g);
      return;
    default:
      return;
  }

  e.preventDefault();
  if (g.zone && g.zoneEl) {
    announce(`${zoneName(g.zone, g.zoneEl)}, position ${g.index + 1} of ${count(g.zoneEl) + 1}.`);
  }
}

function keyboardLift(source: DragDropNode, el: HTMLElement): void {
  const g: Gesture = {
    phase: 'pending',
    source,
    sourceEl: el,
    input: 'keyboard',
    pointerId: -1,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    grabX: 0,
    grabY: 0,
    index: -1,
    shifted: new Map()
  };
  gesture = g;
  listenForGesture();
  lift(g);

  // Start where it already is: the innermost zone it sits in, at its own place in that zone.
  const list = orderedZones(source);
  const around = list.filter((z) => z.el !== el && z.el.contains(el));
  const home = around.find((z) => !around.some((o) => o !== z && z.el.contains(o.el))) || list[0];
  if (home) {
    enterZone(g, home.node, home.el);
    // How many of the zone's slots come before the card: its own index, with itself left out.
    const before = slots(g, home.el).filter(
      (c) => c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
    ).length;
    setIndex(g, before);
  }

  const where = g.zone && g.zoneEl ? ` ${zoneName(g.zone, g.zoneEl)}, position ${g.index + 1}.` : '';
  announce(
    `Picked up ${sourceName(el)}.${where} Arrow keys move it, Enter drops it, Escape puts it back.`
  );
}

// ── Listeners ───────────────────────────────────────────────────────────────

let installed = false;

/**
 * The always-on half: one capture listener each for a press and a key, on the document, installed
 * the first time any node arms either port. A project that never arms one never installs them —
 * AC7's *"nothing changes for existing projects"*.
 */
function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  // Permanent, not per gesture, and that is measured behaviour rather than tidiness: Chrome decides
  // at `touchstart` whether a touch's moves may be cancelled at all. A listener added once the hold
  // has begun receives `cancelable: false` moves, the page scrolls under the lifted copy, and the
  // browser ends the drag with `pointercancel`. It does nothing unless a copy is lifted.
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  injectStyles();
}

function listenForGesture(): void {
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onPointerCancel, true);
  window.addEventListener('contextmenu', onContextMenu, true);
  window.addEventListener('dragstart', onDragStart, true);
  window.addEventListener('selectstart', onSelectStart, true);
}

function stopListeningForGesture(): void {
  window.removeEventListener('pointermove', onPointerMove, true);
  window.removeEventListener('pointerup', onPointerUp, true);
  window.removeEventListener('pointercancel', onPointerCancel, true);
  window.removeEventListener('contextmenu', onContextMenu, true);
  window.removeEventListener('dragstart', onDragStart, true);
  window.removeEventListener('selectstart', onSelectStart, true);
}

function swallowNextClick(): void {
  const swallow = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, true), 0);
}

function injectStyles(): void {
  if (document.querySelector('style[data-ndl-drag-drop]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-ndl-drag-drop', '');
  style.textContent = `
[data-ndl-drag-source] { opacity: 0.4 !important; }
[data-ndl-drag-copy] {
  z-index: 2147483646; pointer-events: none; opacity: 0.85;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22); cursor: grabbing;
}
html[data-ndl-holding] * { -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
html[data-ndl-dragging], html[data-ndl-dragging] * { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }
[data-ndl-drop-target] > * { transition: translate 160ms ease; }
[data-ndl-drop-room]::after { content: ''; display: block; flex: none; pointer-events: none; transition: height 160ms ease, width 160ms ease; }
[data-ndl-drop-room="y"]::after { height: var(--ndl-drop-room, 0px); }
[data-ndl-drop-room="x"]::after { width: var(--ndl-drop-room, 0px); }
[data-ndl-drop-settle] > * { transition: none !important; }
[data-ndl-hold-ring] {
  position: fixed; z-index: 2147483647; pointer-events: none;
  width: ${RING_SIZE}px; height: ${RING_SIZE}px;
}
[data-ndl-hold-ring] svg { transform: rotate(-90deg); display: block; }
[data-ndl-hold-ring] circle { fill: none; stroke-width: 4; }
[data-ndl-hold-track] { stroke: rgba(127, 127, 127, 0.3); }
[data-ndl-hold-fill] {
  stroke: var(--primary, #2563eb); stroke-linecap: round;
  animation-name: ndl-hold-fill; animation-timing-function: linear; animation-fill-mode: forwards;
}
@keyframes ndl-hold-fill { to { stroke-dashoffset: 0; } }
[data-ndl-drag-announcer] {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  [data-ndl-drop-target] > *, [data-ndl-drop-room]::after { transition: none; }
}
`;
  document.head.appendChild(style);
}
