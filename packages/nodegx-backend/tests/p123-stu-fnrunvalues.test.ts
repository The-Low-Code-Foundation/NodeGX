/**
 * P123-STU-FNRUNVALUES — a cloud function's run records what went INTO and came OUT OF each node
 * that acted, so Studio can show it after the run is over.
 *
 * ## The defect, measured
 *
 * A function's step carried `outputData: { outcome, detail? }` and nothing else: the node's port
 * values lived in the live trace only, and a run from last night has no live trace. A workflow's
 * step has always carried `inputData` / `outputData`, which is what Studio's Backend tab renders.
 *
 * ## The shape this pins (additive — the old keys are where they were)
 *
 * ```
 * step.inputData  = { <input port>: <value>, … }                    // a workflow step's shape
 * step.outputData = { outcome, detail?, outputs: { <output port>: <value>, … } }
 * ```
 *
 * ## What it must never record
 *
 *  - a port, or a key inside one, NAMED like a credential (`pm-password`) — the service's one key rule;
 *  - a function secret's VALUE wherever it turns up (`pm-key`, wired from a `Secret`);
 *  - a `Secret` node's own output, even one too short for value scrubbing (`SHORT_SECRET`).
 *
 * And a value over `executions.maxValueBytes` is cut to a marker on its OWN port, leaving the
 * step's other ports whole.
 *
 * Red without the fix: `recordValues: true` removed from `WorkflowRunner.createRunContext` (the
 * runtime then hands the sink no port values) fails every arm below but the control.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { recordablePortValues } from '../src/workflow/stepValues';
import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(40000);

const LONG_SECRET = 'sk_live_fnrunvalues_7d2e9b41';
/** Shorter than `MIN_SCRUBBABLE_LENGTH` (8): value scrubbing cannot see it, only the node-type rule can. */
const SHORT_SECRET = 'Zq7#x';
const PASSWORD = 'hunter2-fnrunvalues';
const DEFAULT_MAX_VALUE_BYTES = 50 * 1024;

const req = (params: string) => ({
  id: 'req',
  type: 'noodl.cloud.request',
  x: 0,
  y: 0,
  parameters: { allowNoAuth: true, params },
  ports: [],
  children: []
});

/**
 * Request(name, blob, password) → Log(value = name) → Secret(STRIPE_KEY) → Response.
 * `Log` passes `Value` through, so it is the smallest node with an input that becomes an output.
 */
