/**
 * BMG-017 row 1 — R6's guard on the import path.
 *
 * BMG-016 made a new record that leaves out a required field (added over
 * records with a one-time fill) a refusal — on `create`. SQLite keeps the fill
 * as the column's DDL default, and the import did not go through `create`:
 * `importCollection` → `facade.upsertBatch` → the facade's own loop →
 * `QueryBuilder.buildInsert`. So an imported row that left the field out was
 * handed the fill. Now the import refuses that row by name and imports the
 * rest (both engines), and every SQLite insert names the omitted column as
 * NULL through `buildInsert` itself — the census below is what keeps a new
 * caller from skipping it.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

function engineSuite(engine: 'sqlite' | 'postgres', storageUrl: () => string | null) {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  const admin = (body: unknown) => post<Body>(base, '/admin/schema', body, adminHeaders(dataDir));
  const create = (collection: string, row: unknown) => post<Body>(base, `/classes/${collection}`, row, adminHeaders(dataDir));
  const importRows = (collection: string, format: 'csv' | 'json', content: string) =>
    post<Body>(base, `/admin/import/${collection}`, { format, content }, adminHeaders(dataDir));
  const rows = async (collection: string) =>
    (await get<Body>(base, `/classes/${collection}?order=name&limit=100`, adminHeaders(dataDir))).json.results as Body[];

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `bmg017-${engine}-`));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    const url = storageUrl();
    if (url) process.env.NODEGX_STORAGE_URL = url;
    else delete process.env.NODEGX_STORAGE_URL;
    service = new BackendService({ dataDir, port: 0, backendId: `bmg017_${engine}`, backendName: 'BMG-017' });
    base = (await service.start()).listen.url;

    expect((await admin({ action: 'createTable', table: 'Fill', columns: [{ name: 'name', type: 'String' }] })).status).toBe(200);
    expect((await create('Fill', { name: 'a' })).status).toBe(201);
    const added = await admin({ action: 'addColumn', table: 'Fill', column: { name: 'owner', type: 'String', required: true, fillExisting: 'FILL' } });
    expect(added.status).toBe(200);
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

  it('AC1 (CSV): a row that leaves the required field out is refused by name; the others import; none carries the fill', async () => {
    const existing = (await rows('Fill')).find((r) => r.name === 'a');
    expect(existing?.owner).toBe('FILL');
    // Row 0 names it; row 1 leaves the cell empty (a CSV import drops an empty
    // cell, so the field is omitted); row 2 UPDATES the old record without
    // naming the field — an update never needs it, and is not refused.
    const csv = ['objectId,name,owner', ',csv-named,Ann', ',csv-omitted,', `${existing!.objectId},a-updated,`].join('\n');
    const res = await importRows('Fill', 'csv', csv);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ applied: true, total: 3, created: 1, updated: 1 });
    expect(res.json.rejected).toHaveLength(1);
    expect(res.json.rejected[0].row).toBe(1);
    expect(res.json.rejected[0].errors.join(' ')).toMatch(/owner/);
    expect(res.json.rejected[0].errors.join(' ')).toMatch(/required/i);

    const after = await rows('Fill');
    expect(after.map((r) => [r.name, r.owner])).toEqual([
      ['a-updated', 'FILL'],
      ['csv-named', 'Ann']
    ]);
  });

  it('AC1 (JSON): the same refusal for a JSON row, and a dry run reports it before anything is written', async () => {
    const content = JSON.stringify([{ name: 'json-named', owner: 'Bo' }, { name: 'json-omitted' }]);
    const dry = await post<Body>(base, '/admin/import/Fill', { format: 'json', content, dryRun: true }, adminHeaders(dataDir));
    expect(dry.json).toMatchObject({ dryRun: true, created: 1 });
    expect(dry.json.rejected.map((r: Body) => r.row)).toEqual([1]);

    const res = await importRows('Fill', 'json', content);
    expect(res.json).toMatchObject({ applied: true, created: 1 });
    expect(res.json.rejected.map((r: Body) => r.row)).toEqual([1]);
    const names = (await rows('Fill')).map((r) => r.name);
    expect(names).toContain('json-named');
    expect(names).not.toContain('json-omitted');
    expect((await rows('Fill')).filter((r) => r.owner === 'FILL').map((r) => r.name)).toEqual(['a-updated']);
  });
}

describe('BMG-017 row 1 — import and R6 — SQLite', () => {
  engineSuite('sqlite', () => null);
});

(pgReachable ? describe : describe.skip)('BMG-017 row 1 — import and R6 — PostgreSQL', () => {
  const db = `nodegx_bmg017_${process.pid}_${Date.now().toString(36)}`;
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

describe('BMG-017 row 1 — the SQLite insert guard, below the import', () => {
  // The import refuses the row above; this is the backstop for any SQLite
  // caller that reaches the facade's batch without that check.
  it('the facade batch names an omitted required column as NULL, so the engine refuses it', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg017-batch-'));
    const previous = process.env.NODEGX_STORAGE_URL;
    delete process.env.NODEGX_STORAGE_URL;
    const service = new BackendService({ dataDir, port: 0, backendId: 'bmg017_batch', backendName: 'BMG-017' });
    try {
      const base = (await service.start()).listen.url;
      const h = adminHeaders(dataDir);
      await post(base, '/admin/schema', { action: 'createTable', table: 'Fill', columns: [{ name: 'name', type: 'String' }] }, h);
      await post(base, '/classes/Fill', { name: 'a' }, h);
      await post(base, '/admin/schema', { action: 'addColumn', table: 'Fill', column: { name: 'owner', type: 'String', required: true, fillExisting: 'FILL' } }, h);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const facade = (service as any).facade ?? (service as any).deps?.facade;
      expect(typeof facade?.upsertBatch).toBe('function');
      await expect(facade.upsertBatch('Fill', [{ data: { name: 'batch' } }])).rejects.toThrow(/NOT NULL|owner/);
      const names = ((await get<Body>(base, '/classes/Fill', h)).json.results as Body[]).map((r) => r.name);
      expect(names).toEqual(['a']);
    } finally {
      await service.stop().catch(() => undefined);
      if (previous === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previous;
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('census: every buildInsert caller is listed, and every SQLite one passes the required columns', () => {
    const repo = path.resolve(__dirname, '../..');
    const roots = [path.join(repo, 'noodl-runtime/src'), path.join(repo, 'nodegx-backend/src')];
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'node_modules') walk(p);
        } else if (/\.(ts|js)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
          const lines = fs.readFileSync(p, 'utf8').split('\n');
          lines.forEach((line, i) => {
            if (/\bbuildInsert\(/.test(line) && !/function buildInsert/.test(line)) {
              // The call as written — it may span the next lines.
              const call = lines.slice(i, i + 4).join(' ');
              found.push(`${path.relative(repo, p)} ${/\brequired\s*[:,}]/.test(call) ? 'required' : 'bare'}`);
            }
          });
        }
      }
    };
    roots.forEach(walk);
    // PostgreSQL drops the fill's default in the same queued step (R6), so an
    // omitted required column is refused by the engine without being named.
    // Every SQLite insert must name it: SQLite keeps the fill as the default.
    expect(found.sort()).toEqual(
      [
        'nodegx-backend/src/persistence/AdapterFacade.ts required',
        'noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts required',
        'noodl-runtime/src/api/adapters/postgres/PostgresAdapter.ts bare',
        'noodl-runtime/src/api/adapters/postgres/PostgresAdapter.ts bare'
      ].sort()
    );
  });
});
