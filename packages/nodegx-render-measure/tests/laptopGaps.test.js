/**
 * P112-OWN019-LAPTOPGAPS (R39, Richard 2026-10-14) — `row-gap` and `alignment-drift`, the summarise half.
 *
 * Richard on RL1's laptop page: "funny justification choices and spacing" — a feature number in a Columns "1 4" row
 * given a fifth of the page; L1 (s4) left its pricing toggle and price ~256 px off the centred heading. Every page
 * passed every check. The in-page half (ink per child, measured at desktop width) was graded on the real pages, the
 * OWN-019 gallery (s5): RL1 3 row gaps + 2 drifts, L1 3 row gaps + the pricing drift, GL1 2 drifts, the nine quiz
 * apps none. This suite holds the judgement on those measured numbers, with the known-silent rows beside them.
 */
const mod = require('../src/index.js');

// RL1's desktop viewport exactly as render_report measured it (s5, `fixtures/rl1-desktop-viewport.json`); each case
// swaps in the layout numbers under test.
const MEASURED = require('./fixtures/rl1-desktop-viewport.json');
const desktop = (layout) => ({ ...MEASURED, layout });
const codes = (viewports) =>
  mod
    .summarise(viewports)
    .findings.filter((f) => f.code === mod.RenderFinding.RowGap || f.code === mod.RenderFinding.AlignmentDrift)
    .map((f) => ({ code: f.code, viewport: f.viewport, severity: f.severity, msg: f.message.slice(0, 40) }));

// RL1's measured rows (s5), and the rows on the same page that must stay quiet.
const RL1 = {
  rowGaps: [
    { cls: 'nav', gap: 899, rowWidth: 1152, tallest: 22, left: 'Driftwood', right: 'Waitlist open' },
    { cls: 'columns-container', gap: 217, rowWidth: 1176, tallest: 113, left: '01', right: 'Plan the week in one sitting' },
    { cls: 'faq', gap: 886, rowWidth: 1152, tallest: 26, left: 'When does Driftwood launch?', right: '+' }
  ],
  drifts: [{ cls: 'pricing', offBy: -547, sectionWidth: 1152, text: 'Pricing', centredText: 'One price. No tiers.' }]
};

describe('P112-OWN019-LAPTOPGAPS — row-gap and alignment-drift', () => {
  it("🔴 RL1's number row and its eyebrow are named; its nav bar and FAQ '+' rows are not", () => {
    expect(codes({ desktop: desktop(RL1) })).toEqual([
      { code: 'row-gap', viewport: 'desktop', severity: 'warning', msg: '"01" and "Plan the week in one sitting" ' },
      { code: 'alignment-drift', viewport: 'desktop', severity: 'warning', msg: 'This section centres "One price. No tier' }
    ]);
  });

  it('a gap under an eighth of its row is a layout, not a hole (L1 hero: ~100 px beside its card)', () => {
    expect(codes({ desktop: desktop({ rowGaps: [{ cls: 'hero', gap: 160, rowWidth: 1400, tallest: 300, left: 'Make space', right: 'This week' }], drifts: [] }) })).toEqual([]);
  });

  it("a drawing is not a row: RL3's hero scene (a log at left, a dot at the right edge, no words) says nothing", () => {
    expect(codes({ desktop: desktop({ rowGaps: [{ cls: 'scene', gap: 473, rowWidth: 758, tallest: 60, left: '', right: '' }], drifts: [] }) })).toEqual([]);
  });

  it('only on a laptop: the same numbers at phone width say nothing', () => {
    expect(codes({ phone: { ...desktop(RL1), requested: { width: 390, height: 844 } } })).toEqual([]);
  });

  it('three of each at most, and one finding per pair', () => {
    const many = { rowGaps: Array.from({ length: 6 }, (_, i) => ({ cls: 'r', gap: 300, rowWidth: 1200, tallest: 90, left: `n${i}`, right: 't' })), drifts: [] };
    many.rowGaps.push({ ...many.rowGaps[0] });
    expect(codes({ desktop: desktop(many) })).toHaveLength(3);
  });

  it('a page measured before LAPTOPGAPS (no layout block) is read as before', () => {
    expect(codes({ desktop: desktop(undefined) })).toEqual([]);
  });
});
