/**
 * P99 HLT-023 — one classroom empties the bucket.
 *
 * Every query a deployed function makes loops back to this server with the admin
 * credential, and the limiter keys buckets by principal — so every run of every
 * function, and the operator's own admin-token requests, shared ONE `data:admin`
 * bucket. On the default limits two learners on a 26-request page got 17 loads,
 * then 500s for everybody (the drive in verdicts/HLT-023/2026-09-23).
 *
 * Now a run's loopback requests carry the run's id and are charged to the RUN:
 * no client bucket, a per-run ceiling as the runaway guard.
 *
 * The `data` class is squeezed to burst 5 here, so a function making 20 queries
 * would be refused on its first call if its queries still spent that bucket —
 * the same failure as the classroom, in a spec that runs in seconds. 🔴 Every
 * absence has a known-firing arm beside it: the operator's OWN reads are still
 * refused at the 6th, so a pass is not a limiter that stopped counting.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { FunctionRuns } from '../src/workflow/FunctionRuns';

jest.setTimeout(60000);

const n = (id: string, type: string, y: number, parameters: Record<string, unknown> = {}) => ({
  id,
  type,
  x: 0,
  y,
  parameters,
  ports: [],
  children: []
});

/** A signed-in-only function making `queries` record queries; it answers with its own words on a refusal. */
const fnMaking = (name: string, queries: number) => ({
  name: `/#__cloud__/${name}`,
  nodes: [
    n('req', 'noodl.cloud.request', 0, { params: 'x' }),
    n('js', 'JavaScriptFunction', 100, {
      'runOnChange-in-x': false,
      functionScript: [
        'let rows = 0;',
        `try { for (let i = 0; i < ${queries}; i++) { rows += (await Noodl.Records.query('Item', {})).length; } }`,
        'catch (e) { Outputs.error = e.message; }',
        'Outputs.rows = rows;'
      ].join('\n')
    }),
    n('res', 'noodl.cloud.response', 200, { params: 'rows,error' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'js', targetPort: 'run' },
    { sourceId: 'js', sourcePort: 'out-rows', targetId: 'res', targetPort: 'pm-rows' },
    { sourceId: 'js', sourcePort: 'out-error', targetId: 'res', targetPort: 'pm-error' },
    { sourceId: 'js', sourcePort: 'success', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
});

let service: BackendService;
let base: string;
let dataDir: string;
const ADMIN = { authorization: 'Bearer adm', 'content-type': 'application/json' };
const learners: string[] = [];

async function call(fn: string, token: string): Promise<{ status: number; body: any }> {
  const r = await fetch(`${base}/functions/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-parse-session-token': token },
    body: '{}'
  });
  return { status: r.status, body: await r.json() };
}

const operatorRead = (extra: Record<string, string> = {}) =>
  fetch(`${base}/classes/Item`, { headers: { ...ADMIN, ...extra } }).then((r) => r.status);

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt023-'));
  fs.writeFileSync(
    path.join(dataDir, 'ops.json'),
    JSON.stringify({
      version: 1,
      rateLimit: { policies: { data: { ratePerMinute: 1, burst: 5 } }, functionRunQueries: 30 }
    })
  );
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'hlt023.workflow.json'),
    JSON.stringify({ components: [fnMaking('page', 20), fnMaking('runaway', 100)], settings: {}, metadata: {} })
  );
  delete process.env.NODEGX_STORAGE_URL;
  service = new BackendService({ dataDir, port: 0, backendId: 'hlt023', backendName: 'HLT-023', authToken: 'adm' });
  base = (await service.start()).listen.url;

  await fetch(`${base}/admin/schema`, {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ action: 'createTable', table: 'Item', columns: [{ name: 'title', type: 'String' }] })
  });
  for (const u of ['ada', 'bo']) {
    const r = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: u, password: 'pw-long-enough-1', email: `${u}@example.com` })
    });
    learners.push(((await r.json()) as { sessionToken: string }).sessionToken);
  }
  // Setup spent `admin` class tokens, never `data` ones; the operator's data bucket is full.
});

afterAll(async () => {
  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('HLT-023 — a function run is charged to the run, not to data:admin', () => {
  test('six pages of 21 requests each, alternating learners, on a data burst of 5: every one answered', async () => {
    for (let i = 0; i < 6; i++) {
      const r = await call('page', learners[i % 2]);
      expect({ i, status: r.status, error: r.body.result && r.body.result.error }).toEqual({ i, status: 200, error: undefined });
    }
  });

  test("the operator's admin reads were never spent by those runs — and their own 6th is still refused (the limiter is live)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push(await operatorRead());
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  test('a made-up run id beside the admin credential is charged as usual', async () => {
    expect(await operatorRead({ 'x-nodegx-run': 'f'.repeat(32) })).toBe(429);
  });

  test('a function past the per-run ceiling is refused by name, in its own words, and the next call succeeds', async () => {
    const r = await call('runaway', learners[0]);
    expect(r.status).toBe(200);
    expect(r.body.result.error).toBe(
      'Function "runaway" made more than 30 backend requests in one run (rateLimit.functionRunQueries), ' +
        "so this one was refused. Nobody else's requests are affected."
    );
    expect((await call('page', learners[1])).status).toBe(200);
    expect((await call('page', learners[0])).status).toBe(200);
  });

  test('a run is forgotten when it settles', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).runner.functionRuns.size).toBe(0);
  });
});

describe('FunctionRuns', () => {
  test('the id follows the run through awaits and timers, and is gone once it settles', async () => {
    const runs = new FunctionRuns();
    const inside: (string | undefined)[] = [];
    let id: string | undefined;
    await runs.within('f', async () => {
      id = runs.currentRunId();
      await new Promise((r) => setTimeout(r, 5));
      inside.push(runs.currentRunId());
      await new Promise<void>((r) => setImmediate(() => { inside.push(runs.currentRunId()); r(); }));
      expect(runs.get(id)).toMatchObject({ functionName: 'f', requests: 0 });
    });
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(inside).toEqual([id, id]);
    expect(runs.currentRunId()).toBeUndefined();
    expect(runs.get(id)).toBeUndefined();
  });

  test('two concurrent runs keep their own ids', async () => {
    const runs = new FunctionRuns();
    const seen = await Promise.all(
      ['a', 'b'].map((name) =>
        runs.within(name, async () => {
          const before = runs.currentRunId();
          await new Promise((r) => setTimeout(r, name === 'a' ? 10 : 1));
          return { name, same: before === runs.currentRunId(), fn: runs.get(runs.currentRunId())!.functionName };
        })
      )
    );
    expect(seen).toEqual([
      { name: 'a', same: true, fn: 'a' },
      { name: 'b', same: true, fn: 'b' }
    ]);
  });

  test('a run that throws is still forgotten', async () => {
    const runs = new FunctionRuns();
    await expect(runs.within('f', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(runs.size).toBe(0);
  });
});
