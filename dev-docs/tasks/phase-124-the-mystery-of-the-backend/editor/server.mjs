#!/usr/bin/env node
// The backend map's own server. It opens the app's folder (read through the NodeGX kit), talks to
// the running backend with the admin credential (which never reaches the page), and serves the map.
//
//   backend-map [project folder] [--backend <url> --token-file <file>] [--port <n>] [--no-open]
//
// With no folder it opens the current one. With no --backend it finds the backend the project is linked
// to on this computer (lib/discover.mjs). BACKEND-URL and ADMIN-TOKEN beside the project still work.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { look, wireColors } from '@nodegx/canvas-look';
import { openProject, analyseProject, tableLinks } from './lib/project.mjs';
import { backend, BackendError } from './lib/backend.mjs';
import { setTableRule, entryFor, readSecurityFile, dryRuns, Refusal, SECURITY_FILE } from './lib/rules.mjs';
import { makeViews } from './lib/views.mjs';
import { KEY_SUFFIX, asPerson, learnerIds } from './lib/asperson.mjs';
import { projectBackend } from './lib/discover.mjs';
import { loadWorld, personReach, anonymousReach } from './lib/reach.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv, cwd = process.cwd()) {
  const o = { project: null, backend: null, tokenFile: null, token: null, port: 5190, open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--backend') o.backend = argv[++i];
    else if (a === '--token-file') o.tokenFile = argv[++i];
    else if (a === '--port') o.port = Number(argv[++i]);
    else if (a === '--no-open') o.open = false;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (!a.startsWith('--')) o.project = a;
  }
  if (o.help) return o;
  o.project = path.resolve(cwd, o.project ?? '.');
  const firstLine = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/)[0].trim();
  const beside = path.dirname(o.project);
  if (!o.backend && fs.existsSync(path.join(beside, 'BACKEND-URL'))) {
    o.backend = firstLine(path.join(beside, 'BACKEND-URL'));
    o.tokenFile ??= path.join(beside, 'ADMIN-TOKEN');
  }
  if (o.backend) {
    if (!o.tokenFile || !fs.existsSync(path.resolve(cwd, o.tokenFile))) throw new Error('With --backend, pass --token-file <file>: a file holding the backend’s admin credential.');
    o.token = firstLine(path.resolve(cwd, o.tokenFile));
    return o;
  }
  const found = projectBackend(o.project);
  o.backend = found.url;
  o.token = found.token;
  o.backendName = found.name;
  return o;
}

