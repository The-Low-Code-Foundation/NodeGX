/**
 * CHR-009 §12.4 (Richard, s21: "show it greyed") — an unset per-side border field shows what it inherits from all
 * sides as a muted placeholder, instead of drawing empty over a side that renders `none` / 2 / #000.
 */
import React from 'react';

import { ColorFieldView } from '../../src/editor/src/views/panels/propertyeditor/components/ColorInput';
import {
  allSidesPortOf,
  inheritedNumberText,
  inheritedSideValue
} from '../../src/editor/src/views/panels/propertyeditor/model/inheritedSide';
import { render, walk } from '../support/renderElements';

const noop = () => undefined;
const reader = (params: Record<string, unknown>) => (name: string) => params[name];

describe('CHR-009 §12.4 — what an unset side inherits', () => {
  it('maps every per-side border port to its all-sides port, prefixes included', () => {
    expect(allSidesPortOf('borderLeftColor')).toBe('borderColor');
    expect(allSidesPortOf('borderTopStyle')).toBe('borderStyle');
    expect(allSidesPortOf('borderBottomWidth')).toBe('borderWidth');
    expect(allSidesPortOf('borderTopLeftRadius')).toBe('borderRadius');
    expect(allSidesPortOf('thumbBorderRightColor')).toBe('thumbBorderColor');
    expect(allSidesPortOf('trackBorderBottomLeftRadius')).toBe('trackBorderRadius');
  });

  it('leaves the all-sides ports and unrelated ports alone', () => {
    for (const name of ['borderColor', 'borderStyle', 'borderRadius', 'paddingLeft', 'marginTop', 'boxShadowColor']) {
      expect(allSidesPortOf(name)).toBeNull();
    }
  });

  it('hints the all-sides value only while the side holds none of its own', () => {
    const read = reader({ borderColor: '#FF0000', borderWidth: { value: 2, unit: 'px' } });
    expect(inheritedSideValue('borderLeftColor', undefined, read)).toBe('#FF0000');
    expect(inheritedSideValue('borderLeftColor', '', read)).toBe('#FF0000');
    expect(inheritedSideValue('borderLeftColor', '#00FF00', read)).toBeUndefined();
    expect(inheritedSideValue('borderColor', undefined, read)).toBeUndefined();
    expect(inheritedSideValue('borderTopLeftRadius', undefined, read)).toBeUndefined(); // all-sides reads nothing
    expect(inheritedNumberText(inheritedSideValue('borderTopWidth', undefined, read))).toBe('2');
  });

  it('writes a number-with-units hint as its number', () => {
    expect(inheritedNumberText({ value: 8, unit: 'px' })).toBe('8');
    expect(inheritedNumberText(0)).toBe('0');
    expect(inheritedNumberText('var(--radius-md)')).toBe('var(--radius-md)');
    expect(inheritedNumberText(undefined)).toBeUndefined();
  });

  it('draws the hint as the colour field placeholder, not as its value', () => {
    const tree = render(
      <ColorFieldView
        value={undefined}
        displayedValue=""
        resolvedColor="#FF0000"
        placeholder="#FF0000"
        onTextChange={noop}
        onTextClick={noop}
        onTextBlur={noop}
        onTextEnter={noop}
        onSwatchClick={noop}
      />
    );
    const inputs = walk(tree).filter((n) => n.type === 'input');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].props.value).toBe('');
    expect(inputs[0].props.placeholder).toBe('#FF0000');
  });
});
