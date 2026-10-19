#!/usr/bin/env node
// The scene editor's server: serves the page, reads the NodeGX project folder, saves the page's changes through
// the kit's store, and puts three-kit into a project that has none (the same copy `npx @nodegx/three-kit add` makes).
//
//   node server.mjs <project-dir> [--port 8650] [--open]
//
// Only component files are written, and only when the person presses Save; the kit's folder only on "Add 3D".

import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { isV2Project } from '@nodegx/project-contract/format.js';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { V2ProjectStore, commit, readProject } from './core/commit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// The kit's own installer: in this repo, the package's bin; for an outsider it would be `npx @nodegx/three-kit add`.
const KIT_BIN = path.resolve(here, '../../../../library/modules/three-kit/bin/three-kit.js');
// The demo: the prototype's fixture (a bar chart, a ball, a robot), copied fresh so trying it never edits the repo.
const DEMO = path.resolve(here, '../fixture');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const port = Number(flag('--port') ?? process.env.PORT ?? 8650);
const shouldOpen = args.includes('--open');
let projectDir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
projectDir = projectDir ? path.resolve(projectDir) : undefined;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

/** URL prefix → folder it is served from. */
const STATIC = [
  ['/kit/preview/', path.join(here, 'node_modules/@nodegx/preview/dist/browser')],
  ['/runtime/', path.join(here, 'node_modules/@nodegx/preview/dist/external/deploy')],
  ['/core/', path.join(here, 'core')],
  ['/', path.join(here, 'public')]
];

function openProject(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error(`${abs} is not a folder.`);
  if (!isV2Project(diskFiles(abs))) throw new Error(`${abs} is not a NodeGX project: it has no nodegx.project.json or components/_registry.json.`);
  projectDir = abs;
}

/** Every text file of the project, path → text: what the in-page preview renders (the kit's three.min.js included). */
function projectTree(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (/\.(json|md|css|js|txt|svg)$/i.test(e.name)) out[path.relative(root, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

function kitState(root) {
  const manifest = path.join(root, 'noodl_modules', 'three-kit', 'manifest.json');
  if (!fs.existsSync(manifest)) return { installed: false };
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version ?? null;
  } catch {}
  return { installed: true, version };
}

function projectPayload() {
  const store = new V2ProjectStore(diskFiles(projectDir));
  const project = store.readProjectFile() ?? {};
  return {
    dir: projectDir,
    name: project.name ?? path.basename(projectDir),
    components: readProject(store),
    tree: projectTree(projectDir),
    kit: kitState(projectDir)
  };
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function serveStatic(req, res) {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const [prefix, dir] of STATIC) {
    if (!url.startsWith(prefix)) continue;
    const abs = path.join(dir, url.slice(prefix.length) || 'index.html');
    if (!abs.startsWith(dir)) return send(res, 403, 'no', 'text/plain');
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(abs)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      return fs.createReadStream(abs).pipe(res);
    }
    if (prefix !== '/') return send(res, 404, `${url} not found`, 'text/plain');
  }
  send(res, 404, `${url} not found`, 'text/plain');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  try {
    if (url === '/api/project' && req.method === 'GET') {
      return send(res, 200, projectDir ? projectPayload() : { dir: null });
    }
    if (url === '/api/open' && req.method === 'POST') {
      openProject((await readBody(req)).dir);
      return send(res, 200, projectPayload());
    }
    if (url === '/api/demo' && req.method === 'POST') {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-scene-demo-'));
      fs.cpSync(DEMO, dir, { recursive: true });
      const r = spawnSync(process.execPath, [KIT_BIN, 'add', dir], { encoding: 'utf8' });
      if (r.status !== 0) return send(res, 500, { error: (r.stderr || r.stdout).trim() });
      openProject(dir);
      console.log(`demo copied to ${dir}`);
      return send(res, 200, projectPayload());
    }
    if (url === '/api/add-kit' && req.method === 'POST') {
      if (!projectDir) return send(res, 400, { error: 'No project is open.' });
      const r = spawnSync(process.execPath, [KIT_BIN, 'add', projectDir], { encoding: 'utf8' });
      if (r.status !== 0) return send(res, 500, { error: (r.stderr || r.stdout || `three-kit add exited ${r.status}`).trim() });
      console.log(`three-kit added to ${projectDir}`);
      return send(res, 200, { said: r.stdout.trim(), ...projectPayload() });
    }
    if (url === '/api/save' && req.method === 'POST') {
      if (!projectDir) return send(res, 400, { error: 'No project is open.' });
      const { changes } = await readBody(req);
      const result = commit(new V2ProjectStore(diskFiles(projectDir)), changes ?? []);
      const tree = projectTree(projectDir);
      result.validation = validateStructure(tree);
      result.tree = tree;
      result.components = readProject(new V2ProjectStore(diskFiles(projectDir)));
      console.log(`saved ${result.saved.filter((s) => !s.unchanged).length} component(s), ${result.refused.length} refused, ${result.validation.length} validation problem(s)`);
      return send(res, 200, result);
    }
    if (req.method === 'GET') return serveStatic(req, res);
    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

if (projectDir) {
  try {
    openProject(projectDir);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}

// A port in use (another editor, a preview): try the next one.
let tries = 0;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tries++ < 20) return server.listen(port + tries, '127.0.0.1');
  console.error(err.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`NodeGX scene editor on ${url}${projectDir ? ` — ${projectDir}` : ' — no project yet: open one in the page'}`);
  if (shouldOpen) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const a = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(cmd, a, { stdio: 'ignore', detached: true }).unref();
  }
});
