/*
 * HLT-016 index half, `where` — W2–W6 on a real BackendService, real socket, real curl, on
 * SQLite AND PostgreSQL, including a RESTART (a second service on the same database), because
 * PostgreSQL's `parseIndexDef` could not read a partial index back and that only shows on restart.
 *
 * The shape is DBT's `lessons_one_pinned_per_learner_concept`: one pinned lesson per (learner,
 * concept), any number unpinned. The control is the same declaration WITHOUT `where`.
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

const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];
const COLUMNS = [
  { name: 'learner', type: 'String' },
  { name: 'concept', type: 'String' },
  { name: 'pinned', type: 'Boolean' },
  { name: 'guid', type: 'String' },
  { name: 'live', type: 'Boolean' }
];
const ONE_PINNED = { fields: ['learner', 'concept'], unique: true, where: { pinned: true } };

async function start(label: string, dataDir: string) {
  const service = new BackendService({ dataDir, port: 0, backendId: `hlt016w${label}`, backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const admin = async (body: unknown) => curl(['-X', 'POST', ...H, '-d', JSON.stringify(body), `${base}/admin/schema`]);
  const create = async (c: string, row: unknown, extra: string[] = []) =>
    curl(['-X', 'POST', ...H, ...extra, '-d', JSON.stringify(row), `${base}/classes/${c}`]);
  const count = async (c: string) =>
    (await curl([...H, `${base}/classes/${c}?count=1&limit=0`])).body.count as number;
  return { service, base, admin, create, count };
}

async function driveOne(label: string, storageUrl: string | null): Promise<Record<string, unknown>> {
  if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
  else delete process.env.NODEGX_STORAGE_URL;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt016w-${label}-`));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const r: Record<string, unknown> = { adapter: label };

  let s = await start(label, dataDir);

  // ── W2: the guarantee ──────────────────────────────────────────────────────────────────────
  const push = await s.admin({ action: 'createTable', table: 'Lesson', columns: COLUMNS, indexes: [ONE_PINNED] });
  const u1 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: false });
  const u2 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: false });
  const p1 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: true });
  const p2 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: true });
  r.W2 = {
    push: { status: push.status, created: push.body.indexesCreated },
    unpinned: [u1.status, u2.status],
    pinned: [p1.status, p2.status],
    secondPinnedBody: p2.body,
    rows: await s.count('Lesson')
  };

  // ── W2 control: the same declaration without `where` ───────────────────────────────────────
  await s.admin({ action: 'createTable', table: 'LessonFull', columns: COLUMNS, indexes: [{ fields: ['learner', 'concept'], unique: true }] });
  const f1 = await s.create('LessonFull', { learner: 'L', concept: 'C', pinned: false });
  const f2 = await s.create('LessonFull', { learner: 'L', concept: 'C', pinned: false });
  r.W2control = { unpinned: [f1.status, f2.status], rows: await s.count('LessonFull') };

  // ── W4: a partial and a full index on the same fields ──────────────────────────────────────
  const both = await s.admin({ action: 'setIndexes', table: 'LessonFull', indexes: [{ fields: ['learner', 'concept'], unique: true }, ONE_PINNED] });
  const onlyPartial = await s.admin({ action: 'setIndexes', table: 'LessonFull', indexes: [ONE_PINNED] });
  r.W4 = {
    both: { status: both.status, created: both.body.indexesCreated, kept: both.body.indexesKept },
    onlyPartial: { status: onlyPartial.status, dropped: onlyPartial.body.indexesDropped, kept: onlyPartial.body.indexesKept }
  };

  // ── W6: a partial unique index is not upsert cover ─────────────────────────────────────────
  await s.admin({ action: 'createTable', table: 'Feed', columns: COLUMNS, indexes: [{ fields: ['guid'], unique: true, where: { live: true } }] });
  const up = await s.create('Feed', { guid: 'g1', live: true }, ['-H', 'x-nodegx-upsert: guid']);
  await s.admin({ action: 'setIndexes', table: 'Feed', indexes: [{ fields: ['guid'], unique: true, where: { live: true } }, { fields: ['guid'], unique: true }] });
  const upFull = await s.create('Feed', { guid: 'g1', live: true }, ['-H', 'x-nodegx-upsert: guid']);
  r.W6 = { partialOnly: { status: up.status, error: up.body.error }, withFullToo: upFull.status };

  // ── W5: a push the data already violates ───────────────────────────────────────────────────
  await s.admin({ action: 'createTable', table: 'Dup', columns: COLUMNS });
  for (const pinned of [false, false, true, true]) await s.create('Dup', { learner: 'L', concept: 'C', pinned });
  const refused = await s.admin({ action: 'setIndexes', table: 'Dup', indexes: [ONE_PINNED] });
  // On PostgreSQL the refusal surfaces on the next data-plane call (the schema queue, BRG-005).
  const nextCall = await s.create('Dup', { learner: 'X', concept: 'Y', pinned: false });
  const afterRefusal = (await curl([...H, `${s.base}/admin/schema/Dup`])).body;
  r.W5 = {
    push: { status: refused.status, error: refused.body.error, duplicates: refused.body.duplicates },
    nextDataCall: { status: nextCall.status, error: nextCall.body.error },
    rowsKept: await s.count('Dup'),
    indexesAfter: afterRefusal.indexes
  };

  // ── W3: restart, read it back, re-push keeps it ────────────────────────────────────────────
  await s.service.stop();
  s = await start(label, dataDir);
  const status = await curl([...H, `${s.base}/admin/schema/Lesson`]);
  const repush = await s.admin({ action: 'setIndexes', table: 'Lesson', indexes: [ONE_PINNED] });
  const p3 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: true });
  const u3 = await s.create('Lesson', { learner: 'L', concept: 'C', pinned: false });
  r.W3 = {
    indexesAfterRestart: status.body.indexes,
    repush: { status: repush.status, created: repush.body.indexesCreated, dropped: repush.body.indexesDropped, kept: repush.body.indexesKept },
    stillEnforced: { pinned: p3.status, unpinned: u3.status }
  };

  await s.service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  return r;
}

test('hlt016 where drive', async () => {
  const out: Record<string, unknown> = {};
  out.sqlite = await driveOne('sqlite', null);

  const ADMIN = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
  const db = `nodegx_hlt016w_${process.pid}_${Date.now().toString(36)}`;
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
