/**
 * P115 HST-014/017 — what the app's Worker does with one request, with every binding handed in, so jest grades it
 * (`worker.ts` cannot be loaded outside workerd: `cloudflare:workers`).
 *
 *   /nodegx-config.json    the address the page was loaded from (the site works at any address, a domain added later)
 *   /__nodegx/alert-test   POST, admin credential only: the refusal email's test (HST-017), sent by the deploy
 *   anything else          the app's files or its backend, by the backend's own route table (`routing.ts`)
 *
 * HST-017: every call into the backend's object goes through `fromBackend`. Its failure (over the account's daily
 * allowance, or the object failing) is answered in words (`refusal.ts`), logged, and emailed once a day. When the
 * object cannot answer at all, a file or page the site has is still served, so the page loads and says why its data
 * is missing.
 */
import { alertTestEmail, refusalAnswer, refusalKind, sendAlert, tellOnce, type AlertEnv, type TellCache } from './refusal';
import { HOST_SEGMENT, isPageAddress, routeOf } from './routing';

export interface Fetcher {
  fetch(r: Request): Promise<Response>;
}

export interface FrontEnv extends AlertEnv {
  ASSETS: Fetcher;
  NODEGX_ADMIN_TOKEN?: string;
}

export interface FrontDeps {
  env: FrontEnv;
  /** The backend's object. */
  backend: Fetcher;
  /** The backend's route families (cached per isolate by the caller); rejects when the object cannot say. */
  families: () => Promise<ReadonlySet<string>>;
  waitUntil: (p: Promise<unknown>) => void;
  appId: string;
  cache: TellCache | null;
}

export const CONFIG_PATH = '/nodegx-config.json';
export const ALERT_TEST_PATH = `/${HOST_SEGMENT}/alert-test`;

/** Same-length compare, so the admin credential is not read one character at a time from response times. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A browser opening a page (not a page's own fetch for data). */
export function isNavigation(request: Request): boolean {
  const h = request.headers;
  return h.get('sec-fetch-mode') === 'navigate' || h.get('sec-fetch-dest') === 'document' || /text\/html/.test(h.get('accept') || '');
}

export async function handleRequest(request: Request, deps: FrontDeps): Promise<Response> {
  const { env } = deps;
  const url = new URL(request.url);
  if (url.pathname === CONFIG_PATH && (request.method === 'GET' || request.method === 'HEAD')) {
    return Response.json(
      { cloudservices: { endpoint: url.origin, appId: deps.appId, instanceId: deps.appId, type: 'nodegx' } },
      { headers: { 'cache-control': 'no-store' } }
    );
  }
  if (url.pathname === ALERT_TEST_PATH && request.method === 'POST') {
    const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.NODEGX_ADMIN_TOKEN || !sameSecret(given, env.NODEGX_ADMIN_TOKEN)) return new Response('Not found', { status: 404 });
    return Response.json(await sendAlert(env, alertTestEmail(url.origin)));
  }
  const fromBackend = async (r: Request): Promise<Response> => {
    try {
      return await deps.backend.fetch(r);
    } catch (e) {
      const kind = refusalKind(e);
      deps.waitUntil(tellOnce({ env, cache: deps.cache }, kind, url.origin, e));
      return refusalAnswer(kind);
    }
  };
  const page = () => env.ASSETS.fetch(new Request(new URL('/', url), request));
  let known: ReadonlySet<string>;
  try {
    known = await deps.families();
  } catch {
    // The backend cannot say which paths are its own: let it answer (its 503 says why), never the page in its place.
    const answer = await fromBackend(request);
    if (!answer.headers.has('x-nodegx-refusal') || (request.method !== 'GET' && request.method !== 'HEAD')) return answer;
    // The object cannot answer at all: a file the site has is still served, and a page to a browser that is OPENING
    // one, so the page loads and its data calls say why they are empty. Without the route table, `/classes/Reader`
    // looks like a page address: only a navigation gets the page, a data call keeps the sentence (graded in jest).
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return isPageAddress(url.pathname) && isNavigation(request) ? page() : answer;
  }
  const route = routeOf(request.method, url.pathname, known);
  if (route === 'host') return new Response('Not found', { status: 404 });
  if (route === 'asset') {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || !isPageAddress(url.pathname)) return asset;
    return page();
  }
  return fromBackend(request);
}
