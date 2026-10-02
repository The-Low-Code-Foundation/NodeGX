/**
 * P109 ISL-022 — the wrapped-row warning means a row will overflow.
 *
 * Olive's Island's top bar overflowed a phone (506px at 390, CG-003 §7.2), and `uncollapsible-multi-column` named the
 * right component and the wrong row: it fired on the bar (`brBar`), which wraps correctly, and said nothing about the
 * row of tabs inside it (`brTabs`), which cannot wrap. It also fired on two wrapped rows of 44px colour swatches. The
 * garden's gate pinned all three as expected noise.
 *
 * Richard's ruling (2026-10-02, "Yes, both"): arm B fires only on items frozen at a desktop proportion (a percentage)
 * or wider than a phone's content box; and a new code, `row-cannot-wrap`, names the row that cannot wrap. The shapes
 * below are the garden's own, read off `templates/bot-garden` (ISL-022 §2); the render that confirmed a content-sized
 * wrapping row in a row parent stays one line is `isl022-wrapped-row/` (ISL-022 §8 s3: 566px at 390).
 */

import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { citationFor } from '../../src/editor/src/validation/diagnosticExamples';
import { DiagnosticCode, type Diagnostic } from '../../src/editor/src/validation/diagnostics';
import { checkLayoutInertCombination, type LayoutNode } from '../../src/editor/src/validation/layoutInertCombination';
import { checkResponsiveArrangement, PHONE_WIDTH_PX } from '../../src/editor/src/validation/responsiveArrangement';

const catalog = loadDefaultCatalog();

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });

// ── Arm B: a wrapped row with a gutter over a For Each ────────────────────────────────────────────────

/** `Robot/Card#rcColourRow` as shipped: a full-width wrapped row with a gap, over a For Each of `/Robot/Swatch`. */
const COLOUR_ROW = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  sizeMode: 'contentHeight',
  width: pct(100),
  columnGap: 'var(--space-2)'
};

function grid(itemParameters: Record<string, unknown>, row: Record<string, unknown> = COLOUR_ROW): Diagnostic[] {
  return checkResponsiveArrangement(
    [
      { id: 'rcColourRow', type: 'Group', children: ['rep'], parameters: row },
      { id: 'rep', type: 'For Each', children: [], parameters: { template: '/Robot/Swatch' } }
    ],
    {
      component: '/Robot/Card',
      catalog,
      views: [{ name: '/Robot/Swatch', nodes: [{ id: 'swDot', type: 'Group', parameters: itemParameters }] }]
    }
  ).filter((d) => d.code === DiagnosticCode.UncollapsibleMultiColumn);
}

const fires = (found: Diagnostic[]) => found.map((d) => `${d.location.nodeId}:${d.location.port}`);

