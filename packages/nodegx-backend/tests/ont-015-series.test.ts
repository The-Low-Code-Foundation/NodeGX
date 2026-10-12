/**
 * P116 ONT-015 — *"Invoice numbers look like INV-2026-0042. The number goes up by one every time,
 * never skips, and is never used twice. It starts again at 0001 each January."* Kept by the backend,
 * on SQLite and PostgreSQL, over real sockets on a LOCKED backend.
 *
 * The store's half (in order, never after a delete, two at once, gap-free and not, the padding) is the
 * conformance area `series` (`conformance/cases/series.ts`). This file grades what needs the backend
 * around it: the doors (a person's create that brings its own number is a 400 naming the field at
 * `/classes`, the upsert, `/api`, the batch; the admin may bring one, AC2), the create's answer
 * carrying the number, the year and the month rolling on the backend's clock (UTC), `_Series` unread
 * by anyone but the admin (AC4), a series that cannot be kept refused when the table is declared —
 * a number the admin brings in the series' own look moving the counter past it (SERIESCARRY) — and four
 * mutants, each shown caught: the restart ignored, a gap-free number taken outside the insert, the doors'
 * refusal taken out, and the counter left under a number brought (whose 409 must name it, SERIESMSG).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as series from '@noodl/runtime/src/api/adapters/series';
import * as door from '../src/server/series-door';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont015_${process.pid}_${Date.now().toString(36)}`;
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
  series.setSeriesClock(null);
  if (engines[1].available) {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
    } catch {
      /* a client still attached; the next run uses a new name */
    }
  }
});

