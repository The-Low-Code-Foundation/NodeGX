/**
 * One client, one credential, one error convention — and the session.
 *
 * Two kinds of credential, one slot (BMG-014):
 *   - `token`: BAK-003's admin credential, sent as `Authorization: Bearer`.
 *   - `session`: a `_Session` token for a PERSON with backend access, from
 *     `POST /_admin/login` (email + password) or the setup step, sent as
 *     `X-Parse-Session-Token` — the server resolves it to the admin principal.
 * Never a cookie, so there is still no CSRF surface. The credential is held
 * in `sessionStorage` (this tab); a person's session in `localStorage` (this
 * browser) — Richard, 2026-09-26: once an account exists the editor opens the
 * manager WITHOUT the credential, and a person signs in once per browser, not
 * once per open. Sign out ends that session on the server too. The read-only tier is whichever of the two the server
 * says is read-only; this file only remembers that so buttons can say so.
 */
import { createStore, useStore } from './store';

export type Credential = { kind: 'token'; value: string } | { kind: 'session'; value: string };

/** Who is signed in, when it is a person (`whoami.person`). */
export interface DashboardPerson {
  id: string;
  username: string | null;
  email: string | null;
  access: 'full' | 'readonly';
}

export interface Whoami {
  ok: boolean;
  readonly: boolean;
  backend: { id: string; name: string; host: string; port: number };
  security: { devOpen: boolean; enforced: boolean; hasReadonlyTier: boolean };
  firstRun: boolean;
  /** BMG-014: the signed-in person, or null when the credential signed in. */
  person: DashboardPerson | null;
  /** BMG-014: some account has full backend access — the setup step is done. */
  adminAccount: boolean;
  features: Record<string, boolean>;
  /**
   * BMG-004 AC7 — the `_User` columns only their own control writes, and why.
   * The backend's list (`users/accountColumns.ts`); this page keeps no copy.
   */
  accountColumns?: Record<string, string>;
}

export interface SessionState {
  credential: Credential | null;
  whoami: Whoami | null;
  readonly: boolean;
  features: Record<string, boolean>;
  /** Shown on the sign-in form: why the last session ended, or why a credential was refused. */
  loginError: string | null;
  /** True while the boot probe runs, so the form does not flash before a kept token is tried. */
  booting: boolean;
}

export const session = createStore<SessionState>({
  credential: null,
  whoami: null,
  readonly: false,
  features: {},
  loginError: null,
  booting: true
});

export function useSession(): SessionState {
  return useStore(session);
}

export const STORAGE_KEY = 'nodegx.admin.token';
/** A person's session, kept for this browser (the credential never is). */
export const PERSON_KEY = 'nodegx.admin.person';

/** The header a credential travels in. The uploader (fields.tsx) uses it too. */
export function credentialHeaders(credential: Credential | null): Record<string, string> {
  if (!credential) return {};
  return credential.kind === 'session' ? { 'x-parse-session-token': credential.value } : { authorization: 'Bearer ' + credential.value };
}

/** The query the SSE stream carries it in (EventSource cannot set headers). */
export function liveQuery(credential: Credential | null): string {
  if (!credential) return '';
  return (credential.kind === 'session' ? 'token=' : 'authToken=') + encode(credential.value);
}

/** What was kept: the JSON form, or (from before BMG-014) a bare token. */
export function parseStoredCredential(raw: string | null): Credential | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { kind?: unknown; value?: unknown };
    if (parsed && (parsed.kind === 'token' || parsed.kind === 'session') && typeof parsed.value === 'string' && parsed.value) {
      return { kind: parsed.kind, value: parsed.value };
    }
  } catch {
    /* a bare token */
  }
  return raw.charAt(0) === '{' ? null : { kind: 'token', value: raw };
}

function keep(credential: Credential): void {
  try {
    if (credential.kind === 'session') {
      localStorage.setItem(PERSON_KEY, JSON.stringify(credential));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
    }
  } catch {
    /* private mode */
  }
}

function forget(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(PERSON_KEY);
  } catch {
    /* ignore */
  }
}

