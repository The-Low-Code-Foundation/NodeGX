#!/usr/bin/env node
// The table editor: `npm start` (opens ../todo-list), or `npm start -- <app folder>`.
//
// A local page on 127.0.0.1 and the small API it talks to. The page sends each thing the person does
// as one action (src/actions.mjs) to the one TableSession (src/session.mjs); Save writes through the
// kit's store. Opening a folder reads it and writes nothing.
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { isV2Project } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { TableSession, CellRefusal } from './src/session.mjs';
import { applyAction } from './src/actions.mjs';
import { Vocabulary } from './src/vocabulary.mjs';
import { loadNodeLibrary, NODE_LIBRARY_FILE } from './src/load-vocabulary.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const previewDir = dirname(require.resolve('@nodegx/preview/package.json'));
const previewVersion = JSON.parse(readFileSync(join(previewDir, 'package.json'), 'utf8')).version;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const STATIC = {
  '/kit/preview/': join(previewDir, 'dist', 'browser'),
  '/runtime/': join(previewDir, 'dist', 'external', 'deploy'),
  '/': join(here, 'public')
};

let vocabulary = new Vocabulary({ nodeLibrary: loadNodeLibrary() });
let projectDir;
let session;

function openProject(dir) {
  const abs = resolve(dir);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new CellRefusal(`There is no folder ${abs}.`);
  const files = diskFiles(abs);
  if (!isV2Project(files)) throw new CellRefusal(`${abs} is not a NodeGX app: it has no nodegx.project.json or components/_registry.json.`);
  session = new TableSession(files, { vocabulary });
  projectDir = abs;
}

function projectInfo() {
  if (!session) return { open: false };
  const dirty = new Set(session.dirtyKeys());
  return {
    open: true,
    dir: projectDir,
    name: session.projectName,
    formatVersion: session.formatVersion,
    components: session.componentKeys().map((key) => ({ key, dirty: dirty.has(key), cloud: key.startsWith('#__cloud__/') || key.startsWith('/#__cloud__/') })),
    vocabulary: { runtime: vocabulary.hasRuntime, previewVersion }
  };
}

function send(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
  res.end(text);
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function serveStatic(res, pathname) {
  for (const [prefix, dir] of Object.entries(STATIC)) {
    if (!pathname.startsWith(prefix)) continue;
    const rel = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
    const file = normalize(join(dir, rel));
    if (!file.startsWith(dir + sep) && file !== dir) break;
    if (!existsSync(file) || !statSync(file).isFile()) break;
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
    return true;
  }
  return false;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const q = (k) => url.searchParams.get(k) ?? undefined;
  try {
    if (p === '/api/project' && req.method === 'GET') return send(res, 200, projectInfo());
    if (p === '/api/open' && req.method === 'POST') {
      const { dir, discard } = await body(req);
      if (session?.dirtyKeys().length && !discard) {
        return send(res, 409, { error: `You have unsaved changes in ${session.dirtyKeys().join(', ')}. Save them, or open again to drop them.` });
      }
      openProject(dir);
      return send(res, 200, projectInfo());
    }
    if (!session) return send(res, 400, { error: 'No app is open. Type its folder at the top and press Open.' });
    if (p === '/api/table' && req.method === 'GET') return send(res, 200, session.table(q('component'), { allPorts: q('all') === '1' }));
    if (p === '/api/cell' && req.method === 'GET') return send(res, 200, { text: session.cellText(q('component'), q('node'), q('column')) });
    if (p === '/api/removal' && req.method === 'GET') return send(res, 200, session.removalOf(q('component'), q('node')));
    if (p === '/api/action' && req.method === 'POST') return send(res, 200, { ok: true, ...applyAction(session, await body(req)) });
    if (p === '/api/save' && req.method === 'POST') return send(res, 200, session.save());
    if (p === '/api/node-library' && req.method === 'POST') {
      const { nodeLibrary } = await body(req);
      if (!nodeLibrary || !Array.isArray(nodeLibrary.nodetypes)) return send(res, 400, { error: 'That is not a node library.' });
      mkdirSync(dirname(NODE_LIBRARY_FILE), { recursive: true });
      writeFileSync(NODE_LIBRARY_FILE, JSON.stringify({ from: `@nodegx/preview ${previewVersion}, preview.nodeLibrary`, previewVersion, nodeLibrary }) + '\n');
      vocabulary = new Vocabulary({ nodeLibrary });
      session.vocabulary = vocabulary;
      return send(res, 200, { ok: true, types: nodeLibrary.nodetypes.length });
    }
    return send(res, 404, { error: `No such call: ${req.method} ${p}` });
  } catch (err) {
    if (err instanceof CellRefusal || err?.name === 'FormatRefusal' || err instanceof SyntaxError) return send(res, 422, { error: err.message });
    console.error(err);
    return send(res, 500, { error: `The editor failed: ${err.message}` });
  }
}

export function startServer({ dir, port = 8590, host = '127.0.0.1' } = {}) {
  if (dir) openProject(dir);
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) return void handle(req, res);
    if (req.method === 'GET' && serveStatic(res, pathname)) return;
    res.writeHead(404, { 'content-type': MIME['.txt'] });
    res.end('Not found');
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => ok(server));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name) => args.includes(name);
  const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const dir = args.find((a, i) => !a.startsWith('--') && !['--port', '--host'].includes(args[i - 1])) ?? join(here, '..', 'todo-list');
  const port = Number(value('--port') ?? process.env.PORT ?? 8590);
  try {
    const server = await startServer({ dir, port });
    const url = `http://127.0.0.1:${server.address().port}/`;
    console.log(`NodeGX table editor: ${url}\nEditing ${projectDir}\nNothing is written until you press Save. Ctrl+C stops the editor.`);
    if (!flag('--no-open')) {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
      spawn(opener, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
    }
  } catch (err) {
    console.error(err.code === 'EADDRINUSE' ? `Port ${port} is in use: is the editor already running? Or start it with --port <n>.` : err.message);
    process.exit(1);
  }
}
