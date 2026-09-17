import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

import {
  MarginPaddingParam,
  axisComps,
  commitMarginPaddingEdit,
  commitMarginPaddingPairEdit,
  fieldTextOf,
  pairDisplayOf,
  sideLayoutOf
} from '../../src/editor/src/views/panels/propertyeditor/components/marginPaddingEdit';
import { MarginPaddingType } from '../../src/editor/src/views/panels/propertyeditor/DataTypes/MarginPaddingType';

/**
 * CHR-009 slice 4 — Margin and Padding as paired rows (`↕` `↔`) with a per-edge expander (AC4).
 *
 * The component calls hooks and cannot be evaluated here, so what is graded is what decides:
 * which sides a paired field writes, what a pair reads as (a value, or `mixed`), that a pair
 * is ONE undo step, and that the expander writes nothing. The view is driven through the same
 * props it hands the component.
 */

// `NumberWithUnits` imports these for its row; the view calls the two connection readers for a wired edge.
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({
  getConnectionSourceLabel: (_model: unknown, port: string) => `String · Value → ${port}`,
  getConnectionSourceNavigate: () => () => undefined
}));
jest.mock('@noodl-models/nodelibrary', () => ({ NodeLibrary: {} }));

// `marginPaddingEdit` reads through `DataTypes/NumberWithUnits`, whose component reaches an `.svg`.
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/NumberUnitInput', () => ({
  NumberUnitInput: function NumberUnitInput() {
    return null;
  }
}));

// `MarginPaddingInput.tsx` reaches core-ui scrub + row modules the view does not need here.
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput', () => ({
  MarginPaddingInput: function MarginPaddingInput() {
    return null;
  }
}));

const COMPS = ['Top', 'Bottom', 'Left', 'Right'];
const PORTS = ['margin', 'padding'].flatMap((side) =>
  COMPS.map((edge) => ({
    name: side + edge,
    displayName: side + edge,
    group: 'Margin and padding',
    type: { name: 'number', units: ['px', '%'], defaultUnit: 'px', marginPaddingComp: `${side}-${edge.toLowerCase()}` }
  }))
);

interface Props {
  values: Record<string, MarginPaddingParam | undefined>;
  defaults: Record<string, MarginPaddingParam>;
  expanded: { margin: boolean; padding: boolean };
  onToggleExpanded: (side: 'margin' | 'padding') => void;
  onUpdate: (comp: string, value: MarginPaddingParam | undefined) => void;
  onUpdateComps: (comps: string[], value: MarginPaddingParam | undefined, opts?: unknown) => void;
  onResetSide: (side: 'margin' | 'padding') => void;
}

function aBox(parameters: Record<string, unknown> = {}, wired: string[] = []) {
  const writes: { name: string; value: unknown; opts?: { undo?: unknown } }[] = [];
  const model = {
    parameters,
    isPortConnected: (name: string, direction: string) => direction === 'target' && wired.includes(name),
    getParameter: (name: string) => parameters[name],
    notifyListeners: () => undefined,
    setParameter(name: string, value: unknown, opts?: { undo?: unknown }) {
      writes.push({ name, value, opts });
      // As `NodeGraphNode.setParameter` does: a group passed in receives this change's undo.
      if (opts && opts.undo instanceof UndoActionGroup) opts.undo.push({ do: () => undefined, undo: () => undefined });
      if (value === undefined) delete parameters[name];
      else parameters[name] = value;
    }
  };
  const parent = { model, _toolsType: {} as Record<string, unknown> };
  let view: MarginPaddingType | undefined;
  for (const port of PORTS) {
    const made = MarginPaddingType.fromPort({ port, parent });
    if (made) view = made;
  }
  const frames: Props[] = [];
  const internals = view as unknown as { root: unknown; renderReact(): void };
  internals.root = { render: (el: { props: Props }) => frames.push(el.props), unmount: () => undefined };
  internals.renderReact();
  return { parameters, writes, latest: () => frames[frames.length - 1], frames };
}

const px = (value: number) => ({ value, unit: 'px' });

describe('CHR-009 — the axis a paired field covers', () => {
  it('↕ is top + bottom and ↔ is left + right, for both groups', () => {
    expect(axisComps('padding', 'vertical')).toEqual(['padding-top', 'padding-bottom']);
    expect(axisComps('padding', 'horizontal')).toEqual(['padding-left', 'padding-right']);
    expect(axisComps('margin', 'vertical')).toEqual(['margin-top', 'margin-bottom']);
    expect(axisComps('margin', 'horizontal')).toEqual(['margin-left', 'margin-right']);
  });
});

