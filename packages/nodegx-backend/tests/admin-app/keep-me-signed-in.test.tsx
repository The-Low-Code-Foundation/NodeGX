/**
 * BMG-017 row 4 — the sign-in form's box says what it keeps.
 *
 * R7 (BMG-016) keeps a PERSON's session for the browser; the credential typed
 * under *Use the admin credential instead* is kept for the tab only (ticked) or
 * not at all. The box said *Keep me signed in on this browser* on both paths,
 * so ticking it and signing in with the credential, then opening a new tab,
 * asked again. The box's words now follow the path the submit will take, and
 * this spec reads the words, signs in with the box ticked, and checks the
 * storage keeps exactly what the words promised — on both paths.
 */
import { click, mount, q, settle, text, typeInto, unmount } from './dom';

import { h } from 'preact';

import { App } from '../../src/admin/app/App';
import { PERSON_KEY, STORAGE_KEY, session } from '../../src/admin/app/api';

const answer = (status: number, json: unknown) => Promise.resolve(new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));
const WHOAMI = { ok: true, readonly: false, backend: { id: 'b', name: 'B', host: '127.0.0.1', port: 1 }, security: { devOpen: false, enforced: true, hasReadonlyTier: false }, firstRun: false, adminAccount: true, features: {} };

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = ((init && init.headers) || {}) as Record<string, string>;
  const p = new URL(String(input), 'http://127.0.0.1').pathname;
  if (p === '/_admin/login') return answer(200, { sessionToken: 'r:person' });
  if (p === '/_admin/whoami') {
    if (headers['x-parse-session-token'] === 'r:person') return answer(200, { ...WHOAMI, person: { id: 'u1', username: null, email: 'richard@example.com', access: 'full' } });
    if (headers.authorization === 'Bearer k3y') return answer(200, { ...WHOAMI, person: null });
    return answer(401, { error: 'Unauthorized' });
  }
  // Whatever the shell asks for once signed in: an empty answer is enough here.
  return answer(200, {});
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as typeof fetch;
});
afterAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});

let root: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  session.set({ credential: null, whoami: null, readonly: false, features: {}, loginError: null, booting: false });
  root = mount(h(App, {}));
});
afterEach(() => unmount(root));

const box = () => q<HTMLInputElement>(root, '#login-remember');
const boxWords = () => text(box().closest('label')).replace(/\s+/g, ' ').trim();
/** Open *Use the admin credential instead* and type the credential, as a person would. */
const typeCredential = async (value: string) => {
  click(q(root, '.login-alt .disclose-head'));
  await settle();
  typeInto(q<HTMLInputElement>(root, '#login-token'), value);
  await settle();
};
const submit = async () => {
  (q<HTMLFormElement>(root, '#login-form')).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await settle(10);
};

describe('the box says what signing in will keep', () => {
  it('email and password: "on this browser" — and the session is in localStorage', async () => {
    expect(boxWords()).toMatch(/on this browser/);
    expect(box().checked).toBe(true);
    typeInto(q<HTMLInputElement>(root, '#login-email'), 'richard@example.com');
    typeInto(q<HTMLInputElement>(root, '#login-password'), 'pw');
    await submit();
    expect(session.get().whoami).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(PERSON_KEY)!)).toEqual({ kind: 'session', value: 'r:person' });
  });

  it('the credential: the words say THIS TAB, never this browser — and it is in sessionStorage only', async () => {
    await typeCredential('k3y');
    expect(boxWords()).not.toMatch(/browser/);
    expect(boxWords()).toMatch(/this tab/);
    expect(box().checked).toBe(true);
    await submit();
    expect(session.get().whoami).not.toBeNull();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual({ kind: 'token', value: 'k3y' });
    expect(localStorage.getItem(PERSON_KEY)).toBeNull();
  });

  it('the credential with the box unticked is kept nowhere', async () => {
    await typeCredential('k3y');
    click(box());
    await settle();
    expect(box().checked).toBe(false);
    await submit();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PERSON_KEY)).toBeNull();
  });
});
