/**
 * One client, one credential, one error convention — and the session.
 *
 * BAK-003's admin credential, unchanged: held as a bearer token in
 * `sessionStorage`, sent on every request. No dashboard session, no cookie, no
 * CSRF surface. The read-only tier is a second credential the server refuses
 * writes for; this file only remembers that it is the read-only one so buttons
 * can say so.
 */
import { createStore, useStore } from './store';

export interface Whoami {
  ok: boolean;
  readonly: boolean;
  backend: { id: string; name: string; host: string; port: number };
  security: { devOpen: boolean; enforced: boolean; hasReadonlyTier: boolean };
  firstRun: boolean;
  features: Record<string, boolean>;
}

export interface SessionState {
  token: string | null;
  whoami: Whoami | null;
  readonly: boolean;
  features: Record<string, boolean>;
  /** Shown on the sign-in form: why the last session ended, or why a credential was refused. */
  loginError: string | null;
  /** True while the boot probe runs, so the form does not flash before a kept token is tried. */
  booting: boolean;
}

export const session = createStore<SessionState>({
  token: null,
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const { token, whoami } = session.get();
  if (token) headers.authorization = 'Bearer ' + token;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  if (res.status === 401) {
    // Only tear down a session we actually had. The boot-time "is this backend
    // dev-open?" probe deliberately sends no credential, and its 401 is an
    // answer, not a failure.
    if (whoami) signOut('The admin credential was rejected. Sign in again.');
    throw new ApiError('Unauthorized', 401);
  }
  if (res.status >= 400) {
    // The server's own message, verbatim — including the read-only tier's
    // refusal, which must never look like a generic failure.
    const message = (json && (json.error || json.message)) || 'HTTP ' + res.status;
    throw new ApiError(message, res.status);
  }
  return json as T;
}

export function encode(part: unknown): string {
  return encodeURIComponent(String(part));
}

// --------------------------------------------------------------- session --

export async function signIn(token: string | null, remember: boolean): Promise<void> {
  session.set({ token });
  const data = await api<Whoami>('GET', '/_admin/whoami');
  if (remember && token) {
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* private mode */
    }
  }
  session.set({ whoami: data, readonly: !!data.readonly, features: data.features || {}, loginError: null, booting: false });
}

export function signOut(message?: string | null): void {
  closeLive();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  session.set({ token: null, whoami: null, readonly: false, features: {}, loginError: message || null, booting: false });
}

/**
 * Boot order, and why:
 *  0. The editor's "Manage data & settings" button hands the credential over in
 *     the fragment (`#token=…`). A fragment never reaches the server or its
 *     logs; it is scrubbed from the address bar and this history entry before
 *     anything else runs, then behaves exactly like a kept token.
 *  1. A token kept for this tab signs straight back in; a rejected one falls
 *     back to the form rather than looping.
 *  2. Otherwise probe with NO credential and expect a 401 (FH-024: dev-open no
 *     longer relaxes the admin gate). A backend that answers it has regressed.
 */
export async function bootSession(): Promise<void> {
  const handoff = /^#token=([^&]+)/.exec(location.hash || '');
  let stored: string | null = null;
  if (handoff) {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      location.hash = '';
    }
    stored = decodeURIComponent(handoff[1]);
    try {
      sessionStorage.setItem(STORAGE_KEY, stored);
    } catch {
      /* private mode */
    }
  }
  if (!stored) {
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
  }
  if (stored) {
    try {
      await signIn(stored, true);
      return;
    } catch {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  session.set({ token: null });
  try {
    await signIn(null, false);
  } catch {
    session.set({ booting: false });
  }
}

/** The sign-in form's submit. Resolves on success; the error text is put on the form otherwise. */
export async function submitCredential(token: string, remember: boolean): Promise<boolean> {
  session.set({ loginError: null });
  try {
    await signIn(token, remember);
    return true;
  } catch (e) {
    const err = e as ApiError;
    session.set({
      token: null,
      loginError:
        err.status === 429
          ? err.message
          : 'That credential was rejected. It is the "adminToken" in the backend’s secrets.json, or the value passed to --token.'
    });
    return false;
  }
}

// ------------------------------------------------------------------ live --

export type LiveState = 'off' | 'connecting' | 'live' | 'reconnecting';

export const live = createStore<{ state: LiveState; collection: string | null }>({ state: 'off', collection: null });

let source: EventSource | null = null;
let clientId: string | null = null;

/** Live updates reuse BAK-001's SSE stream: the page is just another subscriber. */
export function openLive(collection: string, onChange: () => void): void {
  closeLive();
  const { token, features } = session.get();
  if (!collection || !features.realtime) return;
  const es = new EventSource('/realtime?authToken=' + encode(token || ''));
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
