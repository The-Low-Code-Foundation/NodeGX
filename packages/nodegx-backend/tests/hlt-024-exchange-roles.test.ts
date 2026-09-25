/**
 * HLT-024 — a link signs you in as somebody in particular.
 *
 * DEF-005 (a) put a signed-in user's `roles` on every session response so a
 * page can branch on its FIRST render. `POST /oauth/exchange` — how a magic
 * link AND every provider sign-in hand the session to the app — was added
 * without it, although its docblock called it "the SAME shape `/login`
 * returns". The client stores that answer as the session, so the `User` node
 * read `roles: undefined` ("we could not ask") until something re-read
 * `/users/me`. A coach arriving from the link saw a page for nobody.
 *
 * Every arm compares the exchange with `/users/me` ON THE SAME SESSION TOKEN:
 * the two must be the same answer, because they are the same resolver.
 *
 * The last block is the part that lasts: it enumerates, from the source, every
 * response that hands out a `sessionToken`, and requires each to carry `roles`
 * — so the next sign-in route cannot be added without it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { clearDiscoveryCache } from '../src/auth/oidc';
import { BackendService } from '../src/service';
import { FakeOidcProvider } from './helpers/fake-oidc-provider';
import { AuthSpecBody } from './helpers/http';

jest.setTimeout(30000);

describe('HLT-024 the exchange carries the roles', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let provider: FakeOidcProvider;
  const admin = { authorization: 'Bearer admin-token' };
  const sent: string[] = [];

  async function req(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual'
    });
    const text = await res.text();
    let json = {} as AuthSpecBody;
    try {
      json = JSON.parse(text);
    } catch {
      /* HTML or empty */
    }
    return {
      status: res.status,
      json,
      text,
      location: res.headers.get('location'),
      setCookie: res.headers.get('set-cookie')
    };
  }

  /** The whole magic-link path a person takes: ask, open the mail, press the button, exchange. */
  async function magicLinkSignIn(email: string) {
    sent.length = 0;
    expect((await req('POST', '/auth/magic-link', { email })).status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(sent).toHaveLength(1);
    const token = decodeURIComponent(
      (/\/auth\/magic-link\/callback\?token=([^\s&]+)/.exec(sent[0]) as RegExpExecArray)[1]
    );

    const form = await fetch(`${base}/auth/magic-link/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      redirect: 'manual'
    });
    expect(form.status).toBe(302);
    const code = new URL(form.headers.get('location') as string).searchParams.get('nodegx_auth');
    expect(code).toBeTruthy();
    return req('POST', '/oauth/exchange', { code });
  }

  /** A provider sign-in through the fake OIDC provider, as `auth-linking.test.ts` drives it. */
  async function providerSignIn(sub: string, email: string) {
    const start = await req('GET', '/oauth/acme/start');
    const authorizeUrl = start.location as string;
    const state = new URL(authorizeUrl).searchParams.get('state') as string;
    const cookie = (start.setCookie as string).split(';')[0];
    provider.nextIdentity = { sub, email, emailVerified: true };
    const code = provider.authorize(authorizeUrl, sub);
    const callback = await req('GET', `/oauth/acme/callback?code=${code}&state=${state}`, undefined, { cookie });
    expect(callback.status).toBe(302);
    const handoff = new URL(callback.location as string).searchParams.get('nodegx_auth');
    expect(handoff).toBeTruthy();
    return req('POST', '/oauth/exchange', { code: handoff });
  }

  const me = (token: string) => req('GET', '/users/me', undefined, { 'x-parse-session-token': token });

  async function grant(userId: string, role: string) {
    expect((await req('POST', `/admin/roles/${role}/users`, { userId }, admin)).status).toBe(200);
  }

  /** The exchange and `/users/me` on the exchange's own session, side by side. */
  async function bothAnswers(exchange: Awaited<ReturnType<typeof req>>) {
    expect(exchange.status).toBe(200);
    const token = exchange.json.sessionToken as string;
    expect(token).toBeTruthy();
    const mine = await me(token);
    expect(mine.status).toBe(200);
    expect(mine.json.objectId).toBe(exchange.json.objectId);
    return { exchanged: exchange.json.roles, read: mine.json.roles };
  }

  const sorted = (v: unknown) => (Array.isArray(v) ? [...v].sort() : v);

  beforeAll(async () => {
    provider = new FakeOidcProvider();
    await provider.start();

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hlt024-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({
      dataDir,
      port: 0,
      backendId: 'hlt024',
      backendName: 'HLT-024',
      authToken: 'admin-token'
    });
    base = (await service.start()).listen.url;
    service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        sent.push(opts.text as string);
      }
    });

    await req(
      'PUT',
      '/admin/email/config',
      {
        baseUrl: base,
        enabled: true,
        smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' },
        fromAddress: 'noreply@test'
      },
      admin
    );
    await req(
      'PUT',
      '/admin/auth/providers/acme',
      {
        preset: 'oidc',
        displayName: 'Acme SSO',
        enabled: true,
        issuer: provider.issuer,
        clientId: provider.clientId,
        clientSecret: provider.clientSecret
      },
      admin
    );
    await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: true } }, admin);
    clearDiscoveryCache();

    for (const role of ['staff', 'coach']) {
      expect((await req('POST', '/admin/roles', { name: role }, admin)).status).toBe(201);
    }
  });

  afterAll(async () => {
    await service.stop();
    await provider.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Magic link — the path L171's coach took
  // ==========================================================================

  it('a magic link for a user in NO role answers [] — never undefined, which means "we could not ask"', async () => {
    const { exchanged, read } = await bothAnswers(await magicLinkSignIn('newcomer@example.com'));
    expect(read).toEqual([]);
    expect(exchanged).toEqual([]);
  });

  it('a magic link for a user in ONE role answers that role, as /users/me does on the same session', async () => {
    const first = await magicLinkSignIn('coach@example.com');
    await grant(first.json.objectId as string, 'staff');

    const { exchanged, read } = await bothAnswers(await magicLinkSignIn('coach@example.com'));
    expect(read).toEqual(['staff']);
    expect(exchanged).toEqual(read);
  });

  it('a magic link for a user in TWO roles answers both', async () => {
    const first = await magicLinkSignIn('lead@example.com');
    await grant(first.json.objectId as string, 'staff');
    await grant(first.json.objectId as string, 'coach');

    const { exchanged, read } = await bothAnswers(await magicLinkSignIn('lead@example.com'));
    expect(sorted(read)).toEqual(['coach', 'staff']);
    expect(sorted(exchanged)).toEqual(sorted(read));
  });

  // ==========================================================================
  // Provider sign-in — the same exchange, the other door into it
  // ==========================================================================

  it('a provider sign-in for a user in a role answers that role on the exchange', async () => {
    const first = await providerSignIn('acme-coach', 'acme-coach@example.com');
    expect(first.json.roles).toEqual([]);
    await grant(first.json.objectId as string, 'coach');

    const { exchanged, read } = await bothAnswers(await providerSignIn('acme-coach', 'acme-coach@example.com'));
    expect(read).toEqual(['coach']);
    expect(exchanged).toEqual(read);
  });

  it('the exchange keeps its own fields — the roles are added, nothing is traded for them', async () => {
    const exchange = await magicLinkSignIn('fields@example.com');
    expect(exchange.json).toEqual(
      expect.objectContaining({
        email: 'fields@example.com',
        sessionToken: expect.any(String),
        authOutcome: expect.any(String),
        roles: []
      })
    );
    expect('authNotice' in exchange.json).toBe(true);
  });

  // ==========================================================================
  // AC3 — every response that hands out a session is held to the rule
  // ==========================================================================

  describe('every session-issuing response carries roles', () => {
    /**
     * Each `sendJSON(…)` call in `src/` whose argument names `sessionToken`,
     * with the method it sits in. Read from the source because the routes
     * that issue a session take four different inputs (a password, a signup,
     * an existing token, a handoff code) — a runtime enumeration would be four
     * hand-written drives, which is exactly the list a new route forgets.
     */
    function sessionResponses(): { site: string; argument: string }[] {
      const out: { site: string; argument: string }[] = [];
      const walk = (dir: string): string[] =>
        fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []
          );
      const srcDir = path.join(__dirname, '..', 'src');
      for (const file of walk(srcDir)) {
        const text = fs.readFileSync(file, 'utf-8');
        let at = text.indexOf('sendJSON(');
        while (at !== -1) {
          // The balanced argument list of this call.
          let depth = 0;
          let end = at + 'sendJSON'.length;
          for (; end < text.length; end++) {
            if (text[end] === '(') depth++;
            else if (text[end] === ')' && --depth === 0) break;
          }
          const argument = text.slice(at, end + 1);
          if (/\bsessionToken\b/.test(argument)) {
            const before = text.slice(0, at);
            const methods = [...before.matchAll(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/gm)];
            const method = methods.length ? methods[methods.length - 1][1] : '?';
            out.push({ site: `${path.relative(srcDir, file)}:${method}`, argument });
          }
          at = text.indexOf('sendJSON(', end);
        }
      }
      return out.sort((a, b) => a.site.localeCompare(b.site));
    }

    it('the scan finds the six routes known to issue a session — so it is not blind', () => {
      // 🔴 The known-firing arm. If a refactor renamed `sendJSON` or moved a
      // route, "every one carries roles" would pass on an empty list.
      // BMG-014 added the manager's two: a password sign-in and the setup step.
      expect(sessionResponses().map((r) => r.site)).toEqual([
        'admin/AdminDashboardRoutes.ts:login',
        'admin/AdminDashboardRoutes.ts:setup',
        'server/oauth-routes.ts:exchange',
        'server/users.ts:login',
        'server/users.ts:me',
        'server/users.ts:signup'
      ]);
    });

    it('each of them carries roles, resolved by the one resolver', () => {
      const missing = sessionResponses().filter(
        (r) => !/\broles:\s*await this\.(?:rolesFor|deps\.rolesForUser)\(/.test(r.argument)
      );
      expect(missing.map((r) => r.site)).toEqual([]);
    });
  });
});
