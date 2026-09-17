/**
 * CHR-009 slice 11 — the icon row's control is a 26px field that NAMES the icon, not a 33x32 square with a white glyph.
 *
 * The name is the part that can be wrong without anything looking wrong: a PUA codepoint printed as text draws a box,
 * and an empty stored object must read as "nothing chosen" rather than as an icon called ''.
 */
import React from 'react';

import { IconInput, iconValueName } from '../../src/editor/src/views/panels/propertyeditor/components/IconInput';
import { render, text, walk } from '../support/renderElements';

describe('CHR-009 — the icon field', () => {
  it.each([
    ['a lucide class glyph, without its icon- prefix', { class: 'lucide', code: 'icon-home', codeAsClass: true }, 'home'],
    ['a ligature code as written', { class: 'material-icons', code: 'arrow_back' }, 'arrow_back'],
    ['a bare PUA codepoint as U+', { class: 'fa', code: '' }, 'U+F015'],
    ['a sprite by its symbol id', { kind: 'sprite', url: 'icons.svg', symbolId: 'star' }, 'star'],
    ['an empty stored object as nothing', {}, ''],
    ['no value as nothing', undefined, '']
  ] as const)('names %s', (_what, value, name) => {
    expect(iconValueName(value as never)).toBe(name);
  });

  it('draws the name beside the glyph when an icon is chosen', () => {
    const tree = render(
      <IconInput
        label="Icon Source"
        value={{ class: 'lucide', code: 'icon-star', codeAsClass: true }}
        onOpenPicker={() => undefined}
      />
    );
    const nodes = walk(tree);
    expect(nodes.filter((n) => n.props.className === 'IconField')).toHaveLength(1);
    expect(nodes.some((n) => n.props.className === 'Glyph')).toBe(true);
    expect(text(tree)).toContain('star');
    expect(text(tree)).not.toContain('None');
  });

  it('draws a greyed None, and no glyph, when nothing is chosen', () => {
    const tree = render(<IconInput label="Icon Source" onOpenPicker={() => undefined} />);
    const nodes = walk(tree);
    expect(nodes.some((n) => n.props.className === 'Glyph')).toBe(false);
    expect(nodes.some((n) => String(n.props.className).includes('is-placeholder'))).toBe(true);
    expect(text(tree)).toContain('None');
  });

  it('paints no inline geometry — the stylesheet owns the field', () => {
    const tree = render(<IconInput label="Icon Source" onOpenPicker={() => undefined} />);
    const field = walk(tree).find((n) => n.props.className === 'IconField')!;
    expect(field.props.style).toBeUndefined();
  });
});
