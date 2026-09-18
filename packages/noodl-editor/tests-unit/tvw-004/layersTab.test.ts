/**
 * TVW-004 AC5 — which tab opens, for each of the four things the canvas can be showing.
 */

import {
  defaultTabFor,
  flipTab,
  PANEL_TITLE,
  TAB_LABEL,
  tabSubjectFor
} from '../../src/editor/src/views/panels/ComponentsPanelNew/layersTab';
import type { TreeNode } from '../../src/editor/src/views/panels/ComponentsPanelNew/types';

describe('TVW-004 — the tab that opens', () => {
  it('opens Layers on a page and on the home component', () => {
    expect(defaultTabFor({ kind: 'page', isPlaced: false })).toBe('layers');
    expect(defaultTabFor({ kind: 'home', isPlaced: false })).toBe('layers');
  });

  it('opens Layers on a placed visual component and Components on an unplaced one', () => {
    expect(defaultTabFor({ kind: 'visual', isPlaced: true })).toBe('layers');
    expect(defaultTabFor({ kind: 'visual', isPlaced: false })).toBe('components');
  });

  it('opens Components on logic, on a cloud function and on a component it cannot classify', () => {
    // `componentKind` has no 'logic' — a component with no visual root lands on 'component',
    // deliberately, and so does anything unclassifiable. Both belong on the Components tab.
    expect(defaultTabFor({ kind: 'component', isPlaced: true })).toBe('components');
    expect(defaultTabFor({ kind: 'cloudfunction', isPlaced: false })).toBe('components');
    expect(defaultTabFor({ kind: undefined, isPlaced: false })).toBe('components');
  });

  it('flips symmetrically, because there are two tabs and no third state', () => {
    expect(flipTab('layers')).toBe('components');
    expect(flipTab('components')).toBe('layers');
    expect(flipTab(flipTab('layers'))).toBe('layers');
  });

  it('keeps one copy of each user-visible name', () => {
    expect(TAB_LABEL.layers).toBe('Layers');
    expect(TAB_LABEL.components).toBe('Components');
    // R-E: the panel is titled after the thing, not after one of its two views — a string that
    // had no gate is a string that sits a ruling behind ([[an-unpinned-user-visible-string-sits-a-ruling-behind]]).
    expect(PANEL_TITLE).toBe('Project');
  });
});

describe('TVW-004 — reading the canvas component off the rows the panel already built', () => {
  const row = (name: string, extra: Record<string, unknown>): TreeNode =>
    ({ type: 'component', data: { name, ...extra } } as unknown as TreeNode);

  const tree: TreeNode[] = [
    {
      type: 'section',
      data: {
        id: 'pages',
        children: [row('/Pages/Home', { kind: 'page', meta: { tone: 'route', text: '/' }, instances: [] })]
      }
    } as unknown as TreeNode,
    {
      type: 'section',
      data: {
        id: 'components',
        children: [
          row('/Hero', { kind: 'visual', meta: { tone: 'count', count: 2 }, instances: [{}, {}] }),
          row('/Orphan', { kind: 'visual', meta: { tone: 'unplaced' }, instances: [] }),
          {
            type: 'folder',
            data: {
              name: 'Sections',
              isComponentFolder: false,
              children: [row('/Sections/Card', { kind: 'visual', meta: { tone: 'count', count: 1 }, instances: [{}] })]
            }
          } as unknown as TreeNode
        ]
      }
    } as unknown as TreeNode
  ];

  it('finds a component nested inside a folder inside a section', () => {
    expect(tabSubjectFor(tree, '/Sections/Card')).toEqual({ kind: 'visual', isPlaced: true });
  });

  it('reads a page as placed-irrelevant and an orphan as unplaced', () => {
    // 🔴 A page's meta carries its ROUTE, never a count — a placement test written on the meta's
    // tone alone would read every page in every project as unplaced.
    expect(tabSubjectFor(tree, '/Pages/Home')).toEqual({ kind: 'page', isPlaced: false });
    expect(defaultTabFor(tabSubjectFor(tree, '/Pages/Home'))).toBe('layers');
    expect(tabSubjectFor(tree, '/Orphan')).toEqual({ kind: 'visual', isPlaced: false });
    expect(defaultTabFor(tabSubjectFor(tree, '/Orphan'))).toBe('components');
  });

  it('answers for a canvas showing nothing, and for a name no row carries', () => {
    expect(tabSubjectFor(tree, undefined)).toEqual({ kind: undefined, isPlaced: false });
    expect(tabSubjectFor(tree, '/Gone')).toEqual({ kind: undefined, isPlaced: false });
    expect(defaultTabFor(tabSubjectFor(tree, '/Gone'))).toBe('components');
  });
});
