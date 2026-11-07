/**
 * P135 ODT-001 — signing in to Cloudflare from NodeGX with no terminal (`cloudflare/signIn.ts`).
 *
 * Graded on real sockets: the flow listens on 127.0.0.1, the test plays the browser coming back from Cloudflare's
 * consent page (a GET on the redirect address), and a scripted token endpoint records every form it is sent. What
 * matters: PKCE is real (the verifier sent hashes to the challenge in the page address, no client secret anywhere),
 * an answer for another sign-in is refused without ending this one, nothing is saved unless Cloudflare hands over a
 * token, the token lands only in a 0600 file, and a refresh is done ONCE however many readers ask at the same time
 * (Cloudflare's server rotates refresh tokens: a second use can end the sign-in).
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import {
  CLOUDFLARE_SCOPES,
  cloudflareAccessToken,
  missingScopes,
  readSignIn,
  signOut,
  startSignIn,
  summarize,
  writeSignIn,
  SignInError,
  type FetchLike
} from '../cloudflare/signIn';

let home: string;
let file: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'odt001-'));
  file = path.join(home, 'cloudflare', 'sign-in.json');
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

/** A scripted token endpoint. `answer` decides each reply; every form is recorded. */
function tokenEndpoint(answer: (form: URLSearchParams, n: number) => { status: number; body: any } | Promise<{ status: number; body: any }>) {
  const forms: URLSearchParams[] = [];
  const urls: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    urls.push(url);
    const form = new URLSearchParams(init.body);
    forms.push(form);
    const { status, body } = await answer(form, forms.length);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetchImpl, forms, urls };
}

