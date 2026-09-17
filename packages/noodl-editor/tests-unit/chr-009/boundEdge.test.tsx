/**
 * CHR-009 / FB-018 — a wired margin or padding edge draws the chip at a field's size.
 *
 * `MarginPaddingInput` calls hooks, so the whole row cannot be evaluated here. `BoundField` calls none and is
 * rendered; that the row draws it for a `bound` field (the decision `marginPaddingRows.test.ts` grades) is
 * read off the source.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';

import { bindingTooltip } from '@noodl-core-ui/components/property-panel/BindingChip';
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { BoundField } from '../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput';
import { byClass, render, stripComments, text, walk } from '../support/renderElements';

// Resolution only, as in `marginPaddingRows.test.ts`: `marginPaddingEdit` reads through `NumberWithUnits`, whose
// component reaches an `.svg`.
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({}));
jest.mock('@noodl-models/nodelibrary', () => ({ NodeLibrary: {} }));
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/NumberUnitInput', () => ({
  NumberUnitInput: function NumberUnitInput() {
    return null;
  }
}));

const tags = (node: ReturnType<typeof render>) => walk(node).map((n) => n.type);

describe('CHR-009 / FB-018 — BoundField', () => {
  it('names the source and carries the precedence sentence, with nothing to type into', () => {
    const node = render(<BoundField comp="padding-left" connection={{ label: 'String · Value' }} />);
    expect(text(node)).toContain('String · Value');
    expect(node!.props.title).toBe(`Left padding. ${bindingTooltip('String · Value')}`);
    expect(node!.props['data-bound']).toBe('true');
    expect(tags(node)).not.toContain('input');
    expect(byClass(node, 'is-bound')).toHaveLength(1);
  });

  it('is a button only when there is a source to go to', () => {
    const go = jest.fn();
    const live = render(<BoundField comp="margin-top" connection={{ label: 'A · b', onClick: go }} />);
    expect(live!.props.role).toBe('button');
    (live!.props.onClick as () => void)();
    expect(go).toHaveBeenCalledTimes(1);

    const inert = render(<BoundField comp="margin-top" connection={{}} />);
    expect(inert!.props.role).toBeUndefined();
    expect(text(inert)).toContain('Connected');
  });

  it('the row draws it for a bound field, from the shared layout', () => {
    const src = stripComments(
      fs.readFileSync(
        path.join(__dirname, '../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput.tsx'),
        'utf8'
      )
    );
    expect(src).toMatch(/sideLayoutOf\(side, expanded\[side\], values,/);
    expect(src).toMatch(/field\.kind === 'bound' \? \(\s*<BoundField/);
    expect(src).toMatch(/disabled=\{layout\.forced\}/);
  });
});

describe('CHR-009 — a split Margin/Padding row pins its label to the first line', () => {
  // Richard, s28: centred on a two-line row, "Padding" floated between its own `↑ ↓` and Margin's fields above.
  it('PropertyPanelRow draws `is-top-aligned` only when asked — the control is the default row', () => {
    const top = render(
      <PropertyPanelRow label="Padding" alignTop>
        <div />
      </PropertyPanelRow>
    );
    const plain = render(
      <PropertyPanelRow label="Padding">
        <div />
      </PropertyPanelRow>
    );
    expect(String(top!.props.className).split(' ')).toContain('is-top-aligned');
    expect(String(plain!.props.className).split(' ')).not.toContain('is-top-aligned');
  });

  it('the Margin/Padding row asks for it exactly when the side is split', () => {
    const src = stripComments(
      fs.readFileSync(
        path.join(__dirname, '../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput.tsx'),
        'utf8'
      )
    );
    expect(src).toMatch(/alignTop=\{isExpanded\}/);
  });
});

