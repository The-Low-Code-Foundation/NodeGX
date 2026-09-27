/*
 * HLT-016 index half, `checks` — C2/C3 on a real BackendService, real socket, real curl, on
 * SQLite AND PostgreSQL. Run on the tree (drive-fixed.json) and on HEAD's copies of the changed
 * files (drive-head.json): the HEAD control is that the rule-breaking rows are simply written.
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
  let body: any = out.slice(0, i);
  try { body = JSON.parse(body); } catch { /* keep text */ }
  return { status: Number(out.slice(i + 1)), body };
}
const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];

async function driveOne(label: string, storageUrl: string | null): Promise<Record<string, unknown>> {
  if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
  else delete process.env.NODEGX_STORAGE_URL;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt016c-${label}-`));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 0, backendId: `hlt016c${label}`, backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const admin = (b: unknown) => curl(['-X', 'POST', ...H, '-d', JSON.stringify(b), `${base}/admin/schema`]);
  const create = (row: unknown) => curl(['-X', 'POST', ...H, '-d', JSON.stringify(row), `${base}/classes/Assignment`]);
  const cols = [{ name: 'learnerId', type: 'String' }, { name: 'cohortId', type: 'String' }, { name: 'target', type: 'Number' }];

  const push = await admin({ action: 'createTable', table: 'Assignment', columns: cols, checks: [{ exactlyOne: ['learnerId', 'cohortId'] }, { field: 'target', min: 1, max: 10 }] });
  const ok = await create({ learnerId: 'L', target: 5 });
  const both = await create({ learnerId: 'L', cohortId: 'C' });
  const neither = await create({ target: 3 });
  const tooHigh = await create({ learnerId: 'L', target: 11 });
  const edit = await curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ cohortId: 'C' }), `${base}/classes/Assignment/${ok.body.objectId}`]);
  const rows = (await curl([...H, `${base}/classes/Assignment?count=1&limit=0`])).body.count;
  const setChecks = await admin({ action: 'setChecks', table: 'Assignment', checks: [] });

  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  return {
    adapter: label,
    push: { status: push.status, checksCreated: push.body.checksCreated },
    satisfying: ok.status,
    breaking: {
      both: { status: both.status, code: both.body.code, error: both.body.error },
      neither: neither.status,
      tooHigh: { status: tooHigh.status, error: tooHigh.body.error },
      edit: { status: edit.status, error: edit.body.error }
    },
    rowsWritten: rows,
    setChecksAction: { status: setChecks.status, error: setChecks.body.error }
  };
}

test('hlt016 checks drive', async () => {
  const out: Record<string, unknown> = { sqlite: await driveOne('sqlite', null) };
  const ADMIN = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
  const db = `nodegx_hlt016c_${process.pid}_${Date.now().toString(36)}`;
  execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `CREATE DATABASE ${db}`]);
  try {
    out.postgres = await driveOne('postgres', `postgres:///${db}`);
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
    execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
  }
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(process.env.HLT016_OUT as string, JSON.stringify(out, null, 2));
}, 240000);
