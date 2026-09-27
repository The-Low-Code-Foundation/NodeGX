/*
 * HLT-023 drive: two signed-in learners call a deployed `course` function that makes 25 record
 * queries (the DBT page's shape; the runtime's own `users/me` caller lookup is the 26th), on a
 * real backend with the DEFAULT rate limits, through the real cloud runtime.
 *
 * The instrument: `RateLimiter.prototype.check` is wrapped, so every token spent is tallied by
 * `class:key`. That is what says who a function's queries were charged to, not the status codes.
 *
 * Arms:
 *  - control: 30 alternating calls, then one operator admin-token read (§2 of the task).
 *  - load: 100 alternating calls with an operator admin read after every 10th (AC2, AC5).
 *  - own budget: `functions` burst 5 — one learner past it is refused naming the class, the
 *    other in the same instant is not (AC3).
 *  - runaway: a function that loops past the per-run query ceiling is refused by name, and the
 *    next call from anybody succeeds (AC4).
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const run = promisify(execFile);
const PKG = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BackendService } = require(path.join(PKG, 'src/service'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RateLimiter } = require(path.join(PKG, 'src/ops/rate-limit'));

const spent: Record<string, number> = {};
const refused: Record<string, number> = {};
const realCheck = RateLimiter.prototype.check;
RateLimiter.prototype.check = function (routeClass: string, key: string, now?: number) {
  const d = realCheck.call(this, routeClass, key, now);
  const k = `${routeClass}:${key.startsWith('user:') ? 'user' : key}`;
  (d.allowed ? spent : refused)[k] = ((d.allowed ? spent : refused)[k] || 0) + 1;
  return d;
};
const tally = () => {
  const out = { spent: { ...spent }, refused: { ...refused } };
  for (const k of Object.keys(spent)) delete spent[k];
  for (const k of Object.keys(refused)) delete refused[k];
  return out;
};

async function curl(args: string[]): Promise<{ status: number; body: any }> {
  const out = (await run('curl', ['-s', '-w', '\n%{http_code}', ...args], { encoding: 'utf-8' })).stdout;
  const i = out.lastIndexOf('\n');
  const text = out.slice(0, i);
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: Number(out.slice(i + 1)), body };
}

const n = (id: string, type: string, y: number, parameters: Record<string, unknown> = {}) =>
  ({ id, type, x: 0, y, parameters, ports: [], children: [] });
const passive = (names: string[]) => Object.fromEntries(names.map((x) => [`runOnChange-${x}`, false]));

/** `name`, signed-in callers only, making `queries` record queries and answering how many. */
const fnMaking = (name: string, queries: number) => ({
  name: `/#__cloud__/${name}`,
  nodes: [
    n('req', 'noodl.cloud.request', 0, { params: 'x' }),
    n('js', 'JavaScriptFunction', 100, {
      ...passive(['in-x']),
      functionScript: [
        'let rows = 0;',
        // The function answers in its own words when a query is refused: that is how a
        // caller reads the ceiling's refusal (AC4), and why a refusal is never a bare 500.
        `try { for (let i = 0; i < ${queries}; i++) { rows += (await Noodl.Records.query('Item', {})).length; } }`,
        'catch (e) { Outputs.error = e.message; }',
        'Outputs.rows = rows;'
      ].join('\n')
    }),
    n('res', 'noodl.cloud.response', 200, { params: 'rows,error' }),
    n('resErr', 'noodl.cloud.response', 300, { params: 'outcome', 'pm-outcome': 'script-failed' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'js', targetPort: 'run' },
    { sourceId: 'js', sourcePort: 'out-rows', targetId: 'res', targetPort: 'pm-rows' },
    { sourceId: 'js', sourcePort: 'out-error', targetId: 'res', targetPort: 'pm-error' },
    { sourceId: 'js', sourcePort: 'success', targetId: 'res', targetPort: 'send' },
    { sourceId: 'js', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
});

const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];

async function backend(label: string, ops: Record<string, unknown>) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt023-${label}-`));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, ...ops }));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'hlt023.workflow.json'),
    JSON.stringify({ components: [fnMaking('course', 25), fnMaking('ping', 0), fnMaking('runaway', 5000)], settings: {}, metadata: {} })
  );
  delete process.env.NODEGX_STORAGE_URL;
  const service = new BackendService({ dataDir, port: 0, backendId: `hlt023${label}`, backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const setup: Record<string, unknown> = {};
  setup.createTable = (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ action: 'createTable', table: 'Item', columns: [{ name: 'title', type: 'String' }] }), `${base}/admin/schema`])).status;
  for (let i = 0; i < 3; i++) await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ title: `item ${i}` }), `${base}/classes/Item`]);
  const signup = async (u: string) => {
    const r = await curl(['-X', 'POST', '-H', 'content-type: application/json', '-H', `x-parse-application-id: hlt023${label}`, '-d', JSON.stringify({ username: u, password: 'pw-long-enough-1', email: `${u}@example.com` }), `${base}/users`]);
    setup[`signup:${u}`] = r.status;
    return r.body.sessionToken as string;
  };
  const learners = [await signup('ada'), await signup('bo')];
  const call = (fn: string, token: string) =>
    curl(['-X', 'POST', '-H', 'content-type: application/json', '-H', `x-parse-session-token: ${token}`, '-d', '{}', `${base}/functions/${fn}`]);
  const operator = () => curl([...H, `${base}/classes/Item`]);
  tally();
  return { service, base, setup, learners, call, operator, dataDir };
}

const statuses = (xs: { status: number }[]) => {
  const runs: string[] = [];
  for (const x of xs) {
    const last = runs[runs.length - 1];
    const m = last && last.match(/^(\d+) ×(\d+)$/);
    if (m && Number(m[1]) === x.status) runs[runs.length - 1] = `${x.status} ×${Number(m[2]) + 1}`;
    else runs.push(`${x.status} ×1`);
  }
  return runs.join(', ');
};

test('hlt023 functions drive', async () => {
  const out: Record<string, unknown> = {};

  // ── control: §2, default limits ──────────────────────────────────────────────────────────
  {
    const b = await backend('control', {});
    const calls = [];
    for (let i = 0; i < 30; i++) calls.push(await b.call('course', b.learners[i % 2]));
    const op = await b.operator();
    out.control = {
      setup: b.setup,
      calls: statuses(calls),
      firstNon200: calls.find((c) => c.status !== 200)?.body,
      operatorAfter: op.status,
      operatorBody: op.status === 200 ? undefined : op.body,
      tally: tally()
    };
    await b.service.stop();
    fs.rmSync(b.dataDir, { recursive: true, force: true });
  }

  // ── load: AC2 and AC5, default limits ────────────────────────────────────────────────────
  {
    const b = await backend('load', {});
    const calls = [];
    const ops = [];
    for (let i = 0; i < 100; i++) {
      calls.push(await b.call('course', b.learners[i % 2]));
      if (i % 10 === 9) ops.push(await b.operator());
    }
    out.load = {
      calls: statuses(calls),
      rowsAnswered: calls.filter((c) => c.body && c.body.result && c.body.result.rows === 75).length,
      firstNon200: calls.find((c) => c.status !== 200)?.body,
      operator: statuses(ops),
      any500: calls.some((c) => c.status >= 500),
      tally: tally()
    };
    await b.service.stop();
    fs.rmSync(b.dataDir, { recursive: true, force: true });
  }

  // ── own budget: AC3 — `functions` burst 5 ────────────────────────────────────────────────
  {
    const b = await backend('budget', { rateLimit: { policies: { functions: { ratePerMinute: 5, burst: 5 } } } });
    const ada = [];
    for (let i = 0; i < 6; i++) ada.push(await b.call('ping', b.learners[0]));
    const boSameInstant = await b.call('ping', b.learners[1]);
    out.budget = {
      ada: statuses(ada),
      adaSixth: ada[5].body,
      boSameInstant: boSameInstant.status,
      tally: tally()
    };
    await b.service.stop();
    fs.rmSync(b.dataDir, { recursive: true, force: true });
  }

  // ── runaway: AC4 — past the per-run ceiling ──────────────────────────────────────────────
  {
    const b = await backend('runaway', {});
    const t0 = Date.now();
    const loop = await b.call('runaway', b.learners[0]);
    const ms = Date.now() - t0;
    const nextAda = await b.call('course', b.learners[0]);
    const nextBo = await b.call('course', b.learners[1]);
    const op = await b.operator();
    out.runaway = {
      status: loop.status,
      body: loop.body,
      ms,
      nextAda: nextAda.status,
      nextBo: nextBo.status,
      operator: op.status,
      tally: tally()
    };
    await b.service.stop();
    fs.rmSync(b.dataDir, { recursive: true, force: true });
  }

  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(process.env.HLT023_OUT as string, JSON.stringify(out, null, 2));
}, 600000);
