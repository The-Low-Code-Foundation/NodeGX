/**
 * P121-TWO003-CLOUDPOINTSTO — a `pointsTo` filter works in a cloud function's script, as it does on a page.
 *
 * `pointsTo` is the filter the docs and Query Records offer for a link. In a function it was refused ("Filtering
 * "country" by the record it points to needs the collection schema…"): the translator reads the schema from the
 * runtime's `dbCollections` metadata, and a deployed bundle carries `metadata: {}`. The backend running the function
 * holds that schema, so it hands it to the runtime.
 *
 * Known-firing beside the absence: the same query spelled as `equalTo` a Pointer answered the right rows before the
 * fix too, so a pass is not a query that stopped filtering. And a column added after the bundle loaded is read too.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

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

/** A function that runs `script` (given `Inputs.id`) and answers `names` or `error`. */
const fnRunning = (name: string, script: string) => ({
  name: `/#__cloud__/${name}`,
  nodes: [
    n('req', 'noodl.cloud.request', 0, { allowNoAuth: true, params: 'id' }),
    n('js', 'JavaScriptFunction', 100, {
      'runOnChange-in-id': false,
      functionScript: ['try {', script, '} catch (e) { Outputs.error = (e && e.message) || String(e); }'].join('\n')
    }),
    n('res', 'noodl.cloud.response', 200, { params: 'names,error' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-id', targetId: 'js', targetPort: 'in-id' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'js', targetPort: 'run' },
    { sourceId: 'js', sourcePort: 'out-names', targetId: 'res', targetPort: 'pm-names' },
    { sourceId: 'js', sourcePort: 'out-error', targetId: 'res', targetPort: 'pm-error' },
    { sourceId: 'js', sourcePort: 'success', targetId: 'res', targetPort: 'send' }
  ],
  roots: []
});

const names = (filter: string, collection = 'Seller') =>
  `const rows = await Noodl.Records.query('${collection}', ${filter});\nOutputs.names = rows.map((r) => r.name).sort().join(',');`;

let service: BackendService;
let base: string;
let dataDir: string;
const ADMIN = { authorization: 'Bearer adm', 'content-type': 'application/json' };
const ids: Record<string, string> = {};

async function call(fn: string, id: string): Promise<{ names?: string; error?: string }> {
  const r = await fetch(`${base}/functions/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id })
  });
  expect(r.status).toBe(200);
  return ((await r.json()) as { result: { names?: string; error?: string } }).result;
}

async function schema(body: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${base}/admin/schema`, { method: 'POST', headers: ADMIN, body: JSON.stringify(body) });
  expect(r.status).toBeLessThan(300);
}

async function create(collection: string, row: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${base}/classes/${collection}`, { method: 'POST', headers: ADMIN, body: JSON.stringify(row) });
  expect(r.status).toBeLessThan(300);
  return ((await r.json()) as { objectId: string }).objectId;
}

const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p121-cloudpointsto-'));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'shop.workflow.json'),
    JSON.stringify({
      components: [
        fnRunning('pointsTo', names('{ country: { pointsTo: Inputs.id } }')),
        fnRunning('equalTo', names("{ country: { equalTo: { __type: 'Pointer', className: 'Country', objectId: Inputs.id } } }")),
        fnRunning('later', names('{ maker: { pointsTo: Inputs.id } }', 'Product'))
      ],
      settings: {},
      metadata: {}
    })
  );
  delete process.env.NODEGX_STORAGE_URL;
  service = new BackendService({ dataDir, port: 0, backendId: 'p121cpt', backendName: 'P121 points to', authToken: 'adm' });
  base = (await service.start()).listen.url;

  await schema({ action: 'createTable', table: 'Country', columns: [{ name: 'name', type: 'String' }] });
  await schema({
    action: 'createTable',
    table: 'Seller',
    columns: [
      { name: 'name', type: 'String' },
      { name: 'country', type: 'Pointer', targetClass: 'Country' }
    ]
  });
  ids.fr = await create('Country', { name: 'France' });
  ids.ie = await create('Country', { name: 'Ireland' });
  await create('Seller', { name: 'Amélie', country: ptr('Country', ids.fr) });
  await create('Seller', { name: 'Bastien', country: ptr('Country', ids.fr) });
  await create('Seller', { name: 'Ciarán', country: ptr('Country', ids.ie) });
});

afterAll(async () => {
  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('P121-TWO003-CLOUDPOINTSTO — pointsTo in a cloud function', () => {
  test('known-firing: the equalTo-a-Pointer spelling answers the sellers of one country', async () => {
    expect(await call('equalTo', ids.fr)).toEqual({ names: 'Amélie,Bastien' });
  });

  test('🔴 pointsTo answers the same rows, not a refusal', async () => {
    expect(await call('pointsTo', ids.fr)).toEqual({ names: 'Amélie,Bastien' });
    expect(await call('pointsTo', ids.ie)).toEqual({ names: 'Ciarán' });
  });

  test('a collection and a link made after the functions loaded are read too', async () => {
    await schema({ action: 'createTable', table: 'Maker', columns: [{ name: 'name', type: 'String' }] });
    await schema({ action: 'createTable', table: 'Product', columns: [{ name: 'name', type: 'String' }] });
    await schema({ action: 'addColumn', table: 'Product', column: { name: 'maker', type: 'Pointer', targetClass: 'Maker' } });
    const maker = await create('Maker', { name: 'Atelier' });
    await create('Product', { name: 'Bowl', maker: ptr('Maker', maker) });
    await create('Product', { name: 'Cup' });
    expect(await call('later', maker)).toEqual({ names: 'Bowl' });
  });
});
