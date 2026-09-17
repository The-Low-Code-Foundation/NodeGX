/**
 * TVW-001 (d) — which section of the Components panel a component draws in, and the order of the
 * `Pages` section.
 *
 * The section is derived from the graph and the Router, never chosen (proposal §4.3):
 *
 * - `cloud` — the `#__cloud__` runtime boundary (WFA-001). Decided by the name, before anything the
 *   graph could say: a cloud component executes in another runtime whatever its nodes are.
 * - `pages` — a `Page` node in the graph, listed by a Router or not. The home component lands here
 *   only when it is a page itself; an `App` that holds the Router is not one.
 * - `components` — a visual root (`visual`, `popup`, a home that is not a page), and every `empty`
 *   component: R-H keeps `empty` out of `Logic`, and with no nodes there is no role to read, so it
 *   draws dimmed beside the components it will most likely become one of.
 * - `logic` — at least one node and no visual root. This is `componentKind`'s neutral `component`
 *   kind with the empty case taken out of it — the reason R-H allows a `Logic` section at all.
 *
 * Deliberately free of editor imports so it grades in plain Node (`tests-unit/tvw-001`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/componentSections
 */

import type { ComponentKind } from './componentKind';
import type { ComponentUsage, RouterPages } from './componentUsage';

export type SectionId = 'pages' | 'components' | 'logic' | 'cloud';

/** Top to bottom, the order the panel draws its sections in. */
export const SECTION_ORDER: readonly SectionId[] = ['pages', 'components', 'logic', 'cloud'];

export const SECTION_LABEL: Record<SectionId, string> = {
  pages: 'Pages',
  components: 'Components',
  logic: 'Logic',
  cloud: 'Cloud functions'
};

/** Kept in step with `CLOUD_SHEET.pathPrefix` in `types.ts`, which imports React-side models. */
export const CLOUD_PATH_PREFIX = '/#__cloud__/';

export function sectionFor(name: string, kind: ComponentKind, usage: ComponentUsage | undefined): SectionId {
  if (name.startsWith(CLOUD_PATH_PREFIX) || kind === 'cloudfunction') return 'cloud';
  if (usage?.hasPageNode) return 'pages';
  if (!usage || usage.nodeCount === 0) return 'components';
  if (kind === 'component') return 'logic';
  return 'components';
}

export interface PageRow {
  name: string;
  /** The Router opens this page first. Per Router: a page two Routers list can be the start of one. */
  isStart: boolean;
}

export interface PageGroup {
  /** The Router's name; `null` for the pages no Router lists. */
  router: string | null;
  pages: PageRow[];
}

/**
 * The `Pages` section: one group per Router in Router order (the order its Pages editor shows),
 * then the pages no Router lists, by name. A route naming something that is not a page in
 * `pageNames` (a deleted component, a route left behind) draws nothing — the row would have no
 * component to open. A Router that lists no page draws no group.
 */
export function pageGroups(pageNames: readonly string[], routers: readonly RouterPages[]): PageGroup[] {
  const pages = new Set(pageNames);
  const routed = new Set<string>();
  const groups: PageGroup[] = [];

  for (const router of routers) {
    const rows = router.routes
      .filter((route) => pages.has(route))
      .map((route) => ({ name: route, isStart: route === router.startPage }));
    rows.forEach((row) => routed.add(row.name));
    if (rows.length > 0) groups.push({ router: router.name, pages: rows });
  }

  const unrouted = pageNames
    .filter((name) => !routed.has(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, isStart: false }));
  if (unrouted.length > 0) groups.push({ router: null, pages: unrouted });

  return groups;
}