describe('CHR-009 AC4 — what a collapsed pair reads as', () => {
  it('two equal sides read as that value', () => {
    expect(pairDisplayOf('padding', 'vertical', { 'padding-top': px(8), 'padding-bottom': px(8) }, {})).toEqual({
      kind: 'same',
      value: px(8)
    });
  });

  it('a side set to 0 beside a side inheriting 0 is one `0`, not mixed', () => {
    const shown = pairDisplayOf(
      'padding',
      'vertical',
      { 'padding-top': px(0) },
      { 'padding-bottom': { value: undefined, unit: 'px' } as never }
    );
    expect(shown.kind).toBe('same');
  });

  it('AC4 — top 8 over bottom 0 reads `mixed`, and the tooltip names both', () => {
    expect(pairDisplayOf('padding', 'vertical', { 'padding-top': px(8) }, {})).toEqual({
      kind: 'mixed',
      description: 'Top 8px · Bottom 0px'
    });
  });

  it('the same number in different units is mixed; a % side names its unit once', () => {
    expect(
      pairDisplayOf('margin', 'horizontal', { 'margin-left': px(10), 'margin-right': { value: 10, unit: '%' } }, {})
    ).toEqual({ kind: 'mixed', description: 'Left 10px · Right 10%' });
  });

  it('the other axis is untouched by a difference on this one — the control', () => {
    expect(pairDisplayOf('padding', 'horizontal', { 'padding-top': px(8) }, {}).kind).toBe('same');
  });
});

describe('CHR-009 — what a typed edit writes', () => {
  function capture() {
    const calls: { comps: string[]; value: unknown }[] = [];
    let refused: string | null = null;
    return {
      calls,
      refused: () => refused,
      onUpdateComps: (comps: string[], value: unknown) => calls.push({ comps, value }),
      onUpdate: (comp: string, value: unknown) => calls.push({ comps: [comp], value }),
      onRefuse: (text: string) => (refused = text)
    };
  }

  it('a paired field writes both sides of its axis, once', () => {
    const c = capture();
    const out = commitMarginPaddingPairEdit({
      side: 'padding',
      axis: 'vertical',
      text: '12',
      unit: 'px',
      values: {},
      defaults: {},
      ...c
    });
    expect(out).toBe('committed');
    expect(c.calls).toEqual([{ comps: ['padding-top', 'padding-bottom'], value: px(12) }]);
  });

  it('typing into a mixed field sets both sides to the typed value', () => {
    const c = capture();
    commitMarginPaddingPairEdit({
      side: 'padding',
      axis: 'vertical',
      text: '4',
      unit: 'px',
      values: { 'padding-top': px(8) },
      defaults: {},
      ...c
    });
    expect(c.calls).toEqual([{ comps: ['padding-top', 'padding-bottom'], value: px(4) }]);
  });

  it('a refusal writes nothing; a mixed field snaps back to empty, a same field to its value', () => {
    const mixed = capture();
    commitMarginPaddingPairEdit({
      side: 'padding',
      axis: 'vertical',
      text: 'banana',
      unit: 'px',
      values: { 'padding-top': px(8) },
      defaults: {},
      ...mixed
    });
    expect(mixed.calls).toEqual([]);
    expect(mixed.refused()).toBe('');

    const same = capture();
    commitMarginPaddingPairEdit({
      side: 'padding',
      axis: 'vertical',
      text: 'banana',
      unit: 'px',
      values: { 'padding-top': px(8), 'padding-bottom': px(8) },
      defaults: {},
      ...same
    });
    expect(same.refused()).toBe('8');
  });

  it('the unit is typed: `50%` switches, `12px` switches back, a bare number keeps the field’s', () => {
    // The rows have no unit control — a hover toggle took clicks meant for the value (`120` stored `0%`).
    const pct = capture();
    commitMarginPaddingPairEdit({ side: 'margin', axis: 'horizontal', text: '50%', unit: 'px', values: {}, defaults: {}, ...pct });
    expect(pct.calls).toEqual([{ comps: ['margin-left', 'margin-right'], value: { value: 50, unit: '%' } }]);

    const back = capture();
    commitMarginPaddingEdit({ comp: 'margin-left', text: '12px', unit: '%', values: {}, ...back });
    expect(back.calls).toEqual([{ comps: ['margin-left'], value: px(12) }]);

    const bare = capture();
    commitMarginPaddingPairEdit({ side: 'margin', axis: 'horizontal', text: '8', unit: '%', values: {}, defaults: {}, ...bare });
    expect(bare.calls).toEqual([{ comps: ['margin-left', 'margin-right'], value: { value: 8, unit: '%' } }]);
  });

  it('a field shows the magnitude alone — the % is its own suffix, so `50%` is never `50%%`', () => {
    expect(fieldTextOf({ value: 50, unit: '%' })).toBe('50');
    expect(fieldTextOf(px(120))).toBe('120');
    expect(fieldTextOf(undefined)).toBe('0');
    expect(fieldTextOf('var(--space-2)')).toBe('--space-2');
  });

  it('a per-edge field writes exactly its own side — no hidden "all four" mode survives', () => {
    const c = capture();
    commitMarginPaddingEdit({ comp: 'padding-top', text: '8', unit: 'px', values: {}, ...c });
    expect(c.calls).toEqual([{ comps: ['padding-top'], value: px(8) }]);
  });
});

