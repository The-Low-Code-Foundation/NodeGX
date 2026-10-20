#!/usr/bin/env node
// The big-block editor's server: opens a NodeGX app's folder, hands it to the page, and writes the
// page's changes back through the kit's store. Start it with `npm start` (the todo list next door)
// or `npm start -- /path/to/another/app`.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isV2Project } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { V2ProjectStore, readProject, readOne, saveChanges } from './src/project-io.mjs';
import { projectPorts } from './src/ports.mjs';
import { PALETTE_TYPES } from './public/words.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const previewDist = path.join(path.dirname(require.resolve('@nodegx/preview/package.json')), 'dist');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const port = Number(option('--port', process.env.PORT || 8600));
const firstDir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') || '../todo-list';

let current = null; // { dir, store }

function openFolder(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error(`There is no folder at ${abs}.`);
  const files = diskFiles(abs);
  if (!isV2Project(files)) throw new Error(`${abs} is not a NodeGX app (it has no nodegx.project.json or components/_registry.json).`);
  current = { dir: abs, store: new V2ProjectStore(files) };
  return current;
}

const TEXT = /\.(json|md|css|js|txt|html|svg)$/i;
function readTree(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (TEXT.test(e.name)) out[path.relative(root, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serveFile(res, root, rel) {
  const abs = path.resolve(root, '.' + path.sep + rel);
  if (!abs.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404).end('Not here.');
    return;
  }
  res.writeHead(200, { 'content-type': (TYPES[path.extname(abs)] || 'application/octet-stream') + '; charset=utf-8', 'cache-control': 'no-store' });
  fs.createReadStream(abs).pipe(res);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/project' && req.method === 'GET') {
      if (!current) return sendJson(res, 404, { message: 'No app is open.' });
      const project = readProject(current.store, readTree(current.dir));
      return sendJson(res, 200, { ...project, dir: current.dir, ports: projectPorts(project, PALETTE_TYPES) });
    }
    if (p === '/api/open' && req.method === 'POST') {
      const { dir } = await readBody(req);
      openFolder(dir);
      return sendJson(res, 200, { dir: current.dir });
    }
    if (p === '/api/component' && req.method === 'GET') {
      return sendJson(res, 200, readOne(current.store, url.searchParams.get('key')));
    }
    if (p === '/api/save' && req.method === 'POST') {
      const { changes } = await readBody(req);
      const results = saveChanges(current.store, changes || []);
      for (const r of results) console.log(r.ok ? `saved ${r.key}${r.unchanged ? ' (nothing had changed)' : ''}` : `NOT saved ${r.key}: ${r.message}`);
      return sendJson(res, 200, { results });
    }
    if (p.startsWith('/runtime/')) return serveFile(res, path.join(previewDist, 'external', 'deploy'), p.slice('/runtime/'.length));
    if (p === '/kit/preview-in-page.js') return serveFile(res, path.join(previewDist, 'browser'), 'noodl-preview-in-page.js');
    if (p.startsWith('/src/')) return serveFile(res, path.join(here, 'src'), p.slice('/src/'.length));
    if (p === '/') return serveFile(res, path.join(here, 'public'), 'index.html');
    return serveFile(res, path.join(here, 'public'), p.slice(1));
  } catch (err) {
    sendJson(res, 500, { message: String(err && err.message ? err.message : err) });
  }
});

try {
  openFolder(path.resolve(process.cwd(), firstDir));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

server.listen(port, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Big-block editor for ${current.dir}`);
  console.log(`Open ${address}   (Ctrl+C stops it)`);
  if (!flag('--no-open')) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const cmdArgs = process.platform === 'win32' ? ['/c', 'start', '', address] : [address];
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});
