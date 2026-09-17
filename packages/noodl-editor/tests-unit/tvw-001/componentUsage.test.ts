/**
 * TVW-001 (b) — the row meta, and the counts behind it.
 *
 * AC2 asks that the sum of every `×N` equals the instance nodes in the project, counted from the
 * artefact rather than the panel's own number. The fixture below is a project in miniature, and
 * the cross-check walks it a second, independent way (a flat list of every node, filtered by name)
 * so a walk that skipped children or stopped early would disagree with it.
 */

import {
  buildUsageIndex,
  rowMetaFor,
  UsageComponent,
  UsageNode
} from '../../src/editor/src/views/panels/ComponentsPanelNew/componentUsage';

interface FixtureNode extends UsageNode {
  children?: FixtureNode[];
}

function component(name: string, roots: FixtureNode[]): UsageComponent & { roots: FixtureNode[] } {
  function visit(node: FixtureNode, callback: (n: UsageNode) => unknown): boolean {
    // The editor's `NodeGraphNode.forEach`: the node first, then children, stop on truthy.
    if (callback(node)) return true;
    for (const child of node.children ?? []) if (visit(child, callback)) return true;
    return false;
  }
  return {
    name,
    roots,
    forEachNode(callback) {
      for (const root of roots) if (visit(root, callback)) return;
    }
  };
}

const node = (id: string, typename: string, extra: Partial<FixtureNode> = {}): FixtureNode => ({
  id,
  typename,
  ...extra
});

/**
 * App routes Home and Pricing. Home places Hero twice (one nested inside a Group), Pricing places
 * it once and holds a Card. Draft is empty, Orphan is placed nowhere, Unlisted is a page no Router
 * names, Format price is logic placed once.
 */
function project() {
  return [
    component('/App', [node('router', 'Router', { parameters: { pages: { routes: ['/Home', '/Pricing'] } } })]),
    component('/Home', [
      node('page', 'Page', {
        children: [
          node('hero1', '/Hero'),
          node('group', 'Group', { children: [node('hero2', '/Hero'), node('fmt', '/Format price')] })
        ]
      })
    ]),
    component('/Pricing', [node('page', 'Page', { children: [node('hero3', '/Hero'), node('card', '/Card')] })]),
    component('/Hero', [node('g', 'Group', { children: [node('t', 'Text')] })]),
    component('/Card', [node('g', 'Group')]),
    component('/Format price', [node('fn', 'Expression')]),
    component('/Orphan', [node('g', 'Group')]),
    component('/Unlisted', [node('page', 'Page')]),
    component('/Draft', [])
  ];
}

describe('TVW-001 usage index', () => {
  it('counts instances at any depth and names each parent', () => {
    const index = buildUsageIndex(project());
    expect(index.get('/Hero').instances).toEqual([
      { parent: '/Home', nodeId: 'hero1' },
      { parent: '/Home', nodeId: 'hero2' },
      { parent: '/Pricing', nodeId: 'hero3' }
    ]);
    expect(index.get('/Orphan').instances).toEqual([]);
  });

  it('agrees with an independent walk of the artefact (AC2: the sum of ×N is the instance nodes)', () => {
    const components = project();
    const names = new Set(components.map((c) => c.name));

    const flat: FixtureNode[] = [];
    const collect = (n: FixtureNode) => {
      flat.push(n);
      (n.children ?? []).forEach(collect);
    };
    components.forEach((c) => c.roots.forEach(collect));
    const instanceNodes = flat.filter((n) => names.has(n.typename)).length;

    const index = buildUsageIndex(components);
    const sumOfCounts = components
      .map((c) => rowMetaFor('visual', index.get(c.name)))
      .reduce((sum, meta) => sum + (meta?.tone === 'count' ? meta.count : 0), 0);

    expect(instanceNodes).toBe(5);
    expect(sumOfCounts).toBe(instanceNodes);
  });

  it('counts every node in the component itself, so an empty one reads 0', () => {
    const index = buildUsageIndex(project());
    expect(index.get('/Hero').nodeCount).toBe(2);
    expect(index.get('/Draft').nodeCount).toBe(0);
  });

  it('records which Routers list a page, Main when unnamed', () => {
    const index = buildUsageIndex(project());
    expect(index.get('/Home').routedBy).toEqual(['Main']);
    expect(index.get('/Unlisted').routedBy).toEqual([]);
  });

  it('survives a walker that honours a truthy return — no callback returns one', () => {
    // If the count callback returned `own.nodeCount++` (truthy after the first node), the walk
    // would stop after one node and Hero's nested Text would vanish.
    const index = buildUsageIndex(project());
    expect(index.get('/Home').nodeCount).toBe(5);
  });
});

describe('TVW-001 row meta', () => {
  const index = buildUsageIndex(project());

  it('says ×N for a placed component and unplaced for one nothing places', () => {
    expect(rowMetaFor('visual', index.get('/Hero'))).toEqual({ tone: 'count', text: '×3', count: 3 });
    expect(rowMetaFor('visual', index.get('/Orphan'))).toEqual({ tone: 'unplaced', text: 'unplaced' });
    expect(rowMetaFor('component', index.get('/Format price'))).toEqual({ tone: 'count', text: '×1', count: 1 });
  });

  it('says empty before anything else, whatever kind the row is (R-H)', () => {
    expect(rowMetaFor('visual', index.get('/Draft'))).toEqual({ tone: 'empty', text: 'empty' });
    expect(rowMetaFor('component', index.get('/Draft'))).toEqual({ tone: 'empty', text: 'empty' });
  });

  it('gives a routed page its route, and an unrouted page the chip', () => {
    expect(rowMetaFor('page', index.get('/Home'), 'home')).toEqual({ tone: 'route', text: '/home' });
    expect(rowMetaFor('page', index.get('/Unlisted'))).toEqual({ tone: 'unrouted', text: 'not in a router' });
  });

  it('says nothing for home, a popup nothing places, or a cloud function', () => {
    expect(rowMetaFor('home', index.get('/App'))).toBeNull();
    expect(rowMetaFor('popup', index.get('/Orphan'))).toBeNull();
    expect(rowMetaFor('cloudfunction', index.get('/Card'))).toBeNull();
  });
});
