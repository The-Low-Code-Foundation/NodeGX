/**
 * BMG-009 over a real BackendService — the Runs page's route and the run
 * drawer's route.
 *
 *  - `GET /executions` takes `kind`, `name`, `trigger`, `since`/`until` and
 *    `minDurationMs` beside what it took before, answers the same BARE ARRAY
 *    (`admin-dashboard.test.ts` names that seam) and its page count in
 *    `X-Total-Count`; a parameter it cannot read is a 400 in words.
 *  - `kind` is DERIVED: the SQL rule in the store and `executionKind` in
 *    `execution/kind.ts` are held to the same answer over records written
 *    the OLD way (no `kind` stamp) — a function run, a backup, a sweep, a
 *    workflow. Every row and record carries `kind`.
 *  - `POST /admin/workflow-defs/:id/run {payload, wait:false}` is a 202 with
 *    the record id while the run is still going, and the record's
 *    `triggerData.body` is what was sent (AC1's "base input equals what was
 *    entered"); a bare body still waits and still answers `{run}`.
 *  - Cancel: a running workflow cancelled through the existing route ends
 *    with the engine's `cancelled` disposition on the record (AC3).
 *  - `GET /admin/workflow-defs` decorates `lastRuns` beside the definitions,
 *    never on them.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { RUN_KINDS, executionKind } from '../src/execution/kind';
import type { WorkflowListResponse, WorkflowStartedResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';

import { adminHeaders, request } from './helpers/http';

jest.setTimeout(60000);

type Row = { id: string; kind: string; status: string; workflowName: string; startedAt: number; durationMs?: number; metadata?: Record<string, unknown> };

const HOUR = 3600_000;

describe('BMG-009 the Runs route and the run drawer route', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  const req = <T = unknown>(method: string, p: string, body?: unknown) => request<T>(base, method, p, { body, headers: admin });
  const now = Date.now();
  const seeded: Record<string, string> = {};

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg009-'));
    // Two definitions the drawer's route runs: one that answers with what it was given, one that holds.
    const defs = path.join(dataDir, 'workflow-defs');
    fs.mkdirSync(defs, { recursive: true });
    const stamp = { createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' };
    fs.writeFileSync(
      path.join(defs, 'greet.workflow-def.json'),
      JSON.stringify({ version: 1, id: 'greet', name: 'Greet', entry: 'answer', concurrency: 1, steps: [{ id: 'answer', kind: 'return', params: { value: { $path: 'body.name' } } }], ...stamp })
    );
    fs.writeFileSync(
      path.join(defs, 'slow.workflow-def.json'),
      JSON.stringify({ version: 1, id: 'slow', name: 'Slow', entry: 'hold', concurrency: 2, steps: [{ id: 'hold', kind: 'wait', params: { duration: 20, unit: 'seconds' } }], ...stamp })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg9', backendName: 'BMG-009' });
    base = (await service.start()).listen.url;
    admin = adminHeaders(dataDir);

    // Records written the OLD way — no `kind` stamp — into the history this service serves.
    const history = new ExecutionHistory();
    expect(history.open(dataDir, { getRetentionDays: () => 0 }).enabled).toBe(true);
    const store = history.createLogger()!.getStore();
    const put = (key: string, rec: Parameters<typeof store.createExecution>[0]) => {
      seeded[key] = store.createExecution(rec);
    };
    const done = (startedAt: number, ms: number) => ({ startedAt, completedAt: startedAt + ms, durationMs: ms });
    put('fnOld', { workflowId: 'digest', workflowName: 'digest', triggerType: 'schedule', status: 'error', ...done(now - 2 * HOUR, 40), errorMessage: 'boom', metadata: { backendId: 'bmg9', triggerId: 'trg_night' } });
    put('fnOk', { workflowId: 'digest', workflowName: 'digest', triggerType: 'schedule', status: 'success', ...done(now - 26 * HOUR, 5000), metadata: { backendId: 'bmg9', triggerId: 'trg_night' } });
    put('fnOther', { workflowId: 'hello', workflowName: 'hello', triggerType: 'webhook', status: 'error', ...done(now - HOUR, 12), metadata: { backendId: 'bmg9' } });
    put('backup', { workflowId: '__backup__', workflowName: 'Backup', triggerType: 'manual', status: 'success', ...done(now - 3 * HOUR, 900), metadata: { operation: 'backup', triggerSource: 'admin' } });
    put('restore', { workflowId: '__restore__', workflowName: 'Restore', triggerType: 'manual', status: 'success', ...done(now - 4 * HOUR, 700), metadata: { operation: 'restore' } });
    put('sweep', { workflowId: '__file_orphan_sweep__', workflowName: 'File orphan sweep', triggerType: 'schedule', status: 'success', ...done(now - 5 * HOUR, 30), metadata: { operation: 'file-orphan-sweep' } });
    put('wfOld', { workflowId: 'greet', workflowName: 'Greet', triggerType: 'manual', status: 'success', ...done(now - 9 * 24 * HOUR, 8), metadata: { kind: 'workflow', engineStatus: 'success' } });
    put('digest8d', { workflowId: 'digest', workflowName: 'digest', triggerType: 'schedule', status: 'error', ...done(now - 8 * 24 * HOUR, 41), metadata: { triggerId: 'trg_night' } });
    history.close?.();
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const rows = async (qs: string) => {
    const res = await req<Row[]>('GET', '/executions?' + qs);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json)).toBe(true);
    return { rows: res.json, total: res.headers.get('x-total-count') };
  };
  const ids = (list: Row[]) => list.map((r) => r.id).sort();
  const of = (...keys: string[]) => keys.map((k) => seeded[k]).sort();

  it('answers a bare array, every row with a kind, and the page count in X-Total-Count', async () => {
    const { rows: all, total } = await rows('limit=100');
    expect(all.length).toBe(8);
    expect(total).toBe('8');
    for (const r of all) expect(RUN_KINDS.map((k) => k.id)).toContain(r.kind);
    // Paging: the count is of the WHOLE match, not the page.
    const page = await rows('limit=3&offset=3');
    expect(page.rows.length).toBe(3);
    expect(page.total).toBe('8');
    expect(ids(page.rows).some((id) => ids(all.slice(0, 3)).indexOf(id) >= 0)).toBe(false);
  });

  it('kind: the SQL rule and executionKind agree on every record, and old-shaped records classify', async () => {
    const { rows: all } = await rows('limit=100');
    for (const kind of RUN_KINDS.map((k) => k.id)) {
      const expected = all.filter((r) => executionKind(r.metadata) === kind).map((r) => r.id).sort();
      const { rows: got, total } = await rows('kind=' + kind + '&limit=100');
      expect(ids(got)).toEqual(expected);
      expect(total).toBe(String(expected.length));
      for (const r of got) expect(r.kind).toBe(kind);
    }
    // 🔴 Each arm must have MATCHED something, or four empty lists agree with four empty lists.
    expect(ids((await rows('kind=function&limit=100')).rows)).toEqual(of('fnOld', 'fnOk', 'fnOther', 'digest8d'));
    expect(ids((await rows('kind=backup&limit=100')).rows)).toEqual(of('backup', 'restore'));
    expect(ids((await rows('kind=maintenance&limit=100')).rows)).toEqual(of('sweep'));
    expect(ids((await rows('kind=workflow&limit=100')).rows)).toEqual(of('wfOld'));
    const bad = await req<{ error: string }>('GET', '/executions?kind=cron');
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/not a kind of run/);
  });

  it('AC2: status is error, name contains digest, started within the past 7 days — one query', async () => {
    const since = now - 7 * 24 * HOUR;
    const { rows: got, total } = await rows('status=error&name=digest&since=' + since + '&until=' + now + '&limit=100');
    expect(ids(got)).toEqual(of('fnOld'));
    expect(total).toBe('1');
    // `since` also reads ISO text; `name` is a case-insensitive contains with `%` and `_` literal.
    expect(ids((await rows('name=DIG&since=' + new Date(since).toISOString() + '&limit=100')).rows)).toEqual(of('fnOld', 'fnOk'));
    expect(ids((await rows('name=%25&limit=100')).rows)).toEqual([]);
    const bad = await req<{ error: string }>('GET', '/executions?since=yesterday');
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/"since"/);
  });

  it('trigger and minDurationMs: runs of one trigger; only the ones that took long enough', async () => {
    expect(ids((await rows('trigger=trg_night&limit=100')).rows)).toEqual(of('fnOld', 'fnOk', 'digest8d'));
    expect(ids((await rows('trigger=trg_night&minDurationMs=1000&limit=100')).rows)).toEqual(of('fnOk'));
    expect(ids((await rows('minDurationMs=500&limit=100')).rows)).toEqual(of('fnOk', 'backup', 'restore'));
    const bad = await req<{ error: string }>('GET', '/executions?minDurationMs=soon');
    expect(bad.status).toBe(400);
  });

  it('AC1: wait:false is a 202 with the record id, and the record starts with what was sent', async () => {
    const res = await req<WorkflowStartedResponse>('POST', '/admin/workflow-defs/greet/run', { payload: { name: 'Ann', count: 3, dryRun: true }, wait: false });
    expect(res.status).toBe(202);
    expect(res.json.started).toBe(true);
    expect(res.json.workflowId).toBe('greet');
    expect(res.json.executionId).toMatch(/^exec_/);
    // The run finishes on its own; the record says success and carries the base input.
    let rec: Record<string, any> = {};
    for (let i = 0; i < 40 && rec.status !== 'success'; i++) {
      rec = (await req<Record<string, any>>('GET', '/executions/' + res.json.executionId)).json;
      if (rec.status !== 'success') await new Promise((r) => setTimeout(r, 100));
    }
    expect(rec.status).toBe('success');
    expect(rec.kind).toBe('workflow');
    expect(rec.triggerData.body).toEqual({ name: 'Ann', count: 3, dryRun: true });
    expect(rec.triggerType).toBe('manual');
    // The envelope form without `wait` waits, as before, and answers the run.
    const waited = await req<{ run: { status: string; output: unknown } }>('POST', '/admin/workflow-defs/greet/run', { payload: { name: 'Bob' } });
    expect(waited.status).toBe(200);
    expect(waited.json.run.status).toBe('success');
    expect(waited.json.run.output).toBe('Bob');
    // A bare body is the payload — `wait` is data there, not an instruction.
    const bare = await req<{ run: { status: string } }>('POST', '/admin/workflow-defs/greet/run', { name: 'Cy', wait: false });
    expect(bare.status).toBe(200);
    expect(bare.json.run.status).toBe('success');
    expect((await req<{ error: string }>('POST', '/admin/workflow-defs/nope/run', { payload: {}, wait: false })).status).toBe(404);
  });

  it('AC3: a running workflow, cancelled, ends with the cancelled disposition on its record', async () => {
    const started = await req<WorkflowStartedResponse>('POST', '/admin/workflow-defs/slow/run', { payload: {}, wait: false });
    expect(started.status).toBe(202);
    const id = started.json.executionId;
    const running = await req<Row>('GET', '/executions/' + id);
    expect(running.json.status).toBe('running');
    expect(ids((await rows('status=running&kind=workflow&limit=100')).rows)).toContain(id);
    const cancel = await req<{ cancelling: boolean }>('POST', '/admin/workflow-runs/' + id + '/cancel', {});
    expect(cancel.status).toBe(200);
    let rec: Record<string, any> = {};
    for (let i = 0; i < 40 && rec.status === undefined; i++) {
      rec = (await req<Record<string, any>>('GET', '/executions/' + id)).json;
      if (rec.status === 'running') {
        rec = {};
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    expect(rec.status).toBe('error');
    expect(rec.metadata.engineStatus).toBe('cancelled');
    expect(rec.metadata.cancelled).toBe(true);
    expect(rec.errorMessage).toMatch(/cancelled/);
  });

  it('GET /admin/workflow-defs decorates lastRuns beside the definitions, never on them', async () => {
    const res = await req<WorkflowListResponse>('GET', '/admin/workflow-defs');
    expect(res.status).toBe(200);
    const greet = res.json.workflows.find((w) => w.id === 'greet')!;
    expect(greet).toBeDefined();
    expect(Object.keys(greet)).not.toContain('lastRun');
    expect(Object.keys(greet)).not.toContain('lastRuns');
    expect(res.json.lastRuns.greet).toMatchObject({ status: 'success' });
    expect(res.json.lastRuns.greet.startedAt).toBeGreaterThan(now - HOUR);
    expect(res.json.lastRuns.slow).toMatchObject({ status: 'error', engineStatus: 'cancelled' });
    // The newest run wins: greet's last run is the one this suite made, not the seeded 9-day-old one.
    expect(res.json.lastRuns.greet.id).not.toBe(seeded.wfOld);
  });
});
