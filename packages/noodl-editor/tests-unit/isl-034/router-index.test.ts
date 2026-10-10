/**
 * P109 ISL-034 / P109-S18 — the project's router index names a Router left with no Name `Main`.
 *
 * The index (`utils/exporter/router.ts` `getRouterIndex`) is what a deployed app reads to know which pages a Router
 * holds. It used to keep only a Router whose Name was set, so an app whose one Router was left blank — as the Name
 * port tells a person to leave it when there is only one — deployed with `routers: []`, and every URL opened the start
 * page. Ruled 2026-10-08: the index takes an unnamed Router as `Main`, as the runtime's `registerRouter` already does.
 *
 * The exporter's helpers import the editor's models for other exports; those are stubbed so only the walk runs here.
 */
jest.mock('@noodl-models/componentmodel', () => ({}));
jest.mock('@noodl-models/nodegraphmodel', () => ({}));
jest.mock('@noodl-models/nodelibrary', () => ({}));

import { getRouterIndex } from '../../src/editor/src/utils/exporter/router';

type FakeNode = { type: { name: string }; parameters: Record<string, unknown>; owner?: unknown };

function component(name: string, nodes: FakeNode[]) {
  const c = {
    name,
    forEachNode: (fn: (n: FakeNode) => void) => nodes.forEach((n) => fn(n)),
    getNodesWithType: (t: string) => nodes.filter((n) => n.type.name === t)
  };
  // a Page node's component is `page.owner.owner`
  for (const n of nodes) n.owner = { owner: c };
  return c;
}
const router = (parameters: Record<string, unknown>): FakeNode => ({ type: { name: 'Router' }, parameters });
const page = (): FakeNode => ({ type: { name: 'Page' }, parameters: {} });
const PAGES = { routes: ['/Pages/Olive', '/Pages/Robot'], startPage: '/Pages/Olive' };
const pages = () => [component('/Pages/Olive', [page()]), component('/Pages/Robot', [page()])];

describe('P109-S18 — an unnamed Router is in the router index, as Main', () => {
  it('lists a Router with no Name as Main, with its pages', () => {
    const index = getRouterIndex([component('/App', [router({ pages: PAGES })]), ...pages()]);
    expect(index.routers).toEqual([{ name: 'Main', pages: PAGES }]);
    expect(index.pages.map((p) => p.path)).toEqual(['olive', 'robot']);
  });

  it("lists a Router whose Name is '' as Main too", () => {
    const index = getRouterIndex([component('/App', [router({ name: '', pages: PAGES })])]);
    expect(index.routers).toEqual([{ name: 'Main', pages: PAGES }]);
  });

  it('keeps a Name that was set', () => {
    const index = getRouterIndex([component('/App', [router({ name: 'Shop', pages: PAGES })])]);
    expect(index.routers).toEqual([{ name: 'Shop', pages: PAGES }]);
  });

  it('lists every Router, named or not', () => {
    const index = getRouterIndex([component('/App', [router({ pages: PAGES }), router({ name: 'Side', pages: { routes: [] } })])]);
    expect(index.routers.map((r) => r.name)).toEqual(['Main', 'Side']);
  });
});
