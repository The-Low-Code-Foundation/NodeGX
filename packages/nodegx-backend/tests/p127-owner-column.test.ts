/**
 * P127-BKO006-OWNERCOLUMN — a table only its makers may list answers an empty list before anyone has made a row.
 *
 * BKO-006's repair shop: the agent declared Job up front (`provision_backend` → createTable) and ruled "a customer
 * sees only their own jobs" (find: creator). The rule narrows on `owner`, a column that arrives with the first row an
 * owner makes, so every list of the table answered `no such column: "owner"` (HTTP 500) until someone had booked a
 * repair: a freshly shipped app failed on each new customer's first page. Now the narrowing is read against the
 * columns the table has, as a rule's path through a table that does not exist yet is (P123-S6-PATHNOTABLE): nobody's.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

jest.setTimeout(120000);

// Both engines, as P123-S6-PATHNOTABLE: the narrowing is SQL both must read.
const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ownercol_${process.pid}_${Date.now().toString(36)}`;
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

const ADMIN = 'admin-token-p127-owner';
const RULES = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  collections: {
    Job: { creatorOwns: true, permissions: { find: 'creator', get: 'creator', create: 'authenticated', update: 'nobody', delete: 'nobody' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`on ${engine.name}`, () => {
    let service: BackendService;
    let base = '';
    let dataDir = '';
    let previousEnv: string | undefined;

    async function call(method: string, p: string, body?: unknown, auth?: { session?: string; admin?: boolean }) {
      const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'p127' };
      if (auth?.session) headers['x-parse-session-token'] = auth.session;
      if (auth?.admin) headers.authorization = `Bearer ${ADMIN}`;
      const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      let json: any = text;
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON */
      }
      return { status: res.status, json };
    }

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p127-ownercol-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(RULES, null, 2));
      service = new BackendService({ dataDir, port: 0, backendId: 'backend_p127owner', backendName: 'P127', authToken: ADMIN });
      base = (await service.start()).listen.url;
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it('a table made up front, listed by a customer before any job: an empty list, then their own job and only theirs', async () => {
      const made = await call('POST', '/admin/schema', { action: 'createTable', table: 'Job', columns: [{ name: 'what', type: 'String' }] }, { admin: true });
      expect(made.status).toBe(200);
      const cust = (await call('POST', '/users', { username: 'cust', password: 'pw-cust-1234' })).json.sessionToken;
      const other = (await call('POST', '/users', { username: 'other', password: 'pw-other-1234' })).json.sessionToken;

      const before = await call('GET', '/classes/Job', undefined, { session: cust });
      expect(before).toEqual({ status: 200, json: { results: [] } });
      expect((await call('GET', '/classes/Job?count=1&limit=0', undefined, { session: cust })).json.count).toBe(0);

      const job = await call('POST', '/classes/Job', { what: 'kettle' }, { session: cust });
      expect(job.status).toBe(201);
      expect((await call('GET', '/classes/Job', undefined, { session: cust })).json.results.map((r: any) => r.what)).toEqual(['kettle']);
      expect((await call('GET', '/classes/Job', undefined, { session: other })).json.results).toEqual([]);
    });
  });
}
