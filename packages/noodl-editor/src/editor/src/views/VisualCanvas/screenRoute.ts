/**
 * TVW-002 — which page component the preview's current route is showing.
 *
 * The strip's first word is the name of the page in the preview, so this is the step that decides
 * whether the sentence is about the right screen at all. It is pure, and separate from the walk,
 * because route matching is where the editor's own vocabularies disagree with each other:
 *
 * - the **route** the editor holds (`CanvasView.setCurrentRoute`, the `viewer-navigated` event) is
 *   everything after `http://localhost:<port>` — `/#/pricing` in a hash project (the runtime
 *   default) and `/pricing` in a path project;
 * - the **page paths** (`compilation/context/pages.ts`) have no prefix and are always rooted:
 *   `/pricing`, `/product/{id}`;
 * - and `/` matches no page path at all — it is the Router's start page, which only the Router
 *   knows.
 *
 * ⚠️ **`getPageUrl`, not `authoredPageUrl`.** P93 AC7 stopped the *editor* inventing a URL out of a
 * page's title, and deliberately left the two copies that decide what a real app serves — the
 * deployed export and this dev preview. So the page paths matched here still contain the invented
 * slug for an un-authored page, and they must: the preview genuinely serves it, and matching
 * against the display-only answer would fail to resolve every page whose `urlPath` was never set
 * (41 of 262 pages on this machine, measured 2026-09-18). The strip names pages; it never shows
 * these paths.
 *
 * Graded in `tests-unit/tvw-002/screenRoute.test.ts`.
 *
 * @module noodl-editor/views/VisualCanvas/screenRoute
 */

/** A page as `getIndexedPages` reports it — the dev preview's own route table. */
export interface ScreenPage {
  path: string;
  componentName: string;
}

/**
 * The path part of a viewer route, with the hash prefix removed.
 *
 * ⚠️ The fragment is the path in a hash project, so it is *unwrapped* rather than stripped —
 * `previewRoutePath` next door deliberately leaves `#` alone because its caller compares against an
 * authored path, and stripping there would have turned `/#/task-page` into `/`. Here the fragment
 * is exactly what has to be read.
 */
export function routePath(route: string | undefined): string {
  if (typeof route !== 'string') return '';

  const query = route.indexOf('?');
  const path = query === -1 ? route : route.substring(0, query);

  if (path.startsWith('/#')) return path.substring(2) || '/';
  if (path.startsWith('#')) return path.substring(1) || '/';
  return path;
}

/**
 * The page component the route resolves to, or `undefined`.
 *
 * @param route the viewer route as the editor holds it.
 * @param pages the dev preview's route table, in its own order.
 * @param startPage the Router's start page — what `/` shows. `RouterPages.startPage`.
 */
export function pageForRoute(
  route: string | undefined,
  pages: readonly ScreenPage[],
  startPage?: string
): string | undefined {
  const path = normalise(routePath(route));

  // `/` is not in the route table; it is whatever the Router opens first.
  if (path === '/') return startPage;

  // An exact match first, so a static page always beats a dynamic one that could swallow it:
  // `/product/new` is `/product/new` and not `/product/{id}` with `id = 'new'`.
  for (const page of pages) if (normalise(page.path) === path) return page.componentName;

  for (const page of pages) if (matchesPattern(path, normalise(page.path))) return page.componentName;

  return undefined;
}

/** Trailing slashes are not a different page. A bare `''` is the root. */
function normalise(path: string): string {
  if (!path) return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * `/product/42` against `/product/{id}`.
 *
 * Segment count must match: a `{param}` stands for exactly one segment, which is what
 * `getPathVariables` produces and what the runtime router resolves.
 */
function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.indexOf('{') === -1) return false;

  const pathParts = path.split('/');
  const patternParts = pattern.split('/');
  if (pathParts.length !== patternParts.length) return false;

  return patternParts.every((part, i) => (part.startsWith('{') && part.endsWith('}') ? pathParts[i] !== '' : part === pathParts[i]));
}