describe('CHR-009 — the view', () => {
  it('AC4 — expand, type top, collapse: the model holds four values and the pair reads mixed', () => {
    const box = aBox({ paddingTop: px(0), paddingBottom: px(0), paddingLeft: px(0), paddingRight: px(0) });
    expect(box.latest().expanded.padding).toBe(false);

    const writesBefore = box.writes.length;
    box.latest().onToggleExpanded('padding');
    // The expander is how the author is looking at the box; it writes nothing.
    expect(box.writes.length).toBe(writesBefore);
    expect(box.latest().expanded).toEqual({ margin: false, padding: true });

    box.latest().onUpdate('padding-top', px(8));
    box.latest().onToggleExpanded('padding');

    const { values, defaults, expanded } = box.latest();
    expect(expanded.padding).toBe(false);
    expect([
      box.parameters.paddingTop,
      box.parameters.paddingBottom,
      box.parameters.paddingLeft,
      box.parameters.paddingRight
    ]).toEqual([px(8), px(0), px(0), px(0)]);
    expect(pairDisplayOf('padding', 'vertical', values, defaults)).toEqual({
      kind: 'mixed',
      description: 'Top 8px · Bottom 0px'
    });
    expect(pairDisplayOf('padding', 'horizontal', values, defaults).kind).toBe('same');
  });

  it('a pair is ONE undo step with both sides in it', () => {
    const box = aBox();
    const pushed: UndoActionGroup[] = [];
    const spy = jest.spyOn(UndoQueue.instance, 'push').mockImplementation((g: UndoActionGroup) => {
      pushed.push(g);
    });
    try {
      box.latest().onUpdateComps(['padding-left', 'padding-right'], px(6));
      expect(pushed).toHaveLength(1);
      const undoGroups = new Set(box.writes.map((w) => w.opts && w.opts.undo));
      expect(undoGroups).toEqual(new Set([pushed[0]]));
      expect(box.writes.map((w) => w.name)).toEqual(['paddingLeft', 'paddingRight']);
    } finally {
      spy.mockRestore();
    }
  });

  it('a drag writes without undo; its end records one step, and undo returns an UNSET side to unset', () => {
    // 🔴 Measured on the dev build: `↔` margin dragged from unset to 24, one undo, still 24 —
    // `setParameter`'s `oldValue` override is checked with `if (args.oldValue)`, so `undefined`
    // read as "not supplied" and the entry recorded the dragged value.
    const box = aBox({ marginTop: px(4) });
    const pushed: UndoActionGroup[] = [];
    const spy = jest.spyOn(UndoQueue.instance, 'push').mockImplementation((g: UndoActionGroup) => {
      pushed.push(g);
    });
    try {
      const before = { ...box.latest().values };
      box.latest().onUpdateComps(['margin-left', 'margin-right'], px(3), { drag: true });
      box.latest().onUpdateComps(['margin-left', 'margin-right'], px(24), { drag: true });
      expect(pushed).toHaveLength(0);
      box.latest().onUpdateComps(['margin-left', 'margin-right'], px(24), { oldValues: before });
      expect(pushed).toHaveLength(1);
      expect([box.parameters.marginLeft, box.parameters.marginRight]).toEqual([px(24), px(24)]);

      pushed[0].undo();
      expect('marginLeft' in box.parameters).toBe(false);
      expect('marginRight' in box.parameters).toBe(false);
      expect(box.parameters.marginTop).toEqual(px(4));
    } finally {
      spy.mockRestore();
    }
  });

  it('a drag that ends where it began records nothing — the control', () => {
    const box = aBox({ marginLeft: px(5), marginRight: px(5) });
    const spy = jest.spyOn(UndoQueue.instance, 'push').mockImplementation(() => undefined);
    try {
      const before = { ...box.latest().values };
      box.latest().onUpdateComps(['margin-left', 'margin-right'], px(9), { drag: true });
      box.latest().onUpdateComps(['margin-left', 'margin-right'], px(5), { oldValues: before });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('reset clears one group, as one step, and leaves the other group alone', () => {
    const box = aBox({ marginTop: px(4), paddingTop: px(8), paddingLeft: px(2) });
    const spy = jest.spyOn(UndoQueue.instance, 'push').mockImplementation(() => undefined);
    try {
      box.latest().onResetSide('padding');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(box.parameters.paddingTop).toBeUndefined();
      expect(box.parameters.paddingLeft).toBeUndefined();
      expect(box.parameters.marginTop).toEqual(px(4));
      // Only the sides that held a value are written: an already-default side adds no entry.
      expect(box.writes.map((w) => w.name).sort()).toEqual(['paddingLeft', 'paddingTop']);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('CHR-009 / FB-018 — a wired margin or padding edge', () => {
  const none = () => false;
  const wiredLeft = (comp: string) => comp === 'padding-left';

  it('the control: nothing wired, collapsed — two pairs, the expander free', () => {
    const layout = sideLayoutOf('padding', false, {}, none);
    expect(layout.fields).toEqual([
      { kind: 'pair', axis: 'vertical' },
      { kind: 'pair', axis: 'horizontal' }
    ]);
    expect(layout.forced).toBe(false);
  });

  it('a wired edge splits its side: the wired edge is bound, the other three stay fields', () => {
    const layout = sideLayoutOf('padding', false, {}, wiredLeft);
    expect(layout.expanded).toBe(true);
    expect(layout.forced).toBe(true);
    expect(layout.fields).toEqual([
      { kind: 'edge', comp: 'padding-top' },
      { kind: 'edge', comp: 'padding-bottom' },
      { kind: 'bound', comp: 'padding-left' },
      { kind: 'edge', comp: 'padding-right' }
    ]);
  });

  it('the other side is untouched by a wire on this one', () => {
    expect(sideLayoutOf('margin', false, {}, wiredLeft).fields.map((f) => f.kind)).toEqual(['pair', 'pair']);
  });

  it('a wired edge’s typed value lights no reset dot and is not what the reset clears', () => {
    const onlyWired = sideLayoutOf('padding', false, { 'padding-left': px(9) }, wiredLeft);
    expect(onlyWired.isChanged).toBe(false);
    expect(onlyWired.resettable).toEqual([]);
    const both = sideLayoutOf('padding', false, { 'padding-left': px(9), 'padding-top': px(2) }, wiredLeft);
    expect(both.isChanged).toBe(true);
    expect(both.resettable).toEqual(['padding-top']);
  });

  it('the view hands the component the wire for exactly the wired edge, named', () => {
    const box = aBox({}, ['paddingLeft']);
    const { connections } = box.latest() as Props & { connections: Record<string, { label?: string; onClick?: unknown }> };
    expect(Object.keys(connections)).toEqual(['padding-left']);
    expect(connections['padding-left'].label).toBe('String · Value → paddingLeft');
    expect(typeof connections['padding-left'].onClick).toBe('function');
  });

  it('the view’s reset leaves a wired edge’s stored value alone', () => {
    const box = aBox({ paddingTop: px(8), paddingLeft: px(2) }, ['paddingLeft']);
    const spy = jest.spyOn(UndoQueue.instance, 'push').mockImplementation(() => undefined);
    try {
      box.latest().onResetSide('padding');
      expect(box.writes.map((w) => w.name)).toEqual(['paddingTop']);
      expect(box.parameters.paddingLeft).toEqual(px(2));
    } finally {
      spy.mockRestore();
    }
  });
});
