/**
 * CHR-009 slice 5 — the alignment ports as rows of the label column.
 *
 * The strip this replaces drew an icon per KNOWN value, so a value the runtime added later was not
 * offered at all: Group's `Align Items` gained `Stretch` (14815f1e3) and no panel press could set it.
 * The rows draw a segment per ENUM value, so that is graded first.
 */
import React from 'react';

import { AlignToolsInput } from '../../src/editor/src/views/panels/propertyeditor/components/AlignToolsInput';
import {
  ALIGN_VALUE_ORDER,
  AlignPortLike,
  alignGlyphOf,
  alignRowsOf,
  valueOnPress
} from '../../src/editor/src/views/panels/propertyeditor/model/alignRows';
import { RenderedNode, byClass, render, text, walk } from '../support/renderElements';

// Copied from the runtime's port definitions (`noodl-viewer-react`: `node-shared-port-definitions.ts`
// `alignX`/`alignY`, `nodes/visual/group.ts` `alignItems`/`justifyContent`), enum order as declared there.
const ALIGN_X: AlignPortLike = {
  name: 'alignX',
  displayName: 'Align X',
  type: {
    alignComp: 'horizontal',
    enums: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' }
    ]
  }
};
const ALIGN_Y: AlignPortLike = {
  name: 'alignY',
  displayName: 'Align Y',
  type: {
    alignComp: 'vertical',
    enums: [
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' }
    ]
  }
};
const ALIGN_ITEMS: AlignPortLike = {
  name: 'alignItems',
  displayName: 'Align Items',
  default: 'flex-start',
  type: {
    alignComp: 'align-items',
    enums: [
      { label: 'Start', value: 'flex-start' },
      { label: 'End', value: 'flex-end' },
      { label: 'Center', value: 'center' },
      { label: 'Stretch', value: 'stretch' }
    ]
  }
};
const JUSTIFY_CONTENT: AlignPortLike = {
  name: 'justifyContent',
  displayName: 'Justify Content',
  default: 'flex-start',
  type: {
    alignComp: 'justify-content',
    enums: [
      { label: 'Start', value: 'flex-start' },
      { label: 'End', value: 'flex-end' },
      { label: 'Center', value: 'center' },
      { label: 'Space Between', value: 'space-between' },
      { label: 'Space Around', value: 'space-around' },
      { label: 'Space Evenly', value: 'space-evenly' }
    ]
  }
};

describe('CHR-009 — alignment rows (model)', () => {
  it('offers every enum value, Stretch included, start → end then the rest', () => {
    const [row] = alignRowsOf([ALIGN_ITEMS], {});
    expect(row.options.map((o) => o.value)).toEqual(['flex-start', 'center', 'flex-end', 'stretch']);
  });

  it('orders a vertical axis top → bottom (the strip drew bottom first)', () => {
    const [x, y] = alignRowsOf([ALIGN_X, ALIGN_Y], {});
    expect(x.options.map((o) => o.value)).toEqual(['left', 'center', 'right']);
    expect(y.options.map((o) => o.value)).toEqual(['top', 'center', 'bottom']);
  });

  it('keeps an enum value it has no order for, after the known ones', () => {
    const port = { ...ALIGN_ITEMS, type: { ...ALIGN_ITEMS.type, enums: [{ label: 'Baseline', value: 'baseline' }, ...ALIGN_ITEMS.type.enums] } };
    expect(alignRowsOf([port], {})[0].options.map((o) => o.value)).toEqual(['flex-start', 'center', 'flex-end', 'stretch', 'baseline']);
  });

  it('is one row per port, labelled with the port, in port order', () => {
    expect(alignRowsOf([ALIGN_X, ALIGN_Y], {}).map((r) => [r.label, r.portName])).toEqual([
      ['Align X', 'alignX'],
      ['Align Y', 'alignY']
    ]);
  });

  it('presses the default when unset, and does not call it changed', () => {
    const [row] = alignRowsOf([JUSTIFY_CONTENT], {});
    expect(row.options.filter((o) => o.pressed).map((o) => o.value)).toEqual(['flex-start']);
    expect(row.isChanged).toBe(false);
  });

  it('presses the explicit value, and calls it changed', () => {
    const [row] = alignRowsOf([JUSTIFY_CONTENT], { 'justify-content': 'space-between' });
    expect(row.options.filter((o) => o.pressed).map((o) => o.value)).toEqual(['space-between']);
    expect(row.isChanged).toBe(true);
  });

  it('presses nothing for an unset port with no default', () => {
    expect(alignRowsOf([ALIGN_X], {})[0].options.some((o) => o.pressed)).toBe(false);
  });

  it('writes the pressed value, and nothing when it is already in effect', () => {
    const [row] = alignRowsOf([ALIGN_ITEMS], {});
    expect(valueOnPress(row, 'stretch')).toBe('stretch');
    expect(valueOnPress(row, 'flex-start')).toBeNull();
  });

  it('has a glyph for every value it orders, drawn in currentColor at 14px', () => {
    for (const [comp, values] of Object.entries(ALIGN_VALUE_ORDER)) {
      for (const value of values) {
        const glyph = alignGlyphOf(comp, value);
        expect([comp, value, glyph !== null]).toEqual([comp, value, true]);
        const root = glyph.markup.match(/<svg[^>]*>/)[0];
        expect(root).toContain('width="14"');
        expect(root).toContain('fill="currentColor"');
        expect(root).not.toContain('white');
      }
    }
    expect(alignGlyphOf('align-items', 'baseline')).toBeNull();
  });
});

