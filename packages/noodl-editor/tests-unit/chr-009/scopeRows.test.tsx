/**
 * CHR-009 slice 7 — the `Border Style` / `Corner Radius` scope pickers as rows of the label column.
 *
 * The strip this replaces showed only which tab was open. A side holding its own value (a TopLeft
 * radius, a Left border) was invisible until its tab was opened, while `all` read `0` over a corner
 * that was visibly rounded — so the per-side mark is graded first.
 */
import React from 'react';

import { PropertyTabs } from '../../src/editor/src/views/panels/propertyeditor/components/PropertyTabs';
import {
  SCOPE_TAB_ORDER,
  ScopeTabView,
  scopeRowOf
} from '../../src/editor/src/views/panels/propertyeditor/model/scopeRows';
import { RenderedNode, byClass, render, text, walk } from '../support/renderElements';

// The runtime's arrival order (`node-shared-port-definitions.ts` `defineBorderTab` / `defineCornerTab`).
const BORDER_TABS = ['borders-all', 'borders-left', 'borders-top', 'borders-right', 'borders-bottom'];
const CORNER_TABS = ['corners-all', 'corners-top-left', 'corners-top-right', 'corners-bottom-right', 'corners-bottom-left'];

const BORDER_VIEWS: ScopeTabView[] = [
  ['borders-all', ''],
  ['borders-left', 'Left'],
  ['borders-top', 'Top'],
  ['borders-right', 'Right'],
  ['borders-bottom', 'Bottom']
].flatMap(([tab, side]) =>
  ['Style', 'Width', 'Color'].map((part) => ({ tab, portName: `border${side}${part}` }))
);
const CORNER_VIEWS: ScopeTabView[] = [
  ['corners-all', ''],
  ['corners-top-left', 'TopLeft'],
  ['corners-top-right', 'TopRight'],
  ['corners-bottom-right', 'BottomRight'],
  ['corners-bottom-left', 'BottomLeft']
].map(([tab, corner]) => ({ tab, portName: `border${corner}Radius` }));

describe('CHR-009 — scope rows (model)', () => {
  it('marks exactly the sides whose own ports hold a value', () => {
    const row = scopeRowOf('corners', CORNER_TABS, CORNER_VIEWS, 'corners-all', { borderTopLeftRadius: 8 });
    expect(row.segments.filter((s) => s.isSet).map((s) => s.tab)).toEqual(['corners-top-left']);

    const borders = scopeRowOf('border-styles', BORDER_TABS, BORDER_VIEWS, 'borders-all', {
      borderColor: '#ff0000',
      borderLeftWidth: 4
    });
    expect(borders.segments.filter((s) => s.isSet).map((s) => s.tab)).toEqual(['borders-all', 'borders-left']);
  });

  it('does not mark a side whose value is unset, even when another side is set', () => {
    const row = scopeRowOf('border-styles', BORDER_TABS, BORDER_VIEWS, 'borders-all', {
      borderLeftStyle: undefined,
      borderRightStyle: 'solid'
    });
    expect(row.segments.find((s) => s.tab === 'borders-left')!.isSet).toBe(false);
    expect(row.segments.find((s) => s.tab === 'borders-right')!.isSet).toBe(true);
  });

  it('orders the segments clockwise from the top, all first', () => {
    expect(scopeRowOf('border-styles', BORDER_TABS, BORDER_VIEWS, 'borders-all', {}).segments.map((s) => s.tab)).toEqual([
      'borders-all',
      'borders-top',
      'borders-right',
      'borders-bottom',
      'borders-left'
    ]);
    expect(scopeRowOf('corners', CORNER_TABS, CORNER_VIEWS, 'corners-all', {}).segments.map((s) => s.tab)).toEqual([
      'corners-all',
      'corners-top-left',
      'corners-top-right',
      'corners-bottom-right',
      'corners-bottom-left'
    ]);
  });

  it('keeps an unknown tab, after the known ones, drawn as its name', () => {
    const row = scopeRowOf('borders-x', ['mystery', 'borders-top'], [], 'mystery', {});
    expect(row.label).toBe('borders-x');
    expect(row.segments.map((s) => s.tab)).toEqual(['borders-top', 'mystery']);
    expect(row.segments[1]).toMatchObject({ glyph: null, title: 'mystery', pressed: true });
  });

  it('labels the rows and presses the selected tab only', () => {
    const row = scopeRowOf('corners', CORNER_TABS, CORNER_VIEWS, 'corners-bottom-left', {});
    expect(row.label).toBe('Corner');
    expect(scopeRowOf('border-styles', BORDER_TABS, BORDER_VIEWS, 'borders-all', {}).label).toBe('Edge');
    expect(row.segments.filter((s) => s.pressed).map((s) => s.tab)).toEqual(['corners-bottom-left']);
  });

  it('draws every known tab as a 14px currentColor glyph', () => {
    for (const tab of SCOPE_TAB_ORDER) {
      const group = tab.startsWith('borders') ? 'border-styles' : 'corners';
      const { glyph } = scopeRowOf(group, [tab], [], tab, {}).segments[0];
      expect(glyph).toContain('width="14" height="14"');
      expect(glyph).toContain('stroke="currentColor"');
      expect(glyph).not.toContain('white');
    }
  });
});

function buttons(tree: RenderedNode | null): RenderedNode[] {
  return walk(tree).filter((n) => n.type === 'button');
}

describe('CHR-009 — scope rows (component)', () => {
  it('draws a labelled row, a segment per tab, the mark on a set side, and no reset dot', () => {
    const row = scopeRowOf('corners', CORNER_TABS, CORNER_VIEWS, 'corners-all', { borderBottomRightRadius: '50%' });
    const tree = render(<PropertyTabs row={row} onTabClicked={() => undefined} />);

    expect(text(tree)).toContain('Corner');
    expect(buttons(tree).map((b) => b.props['data-tab'])).toEqual(row.segments.map((s) => s.tab));
    expect(buttons(tree).filter((b) => b.props['aria-pressed']).map((b) => b.props['data-tab'])).toEqual(['corners-all']);
    expect(byClass(tree, 'SetMark')).toHaveLength(1);
    expect(buttons(tree).filter((b) => b.props['data-set'] === 'true').map((b) => b.props['data-tab'])).toEqual([
      'corners-bottom-right'
    ]);
    expect(byClass(tree, 'ResetDot')).toHaveLength(0);
  });

  it('reports the tab a press picks', () => {
    const picked: string[] = [];
    const row = scopeRowOf('border-styles', BORDER_TABS, BORDER_VIEWS, 'borders-all', {});
    const tree = render(<PropertyTabs row={row} onTabClicked={(t) => picked.push(t)} />);
    for (const b of buttons(tree)) (b.props.onClick as () => void)();
    expect(picked).toEqual(['borders-all', 'borders-top', 'borders-right', 'borders-bottom', 'borders-left']);
  });
});