export function createEditor(opts) {
  const project = openProject(opts.project);
  const be = backend(opts.backend, opts.token);
  const ctx = { be, files: project.files };
  const mine = new Map(); // request id → { person, fn, key }: the runs this map made, as whom
  const views = makeViews({ be, project, mine });
  const keyActors = new Map(); // request id → the key that made a run, from the audit

  async function buildMap() {
    const health = await be.health();
    if (!health) throw new BackendError(0, `The backend at ${be.base} isn’t answering. Is it running?`);
    const [schema, perms, fnPerms, roles, users, triggers, audit] = await Promise.all([
      be.get('/admin/schema'),
      be.getWithHeaders('/admin/permissions'),
      be.get('/admin/permissions/functions'),
      be.get('/admin/roles'),
      be.get('/admin/users?limit=200'),
      be.get('/admin/triggers').catch(() => ({ triggers: [] })),
      be.get('/admin/audit?limit=12').catch(() => ({ entries: [] }))
    ]);
    const counts = await Promise.all(
      schema.tables.map((t) =>
        be.get(`/api/${encodeURIComponent(t.name)}?count=1&limit=0`).then((r) => r.count ?? null, () => null)
      )
    );
    const tableNames = schema.tables.map((t) => t.name);
    const app = analyseProject(project, tableNames);
    const file = readSecurityFile(project.files);
    const config = perms.json.config;
    const deployed = Object.fromEntries(fnPerms.functions.map((f) => [f.name, f]));
    return {
      app: { name: app.name, folder: opts.project },
      backend: { name: health.backendName, url: be.base, enforced: !!health.security?.enforced, devOpen: !!health.security?.devOpen },
      tables: schema.tables.map((t, i) => ({
        name: t.name,
        rows: t.name === '_User' ? users.total ?? users.users.length : counts[i],
        columns: t.columns.map((c) => ({ name: c.name, type: c.type })),
        keys: (t.indexes || []).filter((x) => x.unique).map((x) => x.fields)
      })),
      links: tableLinks(schema.tables),
      functions: app.functions.map((f) => ({
        ...f,
        deployed: !!deployed[f.name]?.deployed,
        call: deployed[f.name]?.call ?? config.functions?.[f.name]?.call ?? null,
        rateLimit: deployed[f.name]?.effectiveRateLimit ?? null
      })),
      helpers: app.helpers,
      screens: app.screens,
      calls: app.calls,
      config: { defaults: config.defaults, collections: config.collections ?? {}, functions: config.functions ?? {}, files: config.files, signup: config.signup },
      fileCollections: file.config?.collections ?? {},
      etag: perms.json.etag,
      fileStamp: file.stamp,
      securityFile: SECURITY_FILE,
      roles: rolesIn(roles.roles, config),
      people: users.total ?? users.users.length,
      triggers: triggers.triggers ?? [],
      audit: (audit.entries ?? []).map((e) => ({ at: e.at, action: e.action, outcome: e.outcome, target: e.target })),
      look: { colors: look.colors.dark, signal: wireColors('signal', 'dark'), data: wireColors('data', 'dark') }
    };
  }

  /** The backend's groups, plus any group the rules name that has no members yet. */
  function rolesIn(backendRoles, config) {
    const out = backendRoles.map((r) => ({ name: r.name, members: r.users.length }));
    const named = new Set();
    JSON.stringify(config, (k, v) => (typeof v === 'string' && v.startsWith('role:') && named.add(v.slice(5)), v));
    for (const n of named) if (!out.some((r) => r.name === n)) out.push({ name: n, members: 0 });
    return out;
  }

  async function runs(since) {
    const q = new URLSearchParams({ limit: '60', offset: '0' });
    if (since) q.set('since', String(since));
    const { json, headers } = await be.getWithHeaders(`/executions?${q}`);
    // A run through the MCP door was made with a key: the audit names the key, by the run's request id.
    const viaKey = json.filter((r) => /\/mcp/.test(r.metadata?.triggerSource ?? '') && !keyActors.has(r.metadata?.requestId));
    if (viaKey.length) {
      const audit = await be.get('/admin/audit?action=mcp.tool.call&limit=200').catch(() => ({ entries: [] }));
      for (const e of audit.entries ?? []) if (e.requestId) keyActors.set(e.requestId, e.actor);
    }
    return {
      total: Number(headers.get('x-total-count') ?? json.length),
      runs: json.map((r) => {
        const rid = r.metadata?.requestId;
        const ours = rid && mine.get(rid);
        const actor = rid && keyActors.get(rid);
        return {
          id: r.id,
          name: r.workflowId,
          kind: r.kind,
          status: r.status,
          startedAt: r.startedAt,
          durationMs: r.durationMs,
          errorMessage: r.errorMessage ?? null,
          byMap: ours ? { person: ours.person, key: ours.key } : actor && actor.endsWith(KEY_SUFFIX) ? { person: null, key: actor } : null,
          byKey: actor && !actor.endsWith(KEY_SUFFIX) ? actor : null
        };
      })
    };
  }

  /** A table's rows, each with a short label in words and its plain values, for the explorer. */
  async function rows(table) {
    const schema = await be.get('/admin/schema');
    const t = schema.tables.find((x) => x.name === table);
    if (!t) throw new Refusal('No such table.');
    const results = table === '_User' ? (await be.get('/admin/users?limit=500')).users : (await be.get(`/api/${encodeURIComponent(table)}?limit=500`)).results;
    const keys = (t.indexes ?? []).filter((i) => i.unique && i.fields.length === 1).map((i) => i.fields[0]);
    const words = ['subject', 'title', 'name', 'projectName', 'label', 'email', 'username', 'body', 'content'];
    return results.map((r) => {
      const w = words.map((k) => r[k]).find((v) => typeof v === 'string' && v.trim());
      // a row told apart only by several columns together reads as those values: "l-marie · what-the-web-is"
      const multi = (t.indexes ?? []).find((i) => i.unique && i.fields.length > 1);
      const key = keys.map((k) => r[k]).find((v) => typeof v === 'string') ?? (multi ? multi.fields.map((f) => r[f]).filter((v) => v !== null && v !== undefined).join(' · ') : undefined);
      const owner = ['learnerId', 'userId', 'authorUserId'].map((k) => r[k]).find(Boolean);
      const cells = {};
      for (const c of t.columns) {
        const v = r[c.name];
        if (c.name === 'ACL' || /password|token|secret/i.test(c.name)) continue;
        cells[c.name] = v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 160);
      }
      return { objectId: r.objectId, label: w ? w.slice(0, 80) : key ?? r.objectId, key: key ?? null, owner: owner ?? null, cells };
    });
  }

  // Round 3: what one person can reach, row by row (lib/reach.mjs). The world (every row) is read once
  // a quarter of a minute: the backend limits admin requests.
  const ap = asPerson(be, { mine });
  let worldCache = null;
  async function reachWorld() {
    if (worldCache && Date.now() - worldCache.at < 15_000) return worldCache;
    const world = await loadWorld(be);
    const app = analyseProject(project, world.schema.tables.map((t) => t.name));
    const [lids, perms] = await Promise.all([learnerIds(be), be.get('/admin/permissions')]);
    worldCache = { at: Date.now(), world, app, lids, config: perms.config };
    return worldCache;
  }
  async function reachOf(personId, emit) {
    const w = await reachWorld();
    if (!personId) {
      const summary = await anonymousReach({ be, app: w.app, world: w.world, config: w.config });
      emit({ type: 'start', person: summary.person, tools: summary.tools, notAllowed: w.app.functions.map((f) => f.name).filter((f) => !summary.tools.includes(f)), readers: [], direct: [] });
      for (const c of summary.changers) emit({ type: 'skip', ...c, writes: w.app.functions.find((f) => f.name === c.fn)?.touches.filter((t) => t.hows.some((h) => h !== 'reads' && h !== 'mentions')).map((t) => t.table) ?? [] });
      emit({ type: 'done', summary });
      return summary;
    }
    const user = w.world.rowsByTable._User.find((u) => u.objectId === personId);
    if (!user) throw new Refusal('No such person in the backend.');
    return personReach({ be, ap, app: w.app, world: w.world, config: w.config, user, lids: w.lids, emit });
  }
  async function everyone(emit) {
    const w = await reachWorld();
    const out = [];
    const people = [null, ...w.world.rowsByTable._User.map((u) => u.objectId)];
    for (const id of people) {
      const s = await reachOf(id, () => {});
      const brief = { person: s.person, reachedRows: s.reachedRows, totalRows: s.totalRows, tables: s.tables, tools: s.tools.length, readers: s.readers.length };
      out.push(brief);
      emit({ type: 'person', ...brief });
    }
    emit({ type: 'done' });
    return out;
  }

  async function changeRule(body) {
    const { table, reset, read, change, creatorOwns, etag, fileStamp } = body;
    if (!table || typeof table !== 'string') throw new Refusal('Which table?');
    const entry = reset ? null : entryFor({ read, change, creatorOwns });
    return setTableRule(ctx, table, entry, { etag, fileStamp });
  }

  return { buildMap, runs, rows, changeRule, check: (table) => dryRuns(be, table), views, project, be, reachOf, everyone };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

