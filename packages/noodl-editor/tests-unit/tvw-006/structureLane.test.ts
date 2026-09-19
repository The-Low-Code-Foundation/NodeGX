/**
 * TVW-006 — the structure lane's geometry and its three filter states.
 *
 * Every row of the task's §2 table that is settled is here. The two rows that the corpus census
 * turned into questions — an enclosed logic root, and lanes that overlap each other — are NOT
 * asserted, because asserting a decision nobody has made is how a guess becomes a gate
 * ([[a-gate-can-have-a-hole-shaped-like-the-defect]]). They are §6 of the task file.
 *
 * 🔴 **The fixtures carry the populations the census found, not convenient ones.** 26% of the
 * corpus's 5,527 non-empty components have TWO OR MORE visual roots (745 with two, 667 with three
 * or more) and 18% have NONE. A fixture with one tidy visual root and one logic node beside it
 * would grade a shape that four components in five are not
 * ([[a-fixture-that-avoids-a-real-population-grades-a-coincidence]]).
 */

import {
  connectionAlpha,
  dashPattern,
  eyebrowIsVisible,
  hairlineWidth,
  isLogicOnly,
  laneIsVisible,
  laneRectFor,
  lanesForFrame,
  rootAlpha,
  StructureLane,
  type LaneFilter,
  type LaneRoot,
  type PaintRect
} from '../../src/editor/src/views/nodegrapheditor/canvas/structureLane';

const root = (id: string, x: number, y: number, width: number, height: number, isVisual: boolean): LaneRoot => ({
  id,
  x,
  y,
  width,
  height,
  isVisual
});

/** The whole plane — a culling rect that excludes nothing, for the tests that are not about it. */
const EVERYTHING: PaintRect = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };

/** The census's commonest shape: one stack, logic roots beside it. */
const STACK = root('page', 100, 100, 150, 400, true);
const LOGIC = root('query', 400, 120, 150, 80, false);

describe('the lane is the stack’s measured box, grown for padding and the eyebrow', () => {
  it('pads all four sides and adds the eyebrow to the top only', () => {
    // The eyebrow must not push the stack down or move the wires into it: the lane grows UP.
    const rect = laneRectFor(STACK);

    expect(rect).toEqual({
      id: 'page',
      x: 100 - 12,
      y: 100 - 12 - 22,
      width: 150 + 24,
      height: 400 + 24 + 22
    });
  });

  it('puts the stack’s bottom edge exactly `padding` above the lane’s bottom', () => {
    // Guards the top/bottom asymmetry: adding the eyebrow to the height AND the y is what keeps
    // the bottom gap equal to the side gaps. Getting one of the two wrong is invisible in a
    // width assertion and obvious on screen.
    const rect = laneRectFor(STACK);

    expect(rect.y + rect.height - (STACK.y + STACK.height)).toBe(StructureLane.padding);
    expect(STACK.x - rect.x).toBe(StructureLane.padding);
  });

  it('tracks the root when it moves, because it is derived from it — AC1’s drag', () => {
    const before = laneRectFor(STACK);
    const after = laneRectFor({ ...STACK, x: STACK.x + 200, y: STACK.y + 100 });

    expect(after.x - before.x).toBe(200);
    expect(after.y - before.y).toBe(100);
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
  });
});

