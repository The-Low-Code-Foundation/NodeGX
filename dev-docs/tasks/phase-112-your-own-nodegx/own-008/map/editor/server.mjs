#!/usr/bin/env node
// The map editor's server: serves the page, reads the NodeGX project folder, answers which ports
// a node has (from @nodegx/node-spec), and saves the page's changes back through the kit's store.
//
//   node server.mjs <project-dir> [--port 8590] [--open]
//
// Only files of the project's components are ever written, and only when the person presses Save.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { specFor, specs, drawnPorts } from '@nodegx/node-spec';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { isV2Project } from '@nodegx/project-contract/format.js';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { V2ProjectStore, commit, readProject } from './core/commit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const port = Number(flag('--port') ?? process.env.PORT ?? 8590);
const shouldOpen = args.includes('--open');
let projectDir = args.find((a, i) => !a.startsWith('--') && !['--port'].includes(args[i - 1]));
projectDir = projectDir ? path.resolve(projectDir) : undefined;

const MIME = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

/** URL prefix → folder it is served from. */
const STATIC = [
  ['/vendor/three/', path.join(here, 'node_modules/three/build')],
  ['/vendor/three-addons/', path.join(here, 'node_modules/three/examples/jsm')],
  ['/music/', path.join(here, 'music')],
  ['/kit/preview/', path.join(here, 'node_modules/@nodegx/preview/dist/browser')],
  ['/runtime/', path.join(here, 'node_modules/@nodegx/preview/dist/external/deploy')],
  ['/kit/canvas-look/', path.join(here, 'node_modules/@nodegx/canvas-look/dist')],
  ['/core/', path.join(here, 'core')],
  ['/', path.join(here, 'public')]
];

function openProject(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error(`${abs} is not a folder.`);
  const files = diskFiles(abs);
  if (!isV2Project(files)) throw new Error(`${abs} is not a NodeGX project: it has no nodegx.project.json or components/_registry.json.`);
  projectDir = abs;
}

/** Every text file of the project, path → text: what the in-page preview renders. */
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

function projectPayload() {
  const store = new V2ProjectStore(diskFiles(projectDir));
  const project = store.readProjectFile() ?? {};
  return {
    dir: projectDir,
    name: project.name ?? path.basename(projectDir),
    formatVersion: project.version,
    components: readProject(store),
    tree: projectTree(projectDir)
  };
}

function revisions() {
  const store = new V2ProjectStore(diskFiles(projectDir));
  const out = {};
  for (const c of readProject(store)) out[c.key] = c.revision;
  return out;
}

/** The ports node-spec gives a node with these params and this context; `known: false` when it has no spec. */
function portsOf({ type, parameters, context }) {
  const spec = specFor(type);
  if (!spec) return { known: false, ports: [] };
  try {
    return { known: true, ports: drawnPorts(spec, parameters ?? {}, context ?? {}) };
  } catch (err) {
    // A spec that needs more of the project than the page sent: the declared ports alone.
    try {
      return { known: true, partial: err.message, ports: drawnPorts(spec, parameters ?? {}, {}) };
    } catch (err2) {
      return { known: true, partial: err2.message, ports: [] };
    }
  }
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
    let rel = url.slice(prefix.length) || 'index.html';
    const abs = path.join(dir, rel);
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
      if (!projectDir) return send(res, 200, { dir: null });
      return send(res, 200, projectPayload());
    }
    if (url === '/api/open' && req.method === 'POST') {
      const { dir } = await readBody(req);
      openProject(dir);
      return send(res, 200, projectPayload());
    }
    if (url === '/api/revisions' && req.method === 'GET') {
      return send(res, 200, projectDir ? revisions() : {});
    }
    if (url === '/api/music' && req.method === 'GET') {
      // A track of the person's own in editor/music/ plays instead of the built-in chiptune.
      const dir = path.join(here, 'music');
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mp3|ogg|wav|m4a|aac|flac|webm)$/i.test(f)).sort() : [];
      return send(res, 200, files);
    }
    if (url === '/api/types' && req.method === 'GET') {
      return send(res, 200, Object.keys(specs).sort());
    }
    if (url === '/api/ports' && req.method === 'POST') {
      const body = await readBody(req);
      if (Array.isArray(body.items)) {
        // Many nodes at once, as [name, plug, type] triples: what the map needs to colour wires.
        return send(res, 200, body.items.map((item) => {
          const r = portsOf(item);
          return r.known ? r.ports.map((p) => [p.name, p.plug, p.type]) : null;
        }));
      }
      return send(res, 200, portsOf(body));
    }
    if (url === '/api/save' && req.method === 'POST') {
      if (!projectDir) return send(res, 400, { error: 'No project is open.' });
      const { changes } = await readBody(req);
      const result = commit(new V2ProjectStore(diskFiles(projectDir)), changes ?? []);
      result.validation = validateStructure(projectTree(projectDir));
      result.tree = projectTree(projectDir);
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
  console.log(`NodeGX map editor on ${url}${projectDir ? ` — ${projectDir}` : ' — no project yet: open one in the page'}`);
  if (shouldOpen) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const a = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(cmd, a, { stdio: 'ignore', detached: true }).unref();
  }
});
