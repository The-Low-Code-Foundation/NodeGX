/**
 * P116 ONT-012 AC2 / AC4 / AC5 (R-a) — *"their company's representative reads my account, but not
 * my two health details; I read those myself."* Kept by the backend, on SQLite and PostgreSQL,
 * over real sockets on a LOCKED backend.
 *
 * `collections.Account.fields.healthNeeds.read` (and `riskScore`'s) = the person's own account
 * through their login (a path rule) or the `care` role. So: the representative (rep) reads every
 * account without them, at every door that returns a record (find, get, include from another
 * collection, BYOB reads and writes, the PUT increment echo); the person reads them on their own
 * account and not on another's; `care` reads them everywhere; the admin is not bound. A request
 * that NAMES a hidden detail is refused with a 403 naming it — where, order, keys, distinct, an
 * aggregate, a precondition, a path hop from another collection, a search — from rep, and from the
 * person too (shown on some rows is not shown on all). Then two mutants: the strip skipped, and
 * the naming check skipped; each is caught by name.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as fieldRules from '../src/persistence/fieldRules';
import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const OWN_OR_CARE = [{ path: { hops: [{ from: 'Account', by: 'login' }], maxDepth: 1 } }, 'role:care'];

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: false
  },
  collections: {
    Account: { fields: { healthNeeds: { read: OWN_OR_CARE }, riskScore: { read: OWN_OR_CARE } } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('ONT-012 AC4 — the validator', () => {
  const withFields = (fields: unknown, collection = 'Account') => {
    const cfg = JSON.parse(JSON.stringify(LOCKED));
    cfg.collections = { [collection]: { fields } };
    return validateSecurityConfig(cfg).join(' | ');
  };
  it('the locked config is valid', () => expect(validateSecurityConfig(LOCKED)).toEqual([]));
  it.each([
    [{}, /is empty/],
    [{ healthNeeds: {} }, /healthNeeds.read is required/],
    [{ healthNeeds: { read: 'role:care', write: 'nobody' } }, /unknown key "write".*who may change a field is not/],
    [{ healthNeeds: { read: 'everyone' } }, /unknown rule value "everyone"/],
    [{ objectId: { read: 'nobody' } }, /bookkeeping/],
    [{ healthNeeds: 'role:care' }, /must be an object \{ read \}/]
  ])('refuses %j', (fields, message) => expect(withFields(fields)).toMatch(message));
  it('refuses it on a system collection', () => expect(withFields({ x: { read: 'nobody' } }, '_User')).toMatch(/system collections/));
});

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;
interface Found {
  results: Row[];
  count?: number;
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont012f_${process.pid}_${Date.now().toString(36)}`;
const psql = (url: string, sql: string): void => void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
const pgUrl = (() => {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${DB_NAME}`;
  return u.toString();
})();
const engines: Array<{ name: string; available: boolean; storageUrl?: string }> = [
  { name: 'SQLite', available: true },
  { name: 'PostgreSQL', available: pgReachable(), storageUrl: pgUrl }
];
afterAll(() => {
  if (engines[1].available) {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
    } catch {
      /* a client still attached; the next run uses a new name */
    }
  }
});

