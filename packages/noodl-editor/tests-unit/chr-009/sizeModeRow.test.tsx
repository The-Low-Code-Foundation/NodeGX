/**
 * CHR-009 slice 3 — `Size Mode` as a row with two per-axis segments, and the row's mark in the gutter.
 *
 * The axis table is the part that can be wrong without anything looking wrong: the enum names the
 * axis that FITS (`contentHeight` = width given, height from content), and a swapped table would
 * draw a perfectly plausible control that writes the other mode. So every one of the four values is
 * graded both ways — read (which segment is pressed) and written (what a press produces).
 */
import React from 'react';

import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { SizeModeInput } from '../../src/editor/src/views/panels/propertyeditor/components/SizeModeInput';
import { axesOf, modeOf, withAxis } from '../../src/editor/src/views/panels/propertyeditor/model/sizeModeAxes';
import { RenderedNode, byClass, render, text, walk } from '../support/renderElements';

describe('CHR-009 — sizeMode as two axes', () => {
  // The runtime's own reading: `Layout.size` assigns style.width for explicit|contentHeight and
  // style.height for explicit|contentWidth. Written out here rather than derived from the module.
  const RUNTIME = {
    explicit: { widthFits: false, heightFits: false },
    contentHeight: { widthFits: false, heightFits: true },
    contentWidth: { widthFits: true, heightFits: false },
    contentSize: { widthFits: true, heightFits: true }
  };

  it.each(Object.entries(RUNTIME))('reads %s as the runtime sizes it', (mode, axes) => {
    expect(axesOf(mode)).toEqual(axes);
    expect(modeOf(axes)).toBe(mode);
  });

  it('reads a value that is not a mode as nothing, not as a guess', () => {
    expect(axesOf('stretch')).toBeNull();
    expect(axesOf(undefined)).toBeNull();
    expect(axesOf('toString')).toBeNull();
  });

  it('changes one axis and keeps the other', () => {
    expect(withAxis('explicit', 'height', true)).toBe('contentHeight');
    expect(withAxis('contentHeight', 'width', true)).toBe('contentSize');
    expect(withAxis('contentSize', 'height', false)).toBe('contentWidth');
    expect(withAxis('contentWidth', 'width', false)).toBe('explicit');
  });
});

function buttons(tree: RenderedNode | null): RenderedNode[] {
  return walk(tree).filter((n) => n.type === 'button');
}

function pressed(tree: RenderedNode | null) {
  return buttons(tree)
    .filter((b) => b.props['aria-pressed'] === true)
    .map((b) => `${b.props['data-size-axis']}:${b.props['data-size-fits'] ? 'fits' : 'given'}`)
    .sort();
}

describe('CHR-009 — the Size Mode row', () => {
  const tooltips = { contentHeight: { standard: 'Explicit width & content height' } };

  it('is a labelled row of four real buttons', () => {
    const tree = render(<SizeModeInput label="Size Mode" value="explicit" isDefault tooltips={{}} onChange={() => undefined} />);
    expect(text(tree)).toContain('Size Mode');
    expect(buttons(tree)).toHaveLength(4);
  });

  it.each([
    ['explicit', ['height:given', 'width:given']],
    ['contentHeight', ['height:fits', 'width:given']],
    ['contentWidth', ['height:given', 'width:fits']],
    ['contentSize', ['height:fits', 'width:fits']]
  ])('presses the right segments for %s', (value, expected) => {
    const tree = render(<SizeModeInput value={value} isDefault={false} tooltips={{}} onChange={() => undefined} />);
    expect(pressed(tree)).toEqual(expected);
  });

  it('writes the mode a press produces, and titles the button with that mode', () => {
    const written: string[] = [];
    const tree = render(
      <SizeModeInput value="explicit" isDefault tooltips={tooltips} onChange={(v) => written.push(v)} />
    );
    const heightFits = buttons(tree).find((b) => b.props['data-size-axis'] === 'height' && b.props['data-size-fits']);
    expect(heightFits.props.title).toBe('Explicit width & content height');
    (heightFits.props.onClick as () => void)();
    expect(written).toEqual(['contentHeight']);
  });

  it('writes nothing when the pressed segment is pressed again', () => {
    const written: string[] = [];
    const tree = render(<SizeModeInput value="explicit" isDefault tooltips={{}} onChange={(v) => written.push(v)} />);
    for (const b of buttons(tree).filter((b) => b.props['aria-pressed'])) (b.props.onClick as () => void)();
    expect(written).toEqual([]);
  });

  it('presses nothing for an unknown value', () => {
    const tree = render(<SizeModeInput value="stretch" isDefault={false} tooltips={{}} onChange={() => undefined} />);
    expect(pressed(tree)).toEqual([]);
  });

  // The reset dot used to float at the strip's right edge; it is now the row's gutter mark.
  it('draws the reset dot only when the mode is not the default', () => {
    const set = render(<SizeModeInput value="contentSize" isDefault={false} tooltips={{}} onChange={() => undefined} onReset={() => undefined} />);
    const dflt = render(<SizeModeInput value="explicit" isDefault tooltips={{}} onChange={() => undefined} onReset={() => undefined} />);
    expect(byClass(set, 'ResetDot')).toHaveLength(1);
    expect(byClass(dflt, 'ResetDot')).toHaveLength(0);
  });
});

describe('CHR-009 — the gutter mark', () => {
  const field = <input className="the-field" />;

  it('is the connected dot, not the reset dot, when a wire arrives', () => {
    const tree = render(
      <PropertyPanelRow label="Width" isChanged onReset={() => undefined} isConnected connectionLabel="A · B">
        {field}
      </PropertyPanelRow>
    );
    expect(byClass(tree, 'ConnectedDot')).toHaveLength(1);
    expect(byClass(tree, 'ResetDot')).toHaveLength(0);
  });

  it('is absent on a row that is neither connected nor changed — beside an arm where it is drawn', () => {
    const plain = render(<PropertyPanelRow label="Width">{field}</PropertyPanelRow>);
    const changed = render(<PropertyPanelRow label="Width" isChanged onReset={() => undefined}>{field}</PropertyPanelRow>);
    expect(byClass(plain, 'ConnectedDot').length + byClass(plain, 'ResetDot').length).toBe(0);
    expect(byClass(changed, 'ResetDot')).toHaveLength(1);
  });

  // It left the label: R6's `overflow: hidden` on the label would clip a mark drawn inside it.
  it('is not inside the label', () => {
    const tree = render(<PropertyPanelRow label="Width" isChanged onReset={() => undefined}>{field}</PropertyPanelRow>);
    const label = byClass(tree, 'Label')[0];
    expect(byClass(label, 'ResetDot')).toHaveLength(0);
    expect(byClass(tree, 'ResetDot')).toHaveLength(1);
  });
});
