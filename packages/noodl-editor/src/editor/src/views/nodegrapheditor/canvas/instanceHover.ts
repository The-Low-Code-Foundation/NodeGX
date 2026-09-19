/**
 * TVW-007 AC2b — the hover surface an instance node carries, and the door on it.
 *
 * R-Z took the component's name off the card: the eyebrow is `· 3×` and nothing else, so **the
 * hover is the only place an instance's identity lives**. That promotes it from a nicety to a
 * surface that has to be reachable, legible and pressable — and §2 puts `Edit ›` on the same
 * gesture at the same corner, so the two are one thing, built together (§7's "one hover surface
 * carrying both").
 *
 * ## Why the door is not painted on the card
 *
 * §2 asks for `Edit ›` "at the node's top-right on hover". That rectangle is already spoken for:
 * `NodeGraphEditorNode.mouse` treats `pos.x > width - 20 && pos.y < 20` as the
 * **connection-drag zone** (`NodeGraphEditorNode.ts:263`), and a `down` inside it starts dragging
 * a wire. A control painted there — or a DOM element floating over it — takes that gesture away
 * from every one of the corpus's **9,634 instance nodes**, and takes it away silently: the user
 * presses the same pixels and gets a different thing.
 *
 * So the door rides on a surface anchored **outside** the card, just above its top edge and
 * flush with it, which is the same place §2 was pointing at and none of the pixels the canvas has
 * already promised to something else. It is a real `<button>` in the DOM rather than a painted
 * rectangle, which also means AC2b can be graded the way it asks to be — on the rendered surface,
 * with `elementFromPoint` ([[a-rendered-surface-can-be-behind-a-blocker]]) — instead of on a
 * handler firing.
 *
 * ## Why this module holds the close condition
 *
 * A hover card with a button on it is the fourth repeat of *correct is not usable*: the obvious
 * implementation hides on the node's `move-out`, and the pointer has to cross that boundary to
 * reach the button, so the door is drawn and unpressable. The visible-while rule is therefore
 * **over the node OR over the card**, with a grace window between the two so the pointer can
 * travel, and it lives here as a state machine rather than as three booleans spread across a
 * controller — because every one of its transitions is a reason to draw a DIFFERENT thing, and
 * grading that through Electron means grading it by looking at it.
 *
 * Pure: no React, no DOM, no editor imports. Graded in `tests-unit/tvw-007`.
 *
 * @module noodl-editor/views/nodegrapheditor/canvas/instanceHover
 */

import { eyebrowText } from './instanceEyebrow';

export const InstanceHover = {
  /** Gap between the node's edge and the card, in screen pixels. */
  gap: 8,
  /**
   * How long the card survives the pointer leaving the node.
   *
   * 🔴 Not decoration. The pointer has to cross `InstanceHover.gap` px of canvas to reach the
   * button, and on that canvas the node's `move-out` fires first. Without the window the door is
   * drawn and cannot be pressed — the whole surface would read as a bug rather than a control.
   */
  graceMs: 220,
  /**
   * The room the card asks for before it gives up left-alignment.
   *
   * A width, not a measurement: the card is one line (`white-space: nowrap`, ellipsis at
   * `max-width`), so its height is fixed and its width is bounded, and both anchors are applied
   * as a CSS `transform` — which means the anchor can be decided without measuring anything, and
   * so can be decided *here*, where it can be graded.
   */
  minRoom: 280,
  /** Never closer than this to the pane's edge. */
  edgeInset: 4
} as const;

/** What the card is about: one instance node, and the component it is an instance of. */
export interface InstanceHoverSubject {
  /** `NodeGraphEditorNode.model.id` — the identity every event is matched against. */
  nodeId: string;
  /** The component's `fullName`, e.g. `/Sections/Hero`. */
  fullName: string;
  /** Project-wide instance count, from TVW-001's one walk (`instanceCountOf`). */
  count: number;
}

export interface InstanceHoverState {
  subject: InstanceHoverSubject | null;
  overNode: boolean;
  overCard: boolean;
}

export const initialHoverState: InstanceHoverState = { subject: null, overNode: false, overCard: false };

