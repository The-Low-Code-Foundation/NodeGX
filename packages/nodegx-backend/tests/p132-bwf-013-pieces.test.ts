/**
 * P132 BWF-013 (R6) — a reusable piece is a workflow others run, over a real BackendService.
 *
 *   The step — a `run-workflow` step runs the piece with `send` as its `body`, and hands on `{ result, run }`; two
 *         workflows run one piece with their own values (AC1's engine half).
 *   The record — the piece's run is its own, naming the run and step that started it; the step's `run` is its id.
 *   A failing piece — fails the step with the piece's name and reason, so the step's onError route runs.
 *   Refusals — a ring (a runs b runs a) and a workflow running itself are refused when saved, naming the workflows;
 *         a piece not written yet is a warning, and a step failure naming it if it runs; a run too many pieces deep is
 *         refused before it starts.
 *   Handed on — a test mark and "started by the app" reach the piece's run.
 *
 * Studio's list, *New*, *Make a reusable piece* and the editor are later slices (BWF-013's Build 2-4).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';
import { MAX_PIECE_DEPTH, ringThrough, ringWords } from '../src/workflow/pieces';
import { RunWorkflowStepExecutor } from '../src/workflow/steps/runWorkflow';
import type { PieceRunRequest } from '../src/workflow/steps/runWorkflow';
import { stepKindCatalog } from '../src/workflow/steps/kinds';
import type { StepExecContext } from '../src/workflow/StepExecutor';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

interface Rec {
  id: string;
  status: string;
  metadata?: Record<string, unknown>;
  steps: Array<{ nodeId: string; status: string; outputData?: Record<string, unknown>; error?: string }>;
}

function backend(label: string) {
  const ctx = { dataDir: '', base: '', service: null as BackendService | null };
  const client = httpClient(
    () => ctx.base,
    () => adminHeaders(ctx.dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => client.request<T>(method, p, { body });
  const run = async (id: string, payload: unknown = {}, extra: Record<string, unknown> = {}) =>
    (await req<WorkflowRunResponse>('POST', `/admin/workflow-defs/${id}/run`, { payload, ...extra })).json.run;
  const record = async (id: string) => (await req<Rec>('GET', `/executions/${id}`)).json;
  const start = async () => {
    ctx.dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-bwf013-${label}-`));
    ctx.service = new BackendService({ dataDir: ctx.dataDir, port: 0, backendId: `bwf013${label}`, backendName: 'BWF-013' });
    ctx.base = (await ctx.service.start()).listen.url;
  };
  const stop = async () => {
    if (ctx.service) await ctx.service.stop();
    fs.rmSync(ctx.dataDir, { recursive: true, force: true });
  };
  return { ctx, req, run, record, start, stop };
}

/** The piece: says how thirsty a plant is, from what it is sent. */
const piece = {
  id: 'how-thirsty',
  name: 'How thirsty',
  entry: 'say',
  steps: [
    {
      id: 'say',
      kind: 'return',
      params: { value: { plant: { $path: 'body.plant' }, days: { $path: 'body.days' }, words: { $fn: 'text', args: [{ $path: 'body.plant' }, ' is thirsty'] } } }
    }
  ]
};
/** A workflow that runs it, then answers with what it said. */
const runner = (id: string, send: Record<string, unknown>) => ({
  id,
  entry: 'ask',
  steps: [
    { id: 'ask', name: 'Ask the piece', kind: 'run-workflow', params: { workflow: 'how-thirsty', send }, next: ['give'] },
    { id: 'give', kind: 'return', params: { value: { $path: 'upstream.ask.result' } } }
  ]
});

