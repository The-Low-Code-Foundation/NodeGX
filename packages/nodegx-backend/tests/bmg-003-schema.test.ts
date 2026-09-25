/**
 * BMG-003 over a real BackendService, on SQLite and on PostgreSQL — the storage
 * half of the Schema page, graded through the routes the page calls.
 *
 *  - AC1: every tile in §3.1 creates a column of the mapped storage type, read
 *    back from `GET /admin/schema/:table`.
 *  - AC2: a *Choice* is a String plus a `oneOf` rule the backend enforces: a
 *    record outside the list is 400 with the rule's sentence.
 *  - AC3: *Must be unique* is a unique index; a duplicate is refused.
 *  - AC4: `dropColumn` removes the column on both engines, refuses `_User.email`
 *    and the backend's own account columns, and refuses a column an index or a
 *    rule reads — naming it.
 *  - §5: a type change on a column a rule reads is refused with the rule.
 *  - A required field left empty is 400 in words, not an engine sentence.
 *
 * PostgreSQL is skipped only when none is reachable, like its BRG-005 siblings.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { AuditQueryResult } from '../src/ops/audit';
import { BackendService } from '../src/service';
import { adminHeaders, get, post } from './helpers/http';

jest.setTimeout(120000);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

/** §3.1 — tile → storage, the eleven of them, as the page sends them. */
const ELEVEN = [
  { name: 'title', type: 'String' },
  { name: 'price', type: 'Number' },
  { name: 'active', type: 'Boolean' },
  { name: 'when', type: 'Date' },
  { name: 'status', type: 'String' }, // Choice: + { field: 'status', oneOf: [...] }
  { name: 'owner', type: 'Pointer', targetClass: 'Person' },
  { name: 'tags', type: 'Relation', targetClass: 'Tag' },
  { name: 'photo', type: 'File' },
  { name: 'where', type: 'GeoPoint' },
  { name: 'list', type: 'Array' },
  { name: 'extra', type: 'Object' }
];

