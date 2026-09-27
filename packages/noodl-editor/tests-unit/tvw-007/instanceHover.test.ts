/**
 * TVW-007 AC2b — the hover surface's rules: what it says, when it is on screen, and where.
 *
 * The half of AC2b a plain-Node runner can hold. The other half — that the path is *readable on
 * the rendered surface a person sees* — is a photograph, and no spec in this file claims it.
 *
 * What is graded here is the part that would otherwise be graded by looking at it: the close
 * condition. A hover card carrying a button has one interesting question — can the pointer get
 * to the button — and the obvious implementation (hide on the node's `move-out`) answers no.
 */

import {
  hoverCardAnchor,
  hoverCardContent,
  hoverCardIsVisible,
  hoverGraceIsPending,
  hoverPathText,
  hoverStatesEqual,
  initialHoverState,
  InstanceHover,
  nextHoverState,
  nodeScreenRect,
  type InstanceHoverState,
  type InstanceHoverSubject,
  splitHoverPath
} from '../../src/editor/src/views/nodegrapheditor/canvas/instanceHover';

const hero: InstanceHoverSubject = { nodeId: 'node-1', fullName: '/Sections/Hero', count: 3 };
const navbar: InstanceHoverSubject = { nodeId: 'node-2', fullName: '/Sections/Navbar', count: 1 };

/** The state after the pointer has arrived on `subject`'s node. */
function hovering(subject: InstanceHoverSubject): InstanceHoverState {
  return nextHoverState(initialHoverState, { kind: 'node-enter', subject });
}

