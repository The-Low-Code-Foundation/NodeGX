#!/usr/bin/env node
// The backend map's own server. It opens the app's folder (read through the NodeGX kit), talks to
// the running backend with the admin credential (which never reaches the page), and serves the map.
//
//   node server.mjs [app folder] [--backend <url>] [--token-file <file>] [--port <n>] [--no-open]
//
// With no flags it reads ../training, and the backend's address and credential from BACKEND-URL and
// ADMIN-TOKEN in the folder above the app.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { look, wireColors } from '@nodegx/canvas-look';
import { openProject, analyseProject, tableLinks } from './lib/project.mjs';
import { backend, BackendError } from './lib/backend.mjs';
import { setTableRule, entryFor, readSecurityFile, dryRuns, Refusal, SECURITY_FILE } from './lib/rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const o = { project: null, backend: null, tokenFile: null, port: 5190, open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--backend') o.backend = argv[++i];
    else if (a === '--token-file') o.tokenFile = argv[++i];
    else if (a === '--port') o.port = Number(argv[++i]);
    else if (a === '--no-open') o.open = false;
    else if (!a.startsWith('--')) o.project = a;
  }
  o.project = path.resolve(o.project ?? path.join(here, '..', 'training'));
  const beside = path.dirname(o.project);
  const firstLine = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/)[0].trim();
  if (!o.backend) {
    const f = path.join(beside, 'BACKEND-URL');
    if (!fs.existsSync(f)) throw new Error(`No backend address: pass --backend <url>, or put it in ${f}.`);
    o.backend = firstLine(f);
  }
  o.tokenFile = path.resolve(o.tokenFile ?? path.join(beside, 'ADMIN-TOKEN'));
  if (!fs.existsSync(o.tokenFile)) throw new Error(`No admin credential: pass --token-file <file>, or put it in ${o.tokenFile}.`);
  o.token = firstLine(o.tokenFile);
  return o;
}

export function createEditor(opts) {
  const project = openProject(opts.project);
  const be = backend(opts.backend, opts.token);
  const ctx = { be, files: project.files };

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
    return {
      total: Number(headers.get('x-total-count') ?? json.length),
      runs: json.map((r) => ({
        id: r.id,
        name: r.workflowId,
        kind: r.kind,
        status: r.status,
        startedAt: r.startedAt,
        durationMs: r.durationMs,
        errorMessage: r.errorMessage ?? null
      }))
    };
  }

  async function changeRule(body) {
    const { table, reset, read, change, creatorOwns, etag, fileStamp } = body;
    if (!table || typeof table !== 'string') throw new Refusal('Which table?');
    const entry = reset ? null : entryFor({ read, change, creatorOwns });
    return setTableRule(ctx, table, entry, { etag, fileStamp });
  }

  return { buildMap, runs, changeRule, check: (table) => dryRuns(be, table), project, be };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function serve(editor, port) {
  const pub = path.join(here, 'public');
  const send = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const fail = (res, e) => {
    const refusal = e instanceof Refusal;
    send(res, refusal ? 409 : e instanceof BackendError ? 502 : 500, { error: e.message, refused: refusal });
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/api/map' && req.method === 'GET') return send(res, 200, await editor.buildMap());
      if (url.pathname === '/api/runs' && req.method === 'GET') return send(res, 200, await editor.runs(url.searchParams.get('since')));
      if (url.pathname === '/api/check' && req.method === 'GET') return send(res, 200, { checks: await editor.check(url.searchParams.get('table')) });
      if (url.pathname === '/api/table-rule' && req.method === 'POST') {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        return send(res, 200, await editor.changeRule(JSON.parse(raw || '{}')));
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
  });
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const editor = createEditor(opts);
  const server = await serve(editor, opts.port);
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Backend map for ${opts.project}`);
  console.log(`  backend: ${opts.backend}`);
  console.log(`  open:    ${url}`);
  if (opts.open) openBrowser(url);
}
