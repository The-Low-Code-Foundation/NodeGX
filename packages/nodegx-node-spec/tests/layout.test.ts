/**
 * NSP-016 AC4 step 1 — the layout model's tables (src/layout.ts). Each row is one rule, worked by hand from the rule's
 * text (CSS Flexbox §9.7 for the main axis; the runtime's `Layout.size` / `align` for what a NodeGX setting turns into).
 * Step 5 grades the same rules against a real browser; these grade the arithmetic.
 */

import { hugSize, layoutChildren, LayoutChild, LayoutParent, Rect, SizeRule } from '../src';

const hug: SizeRule = { kind: 'hug' };
const px = (n: number): SizeRule => ({ kind: 'length', length: { px: n } });
const pct = (n: number, less = 0): SizeRule => ({ kind: 'length', length: { percent: n, px: -less } });
const fill = (weight: number, basis?: 'hug' | { px?: number; percent?: number }): SizeRule => ({ kind: 'fill', weight, basis });
/** What the runtime makes of a percent on its parent's main axis: that percent as the basis, and as a grow weight. */
const runtimePct = (n: number): SizeRule => fill(n, { percent: n });

function kid(width: number, height: number, more: Partial<LayoutChild> = {}): LayoutChild {
  return { width: hug, height: hug, content: { width, height }, ...more };
}

function boxes(parent: LayoutParent, children: LayoutChild[]): Rect[] {
  return layoutChildren(parent, children).children.map(({ x, y, width, height }) => ({ x, y, width, height }));
}

const column = (width: number, height: number, more: Partial<LayoutParent> = {}): LayoutParent => ({
  axis: 'column',
  width,
  height,
  ...more
});
const row = (width: number, height: number, more: Partial<LayoutParent> = {}): LayoutParent => ({
  axis: 'row',
  width,
  height,
  ...more
});

