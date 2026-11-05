/**
 * P115 HST-013 (P115-HST004-NOCODEGEN) — a cloud function with a code node answers from the code printed at deploy.
 *
 * On a Cloudflare Worker `new Function` is refused, so a Function node never ran (the call waited out the 30 s timeout)
 * and an Expression answered a default. The deploy now prints every code node's text as a real function
 * (`noodl-runtime/src/printcode.ts`) and the host installs the table before any function loads
 * (`noodl-runtime/src/printedcode.ts` `installPrintedCode`); every compile site looks there first.
 *
 * Three arms, one after another (a process has ONE `_noodl_cloudservices`, so two services at once overwrite it):
 *  - **Node** (AC3): no table. The runtime compiles the strings as it always has. These are the answers.
 *  - **Printed** (AC2's twin in Node): the printed module, imported, installed with `refuseOthers`, so a text the
 *    printer missed THROWS instead of being compiled. Every function answers exactly as the Node arm did, which can
 *    only happen if every code node ran its printed function.
 *  - **Upload**: on a host with a table, a function upload (`PUT /admin/workflows/:name`, the MCP's
 *    `deploy_cloud_functions`) whose code was printed is accepted; one whose code changed is refused (400, by node and
 *    function), never left to wait out a visitor's call.
 *  - **Sabotage**: the same table with the Expression's row left out. The function with the Expression no longer
 *    answers its sum; the others still answer. The arm the printed arm's equality is measured against.
 *
 * The same functions on `wrangler dev` (workerd, where `new Function` really is refused) are HST-013 §5: under the
 * spike's remote config every arm runs on the Worker, so the sabotage arm (a jest-side table) does not apply there.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { installPrintedCode, type PrintedCodeRow } from '@noodl/runtime/src/printedcode';
import { collectCode, printCodeModule } from '@noodl/runtime/src/printcode';

import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

const port = (name: string, plug: 'input' | 'output', type: string) => ({
  name,
  displayName: name.slice(name.indexOf('-') + 1),
  plug,
  type,
  group: plug === 'input' ? 'Inputs' : 'Outputs'
});

/** Request(a) → Function `total = a * 2; done()` → Response(total). */
const doubleFn = {
  name: '/#__cloud__/double',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'a' }, ports: [], children: [] },
    {
      id: 'fn',
      type: 'JavaScriptFunction',
      x: 0,
      y: 100,
      parameters: { functionScript: 'Outputs.total = Number(Inputs.a) * 2;\nOutputs.done();', 'runOnChange-in-a': false },
      ports: [port('in-a', 'input', '*'), port('out-total', 'output', 'number'), port('out-done', 'output', 'signal')],
      children: []
    },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'total' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-a', targetId: 'fn', targetPort: 'in-a' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'fn', targetPort: 'run' },
    { sourceId: 'fn', sourcePort: 'out-total', targetId: 'res', targetPort: 'pm-total' },
    { sourceId: 'fn', sourcePort: 'out-done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

/** Request(a, b) → Expression `a + min(b, 10)` → Response(sum). */
const sumFn = {
  name: '/#__cloud__/sum',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'a,b' }, ports: [], children: [] },
    { id: 'ex', type: 'Expression', x: 0, y: 100, parameters: { expression: 'Number(a) + min(Number(b), 10)' }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'sum' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-a', targetId: 'ex', targetPort: 'a' },
    { sourceId: 'req', sourcePort: 'pm-b', targetId: 'ex', targetPort: 'b' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'ex', targetPort: 'run' },
    { sourceId: 'ex', sourcePort: 'result', targetId: 'res', targetPort: 'pm-sum' },
    { sourceId: 'ex', sourcePort: 'done', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

/** Request(note) → Logic Builder (its generated code) → Response(ok), sent on the program's success. */
const logicFn = {
  name: '/#__cloud__/logic',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'note' }, ports: [], children: [] },
    { id: 'lb', type: 'Logic Builder', x: 0, y: 100, parameters: { generatedCode: "if (typeof Inputs !== 'object') throw new Error('no inputs');\n" }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'ok' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'lb', targetPort: 'run' },
    { sourceId: 'req', sourcePort: 'pm-note', targetId: 'res', targetPort: 'pm-ok' },
    { sourceId: 'lb', sourcePort: 'success', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
};

const FUNCTIONS = { components: [doubleFn, sumFn, logicFn], settings: {}, metadata: {} };

/** The printed module's text, imported as a Worker imports it (this is Node, which may compile it). */
function importPrinted(text: string): PrintedCodeRow[] {
  return new Function(text.replace('export default [', 'return ['))() as PrintedCodeRow[];
}

type Answer = { status: number; body: unknown };

/** What each function answers in Node with no table: the runtime compiling the strings as it always has. */
const EXPECTED = {
  double: { status: 200, body: { result: { total: 42 } } },
  sum: { status: 200, body: { result: { sum: 14 } } },
  logic: { status: 200, body: { result: { ok: 'ran' } } }
};

/** Start a service over FUNCTIONS, ask each function once, stop. A function that never answers is `timeout`. */
async function askAll(tag: string): Promise<Record<string, Answer | 'timeout'>> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst013-${tag}-`));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(FUNCTIONS));
  const service = new BackendService({ dataDir, port: 0, backendId: `backend_hst013${tag}`, backendName: 'HST013', authToken: `admin-hst013-${tag}` });
  const base = (await service.start()).listen.url;
  const http = httpClient(() => base);
  const ask = async (fn: string, body: Record<string, unknown>): Promise<Answer | 'timeout'> => {
    const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 6000).unref());
    const call = http.request('POST', `/functions/${fn}`, { body }).then((r) => ({ status: r.status, body: r.json }));
    return Promise.race([call, timeout]);
  };
  try {
    return {
      double: await ask('double', { a: 21 }),
      sum: await ask('sum', { a: 4, b: 30 }),
      logic: await ask('logic', { note: 'ran' })
    };
  } finally {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

describe('P115 HST-013 — code nodes in a cloud function answer from the code printed at deploy', () => {
  afterEach(() => installPrintedCode(null));

  const { print, refusals } = collectCode(FUNCTIONS.components);

  test('the printer finds the three code nodes and refuses none', () => {
    expect(refusals).toEqual([]);
    expect(print.map((e) => `${e.sites[0].fn}/${e.sites[0].nodeId}`).sort()).toEqual(['double/fn', 'logic/lb', 'sum/ex']);
  });

  test('Node, no table (AC3): the runtime compiles the strings as it always has', async () => {
    expect(await askAll('node')).toEqual(EXPECTED);
  });

  test('printed, every other text refused: each function answers exactly as in Node', async () => {
    installPrintedCode(importPrinted(printCodeModule(print)), { refuseOthers: true });
    // Literal, not "equal to the Node arm": under the remote config both arms run on the Worker, where two broken
    // answers would be equal to each other (HST-013 §5, pass 1).
    expect(await askAll('printed')).toEqual(EXPECTED);
  });

  test('upload: the printed code is accepted again; a changed script is refused by node and function, not loaded', async () => {
    installPrintedCode(importPrinted(printCodeModule(print)), { refuseOthers: true });
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hst013-upload-'));
    const service = new BackendService({ dataDir, port: 0, backendId: 'backend_hst013upload', backendName: 'HST013', authToken: 'admin-hst013-upload' });
    const base = (await service.start()).listen.url;
    const http = httpClient(() => base);
    const put = (body: unknown) =>
      http.request<{ success?: boolean; error?: string }>('PUT', '/admin/workflows/main', { body, headers: { authorization: 'Bearer admin-hst013-upload' } });
    try {
      const same = await put(FUNCTIONS);
      expect(same.status).toBe(200);
      expect(same.json.success).toBe(true);

      const changedFn = JSON.parse(JSON.stringify(doubleFn));
      changedFn.nodes[1].parameters.functionScript = 'Outputs.total = Number(Inputs.a) * 3;\nOutputs.done();';
      const changed = await put({ ...FUNCTIONS, components: [changedFn, sumFn, logicFn] });
      expect(changed.status).toBe(400);
      expect(changed.json.success).toBe(false);
      expect(changed.json.error).toBe(
        'Not deployed: The Function node "fn" in the cloud function "double" has code that was not part of this app\'s last deploy, and code cannot be compiled here. Deploy the whole app again to change its code.'
      );
      // Not loaded: the function still answers from the code that was deployed.
      expect((await http.request('POST', '/functions/double', { body: { a: 21 } })).json).toEqual(EXPECTED.double.body);
    } finally {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("sabotage: the Expression's row left out, and only the Expression's function stops answering its sum", async () => {
    const rows = importPrinted(printCodeModule(print.filter((e) => e.sites[0].nodeId !== 'ex')));
    installPrintedCode(rows, { refuseOthers: true });
    const answers = await askAll('sabotage');
    expect(answers.double).toEqual(EXPECTED.double);
    expect(answers.logic).toEqual(EXPECTED.logic);
    expect(answers.sum).not.toEqual(EXPECTED.sum);
  });
});
