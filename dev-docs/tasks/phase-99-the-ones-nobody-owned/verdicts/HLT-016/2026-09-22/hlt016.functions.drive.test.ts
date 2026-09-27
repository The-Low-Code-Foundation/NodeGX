/*
 * HLT-016 AC5 drive: the two ways a GRAPH reaches "only if unchanged", in deployed cloud functions
 * on a real backend, through the real cloud runtime and ParseWireAdapter.
 *
 *  - `capture`: a JavaScript node calls Noodl.Records.fetch, waits, then Noodl.Records.save with
 *    { ifMatch }. Reports the error `code`, and whether the local record went back to what it read.
 *  - `bump`: Request → Record (Fetch) → wait → Update Record with Only If Unchanged = version.
 *
 * Each runs twice: a CONTROL with nothing competing, and a call where the test writes the row
 * during the function's wait. A function's writes run as the system, with NO ACL. That is the
 * path where a zero-row UPDATE used to answer 200.
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

const WAIT_MS = 1500;
const COMPETE_AT_MS = 400;

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

const capture = {
  name: '/#__cloud__/capture',
  nodes: [
    n('req', 'noodl.cloud.request', 0, { allowNoAuth: true, params: 'id,fact,waitMs' }),
    n('js', 'JavaScriptFunction', 100, {
      ...passive(['in-id', 'in-fact', 'in-waitMs']),
      functionScript: [
        "const rec = await Noodl.Records.fetch(Inputs.id, { className: 'Ctx' });",
        "const read = { version: rec.get('version'), facts: rec.get('facts') || {} };",
        'await new Promise(function (r) { setTimeout(r, Number(Inputs.waitMs) || 0); });',
        'const facts = Object.assign({}, read.facts); facts[Inputs.fact] = true;',
        'try {',
        "  await Noodl.Records.save(Inputs.id, { facts: facts, version: read.version + 1 }, { className: 'Ctx', ifMatch: { version: read.version } });",
        "  Outputs.outcome = 'saved';",
        '} catch (e) {',
        "  Outputs.outcome = 'refused';",
        '  Outputs.code = e.code || null;',
        '  Outputs.message = e.message;',
        '}',
        // What the local record holds now: the refused values, or what was read?
        "Outputs.localVersion = rec.get('version');",
        'Outputs.readVersion = read.version;'
      ].join('\n')
    }),
    n('res', 'noodl.cloud.response', 200, { params: 'outcome,code,message,localVersion,readVersion' }),
    n('resErr', 'noodl.cloud.response', 300, { params: 'outcome', 'pm-outcome': 'script-failed' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-id', targetId: 'js', targetPort: 'in-id' },
    { sourceId: 'req', sourcePort: 'pm-fact', targetId: 'js', targetPort: 'in-fact' },
    { sourceId: 'req', sourcePort: 'pm-waitMs', targetId: 'js', targetPort: 'in-waitMs' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'js', targetPort: 'run' },
    ...['outcome', 'code', 'message', 'localVersion', 'readVersion'].map((p) => ({
      sourceId: 'js', sourcePort: `out-${p}`, targetId: 'res', targetPort: `pm-${p}`
    })),
    { sourceId: 'js', sourcePort: 'success', targetId: 'res', targetPort: 'send' },
    { sourceId: 'js', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
};

const bump = {
  name: '/#__cloud__/bump',
  nodes: [
    n('req', 'noodl.cloud.request', 0, { allowNoAuth: true, params: 'id,newVersion,waitMs' }),
    n('rec', 'DbModel2', 100, { collectionName: 'Ctx' }),
    n('wait', 'JavaScriptFunction', 200, {
      ...passive(['in-waitMs']),
      functionScript: 'await new Promise(function (r) { setTimeout(r, Number(Inputs.waitMs) || 0); });'
    }),
    n('upd', 'SetDbModelProperties', 300, { collectionName: 'Ctx', onlyIfUnchanged: 'version' }),
    n('res', 'noodl.cloud.response', 400, { params: 'outcome', 'pm-outcome': 'done' }),
    n('resErr', 'noodl.cloud.response', 500, { params: 'outcome,error', 'pm-outcome': 'failure' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-id', targetId: 'rec', targetPort: 'modelId' },
    { sourceId: 'req', sourcePort: 'pm-id', targetId: 'upd', targetPort: 'modelId' },
    { sourceId: 'req', sourcePort: 'pm-newVersion', targetId: 'upd', targetPort: 'prop-version' },
    { sourceId: 'req', sourcePort: 'pm-waitMs', targetId: 'wait', targetPort: 'in-waitMs' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'rec', targetPort: 'fetch' },
    // 🔴 `done`, not `fetched`: `Fetched` also fires when the Id merely BINDS, before anything is
    // read (P77 D25). Wired to `fetched`, a 0 ms wait ran the update on an empty record, and the
    // node refused it ("has not been read with") rather than guessing a precondition.
    { sourceId: 'rec', sourcePort: 'done', targetId: 'wait', targetPort: 'run' },
    { sourceId: 'wait', sourcePort: 'success', targetId: 'upd', targetPort: 'store' },
    { sourceId: 'upd', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
    { sourceId: 'upd', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
    { sourceId: 'upd', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
    { sourceId: 'rec', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
};

/** The CONTROL for `bump`: the same graph with Only If Unchanged left empty, i.e. today's node. */
const bumpPlain = {
  ...bump,
  name: '/#__cloud__/bumpPlain',
  nodes: bump.nodes.map((node) =>
    node.id === 'upd' ? { ...node, parameters: { collectionName: 'Ctx' } } : node
  )
};