const valuesFunction = {
  name: '/#__cloud__/fnValues',
  nodes: [
    req('name,blob,password'),
    {
      id: 'log',
      type: 'net.noodl.Log',
      x: 0,
      y: 100,
      parameters: { level: 'info', message: 'passing' },
      ports: [],
      children: []
    },
    {
      id: 'sec',
      type: 'noodl.cloud.secret',
      x: 0,
      y: 200,
      parameters: { name: 'STRIPE_KEY' },
      ports: [],
      children: []
    },
    {
      id: 'res',
      type: 'noodl.cloud.response',
      x: 0,
      y: 300,
      parameters: { params: 'greeting,blob,password,key' },
      ports: [],
      children: []
    }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'log', targetPort: 'log' },
    { sourceId: 'req', sourcePort: 'pm-name', targetId: 'log', targetPort: 'value' },
    { sourceId: 'log', sourcePort: 'done', targetId: 'sec', targetPort: 'fetch' },
    { sourceId: 'log', sourcePort: 'value', targetId: 'res', targetPort: 'pm-greeting' },
    { sourceId: 'req', sourcePort: 'pm-blob', targetId: 'res', targetPort: 'pm-blob' },
    { sourceId: 'req', sourcePort: 'pm-password', targetId: 'res', targetPort: 'pm-password' },
    { sourceId: 'sec', sourcePort: 'value', targetId: 'res', targetPort: 'pm-key' },
    { sourceId: 'sec', sourcePort: 'done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

/** Request → Secret(SHORT_KEY) → Response, the secret's value wired nowhere. The node-type arm. */
const shortSecretFunction = {
  name: '/#__cloud__/fnShortSecret',
  nodes: [
    req('seed'),
    { id: 'sec', type: 'noodl.cloud.secret', x: 0, y: 100, parameters: { name: 'SHORT_KEY' }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'ok' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'sec', targetPort: 'fetch' },
    { sourceId: 'sec', sourcePort: 'done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

interface Step {
  nodeId: string;
  nodeType: string;
  status: string;
  inputData?: Record<string, unknown>;
  outputData?: { outcome?: string; detail?: unknown; outputs?: Record<string, unknown> };
}
interface Run {
  id: string;
  kind?: string;
  metadata?: { recordCapped?: { valuesTruncated: number } };
  steps: Step[];
}

describe('P123-STU-FNRUNVALUES — a function run records each acting node’s input and output values', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const client = httpClient(() => base);

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fnrunvalues-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'fnrunvalues.workflow.json'),
      JSON.stringify({ components: [valuesFunction, shortSecretFunction], settings: {}, metadata: {} })
    );
    fs.writeFileSync(
      path.join(dataDir, 'secrets.json'),
      JSON.stringify({ functions: { STRIPE_KEY: LONG_SECRET, SHORT_KEY: SHORT_SECRET } }),
      { mode: 0o600 }
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'fnrunvalues', backendName: 'FNRUNVALUES' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  /** The last run of `workflowId`, over the route Studio reads. */
  async function lastRun(workflowId: string): Promise<Run> {
    const list = await client.get<Array<{ id: string }>>(`/executions?workflowId=${workflowId}`, adminHeaders(dataDir));
    expect(list.status).toBe(200);
    const one = await client.get<Run>(`/executions/${list.json[0].id}`, adminHeaders(dataDir));
    expect(one.status).toBe(200);
    return one.json;
  }

  const blob = 'b'.repeat(DEFAULT_MAX_VALUE_BYTES + 10_000);
  let run: Run;
  const step = (nodeId: string): Step => {
    const found = run.steps.find((s) => s.nodeId === nodeId);
    expect(found).toBeDefined();
    return found!;
  };

  beforeAll(async () => {
    const res = await client.request('POST', '/functions/fnValues', {
      body: { name: 'Ada', blob, password: PASSWORD }
    });
    expect(res.status).toBe(200);
    run = await lastRun('fnValues');
  });

  it('control: the run is a function run whose three actions are recorded, outcome where it always was', () => {
    expect(run.kind).toBe('function');
    expect(run.steps.map((s) => `${s.nodeId}:${s.status}`)).toEqual(['log:success', 'sec:success', 'res:success']);
    expect(step('log').outputData?.outcome).toBe('done');
  });

  it('🔴 records what went INTO a node — its input port values, keyed by port', () => {
    expect(step('log').inputData).toMatchObject({ value: 'Ada', level: 'info', message: 'passing' });
    expect(step('res').inputData).toMatchObject({ 'pm-greeting': 'Ada' });
    // A Secret's input is the secret's NAME, which the graph carries in plain text anyway.
    expect(step('sec').inputData).toMatchObject({ name: 'STRIPE_KEY' });
    // A signal input is a pulse, not a value: `log`, `fetch` and `send` were recorded as `true`
    // until the snapshot read the port's DECLARED type (the instance entry does not carry it).
    expect(Object.keys(step('log').inputData || {})).not.toContain('log');
    expect(Object.keys(step('sec').inputData || {})).not.toContain('fetch');
    expect(Object.keys(step('res').inputData || {})).not.toContain('send');
  });

  it('🔴 records what came OUT of a node — its output port values, under outputData.outputs', () => {
    expect(step('log').outputData?.outputs).toEqual({ value: 'Ada' });
  });

  it('🔴 cuts a value over the cap on its own port, and the step’s other ports stay whole', () => {
    const cut = step('res').inputData?.['pm-blob'] as Record<string, unknown>;
    expect(cut).toMatchObject({ __truncated: true, __maxSize: DEFAULT_MAX_VALUE_BYTES });
    expect(cut.__originalSize).toBeGreaterThan(DEFAULT_MAX_VALUE_BYTES);
    expect(String(cut.__preview)).toContain('b'.repeat(500)); // the preview is real
    expect(JSON.stringify(step('res').inputData)).not.toContain(blob); // the cut is real
    expect(step('res').inputData?.['pm-greeting']).toBe('Ada');
    // …and the run says it was cut, as a workflow's record does.
    expect(run.metadata?.recordCapped?.valuesTruncated).toBeGreaterThanOrEqual(1);
  });

  it('🔴 never records a secret: by port name, by value, and a Secret node’s own output', () => {
    const res = step('res').inputData || {};
    expect(res['pm-password']).toBe('[REDACTED]'); // named like a credential
    expect(res['pm-key']).toBe('[REDACTED]'); // a function secret's value, under an innocent name
    expect(step('sec').outputData?.outputs).toEqual({ value: '[REDACTED]' });

    const record = JSON.stringify(run);
    expect(record).not.toContain(LONG_SECRET);
    expect(record).not.toContain(PASSWORD);
    expect(fs.readFileSync(path.join(dataDir, 'executions.sqlite')).toString('binary')).not.toContain(LONG_SECRET);
  });

  it('the name rule spares a token COUNT, and the node’s own context keeps a secret’s NAME (fed-003 AC3)', () => {
    const recorded = recordablePortValues(
      {
        maxTokens: 512,
        sessionToken: 'tok_abc',
        usage: { inputTokens: 3, outputTokens: 7 },
        apiKeySecret: 'MODEL_KEY'
      },
      { maxValueBytes: DEFAULT_MAX_VALUE_BYTES },
      { apiKeySecret: 'MODEL_KEY' }
    );
    expect(recorded).toEqual({
      maxTokens: 512,
      sessionToken: '[REDACTED]',
      usage: { inputTokens: 3, outputTokens: 7 },
      apiKeySecret: 'MODEL_KEY'
    });
    // A token-named STRING is never spared, however it is spelled.
    expect(recordablePortValues({ refreshTokens: 'r1,r2' }, { maxValueBytes: DEFAULT_MAX_VALUE_BYTES })).toEqual({
      refreshTokens: '[REDACTED]'
    });
  });

  it('🔴 redacts a Secret node’s output too short for value scrubbing — by node type', async () => {
    const res = await client.request('POST', '/functions/fnShortSecret', { body: { seed: 1 } });
    expect(res.status).toBe(200);
    const shortRun = await lastRun('fnShortSecret');
    const sec = shortRun.steps.find((s) => s.nodeId === 'sec');
    // The control: the read succeeded, so there WAS a value on the port to leak.
    expect(sec?.status).toBe('success');
    expect(sec?.outputData?.outputs).toEqual({ value: '[REDACTED]' });
    expect(JSON.stringify(shortRun)).not.toContain(SHORT_SECRET);
  });
});