describe('P132 BWF-013: a reusable piece, run by other workflows', () => {
  const b = backend('main');
  beforeAll(() => b.start());
  afterAll(() => b.stop());

  it('the catalog serves Run a workflow, with workflow and send, and says pieces run here', () => {
    const cat = stepKindCatalog();
    expect(cat.pieces).toBe(true);
    const spec = cat.kinds.find((k) => k.kind === 'run-workflow')!;
    expect(spec.displayName).toBe('Run a workflow');
    expect(spec.params.map((p) => p.name)).toEqual(['workflow', 'send']);
    expect(spec.invokesFunction).toBe(false);
  });

  it('two workflows run one piece, each with its own values, and each gets its answer (AC1, the engine)', async () => {
    expect((await b.req('POST', '/admin/workflow-defs', piece)).status).toBe(201);
    expect((await b.req('POST', '/admin/workflow-defs', runner('morning', { plant: { $path: 'body.name' }, days: 4 }))).status).toBe(201);
    expect((await b.req('POST', '/admin/workflow-defs', runner('evening', { plant: 'Basil', days: 1 }))).status).toBe(201);
    const one = await b.run('morning', { name: 'Fern' });
    const two = await b.run('evening');
    expect([one.status, two.status]).toEqual(['success', 'success']);
    expect(one.output).toEqual({ plant: 'Fern', days: 4, words: 'Fern is thirsty' });
    expect(two.output).toEqual({ plant: 'Basil', days: 1, words: 'Basil is thirsty' });
  });

  it("the piece's run is its own record, naming the run and step that started it; the step's run is its id", async () => {
    const parent = await b.run('morning', { name: 'Fern' });
    const rec = await b.record(parent.executionId);
    const ask = rec.steps.find((s) => s.nodeId === 'ask')!;
    expect(ask.status).toBe('success');
    const childId = ask.outputData!.run as string;
    expect(typeof childId).toBe('string');
    expect(childId).not.toBe(parent.executionId);
    const child = await b.record(childId);
    expect(child.status).toBe('success');
    expect(child.metadata).toMatchObject({ parentExecutionId: parent.executionId, parentWorkflowId: 'morning', parentStepId: 'ask', pieceDepth: 1 });
  });

  it("a failing piece fails the step with the piece's name and reason, and the step's onError runs", async () => {
    const failing = {
      id: 'always-fails',
      name: 'Always fails',
      entry: 'no',
      steps: [{ id: 'no', name: 'Say no', kind: 'stop', params: { isError: true, message: 'the plant is not in the list' } }]
    };
    expect((await b.req('POST', '/admin/workflow-defs', failing)).status).toBe(201);
    const made = await b.req('POST', '/admin/workflow-defs', {
      id: 'careful',
      entry: 'ask',
      steps: [
        { id: 'ask', kind: 'run-workflow', params: { workflow: 'always-fails' }, onError: ['sorry'] },
        { id: 'sorry', kind: 'return', params: { value: { $path: 'previous.error.message' } } }
      ]
    });
    expect(made.status).toBe(201);
    const r = await b.run('careful');
    expect(r.status).toBe('success');
    expect(String(r.output)).toMatch(/the piece "Always fails" failed at its step "Say no": the plant is not in the list/);
  });

  it('a ring is refused when saved, naming the workflows; so is a workflow running itself', async () => {
    expect((await b.req('POST', '/admin/workflow-defs', { id: 'ring-a', entry: 's', steps: [{ id: 's', kind: 'run-workflow', params: { workflow: 'ring-b' } }] })).status).toBe(201);
    const b2 = await b.req<{ error?: string }>('POST', '/admin/workflow-defs', { id: 'ring-b', entry: 's', steps: [{ id: 's', kind: 'run-workflow', params: { workflow: 'ring-a' } }] });
    expect(b2.status).toBe(400);
    expect(JSON.stringify(b2.json)).toMatch(/"ring-b\\" runs \\"ring-a\\", which runs \\"ring-b\\" again/);
    const self = await b.req('POST', '/admin/workflow-defs', { id: 'loop', entry: 's', steps: [{ id: 's', kind: 'run-workflow', params: { workflow: 'loop' } }] });
    expect(self.status).toBe(400);
    expect(JSON.stringify(self.json)).toMatch(/\\"loop\\" runs itself/);
    expect((await b.req('GET', '/admin/workflow-defs/ring-b')).status).toBe(404);
  });

  it('a piece not written yet is a warning when saved, and fails the step naming it if it runs', async () => {
    const made = await b.req<{ warnings: string[] }>('POST', '/admin/workflow-defs', { id: 'early', entry: 's', steps: [{ id: 's', kind: 'run-workflow', params: { workflow: 'not-yet' } }] });
    expect(made.status).toBe(201);
    expect(made.json.warnings.join(' ')).toMatch(/runs the workflow "not-yet", which this backend does not have yet/);
    const r = await b.run('early');
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toMatch(/no workflow "not-yet"/);
  });

  it("a person's test is marked on the piece's run too", async () => {
    const parent = await b.run('evening', {}, { test: true });
    const child = await b.record((await b.record(parent.executionId)).steps.find((s) => s.nodeId === 'ask')!.outputData!.run as string);
    expect(child.metadata).toMatchObject({ test: true });
  });
});

