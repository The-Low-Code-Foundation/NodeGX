/**
 * P135 ODT-001 — signing in to Cloudflare from NodeGX itself, with no terminal.
 *
 * Richard, 2026-11-07: *"They're in Claude Desktop rocking out with a new app and they say 'let's get it online with
 * CloudFlare'. What can Claude Desktop do to trigger the OAuth and save the token?"* Claude Desktop cannot start a
 * sign-in for a local connector (P115 HST-018 §7), so the connector does it: it opens Cloudflare's consent page in the
 * person's browser, takes the answer on a loopback address (RFC 8252 §7.3), and keeps the token on this machine.
 *
 * ## The flow (Cloudflare's docs, read 2026-11-07: *Create your OAuth client*, last updated 2026-08-20; *Integrate
 * your OAuth client*, 2026-06-03)
 *
 * A desktop app is a PUBLIC client: Authorization Code with PKCE, `S256`, token endpoint authentication `none`, no
 * client secret. Cloudflare offers third-party clients nothing else (no device grant, no client credentials).
 * Endpoints: `https://dash.cloudflare.com/oauth2/{auth,token,revoke}`.
 *
 * ## Where the token lives
 *
 * `~/.nodegx/cloudflare/sign-in.json` (`NODEGX_CLOUDFLARE_HOME` moves the folder, as for the domain command), mode
 * `0600` in a `0700` folder, written to a temporary file and renamed so a reader never meets half a file. Never in a
 * project, an `.env`, or any text this module returns: every sentence below is safe to show the person.
 *
 * ## 🔴 Two readers, one refresh token
 *
 * Claude Desktop runs more than one copy of the connector (two `node` processes from the extension were alive on
 * Richard's machine, 2026-11-07), and the domain command reads the same file. Cloudflare's OAuth server is Ory Hydra
 * shaped (`/oauth2/auth`, `/oauth2/token`, `/.well-known/openid-configuration`), and Hydra ROTATES refresh tokens: a
 * refresh token used twice can revoke the whole sign-in. So a refresh happens under a lock file, and the file is read
 * again inside the lock: whoever arrives second finds the fresh token and does not refresh.
 *
 * ## Not measured yet (ODT-000, on a private client on Richard's account)
 *
 * (a) whether a `http://127.0.0.1:<port>/…` redirect is accepted, and whether the port must match the registered one
 * exactly (so the port is FIXED by default: {@link CALLBACK_PORT}); (b) which of {@link CLOUDFLARE_SCOPES} a
 * third-party client is granted (all are in `GET /oauth/scopes`, the catalog a client is created from, read
 * 2026-11-07: 403 scopes); (d) the access and refresh tokens' lifetimes, and whether `offline_access` is what gives a
 * refresh token. The code reads what the answer says rather than assuming any of them.
 *
 * @module nodegx-backend/cloudflare/signIn
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';

export const CLOUDFLARE_AUTHORIZE_URL = 'https://dash.cloudflare.com/oauth2/auth';
export const CLOUDFLARE_TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
export const CLOUDFLARE_REVOKE_URL = 'https://dash.cloudflare.com/oauth2/revoke';

/**
 * NodeGX's own Cloudflare OAuth client. **Empty until ODT-005 makes one public** (a ruling: R2, permanent).
 * `NODEGX_CLOUDFLARE_CLIENT_ID` names a private client for the measurements (ODT-000): only members of the account
 * that owns a private client can sign in with it. A client id is not a secret (PKCE has none).
 */
export const NODEGX_CLOUDFLARE_CLIENT_ID = '';

/** Fixed until ODT-000 (a) says whether Cloudflare matches a loopback redirect's port. wrangler uses 8976. */
export const CALLBACK_PORT = 8977;
export const CALLBACK_PATH = '/oauth/callback';

/**
 * What putting an app online, its files, its domain and its email need (P115's deploy and HST-018's purchase), named
 * as Cloudflare's OAuth catalog names them (`GET /oauth/scopes`, 2026-11-07). `offline_access` asks for a refresh
 * token (Hydra's convention; the discovery document lists it).
 */
