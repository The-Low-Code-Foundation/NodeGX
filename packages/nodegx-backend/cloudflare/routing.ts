/**
 * P115 HST-014 — which half of an app's one Cloudflare address answers a request: the app's files or its backend.
 *
 * One Worker serves both, at one origin (HST-004 R6), so the page's calls to its backend are same-origin. The spike's
 * router decided with a HAND LIST of the backend's path prefixes and missed four (`apps`, `executions`, `mcp`,
 * `metrics`): a GET on `/mcp` was answered by the page with a 200 (P115-S9-SITEROUTES, caught by
 * `security-enforcement`'s route walk). Here the backend is asked: the families are the first segments of the
 * service's own route table (`HttpServer.appFamilies`, the same set `--serve-app` keeps the app out of, DEP-002), read
 * once per isolate from the Durable Object (`FAMILIES_PATH`). A route added to the backend is routed to it the day it
 * is added, with no list to keep.
 *
 * Pure: no Cloudflare type in here, so jest grades it.
 */

/** The host's own path prefix. Never forwarded from the internet: the Worker answers it, or 404s. */
export const HOST_SEGMENT = '__nodegx';

/** Where the Worker asks the Durable Object for the route families (only the Worker can reach the object). */
export const FAMILIES_PATH = `/${HOST_SEGMENT}/route-families`;

export type Route = 'host' | 'asset' | 'backend';

/** The first path segment ('' for `/`). */
export function firstSegment(pathname: string): string {
  return pathname.split('/')[1] || '';
}

/** The first segment of every route pattern (`admin/permissions/:name` → `admin`), sorted, once each. */
export function routeFamilies(table: ReadonlyArray<{ pattern: string }>): string[] {
  return [...new Set(table.map((r) => r.pattern.split('/')[0]).filter((s) => s !== ''))].sort();
}

/**
 * The half that answers. The host's prefix is the host's. A GET or HEAD outside every backend family is the app's
 * (a file, or a page address answered with `index.html`); everything else is the backend's, which answers its own
 * 404 in JSON for a mistyped `/classes/…` rather than the app's page.
 */
export function routeOf(method: string, pathname: string, families: ReadonlySet<string>): Route {
  const first = firstSegment(pathname);
  if (first === HOST_SEGMENT) return 'host';
  if ((method === 'GET' || method === 'HEAD') && !families.has(first)) return 'asset';
  return 'backend';
}

/**
 * A page's own address (`/home`, `/owner`, a reload, a shared link): a path whose last segment has no dot. The app's
 * files all have one. Not gated on `Accept: text/html`: a phone sends it, but `nodegx live` (Node's fetch) does not,
 * and the spike once answered it 404 for a page that exists.
 */
export function isPageAddress(pathname: string): boolean {
  return !(pathname.split('/').pop() || '').includes('.');
}