describe('P132 BWF-013: the ring words, and the guards in the step', () => {
  const s = (id: string, w: string) => ({ id, kind: 'run-workflow' as const, params: { workflow: w } });

  it('finds a ring through the workflow being saved, and says it in order', () => {
    expect(ringThrough({ id: 'a', steps: [s('x', 'b')] }, [{ id: 'b', steps: [s('y', 'c')] }, { id: 'c', steps: [s('z', 'a')] }])).toEqual(['a', 'b', 'c', 'a']);
    expect(ringWords(['a', 'b', 'c', 'a'])).toBe('"a" runs "b", which runs "c", which runs "a" again');
    expect(ringThrough({ id: 'a', steps: [s('x', 'b')] }, [{ id: 'b', steps: [] }])).toBeNull();
    // the saved version replaces its old self: removing the run that closed the ring opens it
    expect(ringThrough({ id: 'a', steps: [] }, [{ id: 'a', steps: [s('x', 'b')] }, { id: 'b', steps: [s('y', 'a')] }])).toBeNull();
  });

  const ctx = (over: Partial<StepExecContext> = {}): StepExecContext => ({
    workflow: { id: 'w', entry: 'ask', steps: [], version: 1 } as unknown as StepExecContext['workflow'],
    step: { id: 'ask', kind: 'run-workflow', params: {} },
    input: { workflow: 'p', send: { a: 1 } },
    scope: {},
    upstream: {},
    signal: new AbortController().signal,
    ...over
  });

  it(`refuses a run more than ${MAX_PIECE_DEPTH} pieces deep before it starts`, async () => {
    const asked: PieceRunRequest[] = [];
    const ex = new RunWorkflowStepExecutor(() => ({ run: async (r) => (asked.push(r), null), cancel: () => {} }));
    await expect(ex.execute(ctx({ run: { executionId: 'e', workflowId: 'w', depth: MAX_PIECE_DEPTH } }))).rejects.toThrow(/more than the 8 allowed/);
    expect(asked).toHaveLength(0);
  });

  it("hands the piece's run its depth, its parent, the test mark and \"started by the app\"", async () => {
    const asked: PieceRunRequest[] = [];
    const ex = new RunWorkflowStepExecutor(() => ({
      run: async (r) => (asked.push(r), { name: 'P', result: { executionId: 'c1', workflowId: 'p', status: 'success', unroutedError: false, timedOut: false, stepsRun: 1, stepsSkipped: 0, output: 7 } }),
      cancel: () => {}
    }));
    const out = await ex.execute(ctx({ startedByApp: true, run: { executionId: 'e1', workflowId: 'w', depth: 2, test: true } }));
    expect(out).toEqual({ result: 7, run: 'c1' });
    expect(asked[0]).toMatchObject({ workflow: 'p', body: { a: 1 }, parent: { executionId: 'e1', workflowId: 'w', stepId: 'ask', depth: 3 }, test: true, startedByApp: true });
  });

  it("a cancelled run cancels the piece's", async () => {
    const cancelled: string[] = [];
    const ac = new AbortController();
    const ex = new RunWorkflowStepExecutor(() => ({
      run: async (r) => {
        r.onStarted?.('c9');
        ac.abort();
        return { name: 'P', result: { executionId: 'c9', workflowId: 'p', status: 'cancelled', unroutedError: false, timedOut: false, stepsRun: 0, stepsSkipped: 0 } };
      },
      cancel: (id) => cancelled.push(id)
    }));
    await expect(ex.execute(ctx({ signal: ac.signal, run: { executionId: 'e', workflowId: 'w', depth: 0 } }))).rejects.toThrow(/the piece "P" stopped: it was cancelled/);
    expect(cancelled).toEqual(['c9']);
  });
});
