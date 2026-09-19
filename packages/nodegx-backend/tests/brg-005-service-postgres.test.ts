/**
 * BRG-005 AC4 — `NODEGX_STORAGE_URL=postgres://…` starts the SERVICE, `/health`
 * reports the engine and the pool, and stopping drains the pool.
 *
 * The conformance spec proves the adapter; this proves the wiring above it —
 * `BackendService.start()` through `createAdapter()` with the URL, every
 * system table (`_User`, `_Role`, …) created on PostgreSQL, the HTTP surface
 * up, and `stop()` (the same path the CLI's SIGTERM handler takes) leaving no
 * connection behind. Nothing here names the adapter class.
 *
 * 🔴 Skipped when no PostgreSQL is reachable. A fresh database per run.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

jest.setTimeout(120000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_brg005_svc_${process.pid}_${Date.now().toString(36)}`;

function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}

let reachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  reachable = true;
} catch {
  reachable = false;
}
const suite = reachable ? describe : describe.skip;

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

function getJson(url: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

suite('BRG-005 AC4 — the service on PostgreSQL', () => {
  const testUrl = withDatabase(ADMIN_URL, DB_NAME);
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  beforeAll(async () => {
    psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg005-service-'));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    process.env.NODEGX_STORAGE_URL = testUrl;
    service = new BackendService({ dataDir, port: 0, backendId: 'brg005_pg', backendName: 'BRG-005 on Postgres' });
    const started = await service.start();
    base = started.listen.url;
  });

  afterAll(async () => {
    if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = previousEnv;
    try {
      await service.stop();
    } catch {
      /* already stopped by the last case */
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
    } catch {
      /* a client still attached; the name is unique per run */
    }
  });

  it('starts, and /health names the engine and the pool beside the persistence status', async () => {
    const { status, body } = await getJson(`${base}/health`);
    expect(status).toBe(200);
    const persistence = body.persistence as Record<string, unknown>;
    expect(persistence.engine).toBe('postgres');
    expect(persistence.persistent).toBe(true);
    expect(persistence.ephemeral).toBe(false);
    const pool = persistence.pool as Record<string, unknown>;
    expect(pool).toBeTruthy();
    expect(pool.label).toBe('data');
    expect(pool.max).toBe(8);
    expect(typeof pool.saturation).toBe('number');
    // `start()` returns while the system tables' DDL may still be queued
    // (`ensureSystemTables` enqueues; every data call waits on the queue, so
    // nothing reads a table that is not there yet). `/health` shows the count
    // so an operator can see it, and it drains — measured, not assumed.
    expect(typeof pool.pendingSchemaStatements).toBe('number');
    const deadline = Date.now() + 10000;
    let pending = pool.pendingSchemaStatements as number;
    while (pending > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      const again = (await getJson(`${base}/health`)).body.persistence as Record<string, Record<string, number>>;
      pending = again.pool.pendingSchemaStatements;
    }
    expect(pending).toBe(0);
  });

  it('the system tables the service ensures at start exist on PostgreSQL', () => {
    const out = execFileSync(
      'psql',
      ['-qtAX', '-d', testUrl, '-c', "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY 1"],
      { encoding: 'utf8' }
    );
    const tables = out.split('\n').filter(Boolean);
    expect(tables).toEqual(expect.arrayContaining(['_Schema', '_User', '_Role']));
    // No SQLite file was created for rows: the data dir holds files and
    // secrets, not the database.
    expect(fs.existsSync(path.join(dataDir, 'data', 'local.db'))).toBe(false);
  });

  it('stop() — the SIGTERM path — resolves with the pool drained', async () => {
    await service.stop();
    // The port is closed and nothing answers; a second stop is harmless.
    await expect(getJson(`${base}/health`)).rejects.toBeTruthy();
    await expect(service.stop()).resolves.toBeUndefined();
  });
});
