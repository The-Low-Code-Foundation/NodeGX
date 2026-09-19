/**
 * TVW-007 — the instance count's rules, graded where they are pure.
 *
 * What is NOT graded here, deliberately: that the thing appears on a card. These are the rules a
 * painter obeys, and a rule that reads correctly in jest can still be painted behind the
 * connection-drag area or under the ports separator ([[verify-the-consequence-not-just-the-mechanism]]).
 * The placement is going to Richard as photographs for exactly that reason.
 */

import {
  eyebrowExtraHeight,
  eyebrowIsVisible,
  eyebrowPlan,
  eyebrowText,
  InstanceEyebrow,
  PLACEMENTS,
  titleAllowanceFor,
  type EyebrowInput,
  type EyebrowPlacement
} from '../../src/editor/src/views/nodegrapheditor/canvas/instanceEyebrow';

/** A node whose count is drawable and whose name leaves plenty of room after it. */
function input(overrides: Partial<EyebrowInput> = {}): EyebrowInput {
  return {
    placement: 'own-row',
    isComponentInstance: true,
    count: 3,
    scale: 1,
    lastLineWidth: 30,
    countWidth: 20,
    baseAllowance: 93,
    ...overrides
  };
}

describe('eyebrowText', () => {
  it('reads as the count alone, which is what R-Z ruled', () => {
    expect(eyebrowText(3)).toBe('· 3×');
    expect(eyebrowText(1)).toBe('· 1×');
    expect(eyebrowText(140)).toBe('· 140×');
  });

  it('declines to draw a count below one rather than printing `· 0×`', () => {
    // 0 does not mean "used nowhere" — an instance node is itself an instance, so a 0 here means
    // the index has not been built or names a component that is gone. Neither is a sentence to
    // write on somebody's graph.
    expect(eyebrowText(0)).toBeNull();
    expect(eyebrowText(-2)).toBeNull();
    expect(eyebrowText(NaN)).toBeNull();
    expect(eyebrowText(Infinity)).toBeNull();
  });
});

describe('eyebrowIsVisible', () => {
  it('opens at exactly the 75% the zoom readout shows', () => {
    expect(eyebrowIsVisible(0.75)).toBe(true);
    expect(eyebrowIsVisible(0.7499)).toBe(false);
    expect(eyebrowIsVisible(2)).toBe(true);
  });

  it('is expressed against the user-facing scale, not a device-scaled one', () => {
    // 🔴 The trap this pins: `ctx.getTransform().a` is `ratio * scale`, so on a 2× display it
    // reads 1.5 at 75% zoom. A gate fed that number opens at 37.5% zoom on a retina screen and at
    // 75% on an external monitor. The constant is the zoom, so the caller must pass the zoom.
    expect(InstanceEyebrow.minScale).toBe(0.75);
  });
});

describe('eyebrowExtraHeight', () => {
  it('only `own-row` costs height, and only on an instance', () => {
    expect(eyebrowExtraHeight('own-row', true)).toBe(InstanceEyebrow.rowHeight);
    expect(eyebrowExtraHeight('own-row', false)).toBe(0);
    expect(eyebrowExtraHeight('reserve-width', true)).toBe(0);
    expect(eyebrowExtraHeight('inline-if-fits', true)).toBe(0);
    expect(eyebrowExtraHeight('hover-only', true)).toBe(0);
  });

  it('cannot depend on the count or the zoom, because a port that moves for an unseen reason is worse than one that never moves', () => {
    // This is a claim about the SIGNATURE, and that is the strongest form it can take: the
    // function is not given the count or the scale, so no future edit can quietly consult them
    // without changing every caller. `titlebarHeight()` sets every connection anchor on the card.
    expect(eyebrowExtraHeight.length).toBe(2);
  });
});