function buttons(tree: RenderedNode | null): RenderedNode[] {
  return walk(tree).filter((n) => n.type === 'button');
}

describe('CHR-009 — alignment rows (component)', () => {
  it('draws a labelled row per port with a segment per value', () => {
    const tree = render(
      <AlignToolsInput ports={[ALIGN_ITEMS, JUSTIFY_CONTENT]} values={{}} isVertical onChange={() => undefined} onReset={() => undefined} />
    );
    expect(text(tree)).toContain('Align Items');
    expect(text(tree)).toContain('Justify Content');
    expect(buttons(tree).map((b) => `${b.props['data-align-comp']}:${b.props['data-align-value']}`)).toEqual([
      'align-items:flex-start',
      'align-items:center',
      'align-items:flex-end',
      'align-items:stretch',
      'justify-content:flex-start',
      'justify-content:center',
      'justify-content:flex-end',
      'justify-content:space-between',
      'justify-content:space-around',
      'justify-content:space-evenly'
    ]);
  });

  it('writes the comp and value a press produces, and nothing for the pressed segment', () => {
    const written: string[] = [];
    const tree = render(
      <AlignToolsInput ports={[ALIGN_ITEMS]} values={{}} isVertical onChange={(c, v) => written.push(`${c}=${v}`)} onReset={() => undefined} />
    );
    for (const b of buttons(tree)) (b.props.onClick as () => void)();
    expect(written).toEqual(['align-items=center', 'align-items=flex-end', 'align-items=stretch']);
  });

  it('draws the reset dot on the changed row only, and it resets that comp', () => {
    const reset: string[] = [];
    const tree = render(
      <AlignToolsInput
        ports={[ALIGN_X, ALIGN_Y]}
        values={{ vertical: 'bottom' }}
        isVertical
        onChange={() => undefined}
        onReset={(c) => reset.push(c)}
      />
    );
    const dots = byClass(tree, 'ResetDot');
    expect(dots).toHaveLength(1);
    (dots[0].props.onClick as () => void)();
    expect(reset).toEqual(['vertical']);
  });

  // FB-018 on the align rows. A wired row that keeps its segments takes presses the wire overwrites. The
  // unwired row in the same render is the control: its segments must still be there.
  it('draws the binding chip in place of a wired row’s segments, and only that row', () => {
    const tree = render(
      <AlignToolsInput
        ports={[ALIGN_X, ALIGN_Y]}
        values={{ vertical: 'bottom' }}
        isVertical
        connections={{ vertical: { label: 'Number · Result' } }}
        onChange={() => undefined}
        onReset={() => undefined}
      />
    );
    expect(buttons(tree).map((b) => b.props['data-align-comp'])).toEqual(['horizontal', 'horizontal', 'horizontal']);
    expect(text(tree)).toContain('Number · Result');
    // The connection overrides the explicit value, so the row stops offering to reset it.
    expect(byClass(tree, 'ResetDot')).toHaveLength(0);
  });
});
