// P127 BKO-006 the grader's half for one brief: `node grade.mjs <labRoot> <brief> [--mcp <noodl-mcp.cjs>]`.
//
// After round.mjs has run (and torn down what the stranger left running), this starts the stranger's own backend again
// from its data dir in the lab and grades two of BKO-006's four:
//
//   open   every table (and its columns), rule, cloud function, workflow and trigger the backend has is in the project's
//          files: metadata.dbCollections, nodegx.security.json, components/__cloud__, nodegx.automations.json
//   works  two people sign up; a visitor is refused every table that is not public; in a table whose rows their maker
//          owns, a row one person makes is not seen by the other; each trigger, fired by hand, ends ok; render_report
//          (the published server, as the stranger had it) is clean
//
// "Drawn" is Studio's `editor/brief-check.mjs` (this writes its --expect), "travels" is the VM ship. Writes
// <labRoot>/out/<brief>/grade.json and prints one line per check. Run with the Bash sandbox off (render_report's Chrome).
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const [labRoot, name] = process.argv.slice(2);
const mcpAt = process.argv.includes('--mcp') ? process.argv[process.argv.indexOf('--mcp') + 1] : null;
const LAB = path.join(labRoot, 'lab', name);
const OUT = path.join(labRoot, 'out', name);
const app = fs.readdirSync(LAB, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(LAB, e.name, 'nodegx.project.json'))).map((e) => path.join(LAB, e.name));
if (app.length !== 1) throw new Error(`expected one app in ${LAB}, found ${app.length}`);
const APP = app[0];
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const pj = readJson(path.join(APP, 'nodegx.project.json'));
const bound = pj.metadata?.cloudservices;
const dataDir = path.join(LAB, '.home', '.noodl', 'backends', bound.instanceId);
const adminToken = readJson(path.join(dataDir, 'secrets.json')).adminToken;
const port = readJson(path.join(dataDir, 'config.json')).port;

const results = [];
const ok = (cond, grade, what, detail) => { results.push({ grade, ok: !!cond, what, detail }); console.log(`  ${cond ? 'ok  ' : 'FAIL'} [${grade}] ${what}${!cond && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const portFree = (p) => new Promise((r) => { const s = net.createServer(); s.once('error', () => r(false)); s.listen(p, '127.0.0.1', () => s.close(() => r(true))); });

// the backend, as the stranger left it: its data dir, its port (the app points there), its admin credential
if (!(await portFree(port))) throw new Error(`port ${port} is taken: is the stranger's backend still running?`);
const cli = mcpAt ? path.join(path.dirname(mcpAt), 'backend', 'cli.js') : null;
if (!cli || !fs.existsSync(cli)) throw new Error('--mcp <the published package>/dist/noodl-mcp.cjs: the backend runs from the same package');
const be = spawn(process.execPath, [cli, 'serve', '--data-dir', dataDir, '--port', String(port), '--host', '127.0.0.1', '--token', adminToken, '--backend-id', bound.instanceId],
  { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HOME: path.join(LAB, '.home') } });
let beLog = ''; be.stdout.on('data', (d) => (beLog += d)); be.stderr.on('data', (d) => (beLog += d));
const base = bound.endpoint;
for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await wait(200); }

