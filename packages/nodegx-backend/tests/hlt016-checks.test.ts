/**
 * Declared checks, over HTTP, on SQLite and on PostgreSQL — P99 HLT-016's index half (`checks`).
 *
 * What a person does: push a collection with a rule every row must satisfy ("an assignment
 * belongs to a learner or to a cohort, never both, never neither"), write rows that keep it and
 * rows that break it, edit one into breaking it, restart, and take the rule away again. The
 * adapter-level half is `noodl-runtime/test/adapters/SchemaManager.checks.test.js`; the
 * conformance case is `schema/a-check-refuses-a-row-that-breaks-it`.
 *
 * The two engines enforce it differently (SQLite: a pair of triggers; PostgreSQL: a CHECK
 * constraint) and answer it identically, which is what this file grades. PostgreSQL is skipped
 * only when none is reachable, like its BRG-005 siblings.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { StorageCheckDecl } from '@noodl/backend-contract';

import { diffSchema, type SchemaSnapshot } from '../src/backup/schema-migrate';
import { BackendService } from '../src/service';
import { adminHeaders, get, post, put } from './helpers/http';

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

const COLUMNS = [
  { name: 'learnerId', type: 'String' },
  { name: 'cohortId', type: 'String' },
  { name: 'target', type: 'Number' }
];
const ONE_SCOPE = { exactlyOne: ['learnerId', 'cohortId'] };
const TARGET = { field: 'target', min: 1, max: 10 };

interface CheckRow {
  name: string;
  built: boolean;
  declared: boolean;
  description: string;
}

/** A response body: read field by field, and every field is asserted on, never trusted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

function engineSuite(engine: 'sqlite' | 'postgres', storageUrl: () => string | null) {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  const start = async () => {
    service = new BackendService({ dataDir, port: 0, backendId: `hlt016c_${engine}`, backendName: 'HLT-016' });
    base = (await service.start()).listen.url;
  };
  const admin = (body: unknown) => post<Body>(base, '/admin/schema', body, adminHeaders(dataDir));
  const create = (collection: string, row: unknown) =>
    post<Body>(base, `/classes/${collection}`, row, adminHeaders(dataDir));
  const update = (collection: string, id: string, row: unknown) =>
    put<Body>(base, `/classes/${collection}/${id}`, row, adminHeaders(dataDir));
  const read = async (collection: string, id: string) =>
    (await get<Body>(base, `/classes/${collection}/${id}`, adminHeaders(dataDir))).json;
  const count = async (collection: string) =>
    (await get<{ count: number }>(base, `/classes/${collection}?count=1&limit=0`, adminHeaders(dataDir))).json.count;
  const checks = async (collection: string) =>
    (await get<{ checks: CheckRow[] }>(base, `/admin/schema/${collection}`, adminHeaders(dataDir))).json.checks;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt016c-${engine}-`));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    const url = storageUrl();
    if (url) process.env.NODEGX_STORAGE_URL = url;
    else delete process.env.NODEGX_STORAGE_URL;
    await start();
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

  let kept: string;

  it('C2: a write that keeps the rule lands; one that breaks it is 400, code 142, and names the rule', async () => {
    const push = await admin({
      action: 'createTable',
      table: 'Assignment',
      columns: COLUMNS,
      checks: [ONE_SCOPE, TARGET]
    });
    expect(push.status).toBe(200);
    expect(push.json.checksCreated).toEqual(['chk_Assignment_one_learnerId_cohortId', 'chk_Assignment_range_target']);

    const a = await create('Assignment', { learnerId: 'L', target: 5 });
    expect(a.status).toBe(201);
    kept = a.json.objectId;
    expect((await create('Assignment', { cohortId: 'C' })).status).toBe(201);

    const both = await create('Assignment', { learnerId: 'L', cohortId: 'C' });
    expect(both.status).toBe(400);
    expect(both.json).toMatchObject({
      code: 142,
      reason: 'check-failed',
      check: 'chk_Assignment_one_learnerId_cohortId'
    });
    expect(both.json.error).toMatch(/breaks a rule of "Assignment": exactly one of learnerId, cohortId is set/);

    const neither = await create('Assignment', { target: 3 });
    expect(neither.status).toBe(400);
    const tooHigh = await create('Assignment', { learnerId: 'L', target: 11 });
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.json.error).toMatch(/target is between 1 and 10/);
    expect(await count('Assignment')).toBe(2);
  });

  it('C2: an edit that breaks the rule is 400 — never a 404 — and changes nothing', async () => {
    const broke = await update('Assignment', kept, { cohortId: 'C' });
    expect(broke.status).toBe(400);
    expect(broke.json.code).toBe(142);
    const row = await read('Assignment', kept);
    expect(row.cohortId ?? null).toBeNull();
    expect(row.learnerId).toBe('L');
    expect((await update('Assignment', kept, { target: 7 })).status).toBe(200);
  });

  it('C3: a rule the rows already break is refused to the person who pushed, and nothing changes', async () => {
    await admin({ action: 'createTable', table: 'Loose', columns: COLUMNS });
    for (const row of [{ learnerId: 'L' }, {}, { learnerId: 'L', cohortId: 'C' }]) await create('Loose', row);
    const refused = await admin({ action: 'setChecks', table: 'Loose', checks: [ONE_SCOPE] });
    expect(refused.status).toBe(409);
    expect(refused.json.code).toBe(142);
    expect(refused.json.error).toMatch(/exactly one of learnerId, cohortId is set/);
    expect(await checks('Loose')).toEqual([]);
    // Still unenforced: the person's next write is theirs, not someone else's failure.
    expect((await create('Loose', {})).status).toBe(201);
    expect(await count('Loose')).toBe(4);
  });

  it('C4: after a restart it reads back enforced, a re-push keeps it, and removing it removes enforcement', async () => {
    await service.stop();
    await start();
    const rows = await checks('Assignment');
    expect(rows.map((r) => [r.name, r.built, r.declared])).toEqual([
      ['chk_Assignment_one_learnerId_cohortId', true, true],
      ['chk_Assignment_range_target', true, true]
    ]);
    const again = await admin({ action: 'setChecks', table: 'Assignment', checks: [ONE_SCOPE, TARGET] });
    expect(again.json).toMatchObject({ checksCreated: [], checksDropped: [], checksKept: rows.map((r) => r.name) });
    expect((await create('Assignment', {})).status).toBe(400);

    const removed = await admin({ action: 'setChecks', table: 'Assignment', checks: [] });
    expect(removed.json.checksDropped).toHaveLength(2);
    expect((await create('Assignment', {})).status).toBe(201);
  });
}

describe('HLT-016 C5 — a schema diff sees the checks', () => {
  const snapshot = (checks: StorageCheckDecl[]): SchemaSnapshot => ({ tables: [{ name: 'A', columns: [], checks }] });

  it('a changed bound, an added rule and a removed one are changes; a reordering is not', () => {
    expect(diffSchema(snapshot([TARGET]), snapshot([{ field: 'target', min: 1, max: 5 }])).tables.changed).toHaveLength(
      1
    );
    expect(diffSchema(snapshot([TARGET, ONE_SCOPE]), snapshot([TARGET])).tables.changed).toHaveLength(1);
    expect(diffSchema(snapshot([]), snapshot([TARGET])).tables.changed).toHaveLength(1);
    expect(diffSchema(snapshot([TARGET, ONE_SCOPE]), snapshot([ONE_SCOPE, TARGET])).tables.changed).toEqual([]);
  });
});

describe('HLT-016 `checks` — SQLite', () => {
  engineSuite('sqlite', () => null);
});

(pgReachable ? describe : describe.skip)('HLT-016 `checks` — PostgreSQL', () => {
  const db = `nodegx_hlt016c_${process.pid}_${Date.now().toString(36)}`;
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
