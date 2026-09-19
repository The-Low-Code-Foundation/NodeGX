/**
 * P94 STY-005 AC3 + AC4 — what a row actually draws.
 *
 * R6: *"a visible `⋯` menu on every row … the hover-only affordance — the actual complaint — still
 * goes"*. R-D: *"each row says what layer it is and what uses it"*.
 *
 * 🔴 **THE REAL `ContextMenu` IS NOT RENDERED HERE, and that bounds what this file can claim.**
 * It draws a `MenuDialog` unconditionally, whose `BaseDialog` reads
 * `document.querySelector('.dialog-layer-portal-target')` in a `useState` initialiser — so it needs
 * a DOM during render, and this runner is plain Node with no jsdom installed. It is stubbed below.
 *
 * So: this file grades **what the row hands the menu** and **what the row's own stylesheet does**.
 * It does NOT grade that a `⋯` is visible on screen — a stub cannot, and asserting it off a stub
 * would be [[verify-the-consequence-not-just-the-mechanism]] in its purest form. **AC7's drive is
 * what reads the rendered `⋯`**, exactly as STY-003 AC5/AC7 read the property panel's.
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  // `Icon`'s module body calls `require.context(...)` to sweep the SVG directory — a webpack API
  // ts-jest rejects outright, failing the suite *to run*. Every React spec in `tests-unit/` mocks
  // it this way. `IconSize` needs real members because `StyleRow` reads one.
  Icon: () => null,
  IconName: new Proxy({}, { get: (_, key) => String(key) }),
  IconSize: { Tiny: 'tiny', Small: 'small', Default: 'default' },
  IconVariant: {}
}));

jest.mock('@noodl-core-ui/components/popups/ContextMenu', () => ({
  // Renders the labels it was handed and nothing else — enough to tell a real menu from the
  // placeholder one the retired panel shipped, and honest about being a stub.
  ContextMenu: ({ menuItems, testId }: TSFixme) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-test': testId, 'data-stub': 'context-menu' },
      (menuItems ?? []).map((item: TSFixme, i: number) =>
        React.createElement('span', { key: i }, item === 'divider' ? '—' : item.label)
      )
    );
  }
}));

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StyleRow } from '../../src/editor/src/views/panels/StylesPanel/components/StyleRow/StyleRow';

function render(props: Partial<React.ComponentProps<typeof StyleRow>> = {}) {
  return renderToStaticMarkup(
    React.createElement(StyleRow as never, {
      name: 'Brand',
      value: '#3b82f6',
      layer: 'Style',
      usageCount: 4,
      menuItems: [{ label: 'Rename' }, { label: 'Delete', isDangerous: true }],
      ...props
    } as never)
  );
}

describe('STY-005 AC3 — a row says what layer it is and what uses it', () => {
  it('names the row', () => {
    expect(render()).toContain('Brand');
  });

  it('badges the layer it came from', () => {
    // R2: both systems in one list, each row badged. Without this a colour style called `primary`
    // and a token called `--primary` read as the same kind of thing — and they are not:
    // `resolveColor` checks styles FIRST, so the style silently shadows the token.
    expect(render({ layer: 'Style' })).toContain('>Style<');
    expect(render({ layer: 'Token', name: '--primary' })).toContain('>Token<');
    expect(render({ layer: 'Look', name: 'Primary Button' })).toContain('>Look<');
  });

  it('prints the usage count', () => {
    expect(render({ usageCount: 4 })).toContain('4×');
  });

  it('🔴 prints `unused` for zero, and prints NOTHING when the count was never taken', () => {
    // Two different readings that a blank cell would merge into one. A panel that draws nothing
    // for both says "nothing uses this" about a row it never asked about.
    expect(render({ usageCount: 0 })).toContain('unused');

    const uncounted = render({ usageCount: undefined });
    expect(uncounted).not.toContain('unused');
    expect(uncounted).not.toContain('style-row-usage');
  });

  it('draws a swatch only when there is a colour to show', () => {
    expect(render({ swatch: '#3b82f6' })).toContain('background-color:#3b82f6');
    // A text style and a Look have no colour, and an empty swatch box on those rows would read as
    // "this one is transparent" — which is the exact sentence Richard's colour defect produced.
    expect(render({ swatch: undefined })).not.toContain('SwatchFill');
  });
});

describe('STY-005 AC4 — the row hands the menu real actions', () => {
  it('passes the section’s items through to the menu slot', () => {
    const html = render({ menuItems: [{ label: 'Rename' }, { label: 'Delete' }] });
    expect(html).toContain('style-row-menu-Brand');
    expect(html).toContain('Rename');
    expect(html).toContain('Delete');
  });

  it('🔴 the items are not the placeholder set the retired panel shipped', () => {
    // `ColorsTab` gave every row a `ContextMenu` whose items were literally labelled
    // `Another Action` / `Success` / `Danger` / `With subtitle`, with no handlers. A menu that
    // renders is not a menu that does anything.
    const html = render();
    expect(html).not.toContain('Another Action');
    expect(html).not.toContain('With subtitle');
  });
});

describe('STY-005 AC4 — the hover-only affordance is gone', () => {
  const ROW_CSS = path.join(
    __dirname,
    '../../src/editor/src/views/panels/StylesPanel/components/StyleRow/StyleRow.module.scss'
  );
  const raw = fs.readFileSync(ROW_CSS, 'utf8');

  /**
   * 🔴 Comments stripped before asserting, because the criterion is about DECLARATIONS.
   *
   * The first run of this gate went red on its own prose — the block comment above `.MenuSlot`
   * explains what `visibility: hidden` did to the old affordance, and the word is in it. Relaxing
   * the assertion to dodge that would have been bumping a literal to make a gate green; stripping
   * comments is measuring the thing the criterion is actually about.
   */
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the stylesheet was actually read — the control for the two assertions below', () => {
    // A path typo, or a comment-stripper that ate the file, would make `not.toContain` vacuously
    // true on an empty string. [[assert-an-absence-with-a-known-firing-signal-beside-it]].
    expect(css).toContain('.MenuSlot');
    expect(css).toContain('.Badge');
    expect(css.length).toBeGreaterThan(200);
    // And the stripper is doing something: the raw file has prose the declarations do not.
    expect(raw).toContain('visibility');
  });

  it('🔴 no `visibility` rule anywhere in the row’s stylesheet', () => {
    // The defect is made of exactly one declaration: `variantseditor.css` gives
    // `.variants-item-icon` `visibility: hidden` and reveals it only on
    // `.variants-pick-variant-item:hover`. That is what "how TF do you delete colours?" was.
    expect(css).not.toContain('visibility');
  });

  it('🔴 the menu slot is not gated on a hover selector', () => {
    const menuSlotRule = css.slice(css.indexOf('.MenuSlot'), css.indexOf('.Empty'));
    expect(menuSlotRule).not.toContain(':hover');
  });

  it('🔴 and the row draws none of the classes the old affordance was made of', () => {
    const html = render();
    expect(html).not.toContain('variants-item-icon');
    expect(html).not.toContain('variants-pick-variant-item');
  });
});
