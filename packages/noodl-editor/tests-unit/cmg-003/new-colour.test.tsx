/**
 * P103 CMG-003 — a new colour is a colour you can change.
 *
 * Two pure readings and one render:
 *  - the name rule a new token is held to (shared with CMG-002's ＋);
 *  - AC5: the grey constant is gone — no `#808080` anywhere in the Styles panel;
 *  - a `StyleRow` given `onSwatchClick` draws its swatch as a BUTTON that says what it does, and
 *    one not given it draws the plain square it always did.
 *
 * That *New colour* opens the picker with no extra press, writes a `color-palette` token and
 * nothing into `metadata.styles.colors`, and that a picked colour reaches a node — AC1–AC4 — is
 * the drive (`scripts/devtools/drive-cmg003-007-colours-and-shadows.js`).
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: { Tiny: 'tiny' },
  IconVariant: {}
}));
jest.mock('@noodl-core-ui/components/popups/ContextMenu', () => ({
  ContextMenu: () => null
}));

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { tokenNameFromInput, tokenNameProblem } from '../../src/editor/src/models/StyleTokensModel/tokenName';
import { StyleRow } from '../../src/editor/src/views/panels/StylesPanel/components/StyleRow/StyleRow';

describe('CMG-003 — the name a new colour may have', () => {
  const existing = new Set(['--primary', '--brand-orange']);

  it('adds the -- prefix the field shows, and leaves one that was typed', () => {
    expect(tokenNameFromInput('brand-orange')).toBe('--brand-orange');
    expect(tokenNameFromInput('  brand-orange ')).toBe('--brand-orange');
    expect(tokenNameFromInput('--brand-orange')).toBe('--brand-orange');
  });

  it('accepts a plain custom-property name', () => {
    expect(tokenNameProblem('brand-blue', existing)).toBeNull();
    expect(tokenNameProblem('Brand_Blue-2', existing)).toBeNull();
    expect(tokenNameProblem('--brand-blue', existing)).toBeNull();
  });

  it('🔴 refuses, in words: empty, a space, a leading digit, punctuation, and a name already taken', () => {
    expect(tokenNameProblem('', existing)).toBe('Give it a name');
    expect(tokenNameProblem('   ', existing)).toBe('Give it a name');
    expect(tokenNameProblem('bad name', existing)).toBe('No spaces — try a hyphen: brand-orange');
    expect(tokenNameProblem('2fast', existing)).toBe('A name cannot start with a number');
    expect(tokenNameProblem('brand.orange', existing)).toBe('Letters, numbers, hyphens and underscores only');
    expect(tokenNameProblem('primary', existing)).toBe('There is already a token called --primary');
    expect(tokenNameProblem('--brand-orange', existing)).toBe('There is already a token called --brand-orange');
  });
});

describe('CMG-003 AC5 — the grey default is gone', () => {
  it('no file under the Styles panel holds #808080 or DEFAULT_NEW_COLOUR', () => {
    const root = path.join(__dirname, '../../src/editor/src/views/panels/StylesPanel');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(tsx?|scss)$/.test(e.name)) files.push(full);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(10);
    // Comments stripped: the docblock that records what the old button wrote is history, not code.
    const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
    const offenders = files.filter((f) => /#808080|DEFAULT_NEW_COLOUR/i.test(code(fs.readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});

describe('CMG-003 §3.2 — every colour swatch is a door', () => {
  const base = { name: 'Brand', value: '#c2410c', swatch: '#c2410c', layer: 'Style' as const, menuItems: [] };

  it('with onSwatchClick the swatch is a button that names what it does', () => {
    const html = renderToStaticMarkup(React.createElement(StyleRow, { ...base, onSwatchClick: () => undefined }));
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Change the colour of Brand"');
    expect(html).toContain('data-test="style-row-swatch-Brand"');
  });

  it('without it the swatch is the plain square P94 drew', () => {
    const html = renderToStaticMarkup(React.createElement(StyleRow, base));
    expect(html).not.toContain('<button');
    expect(html).toContain('data-test="style-row-swatch-Brand"');
    expect(html).toContain('background-color:#c2410c');
  });
});
