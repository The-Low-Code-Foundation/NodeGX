/**
 * P109 ISL-040 — P78-DBT-SESSIONS: a sign-in never ran out. Nothing that signs a person in wrote
 * `_Session.expiresAt`, so a session on a lost or shared phone worked until somebody signed out.
 *
 * Richard ruled on 2026-10-11: **"Ends after 30 days unused"**, and each backend can change the
 * number on its Sign-in page. So every door that signs a person in mints the session through one
 * `mintSession()`, each use moves the end on, and every reader that turns a token into a person
 * refuses a row whose end has passed. Before this, only `/users/me`'s reader read the column: the
 * access check behind `/classes` and the cloud `Verify Session Token` node let an expired row in.
 *
 * Two things must NOT move: a session minted with a fixed end (an impersonation, the MCP door's
 * one-minute session) is not stretched by being used, and a session minted before this change (no
 * `expiresAt`) is not signed out by the deploy that brings it in.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { sessionExpiryMs } from '../src/server/users';
import { request } from './helpers/http';

jest.setTimeout(60000);

const DAY = 24 * 60 * 60 * 1000;
const ADMIN = { authorization: 'Bearer t0k' };

type Row = Record<string, unknown>;

describe('ISL-040 P78-DBT-SESSIONS — a sign-in ends after 30 days unused', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals = () => service as any;
  const sessionRow = async (token: string): Promise<Row | undefined> =>
    (await internals().facade.rawQuery('_Session', { where: { sessionToken: token }, limit: 1 })).results[0];
  const setRow = async (token: string, patch: Row) => {
    const row = await sessionRow(token);
    await internals().facade.rawSave('_Session', row!.objectId as string, patch);
  };
  const endOf = async (token: string) => sessionExpiryMs((await sessionRow(token))?.expiresAt);
  const asUser = (token: string) => ({ 'x-parse-session-token': token });

  async function signup(username: string): Promise<{ objectId: string; sessionToken: string }> {
    const res = await request<{ objectId: string; sessionToken: string }>(base, 'POST', '/users', {
      body: { username, password: 'correct-horse', email: `${username}@example.com` }
    });
    expect(res.status).toBe(201);
    return res.json;
  }

  async function start() {
    service = new BackendService({ dataDir, port: 0, backendId: 'isl040s', backendName: 'sessions', authToken: 't0k' });
    base = (await service.start()).listen.url;
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl040-sessions-'));
    // A locked backend: `/classes` answers a signed-in person and refuses an anonymous one, so the
    // access check's reading of a token is visible in the status.
    const security = defaultSecurityConfig();
    security.devOpen = false;
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    await start();
    expect((await request(base, 'POST', '/classes/Notice', { body: { text: 'hello' }, headers: ADMIN })).status).toBe(201);
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Every door writes the end
  // ==========================================================================

  it('signup and login each mint a session that ends 30 days from now', async () => {
    const before = Date.now();
    const made = await signup('door-signup');
    const login = await request<{ sessionToken: string }>(base, 'POST', '/login', {
      body: { username: 'door-signup', password: 'correct-horse', _method: 'GET' }
    });
    expect(login.status).toBe(200);
    for (const token of [made.sessionToken, login.json.sessionToken]) {
      const end = await endOf(token);
      expect(end).not.toBeNull();
      expect(end!).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(end!).toBeLessThanOrEqual(Date.now() + 30 * DAY);
    }
  });

  it("the manager's first-admin setup and its sign-in each mint a session with the same end", async () => {
    const setup = await request<{ sessionToken: string }>(base, 'POST', '/_admin/setup', {
      body: { email: 'owner@example.com', password: 'owner-pass' },
      headers: ADMIN
    });
    expect(setup.status).toBe(201);
    const login = await request<{ sessionToken: string }>(base, 'POST', '/_admin/login', {
      body: { email: 'owner@example.com', password: 'owner-pass' }
    });
    expect(login.status).toBe(200);
    for (const token of [setup.json.sessionToken, login.json.sessionToken]) {
      expect(await endOf(token)).toBeGreaterThan(Date.now() + 29 * DAY);
    }
  });

  it('no source file but the session module (and the MCP door, which sets its own minute) creates a _Session row', () => {
    // The census that keeps a sixth door from minting a session that never ends. The provider
    // and magic-link exchange (`oauth-routes.ts`) cannot be driven here without a provider; this
    // is what grades it.
    const src = path.join(__dirname, '..', 'src');
    const writers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && /rawCreate\(\s*'_Session'/.test(fs.readFileSync(full, 'latin1'))) {
          writers.push(path.relative(src, full).split(path.sep).join('/'));
        }
      }
    };
    walk(src);
    expect(writers.sort()).toEqual(['auth/sessions.ts', 'server/mcp/McpRoutes.ts']);
  });

  // ==========================================================================
  // Every reader refuses an ended session
  // ==========================================================================

  it('known-firing: a fresh session reads /classes and verifies', async () => {
    const { sessionToken } = await signup('reader-live');
    expect((await request(base, 'GET', '/classes/Notice', { headers: asUser(sessionToken) })).status).toBe(200);
    expect((await request(base, 'GET', '/users/me', { headers: asUser(sessionToken) })).status).toBe(200);
    const verified = await internals().systemUsers.handle({ op: 'verifyToken', token: sessionToken });
    expect(verified.valid).toBe(true);
  });

  it('a session whose end has passed is refused by /classes, /users/me and Verify Session Token', async () => {
    const { sessionToken } = await signup('reader-ended');
    await setRow(sessionToken, { expiresAt: new Date(Date.now() - 60_000).toISOString() });
    // Each reader is asked before the next one can tidy the row away: `/users/me`'s reader deletes
    // an ended row, which would let the other two pass for the wrong reason.
    const verified = await internals().systemUsers.handle({ op: 'verifyToken', token: sessionToken });
    const classes = await request<{ code: number }>(base, 'GET', '/classes/Notice', { headers: asUser(sessionToken) });
    expect({ verified: verified.valid, classes: [classes.status, classes.json.code] }).toEqual({ verified: false, classes: [400, 209] });
    const me = await request<{ code: number }>(base, 'GET', '/users/me', { headers: asUser(sessionToken) });
    expect([me.status, me.json.code]).toEqual([400, 209]);
  });

  // ==========================================================================
  // Use moves the end on; a fixed end stays fixed
  // ==========================================================================

  it('using a session moves its end to 30 days from now', async () => {
    const { sessionToken } = await signup('slides');
    await setRow(sessionToken, { expiresAt: new Date(Date.now() + 2 * DAY).toISOString() });
    expect((await request(base, 'GET', '/classes/Notice', { headers: asUser(sessionToken) })).status).toBe(200);
    expect(await endOf(sessionToken)).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it('an impersonation-style session (fixed end, minted outside the sign-in doors) is not stretched by use', async () => {
    const user = await signup('fixed');
    const token = 'r:fixed-end-impersonation';
    const end = Date.now() + 2 * DAY;
    await internals().facade.rawCreate('_Session', { sessionToken: token, userId: user.objectId, expiresAt: new Date(end).toISOString() });
    expect((await request(base, 'GET', '/classes/Notice', { headers: asUser(token) })).status).toBe(200);
    expect(await endOf(token)).toBe(end);
  });

  it('a session minted before this change (no end) keeps working, and is given an end by its next use', async () => {
    const user = await signup('legacy');
    const token = 'r:legacy-no-end';
    await internals().facade.rawCreate('_Session', { sessionToken: token, userId: user.objectId });
    expect(await endOf(token)).toBeNull();
    expect((await request(base, 'GET', '/users/me', { headers: asUser(token) })).status).toBe(200);
    expect(await endOf(token)).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it('a restart gives every session with no end one, 30 days from the restart', async () => {
    const user = await signup('legacy-unused');
    const token = 'r:legacy-never-used-again';
    await internals().facade.rawCreate('_Session', { sessionToken: token, userId: user.objectId });
    await service.stop();
    await start();
    expect(await endOf(token)).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  // ==========================================================================
  // The Sign-in page's number
  // ==========================================================================

  it('PUT /admin/auth refuses a number that is not a positive count of days', async () => {
    for (const idleDays of [0, -1, 'thirty', 5000]) {
      const res = await request<{ error: string }>(base, 'PUT', '/admin/auth', { body: { sessions: { idleDays } }, headers: ADMIN });
      expect([idleDays, res.status]).toEqual([idleDays, 400]);
      expect(res.json.error).toMatch(/sessions\.idleDays/);
    }
  });

  it('a shorter number takes effect on new sign-ins and on the sessions already out, and is saved to auth.json', async () => {
    const { sessionToken: before } = await signup('policy-before');
    const res = await request<{ config: { sessions: { idleDays: number } } }>(base, 'PUT', '/admin/auth', {
      body: { sessions: { idleDays: 7 } },
      headers: ADMIN
    });
    expect(res.status).toBe(200);
    expect(res.json.config.sessions.idleDays).toBe(7);
    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'auth.json'), 'utf8')).sessions).toEqual({ idleDays: 7 });

    expect(await endOf(before)).toBeLessThanOrEqual(Date.now() + 7 * DAY);
    const { sessionToken: after } = await signup('policy-after');
    const end = await endOf(after);
    expect(end!).toBeGreaterThan(Date.now() + 6 * DAY);
    expect(end!).toBeLessThanOrEqual(Date.now() + 7 * DAY);
  });
});
