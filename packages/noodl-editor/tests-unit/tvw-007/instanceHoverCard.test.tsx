/**
 * TVW-007 AC2b — the hover surface as it is rendered.
 *
 * `renderToStaticMarkup` runs no effects and there is no jsdom in this repo, so this file claims
 * what the card DRAWS, not what pressing it does. That is still the half AC2b was written for:
 * the path has to be **on** the surface (R-Z left the node card with no name, so this markup is
 * the only place the component's identity appears), and the door has to be a real control rather
 * than a painted rectangle.
 *
 * 🔴 What it does NOT claim: that the surface is *visible*. A rendered element can sit behind a
 * blocker, and only `elementFromPoint` on a live canvas settles that
 * ([[a-rendered-surface-can-be-behind-a-blocker]]). The drive owes that photograph.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { InstanceHoverCard, INSTANCE_HOVER_CARD_HEIGHT } from '../../src/editor/src/views/CanvasOverlays/InstanceHoverCard';
import type { HoverCardAnchor } from '../../src/editor/src/views/nodegrapheditor/canvas/instanceHover';

const above: HoverCardAnchor = { x: 400, y: 292, alignX: 'left', alignY: 'above' };

function render(props: Partial<React.ComponentProps<typeof InstanceHoverCard>> = {}) {
  return renderToStaticMarkup(
    <InstanceHoverCard
      path="Sections/Hero"
      count={'· 3×'}
      anchor={above}
      onEdit={() => undefined}
      onPointerEnter={() => undefined}
      onPointerLeave={() => undefined}
      {...props}
    />
  );
}

describe('TVW-007 AC2b — the rendered hover card', () => {
  it('carries the component’s path, folder included', () => {
    const markup = render();

    expect(markup).toContain('data-test="instance-hover-path"');
    expect(markup).toContain('Sections/Hero');
  });

  it('carries the count in the same form the card paints it', () => {
    expect(render()).toContain('· 3×');
  });

  it('omits the count rather than printing an empty one', () => {
    const markup = render({ count: null });

    expect(markup).not.toContain('data-test="instance-hover-count"');
    // ...and the identity survives, which is the part that is load-bearing.
    expect(markup).toContain('Sections/Hero');
  });

  /**
   * 🔴 A `<button>`, not a `<div onClick>`: keyboard-reachable, announced by a screen reader, and
   * — the reason it can be graded at all — a hit target the canvas never had, because
   * `NodeGraphEditorNode` dispatches no sub-region clicks.
   */
  it('draws the door as a real button', () => {
    const markup = render();

    expect(markup).toMatch(/<button[^>]*data-test="instance-hover-edit"/);
    expect(markup).toContain('Edit');
  });

  it('anchors above the node by its bottom edge', () => {
    const markup = render();

    expect(markup).toContain('left:400px');
    expect(markup).toContain('top:292px');
    // `translateY(-100%)` is what puts the card ABOVE `y` without anything having been measured.
    expect(markup).toContain('translate(0, -100%)');
    expect(markup).toContain(`height:${INSTANCE_HOVER_CARD_HEIGHT}px`);
  });

  it('anchors below the node without the vertical flip', () => {
    const markup = render({ anchor: { ...above, alignY: 'below' } });

    expect(markup).toContain('translate(0, 0)');
    expect(markup).toContain('data-align-y="below"');
  });

  it('pulls itself left of the anchor when it is right-aligned', () => {
    const markup = render({ anchor: { ...above, alignX: 'right' } });

    expect(markup).toContain('translate(-100%, -100%)');
    expect(markup).toContain('data-align-x="right"');
  });
});
