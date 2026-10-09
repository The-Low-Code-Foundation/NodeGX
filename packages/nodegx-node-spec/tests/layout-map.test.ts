/**
 * NSP-016 AC4 step 2 — the mapping (src/layout-map.ts). Two halves:
 *  1. THE CHECK (R18): every `layout-shared` input of a visual spec carries a `layout` role; a `layout-not-shared` or
 *     `web-only` input never does; every role a spec carries is the role the table gives that name; and every layout
 *     input the research classed (visual-census.json) is either mapped or listed by name here as left out.
 *  2. `layoutOf` — a placed node's settings to the model, as the runtime's `Layout.size` / `align` reads them.
 */

import * as fs from 'fs';
import * as path from 'path';

import { LAYOUT_ROLES, layoutOf, specs, UNMAPPED_CLASSES } from '../src';
import type { InputDecl, Portability } from '../src';

const census = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../dev-docs/tasks/phase-107-the-node-says-what-it-does/visual-census.json'), 'utf8')
) as { t5: string[]; ports: Array<{ name: string; class: Portability }> };

/** The `layout-expressible` inputs the model leaves out, and why — `layoutOf` lists them when they are set. */
const EXPRESSIBLE_LEFT_OUT: Record<string, string> = {
  scrollSnapEnabled: 'where a scroll comes to rest, not a box at rest',
  scrollSnapToEveryItem: 'where a scroll comes to rest, not a box at rest',
  mediumBreakpoint: "the Columns' own layout (its layoutString is not shared)",
  mediumLayout: "the Columns' own layout (its layoutString is not shared)",
  smallBreakpoint: "the Columns' own layout (its layoutString is not shared)",
  smallLayout: "the Columns' own layout (its layoutString is not shared)"
};

type Decl = InputDecl & { portability?: Portability; layout?: string };
const visual = Object.values(specs).filter((s) => Object.values(s.inputs).some((d) => (d as Decl).portability));

describe('the check — every shared layout input is mapped, nothing unshared is', () => {
  it('there are visual specs to check', () => {
    expect(visual.length).toBeGreaterThanOrEqual(17);
  });

  const rows = visual.flatMap((s) => Object.entries(s.inputs).map(([name, d]) => [s.type, name, d as Decl] as const));

  it.each(rows.filter(([, , d]) => d.portability === 'layout-shared'))('%s %s (layout-shared) has a role', (_t, _name, d) => {
    expect(d.layout).toBeDefined();
  });

  it.each(rows.filter(([, , d]) => d.portability !== undefined && UNMAPPED_CLASSES.includes(d.portability)))(
    '%s %s (not shared or web-only) has no role',
    (_t, _name, d) => {
      expect(d.layout).toBeUndefined();
    }
  );

  it.each(rows.filter(([, , d]) => d.layout !== undefined))('%s %s carries the table\'s role', (_t, name, d) => {
    expect(d.layout).toBe(LAYOUT_ROLES[name]);
  });

  it('every layout input the research classed is mapped, or left out by name (and only an expressible one)', () => {
    const layoutPorts = census.ports.filter((p) => p.class.startsWith('layout-'));
    expect(layoutPorts.length).toBe(55);
    const unaccounted = layoutPorts.filter(
      (p) => !LAYOUT_ROLES[p.name] && p.class !== 'layout-not-shared' && !EXPRESSIBLE_LEFT_OUT[p.name]
    );
    expect(unaccounted.map((p) => p.name)).toEqual([]);
    const leftOutButShared = Object.keys(EXPRESSIBLE_LEFT_OUT).filter(
      (n) => layoutPorts.find((p) => p.name === n)?.class !== 'layout-expressible'
    );
    expect(leftOutButShared).toEqual([]);
    const notSharedMapped = layoutPorts.filter((p) => p.class === 'layout-not-shared' && LAYOUT_ROLES[p.name]);
    expect(notSharedMapped.map((p) => p.name)).toEqual([]);
  });
});