const at = (iso: string) => () => new Date(iso);

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-015 — a number never reused, on ${engine.name}`, () => {
    let dataDir: string;
    let service: BackendService;
    let base: string;
    let previousEnv: string | undefined;
    const admin = { authorization: 'Bearer t0k' };
    const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
      request<T>(base, method, p, { body, headers });
    let ann: Record<string, string>;
    const table = (name: string, columns: unknown[], indexes?: unknown[]) =>
      req<Row>('POST', '/admin/schema', { action: 'createTable', table: name, columns, ...(indexes ? { indexes } : {}) });
    const make = (coll: string, body: Row = {}, who = ann) => req<Row>('POST', `/classes/${coll}`, body, who);
    const count = async (coll: string): Promise<number> => (await req<{ count: number }>('GET', `/classes/${coll}?count=1&limit=0`)).json.count;

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont015-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'ont015', backendName: 'ONT-015', authToken: 't0k' });
      base = (await service.start()).listen.url;
      const r = await req<Signup>('POST', '/users', { username: 'ann', password: 'pw-ann' }, {});
      expect(r.status).toBe(201);
      ann = { 'x-parse-session-token': r.json.sessionToken };
    });

    afterAll(async () => {
      series.setSeriesClock(null);
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      series.setSeriesClock(null);
    });

    it('a person’s create is numbered by the store, and the answer says the number', async () => {
      expect((await table('Invoice', [{ name: 'number', type: 'String', series: { format: 'INV-{YYYY}-{####}' } }, { name: 'amount', type: 'Number' }])).status).toBe(200);
      series.setSeriesClock(at('2026-03-05T10:00:00Z'));
      const first = await make('Invoice', { amount: 10 });
      expect(first.status).toBe(201);
      expect(first.json.number).toBe('INV-2026-0001');
      const second = await make('Invoice', { amount: 20 });
      expect(second.json.number).toBe('INV-2026-0002');
      expect((await req<Row>('GET', `/classes/Invoice/${String(second.json.objectId)}`, undefined, ann)).json).toMatchObject({ number: 'INV-2026-0002', amount: 20 });
    });

    it('🔴 a person’s create that brings its own number is a 400 naming the field, at every door, and nothing is made', async () => {
      const before = await count('Invoice');
      const words = /"number" on Invoice is a number the backend hands out/;
      const plain = await make('Invoice', { number: 'INV-2026-9999', amount: 1 });
      expect(plain.status).toBe(400);
      expect(plain.json).toMatchObject({ reason: 'series', collection: 'Invoice', field: 'number' });
      expect(String(plain.json.error)).toMatch(words);
      const upsert = await req<Row>('POST', '/classes/Invoice', { number: 'INV-2026-9999', amount: 1 }, { ...ann, 'x-nodegx-upsert': 'amount' });
      expect(upsert.status).toBe(400);
      const byob = await req<Row>('POST', '/api/Invoice', { number: 'INV-2026-9999' }, ann);
      expect(byob.status).toBe(400);
      expect(String(byob.json.error)).toMatch(words);
      const batch = await req<{ results: Row[] }>('POST', '/api/_batch', { operations: [{ method: 'create', collection: 'Invoice', data: { number: 'INV-2026-9999' } }] }, ann);
      expect(String(batch.json.results[0].error)).toMatch(words);
      expect(await count('Invoice')).toBe(before);
    });

    it('the admin may bring one (a backfill), and it is kept', async () => {
      const r = await make('Invoice', { number: 'INV-2019-0042', amount: 3 }, admin);
      expect(r.status).toBe(201);
      expect((await req<Row>('GET', `/classes/Invoice/${String(r.json.objectId)}`)).json.number).toBe('INV-2019-0042');
    });

    it('🔴 a number the admin brings in the series’ own look moves the counter past it: three people make one each after T-0003, and every save holds (P116-S22-SERIESCARRY)', async () => {
      expect((await table('Chit', [{ name: 'ref', type: 'String', series: { format: 'T-{####}' } }])).status).toBe(200);
      expect((await make('Chit', { ref: 'T-0003' }, admin)).status).toBe(201);
      const made = [await make('Chit'), await make('Chit'), await make('Chit')];
      expect(made.map((r) => [r.status, r.json.ref])).toEqual([[201, 'T-0004'], [201, 'T-0005'], [201, 'T-0006']]);
    });

    it('🔴 mutant — the counter not moved by a number brought: the third person is handed T-0003 and refused, and the 409 names it (P116-S22-SERIESMSG)', async () => {
      jest.spyOn(series, 'seriesRaises').mockReturnValue([]);
      expect((await table('Chit2', [{ name: 'ref', type: 'String', series: { format: 'T-{####}' } }], [{ fields: ['ref'], unique: true }])).status).toBe(200);
      expect((await make('Chit2', { ref: 'T-0003' }, admin)).status).toBe(201);
      const made = [await make('Chit2'), await make('Chit2'), await make('Chit2')];
      expect(made.map((r) => r.status)).toEqual([201, 201, 409]);
      expect(made[2].json).toMatchObject({ field: 'ref', value: 'T-0003' });
      expect(String(made[2].json.error)).toContain('"ref" is unique in "Chit2" and "T-0003" is already used');
    });

    it('ten creates in flight at once get ten different numbers, in a row', async () => {
      expect((await table('Ticket', [{ name: 'ref', type: 'String', series: { format: 'T-{####}' } }])).status).toBe(200);
      const made = await Promise.all(Array.from({ length: 10 }, () => make('Ticket')));
      expect(made.map((r) => r.status)).toEqual(Array(10).fill(201));
      expect(made.map((r) => r.json.ref).sort()).toEqual(Array.from({ length: 10 }, (_, i) => `T-${String(i + 1).padStart(4, '0')}`));
    });

    it('🔴 it starts again at 0001 each January — on the backend’s clock, in UTC — and not before', async () => {
      expect((await table('Bill', [{ name: 'number', type: 'String', series: { format: 'B-{YYYY}-{####}', restart: 'year' } }])).status).toBe(200);
      series.setSeriesClock(at('2026-12-31T23:59:00Z'));
      expect((await make('Bill')).json.number).toBe('B-2026-0001');
      expect((await make('Bill')).json.number).toBe('B-2026-0002');
      series.setSeriesClock(at('2027-01-01T00:00:01Z'));
      expect((await make('Bill')).json.number).toBe('B-2027-0001');
      series.setSeriesClock(at('2026-12-31T23:59:30Z'));
      expect((await make('Bill')).json.number).toBe('B-2026-0003');
    });

    it('a monthly series starts again each month', async () => {
      expect((await table('Slip', [{ name: 'number', type: 'String', series: { format: 'S{YY}{MM}-{###}', restart: 'month' } }])).status).toBe(200);
      series.setSeriesClock(at('2026-10-31T12:00:00Z'));
      expect((await make('Slip')).json.number).toBe('S2610-001');
      series.setSeriesClock(at('2026-11-01T12:00:00Z'));
      expect((await make('Slip')).json.number).toBe('S2611-001');
    });

    it('🔴 mutant — the restart ignored: January carries on from December, and the case above catches it', async () => {
      jest.spyOn(series, 'seriesPeriod').mockReturnValue('');
      expect((await table('Bill2', [{ name: 'number', type: 'String', series: { format: 'B-{YYYY}-{####}', restart: 'year' } }])).status).toBe(200);
      series.setSeriesClock(at('2026-12-31T23:59:00Z'));
      await make('Bill2');
      series.setSeriesClock(at('2027-01-01T00:00:01Z'));
      expect((await make('Bill2')).json.number).toBe('B-2027-0002');
    });

    it('🔴 gap-free: a create the store refuses gives its number back', async () => {
      expect((await table('Receipt', [{ name: 'number', type: 'String', series: { format: 'R-{####}', gapFree: true } }, { name: 'ref', type: 'String' }], [{ fields: ['ref'], unique: true }])).status).toBe(200);
      expect((await make('Receipt', { ref: 'a' })).json.number).toBe('R-0001');
      expect((await make('Receipt', { ref: 'a' })).status).toBe(409);
      expect((await make('Receipt', { ref: 'b' })).json.number).toBe('R-0002');
    });

    it('🔴 mutant — a gap-free number taken outside the insert: the refused create leaves a gap', async () => {
      const real = series.seriesColumns;
      jest.spyOn(series, 'seriesColumns').mockImplementation((schema) => real(schema).map((c) => ({ ...c, series: { ...c.series, gapFree: false } })));
      expect((await table('Receipt2', [{ name: 'number', type: 'String', series: { format: 'R-{####}', gapFree: true } }, { name: 'ref', type: 'String' }], [{ fields: ['ref'], unique: true }])).status).toBe(200);
      expect((await make('Receipt2', { ref: 'a' })).json.number).toBe('R-0001');
      expect((await make('Receipt2', { ref: 'a' })).status).toBe(409);
      expect((await make('Receipt2', { ref: 'b' })).json.number).toBe('R-0003');
    });

    it('🔴 mutant — the doors’ refusal taken out: a person’s invented number is stored', async () => {
      jest.spyOn(door, 'assertSeriesWrite').mockImplementation(() => undefined);
      const r = await make('Invoice', { number: 'INV-2026-6666', amount: 1 });
      expect(r.status).toBe(201);
      expect((await req<Row>('GET', `/classes/Invoice/${String(r.json.objectId)}`)).json.number).toBe('INV-2026-6666');
    });

    it('AC4 — _Series is the admin’s alone: a person reads nothing of it', async () => {
      const r = await req<Row>('GET', '/classes/_Series', undefined, ann);
      expect([403, 404]).toContain(r.status);
      expect(JSON.stringify(r.json)).not.toMatch(/Invoice\.number/);
    });

    it('a series that cannot be kept is refused, in words, when the table is declared', async () => {
      const bad = await table('Bad', [{ name: 'number', type: 'String', series: { format: 'INV-{YYYY}' } }]);
      expect(bad.status).toBe(400);
      expect(JSON.stringify(bad.json)).toMatch(/exactly one run of # for the counter/);
      const num = await table('Bad2', [{ name: 'number', type: 'Number', series: { format: '{####}' } }]);
      expect(num.status).toBe(400);
    });
  });
}