const call = async (method, p, body, headers = {}) => {
  const r = await fetch(base + p, { method, headers: { 'X-Parse-Application-Id': bound.appId, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const admin = (m, p, body) => call(m, p, body, { 'X-Parse-Master-Key': adminToken });
const as = (session) => (m, p, body) => call(m, p, body, session ? { 'X-Parse-Session-Token': session } : {});

const record = { app: path.basename(APP), backend: {}, files: {} };
try {
  // ---- open
  const schema = (await admin('GET', '/admin/schema')).body;
  const beTables = (schema.tables ?? schema.results ?? schema).filter?.((t) => !(t.name ?? t.className).startsWith('_')) ?? [];
  const tableName = (t) => t.name ?? t.className;
  const colsOf = (t) => (t.columns ?? Object.entries(t.fields ?? {}).map(([n, f]) => ({ name: n, type: f.type }))).map((c) => c.name).filter((c) => !['objectId', 'createdAt', 'updatedAt', 'ACL'].includes(c));
  const security = readJson(path.join(APP, 'nodegx.security.json'));
  const autos = readJson(path.join(APP, 'nodegx.automations.json')) ?? { triggers: [], workflows: [] };
  const declared = pj.metadata?.dbCollections ?? [];
  const cloudDir = path.join(APP, 'components', '__cloud__');
  const fnFiles = [];
  // a function's name on the backend is its path under __cloud__ ("Cloud Functions/Weekly Digest")
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) { const p = path.join(d, e.name); if (fs.existsSync(path.join(p, 'component.json'))) fnFiles.push(path.relative(cloudDir, p).split(path.sep).join('/')); walk(p); } };
  if (fs.existsSync(cloudDir)) walk(cloudDir);
  const beFns = ((await admin('GET', '/admin/permissions/functions')).body.functions ?? []).map((f) => f.name);
  const beTriggers = (await admin('GET', '/admin/triggers')).body.triggers ?? [];
  const beWorkflows = (await admin('GET', '/admin/workflow-defs')).body;
  const beWfIds = (beWorkflows.workflows ?? beWorkflows.defs ?? beWorkflows ?? []).map?.((w) => w.id) ?? [];
  const bePerm = (await admin('GET', '/admin/permissions')).body;
  Object.assign(record.backend, { tables: beTables.map((t) => ({ name: tableName(t), columns: colsOf(t) })), functions: beFns, triggers: beTriggers.map((t) => t.id), workflows: beWfIds, ruled: Object.keys(bePerm.config?.collections ?? bePerm.collections ?? {}) });
  Object.assign(record.files, { dbCollections: declared.map((c) => ({ name: c.name, columns: (c.columns ?? []).map((x) => x.name) })), ruled: Object.keys(security?.collections ?? {}), functions: fnFiles, triggers: (autos.triggers ?? []).map((t) => t.id), workflows: (autos.workflows ?? []).map((w) => w.id) });

  for (const t of beTables) {
    const d = declared.find((c) => c.name === tableName(t));
    ok(d, 'open', `the table ${tableName(t)} is in the project's files (metadata.dbCollections)`, { declared: declared.map((c) => c.name) });
    if (d) { const missing = colsOf(t).filter((c) => !(d.columns ?? []).some((x) => x.name === c)); ok(!missing.length, 'open', `${tableName(t)}'s columns are in the files`, missing); }
  }
  for (const c of record.backend.ruled.filter((n) => !n.startsWith('_'))) ok(record.files.ruled.includes(c), 'open', `the rule for ${c} is in nodegx.security.json`, record.files.ruled);
  ok(security?.devOpen === (bePerm.config?.devOpen ?? bePerm.devOpen), 'open', 'nodegx.security.json and the backend agree on dev-open', { file: security?.devOpen, backend: bePerm.config?.devOpen ?? bePerm.devOpen });
  for (const f of beFns) ok(fnFiles.includes(f), 'open', `the cloud function ${f} is in components/__cloud__`, fnFiles);
  for (const t of beTriggers) ok(record.files.triggers.includes(t.id), 'open', `the trigger ${t.name ?? t.id} is in nodegx.automations.json`, record.files.triggers);
  for (const id of beWfIds) ok(record.files.workflows.includes(id), 'open', `the workflow ${id} is in nodegx.automations.json`, record.files.workflows);

  // ---- works
  const people = [];
  const run = Date.now().toString(36); // a grade may run again on the same backend
  for (const who of ['ada', 'bo']) {
    const u = await call('POST', '/users', { username: `${who}-${run}@example.com`, email: `${who}-${run}@example.com`, password: 'grade-Pass-1234' });
    people.push(u.body?.sessionToken);
    ok(u.status < 300 && u.body?.sessionToken, 'works', `${who} signs up and has a session`, u);
  }
  const [A, B] = people.map(as);
  const visitor = as(null);
  const rules = security ?? { defaults: {}, collections: {} };
  const effective = (n) => ({ ...(rules.defaults ?? {}), ...(rules.collections?.[n] ?? {}), permissions: { ...(rules.defaults?.permissions ?? {}), ...(rules.collections?.[n]?.permissions ?? {}) } });
  for (const t of beTables) {
    const n = tableName(t), e = effective(n);
    if (e.permissions.find !== 'public') {
      const r = await visitor('GET', `/classes/${n}`);
      ok(r.status >= 400 || (r.body?.results ?? []).length === 0 && r.status === 403, 'works', `a visitor (no sign-in) is refused ${n}`, r);
    }
    if (e.creatorOwns && e.permissions.create !== 'nobody') {
      const made = await A('POST', `/classes/${n}`, {});
      if (made.status >= 300) { ok(false, 'works', `Ada can add a row to ${n} (her own)`, made); continue; }
      const mine = await A('GET', `/classes/${n}`);
      const theirs = await B('GET', `/classes/${n}`);
      ok((mine.body?.results ?? []).some((x) => x.objectId === made.body.objectId), 'works', `Ada sees her own row in ${n}`, mine);
      ok(theirs.status < 300 && !(theirs.body?.results ?? []).some((x) => x.objectId === made.body.objectId), 'works', `Bo does not see Ada's row in ${n}`, theirs);
      await admin('DELETE', `/classes/${n}/${made.body.objectId}`);
    }
  }
  for (const t of beTriggers) {
    const fired = await admin('POST', `/admin/triggers/${encodeURIComponent(t.id)}/fire`, {});
    let last = null;
    for (let i = 0; i < 30; i++) { await wait(500); last = (await admin('GET', `/admin/triggers/${encodeURIComponent(t.id)}`)).body; if ((last?.trigger ?? last)?.status?.lastResult) break; }
    const res = (last?.trigger ?? last)?.status?.lastResult;
    ok(fired.status < 300 && res && !/fail|error/i.test(JSON.stringify(res.status ?? res.outcome ?? res)), 'works', `the trigger ${t.name ?? t.id}, fired by hand, ends ok`, { fired: fired.body, res });
    record[`fired:${t.id}`] = { fired: fired.body, res };
  }
  const rr = await renderReport();
  record.render = rr;
  ok(rr && rr.ok, 'works', 'render_report on the app is clean', rr);
} catch (e) {
  ok(false, 'grade', 'the grade ran to the end', e.stack);
} finally {
  be.kill('SIGTERM');
  await wait(800);
}
// Studio's half reads what the backend has
fs.writeFileSync(path.join(OUT, 'expect.json'), JSON.stringify({ tables: (record.backend.tables ?? []).map((t) => t.name) }, null, 2));
fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify({ at: new Date().toISOString(), results, record, backendLog: beLog.slice(-4000) }, null, 2));
const by = (g) => { const r = results.filter((x) => x.grade === g); return `${g} ${r.filter((x) => x.ok).length}/${r.length}`; };
console.log(['open', 'works', 'grade'].map(by).join(' · '));

/** render_report through the published server, as the stranger's client ran it (HOME in the lab). */
async function renderReport() {
  const mcp = spawn(process.execPath, [mcpAt, APP], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, HOME: path.join(LAB, '.home'), NODEGX_NO_UPDATE_CHECK: '1' } });
  let buf = '', id = 0; const waiting = new Map();
  mcp.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(line); waiting.get(m.id)?.(m); } catch {} } });
  const rpc = (method, params) => new Promise((r) => { const n = ++id; waiting.set(n, r); mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
  try {
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bko006-grade', version: '0' } });
    mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const m = await Promise.race([rpc('tools/call', { name: 'render_report', arguments: {} }), wait(240000).then(() => null)]);
    if (!m) return { ok: false, why: 'render_report gave no answer in 4 minutes' };
    const text = m.result?.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') ?? JSON.stringify(m.error);
    // a line of words, then the report as JSON
    const verdict = text.split('\n')[0];
    let j = null; try { j = JSON.parse(text.slice(text.indexOf('{'))); } catch {}
    return { ok: !m.result?.isError && /nothing is broken/i.test(verdict), verdict, warnings: j?.warnings ?? j?.summary?.warnings ?? null, pages: (j?.pages ?? []).map((p) => ({ page: p.page ?? p.name, errors: p.errors ?? p.consoleErrors ?? [] })).slice(0, 8) };
  } finally { mcp.kill('SIGTERM'); }
}
