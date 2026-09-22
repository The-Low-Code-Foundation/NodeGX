/* HLT-018 AC1/AC2 drive: a real BackendService on a real socket, real curl. */
import { execFile } from 'child_process';
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

test('hlt018 drive', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt018-drive-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 0, backendId: 'hlt018drive', backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];
  const r: Record<string, unknown> = {};

  const made = await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ action: 'createTable', table: 'Learner', columns: [{ name: 'name', type: 'String' }, { name: 'facts', type: 'Object' }] }), `${base}/admin/schema`]);
  r.createTable = made.status;

  // Known-firing signal beside the reading: a keyed object must save on BOTH builds.
  const keyed = await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ name: 'known', facts: { a: 1 } }), `${base}/classes/Learner`]);
  r.keyedCreate = keyed.status;
  const keyedId = keyed.body?.objectId;
  r.keyedReadBack = keyedId ? (await curl([...H, `${base}/classes/Learner/${keyedId}`])).body?.facts : null;

  const empty = await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ name: 'new learner', facts: {} }), `${base}/classes/Learner`]);
  r.emptyCreate = { status: empty.status, error: empty.status >= 400 ? empty.body : undefined };
  r.emptyReadBack = empty.body?.objectId ? (await curl([...H, `${base}/classes/Learner/${empty.body.objectId}`])).body?.facts : null;

  const emptied = keyedId ? await curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ facts: {} }), `${base}/classes/Learner/${keyedId}`]) : null;
  r.emptyUpdate = emptied?.status ?? null;
  r.emptyUpdateBody = emptied?.body ?? null;
  r.emptiedReadBack = keyedId ? (await curl([...H, `${base}/classes/Learner/${keyedId}`])).body?.facts : null;

  const countBefore = (await service.facade.rawQuery('Learner', { limit: 1000 })).results.length;
  const content = JSON.stringify([{ name: 'imp-keyed', facts: { b: 2 } }, { name: 'imp-empty', facts: {} }]);
  const imp = await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ format: 'json', content, dryRun: false }), `${base}/admin/import/Learner`]);
  const countAfter = (await service.facade.rawQuery('Learner', { limit: 1000 })).results.length;
  r.import = { status: imp.status, body: imp.body, rowsAdded: countAfter - countBefore };

  console.log(JSON.stringify(r, null, 2));
  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.writeFileSync(process.env.HLT018_OUT as string, JSON.stringify(r, null, 2));
}, 120000);
