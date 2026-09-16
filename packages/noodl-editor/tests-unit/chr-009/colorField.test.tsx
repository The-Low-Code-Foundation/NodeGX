/**
 * CHR-009 slice 8 — the colour field as one field: swatch inside, hex in mono, alpha as the suffix.
 *
 * The field it replaces stripped the alpha of a `#RRGGBBAA` value from its text and showed it nowhere,
 * and a typed hex then replaced the whole value — so a 40% shadow colour went opaque on an edit that
 * never mentioned opacity. That is graded first.
 */
import React from 'react';

import { ColorFieldView } from '../../src/editor/src/views/panels/propertyeditor/components/ColorInput';
import { colorCommitOf, colorFieldPartsOf } from '../../src/editor/src/views/panels/propertyeditor/model/colorField';
import { byClass, render, walk } from '../support/renderElements';

const noop = () => undefined;

function view(value: string | undefined, onSwatchClick: (a: HTMLElement) => void = noop) {
  return render(
    <ColorFieldView
      value={value}
      displayedValue={colorFieldPartsOf(value).text}
      resolvedColor={value}
      onTextChange={noop}
      onTextClick={noop}
      onTextBlur={noop}
      onTextEnter={noop}
      onSwatchClick={onSwatchClick}
    />
  );
}

describe('CHR-009 — colour field (model)', () => {
  it('keeps a stored alpha when a six-digit hex is typed over it', () => {
    expect(colorCommitOf('#FF0000', '#00000066')).toBe('#FF000066');
    expect(colorCommitOf('ff0000', '#00000066')).toBe('#ff000066');
  });

  it('commits as typed when the old value was opaque, not a hex, or the typed hex has its own alpha', () => {
    expect(colorCommitOf('#FF0000', '#000000')).toBe('#FF0000');
    expect(colorCommitOf('#FF0000', '#000000FF')).toBe('#FF0000');
    expect(colorCommitOf('#FF0000', 'Primary')).toBe('#FF0000');
    expect(colorCommitOf('#FF000080', '#00000066')).toBe('#FF000080');
    expect(colorCommitOf('Primary', '#00000066')).toBe('Primary');
    expect(colorCommitOf('  ', '#00000066')).toBeUndefined();
  });

  it('adds a # only to exactly six hex digits', () => {
    expect(colorCommitOf('abcdef', undefined)).toBe('#abcdef');
    expect(colorCommitOf('Accent abcdef', undefined)).toBe('Accent abcdef');
  });

  it('splits a hex into its colour and an alpha the picker would also read', () => {
    expect(colorFieldPartsOf('#00000066')).toEqual({ text: '#000000', alpha: '40%', isHex: true });
    expect(colorFieldPartsOf('#abcdef')).toEqual({ text: '#ABCDEF', alpha: '100%', isHex: true });
    expect(colorFieldPartsOf('#f008')).toEqual({ text: '#F00', alpha: '53%', isHex: true });
    expect(colorFieldPartsOf('Primary')).toEqual({ text: 'Primary', alpha: null, isHex: false });
    expect(colorFieldPartsOf(undefined)).toEqual({ text: '', alpha: null, isHex: false });
  });
});

describe('CHR-009 — colour field (component)', () => {
  it('draws one field: the swatch inside it, then the text, then the alpha', () => {
    const tree = view('#00000066');
    const field = byClass(tree, 'Field');
    expect(field).toHaveLength(1);

    const inside = walk(field[0]);
    expect(inside.filter((n) => n.type === 'button').map((n) => n.props.className)).toEqual(['Swatch']);
    expect(byClass(field[0], 'SwatchFill')[0].props.style).toEqual({ backgroundColor: '#00000066' });
    expect(inside.find((n) => n.type === 'input')!.props.value).toBe('#000000');
    expect(byClass(field[0], 'Alpha')[0].ownText).toBe('40%');
    expect(byClass(field[0], 'is-hex')).toHaveLength(1);

    const order = field[0].children.map((c) => String(c.props.className ?? c.type));
    expect(order[0]).toBe('Swatch');
    expect(order[order.length - 1]).toBe('Alpha');
  });

  it('draws no suffix and no mono for a style name or an empty value', () => {
    for (const value of ['Primary', undefined]) {
      const tree = view(value);
      expect(byClass(tree, 'Alpha')).toHaveLength(0);
      expect(byClass(tree, 'is-hex')).toHaveLength(0);
      expect(byClass(tree, 'Swatch')).toHaveLength(1);
    }
  });

  it('opens the picker from the swatch, anchored on the whole field, without reaching the text', () => {
    // The picker opens to the right of its anchor; on the swatch (the field's left edge) it covered the hex.
    const opened: unknown[] = [];
    const tree = view('#000000', (a) => opened.push(a));
    const swatch = byClass(tree, 'Swatch')[0];
    let stopped = false;
    const fieldElement = {};
    (swatch.props.onClick as (e: unknown) => void)({
      stopPropagation: () => (stopped = true),
      currentTarget: { parentElement: fieldElement }
    });
    expect(opened).toEqual([fieldElement]);
    expect(stopped).toBe(true);
  });
});