describe('TVW-007 AC2b — the close condition', () => {
  it('shows nothing until a node is hovered', () => {
    expect(hoverCardIsVisible(initialHoverState)).toBe(false);
    expect(hoverGraceIsPending(initialHoverState)).toBe(false);
  });

  it('shows the card while the pointer is on the node', () => {
    const state = hovering(hero);

    expect(hoverCardIsVisible(state)).toBe(true);
    expect(state.subject).toEqual(hero);
    // Nothing is expiring: the pointer is on the node.
    expect(hoverGraceIsPending(state)).toBe(false);
  });

  /**
   * 🔴 The spec this whole surface turns on.
   *
   * `Edit ›` sits `InstanceHover.gap` px off the node's edge, so reaching it means leaving the
   * node. An implementation that hid the card on `node-leave` would draw a door and take it away
   * as the pointer moved towards it — correct, and unusable
   * ([[correct-and-usable-were-never-the-same-criterion]]).
   */
  it('keeps the card on screen while the pointer travels from the node to the card', () => {
    let state = hovering(hero);

    state = nextHoverState(state, { kind: 'node-leave', nodeId: hero.nodeId });
    expect(hoverCardIsVisible(state)).toBe(true);
    // ...and the controller is now running the grace timer, which is what gives the pointer time.
    expect(hoverGraceIsPending(state)).toBe(true);

    state = nextHoverState(state, { kind: 'card-enter' });
    expect(hoverCardIsVisible(state)).toBe(true);
    expect(hoverGraceIsPending(state)).toBe(false);

    // The window expiring mid-press says nothing: the pointer arrived in time.
    state = nextHoverState(state, { kind: 'grace-elapsed' });
    expect(hoverCardIsVisible(state)).toBe(true);
    expect(state.subject).toEqual(hero);
  });

  it('hides the card when the pointer leaves both surfaces and does not come back', () => {
    let state = nextHoverState(hovering(hero), { kind: 'node-leave', nodeId: hero.nodeId });
    state = nextHoverState(state, { kind: 'card-enter' });

    state = nextHoverState(state, { kind: 'card-leave' });
    expect(hoverCardIsVisible(state)).toBe(true);
    expect(hoverGraceIsPending(state)).toBe(true);

    state = nextHoverState(state, { kind: 'grace-elapsed' });
    expect(hoverCardIsVisible(state)).toBe(false);
    expect(state).toEqual(initialHoverState);
  });

  /**
   * 🔴 `propagateMouse` walks every node on the canvas, so the node the pointer LEFT can emit its
   * `move-out` after the node it ARRIVED on has emitted `move-in`. Unguarded, that closes the
   * card that has just opened — and only when two nodes are close enough to cross in one frame,
   * which is the gesture the surface exists for.
   */
  it('ignores a leave belonging to a node that is no longer the subject', () => {
    let state = hovering(hero);
    state = nextHoverState(state, { kind: 'node-enter', subject: navbar });

    state = nextHoverState(state, { kind: 'node-leave', nodeId: hero.nodeId });

    expect(state.subject).toEqual(navbar);
    expect(state.overNode).toBe(true);
    expect(hoverGraceIsPending(state)).toBe(false);
  });

  it('does not carry the previous card’s pointer across to a new subject', () => {
    // Pointer on Hero's card, then straight onto the Navbar node — the card it was over belongs
    // to a subject that is gone, and a stale `overCard` would pin the new one open forever.
    let state = nextHoverState(hovering(hero), { kind: 'card-enter' });
    state = nextHoverState(state, { kind: 'node-enter', subject: navbar });

    expect(state.overCard).toBe(false);

    state = nextHoverState(state, { kind: 'node-leave', nodeId: navbar.nodeId });
    state = nextHoverState(state, { kind: 'grace-elapsed' });
    expect(hoverCardIsVisible(state)).toBe(false);
  });

  it('re-hovering the same node refreshes the count under the pointer', () => {
    // The count can change while the pointer sits there (an instance placed elsewhere), and
    // `move` fires on every mouse move over the node — so this path runs constantly.
    const state = nextHoverState(hovering(hero), { kind: 'node-enter', subject: { ...hero, count: 4 } });

    expect(state.subject?.count).toBe(4);
    expect(state.overNode).toBe(true);
  });

  /**
   * 🔴 The card is a DOM element ABOVE the canvas: a pointer that lands on it stops producing
   * canvas mouse events, so the node's `move-out` is never delivered. A state machine that only
   * cleared `overNode` on `node-leave` would believe the pointer was still on the node and would
   * survive every later `card-leave` — a box left on screen with the pointer elsewhere.
   */
  it('treats an arrival as a departure, because the pointer is only ever in one place', () => {
    // Straight from the node onto the card, with NO node-leave in between — which is what the
    // canvas actually delivers.
    let state = nextHoverState(hovering(hero), { kind: 'card-enter' });
    expect(state.overNode).toBe(false);

    state = nextHoverState(state, { kind: 'card-leave' });
    expect(hoverGraceIsPending(state)).toBe(true);

    state = nextHoverState(state, { kind: 'grace-elapsed' });
    expect(hoverCardIsVisible(state)).toBe(false);
  });

  it('does not redraw a card whose state has not changed', () => {
    // `node-enter` builds a fresh subject on every mouse move, so identity comparison would
    // re-render the card at the mouse's event rate.
    const first = hovering(hero);
    const second = nextHoverState(first, { kind: 'node-enter', subject: { ...hero } });

    expect(second).not.toBe(first);
    expect(hoverStatesEqual(first, second)).toBe(true);
    expect(hoverStatesEqual(first, nextHoverState(first, { kind: 'node-enter', subject: { ...hero, count: 4 } }))).toBe(
      false
    );
    expect(hoverStatesEqual(first, nextHoverState(first, { kind: 'node-leave', nodeId: hero.nodeId }))).toBe(false);
    expect(hoverStatesEqual(initialHoverState, first)).toBe(false);
  });

  it('a card-enter with nothing open does not conjure a card', () => {
    const state = nextHoverState(initialHoverState, { kind: 'card-enter' });
    expect(hoverCardIsVisible(state)).toBe(false);
  });

  it('dismiss clears everything, whatever the pointer is on', () => {
    const state = nextHoverState(nextHoverState(hovering(hero), { kind: 'card-enter' }), { kind: 'dismiss' });
    expect(state).toEqual(initialHoverState);
  });
});

describe('TVW-007 AC2b — what the card says', () => {
  it('keeps the folder: the path is the identity the card no longer carries', () => {
    expect(hoverPathText('/Sections/Hero')).toBe('Sections/Hero');
    expect(hoverPathText('Hero')).toBe('Hero');
  });

  it('reads the path and the count together', () => {
    expect(hoverCardContent({ isComponentInstance: true, fullName: '/Sections/Hero', count: 3 })).toEqual({
      path: 'Sections/Hero',
      count: '· 3×'
    });
  });

  /** AC2: one formatter. `· 0×` is a sentence about the editor's bookkeeping, not about the graph. */
  it('keeps the path when there is no count worth printing', () => {
    expect(hoverCardContent({ isComponentInstance: true, fullName: '/Sections/Hero', count: 0 })).toEqual({
      path: 'Sections/Hero',
      count: null
    });
  });

  it('says nothing about a node that is not a component instance', () => {
    expect(hoverCardContent({ isComponentInstance: false, fullName: '/Sections/Hero', count: 3 })).toBeNull();
    expect(hoverCardContent({ isComponentInstance: true, fullName: undefined, count: 3 })).toBeNull();
  });
});