export const CLOUDFLARE_SCOPES: readonly string[] = [
  'offline_access',
  'user-details.read',
  'account-settings.read',
  'workers-scripts.edit',
  'workers-kv-storage.write',
  'workers-r2.write',
  'workers-routes.write',
  'zone.read',
  'dns.write',
  'email-sending.write',
  'registrar-domains.admin'
];

/** How long a refresh is waited for when another process holds the lock, and when a lock counts as abandoned. */
const LOCK_WAIT_MS = 15_000;
const LOCK_STALE_MS = 30_000;
/** A token this close to its expiry is refreshed first. */
const EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;

/** Every message is a sentence for the person: no token, no code, no verifier is ever in one. */
export class SignInError extends Error {
  constructor(message: string, readonly code: 'not-configured' | 'cancelled' | 'refused' | 'timeout' | 'port-busy' | 'expired' | 'failed') {
    super(message);
    this.name = 'SignInError';
  }
}

export interface CloudflareSignIn {
  clientId: string;
  accessToken: string;
  refreshToken?: string;
  /** ISO time the access token stops working. */
  expiresAt: string;
  /** What Cloudflare GRANTED (the token answer's `scope`), else what was asked for. */
  scopes: string[];
  signedInAt: string;
  refreshedAt?: string;
}

/** The sign-in as it may be shown: no token in it. */
export interface SignInSummary {
  signedIn: boolean;
  scopes: string[];
  expiresAt?: string;
  canRefresh: boolean;
  signedInAt?: string;
  clientId?: string;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
}>;

interface Endpoints {
  authorizeUrl?: string;
  tokenUrl?: string;
  revokeUrl?: string;
  fetchImpl?: FetchLike;
  /** The sign-in file (default {@link signInFile}). */
  file?: string;
  now?: () => number;
}

export function cloudflareHome(): string {
  return process.env.NODEGX_CLOUDFLARE_HOME || path.join(os.homedir(), '.nodegx', 'cloudflare');
}

export function signInFile(): string {
  return path.join(cloudflareHome(), 'sign-in.json');
}

/**
 * The endpoints and callback port a caller starts with: Cloudflare's, unless `NODEGX_CF_OAUTH_BASE` points at a test
 * server (the way `NODEGX_CF_API` moves the domain command's API) and `NODEGX_CF_CALLBACK_PORT` moves the port (`0`
 * = any; ODT-000 (a) measures whether Cloudflare allows that).
 */
export function oauthSettings(): { authorizeUrl: string; tokenUrl: string; revokeUrl: string; port: number } {
  const base = process.env.NODEGX_CF_OAUTH_BASE?.replace(/\/+$/, '');
  const port = process.env.NODEGX_CF_CALLBACK_PORT;
  return {
    authorizeUrl: base ? `${base}/oauth2/auth` : CLOUDFLARE_AUTHORIZE_URL,
    tokenUrl: base ? `${base}/oauth2/token` : CLOUDFLARE_TOKEN_URL,
    revokeUrl: base ? `${base}/oauth2/revoke` : CLOUDFLARE_REVOKE_URL,
    port: port !== undefined && /^\d+$/.test(port) ? Number(port) : CALLBACK_PORT
  };
}

/** The client to sign in with, or null: the environment's private client first, then NodeGX's public one. */
export function cloudflareClientId(): string | null {
  const id = (process.env.NODEGX_CLOUDFLARE_CLIENT_ID || NODEGX_CLOUDFLARE_CLIENT_ID).trim();
  return id || null;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** RFC 7636: a 43-character verifier from 32 random bytes, and its S256 challenge. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(o: {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  challenge: string;
  base?: string;
}): string {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    scope: o.scopes.join(' '),
    state: o.state,
    code_challenge: o.challenge,
    code_challenge_method: 'S256'
  });
  return `${o.base ?? CLOUDFLARE_AUTHORIZE_URL}?${q.toString()}`;
}

