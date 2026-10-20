// P124 — what the backend and the project SAY, computed once, so a canvas can be graded against facts rather than
// against its own claims (README §6). Writes facts.json: tables (columns, row count, links by name), the effective
// rule of every table and function, what each function touches (record nodes + JavaScript + nested helpers) and
// which pages call it, triggers, workflows, and the run count.
//
//   node facts.mjs <project-dir> <backend-url> <admin-token> [out.json]
import fs from 'node:fs';
import path from 'node:path';

const [projectDir, backend, token, outFile = 'facts.json'] = process.argv.slice(2);
if (!projectDir || !backend || !token) throw new Error('usage: facts.mjs <project-dir> <backend-url> <admin-token> [out.json]');
const H = { Authorization: `Bearer ${token}` };
const get = async (p) => { const r = await fetch(backend + p, { headers: H }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.json(); };

const schema = await get('/admin/schema');
const perms = await get('/admin/permissions');
const fns = await get('/admin/permissions/functions');
const roles = await get('/admin/roles');
const triggers = await get('/admin/triggers');
const workflows = await get('/admin/workflow-defs');
const runsRes = await fetch(backend + '/executions?limit=1', { headers: H });
const runCount = Number(runsRes.headers.get('x-total-count') || 0);
const health = await (await fetch(backend + '/health')).json();

// Tables: columns, a row count, and links by name (a column named <lowerTable>Id or matching another table's unique
// single-field index) — the project declares no Pointer/Relation columns, so every link is an inference and says so.
const tables = [];
const uniqueKeys = new Map(); // column name → table
for (const t of schema.tables) for (const i of t.indexes || []) if (i.unique && i.fields.length === 1 && i.fields[0] !== 'objectId') uniqueKeys.set(i.fields[0], t.name);
for (const t of schema.tables) {
  const count = (await get(`/api/${encodeURIComponent(t.name)}?count=1&limit=0`)).count ?? null;
  const links = [];
  for (const c of t.columns) {
    if (c.targetClass) links.push({ field: c.name, to: c.targetClass, how: 'declared' });
    else if (/^(learnerId|userId|createdBy|coachId|staffId|authorId)$/.test(c.name) && t.name !== '_User') links.push({ field: c.name, to: '_User', how: 'by name' });
    else if (uniqueKeys.has(c.name) && uniqueKeys.get(c.name) !== t.name) links.push({ field: c.name, to: uniqueKeys.get(c.name), how: 'by name' });
  }
  tables.push({ name: t.name, columns: t.columns.map((c) => ({ name: c.name, type: c.type })), rows: count, links });
}

// Rules: the effective permissions of every table (its own entry or the defaults).
const cfg = perms.config;
const ruleOf = (name) => cfg.collections[name]?.permissions ?? cfg.defaults.permissions;
const rules = Object.fromEntries(schema.tables.map((t) => [t.name, { ...ruleOf(t.name), creatorOwns: cfg.collections[t.name]?.creatorOwns ?? cfg.defaults.creatorOwns, own: Boolean(cfg.collections[t.name]) }]));

// Functions: touches from the graph (record nodes), the JavaScript, and nested helpers; callers from the pages.
const cloudDir = path.join(projectDir, 'components', '__cloud__');
const RECORD_NODES = { DbCollection2: 'read', DbModel2: 'read', NewDbModelProperties: 'write', SetDbModelProperties: 'write', DeleteDbModelProperties: 'write', AddDbModelRelation: 'write', RemoveDbModelRelation: 'write' };
const readComponent = (dir) => { const f = path.join(dir, 'nodes.json'); if (!fs.existsSync(f)) return null; const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(j) ? j : j.nodes || []; };
const walk = (nodes, fn) => { for (const n of nodes) { fn(n); if (Array.isArray(n.children)) walk(n.children, fn); } };
const tableNames = new Set(schema.tables.map((t) => t.name));
const touchesOf = (nodes) => {
  const touches = []; const helpers = []; let hasRequest = false; let js = 0;
  walk(nodes, (n) => {
    if (n.type === 'noodl.cloud.request') hasRequest = true;
    if (RECORD_NODES[n.type]) touches.push({ collection: n.parameters?.collectionName || n.parameters?.className || '?', op: RECORD_NODES[n.type], from: 'node' });
    if (typeof n.type === 'string' && n.type.startsWith('/#__cloud__/')) helpers.push(n.type.replace('/#__cloud__/', ''));
    if (n.type === 'JavaScriptFunction') {
      js++;
      const src = String(n.parameters?.functionScript || n.parameters?.code || '');
      for (const m of src.matchAll(/Records\.(query|fetch|count|aggregate|create|save|delete|increment|addRelation|removeRelation)\(\s*(?:\{\s*className:\s*)?['"]([A-Za-z_]+)['"]/g)) {
        touches.push({ collection: m[2], op: /^(query|fetch|count|aggregate)$/.test(m[1]) ? 'read' : 'write', from: 'javascript' });
      }
      for (const m of src.matchAll(/className:\s*['"]([A-Za-z_]+)['"]/g)) if (tableNames.has(m[1]) && !touches.some((t) => t.collection === m[1] && t.from === 'javascript')) touches.push({ collection: m[1], op: 'mentions', from: 'javascript' });
      for (const m of src.matchAll(/Records\.(query|fetch|count|aggregate|create|save|delete|increment|addRelation|removeRelation)\(\s*(?!\{?\s*className:\s*['"]|['"])/g)) touches.push({ collection: '?', op: m[1], from: 'javascript (variable)' });
    }
  });
  return { touches, helpers, hasRequest, js };
};
const components = {};
const scan = (dir, prefix) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (!e.isDirectory()) continue; const nodes = readComponent(path.join(dir, e.name)); if (nodes) components[prefix + e.name] = touchesOf(nodes); scan(path.join(dir, e.name), prefix + e.name + '/'); } };
if (fs.existsSync(cloudDir)) scan(cloudDir, '');
const expand = (name, seen = new Set()) => { const c = components[name]; if (!c || seen.has(name)) return []; seen.add(name); return [...c.touches, ...c.helpers.flatMap((h) => expand(h, seen).map((t) => ({ ...t, via: h })))]; };
const callers = {};
const pagesDir = path.join(projectDir, 'components');
const scanPages = (dir, rel) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (!e.isDirectory() || e.name === '__cloud__') continue; const nodes = readComponent(path.join(dir, e.name)); if (nodes) walk(nodes, (n) => { if (n.type === 'CloudFunction2' && n.parameters?.function) (callers[n.parameters.function] ??= []).push(rel + e.name); }); scanPages(path.join(dir, e.name), rel + e.name + '/'); } };
scanPages(pagesDir, '');
const functions = fns.functions.map((f) => ({ name: f.name, call: f.call, source: f.source, rateLimit: f.effectiveRateLimit, writesRecordsPerBackend: health.workflows?.functions?.find((x) => x.name === f.name)?.writesRecords ?? null, touches: expand(f.name), helpers: components[f.name]?.helpers || [], javascriptNodes: components[f.name]?.js ?? 0, calledFrom: callers[f.name] || [] }));

const facts = {
  at: new Date().toISOString(), backend, backendName: health.backendName, devOpen: cfg.devOpen, enforced: health.security?.enforced,
  defaults: cfg.defaults, tables, rules, roles: roles.roles.map((r) => ({ name: r.name, members: r.names || [] })),
  functions, triggers: triggers.triggers, workflows: workflows.workflows, runCount,
  summary: {
    tables: tables.length, rows: tables.reduce((a, t) => a + (t.rows || 0), 0), linksByName: tables.reduce((a, t) => a + t.links.filter((l) => l.how === 'by name').length, 0), linksDeclared: tables.reduce((a, t) => a + t.links.filter((l) => l.how === 'declared').length, 0),
    tablesWithOwnRule: Object.values(rules).filter((r) => r.own).length, functions: functions.length,
    functionsWriting: functions.filter((f) => f.touches.some((t) => t.op === 'write')).length, functionsBackendSaysWrite: functions.filter((f) => f.writesRecordsPerBackend).length,
    callsFromPages: Object.values(callers).reduce((a, v) => a + v.length, 0), triggers: triggers.triggers.length, workflows: workflows.workflows.length, runs: runCount
  }
};
fs.writeFileSync(outFile, JSON.stringify(facts, null, 2));
console.log(JSON.stringify(facts.summary));