/**
 * The map's requests as a plain handler, so another server can mount it under a path (NodeGX Studio does,
 * at /backend-map/). `pathname` is the request's path with that mount taken off.
 */
export function handler(editor) {
  const pub = path.join(here, 'public');
  const send = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const fail = (res, e) => {
    const refusal = e instanceof Refusal;
    send(res, refusal ? 409 : e instanceof BackendError ? 502 : 500, { error: e.message, refused: refusal });
  };
  return async (req, res, pathname) => {
    const url = new URL(req.url, 'http://x');
    if (pathname !== undefined) url.pathname = pathname;
    try {
      if (url.pathname === '/api/map' && req.method === 'GET') return send(res, 200, await editor.buildMap());
      if (url.pathname === '/api/runs' && req.method === 'GET') return send(res, 200, await editor.runs(url.searchParams.get('since')));
      if (url.pathname === '/api/check' && req.method === 'GET') return send(res, 200, { checks: await editor.check(url.searchParams.get('table')) });
      const body = async () => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        return JSON.parse(raw || '{}');
      };
      if (url.pathname === '/api/table-rule' && req.method === 'POST') return send(res, 200, await editor.changeRule(await body()));
      if (url.pathname === '/api/people' && req.method === 'GET') return send(res, 200, { people: await editor.views.people() });
      if (url.pathname === '/api/rows' && req.method === 'GET') return send(res, 200, { rows: await editor.rows(url.searchParams.get('table')) });
      // The three that act as a real person. POST, because each one makes a key, and the screen and
      // record ones make real (read-only) runs.
      if (url.pathname === '/api/as/reach' && req.method === 'POST') return send(res, 200, await editor.views.reach((await body()).person));
      if (url.pathname === '/api/as/screen' && req.method === 'POST') {
        const b = await body();
        return send(res, 200, await editor.views.screen(b.person, b.screen));
      }
      // Round 3: a stream, one line of JSON per thing that happened, so the map lights up as it runs.
      if ((url.pathname === '/api/as/everything' || url.pathname === '/api/everyone') && req.method === 'POST') {
        const b = await body();
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
        const emit = (e) => res.write(JSON.stringify(e) + '\n');
        try {
          if (url.pathname === '/api/everyone') await editor.everyone(emit);
          else await editor.reachOf(b.person ?? null, emit);
        } catch (e) {
          emit({ type: 'error', error: e.message });
        }
        return res.end();
      }
      if (url.pathname === '/api/record-reach' && req.method === 'POST') {
        const b = await body();
        return send(res, 200, await editor.views.recordReach(b.table, b.objectId));
      }
      if (req.method !== 'GET') return send(res, 405, { error: 'Not here.' });
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.join(pub, rel);
      if (!file.startsWith(pub + path.sep) || !fs.existsSync(file)) return send(res, 404, { error: 'Not found.' });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      fail(res, e);
    }
  };
}