export type InstanceHoverEvent =
  | { kind: 'node-enter'; subject: InstanceHoverSubject }
  | { kind: 'node-leave'; nodeId: string }
  | { kind: 'card-enter' }
  | { kind: 'card-leave' }
  /** The grace window expired — the pointer went somewhere else and did not come back. */
  | { kind: 'grace-elapsed' }
  /** A drag, a pan, a zoom, a navigation, a closed project: anything that invalidates the anchor. */
  | { kind: 'dismiss' };

/**
 * The one decision, so the controller holds none of it.
 *
 * The invariant every branch below serves: **the card is on screen while the pointer is on the
 * node, on the card, or travelling between them** — and off screen otherwise.
 */
export function nextHoverState(state: InstanceHoverState, event: InstanceHoverEvent): InstanceHoverState {
  switch (event.kind) {
    /**
     * 🔴 An arrival is also a departure, and it has to be stated: the pointer is in exactly one
     * place, and the two surfaces do not overlap.
     *
     * This is not tidiness. The card is a DOM element ABOVE the canvas, so a pointer that moves
     * off the node onto it stops generating canvas mouse events entirely — the node's `move-out`
     * is never delivered. An implementation that only cleared `overNode` on `node-leave` would
     * keep believing the pointer was on the node, and the card would survive every subsequent
     * `card-leave` — a box left on screen with the pointer nowhere near it.
     */
    case 'node-enter':
      // `overCard: false` on the same subject too: whatever the pointer was on, it is on the
      // node now. A stale `overCard` from the previous subject's card is the same bug one node
      // further away.
      return { subject: event.subject, overNode: true, overCard: false };

    case 'node-leave':
      /**
       * 🔴 Matched by id, and a leave for anything else is ignored.
       *
       * `propagateMouse` walks every node on the canvas: a node the pointer left can emit its
       * `move-out` after the node it arrived on has already emitted `move-in`. An unguarded
       * handler then closes the card it has just opened, and does it only when two nodes are
       * close enough together for the pointer to cross between them in one frame — which is the
       * gesture this surface exists for.
       */
      if (state.subject?.nodeId !== event.nodeId) return state;
      return { ...state, overNode: false };

    case 'card-enter':
      // Nothing here opens a card: if there is no subject, the pointer is over a card that is on
      // its way out, and re-opening it would make an empty box follow the mouse.
      if (!state.subject) return state;
      return { ...state, overNode: false, overCard: true };

    case 'card-leave':
      return { ...state, overCard: false };

    case 'grace-elapsed':
      // The pointer arrived somewhere in time — the window closing says nothing about it.
      if (state.overNode || state.overCard) return state;
      return initialHoverState;

    case 'dismiss':
      return initialHoverState;

    default:
      return state;
  }
}

/**
 * Whether two states would draw the same thing.
 *
 * `node-enter` fires on **every mouse move over the node**, not only on arrival, and it returns a
 * fresh object each time — so without this the controller would re-render the card sixty times a
 * second for a card that has not changed. Compared by value, because the subject is rebuilt from
 * the node on every one of those moves and is never the same object twice.
 */
export function hoverStatesEqual(a: InstanceHoverState, b: InstanceHoverState): boolean {
  if (a.overNode !== b.overNode || a.overCard !== b.overCard) return false;
  if (a.subject === b.subject) return true;
  if (!a.subject || !b.subject) return false;
  return (
    a.subject.nodeId === b.subject.nodeId &&
    a.subject.fullName === b.subject.fullName &&
    a.subject.count === b.subject.count
  );
}

/** The card is rendered while there is a subject — the state machine owns when that ends. */
export function hoverCardIsVisible(state: InstanceHoverState): boolean {
  return state.subject !== null;
}

/**
 * Whether the controller should be running the grace timer.
 *
 * A card on screen with the pointer on neither surface is the only state that expires; every
 * other one either has the pointer or has no card.
 */
export function hoverGraceIsPending(state: InstanceHoverState): boolean {
  return state.subject !== null && !state.overNode && !state.overCard;
}

/**
 * `/Sections/Hero` → `Sections/Hero`.
 *
 * The folder stays. It is the entire reason the hover is load-bearing: two components named
 * `Hero` in two folders draw identical cards, and the leaf name would tell them apart no better
 * than the card already does.
 */
