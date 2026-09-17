/**
 * TVW-001 (d) — sections by role, and the `Pages` section's Router order.
 *
 * The routers are read by the same walk that counts instances (`buildUsageIndex`'s second
 * argument), so these fixtures go through it rather than handing `pageGroups` a list: a walk that
 * dropped the start page or the order would be graded here, not assumed.
 */

import { pageGroups, sectionFor } from '../../src/editor/src/views/panels/ComponentsPanelNew/componentSections';
import {
  buildUsageIndex,
  RouterPages,
  UsageComponent,
  UsageNode
} from '../../src/editor/src/views/panels/ComponentsPanelNew/componentUsage';

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

const router = (id: string, routes: string[], extra: Record<string, unknown> = {}) =>
  node(id, 'Router', { parameters: { ...extra, pages: { routes, ...((extra.pages as object) ?? {}) } } });

function walk(components: UsageComponent[]) {
  const routers: RouterPages[] = [];
  const index = buildUsageIndex(components, routers);
  return { index, routers };
}

describe('TVW-001 (d) section by role', () => {
  const { index } = walk([
    component('/App', [router('r', ['/Pages/Home'])]),
    component('/Pages/Home', [node('p', 'Page')]),
    component('/Pages/Legal', [node('p', 'Page')]),
    component('/Sections/Hero', [node('g', 'Group')]),
    component('/Logic/Format price', [node('e', 'Expression')]),
    component('/Logic/Scratch', []),
    component('/#__cloud__/saveOrder', [node('rq', 'noodl.cloud.request')]),
    component('/Start', [node('p', 'Page')])
  ]);
  const section = (name: string, kind: Parameters<typeof sectionFor>[1]) => sectionFor(name, kind, index.get(name));

  it('puts a component with a Page node in Pages, routed or not', () => {
    expect(section('/Pages/Home', 'page')).toBe('pages');
    expect(section('/Pages/Legal', 'page')).toBe('pages');
  });

  it('puts the home component in Pages only when it is a page itself', () => {
    expect(section('/Start', 'home')).toBe('pages');
    expect(section('/App', 'home')).toBe('components');
  });

  it('puts a visual root in Components and a graph with no visual root in Logic', () => {
    expect(section('/Sections/Hero', 'visual')).toBe('components');
    expect(section('/Logic/Format price', 'component')).toBe('logic');
  });

  it('never calls an empty component logic, whatever folder it is in (R-H)', () => {
    expect(section('/Logic/Scratch', 'component')).toBe('components');
  });

  it('puts the cloud boundary in its own section by name, before anything the graph says', () => {
    expect(section('/#__cloud__/saveOrder', 'cloudfunction')).toBe('cloud');
    expect(sectionFor('/#__cloud__/draft', 'component', undefined)).toBe('cloud');
  });
});

describe('TVW-001 (d) the Pages section', () => {
  it('orders pages as the Router lists them, marks the start page, and puts unrouted pages last by name', () => {
    const { routers } = walk([
      component('/App', [router('r', ['/Work', '/Home', '/Gone'], { pages: { startPage: '/Home' } })]),
      component('/Home', [node('p', 'Page')]),
      component('/Work', [node('p', 'Page')]),
      component('/Zeta', [node('p', 'Page')]),
      component('/Legal', [node('p', 'Page')])
    ]);

    expect(pageGroups(['/Home', '/Work', '/Zeta', '/Legal'], routers)).toEqual([
      {
        router: 'Main',
        pages: [
          { name: '/Work', isStart: false },
          { name: '/Home', isStart: true }
        ]
      },
      {
        router: null,
        pages: [
          { name: '/Legal', isStart: false },
          { name: '/Zeta', isStart: false }
        ]
      }
    ]);
  });

  it('takes the first route as the start page when the Router names none', () => {
    const { routers } = walk([
      component('/App', [router('r', ['/Work', '/Home'])]),
      component('/Home', [node('p', 'Page')]),
      component('/Work', [node('p', 'Page')])
    ]);
    expect(pageGroups(['/Home', '/Work'], routers)[0].pages[0]).toEqual({ name: '/Work', isStart: true });
  });

  it('gives two Routers two groups, in walk order, and one Router placed twice one group', () => {
    const { routers } = walk([
      component('/App', [router('r1', ['/Home'], { name: 'Main' }), router('r2', ['/Settings'], { name: 'Admin' })]),
      component('/Shell', [router('r3', ['/About'], { name: 'Main' })]),
      component('/Home', [node('p', 'Page')]),
      component('/About', [node('p', 'Page')]),
      component('/Settings', [node('p', 'Page')])
    ]);

    const groups = pageGroups(['/Home', '/About', '/Settings'], routers);
    expect(groups.map((g) => g.router)).toEqual(['Main', 'Admin']);
    expect(groups[0].pages.map((p) => p.name)).toEqual(['/Home', '/About']);
  });

  it('draws no group for a Router that lists no page', () => {
    const { routers } = walk([component('/App', [router('r', [])]), component('/Legal', [node('p', 'Page')])]);
    expect(pageGroups(['/Legal'], routers)).toEqual([{ router: null, pages: [{ name: '/Legal', isStart: false }] }]);
  });
});
