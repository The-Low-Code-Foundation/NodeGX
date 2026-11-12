/**
 * P135 ODT-001 — `cloudflare_sign_in` through the MCP surface, the way Claude Desktop calls it.
 *
 * A local HTTP server plays Cloudflare's token and revoke endpoints (`NODEGX_CF_OAUTH_BASE`); the test plays the
 * person's browser coming back from the consent page. `NODEGX_STUDIO_NO_OPEN` keeps a real browser shut, which is
 * also the "it could not open" branch: the answer then carries the page to open. The flow, the file and the refresh
 * are graded in `nodegx-backend/tests/p135-odt001-cloudflare-sign-in.test.ts`; this suite grades what Claude is told,
 * that the call answers before the person has clicked and the NEXT call finds the result, and that no token is ever
 * in a tool result.
 */
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';

import { call, connect, copyFixture, reveal, type TestSession } from './helpers';
import { resetCloudflareSignIn } from '../src/tools/cloudflareSignIn';

interface Answer {
  signedIn: boolean;
  waiting?: boolean;
  page?: string;
  say: string;
  scopes?: string[];
  cannot?: string[];
}
interface Err {
  error: { code: string; message: string; details?: { reason?: string } };
}

const ENV = ['NODEGX_CLOUDFLARE_HOME', 'NODEGX_STUDIO_NO_OPEN', 'NODEGX_CF_OAUTH_BASE', 'NODEGX_CF_CALLBACK_PORT', 'NODEGX_CF_SIGNIN_WAIT_MS', 'NODEGX_CLOUDFLARE_CLIENT_ID'];

describe('P135 ODT-001 — cloudflare_sign_in', () => {
  let session: TestSession;
  let cf: http.Server;
  let home: string;
  const seen: Array<{ path: string; form: URLSearchParams }> = [];
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const k of ENV) saved[k] = process.env[k];
    cf = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ path: req.url ?? '', form: new URLSearchParams(body) });
        res.setHeader('content-type', 'application/json');
        if (req.url === '/oauth2/token') {
          // Granted without the registrar: the answer must say what the person cannot do yet.
          res.end(JSON.stringify({ access_token: 'AT-SECRET-1', refresh_token: 'RT-SECRET-1', expires_in: 3600, scope: 'offline_access workers-scripts.edit workers-r2.write' }));
        } else res.end('{}');
      });
    });
    await new Promise<void>((r) => cf.listen(0, '127.0.0.1', r));
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'odt001-mcp-'));
    process.env.NODEGX_CLOUDFLARE_HOME = home;
    process.env.NODEGX_STUDIO_NO_OPEN = '1';
    process.env.NODEGX_CF_OAUTH_BASE = `http://127.0.0.1:${(cf.address() as AddressInfo).port}`;
    process.env.NODEGX_CF_CALLBACK_PORT = '0';
    process.env.NODEGX_CF_SIGNIN_WAIT_MS = '150';
    session = await connect(copyFixture());
  });

  afterAll(async () => {
    resetCloudflareSignIn();
    await session.close();
    cf.close();
    fs.rmSync(home, { recursive: true, force: true });
    for (const k of ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  test('deferred in the project group, reached by the words a person uses', async () => {
    const before = await session.client.listTools();
    expect(before.tools.map((t) => t.name)).not.toContain('cloudflare_sign_in');
    const found = await call<{ revealed?: string[]; tools?: Array<{ name: string }> }>(session, 'find_tools', { query: 'cloudflare' });
    expect(JSON.stringify(found.data)).toContain('cloudflare_sign_in');
    await reveal(session, 'project');
    expect((await session.client.listTools()).tools.map((t) => t.name)).toContain('cloudflare_sign_in');
  });

  test('without NodeGX\'s client switched on: refused in words, nothing listens, nothing saved', async () => {
    delete process.env.NODEGX_CLOUDFLARE_CLIENT_ID;
    const r = await call<Err>(session, 'cloudflare_sign_in', {});
    expect(r.isError).toBe(true);
    expect(r.data.error.message).toMatch(/not switched on in this version of NodeGX/);
    expect(r.data.error.details?.reason).toBe('not-configured');
    expect(fs.existsSync(path.join(home, 'sign-in.json'))).toBe(false);
  });

  test('the page, the click, the next call finds it; no token in any answer; sign out revokes', async () => {
    process.env.NODEGX_CLOUDFLARE_CLIENT_ID = 'private-client-1';
    expect((await call<Answer>(session, 'cloudflare_sign_in', { action: 'status' })).data).toMatchObject({ signedIn: false });

    // 1. The call answers before the person clicks, with the page (no browser could be opened here).
    const first = await call<Answer>(session, 'cloudflare_sign_in', {});
    expect(first.isError).toBe(false);
    expect(first.data).toMatchObject({ signedIn: false, waiting: true });
    expect(first.data.say).toMatch(/click Allow/);
    const page = new URL(first.data.page!);
    expect(page.pathname).toBe('/oauth2/auth');
    expect(page.searchParams.get('client_id')).toBe('private-client-1');
    expect(page.searchParams.get('code_challenge_method')).toBe('S256');

    // 2. Still waiting: asking again does not open a second page (same address, same state).
    const again = await call<Answer>(session, 'cloudflare_sign_in', {});
    expect(again.data.page).toBe(first.data.page);

    // 3. The person clicks Allow: Cloudflare sends the browser back to the loopback address.
    const back = new URL(page.searchParams.get('redirect_uri')!);
    back.searchParams.set('code', 'code-1');
    back.searchParams.set('state', page.searchParams.get('state')!);
    const html = await (await fetch(back)).text();
    expect(html).toMatch(/Signed in to Cloudflare/);

    // 4. The next call finds the sign-in, and says in words what was not allowed.
    const done = await call<Answer>(session, 'cloudflare_sign_in', { action: 'status' });
    expect(done.data.signedIn).toBe(true);
    expect(done.data.scopes).toEqual(['offline_access', 'workers-scripts.edit', 'workers-r2.write']);
    expect(done.data.cannot).toEqual(expect.arrayContaining(['buy a domain', 'send email from the app', 'put the app on its own domain']));
    expect(done.data.say).toMatch(/did not allow NodeGX to .*buy a domain/);
    const exchange = seen.find((s) => s.path === '/oauth2/token')!;
    expect(exchange.form.get('client_secret')).toBeNull();
    expect(exchange.form.get('code_verifier')).toBeTruthy();

    // 5. Asked again: already signed in, nothing opened.
    const already = await call<Answer>(session, 'cloudflare_sign_in', {});
    expect(already.data).toMatchObject({ signedIn: true });
    expect(already.data.say).toMatch(/already signed in/);
    expect(already.data.page).toBeUndefined();

    // No answer so far carried a token.
    for (const r of [first, again, done, already]) expect(JSON.stringify(r.data)).not.toMatch(/AT-SECRET|RT-SECRET/);
    expect(fs.statSync(path.join(home, 'sign-in.json')).mode & 0o777).toBe(0o600);

    // 6. Sign out: revoked with the refresh token, the file gone.
    const out = await call<Answer>(session, 'cloudflare_sign_in', { action: 'sign_out' });
    expect(out.data.say).toMatch(/forgotten your Cloudflare sign-in .* Cloudflare has cancelled it/);
    expect(seen.find((s) => s.path === '/oauth2/revoke')!.form.get('token')).toBe('RT-SECRET-1');
    expect(fs.existsSync(path.join(home, 'sign-in.json'))).toBe(false);
  });
});
