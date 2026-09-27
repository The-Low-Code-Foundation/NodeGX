/**
 * TVW-001 — where each component is used, from one walk of every graph.
 *
 * A component's instances are the nodes, anywhere in the project, whose type is that component
 * (`node.typename === component.name` — the same string the project file stores). X-Ray derives the
 * same fact for the one component on the canvas (`useComponentXRay` → `findComponentUsages`); the
 * panel needs it for every row at once, so it is counted here in a single pass.
 *
 * ⚠️ Counted from a fresh walk every time the caller's change counter moves — never from a memo
 * keyed on `getComponents()`, which is the live array (`addComponent` pushes in place).
 *
 * ⚠️ `forEachNode` stops on a truthy return. Every callback below has a block body and returns
 * nothing.
 *
 * Deliberately free of editor imports so it grades in plain Node (`tests-unit/tvw-001`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/componentUsage
 */

import type { ComponentKind } from './componentKind';

/** The two fields of a node this walk reads. */
export interface UsageNode {
  typename?: string;
  id: string;
  parameters?: Record<string, unknown>;
}

/** The two fields of a component this walk reads. */
export interface UsageComponent {
  name: string;
  forEachNode(callback: (node: UsageNode) => unknown): void;
}

export interface UsageInstance {
  /** The component whose graph holds the instance node. */
  parent: string;
  nodeId: string;
}

export interface ComponentUsage {
  /** Every node in this component's own graph, at any depth. 0 means `empty`. */
  nodeCount: number;
  /** Every instance of this component across the project, in walk order. */
  instances: UsageInstance[];
  /** Names of the Routers whose `pages` list this component (`Main` when unnamed). */
  routedBy: string[];
  /** TVW-001 (d) — the graph holds a `Page` node. The home component can be a page too. */
  hasPageNode: boolean;
}

/**
 * TVW-001 (d) — a Router's page list, in the order its own Pages editor shows. Routers that share a
 * name (the same Router placed on two pages) are one list: the runtime resolves a route by name.
 */
export interface RouterPages {
  name: string;
  routes: string[];
  /** `pages.startPage`, or the first route when unset — what `RouterAdapter.parametersChanged` writes. */
  startPage?: string;
}

export type UsageIndex = Map<string, ComponentUsage>;

const ROUTER_TYPE = 'Router';
const PAGE_TYPE = 'Page';

export function buildUsageIndex(
  components: readonly UsageComponent[],
  /** TVW-001 (d) — filled with every Router's page list, in walk order, from the same walk. */
  routersOut?: RouterPages[]
): UsageIndex {
  const index: UsageIndex = new Map();
  for (const component of components) {
    index.set(component.name, { nodeCount: 0, instances: [], routedBy: [], hasPageNode: false });
  }

  for (const component of components) {
    const own = index.get(component.name);
    component.forEachNode((node) => {
      own.nodeCount++;

      const target = node.typename ? index.get(node.typename) : undefined;
      if (target) target.instances.push({ parent: component.name, nodeId: node.id });

      if (node.typename === PAGE_TYPE) own.hasPageNode = true;

      if (node.typename === ROUTER_TYPE) {
        const pages = node.parameters?.pages as { routes?: unknown; startPage?: unknown } | undefined;
        const routes = Array.isArray(pages?.routes) ? pages.routes : [];
        const routerName = (node.parameters?.name as string) || 'Main';
        for (const route of routes) {
          const routed = typeof route === 'string' ? index.get(route) : undefined;
          if (routed && !routed.routedBy.includes(routerName)) routed.routedBy.push(routerName);
        }
        if (routersOut) collectRouter(routersOut, routerName, routes, pages?.startPage);
      }
    });
  }

  return index;
}

function collectRouter(routers: RouterPages[], name: string, routes: unknown[], startPage: unknown) {
  let router = routers.find((r) => r.name === name);
  if (!router) {
    router = { name, routes: [] };
    routers.push(router);
  }
  for (const route of routes) {
    if (typeof route === 'string' && !router.routes.includes(route)) router.routes.push(route);
  }
  if (router.startPage === undefined) {
    router.startPage = typeof startPage === 'string' && startPage ? startPage : router.routes[0];
  }
}

/**
 * The right-hand meta on a row — the proposal's "hinge" (§4.3).
 *
 * - `count` — `×N`, a placed component. A button (TVW-001 c).
 * - `unplaced` — a component nothing places. Dimmed, italic.
 * - `empty` — no nodes at all. Checked before everything else a graph could say, because an empty
 *   graph says nothing (R-H: never confused with logic).
 * - `route` — a page a Router lists.
 * - `unrouted` — a page no Router lists (`not in a router`).
 * - `null` — nothing true to say in this slot: a cloud function (its section says what it is), the
 *   home component (it *is* the app; nothing places it, and `unplaced` would be false), and a popup
 *   nothing places as an instance (a `Show Popup` opens it; its glyph says so).
 */
export type RowMeta =
  | { tone: 'count'; text: string; count: number }
  | { tone: 'unplaced'; text: 'unplaced' }
  | { tone: 'empty'; text: 'empty' }
  | { tone: 'route'; text: string }
  | { tone: 'unrouted'; text: 'not in a router' };

export function rowMetaFor(
  kind: ComponentKind,
  usage: ComponentUsage | undefined,
  /** The page's URL path when a Router lists it — `RouterAdapter.getPageInfoForComponents`. */
  route?: string
): RowMeta | null {
  if (kind === 'cloudfunction') return null;
  if (!usage || usage.nodeCount === 0) return { tone: 'empty', text: 'empty' };

  if (kind === 'page' || (kind === 'home' && usage.routedBy.length > 0)) {
    if (usage.routedBy.length === 0) return { tone: 'unrouted', text: 'not in a router' };
    // 🔴 **No route, no chip** (Richard, P93 AC7, 2026-09-18). This used to render `/` for a page
    // whose `urlPath` was never set — which was the adapter's title-slug invention replaced by a
    // second, smaller invention at this layer: `/` claims the page is served at the root, and only
    // the start page is. A row that says nothing here is not a gap, it is the honest answer to
    // "what URL did you set?" — and the `start` chip beside it still says which page opens first.
    if (!route) return null;
    return { tone: 'route', text: '/' + route.replace(/^\/+/, '') };
  }

  const count = usage.instances.length;
  if (count > 0) return { tone: 'count', text: `×${count}`, count };
  if (kind === 'home' || kind === 'popup') return null;
  return { tone: 'unplaced', text: 'unplaced' };
}
