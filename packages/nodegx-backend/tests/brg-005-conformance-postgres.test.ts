/**
 * BRG-005 AC1 / AC3 / AC9 — the conformance suite, run against PostgreSQL.
 *
 * This is the one file BRG-003's SQLite spec said the Postgres adapter would
 * add: *"BRG-005 adds one file to run it against Postgres. Nothing else
 * changes."* It builds the adapter through `createAdapter()` with a storage URL
 * and never names `PostgresAdapter`, for the same reason its sibling never
 * names `LocalSQLAdapter` — the day this file needs to know what is underneath
 * it, the suite has stopped being portable and that is the finding.
 *
 * Three things are graded here, and the numbers are what AC9 asks to be
 * recorded in the task file:
 *
 *   1. **AC1** — every case passes, or is declared (`POSTGRES_CONFORMANCE_DECLARATION`).
 *   2. **AC3/AC9** — each of the six mutants of `conformance/mutants.ts` is
 *      caught, by a different set of cases, and none reds the whole suite. An
 *      adapter that also passes as a mutant means the suite stopped
 *      discriminating, and that would be a BRG-003 defect to file.
 *   3. **AC4's first half** — `/health`'s pool shape is what `createAdapter`
 *      hands back, and `disconnect()` drains the pool.
 *
 * 🔴 Skipped when no PostgreSQL is reachable — BRG-004 §5.4's hole, which
 * BRG-006 closes by making it a gate. `NODEGX_PG_TEST_URL=postgres://…` points
 * it at another server; the database itself is created fresh for the run and
 * dropped after it, so the shared scratch database `nodegx_brg005` is not
 * accumulating tables from every run.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  CONFORMANCE_CASES,
  formatFailures,
  runConformance,
  type ConformanceDeclaration,
  type ConformanceReport
} from '@noodl/backend-contract/conformance';
import { MUTATIONS, MUTATION_DESCRIPTIONS, mutate, type MutationKind } from '@noodl/backend-contract/conformance/mutants';

import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';

// The register is a runtime value from the runtime package; ts-jest resolves the
// package's `src` subpath the same way `createAdapter` does.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POSTGRES_CONFORMANCE_DECLARATION, POSTGRES_DIVERGENCES, StorageUrlError } = require('@noodl/runtime/src/api/adapters/postgres');

jest.setTimeout(300000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_brg005_conf_${process.pid}_${Date.now().toString(36)}`;

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

/** `postgres:///nodegx_brg005` → `postgres:///<DB_NAME>`, keeping host and credentials. */
function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

// The compile-time half of AC2: the adapter's register is the suite's declaration shape.
const declaration: ConformanceDeclaration = POSTGRES_CONFORMANCE_DECLARATION;

