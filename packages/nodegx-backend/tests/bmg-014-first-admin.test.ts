/**
 * BMG-014 — the first admin is a person, over real sockets on a LOCKED backend.
 *
 * What the setup step and the sign-in form stand on: `POST /_admin/setup`
 * (the credential makes the first account, once), `POST /_admin/login` (email
 * + password → a session that IS the admin principal), `adminAccess` on the
 * Users routes with its three guards, and the two doors a signup could have
 * used to make itself an admin — measured shut.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageFacade } from '@noodl/backend-contract';

import { BackendService } from '../src/service';
import type { AuditEntry } from '../src/ops/audit';
import { LOGIN_REFUSED, SETUP_DONE } from '../src/admin/AdminDashboardRoutes';
import { OWN_ACCESS_MESSAGE, lastAdminMessage } from '../src/server/admin-users';
import { SystemUsers } from '../src/users/SystemUsers';
import { ADMIN_ROLE_NAME } from '../src/users/accountColumns';

import { request } from './helpers/http';

jest.setTimeout(30000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: true
  },
  collections: { Pet: { permissions: { create: 'nobody' } } },
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  // Public, so AC5 can measure what a signup may NOT set on itself.
  signup: 'public'
};

interface Whoami {
  readonly: boolean;
  adminAccount: boolean;
  person: { id: string; username: string | null; email: string | null; access: 'full' | 'readonly' } | null;
}
interface Session {
  sessionToken: string;
  access?: 'full' | 'readonly';
  person?: { id: string; email: string | null };
}
interface Row {
  objectId: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  disabled: boolean;
  adminAccess: 'full' | 'readonly' | null;
  roles: string[];
}

describe('BMG-014 the first admin is a person', () => {
  let dataDir: string;
  let service: BackendService;
  let facade: IStorageFacade;
  let base: string;
  const T = { authorization: 'Bearer t0k' };
  const R = { authorization: 'Bearer r0k' };
  const S = (token: string) => ({ 'x-parse-session-token': token });
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = T) =>
    request<T>(base, method, p, { body, headers });
  const whoami = (headers: Record<string, string>) => req<Whoami>('GET', '/_admin/whoami', undefined, headers);
  const login = (email: string, password: string) => req<Session & { error?: string }>('POST', '/_admin/login', { email, password }, {});
  const one = async (id: string) => (await req<{ user: Row }>('GET', `/admin/users/${id}`)).json.user;
  const entries = async (query: string) => (await req<{ entries: AuditEntry[] }>('GET', `/admin/audit?${query}`)).json.entries;

  // What the tests below hand each other.
  let ownerId = '';
  let ownerSession = '';
  let secondId = '';

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg014-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg014', backendName: 'BMG-014', authToken: 't0k', readonlyToken: 'r0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.hasAdminAccount).toBe(false);
    facade = (service as unknown as { facade: IStorageFacade }).facade;
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------- AC1 --

  it('AC1: with the credential and no account, whoami says so; setup makes the account and answers a session', async () => {
    const before = await whoami(T);
    expect(before.status).toBe(200);
    expect(before.json.adminAccount).toBe(false);
    expect(before.json.person).toBeNull();

    expect((await req('POST', '/_admin/setup', { email: 'not-an-email', password: 'pw' })).status).toBe(400);
    expect((await req('POST', '/_admin/setup', { email: 'owner@example.com', password: '' })).status).toBe(400);
    // The read-only credential cannot make it: a write, refused by the tier.
    expect((await req('POST', '/_admin/setup', { email: 'owner@example.com', password: 'pw-owner' }, R)).status).toBe(403);
    // Nobody at all cannot either.
    expect((await req('POST', '/_admin/setup', { email: 'owner@example.com', password: 'pw-owner' }, {})).status).toBe(401);

    const made = await req<Session>('POST', '/_admin/setup', { email: 'owner@example.com', password: 'pw-owner' });
    expect(made.status).toBe(201);
    expect(made.json.access).toBe('full');
    expect(typeof made.json.sessionToken).toBe('string');
    // HLT-024: a session-issuing response carries the roles.
    expect((made.json as unknown as { roles: string[] }).roles).toEqual([ADMIN_ROLE_NAME]);
    ownerId = made.json.person!.id;
    ownerSession = made.json.sessionToken;

    const after = await whoami(S(ownerSession));
    expect(after.status).toBe(200);
    expect(after.json.readonly).toBe(false);
    expect(after.json.adminAccount).toBe(true);
    expect(after.json.person).toMatchObject({ id: ownerId, email: 'owner@example.com', username: 'owner@example.com', access: 'full' });
    // The credential still signs in, and now sees the account exists.
    expect((await whoami(T)).json).toMatchObject({ adminAccount: true, person: null });
    expect(await service.hasAdminAccount()).toBe(true);
  });

  it('AC1: a second setup is refused for good, whoever asks', async () => {
    const again = await req<{ error: string }>('POST', '/_admin/setup', { email: 'other@example.com', password: 'pw' });
    expect(again.status).toBe(409);
    expect(again.json.error).toBe(SETUP_DONE);
    expect((await req('POST', '/_admin/setup', { email: 'other@example.com', password: 'pw' }, S(ownerSession))).status).toBe(409);
    expect((await req<{ total: number }>('GET', '/admin/users?q=other')).json.total).toBe(0);
  });

  it('AC4: the person is in the admin role, which the setup made with a description', async () => {
    const roles = (await req<{ roles: Array<{ name: string; description?: string; users: string[] }> }>('GET', '/admin/roles')).json.roles;
    const admin = roles.find((r) => r.name === ADMIN_ROLE_NAME)!;
    expect(admin).toBeDefined();
    expect(admin.users).toContain(ownerId);
    expect(admin.description).toContain('administer');
    expect((await one(ownerId)).roles).toEqual([ADMIN_ROLE_NAME]);
    expect((await one(ownerId)).adminAccess).toBe('full');
    expect((await one(ownerId)).emailVerified).toBe(true);
  });

  // -------------------------------------------------------------- AC6 --

  it('AC6: the only full admin cannot be downgraded, disabled or deleted — and cannot change their own access', async () => {
    const own = await req<{ error: string }>('PUT', `/admin/users/${ownerId}`, { adminAccess: 'readonly' }, S(ownerSession));
    expect(own.status).toBe(409);
    expect(own.json.error).toBe(OWN_ACCESS_MESSAGE);

    const down = await req<{ error: string }>('PUT', `/admin/users/${ownerId}`, { adminAccess: null });
    expect(down.status).toBe(409);
    expect(down.json.error).toBe(lastAdminMessage('owner@example.com', 'changed to less than full access'));
    const off = await req<{ error: string }>('PUT', `/admin/users/${ownerId}`, { disabled: true });
    expect(off.status).toBe(409);
    expect(off.json.error).toBe(lastAdminMessage('owner@example.com', 'disabled'));
    const gone = await req<{ error: string }>('DELETE', `/admin/users/${ownerId}`);
    expect(gone.status).toBe(409);
    expect(gone.json.error).toBe(lastAdminMessage('owner@example.com', 'deleted'));

    expect((await req<{ error: string }>('PUT', `/admin/users/${ownerId}`, { adminAccess: 'owner' })).status).toBe(400);
    // Nothing above changed anything.
    expect(await one(ownerId)).toMatchObject({ adminAccess: 'full', disabled: false });
  });

  // -------------------------------------------------------------- AC2 --

  it('AC2: email + password answers a session that is the admin everywhere; every refusal is the one sentence', async () => {
    const ok = await login('owner@example.com', 'pw-owner');
    expect(ok.status).toBe(200);
    expect(ok.json.access).toBe('full');
    const session = ok.json.sessionToken;
    // By username too (the setup made them the same).
    expect((await login('owner@example.com', 'pw-owner')).status).toBe(200);

    expect((await req('GET', '/admin/status', undefined, S(session))).status).toBe(200);
    expect((await req('GET', '/api/_User', undefined, S(session))).status).toBe(200);
    expect((await req('GET', '/admin/permissions', undefined, S(session))).status).toBe(200);

    const wrong = await login('owner@example.com', 'nope');
    expect(wrong.status).toBe(401);
    expect(wrong.json.error).toBe(LOGIN_REFUSED);
    const nobody = await login('ghost@example.com', 'pw');
    expect(nobody.status).toBe(401);
    expect(nobody.json.error).toBe(LOGIN_REFUSED);
    expect((await req('POST', '/_admin/login', { email: 'owner@example.com' }, {})).status).toBe(400);

    // An ordinary account with the RIGHT password: refused the same way.
    const plain = await req<{ objectId: string }>('POST', '/admin/users', { username: 'plain', email: 'plain@example.com', password: 'pw-plain' });
    expect(plain.status).toBe(201);
    const refused = await login('plain@example.com', 'pw-plain');
    expect(refused.status).toBe(401);
    expect(refused.json.error).toBe(LOGIN_REFUSED);
    // …while the app's own login takes them.
    expect((await req('POST', '/login', { username: 'plain', password: 'pw-plain' }, {})).status).toBe(200);
  });

  it('AC2/AC6: a second full admin, given from the Users page; then a disabled admin is refused at the door', async () => {
    const made = await req<{ objectId: string }>('POST', '/admin/users', { username: 'second', email: 'second@example.com', password: 'pw-second' });
    secondId = made.json.objectId;
    expect((await one(secondId)).adminAccess).toBeNull();
    // An admin person gives access — audited as user.update with the key.
    const put = await req<{ user: Row }>('PUT', `/admin/users/${secondId}`, { adminAccess: 'full' }, S(ownerSession));
    expect(put.status).toBe(200);
    expect(put.json.user.adminAccess).toBe('full');
    expect((await login('second@example.com', 'pw-second')).status).toBe(200);

    const admins = await req<{ users: Row[] }>('GET', '/admin/users?status=admins');
    expect(admins.json.users.map((u) => u.username).sort()).toEqual(['owner@example.com', 'second']);

    // Two full admins now: the first may be downgraded — by the second.
    const secondSession = (await login('second@example.com', 'pw-second')).json.sessionToken;
    const down = await req<{ user: Row }>('PUT', `/admin/users/${ownerId}`, { adminAccess: 'readonly' }, S(secondSession));
    expect(down.status).toBe(200);
    expect(down.json.user.adminAccess).toBe('readonly');
    // …and the owner's live session is read-only from the next request on.
    expect((await whoami(S(ownerSession))).json.readonly).toBe(true);
    // Put it back (the credential may).
    expect((await req('PUT', `/admin/users/${ownerId}`, { adminAccess: 'full' })).status).toBe(200);

    // Disabled: refused at this door like any other, with the one sentence.
    expect((await req('PUT', `/admin/users/${secondId}`, { disabled: true })).status).toBe(200);
    const off = await login('second@example.com', 'pw-second');
    expect(off.status).toBe(401);
    expect(off.json.error).toBe(LOGIN_REFUSED);
    // And their earlier session is dead (BMG-004 R3), so it is no admin either.
    expect((await req('GET', '/admin/status', undefined, S(secondSession))).status).not.toBe(200);
    expect((await req('PUT', `/admin/users/${secondId}`, { disabled: false })).status).toBe(200);
  });

  // -------------------------------------------------------------- AC3 --

  it('AC3: a read-only person sees everything and changes nothing', async () => {
    const made = await req<{ objectId: string }>('POST', '/admin/users', { username: 'viewer', email: 'viewer@example.com', password: 'pw-viewer' });
    expect((await req('PUT', `/admin/users/${made.json.objectId}`, { adminAccess: 'readonly' })).status).toBe(200);
    const session = (await login('viewer@example.com', 'pw-viewer')).json.sessionToken;

    const me = await whoami(S(session));
    expect(me.json.readonly).toBe(true);
    expect(me.json.person).toMatchObject({ username: 'viewer', access: 'readonly' });
    expect((await req('GET', '/admin/permissions', undefined, S(session))).status).toBe(200);
    expect((await req('GET', '/admin/users', undefined, S(session))).status).toBe(200);

    for (const [method, url, body] of [
      ['POST', '/admin/roles', { name: 'sneaky' }],
      ['PUT', `/admin/users/${made.json.objectId}`, { adminAccess: 'full' }],
      ['POST', '/api/Pet', { name: 'nope' }]
    ] as Array<[string, string, unknown]>) {
      const { status, json } = await req<{ error: string }>(method, url, body, S(session));
      expect(`${method} ${url} -> ${status}`).toContain('-> 403');
      expect(json.error).toContain('READ-ONLY admin credential');
      expect(json.error).toContain('Users page');
    }
    expect((await one(made.json.objectId)).adminAccess).toBe('readonly');
  });

  // -------------------------------------------------------------- AC4 --

  it('AC4: in the app, the admin person goes through every rule and owns what they create', async () => {
    const session = (await login('owner@example.com', 'pw-owner')).json.sessionToken;
    // Pet.create is 'nobody' for everyone else.
    const plainSession = (await req<{ sessionToken: string }>('POST', '/login', { username: 'plain', password: 'pw-plain' }, {})).json.sessionToken;
    expect((await req('POST', '/api/Pet', { name: 'Rex' }, S(plainSession))).status).toBe(403);

    const made = await req<{ objectId: string }>('POST', '/api/Pet', { name: 'Rex' }, S(session));
    expect(made.status).toBe(201);
    const row = await facade.rawFetch('Pet', made.json.objectId);
    expect(row.owner).toBe(ownerId);
    expect(row.ACL).toEqual({ [ownerId]: { read: true, write: true } });
  });

  // -------------------------------------------------------------- AC5 --

  it('AC5: a signup or a self-update cannot make itself verified, disabled or an admin; a graph cannot either', async () => {
    const signed = await req<{ objectId: string; sessionToken: string }>(
      'POST',
      '/users',
      { username: 'climber', password: 'pw-climber', adminAccess: 'full', emailVerified: true, disabled: true, nickname: 'c' },
      {}
    );
    expect(signed.status).toBe(201);
    const row = await one(signed.json.objectId);
    expect(row).toMatchObject({ adminAccess: null, emailVerified: false, disabled: false, nickname: 'c' });
    expect((await login('climber', 'pw-climber')).status).toBe(401);

    const self = await req('PUT', `/users/${signed.json.objectId}`, { adminAccess: 'full', emailVerified: true }, S(signed.json.sessionToken));
    expect(self.status).toBe(200);
    expect(await one(signed.json.objectId)).toMatchObject({ adminAccess: null, emailVerified: false });
    expect((await login('climber', 'pw-climber')).status).toBe(401);

    const graph = await new SystemUsers({ facade }).handle({ op: 'update', userId: signed.json.objectId, properties: { adminAccess: 'full' } });
    expect(graph.outcome).toBe('failure');
    expect(graph.code).toBe('user/protected-property');
    expect(graph.error).toContain('adminAccess');
    expect((await one(signed.json.objectId)).adminAccess).toBeNull();

    // The Users route refuses it as a generic property too: it has its own control.
    const asProperty = await req<{ error: string }>('PUT', `/admin/users/${signed.json.objectId}`, { properties: { adminAccess: 'full' } });
    expect(asProperty.status).toBe(400);
    expect(asProperty.json.error).toContain('adminAccess');
  });

  // -------------------------------------------------------------- AC7 --

  it('AC7: the trail names the person — setup, sign-in, and a refused sign-in', async () => {
    const setups = await entries('action=admin.setup');
    const setup = setups.find((e) => e.outcome === 'success')!;
    expect(setup).toMatchObject({ action: 'admin.setup', actorKind: 'admin', outcome: 'success', status: 201 });
    expect(setup.detail).toMatchObject({ userId: ownerId, role: ADMIN_ROLE_NAME });
    expect(JSON.stringify(setup)).not.toContain('pw-owner');
    // The refused second setups are in the trail too, as failures.
    expect(setups.filter((e) => e.outcome === 'failure' && e.status === 409).length).toBeGreaterThanOrEqual(2);

    const logins = await entries('action=admin.login');
    const byPerson = logins.find((e) => e.actor === ownerId && e.route === '_admin/login');
    expect(byPerson).toMatchObject({ outcome: 'success', status: 200 });
    expect(byPerson!.detail).toMatchObject({ access: 'full' });

    const failed = (await entries('action=admin.login.failed')).find((e) => e.route === '_admin/login');
    expect(failed).toMatchObject({ outcome: 'failure', status: 401, actorKind: 'anonymous' });
    expect(JSON.stringify(failed)).not.toContain('nope');

    // A change of access is user.update with the key named, never a value beyond it.
    const change = (await entries('action=user.update')).find((e) => e.actor === ownerId);
    expect(change).toBeDefined();
    expect(change!.detail!.changed).toContain('adminAccess');
  });
});

describe('BMG-014 a refused password spends the credential budget', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg014-lock-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg014lock', backendName: 'BMG-014 lock', authToken: 't0k' });
    base = (await service.start()).listen.url;
    await request(base, 'POST', '/_admin/setup', { body: { email: 'owner@example.com', password: 'pw-owner' }, headers: { authorization: 'Bearer t0k' } });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC2: ten wrong passwords lock the address out — for the token too, it is one budget', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await request(base, 'POST', '/_admin/login', { body: { email: 'owner@example.com', password: 'wrong-' + i } });
      expect(r.status).toBe(401);
    }
    const locked = await request<{ error: string }>(base, 'POST', '/_admin/login', { body: { email: 'owner@example.com', password: 'pw-owner' } });
    expect(locked.status).toBe(429);
    expect(locked.headers.get('retry-after')).toBeTruthy();
    expect((await request(base, 'GET', '/_admin/whoami', { headers: { authorization: 'Bearer t0k' } })).status).toBe(429);
  });
});
