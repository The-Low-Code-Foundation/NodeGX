/**
 * TVW-001 (c) — the *Used in* rows behind the `×N` button.
 *
 * The instances are taken from `buildUsageIndex` rather than written by hand, so a walk that lost a
 * parent or an occurrence is graded here too — the popover's rows and the button's count come from
 * the same array, and the point of the heading is that they can disagree.
 */

import { buildUsageIndex, UsageComponent, UsageNode } from '../../src/editor/src/views/panels/ComponentsPanelNew/componentUsage';
import { usedInRows, usedInTitle } from '../../src/editor/src/views/panels/ComponentsPanelNew/usedIn';

interface FixtureNode extends UsageNode {
  children?: FixtureNode[];
}

function component(name: string, roots: FixtureNode[]): UsageComponent {
  function visit(node: FixtureNode, callback: (n: UsageNode) => unknown): boolean {
    if (callback(node)) return true;
    for (const child of node.children ?? []) if (visit(child, callback)) return true;
    return false;
  }
  return {
    name,
    forEachNode(callback) {
      for (const root of roots) if (visit(root, callback)) return;
    }
  };
}

const node = (id: string, typename: string, extra: Partial<FixtureNode> = {}): FixtureNode => ({ id, typename, ...extra });

describe('TVW-001 (c) — Used in rows', () => {
  it('draws one row per parent, not one per occurrence', () => {
    // The corpus shape: four ServiceCards, all inside Sections/Services.
    const index = buildUsageIndex([
      component('/Components/ServiceCard', [node('r1', 'Group')]),
      component('/Sections/Services', [
        node('g', 'Group', {
          children: [
            node('a', '/Components/ServiceCard'),
            node('b', '/Components/ServiceCard'),
            node('c', '/Components/ServiceCard'),
            node('d', '/Components/ServiceCard')
          ]
        })
      ])
    ]);

    const instances = index.get('/Components/ServiceCard').instances;
    expect(instances).toHaveLength(4);

    const rows = usedInRows(instances);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      parent: '/Sections/Services',
      label: 'Services',
      folder: 'Sections',
      count: 4,
      nodeId: 'a' // the first in walk order, as X-Ray picks
    });
  });

  it('keeps the parents apart when a component is used in several, in path order', () => {
    // The corpus's one many-parent case: Scroll to section, 8 instances across 3 components.
    const index = buildUsageIndex([
      component('/Components/Logic/Scroll to section', [node('r', 'Script')]),
      component('/Sections/SiteNav', [
        node('n1', '/Components/Logic/Scroll to section'),
        node('n2', '/Components/Logic/Scroll to section')
      ]),
      component('/Sections/Hero', [node('h1', '/Components/Logic/Scroll to section')]),
      component('/Sections/SiteFooter', [node('f1', '/Components/Logic/Scroll to section')])
    ]);

    const rows = usedInRows(index.get('/Components/Logic/Scroll to section').instances);

    expect(rows.map((r) => r.parent)).toEqual(['/Sections/Hero', '/Sections/SiteFooter', '/Sections/SiteNav']);
    expect(rows.map((r) => r.count)).toEqual([1, 1, 2]);
    // Picking the second goes to SiteFooter's own instance node — AC4's gesture.
    expect(rows[1].nodeId).toBe('f1');
    expect(rows[2].nodeId).toBe('n1');
  });

  it('is ordered by path regardless of walk order', () => {
    const rows = usedInRows([
      { parent: '/Zebra', nodeId: 'z' },
      { parent: '/apple', nodeId: 'a' },
      { parent: '/Mango', nodeId: 'm' }
    ]);
    expect(rows.map((r) => r.parent)).toEqual(['/apple', '/Mango', '/Zebra']);
  });

  it('splits a top-level parent into a label with no folder', () => {
    const rows = usedInRows([{ parent: '/App', nodeId: 'x' }]);
    expect(rows[0]).toMatchObject({ label: 'App', folder: '' });
  });

  it('reads deep folders as everything above the last segment', () => {
    const rows = usedInRows([{ parent: '/Pages/Marketing/Home', nodeId: 'x' }]);
    expect(rows[0]).toMatchObject({ label: 'Home', folder: 'Pages/Marketing' });
  });

  it('returns nothing for a component nothing places', () => {
    expect(usedInRows([])).toEqual([]);
    expect(usedInRows(undefined)).toEqual([]);
  });

  describe('the heading', () => {
    it('says one number when every place holds one instance', () => {
      const rows = usedInRows([
        { parent: '/A', nodeId: '1' },
        { parent: '/B', nodeId: '2' }
      ]);
      expect(usedInTitle(rows, 2)).toBe('Used in 2 places');
    });

    it('says place for a single one', () => {
      expect(usedInTitle(usedInRows([{ parent: '/A', nodeId: '1' }]), 1)).toBe('Used in 1 place');
    });

    it('accounts for the button count when the rows are fewer', () => {
      // ×8 pressed, three rows shown: the other five have to be somewhere.
      const rows = usedInRows([
        { parent: '/A', nodeId: '1' },
        { parent: '/A', nodeId: '2' },
        { parent: '/B', nodeId: '3' },
        { parent: '/C', nodeId: '4' }
      ]);
      expect(usedInTitle(rows, 4)).toBe('Used in 3 places · 4 times');
    });

    it('says both when one place holds them all', () => {
      const rows = usedInRows([
        { parent: '/Sections/Services', nodeId: '1' },
        { parent: '/Sections/Services', nodeId: '2' }
      ]);
      expect(usedInTitle(rows, 2)).toBe('Used in 1 place · 2 times');
    });
  });
});