suite('BRG-005 — conformance, PostgreSQL', () => {
  const testUrl = withDatabase(ADMIN_URL, DB_NAME);
  const tmpDirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  let report: ConformanceReport;
  const mutantReports = new Map<MutationKind, ConformanceReport>();

  async function freshAdapter(): Promise<PersistenceHandle> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg005-conformance-'));
    tmpDirs.push(dir);
    const handle = await createAdapter({ dataDir: dir, storageUrl: testUrl });
    handles.push(handle);
    return handle;
  }

  beforeAll(async () => {
    psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
    report = await runConformance(async () => (await freshAdapter()).adapter, declaration);
    for (const kind of MUTATIONS) {
      mutantReports.set(
        kind,
        await runConformance(async () => mutate((await freshAdapter()).adapter, kind), {
          ...declaration,
          adapter: `postgres mutant:${kind}`
        })
      );
    }
  });

  afterAll(async () => {
    for (const h of handles) {
      try {
        await h.adapter.disconnect();
      } catch {
        /* best-effort teardown */
      }
    }
    for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
    } catch {
      /* a client still attached; the next run uses a new name anyway */
    }
  });

  it('AC1 — the suite runs against PostgreSQL and is green', () => {
    // eslint-disable-next-line no-console
    console.log(
      `[BRG-005 AC1] ${report.adapter}: ${report.passed} passed, ${report.failed} failed, ` +
        `${report.skipped} skipped, ${report.failedAsDeclared} failed-as-declared of ${report.total}`
    );
    if (report.failures.length > 0) {
      throw new Error(`${report.failures.length} conformance failure(s) on PostgreSQL:\n${formatFailures(report)}`);
    }
    expect(report.failed).toBe(0);
    expect(report.total).toBe(CONFORMANCE_CASES.length);
    // Nothing is `conditional` here: every case runs against the real server.
    expect(report.skipped).toBe(0);
  });

  it('AC2 — every declared divergence names its evidence, and only degraded/unsupported ones reach the suite', () => {
    for (const d of POSTGRES_DIVERGENCES as Array<{ id: string; state: string; reason: string; evidence: string; cases?: string[] }>) {
      expect(d.id).toMatch(/^[a-z]+\/[a-z0-9-]+$/);
      expect(d.reason.length).toBeGreaterThan(40);
      expect(d.evidence.length).toBeGreaterThan(10);
      if (d.state === 'supported') expect(d.cases).toBeUndefined();
    }
    // Every case id the declaration names must exist — a declaration over a
    // case that was renamed would silently declare nothing.
    const ids = new Set(CONFORMANCE_CASES.map((c) => c.id));
    for (const id of Object.keys(declaration.cases ?? {})) expect(ids.has(id)).toBe(true);
    // The three search cases are declared `degraded` (ranking), and they still
    // PASSED above — degraded means correct rows, and the suite enforces it.
    const degraded = Object.entries(declaration.cases ?? {}).filter(([, v]) => v.state === 'degraded');
    expect(degraded.length).toBeGreaterThanOrEqual(3);
    for (const [id] of degraded) {
      expect(report.results.find((r) => r.id === id)?.status).toBe('passed');
    }
  });

  it.each(MUTATIONS)('AC3/AC9 — %s is caught on PostgreSQL', (kind) => {
    const r = mutantReports.get(kind)!;
    // eslint-disable-next-line no-console
    console.log(
      `\n[BRG-005 AC9] ${kind} — ${MUTATION_DESCRIPTIONS[kind]}\n` +
        `      caught by ${r.failures.length} case(s):\n` +
        r.failures.map((f) => `        ${f.id}`).join('\n')
    );
    expect(r.failures.length).toBeGreaterThan(0);
  });

  it('AC9 — each mutation is caught by a DIFFERENT set of cases, and none reds the whole suite', () => {
    const signatures = new Map<string, MutationKind[]>();
    for (const [kind, r] of mutantReports) {
      const sig = r.failures
        .map((f) => f.id)
        .sort()
        .join('|');
      signatures.set(sig, [...(signatures.get(sig) ?? []), kind]);
    }
    const collisions = [...signatures.entries()].filter(([, kinds]) => kinds.length > 1);
    expect(collisions.map(([, kinds]) => kinds.join(' == '))).toEqual([]);

    const wholesale = [...mutantReports.entries()]
      .filter(([, r]) => r.passed === 0 || r.failed === r.total)
      .map(([kind, r]) => `${kind} failed ${r.failed}/${r.total}`);
    expect(wholesale).toEqual([]);
  });

  it('AC4 — the handle reports the engine, a redacted target and pool saturation', async () => {
    const h = await freshAdapter();
    expect(h.status.engine).toBe('postgres');
    expect(h.status.persistent).toBe(true);
    expect(h.dbPath).toBe('');
    expect(h.target).toContain(DB_NAME);
    expect(h.target).not.toMatch(/:[^:@/]+@/); // no password survives into the target
    const pool = h.saturation!();
    expect(pool).not.toBeNull();
    expect(pool!.max).toBe(8);
    expect(pool!.saturation).toBeGreaterThanOrEqual(0);
    expect(pool!.pendingSchemaStatements).toBe(0);
  });

  it('AC4 — disconnect() drains the pool', async () => {
    const h = await freshAdapter();
    await h.adapter.disconnect();
    expect(h.saturation!()).toBeNull();
  });

  it('R5 — any other scheme is refused BY NAME before anything is opened', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg005-refuse-'));
    tmpDirs.push(dir);
    for (const [url, named] of [
      ['mysql://u:p@localhost/db', 'MySQL'],
      ['libsql://db.turso.io', 'libsql'],
      ['sqlite:///tmp/x.db', 'SQLite']
    ]) {
      let thrown: unknown;
      try {
        await createAdapter({ dataDir: dir, storageUrl: url });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(StorageUrlError);
      expect((thrown as Error).message).toContain(named);
      expect((thrown as Error).message).toContain('PostgreSQL only');
    }
  });

  it('AC6 — no case reaches the raw handle, and this adapter has none to reach', async () => {
    const h = await freshAdapter();
    expect((h.adapter as IStorageAdapter).getDatabase).toBeUndefined();
  });
});