describe('the stack — a column with a gap and padding', () => {
  it('stacks hugging children down from the content box, a gap between', () => {
    const parent = column(200, 300, { padding: { top: 10, right: 10, bottom: 10, left: 10 }, gap: 8 });
    const result = layoutChildren(parent, [kid(50, 20), kid(60, 30), kid(70, 40)]);
    expect(result.children.map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual([
      { x: 10, y: 10, width: 50, height: 20 },
      { x: 10, y: 38, width: 60, height: 30 },
      { x: 10, y: 76, width: 70, height: 40 }
    ]);
    expect(result.extent).toEqual({ width: 90, height: 126 });
    expect(result.overflows).toBe(false);
  });

  it('a border sits outside the padding', () => {
    const parent = column(100, 100, { padding: { top: 5, left: 5 }, border: { top: 2, left: 3 } });
    expect(boxes(parent, [kid(10, 10)])).toEqual([{ x: 8, y: 7, width: 10, height: 10 }]);
  });
});

describe('the main axis — fill beside fixed, and the runtime\'s percent', () => {
  const rows: Array<[string, LayoutParent, LayoutChild[], number[]]> = [
    ['a fill takes what a fixed sibling leaves', row(400, 100), [kid(100, 20, { width: px(100) }), kid(10, 20, { width: fill(1) })], [100, 300]],
    ['two fills share by weight', row(400, 100), [kid(0, 20, { width: fill(1) }), kid(0, 20, { width: fill(3) })], [100, 300]],
    ['30% and 70% fit exactly', row(400, 100), [kid(0, 20, { width: runtimePct(30) }), kid(0, 20, { width: runtimePct(70) })], [120, 280]],
    ['30% and 30% grow equally into the rest', row(400, 100), [kid(0, 20, { width: runtimePct(30) }), kid(0, 20, { width: runtimePct(30) })], [200, 200]],
    ['50% beside 100px grows to the rest', row(400, 100), [kid(0, 20, { width: runtimePct(50) }), kid(0, 20, { width: px(100) })], [300, 100]],
    ['100% beside 100px shrinks to the rest; the fixed one does not', row(400, 100), [kid(0, 20, { width: runtimePct(100) }), kid(0, 20, { width: px(100) })], [300, 100]],
    ['100% and 50% shrink in proportion to their bases', row(400, 100), [kid(0, 20, { width: runtimePct(100) }), kid(0, 20, { width: runtimePct(50) })], [800 / 3, 400 / 3]],
    ['a fill with a hug basis grows from its content', row(400, 100), [kid(100, 20, { width: fill(1, 'hug') }), kid(0, 20, { width: fill(1) })], [250, 150]],
    ['weights summing under 1 take that share of the free space', row(400, 100), [kid(0, 20, { width: fill(0.5) })], [200]],
    ['a column resolves heights the same way', column(100, 400), [kid(20, 0, { height: runtimePct(30) }), kid(20, 0, { height: runtimePct(30) })], [200, 200]]
  ];
  it.each(rows)('%s', (_name, parent, children, sizes) => {
    const dim = parent.axis === 'row' ? 'width' : 'height';
    const got = boxes(parent, children).map((b) => b[dim]);
    got.forEach((g, i) => expect(g).toBeCloseTo(sizes[i], 9));
  });

  it('main-axis margins are outside the sizes, and placed', () => {
    const parent = row(300, 50);
    expect(boxes(parent, [kid(0, 10, { width: px(100), margin: { left: 10 } }), kid(0, 10, { width: fill(1), margin: { right: 20 } })])).toEqual([
      { x: 10, y: 0, width: 100, height: 10 },
      { x: 110, y: 0, width: 170, height: 10 }
    ]);
  });
});

describe('min and max', () => {
  it('a fill that would pass its max freezes there; the rest is shared again', () => {
    const parent = row(400, 100);
    const got = boxes(parent, [kid(0, 10, { width: fill(1), maxWidth: { px: 100 } }), kid(0, 10, { width: fill(1) })]);
    expect(got.map((b) => b.width)).toEqual([100, 300]);
  });

  it('a shrinking fill stops at its min, and the stack overflows', () => {
    const parent = row(400, 100);
    const result = layoutChildren(parent, [kid(0, 10, { width: runtimePct(100), minWidth: { px: 350 } }), kid(0, 10, { width: px(100) })]);
    expect(result.children.map((b) => b.width)).toEqual([350, 100]);
    expect(result.overflows).toBe(true);
  });

  it('a percent min and max are of the parent\'s content box', () => {
    const parent = column(200, 100, { padding: { left: 50, right: 50 } });
    const got = boxes(parent, [kid(10, 10, { width: px(20), minWidth: { percent: 50 } }), kid(10, 10, { width: px(500), maxWidth: { percent: 50 } })]);
    expect(got.map((b) => b.width)).toEqual([50, 50]);
  });

  it('a min beats a max', () => {
    const got = boxes(column(200, 100), [kid(10, 10, { width: px(60), minWidth: { px: 80 }, maxWidth: { px: 40 } })]);
    expect(got[0].width).toBe(80);
  });
});

describe('percent of a padded parent, across the axis', () => {
  const parent = column(200, 100, { padding: { left: 20, right: 30 } });
  it('a percent is of the content box', () => {
    expect(boxes(parent, [kid(10, 10, { width: pct(50) })])[0]).toEqual({ x: 20, y: 0, width: 75, height: 10 });
  });
  it('the runtime\'s cross percent less the margins (calc(100% - m)) fits inside', () => {
    expect(boxes(parent, [kid(10, 10, { width: pct(100, 20), margin: { left: 10, right: 10 } })])[0]).toEqual({ x: 30, y: 0, width: 130, height: 10 });
  });
  it('the runtime\'s calc(50% - m) is not half of what the margins leave', () => {
    expect(boxes(parent, [kid(10, 10, { width: pct(50, 20), margin: { left: 10, right: 10 } })])[0].width).toBe(55);
  });
});

describe('main-axis alignment', () => {
  const two = [kid(10, 20), kid(10, 20)];
  const rows: Array<[string, LayoutParent, LayoutChild[], number[]]> = [
    ['start', column(100, 100), two, [0, 20]],
    ['center', column(100, 100, { mainAlign: 'center' }), two, [30, 50]],
    ['end', column(100, 100, { mainAlign: 'end' }), two, [60, 80]],
    ['space-between', column(100, 100, { mainAlign: 'space-between' }), two, [0, 80]],
    ['space-around', column(100, 100, { mainAlign: 'space-around' }), two, [15, 65]],
    ['space-evenly', column(100, 100, { mainAlign: 'space-evenly' }), two, [20, 60]],
    ['space-between with one child is start', column(100, 100, { mainAlign: 'space-between' }), [kid(10, 20)], [0]],
    ['space-around with one child is center', column(100, 100, { mainAlign: 'space-around' }), [kid(10, 20)], [40]],
    ['center overflows both ways', column(100, 100, { mainAlign: 'center' }), [kid(10, 50), kid(10, 50), kid(10, 50)], [-25, 25, 75]],
    ['space-between with no room is start', column(100, 100, { mainAlign: 'space-between' }), [kid(10, 50), kid(10, 50), kid(10, 50)], [0, 50, 100]],
    ['space-evenly with no room is center', column(100, 100, { mainAlign: 'space-evenly' }), [kid(10, 50), kid(10, 50), kid(10, 50)], [-25, 25, 75]],
    ['the gap counts before the free space', column(100, 100, { mainAlign: 'end', gap: 10 }), two, [50, 80]]
  ];
  it.each(rows)('%s', (_name, parent, children, ys) => {
    expect(boxes(parent, children).map((b) => b.y)).toEqual(ys);
  });
});

describe('spacers — the runtime\'s Align Y in a column, Align X in a row', () => {
  it('a spacer after the first child pushes the rest to the end, and the parent\'s alignment does nothing', () => {
    const got = boxes(column(100, 100, { mainAlign: 'center' }), [kid(10, 20, { spacer: { after: true } }), kid(10, 20)]);
    expect(got.map((b) => b.y)).toEqual([0, 80]);
  });
  it('spacers on both sides centre the child', () => {
    expect(boxes(column(100, 100), [kid(10, 20, { spacer: { before: true, after: true } })])[0].y).toBe(40);
  });
  it('every spacer among the children gets an equal share (three here, 80 / 3 each)', () => {
    const got = boxes(row(100, 20), [kid(10, 10, { spacer: { after: true } }), kid(10, 10, { spacer: { before: true, after: true } })]);
    expect(got[0].x).toBe(0);
    expect(got[1].x).toBeCloseTo(10 + (2 * 80) / 3, 9);
  });
  it('with no free space a spacer is nothing', () => {
    const got = boxes(column(100, 100, { mainAlign: 'end' }), [kid(10, 60, { spacer: { after: true } }), kid(10, 60)]);
    expect(got.map((b) => b.y)).toEqual([-20, 40]);
  });
});

describe('cross-axis alignment', () => {
  const rows: Array<[string, LayoutParent, LayoutChild, Partial<Rect>]> = [
    ['start', column(100, 100), kid(40, 10), { x: 0, width: 40 }],
    ['center', column(100, 100, { crossAlign: 'center' }), kid(40, 10), { x: 30, width: 40 }],
    ['end', column(100, 100, { crossAlign: 'end' }), kid(40, 10), { x: 60, width: 40 }],
    ['stretch a hugging child', column(100, 100, { crossAlign: 'stretch' }), kid(40, 10), { x: 0, width: 100 }],
    ['stretch less the margins', column(100, 100, { crossAlign: 'stretch' }), kid(40, 10, { margin: { left: 5, right: 5 } }), { x: 5, width: 90 }],
    ['stretch leaves a length alone', column(100, 100, { crossAlign: 'stretch' }), kid(40, 10, { width: px(40) }), { x: 0, width: 40 }],
    ['the child\'s own alignment wins', column(100, 100, { crossAlign: 'center' }), kid(40, 10, { alignSelf: 'end' }), { x: 60, width: 40 }],
    ['a fill across is the content less the margins', column(100, 100), kid(40, 10, { width: fill(1), margin: { left: 10 } }), { x: 10, width: 90 }],
    ['a row aligns heights', row(100, 100, { crossAlign: 'center' }), kid(10, 40), { y: 30, height: 40 }],
    ['center overflows both ways across too', column(100, 100, { crossAlign: 'center' }), kid(140, 10), { x: -20, width: 140 }]
  ];
  it.each(rows)('%s', (_name, parent, child, want) => {
    expect(boxes(parent, [child])[0]).toMatchObject(want);
  });
});

describe('overlay — the runtime\'s Layout "None", and a child placed Absolute', () => {
  const parent: LayoutParent = {
    axis: 'overlay',
    width: 300,
    height: 200,
    border: { top: 2, right: 2, bottom: 2, left: 2 },
    padding: { top: 10, right: 10, bottom: 10, left: 10 }
  };
  const rows: Array<[string, LayoutChild, Rect]> = [
    ['start is the padding box\'s corner (padding does not inset an overlay)', kid(50, 40), { x: 2, y: 2, width: 50, height: 40 }],
    ['center', kid(50, 40, { overlayAlign: { x: 'center', y: 'center' } }), { x: 125, y: 80, width: 50, height: 40 }],
    ['end, with margins', kid(50, 40, { overlayAlign: { x: 'end', y: 'end' }, margin: { right: 5, bottom: 5 } }), { x: 243, y: 153, width: 50, height: 40 }],
    ['a percent is of the padding box', kid(50, 40, { width: pct(50) }), { x: 2, y: 2, width: 148, height: 40 }],
    ['a fill is the padding box less the margins', kid(50, 40, { width: fill(1), margin: { left: 6, right: 4 } }), { x: 8, y: 2, width: 286, height: 40 }]
  ];
  it.each(rows)('%s', (_name, child, want) => {
    expect(boxes(parent, [child])[0]).toEqual(want);
  });

  it('an overlay child in a stack takes no room in it', () => {
    const got = boxes(column(100, 100), [kid(10, 20), kid(30, 30, { place: 'overlay', overlayAlign: { x: 'end', y: 'end' } }), kid(10, 20)]);
    expect(got).toEqual([
      { x: 0, y: 0, width: 10, height: 20 },
      { x: 70, y: 70, width: 30, height: 30 },
      { x: 0, y: 20, width: 10, height: 20 }
    ]);
  });
});

describe('scroll and clip', () => {
  // SCROLLROOM (ruled 2026-10-09): the room inside a scroll is the window unless the content is longer
  it('a scrolling column whose content is longer than the window: every fill stops at its content, it starts at the start, the rest is clipped', () => {
    const parent = column(100, 100, { scroll: true, mainAlign: 'center' });
    const result = layoutChildren(parent, [kid(100, 60), kid(100, 60, { height: runtimePct(100) }), kid(100, 60, { height: fill(1) })]);
    expect(result.children.map((b) => b.y)).toEqual([0, 60, 120]);
    expect(result.children.map((b) => b.height)).toEqual([60, 60, 60]);
    expect(result.extent.height).toBe(180);
    expect(result.overflows).toBe(true);
    expect(result.children[1].visible).toEqual({ x: 0, y: 60, width: 100, height: 40 });
    expect(result.children[2].visible).toBeNull();
  });

  it('a fill inside a scroll shares what the window leaves, and a long one keeps its content and pushes the rest on', () => {
    // the checkout: a header, the items as a fill, a footer — short items fill to the footer, long ones scroll it on
    const page = (items: number) => boxes(column(100, 200, { scroll: true }), [kid(100, 40), kid(100, items, { height: fill(1) }), kid(100, 30)]);
    expect(page(20).map((b) => [b.y, b.height])).toEqual([[0, 40], [40, 130], [170, 30]]);
    expect(page(300).map((b) => [b.y, b.height])).toEqual([[0, 40], [40, 300], [340, 30]]);
  });

  it('a percentage inside a scroll is of the window: Fixed 100% slides are one window each, shares split it', () => {
    const slides = (w: SizeRule) => boxes(row(300, 100, { scroll: true }), [kid(10, 100, { width: w }), kid(10, 100, { width: w }), kid(10, 100, { width: w })]);
    expect(slides(pct(100)).map((b) => [b.x, b.width])).toEqual([[0, 300], [300, 300], [600, 300]]);
    expect(slides(runtimePct(100)).map((b) => [b.x, b.width])).toEqual([[0, 100], [100, 100], [200, 100]]);
    expect(boxes(row(300, 100, { scroll: true }), [kid(10, 100, { width: pct(50) })])[0].width).toBe(150);
  });

  it('a scroll aligns only what fits: centred while it fits, at the start once it is longer (safe)', () => {
    const centred = (n: number) => boxes(column(100, 200, { scroll: true, mainAlign: 'center' }), Array.from({ length: n }, () => kid(100, 100)));
    expect(centred(1).map((b) => b.y)).toEqual([50]);
    expect(centred(3).map((b) => b.y)).toEqual([0, 100, 200]);
  });

  it('a clipping parent cuts what is drawn to its padding box', () => {
    const result = layoutChildren(column(100, 100, { clip: true, border: { top: 1, right: 1, bottom: 1, left: 1 } }), [kid(150, 150)]);
    expect(result.children[0].drawn).toEqual({ x: 1, y: 1, width: 150, height: 150 });
    expect(result.children[0].visible).toEqual({ x: 1, y: 1, width: 98, height: 98 });
  });

  it('without a clip, what is visible is what is drawn', () => {
    const result = layoutChildren(column(100, 100), [kid(150, 150)]);
    expect(result.children[0].visible).toEqual(result.children[0].drawn);
  });
});

describe('transform — what is drawn moves, the siblings do not', () => {
  const at = (transform: LayoutChild['transform']) => layoutChildren(column(200, 200), [kid(100, 50, { transform }), kid(10, 10)]);
  const close = (r: Rect, want: Rect) => {
    expect(r.x).toBeCloseTo(want.x, 9);
    expect(r.y).toBeCloseTo(want.y, 9);
    expect(r.width).toBeCloseTo(want.width, 9);
    expect(r.height).toBeCloseTo(want.height, 9);
  };
  it('a translate in px', () => close(at({ x: { px: 10 } }).children[0].drawn, { x: 10, y: 0, width: 100, height: 50 }));
  it('a translate in percent is of the child\'s own size', () => close(at({ x: { percent: 50 }, y: { percent: -100 } }).children[0].drawn, { x: 50, y: -50, width: 100, height: 50 }));
  it('a scale is about the centre', () => close(at({ scale: 2 }).children[0].drawn, { x: -50, y: -25, width: 200, height: 100 }));
  it('a quarter turn about the centre', () => close(at({ rotation: 90 }).children[0].drawn, { x: 25, y: -25, width: 50, height: 100 }));
  it('a scale about the top-left corner', () => close(at({ scale: 0.5, originX: { px: 0 }, originY: { px: 0 } }).children[0].drawn, { x: 0, y: 0, width: 50, height: 25 }));
  it('the layout box and the next sibling stay put', () => {
    const result = at({ x: { px: 30 }, rotation: 45, scale: 3 });
    expect(result.children[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 50 });
    expect(result.children[1]).toMatchObject({ x: 0, y: 50 });
  });
});

describe('z-order', () => {
  it('paints by z, then in child order', () => {
    const result = layoutChildren(column(100, 100), [kid(1, 1), kid(1, 1, { z: 2 }), kid(1, 1, { z: -1 }), kid(1, 1, { z: 2 })]);
    expect(result.paintOrder).toEqual([2, 0, 1, 3]);
  });
});

describe('hugSize — a parent the size of its children', () => {
  const padded = { padding: { top: 10, right: 10, bottom: 10, left: 10 }, gap: 5 };
  it('a column: the widest child, the heights and the gaps, the padding', () => {
    expect(hugSize({ axis: 'column', ...padded }, [kid(50, 20), kid(70, 30)])).toEqual({ width: 90, height: 75 });
  });
  it('a row: the widths and gaps, the tallest', () => {
    expect(hugSize({ axis: 'row', ...padded }, [kid(50, 20), kid(70, 30)])).toEqual({ width: 145, height: 50 });
  });
  it('a percent or a fill on a hugged axis counts as its content', () => {
    expect(hugSize({ axis: 'column' }, [kid(50, 20, { height: runtimePct(100), width: pct(100) }), kid(70, 30, { height: fill(1) })])).toEqual({
      width: 70,
      height: 50
    });
  });
  it('a given width is kept, and a fill across it is that width less the insets and margins', () => {
    expect(hugSize({ axis: 'column', ...padded }, [kid(50, 20, { width: fill(1), margin: { left: 5 } })], { width: 200 })).toEqual({
      width: 200,
      height: 40
    });
  });
  it('an overlay is its largest child, margins included', () => {
    expect(hugSize({ axis: 'overlay' }, [kid(50, 20, { margin: { left: 7 } }), kid(30, 40)])).toEqual({ width: 57, height: 40 });
  });
  it('an overlay child of a stack takes no room in it', () => {
    expect(hugSize({ axis: 'column' }, [kid(50, 20), kid(300, 300, { place: 'overlay' })])).toEqual({ width: 50, height: 20 });
  });
  it('the hug size laid out again has no free space', () => {
    const parent = { axis: 'row' as const, ...padded };
    const kids = [kid(50, 20), kid(70, 30)];
    const size = hugSize(parent, kids);
    const result = layoutChildren({ ...parent, ...size, mainAlign: 'end' }, kids);
    expect(result.children.map((b) => b.x)).toEqual([10, 65]);
    expect(result.extent).toEqual(size);
  });
});
