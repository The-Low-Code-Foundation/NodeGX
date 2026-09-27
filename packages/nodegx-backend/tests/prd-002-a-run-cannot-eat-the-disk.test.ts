/**
 * PRD-002 — a run cannot eat the disk.
 *
 * What the task file's grep missed, and this spec measures rather than assumes: the shared cloud
 * substrate ALREADY capped one value at 50KB (`execution-history/store.ts`), so Richard's ~10MB
 * records could not have happened here per value. What nothing bounded was the SUM — a thousand
 * steps each just under the cap — and nothing made the cap configurable, announced, or findable.
 * That is what this task adds, at the single write point every record on this backend passes.
 *
 * What is asserted:
 *
 *  1. A 20MB step input is stored as a marker naming its size; the run completes.
 *  2. Many merely-large values: the run budget fires, later values are omitted, the run still
 *     completes, `metadata.recordCapped` names the bounds, and `list({ capped: true })` finds it.
 *  3. The substrate's own fence follows the live bound — a value above the old 50KB constant is
 *     stored whole when the operator raised the bound.
 *  4. 🔴 A secret straddling the truncation boundary is scrubbed, over the REAL cloud-function
 *     path (Request → Secret → Log → Response), with a same-run control proving the cut fires.
 *  5. A cloud function handed a large request body: the record is bounded, the call succeeds.
 *  6. A thousand bad runs in miniature: the file is bounded.
 *  7. The knobs are ops.json fields with a floor, and a run budget below the value cap is refused.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { RECORD_CAPPED_HINT, RecordCappedStamp } from '../src/execution/BoundedExecutionLogger';
import { boundText, boundValue, formatBytes, isBoundedMarker, RecordBounds } from '../src/execution/record-bounds';
import { defaultOpsConfig, MIN_RECORD_VALUE_BYTES, validateOpsConfig } from '../src/ops/model';
import type { ExecutionWithSteps, WorkflowExecution } from '../src/execution/ExecutionStore';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(60000);

/** Request → Secret(STRIPE_KEY) → Log(message = the secret) → Response. The leak, as a graph (CWF-013's own fixture). */
const logSecretFunction = {
  name: '/#__cloud__/logSecret',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'note' }, ports: [], children: [] },
    { id: 'sec', type: 'noodl.cloud.secret', x: 0, y: 100, parameters: { name: 'STRIPE_KEY' }, ports: [], children: [] },
    { id: 'log', type: 'net.noodl.Log', x: 0, y: 200, parameters: { level: 'warn' }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 300, parameters: { params: 'ok' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'sec', targetPort: 'fetch' },
    { sourceId: 'sec', sourcePort: 'value', targetId: 'log', targetPort: 'message' },
    { sourceId: 'sec', sourcePort: 'done', targetId: 'log', targetPort: 'log' },
    { sourceId: 'req', sourcePort: 'pm-note', targetId: 'res', targetPort: 'pm-ok' },
    { sourceId: 'log', sourcePort: 'done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

/** Request → Log(message + data from the body) → Response. The ordinary use, and the control. */
const plainLogFunction = {
  name: '/#__cloud__/plainLog',
  nodes: [
    {
      id: 'req',
      type: 'noodl.cloud.request',
      x: 0,
      y: 0,
      parameters: { allowNoAuth: true, params: 'message,payload' },
      ports: [],
      children: []
    },
    { id: 'log', type: 'net.noodl.Log', x: 0, y: 100, parameters: { level: 'error' }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'ok' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-message', targetId: 'log', targetPort: 'message' },
    { sourceId: 'req', sourcePort: 'pm-payload', targetId: 'log', targetPort: 'data' },
    { sourceId: 'req', sourcePort: 'pm-message', targetId: 'log', targetPort: 'value' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'log', targetPort: 'log' },
    { sourceId: 'log', sourcePort: 'value', targetId: 'res', targetPort: 'pm-ok' },
    { sourceId: 'log', sourcePort: 'done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

/**
 * A secret LONGER than the smallest value cap, so a cut at `maxValueBytes` lands inside it. If
 * the record were cut before the scrub, the stored prefix would not match the secret and would
 * leak; scrubbed first, the whole thing is one short `[REDACTED]`.
 */
const STRADDLING_SECRET = 'sk_live_' + 'q7'.repeat(3000) + '_do_not_leak';

/** Every file the service wrote under dataDir, as text — the same reach as CWF-009's spec. */
function filesUnder(dir: string): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push({ file: full, text: fs.readFileSync(full).toString('binary') });
  }
  return out;
}

describe('PRD-002 a run cannot eat the disk', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd002-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const fileBytes = () => fs.statSync(path.join(dataDir, 'executions.sqlite')).size;

  function openHistory(bounds: () => RecordBounds): ExecutionHistory {
    const history = new ExecutionHistory();
    const status = history.open(dataDir, { getRecordBounds: bounds });
    if (!status.enabled) throw new Error(`execution history did not open: ${status.error}`);
    return history;
  }

  const capped = (run: WorkflowExecution | ExecutionWithSteps): RecordCappedStamp | undefined =>
    run.metadata?.recordCapped as RecordCappedStamp | undefined;

  // ==========================================================================
  // The helper, on its own
  // ==========================================================================

  it('boundValue keeps a value under the cap and replaces one over it with a marker naming its size', () => {
    const small = { a: 1 };
    expect(boundValue(small, 100)).toEqual({ value: small, bytes: 7, truncated: false, originalBytes: 7 });
    expect(boundValue(undefined, 100)).toEqual({ value: undefined, bytes: 0, truncated: false, originalBytes: 0 });

    const big = { blob: 'x'.repeat(5000) };
    const out = boundValue(big, 1000);
    expect(out.truncated).toBe(true);
    expect(out.originalBytes).toBe(JSON.stringify(big).length);
    expect(out.bytes).toBeLessThan(1200);
    expect(out.value).toMatchObject({ __truncated: true, __originalSize: out.originalBytes, __maxSize: 1000 });
    expect((out.value as { __preview: string }).__preview).toHaveLength(1001);
    expect(isBoundedMarker(out.value)).toBe(true);
    expect(isBoundedMarker(small)).toBe(false);

    expect(formatBytes(10.4 * 1024 * 1024)).toBe('10.4MB');
    expect(boundText('hello', 10)).toBe('hello');
    expect(boundText('x'.repeat(3000), 10)).toBe('xxxxxxxxxx…[truncated, 2.9KB]');
  });

  // ==========================================================================
  // 1. One enormous value
  // ==========================================================================

  it('a 20MB step input is stored as a marker naming its size — and the run completes', () => {
    const history = openHistory(() => ({ maxValueBytes: 10_000, maxRunBytes: 50_000_000 }));
    const logger = history.createLogger()!;
    const id = logger.startExecution({ workflowId: 'bad', workflowName: 'bad', triggerType: 'manual' });
    const twentyMB = 20 * 1024 * 1024;
    const stepId = logger.startNode({ nodeId: 'n1', nodeType: 'x', inputData: { rows: 'r'.repeat(twentyMB) } });
    logger.completeNode(stepId, true, { ok: true });
    logger.completeExecution(true);

    const run = history.get(id)!;
    expect(run.status).toBe('success');
    const input = run.steps[0].inputData as Record<string, unknown>;
    expect(input.__truncated).toBe(true);
    expect(input.__originalSize).toBeGreaterThan(twentyMB);
    expect(input.__maxSize).toBe(10_000);
    expect(run.steps[0].outputData).toEqual({ ok: true });
    expect(fileBytes()).toBeLessThan(1024 * 1024);

    const stamp = capped(run)!;
    expect(stamp).toMatchObject({ valuesTruncated: 1, valuesOmitted: 0, budgetReached: false, hint: RECORD_CAPPED_HINT });
    expect(history.list({ capped: true }).map((r) => r.id)).toEqual([id]);
  });

  // ==========================================================================
  // 2. Many merely-large values
  // ==========================================================================

  it('many merely-large values: the run budget fires, later values are omitted, the run completes, and it is findable', () => {
    const history = openHistory(() => ({ maxValueBytes: 10_000, maxRunBytes: 40_000 }));
    const logger = history.createLogger()!;
    const id = logger.startExecution({ workflowId: 'loop', workflowName: 'loop', triggerType: 'manual' });
    const value = { chunk: 'c'.repeat(4_980) }; // ~5,000 bytes, well under the value cap
    for (let i = 0; i < 20; i++) {
      const stepId = logger.startNode({ nodeId: `n${i}`, nodeType: 'x', inputData: value });
      logger.completeNode(stepId, true);
    }
    logger.completeExecution(true);

    const run = history.get(id)!;
    expect(run.status).toBe('success');
    expect(run.steps).toHaveLength(20); // the STEPS are all there — this bounds the record, not the run
    const kept = run.steps.filter((s) => !isBoundedMarker(s.inputData));
    const omitted = run.steps.filter((s) => (s.inputData as Record<string, unknown>)?.__omitted === true);
    // 40,000 / ~5,000 → the 9th value crosses the budget and is kept; the 10th onward are omitted.
    expect(kept.length).toBeGreaterThanOrEqual(8);
    expect(kept.length).toBeLessThanOrEqual(9);
    expect(omitted.length).toBe(20 - kept.length);
    expect(omitted[0].inputData).toMatchObject({
      __omitted: true,
      __reason: 'run record budget reached',
      __originalSize: JSON.stringify(value).length,
      __runBudgetBytes: 40_000
    });

    const stamp = capped(run)!;
    expect(stamp.budgetReached).toBe(true);
    expect(stamp.valuesOmitted).toBe(omitted.length);
    expect(stamp.maxRunBytes).toBe(40_000);
    expect(stamp.recordBytes).toBeGreaterThan(40_000);
    expect(stamp.recordBytes).toBeLessThan(46_000);

    // A normal run beside it, so the filter is proven in both directions.
    const normal = history.createLogger()!;
    const normalId = normal.startExecution({ workflowId: 'fine', workflowName: 'fine', triggerType: 'manual' });
    normal.completeNode(normal.startNode({ nodeId: 'n', nodeType: 'x', inputData: { a: 1 } }), true);
    normal.completeExecution(true);
    expect(capped(history.get(normalId)!)).toBeUndefined();
    expect(history.list({ capped: true }).map((r) => r.id)).toEqual([id]);
    expect(history.list({ capped: false }).map((r) => r.id)).toEqual([normalId]);
    expect(history.list({}).map((r) => r.id).sort()).toEqual([id, normalId].sort());
  });

  // ==========================================================================
  // 3. The substrate's fence follows the live bound
  // ==========================================================================

  it("the substrate's own 50KB constant no longer caps a value the operator allowed", () => {
    let bounds: RecordBounds = { maxValueBytes: MIN_RECORD_VALUE_BYTES, maxRunBytes: 10_000_000 };
    const history = openHistory(() => bounds);

    // Under a 4KB bound, an 8KB value is cut — by the wrapper, with its own size in the marker.
    const tight = history.createLogger()!;
    const tightId = tight.startExecution({ workflowId: 'w', workflowName: 'w', triggerType: 'manual' });
    tight.completeNode(tight.startNode({ nodeId: 'n', nodeType: 'x', inputData: { v: 'v'.repeat(8_000) } }), true);
    tight.completeExecution(true);
    expect(history.get(tightId)!.steps[0].inputData).toMatchObject({ __truncated: true, __maxSize: MIN_RECORD_VALUE_BYTES });

    // Raised live above the old store constant (50KB) AND the old logger default (100,000):
    // a 120,000-byte value is stored WHOLE. Before this task it came back as a 1KB preview.
    bounds = { maxValueBytes: 200_000, maxRunBytes: 10_000_000 };
    const wide = history.createLogger()!;
    const wideId = wide.startExecution({ workflowId: 'w', workflowName: 'w', triggerType: 'manual' });
    wide.completeNode(wide.startNode({ nodeId: 'n', nodeType: 'x', inputData: { v: 'v'.repeat(120_000) } }), true);
    wide.completeExecution(true);
    const stored = history.get(wideId)!.steps[0].inputData as { v: string };
    expect(stored.v).toHaveLength(120_000);
    expect(capped(history.get(wideId)!)).toBeUndefined();
  });

  // ==========================================================================
  // 4 + 5. Over the real cloud-function path
  // ==========================================================================

  describe('over the real cloud-function path', () => {
    let service: BackendService;
    let base: string;
    const client = httpClient(() => base);

    beforeEach(async () => {
      fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
      fs.writeFileSync(
        path.join(dataDir, 'workflows', 'prd002.workflow.json'),
        JSON.stringify({ components: [logSecretFunction, plainLogFunction], settings: {}, metadata: {} })
      );
      // The secret the backend HOLDS, so the scrubber knows it. Longer than the value cap below.
      fs.writeFileSync(
        path.join(dataDir, 'secrets.json'),
        JSON.stringify({ functions: { STRIPE_KEY: STRADDLING_SECRET } }, null, 2),
        { mode: 0o600 }
      );
      // The smallest value cap the model allows, so the cut lands inside the secret.
      fs.writeFileSync(
        path.join(dataDir, 'ops.json'),
        JSON.stringify({
          version: 1,
          executions: { maxValueBytes: MIN_RECORD_VALUE_BYTES, maxRunBytes: 2 * MIN_RECORD_VALUE_BYTES }
        })
      );
      service = new BackendService({ dataDir, port: 0, backendId: 'prd002', backendName: 'PRD-002' });
      base = (await service.start()).listen.url;
    });

    afterEach(async () => {
      await service.stop();
    });

    async function runOf(workflowId: string): Promise<ExecutionWithSteps> {
      const list = await client.get<WorkflowExecution[]>(`/executions?workflowId=${workflowId}`, adminHeaders(dataDir));
      expect(list.status).toBe(200);
      expect(list.json).toHaveLength(1);
      const one = await client.get<ExecutionWithSteps>(`/executions/${list.json[0].id}`, adminHeaders(dataDir));
      expect(one.status).toBe(200);
      return one.json;
    }

    it('🔴 a secret straddling the truncation boundary is scrubbed — truncation runs AFTER the scrub', async () => {
      // The CONTROL first, in the same run: a non-secret message of the same length IS cut at
      // this bound. Without it, "no secret in the record" could mean the cap never fired.
      const filler = 'f'.repeat(STRADDLING_SECRET.length);
      const control = await client.post<{ result?: unknown }>('/functions/plainLog', { message: filler, payload: {} });
      expect(control.status).toBe(200);
      const controlRun = await runOf('plainLog');
      const controlLog = controlRun.steps.find((s) => s.nodeType === 'net.noodl.Log');
      expect(controlLog).toBeDefined();
      expect(JSON.stringify(controlLog!.inputData)).toContain('__truncated');
      expect(JSON.stringify(controlLog!.inputData)).not.toContain(filler); // the cut is real
      expect(JSON.stringify(controlLog!.inputData)).toContain('f'.repeat(500)); // the preview is real

      // The arm: the same length, but it is the secret.
      const res = await client.post<{ result?: unknown }>('/functions/logSecret', { note: 'hi' });
      expect(res.status).toBe(200);
      const run = await runOf('logSecret');
      const logStep = run.steps.find((s) => s.nodeType === 'net.noodl.Log');
      expect(logStep).toBeDefined();
      const recorded = JSON.stringify(logStep!.inputData);
      // Scrubbed whole — one short placeholder, so nothing was left to cut.
      expect(recorded).toContain('[REDACTED]');
      expect(recorded).not.toContain('__truncated');
      // Not a fragment either: no prefix of the secret survives, at any length a cut could leave.
      expect(recorded).not.toContain(STRADDLING_SECRET.slice(0, 64));
      expect(recorded).not.toContain('q7'.repeat(30));

      // Nor anywhere on disk — the record file included.
      for (const { file, text } of filesUnder(dataDir)) {
        if (file.endsWith('secrets.json')) continue; // where it is supposed to be
        expect(text).not.toContain(STRADDLING_SECRET.slice(0, 64));
        expect(text).not.toContain('q7'.repeat(30));
      }
    });

    it('a cloud function handed a large request body: the record is bounded, the call succeeds', async () => {
      const big = 'b'.repeat(300_000);
      const res = await client.post<{ result?: unknown }>('/functions/plainLog', { message: big, payload: { z: big } });
      expect(res.status).toBe(200); // a recording bound, never an execution bound

      const run = await runOf('plainLog');
      expect(run.status).toBe('success');
      const text = JSON.stringify(run);
      expect(text.length).toBeLessThan(50_000); // ~600KB of input, a few KB of record
      expect(text).toContain('__truncated');
      expect(text).not.toContain('b'.repeat(5000));
      const stamp = capped(run)!;
      expect(stamp.valuesTruncated).toBeGreaterThanOrEqual(1);
      expect(stamp.maxValueBytes).toBe(MIN_RECORD_VALUE_BYTES);

      // ...and findable, from the API, without reading the source.
      const found = await client.get<WorkflowExecution[]>('/executions?capped=true', adminHeaders(dataDir));
      expect(found.json.map((r) => r.workflowId)).toEqual(['plainLog']);
    });
  });

  // ==========================================================================
  // 6. The close condition in miniature
  // ==========================================================================

  it('three hundred bad runs of 300KB each leave a file of a few hundred KB, not 90MB', () => {
    const history = openHistory(() => ({ maxValueBytes: 50 * 1024, maxRunBytes: 8 * 1024 * 1024 }));
    const bad = { rows: 'r'.repeat(300 * 1024) };
    for (let i = 0; i < 300; i++) {
      const logger = history.createLogger()!;
      logger.startExecution({ workflowId: 'bad', workflowName: 'bad', triggerType: 'manual' });
      logger.completeNode(logger.startNode({ nodeId: 'n', nodeType: 'x', inputData: bad }), true);
      logger.completeExecution(true);
    }
    expect(history.list({ limit: 1000 })).toHaveLength(300);
    expect(fileBytes()).toBeLessThan(3 * 1024 * 1024);
    expect(history.list({ capped: true, limit: 1000 })).toHaveLength(300);
  });

  // ==========================================================================
  // 7. The knobs
  // ==========================================================================

  it('both caps are ops.json fields with a floor, shipped on, and a run budget below the value cap is refused', () => {
    expect(defaultOpsConfig().executions.maxValueBytes).toBe(50 * 1024);
    expect(defaultOpsConfig().executions.maxRunBytes).toBe(8 * 1024 * 1024);
    expect(validateOpsConfig({ version: 1, executions: { maxValueBytes: MIN_RECORD_VALUE_BYTES } })).toEqual([]);
    expect(validateOpsConfig({ version: 1, executions: { maxValueBytes: 100 } })[0]).toMatch(/maxValueBytes must be an integer >= 4096/);
    expect(validateOpsConfig({ version: 1, executions: { maxRunBytes: 0 } })[0]).toMatch(/maxRunBytes/);
    expect(validateOpsConfig({ version: 1, executions: { maxValueBytes: 100_000, maxRunBytes: 50_000 } })[0]).toMatch(
      /maxRunBytes must be >= executions.maxValueBytes/
    );
    expect(validateOpsConfig({ version: 1, executions: { maxBytes: 5 } })).toContain('unknown key "maxBytes" in executions');
  });
});
