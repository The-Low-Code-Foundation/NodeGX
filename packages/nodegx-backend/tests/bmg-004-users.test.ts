/**
 * BMG-004 — the accounts, administered, over real sockets on a LOCKED backend
 * (a dev-open one bypasses key scopes, so nothing about a key would be about
 * the key; and `signup: 'nobody'` is the posture where the page's old
 * `POST /users` was refused).
 *
 * What the Users page stands on: `/admin/users` (create with roles, invite,
 * update, disable, sign out everywhere, delete, search), the accounts table on
 * `/admin/schema`, and the three defects measured before it existed — the BYOB
 * door sending the password hash, storing a password as text, and a signed-in
 * person setting their own `emailVerified`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageFacade } from '@noodl/backend-contract';

import { BackendService } from '../src/service';
import type { AuditEntry } from '../src/ops/audit';

import { request } from './helpers/http';

jest.setTimeout(30000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'nobody'
};

interface Row {
  objectId: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  disabled: boolean;
  roles: string[];
  sessions: number;
  hasPassword: boolean;
  [k: string]: unknown;
}

describe('BMG-004 /admin/users', () => {
  let dataDir: string;
  let service: BackendService;
  let facade: IStorageFacade;
  let base: string;
  const mail: string[] = [];
  const A = { authorization: 'Bearer t0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = A) =>
    request<T>(base, method, p, { body, headers });
  const login = (username: string, password: string) => req<{ sessionToken: string }>('POST', '/login', { username, password }, {});
  const sessionRows = async (userId: string) => (await facade.rawQueryAll('_Session', { where: { userId } })).results.length;
  const create = (body: Record<string, unknown>) => req<{ objectId: string; roles: string[]; invited?: boolean; inviteError?: string }>('POST', '/admin/users', body);
  const one = async (id: string) => (await req<{ user: Row }>('GET', `/admin/users/${id}`)).json.user;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg004-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg004', backendName: 'BMG-004', authToken: 't0k' });
    base = (await service.start()).listen.url;
    facade = (service as unknown as { facade: IStorageFacade }).facade;
    service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        mail.push(opts.text as string);
      }
    });
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
    await req('POST', '/admin/roles', { name: 'editors' });
    await req('POST', '/admin/roles', { name: 'billing' });
    await req('POST', '/admin/roles', { name: 'support' });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('measured first: the public signup refuses the administrator on this backend, and the admin route does not', async () => {
    expect((await req('POST', '/users', { username: 'x', password: 'p' }, {})).status).toBe(403);
    const made = await create({ username: 'ann', email: 'ann@example.com', password: 'pw-ann' });
    expect(made.status).toBe(201);
    // Hashed: the person signs in with it.
    expect((await login('ann', 'pw-ann')).status).toBe(200);
  });

  it('AC2: create with two roles — both memberships are in GET /admin/roles and on the row', async () => {
    const made = await create({ username: 'bob', email: 'bob@example.com', password: 'pw-bob', roles: ['editors', 'billing'] });
    expect(made.status).toBe(201);
    const roles = (await req<{ roles: Array<{ name: string; users: string[] }> }>('GET', '/admin/roles')).json.roles;
    const members = (name: string) => roles.find((r) => r.name === name)!.users;
    expect(members('editors')).toContain(made.json.objectId);
    expect(members('billing')).toContain(made.json.objectId);
    expect(members('support')).not.toContain(made.json.objectId);
    expect((await one(made.json.objectId)).roles.sort()).toEqual(['billing', 'editors']);
  });

  it('AC2: an unknown role refuses the create and writes nothing', async () => {
    const before = (await req<{ total: number }>('GET', '/admin/users')).json.total;
    const made = await create({ username: 'cy', password: 'pw', roles: ['editors', 'nope'] });
    expect(made.status).toBe(400);
    expect(String((made.json as any).error)).toContain('nope');
    expect((await req<{ total: number }>('GET', '/admin/users')).json.total).toBe(before);
  });

  it('AC3: removing one role takes exactly that membership away', async () => {
    const made = await create({ username: 'dee', password: 'pw', roles: ['editors', 'billing'] });
    const id = made.json.objectId;
    expect((await req('DELETE', `/admin/roles/editors/users/${id}`)).status).toBe(200);
    expect((await one(id)).roles).toEqual(['billing']);
  });

  it('AC1 (server half): a field added to _User shows as a column, is writable as a property, and reads back', async () => {
    const listing = (await req<{ tables: Array<{ name: string; columns: Array<{ name: string }> }> }>('GET', '/admin/schema')).json.tables;
    const accounts = listing.find((t) => t.name === '_User');
    expect(accounts).toBeTruthy();
    expect(accounts!.columns.map((c) => c.name)).not.toContain('_hashed_password');
    // The BYOB listing is unchanged — its readers never asked for the accounts table.
    const byob = (await req<{ tables: Array<{ name: string }> }>('GET', '/api/_schema')).json.tables;
    expect(byob.map((t) => t.name)).not.toContain('_User');

    expect((await req('POST', '/admin/schema', { action: 'addColumn', table: '_User', column: { name: 'phone', type: 'String' } })).status).toBe(200);
    const list = await req<{ columns: Array<{ name: string }> }>('GET', '/admin/users');
    expect(list.json.columns.map((c) => c.name)).toEqual(['phone']);

    const ann = (await req<{ users: Row[] }>('GET', '/admin/users?q=ann')).json.users[0];
    expect((await req('PUT', `/admin/users/${ann.objectId}`, { properties: { phone: '+44 7700 900123' } })).status).toBe(200);
    expect((await req<Record<string, unknown>>('GET', `/api/_User/${ann.objectId}`)).json.phone).toBe('+44 7700 900123');
  });

  it('AC4: invite by email refuses while magic links are off, then creates a password-less account and sends one link', async () => {
    const refused = await create({ username: 'eve', email: 'eve@example.com', invite: true });
    expect(refused.status).toBe(409);
    expect((await req<{ users: Row[] }>('GET', '/admin/users?q=eve')).json.users).toHaveLength(0);

    await req('PUT', '/admin/email/config', {
      baseUrl: base,
      enabled: true,
      smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' },
      fromAddress: 'noreply@test'
    });
    await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false } });

    mail.length = 0;
    const made = await create({ username: 'eve', email: 'eve@example.com', invite: true, roles: ['support'] });
    expect(made.status).toBe(201);
    expect(made.json.invited).toBe(true);
    expect(mail).toHaveLength(1);
    expect(mail[0]).toMatch(/\/auth\/magic-link\/callback\?token=/);
    const eve = await one(made.json.objectId);
    expect(eve.hasPassword).toBe(false);
    expect(eve.roles).toEqual(['support']);
  });

  it('AC5: disable signs them out and refuses every door; switching it off restores sign-in', async () => {
    const made = await create({ username: 'fay', email: 'fay@example.com', password: 'pw-fay' });
    const id = made.json.objectId;
    const session = (await login('fay', 'pw-fay')).json.sessionToken;
    const S = { 'x-parse-session-token': session };
    expect((await req('GET', '/users/me', undefined, S)).status).toBe(200);
    const key = await req<{ secret: string }>('POST', '/admin/keys', { name: 'as-fay', scopes: ['classes:read'], actsAsUserId: id });
    const K = { 'x-nodegx-api-key': key.json.secret };
    expect((await req('GET', '/api/Pet', undefined, K)).status).toBe(200);

    const off = await req<{ user: Row; sessionsRevoked: number }>('PUT', `/admin/users/${id}`, { disabled: true });
    expect(off.status).toBe(200);
    expect(off.json.user.disabled).toBe(true);
    expect(off.json.sessionsRevoked).toBe(1);
    expect(await sessionRows(id)).toBe(0);

    // The old token: 209, the code that makes the client drop its session.
    const me = await req<{ code: number }>('GET', '/users/me', undefined, S);
    expect(me.status).toBe(400);
    expect(me.json.code).toBe(209);
    // The right password: refused with the sentence, and no session made.
    const again = await login('fay', 'pw-fay');
    expect(again.status).toBe(403);
    expect((again.json as any).error).toBe('This account is disabled.');
    expect(await sessionRows(id)).toBe(0);
    // A wrong password is still just a wrong password — no oracle.
    expect((await login('fay', 'nope')).status).toBe(404);
    // A key acting as them stops.
    expect((await req('GET', '/api/Pet', undefined, K)).status).toBe(401);
    // The magic link (the same `finishSignIn` a provider callback runs) mints nothing.
    mail.length = 0;
    await req('POST', '/auth/magic-link', { email: 'fay@example.com' }, {});
    await new Promise((r) => setTimeout(r, 60));
    const token = decodeURIComponent(/callback\?token=([^\s&]+)/.exec(mail[0])![1]);
    const press = await fetch(`${base}/auth/magic-link/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      redirect: 'manual'
    });
    expect(press.status).toBe(302);
    expect(new URL(press.headers.get('location') || '').searchParams.get('nodegx_auth_error')).toBe('This account is disabled.');
    expect(await sessionRows(id)).toBe(0);
    // The list can find them.
    expect((await req<{ users: Row[] }>('GET', '/admin/users?status=disabled')).json.users.map((u) => u.username)).toEqual(['fay']);

    const trail = await req<{ entries: AuditEntry[] }>('GET', '/admin/audit?action=user.update');
    expect(trail.json.entries[0].detail).toMatchObject({ disabled: true, sessionsRevoked: 1 });

    expect((await req('PUT', `/admin/users/${id}`, { disabled: false })).status).toBe(200);
    expect((await login('fay', 'pw-fay')).status).toBe(200);
    expect((await req('GET', '/api/Pet', undefined, K)).status).toBe(200);
  });

  it('AC6: sign out everywhere leaves zero sessions', async () => {
    const made = await create({ username: 'gus', password: 'pw-gus' });
    await login('gus', 'pw-gus');
    await login('gus', 'pw-gus');
    expect(await sessionRows(made.json.objectId)).toBe(2);
    expect((await one(made.json.objectId)).sessions).toBe(2);
    const out = await req<{ sessionsRevoked: number }>('DELETE', `/admin/users/${made.json.objectId}/sessions`);
    expect(out.json.sessionsRevoked).toBe(2);
    expect(await sessionRows(made.json.objectId)).toBe(0);
  });

  it('AC7: the server-owned columns come from one list, and a generic write to one is refused', async () => {
    const who = await req<{ accountColumns: Record<string, string> }>('GET', '/_admin/whoami');
    expect(Object.keys(who.json.accountColumns).sort()).toEqual(['authData', 'disabled', 'email', 'emailVerified', 'password', 'username']);
    const ann = (await req<{ users: Row[] }>('GET', '/admin/users?q=ann')).json.users[0];
    for (const key of ['email', 'emailVerified', 'disabled', 'username']) {
      const put = await req('PUT', `/admin/users/${ann.objectId}`, { properties: { [key]: 'x' } });
      expect(put.status).toBe(400);
    }
    expect((await req('PUT', `/admin/users/${ann.objectId}`, { properties: { _hashed_password: 'x' } })).status).toBe(400);
    // Through its own control it is written.
    expect((await req('PUT', `/admin/users/${ann.objectId}`, { emailVerified: true })).status).toBe(200);
    expect((await one(ann.objectId)).emailVerified).toBe(true);
  });

  it('AC9: search finds a person by a middle fragment of their email', async () => {
    const found = (await req<{ users: Row[] }>('GET', '/admin/users?q=' + encodeURIComponent('ob@exam'))).json.users;
    expect(found.map((u) => u.username)).toEqual(['bob']);
  });

  it('a new password from the admin is hashed, and revokes their sessions', async () => {
    const made = await create({ username: 'hal', password: 'old' });
    await login('hal', 'old');
    const put = await req<{ sessionsRevoked: number }>('PUT', `/admin/users/${made.json.objectId}`, { password: 'new' });
    expect(put.json.sessionsRevoked).toBe(1);
    expect((await login('hal', 'old')).status).toBe(404);
    expect((await login('hal', 'new')).status).toBe(200);
  });

  it('delete takes the account, its sessions and its memberships', async () => {
    const made = await create({ username: 'ivy', password: 'pw', roles: ['editors'] });
    const id = made.json.objectId;
    await login('ivy', 'pw');
    const del = await req<{ sessionsRevoked: number }>('DELETE', `/admin/users/${id}`);
    expect(del.status).toBe(200);
    expect(del.json.sessionsRevoked).toBe(1);
    expect(await sessionRows(id)).toBe(0);
    const roles = (await req<{ roles: Array<{ name: string; users: string[] }> }>('GET', '/admin/roles')).json.roles;
    expect(roles.find((r) => r.name === 'editors')!.users).not.toContain(id);
    expect((await req('GET', `/admin/users/${id}`)).status).toBe(404);
  });

  describe('the doors measured before BMG-004', () => {
    it('BYOB GET /api/_User no longer sends the password hash', async () => {
      const list = await req<{ results: Array<Record<string, unknown>> }>('GET', '/api/_User?limit=50');
      expect(list.json.results.length).toBeGreaterThan(0);
      for (const r of list.json.results) expect(Object.keys(r).filter((k) => k.startsWith('_') || k === 'password')).toEqual([]);
      const ann = list.json.results.find((r) => r.username === 'ann')!;
      expect((await req<Record<string, unknown>>('GET', `/api/_User/${ann.objectId}`)).json._hashed_password).toBeUndefined();
    });

    it('BYOB refuses to store a password as text', async () => {
      expect((await req('POST', '/api/_User', { username: 'zed', password: 'plain' })).status).toBe(400);
      const ann = (await req<{ users: Row[] }>('GET', '/admin/users?q=ann')).json.users[0];
      expect((await req('PUT', `/api/_User/${ann.objectId}`, { password: 'plain' })).status).toBe(400);
      expect((await req('PUT', `/api/_User/${ann.objectId}`, { _hashed_password: 'x' })).status).toBe(400);
      // Ordinary fields still write through it.
      expect((await req('PUT', `/api/_User/${ann.objectId}`, { phone: '1' })).status).toBe(200);
    });

    it('a signed-in person cannot set their own emailVerified or disabled', async () => {
      const made = await create({ username: 'jo', password: 'pw' });
      const S = { 'x-parse-session-token': (await login('jo', 'pw')).json.sessionToken };
      expect((await req('PUT', `/users/${made.json.objectId}`, { emailVerified: true, disabled: true }, S)).status).toBe(200);
      const jo = await one(made.json.objectId);
      expect(jo.emailVerified).toBe(false);
      expect(jo.disabled).toBe(false);
    });
  });
});
