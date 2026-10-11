/**
 * P116-ONT-007-required — `POST /admin/schema { action: 'setRequired', table, columns }`, on SQLite and PostgreSQL.
 *
 * The route the bug said was missing: a field the records already have, made required (or optional again),
 * refused while any record holds none. The two engines refuse at different moments — SQLite at the call,
 * PostgreSQL inside its queued transaction, reported at the barrier the route awaits — and the person must
 * get the same 409 in the same words from both, never a 500 or a refusal that reaches whoever writes next.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(180000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
let pgReachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  pgReachable = true;
} catch {
  pgReachable = false;
}
if (!pgReachable && process.env.NODEGX_REQUIRE_PG === '1') throw new Error(`NODEGX_REQUIRE_PG=1 and no PostgreSQL answered at ${ADMIN_URL}.`);

const STAMP = `${process.pid}_${Date.now().toString(36)}`;
let seq = 0;

type Req = <T = unknown>(method: string, p: string, body?: unknown) => Promise<{ status: number; json: T; text: string }>;

/** A backend on a fresh database. */
async function startBackend(engine: 'sqlite' | 'postgres'): Promise<{ req: Req; stop: () => Promise<void> }> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-required-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const db = engine === 'postgres' ? `nodegx_required_${STAMP}_${++seq}` : null;
  if (db) psql(ADMIN_URL, `CREATE DATABASE ${db}`);
  if (db) process.env.NODEGX_STORAGE_URL = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
  const service = new BackendService({ dataDir, port: 0, backendId: 'req', backendName: 'Required', authToken: 't0k' });
  let base = '';
  try {
    base = (await service.start()).listen.url;
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
  }
  return {
    req: (method, p, body) => request(base, method, p, { body, headers: { authorization: 'Bearer t0k' } }) as never,
    async stop() {
      await new Promise((r) => setTimeout(r, 250)); // the audit row, stamped without an await
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
      if (db)
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
        } catch {
          /* a leaked test database is not worth failing the run over */
        }
    }
  };
}

const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

for (const engine of ['sqlite', 'postgres'] as const) {
  const suite = engine === 'postgres' && !pgReachable ? describe.skip : describe;
  suite(`P116-ONT-007-required — the setRequired route, on ${engine}`, () => {
    let b: { req: Req; stop: () => Promise<void> };
    const make = async (collection: string, data: Record<string, unknown>) => {
      const r = await b.req<{ objectId: string }>('POST', `/classes/${collection}`, data);
      return { status: r.status, id: r.json.objectId };
    };
    const setRequired = (columns: unknown, table = 'Person') =>
      b.req<{ error?: string; reason?: string; count?: number; field?: string; changed?: boolean }>('POST', '/admin/schema', { action: 'setRequired', table, columns });
    const declared = async (field: string) =>
      (await b.req<{ columns: Array<{ name: string; required?: boolean }> }>('GET', '/admin/schema/Person')).json.columns.find((c) => c.name === field)?.required;

    beforeAll(async () => {
      b = await startBackend(engine);
      expect((await b.req('POST', '/admin/schema', { action: 'createTable', table: 'Account', columns: [{ name: 'name', type: 'String' }] })).status).toBe(200);
      expect(
        (
          await b.req('POST', '/admin/schema', {
            action: 'createTable',
            table: 'Person',
            columns: [
              { name: 'name', type: 'String' },
              { name: 'account', type: 'Pointer', targetClass: 'Account' }
            ]
          })
        ).status
      ).toBe(200);
    });
    afterAll(async () => {
      if (b) await b.stop();
    });

    it('refuses 409 in words, with how many, while a record has none — the declaration unchanged, the next write unaffected', async () => {
      const acc = (await make('Account', { name: 'Northwind' })).id;
      await make('Person', { name: 'Ada', account: ptr('Account', acc) });
      await make('Person', { name: 'Grace' });
      await make('Person', { name: 'Linus' });

      const r = await setRequired({ account: true });
      expect(r.status).toBe(409);
      expect(r.json).toMatchObject({
        error: 'Cannot make "account" required on "Person": 2 records have none. Give each of them one first, or keep it optional.',
        reason: 'field-empty',
        field: 'account',
        count: 2
      });
      expect(await declared('account')).toBeUndefined();
      // The refusal was the route's to answer: it does not wait in the queue for the next write.
      expect((await make('Person', { name: 'Margaret' })).status).toBe(201);
    });

    it('makes it required once every record has one: a record without one refused, one with one made', async () => {
      const acc = (await make('Account', { name: 'Contoso' })).id;
      const empty = await b.req<{ results: Array<{ objectId: string }> }>('POST', '/classes/Person', { _method: 'GET', where: { account: { $exists: false } }, limit: 100 });
      for (const p of empty.json.results) expect((await b.req('PUT', `/classes/Person/${p.objectId}`, { account: ptr('Account', acc) })).status).toBe(200);

      const r = await setRequired({ account: true });
      expect(r.status).toBe(200);
      expect(r.json).toMatchObject({ success: true, action: 'setRequired', table: 'Person', changed: true });
      expect(await declared('account')).toBe(true);
      expect((await make('Person', { name: 'Edsger' })).status).toBeGreaterThanOrEqual(400);
      expect((await make('Person', { name: 'Edsger', account: ptr('Account', acc) })).status).toBe(201);
      expect((await setRequired({ account: true })).json.changed).toBe(false);
    });

    it('makes it optional again', async () => {
      expect((await setRequired({ account: false })).status).toBe(200);
      expect(await declared('account')).toBeUndefined();
      expect((await make('Person', { name: 'Barbara' })).status).toBe(201);
    });

    it('refuses a body it cannot read, a collection it does not have, and fields it may not change', async () => {
      expect((await setRequired({ account: 'yes' })).status).toBe(400);
      expect((await setRequired({})).status).toBe(400);
      expect((await setRequired(['account'])).status).toBe(400);
      expect((await setRequired({ account: true }, 'Nobody')).status).toBe(404);
      const unknown = await setRequired({ nope: true });
      expect(unknown.status).toBe(400);
      expect(unknown.json.error).toBe('"Person" has no field "nope"');
      expect((await setRequired({ objectId: false })).status).toBe(400);
      expect((await setRequired({ email: false }, '_User')).json.error).toBe('"email" is one of the backend\'s own account fields.');
    });
  });
}
