/**
 * P94 STY-006 AC3 + AC4 — the count as a door, and what is behind it.
 *
 * 🔴 **This is renderable AT ALL only because the expansion is controlled by the section.** The
 * obvious build put the open/closed state inside the row and drew the list in a `ContextMenu`;
 * both would have made this file impossible. `renderToStaticMarkup` runs no effects and dispatches
 * no events, there is **no jsdom in this repo**, and `ContextMenu` → `MenuDialog` → `BaseDialog`
 * reads `document` in a `useState` initialiser — so a row that opened itself on a click could only
 * ever be graded by a drive. Lifting the state made the open row a value of `props`.
 *
 * What this file therefore claims: the row draws a *pressable* count only when there is something
 * behind it, and an open row draws the right names in the right shape. What it does **not** claim:
 * that pressing anything works. That is AC5/AC7 and it closes on
 * `scripts/devtools/drive-sty006-wheres-it-used.js`, reading the canvas afterwards.
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  // `Icon`'s module body calls `require.context(...)`, a webpack API ts-jest rejects outright —
  // which fails the suite *to run*, not one test. Every React spec in `tests-unit/` mocks it.
  Icon: () => null,
  IconName: new Proxy({}, { get: (_, key) => String(key) }),
  IconSize: { Tiny: 'tiny', Small: 'small', Default: 'default' },
  IconVariant: {}
}));

jest.mock('@noodl-core-ui/components/popups/ContextMenu', () => ({
  ContextMenu: ({ testId }: TSFixme) => {
    const React = require('react');
    return React.createElement('div', { 'data-test': testId, 'data-stub': 'context-menu' });
  }
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StyleRow } from '../../src/editor/src/views/panels/StylesPanel/components/StyleRow/StyleRow';

const WEARERS = {
  nodes: [
    { componentName: '/Pages/Home', nodeId: 'n1', label: 'Headline', typename: 'net.noodl.text' },
    { componentName: '/Components/Cards/ProductCard', nodeId: 'n2', label: '', typename: 'net.noodl.text' }
  ],
  variants: [{ name: 'Section Heading', typename: 'net.noodl.text' }]
};

function render(props: Partial<React.ComponentProps<typeof StyleRow>> = {}) {
  return renderToStaticMarkup(
    React.createElement(StyleRow, { name: 'Brand', layer: 'Style', menuItems: [], ...props } as TSFixme)
  );
}

describe('STY-006 AC3 — the count is a door only when there is something behind it', () => {
  it('draws a BUTTON when something uses the style and the section wired a handler', () => {
    const html = render({ usageCount: 3, wearers: WEARERS, onToggleUsage: () => undefined });

    expect(html).toContain('<button');
    expect(html).toContain('data-test="style-row-usage-Brand"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('🔴 `unused` is NOT pressable', () => {
    // A door onto an empty room is a person pressing a thing twice and concluding the panel is
    // broken. The row still PRINTS the zero — STY-005 kept "counted and unused" apart from "never
    // asked" on purpose — it just does not offer to open it.
    const html = render({ usageCount: 0, wearers: { nodes: [], variants: [] }, onToggleUsage: () => undefined });

    expect(html).toContain('unused');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('aria-expanded');
  });

  it('stays plain text on a surface that wired no handler at all', () => {
    // The token rows in the Colours section pass no `usageCount` and no handler. They must not
    // start drawing dotted-underlined numbers that open nothing.
    const html = render({ usageCount: 4 });

    expect(html).toContain('4×');
    expect(html).not.toContain('<button');
  });

  it('🔴 says which one is open, so a person can tell whose list they are reading', () => {
    const open = render({ usageCount: 3, wearers: WEARERS, isUsageOpen: true, onToggleUsage: () => undefined });
    const shut = render({ usageCount: 3, wearers: WEARERS, isUsageOpen: false, onToggleUsage: () => undefined });

    expect(open).toContain('aria-expanded="true"');
    expect(shut).toContain('aria-expanded="false"');
  });
});

describe('STY-006 AC4 — what an open row draws', () => {
  const html = render({ usageCount: 3, wearers: WEARERS, isUsageOpen: true, onToggleUsage: () => undefined });

  it('draws the list only when it is open', () => {
    const shut = render({ usageCount: 3, wearers: WEARERS, isUsageOpen: false, onToggleUsage: () => undefined });

    expect(html).toContain('data-test="style-row-wearers-Brand"');
    expect(shut).not.toContain('data-test="style-row-wearers-Brand"');
  });

  it('heads the list with what uses it, counting both kinds', () => {
    expect(html).toContain('Used by 2 nodes and 1 Look');
  });

  it('names each node by its label, and an unnamed one by its type', () => {
    expect(html).toContain('Headline');
    expect(html).toContain('>Text<');
  });

  it('🔴 never prints a node id as the name of anything', () => {
    // The ids are on the elements, because that is what the press navigates by. They must not be
    // in the text, because a person cannot recognise one.
    expect(html).toContain('data-wearer-node="n1"');

    const text = html.replace(/<[^>]*>/g, ' ');
    expect(text).not.toContain('n1');
    expect(text).not.toContain('net.noodl.text');
  });

  it('says where each node is, by its last segment', () => {
    expect(html).toContain('>Home<');
    expect(html).toContain('>ProductCard<');
  });

  it('🔴 carries the FULL component name for the press, not the shortened one', () => {
    // `wearerLocation` is what a person reads; `getComponentWithName` takes the other one. Two
    // folders each holding a `Home` is all it takes for these to be different components.
    expect(html).toContain('data-wearer-component="/Components/Cards/ProductCard"');
  });

  it('🔴 draws a Look in the list and does NOT make it pressable', () => {
    // A Look is a rule with nowhere on a canvas to go. Drawing it identically to a node entry and
    // landing nowhere on press is worse than not listing it: the person concludes the whole
    // feature is broken on the first Look they happen to hit.
    expect(html).toContain('data-test="style-row-wearer-look-Brand"');

    const lookEntry = html.slice(html.indexOf('data-test="style-row-wearer-look-Brand"'));
    expect(lookEntry).toContain('Section Heading');
    expect(lookEntry.slice(0, lookEntry.indexOf('Section Heading'))).not.toContain('<button');
  });

  it('draws one entry per node and no more', () => {
    expect(html.match(/data-test="style-row-wearer-Brand"/g)).toHaveLength(2);
  });
});

describe('STY-006 — the count’s own tooltip names the right KIND of user', () => {
  it('🔴 does not call a Look a node', () => {
    // `usageCount` is nodes PLUS Looks, so the plural guess says "Used by 3 nodes" on a row where
    // one of the three is a rule, not a node. A person reading that goes looking for a third node
    // that does not exist.
    const html = render({ usageCount: 3, wearers: WEARERS, onToggleUsage: () => undefined });

    expect(html).toContain('Used by 2 nodes and 1 Look');
    expect(html).not.toContain('Used by 3 nodes');
  });

  it('falls back to the plural guess only when the row was given no breakdown', () => {
    // The token rows pass a count and no wearers. They must still say something.
    const html = render({ usageCount: 4 });
    expect(html).toContain('Used by 4 nodes');
  });

  it('says it in the singular for one node', () => {
    const one = { nodes: [WEARERS.nodes[0]], variants: [] };
    const html = render({ usageCount: 1, wearers: one, onToggleUsage: () => undefined });
    expect(html).toContain('Used by 1 node');
  });
});