describe('titleAllowanceFor', () => {
  it('narrows the name only under `reserve-width`', () => {
    expect(titleAllowanceFor('reserve-width', 93, 24)).toBe(93 - 24 - InstanceEyebrow.gap);
    expect(titleAllowanceFor('own-row', 93, 24)).toBe(93);
    expect(titleAllowanceFor('inline-if-fits', 93, 24)).toBe(93);
    expect(titleAllowanceFor('hover-only', 93, 24)).toBe(93);
  });

  it('never returns a negative allowance', () => {
    expect(titleAllowanceFor('reserve-width', 10, 400)).toBe(0);
  });

  it('reserves a fixed three-digit band, so a tenth instance placed elsewhere cannot re-wrap this card', () => {
    // 🔴 The defect this exists to prevent: reserving the REAL count's width means `· 9×` and
    // `· 10×` give the name different allowances, so placing a tenth instance in another component
    // re-wraps this node's name, grows its card and moves its ports — with nothing on screen
    // saying why. The reference string is what the painter measures, not the count.
    expect(InstanceEyebrow.reserveReference).toBe('· 000×');
    const nine = titleAllowanceFor('reserve-width', 93, 24);
    const ten = titleAllowanceFor('reserve-width', 93, 24);
    expect(nine).toBe(ten);
  });
});

describe('eyebrowPlan', () => {
  it('draws nothing on a node that is not a component instance, whatever the placement', () => {
    for (const placement of PLACEMENTS) {
      expect(eyebrowPlan(input({ placement, isComponentInstance: false }))).toEqual({ kind: 'none' });
    }
  });

  it('draws nothing under `hover-only`, which is what makes it the safe default to ship', () => {
    expect(eyebrowPlan(input({ placement: 'hover-only' }))).toEqual({ kind: 'none' });
  });

  it('is silent below 75% zoom under every placement that paints', () => {
    for (const placement of ['own-row', 'reserve-width', 'inline-if-fits'] as EyebrowPlacement[]) {
      expect(eyebrowPlan(input({ placement, scale: 0.5 }))).toEqual({ kind: 'none' });
    }
  });

  it('gives `own-row` a row of its own regardless of how the name wrapped', () => {
    expect(eyebrowPlan(input({ placement: 'own-row', lastLineWidth: 92 }))).toEqual({ kind: 'row', text: '· 3×' });
  });

  it('pins `reserve-width` flush right against the FULL allowance, not the narrowed one', () => {
    // The name was already moved out of the way, so the count's x must not follow the name — a
    // count that drifted with the wrap would be a different distance from the card's edge on
    // every node.
    const plan = eyebrowPlan(input({ placement: 'reserve-width', lastLineWidth: 10, countWidth: 20 }));
    expect(plan).toEqual({ kind: 'inline', text: '· 3×', x: 73 });

    const wrapped = eyebrowPlan(input({ placement: 'reserve-width', lastLineWidth: 60, countWidth: 20 }));
    expect(wrapped).toEqual(plan);
  });

  it('follows the name under `inline-if-fits`, with the gap between them', () => {
    const plan = eyebrowPlan(input({ placement: 'inline-if-fits', lastLineWidth: 30, countWidth: 20 }));
    expect(plan).toEqual({ kind: 'inline', text: '· 3×', x: 30 + InstanceEyebrow.gap });
  });

  it('declines to draw under `inline-if-fits` when the name leaves no room — the majority case, not the edge', () => {
    // 55.3% of unrenamed instance nodes in the corpus land here. A spec that only covered the
    // fitting case would be grading the minority.
    expect(eyebrowPlan(input({ placement: 'inline-if-fits', lastLineWidth: 80, countWidth: 20 }))).toEqual({
      kind: 'none'
    });
  });

  it('treats a count that ends exactly at the allowance as fitting', () => {
    const exact = input({ placement: 'inline-if-fits', lastLineWidth: 69, countWidth: 20, baseAllowance: 93 });
    // 69 + 4 + 20 = 93
    expect(eyebrowPlan(exact)).toEqual({ kind: 'inline', text: '· 3×', x: 73 });

    const oneOver = eyebrowPlan({ ...exact, lastLineWidth: 69.5 });
    expect(oneOver).toEqual({ kind: 'none' });
  });

  it('draws nothing when the count is not drawable, before it ever asks where to put it', () => {
    for (const placement of PLACEMENTS) {
      expect(eyebrowPlan(input({ placement, count: 0 }))).toEqual({ kind: 'none' });
    }
  });
});
