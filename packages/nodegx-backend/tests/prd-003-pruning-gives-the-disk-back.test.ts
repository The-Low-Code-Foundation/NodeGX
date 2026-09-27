/**
 * PRD-003 — pruning that gives the disk back.
 *
 * Before this task, a prune deleted rows and the file stayed exactly as large as it ever got:
 * no `VACUUM` outside the backup path, no `auto_vacuum` pragma anywhere. The operator who filled
 * a disk, found `retentionDays`, and lowered it watched the row count fall and the file not move
 * — the most confusing possible outcome at the worst possible moment. And retention was age-only,
 * which cannot bound a FAST blowup: a misfiring workflow writes a month's volume in an hour and
 * every row is younger than the window.
 *
 * What is asserted:
 *
 *  1. `maxCount` prunes oldest-first, independently of age — and THE FILE ON DISK SHRINKS.
 *  2. Age and count both eligible: the report names both, with counts (rule 3 of the phase).
 *  3. A prune that removes nothing starts no reclaim.
 *  4. `retentionDays: 0` and `maxCount: 0` both mean keep forever.
 *  5. An EXISTING file (no incremental vacuum) is reported as needing manual compaction, its
 *     prune reclaims nothing on its own, and `compact()` converts it, shrinks it, and every
 *     prune after that reclaims incrementally.
 *  6. Over HTTP: `/admin/status` carries the prune report and the size, `/metrics` carries the
 *     gauge, and `POST /admin/executions/compact` is admin-gated and reports its cost.
 *
 * Rows are seeded through a SECOND connection inside one transaction — thousands of autocommit
 * inserts through the store would spend the test's budget on fsync rather than on the assertion.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ExecutionStore as CloudExecutionStore } from '@cloud-runtime/execution-history/store';
import { BackendService } from '../src/service';
import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { defaultOpsConfig, mergeOpsConfig, validateOpsConfig } from '../src/ops/model';

import { adminHeaders, httpClient } from './helpers/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

jest.setTimeout(60000);

const DAY = 86_400_000;

describe('PRD-003 pruning gives the disk back', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd003-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const dbPath = () => path.join(dataDir, 'executions.sqlite');
  const fileBytes = () => fs.statSync(dbPath()).size;

  function openHistory(limits: { retentionDays: number; maxCount: number }): {
    history: ExecutionHistory;
    store: CloudExecutionStore;
  } {
    const history = new ExecutionHistory();
    const status = history.open(dataDir, {
      getRetentionDays: () => limits.retentionDays,
      getMaxCount: () => limits.maxCount
    });
    if (!status.enabled) throw new Error(`execution history did not open: ${status.error}`);
    const logger = history.createLogger();
    if (!logger) throw new Error('createLogger returned null on an enabled history');
    return { history, store: logger.getStore() };
  }

  /**
   * `count` finished runs, one step each carrying `payloadBytes` of input, in ONE transaction on
   * a second connection. `started_at` ascends with `i`, so `exec_<prefix>_0` is the oldest.
   */
  function seedBulk(count: number, payloadBytes: number, ageMs: number, prefix = 'r'): void {
    const db = new DatabaseSync(dbPath());
    try {
      const base = Date.now() - ageMs - count;
      const payload = JSON.stringify({ blob: 'x'.repeat(Math.max(0, payloadBytes - 12)) });
      const exec = db.prepare(
        `INSERT INTO workflow_executions (id, workflow_id, workflow_name, trigger_type, status, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, 'manual', 'success', ?, ?, 5)`
      );
      const step = db.prepare(
        `INSERT INTO execution_steps (id, execution_id, node_id, node_type, step_index, started_at, completed_at, duration_ms, status, input_data)
         VALUES (?, ?, 'n1', 'noodl.cloud.response', 0, ?, ?, 5, 'success', ?)`
      );
      db.exec('BEGIN');
      for (let i = 0; i < count; i++) {
        const id = `exec_${prefix}_${i}`;
        const at = base + i;
        exec.run(id, 'bad-workflow', 'bad-workflow', at, at + 5);
        step.run(`step_${prefix}_${i}`, id, at, at + 5, payload);
      }
      db.exec('COMMIT');
    } finally {
      db.close();
    }
  }

  async function waitForReclaim(history: ExecutionHistory): Promise<void> {
    const deadline = Date.now() + 20_000;
    while (history.isReclaiming()) {
      if (Date.now() > deadline) throw new Error('reclaim did not finish in 20s');
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  // ==========================================================================
  // 1. Count, oldest first — and the file shrinks
  // ==========================================================================

  it('prunes to maxCount oldest-first, independently of age, and the file on disk shrinks', async () => {
    const { history, store } = openHistory({ retentionDays: 0, maxCount: 100 });
    expect(history.describe().autoVacuum).toBe('incremental'); // a NEW file gets it at creation
    seedBulk(1500, 30 * 1024, 0);
    const before = fileBytes();
    expect(before).toBeGreaterThan(30 * 1024 * 1000); // the seed is real: ≥ 30MB on disk

    expect(history.prune()).toBe(1400);

    const survivors = store.queryExecutions({ limit: 5000 });
    expect(survivors).toHaveLength(100);
    // Oldest first: every survivor is one of the 100 newest.
    for (const run of survivors) expect(Number(run.id.replace('exec_r_', ''))).toBeGreaterThanOrEqual(1400);

    const report = history.getLastPrune();
    expect(report).toMatchObject({ byAge: 0, byCount: 1400, boundBy: 'count', maxCount: 100, reclaim: 'incremental' });

    await waitForReclaim(history);
    const after = fileBytes();
    // 🔴 The assertion the task exists for. Before PRD-003 this was `after === before`.
    expect(after).toBeLessThan(before * 0.25);
    const d = history.describe();
    expect(d.reclaim.last).not.toBeNull();
    expect(d.reclaim.last!.pagesFreed).toBeGreaterThan(0);
    expect(d.reclaim.last!.error).toBeNull();
    expect(d.freePages).toBe(0);
    expect(d.compaction.manual).toBe(false);
  });

  // ==========================================================================
  // 2. Which limit fired
  // ==========================================================================

  it('age and count both eligible: the report names both, with counts', () => {
    const { history, store } = openHistory({ retentionDays: 30, maxCount: 50 });
    seedBulk(40, 200, 40 * DAY, 'old');
    seedBulk(120, 200, 0, 'new');

    expect(history.prune()).toBe(110);
    expect(store.queryExecutions({ limit: 5000 })).toHaveLength(50);
    expect(history.getLastPrune()).toMatchObject({
      byAge: 40,
      byCount: 70, // 120 recent, 50 kept — the count pass never saw the 40 the age pass removed
      boundBy: 'both',
      retentionDays: 30,
      maxCount: 50
    });
  });

  it('a prune that removes nothing starts no reclaim and attributes nothing', () => {
    const { history } = openHistory({ retentionDays: 30, maxCount: 100 });
    seedBulk(10, 200, 0);
    expect(history.prune()).toBe(0);
    expect(history.getLastPrune()).toMatchObject({ byAge: 0, byCount: 0, boundBy: 'none', reclaim: 'none' });
    expect(history.isReclaiming()).toBe(false);
    expect(history.describe().reclaim.last).toBeNull();
  });

  it('retentionDays 0 and maxCount 0 both still mean keep forever', () => {
    const { history, store } = openHistory({ retentionDays: 0, maxCount: 0 });
    seedBulk(30, 200, 400 * DAY, 'old');
    seedBulk(30, 200, 0, 'new');
    expect(history.prune()).toBe(0);
    expect(store.queryExecutions({ limit: 5000 })).toHaveLength(60);
    expect(history.getLastPrune()).toMatchObject({ boundBy: 'none', retentionDays: 0, maxCount: 0 });
  });

  // ==========================================================================
  // 3. The existing file, and the operator's compaction
  // ==========================================================================

  it('an existing file without incremental vacuum reclaims nothing on its own, says so, and compact() converts and shrinks it', async () => {
    // A file that predates this task: created with SQLite's default (auto_vacuum NONE) and
    // already holding a table, so the mode can no longer be chosen at open.
    const legacy = new DatabaseSync(dbPath());
    legacy.exec('CREATE TABLE legacy_marker (x INTEGER)');
    legacy.close();

    const { history } = openHistory({ retentionDays: 0, maxCount: 50 });
    expect(history.describe().autoVacuum).toBe('none');
    expect(history.describe().compaction.manual).toBe(true);
    expect(history.describe().compaction.hint).toContain('/admin/executions/compact');

    seedBulk(800, 30 * 1024, 0);
    const before = fileBytes();
    expect(history.prune()).toBe(750);
    expect(history.getLastPrune()).toMatchObject({ byCount: 750, reclaim: 'manual' });
    await waitForReclaim(history);
    // The confusing outcome, reproduced: rows gone, file not.
    expect(fileBytes()).toBeGreaterThan(before * 0.95);
    expect(history.describe().freePages).toBeGreaterThan(0);

    const report = history.compact();
    expect(report.converted).toBe(true);
    expect(report.autoVacuum).toBe('incremental');
    expect(report.beforeBytes).toBeGreaterThan(before * 0.95);
    expect(report.afterBytes).toBeLessThan(before * 0.25);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(history.describe().compaction.manual).toBe(false);

    // ...and from here on, prunes reclaim on their own.
    seedBulk(600, 30 * 1024, 0, 'again');
    const grown = fileBytes();
    expect(history.prune()).toBe(600);
    expect(history.getLastPrune()!.reclaim).toBe('incremental');
    await waitForReclaim(history);
    expect(fileBytes()).toBeLessThan(grown * 0.25);
  });

  // ==========================================================================
  // 4. The knob
  // ==========================================================================

  it('executions.maxCount is an ops.json field: 10,000 by default, an integer >= 0, unknown keys refused', () => {
    expect(defaultOpsConfig().executions.maxCount).toBe(10_000);
    expect(validateOpsConfig({ version: 1, executions: { maxCount: 0 } })).toEqual([]);
    expect(validateOpsConfig({ version: 1, executions: { maxCount: 500 } })).toEqual([]);
    expect(validateOpsConfig({ version: 1, executions: { maxCount: -1 } })).toEqual([
      'executions.maxCount must be an integer >= 0 (0 = no count limit)'
    ]);
    expect(validateOpsConfig({ version: 1, executions: { maxCount: 1.5 } })[0]).toMatch(/maxCount/);
    expect(validateOpsConfig({ version: 1, executions: { maxRows: 5 } })).toContain('unknown key "maxRows" in executions');
    // An ops.json written before this field existed still loads, with the default.
    expect(mergeOpsConfig({ version: 1, executions: { retentionDays: 7 } }).executions.maxCount).toBe(10_000);
  });

  // ==========================================================================
  // 5. Over HTTP
  // ==========================================================================

  it('/admin/status reports the prune, /metrics carries the gauge, and compaction is an admin POST that reports its cost', async () => {
    // Seed a history the service is about to open, over the count limit its ops.json sets.
    const seeded = openHistory({ retentionDays: 0, maxCount: 0 });
    seedBulk(120, 4 * 1024, 0);
    expect(seeded.history.prune()).toBe(0);
    fs.writeFileSync(
      path.join(dataDir, 'ops.json'),
      JSON.stringify(mergeOpsConfig({ version: 1, executions: { retentionDays: 0, maxCount: 20 } }))
    );

    const service = new BackendService({ dataDir, port: 0, backendId: 'prd003', backendName: 'PRD-003' });
    const base = (await service.start()).listen.url;
    const client = httpClient(() => base);
    try {
      interface Status {
        executions: {
          enabled: boolean;
          fileBytes: number;
          autoVacuum: string;
          lastPrune: { byAge: number; byCount: number; boundBy: string; maxCount: number } | null;
          compaction: { manual: boolean; hint: string };
          bounds: { retentionDays: number; maxCount: number; maxValueBytes: number; maxRunBytes: number };
        };
      }
      const status = await client.get<Status>('/admin/status', adminHeaders(dataDir));
      expect(status.status).toBe(200);
      const ex = status.json.executions;
      expect(ex.enabled).toBe(true);
      expect(typeof ex.fileBytes).toBe('number');
      expect(ex.autoVacuum).toBe('incremental');
      // The startup prune ran against ops.json, and the report says which limit bound it.
      expect(ex.lastPrune).toMatchObject({ byAge: 0, byCount: 100, boundBy: 'count', maxCount: 20 });
      expect(ex.compaction.manual).toBe(false);
      expect(ex.bounds).toMatchObject({ retentionDays: 0, maxCount: 20 });

      // Public /health does NOT carry the operator's picture.
      const health = await client.get<Record<string, unknown>>('/health');
      expect(health.status).toBe(200);
      expect(health.json.executions).toBeUndefined();
      expect(health.json.secrets).toBeUndefined();

      const metrics = await client.get('/metrics');
      expect(metrics.status).toBe(200);
      expect(metrics.text).toMatch(/^nodegx_executions_db_file_bytes \d+$/m);
      expect(metrics.text).toMatch(/^nodegx_db_file_bytes \d+$/m); // the other file, still there

      expect((await client.post('/admin/executions/compact', {})).status).toBe(401);
      interface Compact {
        beforeBytes: number;
        afterBytes: number;
        durationMs: number;
        autoVacuum: string;
        converted: boolean;
      }
      const compact = await client.post<Compact>('/admin/executions/compact', {}, adminHeaders(dataDir));
      expect(compact.status).toBe(200);
      expect(compact.json.autoVacuum).toBe('incremental');
      expect(compact.json.converted).toBe(false); // already incremental — nothing to convert
      expect(compact.json.afterBytes).toBeLessThanOrEqual(compact.json.beforeBytes);
      expect(compact.json.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      await service.stop();
    }
  });
});