/** The browser coming back from Cloudflare: GET the redirect address with these parameters. */
function browserReturns(redirectUri: string, params: Record<string, string>): Promise<{ status: number; body: string }> {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Promise((resolve, reject) => {
    http
      .get(u, { agent: false }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

const GOOD = (n = 1) => ({
  status: 200,
  body: { access_token: `at-${n}`, refresh_token: `rt-${n}`, expires_in: 3600, scope: 'offline_access workers-scripts.edit registrar-domains.admin', token_type: 'bearer' }
});

const s256 = (v: string) => crypto.createHash('sha256').update(v).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('the sign-in', () => {
  test('PKCE end to end: the page address, the answer, the exchange, the file', async () => {
    const tok = tokenEndpoint(() => GOOD());
    const flow = await startSignIn({ clientId: 'client-1', port: 0, file, fetchImpl: tok.fetchImpl, tokenUrl: 'https://cf.test/token', authorizeUrl: 'https://cf.test/auth' });
    const page = new URL(flow.url);
    expect(page.origin + page.pathname).toBe('https://cf.test/auth');
    expect(page.searchParams.get('response_type')).toBe('code');
    expect(page.searchParams.get('client_id')).toBe('client-1');
    expect(page.searchParams.get('code_challenge_method')).toBe('S256');
    expect(page.searchParams.get('redirect_uri')).toBe(flow.redirectUri);
    expect(flow.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/oauth\/callback$/);
    expect(page.searchParams.get('scope')!.split(' ')).toEqual([...CLOUDFLARE_SCOPES]);

    const back = await browserReturns(flow.redirectUri, { code: 'the-code', state: page.searchParams.get('state')! });
    expect(back.status).toBe(200);
    expect(back.body).toMatch(/Signed in to Cloudflare/);
    const saved = await flow.done;

    // The exchange: the code, the SAME redirect address, the verifier that hashes to the page's challenge, no secret.
    expect(tok.urls).toEqual(['https://cf.test/token']);
    const form = tok.forms[0];
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('the-code');
    expect(form.get('redirect_uri')).toBe(flow.redirectUri);
    expect(form.get('client_id')).toBe('client-1');
    expect(s256(form.get('code_verifier')!)).toBe(page.searchParams.get('code_challenge'));
    expect(form.has('client_secret')).toBe(false);
    expect(flow.url).not.toContain(form.get('code_verifier')!);

    // The file: the token, 0600 in a 0700 folder, the GRANTED scopes; the page shown to the person has no token.
    expect(saved.accessToken).toBe('at-1');
    expect(readSignIn(file)).toEqual(saved);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(fs.statSync(path.dirname(file)).mode & 0o777).toBe(0o700);
    expect(saved.scopes).toEqual(['offline_access', 'workers-scripts.edit', 'registrar-domains.admin']);
    expect(back.body).not.toMatch(/at-1|rt-1/);
    expect(JSON.stringify(summarize(saved))).not.toMatch(/at-1|rt-1/);
    expect(missingScopes(saved)).toContain('dns.write');
    expect(missingScopes(saved)).not.toContain('offline_access');

    // The port is let go: the address answers nothing now.
    await new Promise((r) => setTimeout(r, 600));
    await expect(browserReturns(flow.redirectUri, {})).rejects.toThrow(/ECONNREFUSED/);
  });

  test('an answer for another sign-in is refused and this one keeps waiting', async () => {
    const tok = tokenEndpoint(() => GOOD());
    const flow = await startSignIn({ clientId: 'c', port: 0, file, fetchImpl: tok.fetchImpl });
    const stale = await browserReturns(flow.redirectUri, { code: 'x', state: 'someone-elses' });
    expect(stale.status).toBe(400);
    expect(stale.body).toMatch(/older sign-in/);
    expect(tok.forms).toHaveLength(0); // the stray code was never exchanged
    expect(fs.existsSync(file)).toBe(false);
    const state = new URL(flow.url).searchParams.get('state')!;
    expect((await browserReturns(flow.redirectUri, { code: 'y', state })).status).toBe(200);
    expect((await flow.done).accessToken).toBe('at-1');
  });

  test('Cancel on Cloudflare\'s page: nothing exchanged, nothing saved, the sentence says so', async () => {
    const tok = tokenEndpoint(() => GOOD());
    const flow = await startSignIn({ clientId: 'c', port: 0, file, fetchImpl: tok.fetchImpl });
    const state = new URL(flow.url).searchParams.get('state')!;
    const back = await browserReturns(flow.redirectUri, { error: 'access_denied', state });
    expect(back.body).toMatch(/chose not to allow NodeGX/);
    await expect(flow.done).rejects.toMatchObject({ code: 'cancelled' });
    expect(tok.forms).toHaveLength(0);
    expect(fs.existsSync(file)).toBe(false);
  });

  test('a refused exchange saves nothing and says Cloudflare\'s reason', async () => {
    const tok = tokenEndpoint(() => ({ status: 400, body: { error: 'invalid_grant', error_description: 'The authorization code has expired.' } }));
    const flow = await startSignIn({ clientId: 'c', port: 0, file, fetchImpl: tok.fetchImpl });
    const state = new URL(flow.url).searchParams.get('state')!;
    const back = await browserReturns(flow.redirectUri, { code: 'old', state });
    expect(back.body).toMatch(/authorization code has expired/);
    await expect(flow.done).rejects.toThrow(/did not hand over the sign-in: The authorization code has expired/);
    expect(fs.existsSync(file)).toBe(false);
  });

  test('a second sign-in on a taken port is refused in words; an unanswered page times out', async () => {
    const first = await startSignIn({ clientId: 'c', port: 0, file, timeoutMs: 80 });
    const port = Number(new URL(first.redirectUri).port);
    await expect(startSignIn({ clientId: 'c', port, file })).rejects.toMatchObject({ code: 'port-busy' });
    await expect(first.done).rejects.toMatchObject({ code: 'timeout' });
    expect(fs.existsSync(file)).toBe(false);
  });

  test('the redirect host can be localhost (for ODT-000 (a)); the listener stays on 127.0.0.1', async () => {
    const flow = await startSignIn({ clientId: 'c', port: 0, file, redirectHost: 'localhost' });
    expect(flow.redirectUri).toMatch(/^http:\/\/localhost:\d+\/oauth\/callback$/);
    flow.cancel();
    await expect(flow.done).rejects.toBeInstanceOf(SignInError);
  });
});

describe('using the sign-in', () => {
  const T0 = Date.parse('2026-11-07T20:00:00Z');
  const saved = (expiresAt: number, refreshToken: string | null = 'rt-0') =>
    writeSignIn({ clientId: 'c', accessToken: 'at-0', refreshToken: refreshToken ?? undefined, expiresAt: new Date(expiresAt).toISOString(), scopes: ['workers-scripts.edit'], signedInAt: new Date(T0 - 3600e3).toISOString() }, file);

  test('never signed in: null, and no call', async () => {
    const tok = tokenEndpoint(() => GOOD());
    expect(await cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).toBeNull();
    expect(tok.forms).toHaveLength(0);
  });

  test('a token with time left is used as it is', async () => {
    saved(T0 + 10 * 60e3);
    const tok = tokenEndpoint(() => GOOD());
    expect(await cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).toBe('at-0');
    expect(tok.forms).toHaveLength(0);
  });

  test('about to run out: ONE refresh for three readers at once, the rotated refresh token kept', async () => {
    saved(T0 + 30e3); // inside the one-minute margin
    const tok = tokenEndpoint(async (_f, n) => {
      await new Promise((r) => setTimeout(r, 150)); // slow enough that the other readers queue on the lock
      return { status: 200, body: { access_token: `at-${n}`, refresh_token: `rt-${n}`, expires_in: 3600 } };
    });
    const got = await Promise.all([1, 2, 3].map(() => cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })));
    expect(got).toEqual(['at-1', 'at-1', 'at-1']);
    expect(tok.forms).toHaveLength(1);
    expect(tok.forms[0].get('grant_type')).toBe('refresh_token');
    expect(tok.forms[0].get('refresh_token')).toBe('rt-0');
    const after = readSignIn(file)!;
    expect(after.refreshToken).toBe('rt-1');
    expect(after.scopes).toEqual(['workers-scripts.edit']); // no `scope` in the answer: the old grant stands
    expect(after.refreshedAt).toBeDefined();
    expect(fs.existsSync(`${file}.lock`)).toBe(false);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  test('forced (ODT-000 (d)): renews once with time left; without force the same file is used as it is', async () => {
    saved(T0 + 30 * 60e3);
    const tok = tokenEndpoint((_f, n) => GOOD(n));
    expect(await cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).toBe('at-0');
    expect(await cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0, force: true })).toBe('at-1');
    expect(tok.forms).toHaveLength(1);
    expect(readSignIn(file)!.refreshToken).toBe('rt-1');
  });

  test('a dead refresh token: the file goes and the sentence asks for one more sign-in', async () => {
    saved(T0 - 1);
    const tok = tokenEndpoint(() => ({ status: 400, body: { error: 'invalid_grant' } }));
    await expect(cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).rejects.toMatchObject({ code: 'expired' });
    expect(fs.existsSync(file)).toBe(false);
  });

  test('expired with no refresh token: asks for a sign-in, calls nothing', async () => {
    saved(T0 - 1, null);
    const tok = tokenEndpoint(() => GOOD());
    await expect(cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).rejects.toThrow(/sign in to Cloudflare again/);
    expect(tok.forms).toHaveLength(0);
  });

  test('a lock left by a crashed process is taken over after 30 s', async () => {
    saved(T0 - 1);
    fs.writeFileSync(`${file}.lock`, '');
    const old = new Date(Date.now() - 60e3);
    fs.utimesSync(`${file}.lock`, old, old);
    const tok = tokenEndpoint(() => GOOD(7));
    expect(await cloudflareAccessToken({ file, fetchImpl: tok.fetchImpl, now: () => T0 })).toBe('at-7');
  });

  test('sign out: revoked at Cloudflare with the refresh token, the file gone', async () => {
    saved(T0 + 3600e3);
    const tok = tokenEndpoint(() => ({ status: 200, body: {} }));
    expect(await signOut({ file, fetchImpl: tok.fetchImpl, revokeUrl: 'https://cf.test/revoke' })).toEqual({ wasSignedIn: true, revoked: true });
    expect(tok.urls).toEqual(['https://cf.test/revoke']);
    expect(tok.forms[0].get('token')).toBe('rt-0');
    expect(fs.existsSync(file)).toBe(false);
    expect(await signOut({ file, fetchImpl: tok.fetchImpl })).toEqual({ wasSignedIn: false, revoked: false });
  });
});

describe('the domain command reads the same sign-in (HST-018 through ODT-001)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });
  const ours = (scopes: string[]) =>
    writeSignIn({ clientId: 'c', accessToken: 'at-ours', refreshToken: 'rt', expiresAt: new Date(Date.now() + 3600e3).toISOString(), scopes, signedInAt: new Date().toISOString() }, file);

  test('granted the registrar: NodeGX\'s sign-in is the credential; an explicit token still wins; without the registrar it is passed over', async () => {
    const { domainCredential } = await import('../cloudflare/domainCommand');
    process.env.NODEGX_CLOUDFLARE_HOME = path.dirname(file);
    delete process.env.CLOUDFLARE_API_TOKEN;
    ours(['workers-scripts.edit', 'registrar-domains.admin']);
    expect(await domainCredential()).toBe('at-ours');
    process.env.CLOUDFLARE_API_TOKEN = 'explicit';
    expect(await domainCredential()).toBe('explicit');
    delete process.env.CLOUDFLARE_API_TOKEN;
    ours(['workers-scripts.edit']);
    // Falls through to `cf`'s sign-in or the token file (this machine may have a real one: only "not ours" is asserted).
    expect(await domainCredential().catch(() => 'refused')).not.toBe('at-ours');
  });
});
