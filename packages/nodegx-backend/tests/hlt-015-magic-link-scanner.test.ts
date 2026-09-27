/**
 * HLT-015 — opening a magic link never spends it; only the person pressing the
 * button does.
 *
 * Mail scanners (Defender Safe Links, Mimecast, Proofpoint) and link unfurlers
 * fetch every URL in a message before the person sees it. When the GET itself
 * consumed the token, those mailboxes met "Sign-in link expired" on every
 * click, and whatever fetched the link was the one signed in.
 *
 * So the GET reads the token and renders a one-button page; the page's form
 * POST is what consumes. Every assertion about the token here reads the
 * `_EmailToken` ROW, not the page — a page can say "Sign in" about a token the
 * request has already spent.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageFacade } from '@noodl/backend-contract';

import { hashToken } from '../src/email/tokens';
import { BackendService } from '../src/service';

jest.setTimeout(30000);

describe('HLT-015 a magic link survives being opened', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let facade: IStorageFacade;
  const sent: string[] = [];

  async function fetchRaw(method: string, p: string, init: { form?: Record<string, string>; json?: unknown } = {}) {
    const headers: Record<string, string> = {};
    let body: string | undefined;
    if (init.form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(init.form).toString();
    } else if (init.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.json);
    }
    const res = await fetch(`${base}${p}`, { method, headers, body, redirect: 'manual' });
    return {
      status: res.status,
      text: await res.text(),
      location: res.headers.get('location'),
      setCookie: res.headers.get('set-cookie')
    };
  }

  async function requestLink(email: string): Promise<string> {
    sent.length = 0;
    await fetchRaw('POST', '/auth/magic-link', { json: { email } });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(sent).toHaveLength(1);
    const match = /\/auth\/magic-link\/callback\?token=([^\s&]+)/.exec(sent[0]);
    expect(match).toBeTruthy();
    return decodeURIComponent((match as RegExpExecArray)[1]);
  }

  async function tokenRow(token: string): Promise<Record<string, unknown>> {
    const { results } = await facade.rawQuery('_EmailToken', { where: { tokenHash: hashToken(token) }, limit: 1 });
    expect(results).toHaveLength(1);
    return results[0];
  }

  async function sessionCount(): Promise<number> {
    const { results } = await facade.rawQuery('_Session', { limit: 10000 });
    return results.length;
  }

  const open = (token: string) => fetchRaw('GET', `/auth/magic-link/callback?token=${encodeURIComponent(token)}`);
  const press = (token: string) => fetchRaw('POST', '/auth/magic-link/callback', { form: { token } });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hlt015-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({
      dataDir,
      port: 0,
      backendId: 'hlt015',
      backendName: 'HLT-015 <Scanner>',
      authToken: 'admin-token'
    });
    base = (await service.start()).listen.url;
    facade = (service as unknown as { facade: IStorageFacade }).facade;
    service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        sent.push(opts.text as string);
      }
    });
    const admin = { authorization: 'Bearer admin-token', 'content-type': 'application/json' };
    await fetch(`${base}/admin/email/config`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({
        baseUrl: base,
        enabled: true,
        smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' },
        fromAddress: 'noreply@test'
      })
    });
    await fetch(`${base}/admin/auth`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ magicLink: { enabled: true, ttlMinutes: 15, allowSignup: true } })
    });
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('the GET handler cannot reach consumeRow: three opens leave the token row and the sessions untouched', async () => {
    const token = await requestLink('scanned@example.com');
    const before = await tokenRow(token);
    const sessionsBefore = await sessionCount();

    for (let i = 0; i < 3; i++) {
      const res = await open(token);
      expect(res.status).toBe(200);
      expect(res.setCookie).toBeNull();
      expect(res.location).toBeNull();
      expect(res.text).not.toMatch(/nodegx_auth/);
      expect(res.text).toMatch(/<form method="POST"/);
    }

    expect(await tokenRow(token)).toEqual(before);
    expect((await tokenRow(token)).consumedAt).toBeNull();
    expect(await sessionCount()).toBe(sessionsBefore);
  });

  it('the page names the app, escaped, and carries the token only in a hidden field', async () => {
    const token = await requestLink('named@example.com');
    const res = await open(token);
    expect(res.text).toContain('HLT-015 &lt;Scanner&gt;');
    expect(res.text).not.toContain('<Scanner>');
    expect(res.text).toContain(`<input type="hidden" name="token" value="${token}">`);
    expect(res.text).not.toMatch(/<script/i);
  });

  it('the POST signs in, lands where the old GET landed, and a second POST reads expired', async () => {
    const token = await requestLink('presser@example.com');
    await open(token);
    // Where the old GET landed: the redirect baked into the row at issue time.
    const landing = (await tokenRow(token)).redirectUrl as string;
    expect(landing).toBe(`${base}/auth/signed-in`);

    const first = await press(token);
    expect(first.status).toBe(302);
    const location = new URL(first.location as string);
    expect(location.origin + location.pathname).toBe(landing);
    const code = location.searchParams.get('nodegx_auth');
    expect(code).toBeTruthy();
    expect((await tokenRow(token)).consumedAt).toEqual(expect.any(String));

    const exchange = await fetchRaw('POST', '/oauth/exchange', { json: { code } });
    expect(exchange.status).toBe(200);
    expect(JSON.parse(exchange.text).email).toBe('presser@example.com');

    const second = await press(token);
    expect(second.status).toBe(400);
    expect(second.text).toMatch(/Sign-in link expired/);
  });

  it('an unknown, an expired and a spent token render byte-identical GET bodies', async () => {
    const unknown = await open('not-a-token-anyone-issued');

    const expiring = await requestLink('expired@example.com');
    const row = await tokenRow(expiring);
    await facade.rawSave('_EmailToken', row.objectId as string, { expiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = await open(expiring);

    const spending = await requestLink('spent@example.com');
    expect((await press(spending)).status).toBe(302);
    const spent = await open(spending);

    const empty = await open('');

    for (const res of [unknown, expired, spent, empty]) {
      expect(res.status).toBe(400);
      expect(res.text).toBe(unknown.text);
    }
    expect(unknown.text).toMatch(/Sign-in link expired/);
  });

  it('a POST with no token reads expired; a JSON body redeems exactly as the form does', async () => {
    const token = await requestLink('json@example.com');
    expect((await fetchRaw('POST', '/auth/magic-link/callback', { form: {} })).status).toBe(400);
    const asJson = await fetchRaw('POST', '/auth/magic-link/callback', { json: { token } });
    expect(asJson.status).toBe(302);
    expect((await tokenRow(token)).consumedAt).toEqual(expect.any(String));
  });
});