describe('layoutOf — the runtime\'s rules, read through the roles', () => {
  const Group = specs.Group;
  const Text = specs.Text;
  const Circle = specs.Circle;

  it('a Group with nothing set, in a column: full width across, a 100% share down, a column of its own', () => {
    const got = layoutOf(Group, {}, { parentAxis: 'column' });
    expect(got.present).toBe(true);
    expect(got.child.width).toEqual({ kind: 'length', length: { percent: 100 } });
    expect(got.child.height).toEqual({ kind: 'fill', weight: 100, basis: { percent: 100 } });
    expect(got.parent).toMatchObject({ axis: 'column', mainAlign: 'start', crossAlign: 'start', gap: 0, clip: false, scroll: false });
    expect(got.outside).toEqual([]);
  });

  it('in a row the share moves to the width', () => {
    const got = layoutOf(Group, { width: { value: 30, unit: '%' } }, { parentAxis: 'row' });
    expect(got.child.width).toEqual({ kind: 'fill', weight: 30, basis: { percent: 30 } });
    expect(got.child.height).toEqual({ kind: 'length', length: { percent: 100 } });
  });

  it('a percent marked fixed stays a percent on the stacking axis', () => {
    expect(layoutOf(Group, { width: { value: 30, unit: '%', isFixed: true } }, { parentAxis: 'row' }).child.width).toEqual({
      kind: 'length',
      length: { percent: 30 }
    });
  });

  it('a cross percent is less the node\'s own margins (calc)', () => {
    const got = layoutOf(Group, { marginLeft: 10, marginRight: { value: 6, unit: 'px' } }, { parentAxis: 'column' });
    expect(got.child.width).toEqual({ kind: 'length', length: { percent: 100, px: -16 } });
    expect(got.child.margin).toEqual({ top: 0, right: 6, bottom: 0, left: 10 });
  });

  it('with no parent layout a percent is a plain percent on both axes', () => {
    const got = layoutOf(Group, {}, {});
    expect(got.child.width).toEqual({ kind: 'length', length: { percent: 100 } });
    expect(got.child.height).toEqual({ kind: 'length', length: { percent: 100 } });
  });

  const sizeModes: Array<[string, Record<string, unknown>, string, string]> = [
    ['explicit assigns both', { sizeMode: 'explicit', width: { value: 120, unit: 'px' }, height: { value: 40, unit: 'px' } }, 'length', 'length'],
    ['contentHeight assigns the width', { sizeMode: 'contentHeight', width: { value: 120, unit: 'px' } }, 'length', 'hug'],
    ['contentWidth assigns the height', { sizeMode: 'contentWidth', height: { value: 40, unit: 'px' } }, 'hug', 'length'],
    ['contentSize hugs both', { sizeMode: 'contentSize', width: { value: 120, unit: 'px' } }, 'hug', 'hug']
  ];
  it.each(sizeModes)('Size Mode: %s', (_n, params, w, h) => {
    const got = layoutOf(Group, params, { parentAxis: 'column' });
    expect(got.child.width.kind).toBe(w);
    expect(got.child.height.kind).toBe(h);
  });

  it('a Text\'s own default Size Mode (Content Height) hugs its height', () => {
    expect(layoutOf(Text, {}, { parentAxis: 'column' }).child.height).toEqual({ kind: 'hug' });
  });

  it('a Circle\'s Size is both its width and its height, in px', () => {
    const got = layoutOf(Circle, { size: '48' }, { parentAxis: 'row' });
    expect(got.child.width).toEqual({ kind: 'length', length: { px: 48 } });
    expect(got.child.height).toEqual({ kind: 'length', length: { px: 48 } });
  });

  const aligns: Array<[string, 'row' | 'column', Record<string, unknown>, object]> = [
    ['Align X center in a column is its own cross alignment', 'column', { alignX: 'center' }, { alignSelf: 'center' }],
    ['Align Y bottom in a column is a spacer before it', 'column', { alignY: 'bottom' }, { spacer: { before: true } }],
    ['Align Y top in a column is a spacer after it', 'column', { alignY: 'top' }, { spacer: { after: true } }],
    ['Align Y center in a column is a spacer each side', 'column', { alignY: 'center' }, { spacer: { before: true, after: true } }],
    ['a set margin takes the spacer\'s side', 'column', { alignY: 'center', marginTop: 4 }, { spacer: { before: false, after: true } }],
    ['Align X right in a row is a spacer before it', 'row', { alignX: 'right' }, { spacer: { before: true } }],
    ['Align Y bottom in a row is its own cross alignment', 'row', { alignY: 'bottom' }, { alignSelf: 'end' }]
  ];
  it.each(aligns)('%s', (_n, parentAxis, params, want) => {
    expect(layoutOf(Group, params, { parentAxis }).child).toMatchObject(want);
  });

  it('Position Absolute is an overlay, top-left unless aligned', () => {
    expect(layoutOf(Group, { position: 'absolute' }, { parentAxis: 'column' }).child).toMatchObject({
      place: 'overlay',
      overlayAlign: { x: 'start', y: 'start' }
    });
    expect(layoutOf(Group, { position: 'absolute', alignX: 'right', alignY: 'center' }, { parentAxis: 'row' }).child).toMatchObject({
      overlayAlign: { x: 'end', y: 'center' }
    });
  });

  it('every child of a Layout None parent is an overlay, its percent less its margins', () => {
    const got = layoutOf(Group, { marginLeft: 8 }, { parentAxis: 'overlay' });
    expect(got.child.place).toBe('overlay');
    expect(got.child.width).toEqual({ kind: 'length', length: { percent: 100, px: -8 } });
  });

  it('the Group as a parent: axis, alignment, the gap on its axis, padding from tokens, a border', () => {
    const tokens: Record<string, number> = { '--space-4': 16, '--space-2': 8, '--border-1': 1 };
    const got = layoutOf(
      Group,
      {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: 'var(--space-2)',
        rowGap: 99,
        paddingLeft: 'var(--space-4)',
        paddingTop: '12px',
        borderStyle: 'solid',
        borderWidth: 'var(--border-1)',
        borderLeftWidth: 4,
        clip: true
      },
      { parentAxis: 'column', token: (n) => tokens[n] }
    );
    expect(got.parent).toEqual({
      axis: 'row',
      mainAlign: 'space-between',
      crossAlign: 'center',
      gap: 8,
      padding: { top: 12, right: 0, bottom: 0, left: 16 },
      border: { top: 1, right: 1, bottom: 1, left: 4 },
      clip: true,
      scroll: false
    });
  });

  it('a border with no style is no border', () => {
    expect(layoutOf(Group, { borderWidth: 3 }, { parentAxis: 'column' }).parent?.border).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('Layout None is an overlay parent; Enable Scroll scrolls', () => {
    expect(layoutOf(Group, { flexDirection: 'none' }, {}).parent?.axis).toBe('overlay');
    expect(layoutOf(Group, { scrollEnabled: true }, {}).parent?.scroll).toBe(true);
  });

  it('a transform: translate, a rotation stored with its unit, a scale of 1 is none, the origin', () => {
    const got = layoutOf(Group, { transformX: 10, transformY: { value: 50, unit: '%' }, transformRotation: { value: 45, unit: 'deg' }, transformScale: 1, transformOriginX: { value: 0, unit: '%' } }, { parentAxis: 'column' });
    expect(got.child.transform).toEqual({ x: { px: 10 }, y: { percent: 50 }, rotation: 45, originX: { percent: 0 }, originY: { percent: 50 } });
    expect(layoutOf(Group, { transformScale: 1 }, { parentAxis: 'column' }).child.transform).toBeUndefined();
  });

  it('min and max default to percent; vw is px with a viewport', () => {
    const got = layoutOf(Group, { minWidth: 50, maxWidth: { value: 1200, unit: 'px' }, maxHeight: { value: 50, unit: 'vh' } }, { parentAxis: 'column', viewport: { width: 400, height: 800 } });
    expect(got.child).toMatchObject({ minWidth: { percent: 50 }, maxWidth: { px: 1200 }, maxHeight: { px: 400 } });
  });

  it('Mounted off is no box', () => {
    expect(layoutOf(Group, { mounted: false }, { parentAxis: 'column' }).present).toBe(false);
  });

  const outside: Array<[string, Record<string, unknown>, RegExp]> = [
    ['a wrapping row', { flexDirection: 'row', flexWrap: 'wrap' }, /^flexWrap \(layout-not-shared\) is set$/],
    ['a stylesheet class', { cssClassName: 'card' }, /^cssClassName \(web-only\) is set$/],
    ['an em', { paddingLeft: '2em' }, /^paddingLeft: the unit "em" is not in the model$/],
    ['a token it was not given', { rowGap: 'var(--space-9)' }, /^rowGap: the token --space-9 has no value here$/],
    ['a vh with no viewport', { height: { value: 50, unit: 'vh' } }, /^height: the unit "vh" is not in the model without a viewport$/],
    ['position fixed', { position: 'fixed' }, /^position is fixed$/],
    ['a percent margin', { marginTop: { value: 5, unit: '%' } }, /^marginTop in percent is not in the model$/]
  ];
  it.each(outside)('says what it cannot model: %s', (_n, params, want) => {
    const got = layoutOf(Group, params, { parentAxis: 'column' });
    expect(got.outside.some((o) => want.test(o))).toBe(true);
  });
});
