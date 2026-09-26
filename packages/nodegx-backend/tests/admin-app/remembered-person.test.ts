/**
 * P104 — a person signs in once per browser (Richard, 2026-09-26).
 *
 * Once an account exists the editor opens the manager without the machine
 * credential, so the page must find the person's sign-in on the next open: a
 * session is kept in `localStorage` (this browser), the credential still only
 * in `sessionStorage` (this tab). Sign out forgets both AND ends the session on
 * the server, because a remembered session outlives the tab.
 */
import './dom';

import { PERSON_KEY, STORAGE_KEY, bootSession, session, signOut, submitCredential, submitPassword } from '../../src/admin/app/api';

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
}
const calls: Call[] = [];
const answer = (status: number, json: unknown) => Promise.resolve(new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));
const WHOAMI = { ok: true, readonly: false, backend: { id: 'b', name: 'B', host: '127.0.0.1', port: 1 }, security: { devOpen: false, enforced: true, hasReadonlyTier: false }, firstRun: false, adminAccount: true, features: {} };

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = (init && init.method) || 'GET';
  const headers = ((init && init.headers) || {}) as Record<string, string>;
  calls.push({ method, url, headers });
  const p = new URL(url, 'http://127.0.0.1').pathname;
  if (p === '/_admin/login') return answer(200, { sessionToken: 'r:person' });
  if (p === '/logout') return answer(200, {});
  if (p === '/_admin/whoami') {
    if (headers['x-parse-session-token'] === 'r:person') return answer(200, { ...WHOAMI, person: { id: 'u1', username: null, email: 'richard@example.com', access: 'full' } });
    if (headers.authorization === 'Bearer k3y') return answer(200, { ...WHOAMI, person: null });
    return answer(401, { error: 'Unauthorized' });
  }
  return answer(404, { error: 'unstubbed ' + p });
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as typeof fetch;
});
afterAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});
beforeEach(() => {
  calls.length = 0;
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, '', '/_admin');
  session.set({ credential: null, whoami: null, readonly: false, features: {}, loginError: null, booting: true });
});

describe('a person is remembered in this browser; the credential only in this tab', () => {
  it('signing in with email + password keeps the session in localStorage, not sessionStorage', async () => {
    expect(await submitPassword('richard@example.com', 'pw', true)).toBe(true);
    expect(JSON.parse(localStorage.getItem(PERSON_KEY)!)).toEqual({ kind: 'session', value: 'r:person' });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('the next open — no credential in the link, a new tab — is signed in as the person, and lands on the route', async () => {
    localStorage.setItem(PERSON_KEY, JSON.stringify({ kind: 'session', value: 'r:person' }));
    history.replaceState(null, '', '/_admin#route=' + encodeURIComponent('/schema/Pet/new-field'));
    await bootSession();
    expect(session.get().whoami!.person!.email).toBe('richard@example.com');
    expect(location.hash).toBe('#/schema/Pet/new-field');
  });

  it('the credential is never kept for the browser', async () => {
    expect(await submitCredential('k3y', true)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual({ kind: 'token', value: 'k3y' });
    expect(localStorage.getItem(PERSON_KEY)).toBeNull();
  });

  it('sign out forgets both and ends the session on the server', async () => {
    await submitPassword('richard@example.com', 'pw', true);
    signOut(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem(PERSON_KEY)).toBeNull();
    const out = calls.find((c) => c.method === 'POST' && /\/logout$/.test(c.url))!;
    expect(out.headers['x-parse-session-token']).toBe('r:person');
  });

  it('a remembered session the server no longer accepts is forgotten, and the form shows', async () => {
    localStorage.setItem(PERSON_KEY, JSON.stringify({ kind: 'session', value: 'r:expired' }));
    await bootSession();
    expect(session.get().whoami).toBeNull();
    expect(localStorage.getItem(PERSON_KEY)).toBeNull();
  });
});