/** What this tab, then this browser, kept: the credential first (the editor's hand-off is newer), then a person's session. */
function kept(): Credential | null {
  try {
    const tab = parseStoredCredential(sessionStorage.getItem(STORAGE_KEY));
    if (tab) return tab;
  } catch {
    /* ignore */
  }
  try {
    const person = parseStoredCredential(localStorage.getItem(PERSON_KEY));
    return person && person.kind === 'session' ? person : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  return (await apiFull<T>(method, path, body, extraHeaders)).body;
}

/**
 * `api`, with the response headers beside the body — for the one list that
 * pages by a header (`GET /executions` answers a bare array and its count in
 * `X-Total-Count`, BMG-009). Same credential, same 401, same error sentence.
 */
export async function apiFull<T = any>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<{ body: T; headers: Headers }> {
  // `extraHeaders`: BMG-006's `If-Match` on the whole-config write; nothing else sends one.
  const { credential, whoami } = session.get();
  const headers: Record<string, string> = { ...credentialHeaders(credential), ...(extraHeaders || {}) };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  if (res.status === 401) {
    // Only tear down a session we actually had. The boot-time "is this backend
    // dev-open?" probe deliberately sends no credential, and its 401 is an
    // answer, not a failure.
    if (whoami) signOut('Your sign-in was rejected. Sign in again.');
    throw new ApiError('Unauthorized', 401);
  }
  if (res.status >= 400) {
    // The server's own message, verbatim — including the read-only tier's
    // refusal, which must never look like a generic failure.
    const message = (json && (json.error || json.message)) || 'HTTP ' + res.status;
    throw new ApiError(message, res.status);
  }
  return { body: json as T, headers: res.headers };
}

export function encode(part: unknown): string {
  return encodeURIComponent(String(part));
}

// --------------------------------------------------------------- session --

export async function signIn(credential: Credential | null, remember: boolean): Promise<void> {
  session.set({ credential });
  const data = await api<Whoami>('GET', '/_admin/whoami');
  if (remember && credential) keep(credential);
  session.set({ whoami: data, readonly: !!data.readonly, features: data.features || {}, loginError: null, booting: false });
}

/** Re-ask `whoami` (after the setup step, or when the page needs the live answer). */
export async function refreshWhoami(): Promise<Whoami> {
  const data = await api<Whoami>('GET', '/_admin/whoami');
  session.set({ whoami: data, readonly: !!data.readonly, features: data.features || {} });
  return data;
}

export function signOut(message?: string | null): void {
  closeLive();
  // A person's session outlives the tab now, so signing out ends it on the
  // server as well; nobody waits on the answer (a 401 means it already ended).
  const { credential } = session.get();
  if (credential && credential.kind === 'session') {
    fetch('/logout', { method: 'POST', headers: credentialHeaders(credential) }).catch(() => undefined);
  }
  forget();
  session.set({ credential: null, whoami: null, readonly: false, features: {}, loginError: message || null, booting: false });
}

/**
 * Boot order, and why:
 *  0. The editor's "Manage data & settings" button hands the credential over in
 *     the fragment (`#token=…`, optionally `&route=…` — the page to land on,
 *     BMG-012). A fragment never reaches the server or its logs; it is scrubbed
 *     from the address bar and this history entry before anything else runs,
 *     then behaves exactly like a kept token.
 *  1. A token kept for this tab signs straight back in; a rejected one falls
 *     back to the form rather than looping.
 *  2. Otherwise probe with NO credential and expect a 401 (FH-024: dev-open no
 *     longer relaxes the admin gate). A backend that answers it has regressed.
 */
export interface Handoff {
  /** The credential, or null: once an account exists the editor sends only the route (a person signs in). */
  token: string | null;
  /** A manager hash path to land on once signed in (`/schema/Pet/new-field`), or null. */
  route: string | null;
}

/**
 * Read the editor's hand-off out of a fragment (BMG-000, BMG-012).
 *
 *   #token=<credential>                            open on the home
 *   #token=<credential>&route=%2Fschema%2FPet%2Fnew-field   open on that page
 *   #route=%2Fschema%2FPet%2Fnew-field                     sign in (or be signed in), then that page
 *
 * The route is a path the router already understands (`parseHash`), sent by the
 * editor's two doors — the property panel's *Add a field* and the canvas's
 * *Add / Edit this trigger*. It is accepted only as a path: one leading `/`,
 * never `//` (a host to a browser), and nothing after a `#`. Anything else is
 * ignored and the page opens on its home, signed in — the credential is never
 * refused because the route was odd.
 */
export function readHandoff(hash: string): Handoff | null {
  const m = /^#token=([^&]+)(?:&(.*))?$/.exec(hash || '');
  const bare = !m && /^#route=/.test(hash || '') ? (hash || '').slice(1) : null;
  if (!m && bare === null) return null;
  let token: string | null = null;
  if (m) {
    token = m[1];
    try {
      token = decodeURIComponent(token);
    } catch {
      /* an undecodable credential is presented as typed; the server refuses it */
    }
  }
  let route: string | null = null;
  const rest = m ? m[2] : bare;
  if (rest) {
    const raw = new URLSearchParams(rest).get('route') || '';
    if (/^\/(?!\/)[^#\s]*$/.test(raw)) route = raw;
  }
  return { token, route };
}

export async function bootSession(): Promise<void> {
  const handoff = readHandoff(location.hash || '');
  let stored: Credential | null = null;
  if (handoff) {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      location.hash = '';
    }
    if (handoff.token) {
      stored = { kind: 'token', value: handoff.token };
      keep(stored);
    }
    // The route is set AFTER the fragment is scrubbed, so the address bar never
    // shows the credential and the router (which ignores `token=`) sees a plain
    // page path. `useRoute` listens for the change; a page that mounted on the
    // home before this line re-routes.
    if (handoff.route) location.hash = '#' + handoff.route;
  }
  if (!stored) stored = kept();
  if (stored) {
    try {
      await signIn(stored, true);
      return;
    } catch {
      forget();
    }
  }
  session.set({ credential: null });
  try {
    await signIn(null, false);
  } catch {
    session.set({ booting: false });
  }
}

/** The credential box's submit. Resolves on success; the error text is put on the form otherwise. */
export async function submitCredential(token: string, remember: boolean): Promise<boolean> {
  session.set({ loginError: null });
  try {
    await signIn({ kind: 'token', value: token }, remember);
    return true;
  } catch (e) {
    const err = e as ApiError;
    session.set({
      credential: null,
      loginError:
        err.status === 429
          ? err.message
          : 'That credential was rejected. It is the "adminToken" in the backend’s secrets.json, or the value passed to --token.'
    });
    return false;
  }
}

/**
 * BMG-014: the email + password form's submit. `POST /_admin/login` answers a
 * session for an account with backend access; the page then holds it like a
 * token. The server's one refusal sentence is shown as it is.
 */
export async function submitPassword(email: string, password: string, remember: boolean): Promise<boolean> {
  session.set({ loginError: null, credential: null });
  try {
    const res = await api<{ sessionToken: string }>('POST', '/_admin/login', { email, password });
    await signIn({ kind: 'session', value: res.sessionToken }, remember);
    return true;
  } catch (e) {
    const err = e as ApiError;
    session.set({ credential: null, loginError: err.message === 'Unauthorized' ? 'That email and password were not accepted.' : err.message });
    return false;
  }
}

/**
 * BMG-014: the setup step. Made with the credential the page holds; the answer
 * is a session for the new person, which replaces the credential in this tab
 * (kept if the credential was) — from here on the page is the person.
 */
export async function createAdminAccount(email: string, password: string): Promise<void> {
  const res = await api<{ sessionToken: string }>('POST', '/_admin/setup', { email, password });
  // Kept for this browser: the editor opens the manager without the credential
  // from now on, and this is the sign-in it finds.
  await signIn({ kind: 'session', value: res.sessionToken }, true);
}

// ------------------------------------------------------------------ live --

export type LiveState = 'off' | 'connecting' | 'live' | 'reconnecting';

export const live = createStore<{ state: LiveState; collection: string | null }>({ state: 'off', collection: null });

let source: EventSource | null = null;
let clientId: string | null = null;

/** Live updates reuse BAK-001's SSE stream: the page is just another subscriber. */
export function openLive(collection: string, onChange: () => void): void {
  closeLive();
  const { credential, features } = session.get();
  if (!collection || !features.realtime) return;
  const es = new EventSource('/realtime?' + liveQuery(credential));
  source = es;
  live.set({ state: 'connecting', collection });
  es.addEventListener('connected', (e) => {
    try {
      clientId = JSON.parse((e as MessageEvent).data).clientId;
    } catch {
      return;
    }
    api('POST', '/realtime/subscriptions', { clientId, subscriptions: [{ collection }] })
      .then(() => live.set({ state: 'live' }))
      .catch(() => live.set({ state: 'off' }));
  });
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const bump = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(onChange, 180);
  };
  es.addEventListener('change', bump);
  es.addEventListener('resync', bump);
  es.addEventListener('error', () => live.set({ state: 'reconnecting' }));
}

export function closeLive(): void {
  if (source) {
    source.close();
    source = null;
  }
  clientId = null;
  if (live.get().state !== 'off') live.set({ state: 'off', collection: null });
}