describe('ISL-022 — arm B fires on a grid a phone cannot hold, not on small fixed-size items', () => {
  describe('known-firing beside every silence', () => {
    it('the 32%-wide card grid (the reference build’s ProductCard) fires', () => {
      expect(fires(grid({ width: pct(32) }))).toEqual(['rcColourRow:flexWrap']);
    });

    it('an item left at the default width (100%) fires — a percentage, as before', () => {
      expect(fires(grid({}))).toEqual(['rcColourRow:flexWrap']);
    });

    it('a 600px item fires: it is wider than a phone', () => {
      expect(fires(grid({ sizeMode: 'explicit', width: px(600) }))).toEqual(['rcColourRow:flexWrap']);
    });

    it('a pixel width given as a string ("600px") fires the same', () => {
      expect(fires(grid({ sizeMode: 'explicit', width: '600px' }))).toEqual(['rcColourRow:flexWrap']);
    });
  });

  describe('silent: the item has a pixel width a phone can hold, so the row wraps', () => {
    it('the garden’s 44px swatch (`/Robot/Swatch#swDot`, explicit 44 × 44)', () => {
      expect(grid({ sizeMode: 'explicit', width: px(44), height: px(44) })).toEqual([]);
    });

    it('Rocket School’s 132px hangar tiles and 150px profile cards (GAM-022 kept these firing; the ruling reverses it)', () => {
      expect(grid({ sizeMode: 'explicit', width: px(132) })).toEqual([]);
      expect(grid({ sizeMode: 'contentHeight', width: px(150) })).toEqual([]);
    });

    it('Puppy test 3’s 340px card: one per line on a phone', () => {
      expect(grid({ sizeMode: 'contentHeight', width: px(340) })).toEqual([]);
    });

    it(`an item exactly the phone’s width (${PHONE_WIDTH_PX}px) fits`, () => {
      expect(grid({ sizeMode: 'explicit', width: px(PHONE_WIDTH_PX) })).toEqual([]);
      expect(fires(grid({ sizeMode: 'explicit', width: px(PHONE_WIDTH_PX + 1) }))).toEqual(['rcColourRow:flexWrap']);
    });
  });

  describe('the phone’s content box is the row’s own: 390px less its horizontal padding', () => {
    it('a 380px item fits a row with no padding, and does not fit one padded 8px each side (374px)', () => {
      expect(grid({ sizeMode: 'explicit', width: px(380) })).toEqual([]);
      const padded = { ...COLOUR_ROW, paddingLeft: px(8), paddingRight: px(8) };
      expect(fires(grid({ sizeMode: 'explicit', width: px(380) }, padded))).toEqual(['rcColourRow:flexWrap']);
    });

    it('a token padding counts as nothing (the quiet direction)', () => {
      const tokenPadded = { ...COLOUR_ROW, paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' };
      expect(grid({ sizeMode: 'explicit', width: px(380) }, tokenPadded)).toEqual([]);
    });
  });

  describe('unknowable widths abstain', () => {
    it('a token width', () => {
      expect(grid({ sizeMode: 'explicit', width: 'var(--card-width)' })).toEqual([]);
    });

    it('a vw width', () => {
      expect(grid({ sizeMode: 'explicit', width: { value: 90, unit: 'vw' } })).toEqual([]);
    });
  });
});

// ── Arm A: a band of tracks ───────────────────────────────────────────────────────────────────────────

/** A track of three nodes (a Group holding two Texts), sized as given. */
function track(id: string, parameters: Record<string, unknown>): LayoutNode[] {
  return [
    { id, type: 'Group', children: [`${id}a`, `${id}b`], parameters },
    { id: `${id}a`, type: 'Text', parameters: { text: 'x' } },
    { id: `${id}b`, type: 'Text', parameters: { text: 'y' } }
  ];
}

/** `Garden/Top bar#brBar` as shipped: wrapping, contentHeight, full width, five clusters each `contentSize`. */
function bar(row: Record<string, unknown>, ...trackParameters: Record<string, unknown>[]): Diagnostic[] {
  const tracks = trackParameters.map((p, i) => track(`t${i}`, p));
  return checkResponsiveArrangement(
    [{ id: 'brBar', type: 'Group', children: tracks.map((t) => t[0].id), parameters: row }, ...tracks.flat()],
    { component: '/Garden/Top bar', catalog }
  ).filter((d) => d.code === DiagnosticCode.UncollapsibleMultiColumn);
}

const BAR = { flexDirection: 'row', flexWrap: 'wrap', sizeMode: 'contentHeight', width: pct(100) };
const CLUSTER = { flexDirection: 'row', sizeMode: 'contentSize' };

describe('ISL-022 — arm A judges the tracks of a wrapped row, not only the row', () => {
  it('the garden’s bar: a wrapped row of five content-sized clusters wraps as clusters, and is silent', () => {
    expect(bar(BAR, CLUSTER, CLUSTER, CLUSTER, CLUSTER, CLUSTER)).toEqual([]);
  });

  it('known-firing: the same five clusters in a row that does NOT wrap still fire', () => {
    const { flexWrap: _, ...unwrapped } = BAR;
    expect(fires(bar(unwrapped, CLUSTER, CLUSTER, CLUSTER, CLUSTER, CLUSTER))).toEqual(['brBar:flexDirection']);
  });

  it('a wrapped row with ONE track given the page’s width still fires: it is a band, not a row of clusters', () => {
    expect(fires(bar(BAR, CLUSTER, CLUSTER, { flexDirection: 'row', width: pct(100) }))).toEqual(['brBar:flexDirection']);
  });

  it('a track whose sizeMode is wired is not known to be content-sized, and the row still fires', () => {
    const tracks = [track('t0', CLUSTER), track('t1', CLUSTER), track('t2', CLUSTER)];
    const found = checkResponsiveArrangement(
      [{ id: 'brBar', type: 'Group', children: ['t0', 't1', 't2'], parameters: BAR }, ...tracks.flat()],
      { component: '/Garden/Top bar', catalog, connectedInputs: new Set(['t2::sizeMode']) }
    );
    expect(fires(found)).toEqual(['brBar:flexDirection']);
  });
});

// ── row-cannot-wrap ───────────────────────────────────────────────────────────────────────────────────

/** `Garden/Top bar#brTabs` as shipped: wrapping, contentSize, five `/Garden/Tab` instances, inside the bar. */
const TABS = { flexDirection: 'row', flexWrap: 'wrap', sizeMode: 'contentSize', columnGap: 'var(--space-1)' };

function tabsIn(parent: Record<string, unknown>, tabs: Record<string, unknown> = TABS, connected?: Set<string>): Diagnostic[] {
  const tabIds = ['tab1', 'tab2', 'tab3', 'tab4', 'tab5'];
  return checkLayoutInertCombination(
    [
      { id: 'brBar', type: 'Group', label: 'The bar', children: ['brTabs'], parameters: parent },
      { id: 'brTabs', type: 'Group', label: 'The five screens', children: tabIds, parameters: tabs },
      ...tabIds.map((id) => ({ id, type: '/Garden/Tab', parameters: {} }))
    ],
    { component: '/Garden/Top bar', catalog, connectedInputs: connected }
  ).filter((d) => d.code === DiagnosticCode.RowCannotWrap);
}

describe('ISL-022 — row-cannot-wrap names the row that cannot wrap', () => {
  it('fires on brTabs, by node id, on its sizeMode, with the exit in the same sentence', () => {
    const found = tabsIn(BAR);
    expect(found.map((d) => ({ node: d.location.nodeId, port: d.location.port, severity: d.severity }))).toEqual([
      { node: 'brTabs', port: 'sizeMode', severity: 'warning' }
    ]);
    expect(found[0].message).toMatch(/sizeMode "contentSize"/);
    expect(found[0].message).toMatch(/"The bar"/);
    expect(found[0].message).toMatch(/zooms the whole page out/);
    expect(found[0].message).toMatch(/maxWidth 100%/);
    expect(found[0].message).toMatch(/sizeMode "contentHeight" with width 100%/);
    expect(found[0].suggestion).toBe('maxWidth: 100%');
  });

  it('contentWidth is the same defect', () => {
    expect(tabsIn(BAR, { ...TABS, sizeMode: 'contentWidth' }).map((d) => d.location.nodeId)).toEqual(['brTabs']);
  });

  it('both measured exits are silent: maxWidth 100% (still content-sized), or contentHeight at 100%', () => {
    expect(tabsIn(BAR, { ...TABS, maxWidth: pct(100) })).toEqual([]);
    expect(tabsIn(BAR, { ...TABS, sizeMode: 'contentHeight', width: pct(100) })).toEqual([]);
  });

  it('any authored or wired maxWidth abstains: the author bounded it, and whether it binds is not knowable here', () => {
    expect(tabsIn(BAR, { ...TABS, maxWidth: px(800) })).toEqual([]);
    expect(tabsIn(BAR, TABS, new Set(['brTabs::maxWidth']))).toEqual([]);
  });

  it('inline styleCss that sizes it abstains (todo-list’s header: "max-width: 100%;"); styleCss that does not, fires', () => {
    expect(tabsIn(BAR, { ...TABS, styleCss: 'max-width: 100%;' })).toEqual([]);
    expect(tabsIn(BAR, { ...TABS, styleCss: 'flex: 1 1 auto;' })).toEqual([]);
    expect(tabsIn(BAR, { ...TABS, styleCss: 'border-radius: 8px;' }).map((d) => d.location.nodeId)).toEqual(['brTabs']);
  });

  it('🔴 a cssClassName is not an abstention: the garden’s brTabs carries `bg-tabs`, rescued only by the stylesheet', () => {
    expect(tabsIn(BAR, { ...TABS, cssClassName: 'bg-tabs' }).map((d) => d.location.nodeId)).toEqual(['brTabs']);
  });

  it('🔴 AC3(ii) — in a COLUMN parent a content-sized wrapping row can wrap, and is silent (the recipe library’s button rows)', () => {
    expect(tabsIn({ flexDirection: 'column' })).toEqual([]);
    expect(tabsIn({})).toEqual([]); // an unset Group stacks downward
  });

  it('a row that does not wrap is not this code (it was never asked to wrap)', () => {
    const { flexWrap: _, ...unwrapped } = TABS;
    expect(tabsIn(BAR, unwrapped)).toEqual([]);
  });

  it('a column that wraps is not this code', () => {
    expect(tabsIn(BAR, { ...TABS, flexDirection: 'column' })).toEqual([]);
  });

  it('out of flow abstains: an absolute or fixed Group is not held at one line by the row', () => {
    expect(tabsIn(BAR, { ...TABS, position: 'absolute' })).toEqual([]);
    expect(tabsIn(BAR, { ...TABS, position: 'fixed' })).toEqual([]);
  });

  it('unknowable abstains: a wired sizeMode, flexWrap or flexDirection on it, or a wired flexDirection on the parent', () => {
    for (const port of ['brTabs::sizeMode', 'brTabs::flexWrap', 'brTabs::flexDirection', 'brTabs::position', 'brBar::flexDirection']) {
      expect({ port, found: tabsIn(BAR, TABS, new Set([port])) }).toEqual({ port, found: [] });
    }
  });

  it('a component’s root has no parent in this graph, and abstains', () => {
    const found = checkLayoutInertCombination(
      [
        { id: 'root', type: 'Group', children: ['a', 'b', 'c'], parameters: TABS },
        { id: 'a', type: 'Text', parameters: { text: 'a' } },
        { id: 'b', type: 'Text', parameters: { text: 'b' } },
        { id: 'c', type: 'Text', parameters: { text: 'c' } }
      ],
      { component: '/Tabs', catalog }
    ).filter((d) => d.code === DiagnosticCode.RowCannotWrap);
    expect(found).toEqual([]);
  });

  it('a pair is a pair: two items are silent, three fire (the census’s logo-and-name and two-segment rows)', () => {
    const row = (n: number, child: (i: number) => LayoutNode) =>
      checkLayoutInertCombination(
        [
          { id: 'brBar', type: 'Group', children: ['r'], parameters: BAR },
          { id: 'r', type: 'Group', children: [...Array(n).keys()].map((i) => `c${i}`), parameters: TABS },
          ...[...Array(n).keys()].map(child)
        ],
        { component: '/Garden/Top bar', catalog }
      ).filter((d) => d.code === DiagnosticCode.RowCannotWrap);
    const seg = (i: number): LayoutNode => ({ id: `c${i}`, type: '/Garden/Seg', parameters: {} });
    expect(row(2, seg)).toEqual([]);
    expect(row(3, seg).map((d) => d.location.nodeId)).toEqual(['r']);
    // Non-visual children are not items.
    const logic = (i: number): LayoutNode =>
      i < 2 ? seg(i) : { id: `c${i}`, type: 'Variable2', parameters: {} };
    expect(row(3, logic)).toEqual([]);
  });

  it('a For Each draws as many items as its data: one For Each child is enough', () => {
    const found = checkLayoutInertCombination(
      [
        { id: 'brBar', type: 'Group', children: ['r'], parameters: BAR },
        { id: 'r', type: 'Group', children: ['rep'], parameters: TABS },
        { id: 'rep', type: 'For Each', parameters: { template: '/Tag' } }
      ],
      { component: '/Tags', catalog }
    ).filter((d) => d.code === DiagnosticCode.RowCannotWrap);
    expect(found.map((d) => d.location.nodeId)).toEqual(['r']);
  });

  it('a Button parent lays out as a row too', () => {
    const found = checkLayoutInertCombination(
      [
        { id: 'btn', type: 'net.noodl.controls.button', children: ['brTabs'], parameters: {} },
        { id: 'brTabs', type: 'Group', children: ['a', 'b', 'c'], parameters: TABS },
        { id: 'a', type: 'Text', parameters: { text: 'a' } },
        { id: 'b', type: 'Text', parameters: { text: 'b' } },
        { id: 'c', type: 'Text', parameters: { text: 'c' } }
      ],
      { component: '/X', catalog }
    ).filter((d) => d.code === DiagnosticCode.RowCannotWrap);
    expect(found.map((d) => d.location.nodeId)).toEqual(['brTabs']);
  });

  it('the rejection carries the recipe that shows the fix', () => {
    const [d] = tabsIn(BAR);
    expect(citationFor(d)?.examples).toEqual(['layout-wrap-a-row-of-content-width-items']);
  });
});