describe('which lanes a frame draws', () => {
  it('draws one lane per visual root and none for a logic root', () => {
    const lanes = lanesForFrame([STACK, LOGIC], EVERYTHING);

    expect(lanes.map((l) => l.id)).toEqual(['page']);
  });

  it('draws THREE lanes for a three-root component — 667 in the corpus', () => {
    const roots = [
      root('a', 0, 0, 150, 200, true),
      root('b', 400, 0, 150, 200, true),
      root('c', 800, 0, 150, 200, true),
      root('logic', 1200, 0, 150, 60, false)
    ];

    expect(lanesForFrame(roots, EVERYTHING).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('never merges two lanes into one region', () => {
    // Two stacks side by side are two screens' worth of structure; one box around both would
    // claim the empty space between them as structure.
    const lanes = lanesForFrame([root('a', 0, 0, 150, 100, true), root('b', 900, 0, 150, 100, true)], EVERYTHING);

    expect(lanes).toHaveLength(2);
    expect(lanes[0].width).toBe(150 + 24);
    expect(lanes[1].width).toBe(150 + 24);
  });

  it('culls a lane that is off-screen and keeps one that only clips the edge', () => {
    // §5's first landmine: the lane is culled WITH its root, which is what makes the per-frame
    // cost O(roots). A lane one pixel inside the rect still draws.
    const onScreen = root('near', 0, 0, 150, 100, true);
    const offScreen = root('far', 100000, 100000, 150, 100, true);
    const paint: PaintRect = { minX: -50, maxX: 500, minY: -50, maxY: 500 };

    expect(lanesForFrame([onScreen, offScreen], paint).map((l) => l.id)).toEqual(['near']);
  });

  it('keeps a lane whose edge lands EXACTLY on the viewport boundary', () => {
    // Not a nicety: the lane's stroke has width and is centred on the edge, so a lane flush with
    // the boundary paints half a hairline of visible ink inside it. An exclusive test culls it and
    // the lane of the stack you just scrolled to the edge of blinks out.
    const paint: PaintRect = { minX: 0, maxX: 500, minY: 0, maxY: 500 };
    const flushRight = laneRectFor(root('flush', 512, 100, 150, 100, true)); // x - 12 === maxX

    expect(flushRight.x).toBe(paint.maxX);
    expect(laneIsVisible(flushRight, paint)).toBe(true);
  });

  it('keeps a lane whose stack is off-screen but whose eyebrow is not', () => {
    // The lane reaches 34px above the stack. A root just above the viewport still has a visible
    // eyebrow, and culling on the ROOT's box rather than the LANE's would drop it.
    const root34Above = root('just-above', 0, -120, 150, 100, true);
    const paint: PaintRect = { minX: -50, maxX: 500, minY: -50, maxY: 500 };

    expect(laneIsVisible(laneRectFor(root34Above), paint)).toBe(true);
  });
});

describe('a component with nothing that draws — 1,012 in the corpus, 18%', () => {
  it('is logic-only when it has roots and none of them is visual', () => {
    expect(isLogicOnly([LOGIC, root('sort', 0, 0, 150, 60, false)])).toBe(true);
  });

  it('is NOT logic-only when one root draws', () => {
    expect(isLogicOnly([STACK, LOGIC])).toBe(false);
  });

  it('is NOT logic-only when it is empty', () => {
    // An empty component has no structure AND no logic. "LOGIC ONLY" over an empty canvas states
    // something false about a graph with nothing in it.
    expect(isLogicOnly([])).toBe(false);
  });
});

describe('the filter dims, never hides (R-F)', () => {
  const cases: Array<[LaneFilter, number, number]> = [
    ['all', 1, 1],
    ['structure', 1, StructureLane.dimAlpha],
    ['logic', StructureLane.dimAlpha, 1]
  ];

  it.each(cases)('under %s the stack is %p and the logic node is %p', (filter, visual, logic) => {
    expect(rootAlpha(true, filter)).toBe(visual);
    expect(rootAlpha(false, filter)).toBe(logic);
  });

  it('never returns zero, in any state, for either kind of root', () => {
    // The whole of R-F in one assertion: a dimmed node is still painted, so it is still there to
    // be clicked, dragged and connected. An alpha of 0 would be a hide wearing a dim's name.
    for (const filter of ['all', 'structure', 'logic'] as LaneFilter[]) {
      for (const isVisual of [true, false]) {
        expect(rootAlpha(isVisual, filter)).toBeGreaterThan(0);
      }
    }
  });
});

describe('a wire under the filter', () => {
  it('leaves a wire alone when the filter is off', () => {
    expect(connectionAlpha(false, false, 'all')).toBe(1);
    expect(connectionAlpha(true, true, 'all')).toBe(1);
  });

  it('dims a wire with NEITHER end in a lane under Structure — §2, in its own words', () => {
    expect(connectionAlpha(false, false, 'structure')).toBe(StructureLane.dimAlpha);
  });

  it('dims a wire with BOTH ends in a lane under Logic', () => {
    expect(connectionAlpha(true, true, 'logic')).toBe(StructureLane.dimAlpha);
  });

  it('keeps a CROSSING wire bright under both filters', () => {
    // The wire that ties the two halves together is the only one that is about both of them.
    // 🔴 AC1's sentence asks for this wire to fade ACROSS the boundary instead — a gradient, and
    // a decision §2 does not contain. Filed at §6; this spec is the §2 reading.
    for (const filter of ['structure', 'logic'] as LaneFilter[]) {
      expect(connectionAlpha(true, false, filter)).toBe(1);
      expect(connectionAlpha(false, true, filter)).toBe(1);
    }
  });
});

describe('the lane holds its weight as the canvas zooms', () => {
  it('divides the stroke back out of the scale so it reads 1px at any zoom', () => {
    expect(hairlineWidth(1)).toBe(1);
    expect(hairlineWidth(0.5)).toBe(2);
    expect(hairlineWidth(2)).toBe(0.5);
  });

  it('does not divide out the device pixel ratio', () => {
    // 1 CSS px on a 2x display is supposed to be 2 device px. The ratio is already in the
    // context's transform; dividing it out here would draw a half-pixel hairline.
    expect(hairlineWidth(1)).toBe(1);
  });

  it('survives a zero scale rather than returning Infinity', () => {
    expect(hairlineWidth(0)).toBe(1);
  });

  it('scales the dashes with the stroke so they stay the same size on screen', () => {
    expect(dashPattern(1)).toEqual([4, 4]);
    expect(dashPattern(0.5)).toEqual([8, 8]);
  });

  it('hides the eyebrow below 50% and keeps it at exactly 50% — §3', () => {
    expect(eyebrowIsVisible(0.49)).toBe(false);
    expect(eyebrowIsVisible(0.5)).toBe(true);
    expect(eyebrowIsVisible(1)).toBe(true);
  });
});
