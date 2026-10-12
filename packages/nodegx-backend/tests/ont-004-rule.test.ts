/**
 * P116 ONT-004 AC3 — the permission rule at depth four, enforced by the backend.
 *
 * *"An account holder sees the members on their account."* A membership business enforces this
 * in its dashboard, four links deep, eight times over. Here it is one `path` atom in
 * `security.json`, and the backend applies it inside the same SQL as the row ACL — so a request
 * as the wrong account holder gets nothing, a member who holds nothing gets nothing, an
 * anonymous caller is refused at the door, and `get`, `count` and `update` are narrowed the
 * same way as `find`. Over real sockets, on a LOCKED backend, through the Parse wire.
 *
 * The rule starts at the caller's own `_User` row: `Person.owner` → the person they are →
 * their memberships as holder → the account → every membership on it → the person. Five
 * hops from the login, four from the person, which is the census's number.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const HOLDER_SEES = {
  path: {
    hops: [
      { from: 'Person', by: 'owner' },
      { from: 'Membership', by: 'person', where: { role: 'holder' } },
      { follow: 'account' },
      { from: 'Membership', by: 'account' },
      { follow: 'person' }
    ],
    maxDepth: 5
  }
};

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: {
      find: 'authenticated',
      get: 'authenticated',
      create: 'authenticated',
      update: 'authenticated',
      delete: 'nobody'
    },
    creatorOwns: false
  },
  collections: {
    Person: { permissions: { find: HOLDER_SEES, get: HOLDER_SEES, update: HOLDER_SEES, delete: 'nobody' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

interface Signup {
  objectId: string;
  sessionToken: string;
}
interface Found {
  results: Array<Record<string, unknown>>;
  count?: number;
}

describe('ONT-004 AC3 — a rule through a path, kept by the backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
    request<T>(base, method, p, { body, headers });
  const asUser = (u: Signup) => ({ 'x-parse-session-token': u.sessionToken });
  const users: Record<string, Signup> = {};
  const people: Record<string, string> = {};

  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont004-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'ont004', backendName: 'ONT-004', authToken: 't0k' });
    base = (await service.start()).listen.url;

    for (const name of ['ann', 'bob', 'cy', 'di']) {
      const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}` }, {});
      expect(r.status).toBe(201);
      users[name] = r.json;
    }
    // The schema a projected world would push: links as Pointers with a target.
    const table = (name: string, columns: unknown[]) =>
      req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
    expect((await table('Company', [{ name: 'name', type: 'String' }])).status).toBe(200);
    expect(
      (
        await table('Account', [
          { name: 'name', type: 'String' },
          { name: 'company', type: 'Pointer', targetClass: 'Company' }
        ])
      ).status
    ).toBe(200);
    expect(
      (
        await table('Person', [
          { name: 'name', type: 'String' },
          { name: 'owner', type: 'Pointer', targetClass: '_User' }
        ])
      ).status
    ).toBe(200);
    expect(
      (
        await table('Membership', [
          { name: 'person', type: 'Pointer', targetClass: 'Person' },
          { name: 'account', type: 'Pointer', targetClass: 'Account' },
          { name: 'role', type: 'String' }
        ])
      ).status
    ).toBe(200);

    const make = async (collection: string, data: Record<string, unknown>): Promise<string> => {
      const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data);
      expect([200, 201]).toContain(r.status);
      return r.json.objectId;
    };
    const acme = await make('Company', { name: 'Acme' });
    const globex = await make('Company', { name: 'Globex' });
    const acmeMain = await make('Account', { name: 'acme-main', company: ptr('Company', acme) });
    const globexMain = await make('Account', { name: 'globex-main', company: ptr('Company', globex) });
    for (const name of ['ann', 'bob', 'cy', 'di'])
      people[name] = await make('Person', { name, owner: ptr('_User', users[name].objectId) });
    // ann holds acme-main, bob is a member on it; cy holds globex-main; di is on nothing.
    await make('Membership', { person: ptr('Person', people.ann), account: ptr('Account', acmeMain), role: 'holder' });
    await make('Membership', { person: ptr('Person', people.bob), account: ptr('Account', acmeMain), role: 'member' });
    await make('Membership', { person: ptr('Person', people.cy), account: ptr('Account', globexMain), role: 'holder' });
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const names = (r: { json: Found }) => r.json.results.map((p) => p.name).sort();

  it('the rule validates, and is refused where a row cannot be reached (create) or on a function', () => {
    expect(validateSecurityConfig(LOCKED)).toEqual([]);
    const onCreate = JSON.parse(JSON.stringify(LOCKED));
    onCreate.collections.Person.permissions.create = HOLDER_SEES;
    expect(validateSecurityConfig(onCreate).join(' ')).toMatch(/allowed only on find, get, update and delete/);
    const onFunction = JSON.parse(JSON.stringify(LOCKED));
    onFunction.functions = { roster: { call: HOLDER_SEES } };
    expect(validateSecurityConfig(onFunction).join(' ')).toMatch(/allowed only on find/);
    const unbounded = JSON.parse(JSON.stringify(LOCKED));
    delete unbounded.collections.Person.permissions.find.path.maxDepth;
    expect(validateSecurityConfig(unbounded).join(' ')).toMatch(/maxDepth/);
  });

  it('AC3 — the holder sees the members on their account, and nobody else', async () => {
    const ann = await req<Found>('GET', '/classes/Person', undefined, asUser(users.ann));
    expect(ann.status).toBe(200);
    expect(names(ann)).toEqual(['ann', 'bob']);

    const cy = await req<Found>('GET', '/classes/Person', undefined, asUser(users.cy));
    expect(names(cy)).toEqual(['cy']);
  });

  it('🔴 AC3 — the wrong account holder gets nothing: a member, and a person on no account', async () => {
    const bob = await req<Found>('GET', '/classes/Person', undefined, asUser(users.bob));
    expect(bob.status).toBe(200);
    expect(bob.json.results).toEqual([]);
    const di = await req<Found>('GET', '/classes/Person', undefined, asUser(users.di));
    expect(di.json.results).toEqual([]);
  });

  it('an anonymous caller is refused at the door — a path has nowhere to start', async () => {
    const anon = await req('GET', '/classes/Person', undefined, {});
    expect(anon.status).toBe(403);
  });

  it('the narrowing composes with the caller’s own where and with count', async () => {
    const q = (u: Signup, extra: Record<string, unknown>) =>
      req<Found>('POST', '/classes/Person', { _method: 'GET', count: 1, ...extra }, asUser(u));
    const bobOnly = await q(users.ann, { where: { name: 'bob' } });
    expect(names(bobOnly)).toEqual(['bob']);
    expect(bobOnly.json.count).toBe(1);
    // cy can name bob, and still gets nothing: the rule is ANDed, never ORed.
    const cyAsksForBob = await q(users.cy, { where: { name: 'bob' } });
    expect(cyAsksForBob.json.results).toEqual([]);
    expect(cyAsksForBob.json.count).toBe(0);
  });

  it('get and update are narrowed the same way: a person out of reach is not found', async () => {
    const annGetsBob = await req('GET', `/classes/Person/${people.bob}`, undefined, asUser(users.ann));
    expect(annGetsBob.status).toBe(200);
    const cyGetsBob = await req('GET', `/classes/Person/${people.bob}`, undefined, asUser(users.cy));
    expect(cyGetsBob.status).toBe(404);

    const cyEditsBob = await req('PUT', `/classes/Person/${people.bob}`, { name: 'robert' }, asUser(users.cy));
    expect(cyEditsBob.status).toBe(404);
    const annEditsBob = await req('PUT', `/classes/Person/${people.bob}`, { name: 'robert' }, asUser(users.ann));
    expect(annEditsBob.status).toBe(200);
    const after = await req<Found>('GET', '/classes/Person', undefined, asUser(users.ann));
    expect(names(after)).toEqual(['ann', 'robert']);
  });

  it('the admin sees everyone: the rule narrows a signed-in caller, never a bypass', async () => {
    const all = await req<Found>('GET', '/classes/Person');
    expect(names(all)).toEqual(['ann', 'cy', 'di', 'robert']);
  });

  it('the dry run says the decision is narrowed, so the manager can show why a list is short', async () => {
    const r = await req<{ allowed: boolean; narrow?: { $path?: unknown } }>('POST', '/admin/permissions/check', {
      principal: { kind: 'user', userId: users.bob.objectId, roles: [] },
      collection: 'Person',
      op: 'find'
    });
    expect(r.status).toBe(200);
    expect(r.json.allowed).toBe(true);
    expect(r.json.narrow && r.json.narrow.$path).toBeDefined();
    const admin = await req<{ allowed: boolean; narrow?: unknown }>('POST', '/admin/permissions/check', {
      principal: { kind: 'admin' },
      collection: 'Person',
      op: 'find'
    });
    expect(admin.json.narrow).toBeUndefined();
  });
});
