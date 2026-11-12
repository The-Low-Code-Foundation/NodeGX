/**
 * BETA-S7-DROPDOWNFIRSTPICK — what the Dropdown's face draws, compared the way the browser compares option values.
 *
 * The pick itself (the `<select>` told `''` while the value is in no option, so the first option is a pick) is graded on the
 * runtime by the node spec's scenarios (conformance, Dropdown v12). This is the face beside it: after a person picks an
 * option whose Value is a number, the node's value is the browser's text for it ("3"), and the face compared that with the
 * number, found nothing and drew the placeholder over the option just picked.
 */

/* eslint-env jest */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Select } from '../src/components/controls/Select/Select';

function face(items: unknown[], value: string | undefined): string {
  const props = { id: 'd', items, value, style: {}, dom: {}, styles: {}, placeholder: 'Choose why', placeholderOpacity: 1 };
  return renderToStaticMarkup(React.createElement(Select as never, props as never));
}

describe('BETA-S7-DROPDOWNFIRSTPICK — the face reads the value as the browser does', () => {
  it('🔴 a picked option whose Value is a number: its label, not the placeholder', () => {
    const html = face([{ Label: 'Three', Value: 3 }, { Label: 'Four', Value: 4 }], '3');
    expect(html).toContain('<span>Three</span>');
    expect(html).not.toContain('Choose why');
  });

  it('🔴 a picked option with no Value: its label\'s text is its value, and its label is drawn', () => {
    expect(face([{ Label: 'Only' }], 'Only')).toContain('<span>Only</span>');
  });

  it('(known-firing) a value in no option draws the placeholder; a text Value draws its label', () => {
    expect(face([{ Label: 'Unkind', Value: 'unkind' }], '')).toContain('Choose why');
    expect(face([{ Label: 'Unkind', Value: 'unkind' }], 'unkind')).toContain('<span>Unkind</span>');
  });
});
