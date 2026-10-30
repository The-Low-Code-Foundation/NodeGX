#!/usr/bin/env node
// The backend map's own server. It opens the app's folder (read through the NodeGX kit), talks to
// the running backend with the admin credential (which never reaches the page), and serves the map.
//
//   backend-map [project folder] [--backend <url> --token-file <file>] [--port <n>] [--no-open]
//
// With no folder it opens the current one. With no --backend it finds the backend the project is linked
// to on this computer (the kit's projectBackend). BACKEND-URL and ADMIN-TOKEN beside the project still work.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { look, wireColors } from '@nodegx/canvas-look';
// BKO-008: the map is built on its kit and imports nothing else of the package's. A stranger's editor imports the same
// thing as `@nodegx/backend-map/kit`.
import { openProject, analyseProject, backend, BackendError, Refusal, setTableRule, entryFor, dryRuns, makeViews, asPerson, projectBackend, makeHands, readFacts, tableRows, makeRuns, makeLens } from '@nodegx/backend-map/kit';

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
  // Round 3: what one person can reach, row by row, on a world the lens reads once a quarter of a minute.
  const lens = makeLens({ be, project, ap: asPerson(be, { mine }) });
  // BKO-007: what a drag on the map changes; a trigger names a function as the backend serves it (the map's own name).
  // Every change forgets the world the reach measures from, so a person looked at again is measured on the new rules.
  const madeBy = makeHands({ be, files: project.files, functions: () => analyseProject(project, []).functions.map((f) => f.name) });
  const forgetting = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } finally {
      lens.forget();
    }
  };
  const hands = { ...madeBy, rule: forgetting(madeBy.rule), addTrigger: forgetting(madeBy.addTrigger), removeTrigger: forgetting(madeBy.removeTrigger), setEnabled: forgetting(madeBy.setEnabled), undo: forgetting(madeBy.undo) };

  /** What the page draws: the kit's facts, in the map's look. */
  async function buildMap() {
    const facts = await readFacts({ be, project, folder: opts.project });
    return { ...facts, look: { colors: look.colors.dark, signal: wireColors('signal', 'dark'), data: wireColors('data', 'dark') } };
  }

  async function changeRule(body) {
    const { table, reset, read, change, creatorOwns, etag, fileStamp } = body;
    if (!table || typeof table !== 'string') throw new Refusal('Which table?');
    const entry = reset ? null : entryFor({ read, change, creatorOwns });
    const result = await setTableRule(ctx, table, entry, { etag, fileStamp });
    lens.forget();
    return result;
  }

  return { buildMap, runs: makeRuns({ be, mine }), rows: (table) => tableRows(be, table), changeRule, hands, check: (table) => dryRuns(be, table), views, project, be, reachOf: lens.reachOf, everyone: lens.everyone };
}

const WORDS = fileURLToPath(import.meta.resolve('@nodegx/backend-map/kit/words.js'));
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
      // BKO-007: the hands. Each answers what it did in words and an `undo` id; /api/hand/undo puts both places back.
      if (url.pathname === '/api/hand/rule' && req.method === 'POST') return send(res, 200, await editor.hands.rule(await body()));
      if (url.pathname === '/api/hand/trigger' && req.method === 'POST') return send(res, 200, await editor.hands.addTrigger(await body()));
      if (url.pathname === '/api/hand/trigger-remove' && req.method === 'POST') return send(res, 200, await editor.hands.removeTrigger(await body()));
      if (url.pathname === '/api/hand/trigger-enabled' && req.method === 'POST') return send(res, 200, await editor.hands.setEnabled(await body()));
      if (url.pathname === '/api/hand/schedule' && req.method === 'POST') return send(res, 200, await editor.hands.schedulePreview((await body()).cron));
      if (url.pathname === '/api/hand/undo' && req.method === 'POST') return send(res, 200, await editor.hands.undo((await body()).id));
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
      // BKO-008: the page's words are the kit's one text, served from the kit (the page and Studio import /words.js)
      if (rel === 'words.js') {
        res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' });
        return fs.createReadStream(WORDS).pipe(res);
      }
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
