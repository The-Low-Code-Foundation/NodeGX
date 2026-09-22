/*
 * HLT-016 AC1–AC3 drive: a real BackendService on a real socket, real curl, on SQLite AND
 * PostgreSQL. The race is reproduced first (the control), then run again with X-NodeGX-If.
 *
 * The race is DBT's L62, as small as it gets: a context holds `facts` and `version`; two captures
 * each read version n, merge their own fact into the map they read, and write n+1. Both reads
 * land before either write, forced by awaiting both GETs before sending both PUTs, so the
 * interleaving is the losing one every run, not by luck.
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

// ── the statement log: every UPDATE text that reached either engine ──────────────────────────
const statements: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sqlite = require('node:sqlite');
const origPrepare = sqlite.DatabaseSync.prototype.prepare;
sqlite.DatabaseSync.prototype.prepare = function (sql: string) {
  if (/^\s*UPDATE /i.test(sql)) statements.push(`sqlite: ${sql}`);
  return origPrepare.call(this, sql);
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pg = require(require.resolve('pg', { paths: [path.join(PKG, '..', 'noodl-runtime')] }));
const origQuery = pg.Client.prototype.query;
pg.Client.prototype.query = function (...args: any[]) {
  const text = typeof args[0] === 'string' ? args[0] : args[0] && args[0].text;
  if (typeof text === 'string' && /^\s*UPDATE /i.test(text)) statements.push(`postgres: ${text}`);
  return origQuery.apply(this, args);
};

async function curl(args: string[]): Promise<{ status: number; body: any }> {
  const out = (await run('curl', ['-s', '-w', '\n%{http_code}', ...args], { encoding: 'utf-8' })).stdout;
  const i = out.lastIndexOf('\n');
  const text = out.slice(0, i);
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: Number(out.slice(i + 1)), body };
}

const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];

async function driveOne(label: string, storageUrl: string | null): Promise<Record<string, unknown>> {
  if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
  else delete process.env.NODEGX_STORAGE_URL;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt016-${label}-`));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 0, backendId: `hlt016${label}`, backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const r: Record<string, unknown> = { adapter: label };
  const url = (id: string) => `${base}/classes/Ctx/${id}`;
  const get = async (id: string) => (await curl([...H, url(id)])).body;
  const statementsBefore = statements.length;

  r.createTable = (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ action: 'createTable', table: 'Ctx', columns: [{ name: 'facts', type: 'Object' }, { name: 'version', type: 'Number' }] }), `${base}/admin/schema`])).status;
  const fresh = async () => (await curl(['-X', 'POST', ...H, '-d', JSON.stringify({ facts: {}, version: 0 }), `${base}/classes/Ctx`])).body.objectId as string;

  /** One capture: merge `fact` into the map it read, write version+1, optionally only-if-unchanged. */
  const capture = (id: string, read: any, fact: string, guarded: boolean) =>
    curl([
      '-X', 'PUT', ...H,
      ...(guarded ? ['-H', `x-nodegx-if: ${JSON.stringify({ version: read.version })}`] : []),
      '-d', JSON.stringify({ facts: { ...read.facts, [fact]: true }, version: read.version + 1 }),
      url(id)
    ]);

  // ── AC1: the race, reproduced first — no precondition ──────────────────────────────────────
  {
    const id = await fresh();
    const [a, b] = await Promise.all([get(id), get(id)]);
    const [wa, wb] = await Promise.all([capture(id, a, 'fromA', false), capture(id, b, 'fromB', false)]);
    const after = await get(id);
    r.control = {
      bothRead: [a.version, b.version],
      statuses: [wa.status, wb.status],
      finalFacts: after.facts,
      finalVersion: after.version,
      aFactKept: !!after.facts?.fromA,
      bFactKept: !!after.facts?.fromB
    };
  }

  // ── AC2: the same race with X-NodeGX-If ────────────────────────────────────────────────────
  {
    const id = await fresh();
    const [a, b] = await Promise.all([get(id), get(id)]);
    const [wa, wb] = await Promise.all([capture(id, a, 'fromA', true), capture(id, b, 'fromB', true)]);
    const mid = await get(id);
    const loser = wa.status === 409 ? 'A' : wb.status === 409 ? 'B' : null;
    // The loser does what the docs say: RE-READ, then retry with the version it now sees.
    let retry: { status: number; body: any } | null = null;
    if (loser) {
      const reread = await get(id);
      retry = await capture(id, reread, loser === 'A' ? 'fromA' : 'fromB', true);
    }
    const after = await get(id);
    r.guarded = {
      statuses: [wa.status, wb.status],
      loserBody: loser === 'A' ? wa.body : loser === 'B' ? wb.body : null,
      afterRaceFacts: mid.facts,
      afterRaceVersion: mid.version,
      retryStatus: retry && retry.status,
      finalFacts: after.facts,
      finalVersion: after.version,
      noFactLost: !!after.facts?.fromA && !!after.facts?.fromB
    };
  }

  // ── the refusals around it ────────────────────────────────────────────────────────────────
  {
    const id = await fresh();
    const put = (hdr: string, body: unknown, target = url(id)) =>
      curl(['-X', 'PUT', ...H, '-H', `x-nodegx-if: ${hdr}`, '-d', JSON.stringify(body), target]);
    const missing = await put('{"version":0}', { version: 1 }, url('doesNotExist1'));
    const unknownField = await put('{"verison":0}', { version: 1 });
    const objectValue = await put('{"facts":{"a":1}}', { version: 1 });
    const notJson = await put('version=0', { version: 1 });
    const withIncrement = await put('{"version":0}', { version: { __op: 'Increment', amount: 1 } });
    const nullExpected = await put('{"missingOne":null}', { version: 5 });
    const untouched = await get(id);
    r.refusals = {
      missingRow: { status: missing.status, body: missing.body },
      unknownField: { status: unknownField.status, body: unknownField.body },
      objectValue: { status: objectValue.status, body: objectValue.body },
      notJson: { status: notJson.status },
      withIncrement: { status: withIncrement.status },
      // `null` on a field that is not a column is still an unknown field, never "IS NULL = true".
      nullOnUnknownField: { status: nullExpected.status },
      rowUntouchedByAllOfThem: untouched.version === 0
    };
  }

  // ── a plain PUT with no header is unchanged ────────────────────────────────────────────────
  {
    const id = await fresh();
    const plain = await curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ version: 7 }), url(id)]);
    r.plainPut = { status: plain.status, version: (await get(id)).version };
  }

  // ── AC3: the clause is IN the UPDATE the engine received ───────────────────────────────────
  r.guardedUpdateStatements = statements
    .slice(statementsBefore)
    .filter((s) => /"version" = \?|"version" = \$\d/.test(s.split(' WHERE ')[1] || ''))
    .slice(0, 2);

  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  return r;
}

test('hlt016 drive', async () => {
  const out: Record<string, unknown> = {};
  out.sqlite = await driveOne('sqlite', null);

  const ADMIN = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
  const db = `nodegx_hlt016_${process.pid}_${Date.now().toString(36)}`;
  execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `CREATE DATABASE ${db}`]);
  try {
    out.postgres = await driveOne('postgres', `postgres:///${db}`);
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
    // The pool may still hold a connection for a moment after stop().
    execFileSync('psql', ['-qtAX', '-d', ADMIN, '-c', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
  }

  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(process.env.HLT016_OUT as string, JSON.stringify(out, null, 2));
}, 240000);
