/**
 * Bug P116-S17-DOTTEDFILTER — a filter on a linked record's field (`salary.amount > 90000`), the kind
 * the editor offers in a filter (`schema-ports.ts` `getFilterFields` → the one-hop relation paths),
 * answered `{"results": []}` with a 200 on the built-in backend, for the admin too. The builder read
 * `salary.amount` as one column (`escapeColumn` strips the dot), which the table does not have, so it
 * compiled to `NULL > ?`: fewer rows, silently, reading as "nothing matches".
 *
 * Fixed: the dotted key follows its one hop, compiled as the `$path` it means (a hop back from the
 * linked collection), and the facade holds the linked collection to its own `find` rule and its
 * hidden fields, exactly as it holds a `$path`. A dotted key that is not a link, or goes two hops, is
 * refused by name. On SQLite and PostgreSQL, over real sockets on a LOCKED backend; the world is
 * INCLUDECLP's (`Salary` closed, `Payslip` narrowed to the user's own) plus an open `Grade`.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
const DB_NAME = `nodegx_dotted_${process.pid}_${Date.now().toString(36)}`;
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
  suite(`P116-S17-DOTTEDFILTER — a filter on a linked record's field follows the link, on ${engine.name}`, () => {
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
    const titles = async (w: unknown, headers: Record<string, string> = admin) => {
      const r = await req<Found>('GET', `/classes/Contract?${where(w)}`, undefined, headers);
      expect(r.status).toBe(200);
      return r.json.results.map((c) => c.title).sort();
    };

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-dotted-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'dotted', backendName: 'dotted filter', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['eve', 'max']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}`, email: `${name}@example.org` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
      expect((await table('Salary', [{ name: 'amount', type: 'Number' }])).status).toBe(200);
      expect((await table('Grade', [{ name: 'level', type: 'Number' }])).status).toBe(200);
      expect(
        (await table('Payslip', [{ name: 'amount', type: 'Number' }, { name: 'employee', type: 'Pointer', targetClass: '_User' }])).status
      ).toBe(200);
      expect(
        (
          await table('Contract', [
            { name: 'title', type: 'String' },
            { name: 'salary', type: 'Pointer', targetClass: 'Salary' },
            { name: 'grade', type: 'Pointer', targetClass: 'Grade' },
            { name: 'payslip', type: 'Pointer', targetClass: 'Payslip' },
            { name: 'signedBy', type: 'Pointer', targetClass: '_User' },
            { name: 'terms', type: 'Object' }
          ])
        ).status
      ).toBe(200);
      const make = async (collection: string, data: Row): Promise<string> => {
        const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data);
        expect([200, 201]).toContain(r.status);
        return r.json.objectId;
      };
      id.salary = await make('Salary', { amount: 91000 });
      id.senior = await make('Grade', { level: 3 });
      id.junior = await make('Grade', { level: 1 });
      id.his = await make('Payslip', { amount: 77000, employee: ptr('_User', users.max.objectId) });
      await make('Contract', {
        title: 'engineer',
        salary: ptr('Salary', id.salary),
        grade: ptr('Grade', id.senior),
        payslip: ptr('Payslip', id.his),
        signedBy: ptr('_User', users.max.objectId),
        terms: { weeks: 4 }
      });
      await make('Contract', { title: 'intern', grade: ptr('Grade', id.junior) });
      await make('Contract', { title: 'unlinked' });
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it('the admin: salary.amount > 90000 finds the contract and > 99000 does not — before, both answered []', async () => {
      expect(await titles({ 'salary.amount': { $gt: 90000 } })).toEqual(['engineer']);
      expect(await titles({ 'salary.amount': { $gt: 99000 } })).toEqual([]);
    });

    it('every spelling a filter uses: equality, $in, $ne, beside a field of its own and inside $or', async () => {
      expect(await titles({ 'grade.level': 1 })).toEqual(['intern']);
      expect(await titles({ 'grade.level': { $in: [1, 3] } })).toEqual(['engineer', 'intern']);
      // $ne reads the linked records whose level is not 3; a contract with no grade links none.
      expect(await titles({ 'grade.level': { $ne: 3 } })).toEqual(['intern']);
      expect(await titles({ 'grade.level': 3, title: 'intern' })).toEqual([]);
      expect(await titles({ $or: [{ 'grade.level': 3 }, { title: 'unlinked' }] })).toEqual(['engineer', 'unlinked']);
    });

    it('a signed-in person filters by a linked collection they may read', async () => {
      expect(await titles({ 'grade.level': { $gte: 3 } }, eve())).toEqual(['engineer']);
    });

    it('a linked collection they may not read is refused by name, as a $path through it is', async () => {
      const closed = await req('GET', `/classes/Contract?${where({ 'salary.amount': { $gt: 90000 } })}`, undefined, eve());
      expect(closed.status).toBe(403);
      expect(closed.json).toMatchObject({ reason: 'collection-rule', collection: 'Salary' });
      const narrowed = await req('GET', `/classes/Contract?${where({ 'payslip.amount': { $gt: 70000 } })}`, undefined, eve());
      expect(narrowed.status).toBe(403);
      expect(narrowed.json).toMatchObject({ reason: 'collection-rule', collection: 'Payslip' });
    });

    it('R-h: a linked account is filtered by its name, never by its email', async () => {
      expect(await titles({ 'signedBy.username': 'max' }, eve())).toEqual(['engineer']);
      const byEmail = await req('GET', `/classes/Contract?${where({ 'signedBy.email': 'max@example.org' })}`, undefined, eve());
      expect(byEmail.status).toBe(403);
      expect(byEmail.json).toMatchObject({ reason: 'hidden-field', collection: '_User', field: 'email' });
    });

    it('a dotted key that is not a link, or goes two links deep, is refused in words — never an empty answer', async () => {
      for (const w of [{ 'title.length': 3 }, { 'terms.weeks': 4 }, { 'grade.salary.amount': 1 }]) {
        const r = await req<{ error: string }>('GET', `/classes/Contract?${where(w)}`);
        expect(r.status).toBe(400);
        expect(r.json.error).toContain(Object.keys(w)[0]);
      }
    });
  });
}
