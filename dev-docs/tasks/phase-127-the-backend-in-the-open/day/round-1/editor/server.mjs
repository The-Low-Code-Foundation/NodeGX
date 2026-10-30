#!/usr/bin/env node
// A day in the life — the server. It holds the backend's admin credential; the page never sees it. The page asks this
// server, and this server asks the backend. It listens on this computer only (127.0.0.1).
//
//   node server.mjs [--app <the app's folder>] [--backend <url>] [--token-file <file>] [--port <n>] [--open]
//
// Left out, the folder, address and credential are the ones next to this tool: ../riverside, the address in
// ./settings.json and ../riverside-admin-token.txt.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { backend, openProject, asPerson } from '@nodegx/backend-kit';
import { makeWorld, listPeople, playDay } from './lib/day.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const settings = fs.existsSync(path.join(here, 'settings.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'settings.json'), 'utf8')) : {};
const appDir = path.resolve(here, flag('--app') ?? settings.app ?? '../riverside');
const url = flag('--backend') ?? settings.backend;
const tokenFile = path.resolve(here, flag('--token-file') ?? settings.tokenFile ?? '../riverside-admin-token.txt');
const port = Number(flag('--port') ?? settings.port ?? 4477);

if (!url) {
  console.error('Say where the backend is: --backend http://127.0.0.1:<port>, or "backend" in settings.json.');
  process.exit(2);
}
if (!fs.existsSync(tokenFile)) {
  console.error(`The admin credential file ${tokenFile} isn’t there. Pass --token-file <file>.`);
  process.exit(2);
}
const be = backend(url, fs.readFileSync(tokenFile, 'utf8').split(/\r?\n/)[0].trim());
const project = openProject(appDir);
const world = makeWorld(be);
const appName = project.store.readProjectFile()?.name ?? path.basename(appDir);

// A key the tool made and a crash left behind is deleted on the way in.
await asPerson(be).sweep();

const STATIC = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// One day at a time: each one makes a short-lived key and runs functions; two at once would only race each other.
let running = Promise.resolve();
const oneAtATime = (work) => (running = running.then(work, work));

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const send = (status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  // Only this computer's own pages may ask (a page elsewhere can't use the credential through this server).
  const host = String(req.headers.host ?? '');
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return send(403, { error: 'This tool answers only on this computer.' });
  try {
    if (req.method !== 'GET') return send(405, { error: 'This tool only reads.' });
    if (STATIC[u.pathname]) {
      const file = path.join(here, 'public', STATIC[u.pathname]);
      return send(200, fs.readFileSync(file, 'utf8'), TYPES[path.extname(file)]);
    }
    if (u.pathname === '/api/app') {
      const w = await world();
      return send(200, { app: appName, folder: appDir, backend: be.base, people: await listPeople(world), tables: w.schema.tables.filter((t) => t.name !== '_User').map((t) => t.name) });
    }
    if (u.pathname === '/api/day') {
      const id = u.searchParams.get('person');
      if (!id) return send(400, { error: 'Say whose day: ?person=<id>.' });
      const day = await oneAtATime(() => playDay({ be, project, world, personId: id }));
      return send(200, day);
    }
    return send(404, { error: 'Nothing here.' });
  } catch (e) {
    return send(500, { error: e.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  const link = `http://127.0.0.1:${port}/`;
  console.log(`A day in the life — ${appName}`);
  console.log(`  the app:     ${appDir}`);
  console.log(`  its backend: ${be.base}`);
  console.log(`  open:        ${link}`);
  console.log('  (Ctrl+C to stop)');
  if (args.includes('--open')) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [link], () => {});
});
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${port} is taken. Try --port ${port + 1}.` : e.message);
  process.exit(1);
});
const stop = async () => {
  await asPerson(be).sweep();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