const HIDDEN = ['healthNeeds', 'riskScore'];

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-012 AC2 — who reads which detail, on ${engine.name}`, () => {
    let dataDir: string;
    let service: BackendService;
    let base: string;
    let previousEnv: string | undefined;
    const admin = { authorization: 'Bearer t0k' };
    const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
      request<T>(base, method, p, { body, headers });
    const as = (who: string) => ({ 'x-parse-session-token': users[who].sessionToken });
    const users: Record<string, Signup> = {};
    const account: Record<string, string> = {};
    let visit = '';
    const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
    const find = (who: string, query = '') => req<Found>('GET', `/classes/Account${query}`, undefined, as(who));
    const byName = (r: { json: Found }) => Object.fromEntries(r.json.results.map((a) => [a.name, a]));
    const hasHealth = (row: Row | undefined) => HIDDEN.map((f) => !!row && f in row);
    const expectNamed = (r: { status: number; json: unknown }, field: string) => {
      expect(r.status).toBe(403);
      expect(r.json).toMatchObject({ reason: 'hidden-field', collection: 'Account', field });
    };

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont012f-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'ont012f', backendName: 'ONT-012 fields', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['ann', 'bob', 'rep', 'nurse']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      expect((await req('POST', '/admin/roles', { name: 'care' })).status).toBe(201);
      expect((await req('POST', '/admin/roles/care/users', { userId: users.nurse.objectId })).status).toBe(200);
      const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
      expect(
        (
          await table('Account', [
            { name: 'name', type: 'String' },
            { name: 'login', type: 'Pointer', targetClass: '_User' },
            { name: 'healthNeeds', type: 'String' },
            { name: 'riskScore', type: 'Number' }
          ])
        ).status
      ).toBe(200);
      expect((await table('Visit', [{ name: 'account', type: 'Pointer', targetClass: 'Account' }, { name: 'note', type: 'String' }])).status).toBe(200);
      for (const [who, needs, risk] of [['ann', 'diabetes', 3], ['bob', 'asthma', 5]] as const) {
        const r = await req<{ objectId: string }>('POST', '/classes/Account', { name: who, login: ptr('_User', users[who].objectId), healthNeeds: needs, riskScore: risk });
        expect(r.status).toBe(201);
        account[who] = r.json.objectId;
      }
      visit = (await req<{ objectId: string }>('POST', '/classes/Visit', { account: ptr('Account', account.ann), note: 'checkup' })).json.objectId;
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it('🔴 the representative reads every account, without the two details (find)', async () => {
      const r = await find('rep');
      expect(r.status).toBe(200);
      const rows = byName(r);
      expect(Object.keys(rows).sort()).toEqual(['ann', 'bob']);
      expect(hasHealth(rows.ann)).toEqual([false, false]);
      expect(hasHealth(rows.bob)).toEqual([false, false]);
      expect(rows.ann.name).toBe('ann');
    });

    it('the person reads them on their own account and not on another’s; care reads them on every one; the admin is not bound', async () => {
      const ann = byName(await find('ann'));
      expect(hasHealth(ann.ann)).toEqual([true, true]);
      expect(ann.ann.healthNeeds).toBe('diabetes');
      expect(hasHealth(ann.bob)).toEqual([false, false]);
      const nurse = byName(await find('nurse'));
      expect(hasHealth(nurse.ann)).toEqual([true, true]);
      expect(hasHealth(nurse.bob)).toEqual([true, true]);
      const all = byName(await req<Found>('GET', '/classes/Account'));
      expect(hasHealth(all.bob)).toEqual([true, true]);
    });

    it('get, include from another collection, and the BYOB reads are stripped the same way', async () => {
      const got = await req<Row>('GET', `/classes/Account/${account.ann}`, undefined, as('rep'));
      expect(got.status).toBe(200);
      expect(hasHealth(got.json)).toEqual([false, false]);
      expect(hasHealth((await req<Row>('GET', `/classes/Account/${account.ann}`, undefined, as('ann'))).json)).toEqual([true, true]);
      const inc = await req<Row>('GET', `/classes/Visit/${visit}?include=account`, undefined, as('rep'));
      expect(inc.status).toBe(200);
      const embedded = inc.json.account as Row;
      expect(embedded.__type).toBe('Object');
      expect(hasHealth(embedded)).toEqual([false, false]);
      const ownInc = await req<Row>('GET', `/classes/Visit/${visit}?include=account`, undefined, as('ann'));
      expect(hasHealth(ownInc.json.account as Row)).toEqual([true, true]);
      const list = await req<{ results: Row[] }>('GET', '/api/Account', undefined, as('rep'));
      expect(list.status).toBe(200);
      expect(list.json.results.some((row) => hasHealth(row).some(Boolean))).toBe(false);
      expect(hasHealth((await req<Row>('GET', `/api/Account/${account.bob}`, undefined, as('rep'))).json)).toEqual([false, false]);
    });

    it('🔴 a write answers without them: the PUT increment echo (an Increment by 0 would read it), BYOB PUT', async () => {
      const echo = await req<Row>('PUT', `/classes/Account/${account.bob}`, { riskScore: { __op: 'Increment', amount: 0 } }, as('rep'));
      expect(echo.status).toBe(200);
      expect('riskScore' in echo.json).toBe(false);
      const own = await req<Row>('PUT', `/classes/Account/${account.ann}`, { riskScore: { __op: 'Increment', amount: 0 } }, as('ann'));
      expect(own.json.riskScore).toBe(3);
      const saved = await req<Row>('PUT', `/api/Account/${account.bob}`, { name: 'bob' }, as('rep'));
      expect(saved.status).toBe(200);
      expect(hasHealth(saved.json)).toEqual([false, false]);
    });

    it('🔴 naming a hidden detail is refused by name: where, order, keys, distinct, aggregate, precondition, a path from another collection, search', async () => {
      const where = (w: unknown) => encodeURIComponent(JSON.stringify(w));
      expectNamed(await find('rep', `?where=${where({ healthNeeds: 'asthma' })}`), 'healthNeeds');
      expectNamed(await find('rep', `?where=${where({ $or: [{ name: 'x' }, { riskScore: { $gt: 4 } }] })}`), 'riskScore');
      expectNamed(await find('rep', '?order=-riskScore'), 'riskScore');
      expectNamed(await find('rep', '?keys=name,healthNeeds'), 'healthNeeds');
      expectNamed(await find('rep', `?count=1&limit=0&where=${where({ healthNeeds: 'asthma' })}`), 'healthNeeds');
      expectNamed(await req('GET', '/aggregate/Account?distinct=healthNeeds', undefined, as('rep')), 'healthNeeds');
      expectNamed(await req('GET', `/aggregate/Account?group=${where({ top: { $max: '$riskScore' } })}`, undefined, as('rep')), 'riskScore');
      expectNamed(await req('PUT', `/classes/Account/${account.bob}`, { name: 'bob' }, { ...as('rep'), 'x-nodegx-if': JSON.stringify({ healthNeeds: 'asthma' }) }), 'healthNeeds');
      const throughVisit = { $path: { from: { collection: 'Account', where: { healthNeeds: 'diabetes' } }, hops: [{ from: 'Visit', by: 'account' }], maxDepth: 1 } };
      const viaPath = await req<Row>('GET', `/classes/Visit?where=${where(throughVisit)}`, undefined, as('rep'));
      expectNamed(viaPath, 'healthNeeds');
      expectNamed(await req('POST', '/classes/Account', { _method: 'GET', search: 'asthma' }, as('rep')), 'healthNeeds');
      expectNamed(await req('GET', `/api/Account?where=${where({ healthNeeds: 'asthma' })}`, undefined, as('rep')), 'healthNeeds');
    });

    it('shown on some rows is not shown on all: the person may not filter by it either; care and the admin may; a visible field is fine', async () => {
      const where = encodeURIComponent(JSON.stringify({ healthNeeds: 'asthma' }));
      expectNamed(await find('ann', `?where=${where}`), 'healthNeeds');
      const nurse = await find('nurse', `?where=${where}`);
      expect(nurse.status).toBe(200);
      expect(nurse.json.results.map((a) => a.name)).toEqual(['bob']);
      expect((await req<Found>('GET', `/classes/Account?where=${where}`)).json.results.length).toBe(1);
      const visible = await find('rep', `?where=${encodeURIComponent(JSON.stringify({ name: 'bob' }))}&order=name`);
      expect(visible.status).toBe(200);
      expect(visible.json.results.length).toBe(1);
    });

    it('AC5 — the manager saving the collection’s permissions, or reverting them, keeps the field rules', async () => {
      const rules = () => (service as unknown as { security: { config: { collections: Record<string, { fields?: unknown }> } } }).security.config.collections.Account?.fields;
      const before = JSON.stringify(rules());
      expect((await req('PUT', '/admin/permissions/collections/Account', { permissions: { find: 'authenticated' }, creatorOwns: false })).status).toBe(200);
      expect(JSON.stringify(rules())).toBe(before);
      expect((await req('DELETE', '/admin/permissions/collections/Account')).status).toBe(200);
      expect(JSON.stringify(rules())).toBe(before);
      expect(hasHealth(byName(await find('rep')).bob)).toEqual([false, false]);
    });

    it('MUTANT — the strip skipped: the representative reads bob’s health details, and the find case is what catches it', async () => {
      const spy = jest.spyOn(fieldRules, 'stripHidden').mockImplementation(async (_c, records) => records);
      try {
        expect(hasHealth(byName(await find('rep')).bob)).toEqual([true, true]);
      } finally {
        spy.mockRestore();
      }
    });

    it('MUTANT — the naming check skipped: a where on the hidden detail answers which account has asthma', async () => {
      const spy = jest.spyOn(fieldRules, 'refuseHiddenNamed').mockImplementation(() => undefined);
      try {
        const r = await find('rep', `?where=${encodeURIComponent(JSON.stringify({ healthNeeds: 'asthma' }))}`);
        expect(r.status).toBe(200);
        expect(r.json.results.map((a) => a.name)).toEqual(['bob']);
      } finally {
        spy.mockRestore();
      }
    });
  });
}