describe('TVW-007 AC2b — where the card goes', () => {
  const pane = { width: 1200, height: 800 };
  const cardHeight = 30;

  it('maps a node to the pane’s pixels through the canvas transform', () => {
    expect(nodeScreenRect({ x: 100, y: 50, width: 150, height: 60 }, { x: 10, y: 20, scale: 2 })).toEqual({
      left: 220,
      top: 140,
      width: 300,
      height: 120
    });
  });

  it('sits above the node, flush with its left edge', () => {
    const anchor = hoverCardAnchor({ node: { left: 400, top: 300, width: 150, height: 80 }, pane, cardHeight });

    expect(anchor).toEqual({ x: 400, y: 300 - InstanceHover.gap, alignX: 'left', alignY: 'above' });
  });

  /** Below is where the ports and their wires are, so above is the preference — until it is off screen. */
  it('flips below the node when there is no room above', () => {
    const anchor = hoverCardAnchor({ node: { left: 400, top: 20, width: 150, height: 80 }, pane, cardHeight });

    expect(anchor.alignY).toBe('below');
    expect(anchor.y).toBe(20 + 80 + InstanceHover.gap);
  });

  /**
   * The room is read from where the card would START. A node scrolled off the left has its left
   * edge clamped to the inset, and measuring from the node's own (negative) coordinate reports
   * room the pane does not have — so the card is left-aligned into a wall instead of hung off
   * the node's right edge.
   */
  it('measures the room from the card’s clamped edge, not the node’s', () => {
    const anchor = hoverCardAnchor({
      node: { left: -10, top: 300, width: 400, height: 80 },
      pane: { width: 280, height: 800 },
      cardHeight
    });

    expect(anchor.alignX).toBe('right');
    expect(anchor.x).toBe(280 - InstanceHover.edgeInset);
  });

  it('right-aligns to the node when the pane’s right edge is close', () => {
    const anchor = hoverCardAnchor({ node: { left: 1100, top: 300, width: 150, height: 80 }, pane, cardHeight });

    expect(anchor.alignX).toBe('right');
    expect(anchor.x).toBe(pane.width - InstanceHover.edgeInset);
  });

  /**
   * ⚠️ The arms have to differ. A narrow pane alone does not reach the guard — the room is read
   * from the card's clamped left edge, so this node has to be BOTH short of room on the right and
   * too far left for right-alignment to help ([[a-rule-reading-zero-in-both-arms-grades-nothing]]).
   */
  it('stays left-aligned on a node hanging off the left of the pane', () => {
    // Room to the right (200 - 4 = 196) is under `minRoom`, so the first half of the rule asks
    // for right-alignment; the node's right edge is at 90, so right-alignment would put the
    // card's RIGHT edge there and push its text off the left of the pane entirely.
    const anchor = hoverCardAnchor({
      node: { left: -60, top: 300, width: 150, height: 80 },
      pane: { width: 200, height: 800 },
      cardHeight
    });

    expect(anchor.alignX).toBe('left');
    expect(anchor.x).toBe(InstanceHover.edgeInset);
  });
});

describe('TVW-007 AC2b — which half of the path gives way', () => {
  it('splits the leaf off the folder, separator staying with the folder', () => {
    expect(splitHoverPath('Atoms/Buttons/Primary Button')).toEqual({
      folder: 'Atoms/Buttons/',
      name: 'Primary Button'
    });
  });

  it('leaves a component with no folder entirely as a name', () => {
    expect(splitHoverPath('Home')).toEqual({ folder: '', name: 'Home' });
  });

  it('🔴 the two halves rebuild the input EXACTLY, so textContent is still the full path', () => {
    // The drive and every spec read the card's text as one string. If the split lost or added a
    // character, the surface would still look right and every reader of it would be wrong.
    for (const path of [
      '#Noodl Component System/Atoms/Sections and Dividers/Input Container',
      '#Integrations/Noodl Registry/Profile/[Profile] Create or Update',
      'Sections/Hero',
      'Home'
    ]) {
      const { folder, name } = splitHoverPath(path);
      expect(folder + name).toBe(path);
      // and the name is never empty, or the card would draw a bare folder
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('keeps the deepest segment when folders nest', () => {
    expect(splitHoverPath('a/b/c/d').name).toBe('d');
  });
});