test('hlt016 functions drive', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt016-fn-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'hlt016.workflow.json'),
    JSON.stringify({ components: [capture, bump, bumpPlain], settings: {}, metadata: {} })
  );
  delete process.env.NODEGX_STORAGE_URL;
  const service = new BackendService({ dataDir, port: 0, backendId: 'hlt016fn', backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];
  const r: Record<string, unknown> = {};

  r.createTable = (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ action: 'createTable', table: 'Ctx', columns: [{ name: 'facts', type: 'Object' }, { name: 'version', type: 'Number' }] }), `${base}/admin/schema`])).status;
  const fresh = async () => (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ facts: {}, version: 0 }), `${base}/classes/Ctx`])).body.objectId as string;
  const row = async (id: string) => (await curl([...H, `${base}/classes/Ctx/${id}`])).body;
  const fn = (name: string, body: unknown) =>
    curl(['-X', 'POST', '-H', 'content-type: application/json', '-d', JSON.stringify(body), `${base}/functions/${name}`]);
  /** The competing writer: a person's own save landing while the function waits. */
  const compete = async (id: string) => {
    await new Promise((res) => setTimeout(res, COMPETE_AT_MS));
    return curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ facts: { fromPerson: true }, version: 5 }), `${base}/classes/Ctx/${id}`]);
  };

  // ── capture: Noodl.Records.save with { ifMatch } ─────────────────────────────────────────
  {
    const id = await fresh();
    const call = await fn('capture', { id, fact: 'fromFunction', waitMs: 0 });
    r.captureControl = { status: call.status, result: call.body.result, row: await row(id) };
  }
  {
    const id = await fresh();
    const [call, person] = await Promise.all([fn('capture', { id, fact: 'fromFunction', waitMs: WAIT_MS }), compete(id)]);
    r.captureRaced = { status: call.status, result: call.body.result, personStatus: person.status, row: await row(id) };
  }

  // ── bump: Update Record with Only If Unchanged = version ───────────────────────────────────
  {
    const id = await fresh();
    const call = await fn('bump', { id, newVersion: 1, waitMs: 0 });
    r.bumpControl = { status: call.status, result: call.body.result, row: await row(id) };
  }
  {
    const id = await fresh();
    const [call, person] = await Promise.all([fn('bump', { id, newVersion: 1, waitMs: WAIT_MS }), compete(id)]);
    r.bumpRaced = { status: call.status, result: call.body.result, personStatus: person.status, row: await row(id) };
  }

  {
    // Same race, no precondition: the person's version 5 is silently replaced by the stale 1.
    const id = await fresh();
    const [call, person] = await Promise.all([fn('bumpPlain', { id, newVersion: 1, waitMs: WAIT_MS }), compete(id)]);
    r.bumpPlainRaced = { status: call.status, result: call.body.result, personStatus: person.status, row: await row(id) };
  }

  console.log(JSON.stringify(r, null, 2));
  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.writeFileSync(process.env.HLT016_OUT as string, JSON.stringify(r, null, 2));
}, 180000);
