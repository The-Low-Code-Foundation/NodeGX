/**
 * P103 CMG-005 §3.3 — `CollapsableSection` accepts a CONTROLLED open state, and every caller that
 * never asked for one is unchanged.
 *
 * Before this task the section read `isClosed` once, into `useState`, and nothing outside could
 * open it (`CollapsableSection.tsx:42` at `1a35902c0`). `revealStyle` needs to. The change is
 * additive: `isCollapsed` (a boolean) makes it controlled; `undefined` leaves it as it was.
 *
 * `renderToStaticMarkup` under plain Node, as `fld-017` does: the section's decision — which state
 * to draw — is made in render, and the markup carries it as `data-section-open`. `Collapsible`
 * is replaced because it reads `window.innerWidth` and `getComputedStyle(document…)` during
 * render, neither of which exists here; what it does with `isCollapsed` is its own story and not
 * this one.
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: { CaretUp: 'caret_up' },
  IconSize: { Small: 'small' },
  IconVariant: {}
}));

jest.mock('@noodl-core-ui/components/layout/Collapsible', () => {
  const React = require('react');
  return {
    Collapsible: ({ children, isCollapsed }: { children: unknown; isCollapsed: boolean }) =>
      React.createElement('div', { 'data-collapsible': String(isCollapsed) }, children as never)
  };
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CollapsableSection } from '@noodl-core-ui/components/sidebar/CollapsableSection';

function render(props: Record<string, unknown>) {
  return renderToStaticMarkup(
    React.createElement(CollapsableSection as never, { title: 'Motion', ...props } as never, 'body')
  );
}

describe('CMG-005 — CollapsableSection, controlled and uncontrolled', () => {
  it('uncontrolled, as every existing caller uses it: open by default', () => {
    const html = render({});
    expect(html).toContain('data-section-open="true"');
    expect(html).toContain('data-collapsible="false"');
  });

  it('uncontrolled with isClosed: starts closed (the P94 shape, unchanged)', () => {
    const html = render({ isClosed: true });
    expect(html).toContain('data-section-open="false"');
    expect(html).toContain('data-collapsible="true"');
  });

  it('🔴 controlled: isCollapsed wins, whatever isClosed says', () => {
    expect(render({ isClosed: true, isCollapsed: false })).toContain('data-section-open="true"');
    expect(render({ isClosed: false, isCollapsed: true })).toContain('data-section-open="false"');
  });

  it('carries its sectionId so a route can find it in the DOM', () => {
    expect(render({ sectionId: 'motion' })).toContain('data-section-id="motion"');
    // And no attribute at all when nobody asked — an existing caller's markup does not grow one.
    expect(render({})).not.toContain('data-section-id');
  });

  it('still draws the title and the body in both modes', () => {
    for (const props of [{}, { isCollapsed: true }, { isCollapsed: false }]) {
      const html = render(props);
      expect(html).toContain('Motion');
      expect(html).toContain('body');
    }
  });
});
