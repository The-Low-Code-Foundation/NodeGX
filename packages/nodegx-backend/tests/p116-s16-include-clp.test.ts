/**
 * Bug P116-S16-INCLUDECLP — `include` read the TARGET collection under the caller's row ACL only;
 * its own `get` rule, and a path rule's narrowing, were never asked (`AdapterFacade.toWire`). A
 * `$path` walked a collection the caller may not `find`, and answered for its values. Found while
 * counting ONT-012's doors (§4); fixed s17 — the caller's ACL option carries each collection's
 * `get`/`find` answer (`reach`), the facade reads it (`fieldRules.reachOf`).
 *
 * And R-h (Richard, 2026-10-11): *"someone reads a message that links to its author — what do they
 * get?"* → the name, not the account. Before, an `include` of another person's `_User` carried
 * their email, verified flag and admin access to anyone signed in.
 *
 * The world: `Salary` is closed to users (`find`/`get: nobody`); `Payslip` is narrowed to the
 * user's own (a path rule); `Contract` is open and links to all three plus a `_User`. Rows carry
 * no ACL (the default when `creatorOwns` is off), so the row ACL alone lets everything through —
 * which is the bug. Measured red before the fix by a probe (same doors): P1/P2/P10 embedded the
 * salary, P3 max's payslip, P5/P6 answered >90k vs >99k, P7 embedded max's email, P8 matched it.
 * On SQLite and PostgreSQL, over real sockets on a LOCKED backend.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as fieldRules from '../src/persistence/fieldRules';
import * as model from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const RULES = (r: unknown) => ({ find: r, get: r, create: 'nobody', update: 'nobody', delete: 'nobody' });
const OWN = { path: { hops: [{ from: 'Payslip', by: 'employee' }], maxDepth: 1 } };
const CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: false
  },
  collections: { Salary: { permissions: RULES('nobody') }, Payslip: { permissions: RULES(OWN) } },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;
interface Found {
  results: Row[];
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_includeclp_${process.pid}_${Date.now().toString(36)}`;
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

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`P116-S16-INCLUDECLP — a request reads another collection by that collection's rule, on ${engine.name}`, () => {
    let dataDir: string;
    let service: BackendService;
    let base: string;
    let previousEnv: string | undefined;
    const admin = { authorization: 'Bearer t0k' };
    const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
      request<T>(base, method, p, { body, headers });
    const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
    const where = (w: unknown) => `where=${encodeURIComponent(JSON.stringify(w))}`;
    const users: Record<string, Signup> = {};
    const id: Record<string, string> = {};
    const eve = () => ({ 'x-parse-session-token': users.eve.sessionToken });
    const asEve = <T = unknown>(p: string) => req<T>('GET', p, undefined, eve());
    const pathFrom = (collection: string, w: unknown, by: string) =>
      where({ $path: { from: { collection, where: w }, hops: [{ from: 'Contract', by }], maxDepth: 1 } });
    const expectRefused = (r: { status: number; json: unknown }, collection: string) => {
      expect(r.status).toBe(403);
      expect(r.json).toMatchObject({ reason: 'collection-rule', collection });
    };

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-includeclp-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'includeclp', backendName: 'include CLP', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['eve', 'max']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}`, email: `${name}@example.org` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
      expect((await table('Salary', [{ name: 'amount', type: 'Number' }])).status).toBe(200);
      expect(
        (await table('Payslip', [{ name: 'amount', type: 'Number' }, { name: 'employee', type: 'Pointer', targetClass: '_User' }])).status
      ).toBe(200);
      expect(
        (
          await table('Contract', [
            { name: 'title', type: 'String' },
            { name: 'salary', type: 'Pointer', targetClass: 'Salary' },
            { name: 'payslip', type: 'Pointer', targetClass: 'Payslip' },
            { name: 'signedBy', type: 'Pointer', targetClass: '_User' }
          ])
        ).status
      ).toBe(200);
      const make = async (collection: string, data: Row): Promise<string> => {
        const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data);
        expect([200, 201]).toContain(r.status);
        return r.json.objectId;
      };
      id.salary = await make('Salary', { amount: 91000 });
      id.mine = await make('Payslip', { amount: 10, employee: ptr('_User', users.eve.objectId) });
      id.his = await make('Payslip', { amount: 77000, employee: ptr('_User', users.max.objectId) });
      id.contract = await make('Contract', {
        title: 'engineer',
        salary: ptr('Salary', id.salary),
        payslip: ptr('Payslip', id.his),
        signedBy: ptr('_User', users.max.objectId)
      });
      id.own = await make('Contract', { title: 'mine', payslip: ptr('Payslip', id.mine) });
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it('controls: the salary is refused to eve at its own door, max’s payslip is not found, her own is read', async () => {
      expect((await asEve(`/classes/Salary/${id.salary}`)).status).toBe(403);
      expect((await asEve(`/classes/Payslip/${id.his}`)).status).toBe(404);
      expect((await asEve<Row>(`/classes/Payslip/${id.mine}`)).json.amount).toBe(10);
    });

    it('a closed collection is never embedded: get, query and the POST query tunnel each answer a bare link', async () => {
      const bare = { __type: 'Pointer', className: 'Salary', objectId: id.salary };
      expect((await asEve<Row>(`/classes/Contract/${id.contract}?include=salary`)).json.salary).toEqual(bare);
      expect((await asEve<Found>(`/classes/Contract?include=salary&${where({ title: 'engineer' })}`)).json.results[0].salary).toEqual(bare);
      const tunnel = await req<Found>('POST', '/classes/Contract', { _method: 'GET', include: 'salary', where: { title: 'engineer' } }, eve());
      expect(tunnel.json.results[0].salary).toEqual(bare);
    });

    it('a narrowed collection is embedded only where the rule reaches: max’s payslip is a bare link, eve’s own is the record', async () => {
      expect((await asEve<Row>(`/classes/Contract/${id.contract}?include=payslip`)).json.payslip).toEqual({
        __type: 'Pointer',
        className: 'Payslip',
        objectId: id.his
      });
      const own = (await asEve<Found>(`/classes/Contract?include=payslip&${where({ title: 'mine' })}`)).json.results[0].payslip as Row;
      expect(own).toMatchObject({ __type: 'Object', className: 'Payslip', amount: 10 });
    });

    it('a path from a closed collection is refused by name — before, >90k found the contract and >99k did not', async () => {
      expectRefused(await asEve(`/classes/Contract?${pathFrom('Salary', { amount: { $gt: 90000 } }, 'salary')}`), 'Salary');
      expectRefused(await asEve(`/classes/Contract?${pathFrom('Salary', { amount: { $gt: 99000 } }, 'salary')}`), 'Salary');
    });

    it('a path through a narrowed collection is refused too: it would answer for the payslips eve may not read', async () => {
      const r = await asEve<{ error: string }>(`/classes/Contract?${pathFrom('Payslip', { amount: { $gt: 70000 } }, 'payslip')}`);
      expectRefused(r, 'Payslip');
      expect(r.json.error).toMatch(/only some records of "Payslip"/);
    });

    it('a relation filter on a record of a closed collection is refused', async () => {
      expectRefused(await asEve(`/classes/Contract?${where({ $relatedTo: { object: ptr('Salary', id.salary), key: 'x' } })}`), 'Salary');
    });

    it('R-h: an included author carries their name, not their account', async () => {
      const signedBy = (await asEve<Row>(`/classes/Contract/${id.contract}?include=signedBy`)).json.signedBy as Row;
      expect(signedBy).toMatchObject({ __type: 'Object', className: '_User', objectId: users.max.objectId, username: 'max' });
      for (const detail of ['email', 'emailVerified', 'disabled', 'adminAccess', 'authData', 'password']) expect(signedBy).not.toHaveProperty(detail);
    });

    it('R-h: a path from the accounts may start at a name, never at an email — before, it matched max’s', async () => {
      const byName = await asEve<Found>(`/classes/Contract?${pathFrom('_User', { username: 'max' }, 'signedBy')}`);
      expect(byName.status).toBe(200);
      expect(byName.json.results.map((c) => c.title)).toEqual(['engineer']);
      const byEmail = await asEve(`/classes/Contract?${pathFrom('_User', { email: 'max@example.org' }, 'signedBy')}`);
      expect(byEmail.status).toBe(403);
      expect(byEmail.json).toMatchObject({ reason: 'hidden-field', collection: '_User', field: 'email' });
    });

    it('the admin is not bound: every link embeds, the email included', async () => {
      const r = (await req<Row>('GET', `/classes/Contract/${id.contract}?include=salary,payslip,signedBy`)).json;
      expect((r.salary as Row).amount).toBe(91000);
      expect((r.payslip as Row).amount).toBe(77000);
      expect((r.signedBy as Row).email).toBe('max@example.org');
    });

    it('MUTANT — the include reads every target as open: the salary comes back embedded', async () => {
      // Spies the facade's call only; the path walk calls `reachOf` inside its own module.
      const spy = jest.spyOn(fieldRules, 'reachOf').mockImplementation(() => 'all');
      try {
        expect(((await asEve<Row>(`/classes/Contract/${id.contract}?include=salary`)).json.salary as Row).amount).toBe(91000);
      } finally {
        spy.mockRestore();
      }
    });

    it('MUTANT — the rules never read into the ACL option: max’s payslip comes back embedded, and the paths answer', async () => {
      const spy = jest.spyOn(model, 'collectionReach').mockImplementation(() => undefined);
      try {
        expect(((await asEve<Row>(`/classes/Contract/${id.contract}?include=payslip`)).json.payslip as Row).amount).toBe(77000);
        const titles = async (w: string) => (await asEve<Found>(`/classes/Contract?${w}`)).json.results.map((c) => c.title);
        expect(await titles(pathFrom('Salary', { amount: { $gt: 90000 } }, 'salary'))).toEqual(['engineer']);
        expect(await titles(pathFrom('Salary', { amount: { $gt: 99000 } }, 'salary'))).toEqual([]);
        expect(await titles(pathFrom('Payslip', { amount: { $gt: 70000 } }, 'payslip'))).toEqual(['engineer']);
      } finally {
        spy.mockRestore();
      }
    });
  });
}