// ---------------------------------------------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------------------------------------------

export function readSignIn(file = signInFile()): CloudflareSignIn | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  try {
    const s = JSON.parse(raw) as CloudflareSignIn;
    return typeof s.accessToken === 'string' && s.accessToken ? s : null;
  } catch {
    return null;
  }
}

export function writeSignIn(s: CloudflareSignIn, file = signInFile()): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(tmp, 0o600); // a umask cannot widen it, but a pre-existing tmp name could have; belt and braces
  fs.renameSync(tmp, file);
}

export function summarize(s: CloudflareSignIn | null): SignInSummary {
  if (!s) return { signedIn: false, scopes: [], canRefresh: false };
  return {
    signedIn: true,
    scopes: s.scopes,
    expiresAt: s.expiresAt,
    canRefresh: !!s.refreshToken,
    signedInAt: s.signedInAt,
    clientId: s.clientId
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The token endpoint
// ---------------------------------------------------------------------------------------------------------------

interface TokenAnswer {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as any;

async function tokenRequest(form: Record<string, string>, o: Endpoints): Promise<TokenAnswer> {
  const res = await (o.fetchImpl ?? defaultFetch)(o.tokenUrl ?? CLOUDFLARE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams(form).toString()
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok || !body?.access_token) {
    const why = String(body?.error_description || body?.error || `HTTP ${res.status}`).slice(0, 300);
    const err = new SignInError(`Cloudflare did not hand over the sign-in: ${why}`, 'failed');
    (err as any).oauthError = body?.error;
    throw err;
  }
  return body as TokenAnswer;
}

function fromAnswer(a: TokenAnswer, clientId: string, asked: readonly string[], now: number, previous?: CloudflareSignIn): CloudflareSignIn {
  return {
    clientId,
    accessToken: a.access_token,
    refreshToken: a.refresh_token ?? previous?.refreshToken,
    // No `expires_in` is read as one hour (Hydra's default) rather than as "forever".
    expiresAt: new Date(now + (typeof a.expires_in === 'number' ? a.expires_in : 3600) * 1000).toISOString(),
    scopes: a.scope ? a.scope.split(/\s+/).filter(Boolean) : previous?.scopes ?? [...asked],
    signedInAt: previous?.signedInAt ?? new Date(now).toISOString(),
    ...(previous ? { refreshedAt: new Date(now).toISOString() } : {})
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The sign-in itself
// ---------------------------------------------------------------------------------------------------------------

export interface SignInFlow {
  /** Cloudflare's consent page, for the browser. Carries the PKCE challenge and the state, never the verifier. */
  url: string;
  redirectUri: string;
  /** Settles once: the saved sign-in, or a {@link SignInError} in words. */
  done: Promise<CloudflareSignIn>;
  cancel(): void;
}

export interface StartOptions extends Endpoints {
  clientId: string;
  scopes?: readonly string[];
  /** 0 = any free port (only once ODT-000 (a) says Cloudflare accepts it). */
  port?: number;
  /** `127.0.0.1` (RFC 8252's advice) unless ODT-000 says Cloudflare wants `localhost`. The listener is 127.0.0.1. */
  redirectHost?: '127.0.0.1' | 'localhost';
  timeoutMs?: number;
}

function page(title: string, words: string): string {
  const esc = (t: string) => t.replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' })[c]!);
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>${esc(title)}</title></head><body style="margin:0;padding:48px 24px;font:16px/1.5 system-ui,sans-serif;` +
    'background:#0b0e12;color:#e6edf3"><main style="max-width:520px;margin:0 auto">' +
    `<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1><p style="margin:0;color:#c4cedb">${esc(words)}</p>` +
    '</main></body></html>'
  );
}

/** Cloudflare's `error` on the redirect, as a sentence. */
function refusalSentence(error: string, description: string | null): SignInError {
  if (error === 'access_denied') {
    return new SignInError('You chose not to allow NodeGX on the Cloudflare page, so nothing was saved. Ask again whenever you want to sign in.', 'cancelled');
  }
  const why = (description || error).slice(0, 300);
  return new SignInError(`Cloudflare refused the sign-in: ${why}`, 'refused');
}

/**
 * Starts listening, and hands back the page to open. Nothing is opened here: the caller opens it (the connector with
 * `openInBrowser`, a terminal by printing it), so a test drives the whole flow without a browser.
 */
export async function startSignIn(o: StartOptions): Promise<SignInFlow> {
  const now = o.now ?? Date.now;
  const scopes = o.scopes ?? CLOUDFLARE_SCOPES;
  const { verifier, challenge } = pkcePair();
  const state = base64url(crypto.randomBytes(16));

  let settle!: { resolve: (s: CloudflareSignIn) => void; reject: (e: Error) => void };
  const done = new Promise<CloudflareSignIn>((resolve, reject) => (settle = { resolve, reject }));
  done.catch(() => undefined); // a caller that only reads the url must not see an unhandled rejection
  let finished = false;
  let timer: NodeJS.Timeout | undefined;
  const server = http.createServer();
  const finish = (err: Error | null, s?: CloudflareSignIn) => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    server.close();
    // A keep-alive browser connection would hold the port open past close(): end them once the last page is out.
    setTimeout(() => (server as any).closeAllConnections?.(), 500).unref?.();
    if (err) settle.reject(err);
    else settle.resolve(s!);
  };

  let redirectUri = '';
  server.on('request', (req, res) => {
    const u = new URL(req.url ?? '/', 'http://127.0.0.1');
    const reply = (status: number, title: string, words: string) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(page(title, words));
    };
    if (req.method !== 'GET' || u.pathname !== CALLBACK_PATH) return reply(404, 'Not here', 'This address only takes Cloudflare\'s answer to a NodeGX sign-in.');
    // Not this sign-in's answer (an old tab, another page): say so and keep waiting for the real one.
    if (u.searchParams.get('state') !== state) {
      return reply(400, 'Not this sign-in', 'This answer belongs to an older sign-in. Use the Cloudflare page NodeGX opened most recently.');
    }
    if (finished) return reply(410, 'Already done', 'This sign-in has already finished. You can close this tab.');
    const error = u.searchParams.get('error');
    if (error) {
      const e = refusalSentence(error, u.searchParams.get('error_description'));
      reply(200, e.code === 'cancelled' ? 'Not signed in' : 'Cloudflare said no', e.message);
      return finish(e);
    }
    const code = u.searchParams.get('code');
    if (!code) return reply(400, 'No answer', 'Cloudflare\'s answer had no code in it. Ask Claude to sign in to Cloudflare again.');
    tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: o.clientId, code_verifier: verifier }, o)
      .then((a) => {
        const s = fromAnswer(a, o.clientId, scopes, now());
        writeSignIn(s, o.file);
        reply(200, 'Signed in to Cloudflare', 'NodeGX can now put your app online on your Cloudflare account. You can close this tab and go back to Claude.');
        finish(null, s);
      })
      .catch((e: Error) => {
        const err = e instanceof SignInError ? e : new SignInError(`The sign-in could not be finished: ${e.message}`, 'failed');
        reply(200, 'Not signed in', err.message);
        finish(err);
      });
  });

  const wanted = o.port ?? CALLBACK_PORT;
  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) =>
      reject(
        e.code === 'EADDRINUSE'
          ? new SignInError(`Another sign-in is already waiting on this computer (port ${wanted} is taken). Finish or close that one, then ask again.`, 'port-busy')
          : e
      )
    );
    server.listen(wanted, '127.0.0.1', () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  redirectUri = `http://${o.redirectHost ?? '127.0.0.1'}:${port}${CALLBACK_PATH}`;
  timer = setTimeout(
    () => finish(new SignInError('The Cloudflare page was not answered in time, so the sign-in was stopped. Ask again to open it once more.', 'timeout')),
    o.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
  timer.unref?.();

  return {
    url: authorizeUrl({ clientId: o.clientId, redirectUri, scopes, state, challenge, base: o.authorizeUrl }),
    redirectUri,
    done,
    cancel: () => finish(new SignInError('The sign-in was stopped before Cloudflare answered.', 'cancelled'))
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Using it: a live access token, refreshed under a lock
// ---------------------------------------------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const lock = `${file}.lock`;
  const started = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lock, 'wx', 0o600);
      fs.closeSync(fd);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.rmSync(lock, { force: true });
      } catch {
        /* gone already */
      }
      if (Date.now() - started > LOCK_WAIT_MS) {
        throw new SignInError('Another part of NodeGX is renewing the Cloudflare sign-in and has not finished. Try again in a moment.', 'failed');
      }
      await sleep(100);
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

const expiredSentence = () =>
  new SignInError('Your Cloudflare sign-in has run out. Ask Claude to sign in to Cloudflare again (one page, one click).', 'expired');

/**
 * The access token to call Cloudflare with, refreshed first when it is about to run out; `null` when the person has
 * never signed in. Throws {@link SignInError} (`expired`) when it cannot be renewed.
 */
export async function cloudflareAccessToken(o: Endpoints & { /** Renew even with time left (ODT-000 (d)). */ force?: boolean } = {}): Promise<string | null> {
  const file = o.file ?? signInFile();
  const now = o.now ?? Date.now;
  const first = readSignIn(file);
  // Forced: "fresh" only once the file shows a renewal made after this call began.
  const began = now();
  const fresh = (s: CloudflareSignIn) =>
    o.force ? !!s.refreshedAt && Date.parse(s.refreshedAt) >= began && s !== first : Date.parse(s.expiresAt) - EXPIRY_MARGIN_MS > now();
  if (!first) return null;
  if (fresh(first)) return first.accessToken;
  if (!first.refreshToken) throw expiredSentence();
  return withLock(file, async () => {
    const s = readSignIn(file);
    if (!s) return null;
    if (fresh(s)) return s.accessToken; // another process renewed it while this one waited
    if (!s.refreshToken) throw expiredSentence();
    let a: TokenAnswer;
    try {
      a = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refreshToken, client_id: s.clientId }, o);
    } catch (e) {
      // invalid_grant = the refresh token is dead (revoked, expired, reused): the file is no use to anyone.
      if ((e as any).oauthError === 'invalid_grant') {
        fs.rmSync(file, { force: true });
        throw expiredSentence();
      }
      throw e;
    }
    const next = fromAnswer(a, s.clientId, s.scopes, now(), s);
    writeSignIn(next, file);
    return next.accessToken;
  });
}

/** Forgets the sign-in on this computer and asks Cloudflare to revoke it (best effort: the file goes either way). */
export async function signOut(o: Endpoints = {}): Promise<{ wasSignedIn: boolean; revoked: boolean }> {
  const file = o.file ?? signInFile();
  const s = readSignIn(file);
  if (!s) return { wasSignedIn: false, revoked: false };
  let revoked = false;
  try {
    const token = s.refreshToken ?? s.accessToken;
    const res = await (o.fetchImpl ?? defaultFetch)(o.revokeUrl ?? CLOUDFLARE_REVOKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: s.clientId }).toString()
    });
    revoked = res.ok;
  } catch {
    /* offline: the file still goes */
  }
  fs.rmSync(file, { force: true });
  return { wasSignedIn: true, revoked };
}

/** Of `wanted`, the scopes the sign-in was NOT granted (`offline_access` is not a permission and is never missing). */
export function missingScopes(s: CloudflareSignIn | SignInSummary, wanted: readonly string[] = CLOUDFLARE_SCOPES): string[] {
  const have = new Set(s.scopes);
  return wanted.filter((w) => w !== 'offline_access' && !have.has(w));
}