function engineSuite(engine: 'sqlite' | 'postgres', storageUrl: () => string | null) {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  const admin = (body: unknown) => post<Body>(base, '/admin/schema', body, adminHeaders(dataDir));
  const create = (collection: string, row: unknown) => post<Body>(base, `/classes/${collection}`, row, adminHeaders(dataDir));
  const table = async (name: string) => (await get<Body>(base, `/admin/schema/${name}`, adminHeaders(dataDir))).json;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `bmg003-${engine}-`));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    const url = storageUrl();
    if (url) process.env.NODEGX_STORAGE_URL = url;
    else delete process.env.NODEGX_STORAGE_URL;
    service = new BackendService({ dataDir, port: 0, backendId: `bmg003_${engine}`, backendName: 'BMG-003' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    try {
      await service.stop();
    } catch {
      /* already stopped */
    }
    if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = previousEnv;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC1: every tile creates a column of its storage type, read back from the table route', async () => {
    expect((await admin({ action: 'createTable', table: 'Person', columns: [{ name: 'name', type: 'String' }] })).status).toBe(200);
    expect((await admin({ action: 'createTable', table: 'Tag', columns: [{ name: 'label', type: 'String' }] })).status).toBe(200);
    expect((await admin({ action: 'createTable', table: 'Thing', columns: [] })).status).toBe(200);
    // A record written and read BEFORE the columns are added: `declaredProperties`
    // memoises its map against the schema object, and a manager that mutated that
    // object in place left every later column without a declared type (the drive
    // found it: "needs email to be a String, and it is a property with no declared type").
    expect((await create('Thing', {})).status).toBe(201);
    expect((await get<Body>(base, '/classes/Thing', adminHeaders(dataDir))).status).toBe(200);
    for (const column of ELEVEN) {
      const res = await admin({ action: 'addColumn', table: 'Thing', column });
      expect([column.name, res.status]).toEqual([column.name, 200]);
    }
    const choice = await admin({ action: 'setChecks', table: 'Thing', checks: [{ field: 'status', oneOf: ['open', 'closed'] }] });
    expect(choice.status).toBe(200);
    expect(choice.json.checksCreated).toEqual(['chk_Thing_oneof_status']);

    const t = await table('Thing');
    const byName = new Map((t.columns as Array<{ name: string; type: string; targetClass?: string }>).map((c) => [c.name, c]));
    for (const column of ELEVEN) {
      expect(byName.get(column.name)?.type).toBe(column.type);
      if (column.targetClass) expect(byName.get(column.name)?.targetClass).toBe(column.targetClass);
    }
    expect(t.checks).toEqual([
      { name: 'chk_Thing_oneof_status', rule: { field: 'status', oneOf: ['open', 'closed'] }, description: 'status is one of open, closed', built: true, declared: true }
    ]);
  });

  it('AC2: a Choice refuses a record outside its list, 400 with the rule in words, and admits one inside it', async () => {
    const other = await create('Thing', { title: 'x', status: 'other' });
    expect(other.status).toBe(400);
    expect(other.json).toMatchObject({ code: 142, reason: 'check-failed', check: 'chk_Thing_oneof_status' });
    expect(other.json.error).toMatch(/breaks a rule of "Thing": status is one of open, closed/);
    const open = await create('Thing', { title: 'y', status: 'open' });
    expect(open.status).toBe(201);
    const none = await create('Thing', { title: 'z' });
    expect(none.status).toBe(201);
  });

  it('AC3: Must be unique is a unique index the table route lists; a duplicate is refused', async () => {
    const res = await admin({ action: 'setIndexes', table: 'Thing', indexes: [{ fields: ['title'], unique: true }] });
    expect(res.status).toBe(200);
    expect(res.json.indexesCreated).toEqual(['idx_Thing_title']);
    const t = await table('Thing');
    expect((t.indexes as Array<{ name: string; unique?: boolean; fields: string[] }>).find((i) => i.name === 'idx_Thing_title')).toMatchObject({ unique: true, fields: ['title'] });
    const dup = await create('Thing', { title: 'y', status: 'closed' });
    expect(dup.status).toBe(409);
    expect(dup.json.code).toBe(137);
  });

  it('AC4: dropColumn removes a column, and a read no longer carries it', async () => {
    const res = await admin({ action: 'dropColumn', table: 'Thing', column: 'list' });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ success: true, action: 'dropColumn', table: 'Thing', column: 'list', dropped: true });
    const t = await table('Thing');
    expect((t.columns as Array<{ name: string }>).map((c) => c.name)).not.toContain('list');
    const rows = (await get<Body>(base, '/classes/Thing?limit=1', adminHeaders(dataDir))).json.results as Body[];
    expect(rows.length).toBeGreaterThan(0);
    expect('list' in rows[0]).toBe(false);
    // A Relation drops with its junction table, and answers the same shape.
    const rel = await admin({ action: 'dropColumn', table: 'Thing', column: 'tags' });
    expect(rel.status).toBe(200);
    expect(rel.json.dropped).toBe(true);
    // A column that is not there is not an error: nothing to drop.
    const gone = await admin({ action: 'dropColumn', table: 'Thing', column: 'list' });
    expect(gone.status).toBe(200);
    expect(gone.json.dropped).toBe(false);
  });

  it('AC4: refuses a column an index reads, naming the index, and a column a rule reads, naming the rule', async () => {
    const indexed = await admin({ action: 'dropColumn', table: 'Thing', column: 'title' });
    expect(indexed.status).toBe(409);
    expect(indexed.json.error).toMatch(/Cannot drop "title": the index idx_Thing_title \(title, unique\) reads it\. Drop that index first\./);
    const ruled = await admin({ action: 'dropColumn', table: 'Thing', column: 'status' });
    expect(ruled.status).toBe(409);
    expect(ruled.json.error).toMatch(/Cannot drop "status": the rule "status is one of open, closed" reads it\. Remove that rule first\./);
    const t = await table('Thing');
    expect((t.columns as Array<{ name: string }>).map((c) => c.name)).toEqual(expect.arrayContaining(['title', 'status']));
    // With the rule gone, the drop goes through — which is what the page does behind one ✕.
    expect((await admin({ action: 'setChecks', table: 'Thing', checks: [] })).status).toBe(200);
    expect((await admin({ action: 'dropColumn', table: 'Thing', column: 'status' })).json.dropped).toBe(true);
  });

  it('AC4: refuses the sign-in columns and the backend’s own account columns on _User, and the four system fields anywhere', async () => {
    for (const column of ['email', 'username']) {
      const res = await admin({ action: 'dropColumn', table: '_User', column });
      expect(res.status).toBe(400);
      expect(res.json.error).toMatch(/how a person signs in/);
    }
    const own = await admin({ action: 'dropColumn', table: '_User', column: 'password' });
    expect(own.status).toBe(400);
    expect(own.json.error).toMatch(/backend's own account fields/);
    const sys = await admin({ action: 'dropColumn', table: 'Thing', column: 'createdAt' });
    expect(sys.status).toBe(400);
    expect(sys.json.error).toMatch(/set by the backend on every record/);
  });

  it('§5: a type change on a column a rule reads is refused with the rule, and goes through once it is gone', async () => {
    expect((await admin({ action: 'setChecks', table: 'Thing', checks: [{ field: 'price', min: 0 }] })).status).toBe(200);
    const refused = await admin({ action: 'changeColumnType', table: 'Thing', column: 'price', type: 'String' });
    expect(refused.status).toBe(409);
    expect(refused.json.error).toMatch(/Cannot change the type of "price": the rule "price is at least 0" reads it\. Remove that rule first\./);
    expect((await table('Thing')).columns.find((c: { name: string }) => c.name === 'price').type).toBe('Number');
    expect((await admin({ action: 'setChecks', table: 'Thing', checks: [] })).status).toBe(200);
    const changed = await admin({ action: 'changeColumnType', table: 'Thing', column: 'price', type: 'String' });
    expect(changed.status).toBe(200);
  });

  it('a required field left empty is 400 in words, and a required field added over records needs a default', async () => {
    expect((await admin({ action: 'createTable', table: 'Strict', columns: [{ name: 'name', type: 'String', required: true }] })).status).toBe(200);
    const missing = await create('Strict', { other: 1 });
    expect(missing.status).toBe(400);
    expect(missing.json).toMatchObject({ code: 142, reason: 'required', collection: 'Strict', field: 'name' });
    expect(missing.json.error).toMatch(/"name" is required on "Strict": every record must say it/);
    expect((await create('Strict', { name: 'ok' })).status).toBe(201);
    // Over rows: without a default the engine refuses; with one, the rows already there get it.
    const bare = await admin({ action: 'addColumn', table: 'Strict', column: { name: 'kind', type: 'String', required: true } });
    expect(bare.status).toBeGreaterThanOrEqual(400);
    expect(bare.status).toBeLessThan(500);
    const withDefault = await admin({ action: 'addColumn', table: 'Strict', column: { name: 'kind', type: 'String', required: true, defaultValue: 'plain' } });
    expect(withDefault.status).toBe(200);
    const rows = (await get<Body>(base, '/classes/Strict', adminHeaders(dataDir))).json.results as Body[];
    expect(rows.map((r) => r.kind)).toEqual(['plain']);
  });

  it('the drop is in the audit trail as schema.mutate with the column named', async () => {
    const audit = await get<AuditQueryResult>(base, '/admin/audit?action=schema.mutate&limit=50', adminHeaders(dataDir));
    expect(audit.status).toBe(200);
    const entry = audit.json.entries.find((e) => (e.detail as { droppedColumn?: string })?.droppedColumn === 'Thing.list');
    expect(entry).toBeDefined();
  });

  it('an unknown action lists dropColumn among the ones it knows', async () => {
    const res = await admin({ action: 'nope', table: 'Thing' });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/dropColumn/);
  });
}

describe('BMG-003 schema — SQLite', () => {
  engineSuite('sqlite', () => null);
});

(pgReachable ? describe : describe.skip)('BMG-003 schema — PostgreSQL', () => {
  const db = `nodegx_bmg003_${process.pid}_${Date.now().toString(36)}`;
  beforeAll(() => psql(ADMIN_URL, `CREATE DATABASE "${db}"`));
  afterAll(() => {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
    } catch {
      /* the name is unique per run */
    }
  });
  engineSuite('postgres', () => {
    if (ADMIN_URL.startsWith('postgres:///')) return `postgres:///${db}`;
    const u = new URL(ADMIN_URL);
    u.pathname = `/${db}`;
    return u.toString();
  });
});