export function hoverPathText(fullName: string): string {
  return fullName.startsWith('/') ? fullName.slice(1) : fullName;
}

export interface InstanceHoverContent {
  path: string;
  /** `· 3×`, or null when there is no count worth printing. */
  count: string | null;
}

/**
 * What the card says, or `null` for a node that gets no card at all.
 *
 * The count is formatted by **`eyebrowText`** — the same function the painter calls — so the
 * hover and the card cannot print the same number two ways, and a count the card declines to
 * draw (AC2's `· 0×`: a sentence about the editor's bookkeeping) is declined here too. The path
 * survives that: identity is what the hover is for, and a component with an unbuilt index still
 * has a name.
 */
export function hoverCardContent(input: {
  isComponentInstance: boolean;
  fullName: string | undefined;
  count: number;
}): InstanceHoverContent | null {
  if (!input.isComponentInstance) return null;
  if (!input.fullName) return null;

  return { path: hoverPathText(input.fullName), count: eyebrowText(input.count) };
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A node's rectangle in the canvas pane's own pixels.
 *
 * The transform is `CanvasPainter`'s, read forwards: the DOM layer is
 * `scale(s) translate(px, py)`, so a graph point lands at `(g + p) * s`. Written here rather than
 * taken from `ConnectionPopups` (which holds the same arithmetic inline) because that one adds
 * the canvas element's page offset on its way to `PopupLayer`, and this card is a child of the
 * pane — the same transform, a different destination, and nothing for either to share but a bug.
 */
export function nodeScreenRect(
  node: { x: number; y: number; width: number; height: number },
  panAndScale: { x: number; y: number; scale: number }
): ScreenRect {
  const { x: panX, y: panY, scale } = panAndScale;
  return {
    left: (node.x + panX) * scale,
    top: (node.y + panY) * scale,
    width: node.width * scale,
    height: node.height * scale
  };
}

export interface HoverCardAnchor {
  /** Pane-relative position of the anchor point. */
  x: number;
  y: number;
  /** `right` means the card's right edge sits at `x` (applied as a CSS translate). */
  alignX: 'left' | 'right';
  /** `above` means the card's bottom edge sits at `y`. */
  alignY: 'above' | 'below';
}

/**
 * Where the card goes, decided from positions alone.
 *
 * Both alignments are expressed as which of the card's own edges meets the anchor, so the view
 * applies them with `translate(-100%)` and **nothing has to be measured**. That is what keeps
 * this function pure, and it is also what keeps the card from jumping: a measured layout has to
 * render once to be measured, and the frame before the measurement is the one the user sees.
 *
 * - Vertically it prefers **above** the node, because below is where the node's ports and their
 *   wires are, and flips when the node is too close to the top of the pane.
 * - Horizontally it prefers the node's left edge, so the path starts where the name does, and
 *   switches to right-alignment when there is not `minRoom` to the pane's right edge.
 */
export function hoverCardAnchor({
  node,
  pane,
  cardHeight
}: {
  node: ScreenRect;
  pane: { width: number; height: number };
  cardHeight: number;
}): HoverCardAnchor {
  const { gap, minRoom, edgeInset } = InstanceHover;

  const fitsAbove = node.top - gap - cardHeight >= edgeInset;
  const alignY = fitsAbove ? 'above' : 'below';
  const y = fitsAbove ? node.top - gap : node.top + node.height + gap;

  // Measured from where the card would actually START, not from the node: a node scrolled off
  // the left of the pane has its left edge clamped to the inset, and reading the room from a
  // negative coordinate says there is 120px more of it than the pane has.
  const left = Math.max(edgeInset, node.left);
  const roomToTheRight = pane.width - left;
  const nodeRight = node.left + node.width;
  // Right-alignment is only an improvement while the card's right edge has somewhere to be: on a
  // node hanging off the LEFT of the pane it would pull the card further off, so left-alignment —
  // clamped to the edge — stays, and the card is clipped at the far end instead of at the end
  // the path starts from.
  const alignRight = roomToTheRight < minRoom && nodeRight > minRoom;

  return {
    x: alignRight ? Math.min(nodeRight, pane.width - edgeInset) : left,
    y,
    alignX: alignRight ? 'right' : 'left',
    alignY
  };
}