export function serve(editor, port) {
  const handle = handler(editor);
  const server = http.createServer((req, res) => handle(req, res));
  return new Promise((resolve, reject) => {
    server.once('error', (e) => {
      // the usual port is taken (a second map open?): take any free one
      if (e.code === 'EADDRINUSE' && port !== 0) server.listen(0, '127.0.0.1', () => resolve(server));
      else reject(e);
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* the address is printed */
  }
}

const HELP = `backend-map: your NodeGX app's backend as a map — who can reach which rows.

  backend-map [project folder] [--port <n>] [--no-open]
  backend-map [project folder] --backend <url> --token-file <file>

Run it inside a NodeGX project whose backend is running. It finds the backend the project is linked
to, serves the map on http://127.0.0.1:5190/ and opens it. The admin credential stays in this process.`;

export async function main(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }
  const editor = createEditor(opts);
  if (!(await editor.be.health())) {
    console.error(`The backend at ${opts.backend} isn’t answering. Start it from NodeGX (Backend Services), then run this again.`);
    process.exit(1);
  }
  // Keys this map makes live for one question each. Any left over (a crash) go now, and on the way out.
  await editor.views.sweep();
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      await editor.views.sweep();
      process.exit(0);
    });
  }
  const server = await serve(editor, opts.port);
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Backend map for ${opts.project}`);
  console.log(`  backend: ${opts.backendName ? `${opts.backendName} (${opts.backend})` : opts.backend}`);
  console.log(`  open:    ${url}`);
  if (opts.open) openBrowser(url);
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) await main();
