/**
 * Hash routing, with the route as the state (BMG-001 §3.3).
 *
 *   #/collections            the Collections page
 *   #/collections/Pet        that collection
 *   #/collections/Pet/<id>   that record, open
 *   #/schema/_User           the accounts card, scrolled to
 *   #/users/<id>  #/roles/<name>  #/triggers/<id>  #/runs/<id>
 *   #/runs?trigger=<id>      the Runs page, filtered (BMG-009): a query after the path
 *
 * Nothing is smuggled through module state between pages: a page reads its
 * route on load and on every `hashchange`, so any page can be sent as a link.
 * `#token=…` is the editor's hand-off and is consumed at boot, never routed;
 * its `&route=` is the page it lands on (`api.ts readHandoff`, BMG-012).
 */
import { useEffect, useState } from 'preact/hooks';

export interface Route {
  view: string;
  params: string[];
  /** `#/runs?trigger=abc` → `{ trigger: 'abc' }`. Empty when there is none. */
  query: Record<string, string>;
}

/** Old ids that pages linked to before the nav was rewritten. */
const LEGACY_VIEW_IDS: Record<string, string> = { executions: 'runs' };

export function parseHash(hash: string): Route {
  const whole = (hash || '').replace(/^#\/?/, '');
  if (!whole || whole.startsWith('token=')) return { view: '', params: [], query: {} };
  const qAt = whole.indexOf('?');
  const raw = qAt < 0 ? whole : whole.slice(0, qAt);
  const query: Record<string, string> = {};
  if (qAt >= 0) {
    new URLSearchParams(whole.slice(qAt + 1)).forEach((v, k) => {
      query[k] = v;
    });
  }
  const parts = raw.split('/').map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  const view = LEGACY_VIEW_IDS[parts[0]] || parts[0];
  return { view, params: parts.slice(1).filter((p) => p !== ''), query };
}

/** The path part of a hash, without its query: what the address bar's first segment is compared against. */
export function hashPath(hash: string): string {
  const whole = (hash || '').replace(/^#\/?/, '');
  const qAt = whole.indexOf('?');
  return qAt < 0 ? whole : whole.slice(0, qAt);
}

export function href(view: string, ...params: Array<string | null | undefined>): string {
  const kept = params.filter((p): p is string => p !== undefined && p !== null && p !== '');
  return '#/' + [view, ...kept].map(encodeURIComponent).join('/');
}

/** `href`, plus a query: `hrefWith('runs', [], { trigger: id })` → `#/runs?trigger=<id>`. Empty values are left out. */
export function hrefWith(view: string, params: Array<string | null | undefined>, query: Record<string, string | null | undefined>): string {
  const base = href(view, ...params);
  const q = new URLSearchParams();
  for (const k of Object.keys(query)) {
    const v = query[k];
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  }
  const text = q.toString();
  return text ? base + '?' + text : base;
}

export function navigate(view: string, ...params: Array<string | null | undefined>): void {
  const next = href(view, ...params);
  if (location.hash === next) return;
  location.hash = next;
}

/** Replace the current entry (used to normalise `#/executions` → `#/runs`, never for navigation). */
export function replaceRoute(view: string, ...params: Array<string | null | undefined>): void {
  const next = href(view, ...params);
  try {
    history.replaceState(null, '', location.pathname + location.search + next);
  } catch {
    location.hash = next;
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function currentRoute(): Route {
  return parseHash(location.hash);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
