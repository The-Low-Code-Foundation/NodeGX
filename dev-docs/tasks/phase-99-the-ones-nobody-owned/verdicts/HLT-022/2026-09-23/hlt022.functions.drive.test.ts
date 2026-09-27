/*
 * HLT-022 drive: what a deployed cloud function reads back from Noodl.Records, on a real backend,
 * through the real cloud runtime and ParseWireAdapter, on SQLite AND PostgreSQL.
 *
 * One row is saved over REST, then read inside a function three ways:
 *  - `model`: Records.query / Records.fetch with no option — today's Model shape (the control).
 *  - `plain`: the same reads with { plain: true }.
 * The function hands back JSON, and the test compares it with what was saved.
 */
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const run = promisify(execFile);
const PKG = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BackendService } = require(path.join(PKG, 'src/service'));

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

const read = {
  name: '/#__cloud__/read',
  nodes: [
    n('req', 'noodl.cloud.request', 0, { allowNoAuth: true, params: 'id,plain' }),
    n('js', 'JavaScriptFunction', 100, {
      ...passive(['in-id', 'in-plain']),
      functionScript: [
        "const plain = Inputs.plain === true || Inputs.plain === 'true';",
        'const opts = plain ? { plain: true } : undefined;',
        "const rows = await Noodl.Records.query('Lesson', {}, opts);",
        "const one = await Noodl.Records.fetch(Inputs.id, Object.assign({ className: 'Lesson' }, opts || {}));",
        // A Model is reported as what a function would hand on: its toJSON, plus getId().
        "const shape = function (r) { return r && typeof r.getId === 'function' ? { isModel: true, getId: r.getId(), json: JSON.parse(JSON.stringify(r)) } : { isModel: false, json: r }; };",
        'Outputs.query = JSON.stringify(rows.map(shape));',
        'Outputs.fetch = JSON.stringify(shape(one));'
      ].join('\n')
    }),
    n('res', 'noodl.cloud.response', 200, { params: 'query,fetch' }),
    n('resErr', 'noodl.cloud.response', 300, { params: 'outcome', 'pm-outcome': 'script-failed' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-id', targetId: 'js', targetPort: 'in-id' },
    { sourceId: 'req', sourcePort: 'pm-plain', targetId: 'js', targetPort: 'in-plain' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'js', targetPort: 'run' },
    { sourceId: 'js', sourcePort: 'out-query', targetId: 'res', targetPort: 'pm-query' },
    { sourceId: 'js', sourcePort: 'out-fetch', targetId: 'res', targetPort: 'pm-fetch' },
    { sourceId: 'js', sourcePort: 'success', targetId: 'res', targetPort: 'send' },
    { sourceId: 'js', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
};

const DUE = '2026-09-23T09:00:00.000Z';
/** What the author saved. `note` is a String column holding bracketed text. */
const SAVED = {
  title: 'Lesson one',
  sections: [{ id: 's1', text: 'Intro' }, { id: 's2', text: 'Body', tags: ['a'] }],
  facts: { likes: 'tea', level: 3, nested: { id: 'keep-me' } },
  note: '[1,2]',
  due: { __type: 'Date', iso: DUE }
};

async function driveOne(label: string, storageUrl: string | null): Promise<Record<string, unknown>> {
  if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
  else delete process.env.NODEGX_STORAGE_URL;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt022-${label}-`));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'hlt022.workflow.json'),
    JSON.stringify({ components: [read], settings: {}, metadata: {} })
  );
  const service = new BackendService({ dataDir, port: 0, backendId: `hlt022${label}`, backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];
  const r: Record<string, unknown> = { adapter: label };
  try {
    r.createTable = (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({
      action: 'createTable', table: 'Lesson',
      columns: [
        { name: 'title', type: 'String' }, { name: 'sections', type: 'Array' }, { name: 'facts', type: 'Object' },
        { name: 'note', type: 'String' }, { name: 'due', type: 'Date' }
      ]
    }), `${base}/admin/schema`])).status;
    const created = await curl(['-X', 'POST', ...H, '-d', JSON.stringify(SAVED), `${base}/classes/Lesson`]);
    r.create = created.status;
    const id = created.body.objectId as string;
    r.id = id;
    r.rest = (await curl([...H, `${base}/classes/Lesson/${id}`])).body;
    const fn = async (plain: boolean) => {
      const call = await curl(['-X', 'POST', '-H', 'content-type: application/json', '-d', JSON.stringify({ id, plain }), `${base}/functions/read`]);
      const res = call.body && call.body.result;
      return {
        status: call.status,
        query: res && res.query ? JSON.parse(res.query) : res,
        fetch: res && res.fetch ? JSON.parse(res.fetch) : res
      };
    };
    r.model = await fn(false);
    r.plain = await fn(true);
  } finally {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  return r;
}

test('hlt022 functions drive', async () => {
  const out: Record<string, unknown> = { saved: SAVED };
  out.sqlite = await driveOne('sqlite', null);

  const ADMIN = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
  const db = `nodegx_hlt022_${process.pid}_${Date.now().toString(36)}`;
  execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `CREATE DATABASE ${db}`]);
  try {
    out.postgres = await driveOne('postgres', `postgres:///${db}`);
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
    execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
  }

  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(process.env.HLT022_OUT as string, JSON.stringify(out, null, 2));
}, 240000);
