/**
 * P123 Open Bubble — the server behind `open-bubble.html`, a Bubble-shaped editor built from the kit.
 *
 *   node serve.mjs <project-dir> [--port n]
 *
 *   /                      open-bubble.html
 *   /runtime/*             the deploy runtime (`packages/noodl-editor/src/external/deploy/`, `npm run build:editor:_viewer`)
 *   /preview.js            `@nodegx/preview`'s in-page build (`npm --prefix packages/noodl-preview run build`)
 *   /look.js, /specs.js    `@nodegx/canvas-look` and `@nodegx/node-spec` as ES modules (Orbit's `real/build.sh` builds them)
 *   GET  /api/project      every text file of the project folder as one path → text map, plus the folder's name
 *   POST /api/save         { files: { path: text }, removed: [path] } — written under the project folder, nothing else
 *   ANY  /api/backend/*    forwarded to the project's bound backend (`metadata.cloudservices.endpoint`) with the app id
 *                          header the runtime sends; the Data tab reads rows through it
 *
 * The page holds the project in memory in the kit's own store (`V2ProjectStore` over `memoryFiles`), makes every edit
 * through it, and sends the files it changed here. This file knows nothing about nodes.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..', '..');
const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const projectDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--') && process.argv[process.argv.indexOf(a) - 1] !== '--port') ?? '.');
if (!existsSync(join(projectDir, 'nodegx.project.json'))) {
  console.error(`serve: ${projectDir} has no nodegx.project.json`);
  process.exit(2);
}
const runtimeDir = flag('--runtime') ?? join(repo, 'packages/noodl-editor/src/external/deploy');
const bundle = join(repo, 'packages/noodl-preview/dist/browser/noodl-preview-in-page.js');
const orbit = join(repo, 'dev-docs/tasks/phase-112-your-own-nodegx/prototype/real');
for (const [what, at] of [
  ['the deploy runtime', join(runtimeDir, 'noodl.deploy.js')],
  ['the in-page preview bundle', bundle],
  ['the look module (run prototype/real/build.sh)', join(orbit, 'look.js')],
  ['the specs module (run prototype/real/build.sh)', join(orbit, 'specs.js')]
]) {
  if (!existsSync(at)) {
    console.error(`serve: no ${what} at ${at}`);
    process.exit(2);
  }
}

const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const TEXT = ['.json', '.js', '.css', '.md', '.html', '.txt'];
const SKIP = new Set(['node_modules', '.git', '.nodegx', 'noodl_modules']);

function projectFiles(dir) {
  const files = {};
  const walk = (folder) => {
    for (const name of readdirSync(folder)) {
      if (SKIP.has(name) || name.startsWith('.')) continue;
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (TEXT.includes(extname(name))) files[relative(dir, full).split(sep).join('/')] = readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return files;
}

const under = (root, rel) => {
  const file = resolve(root, rel);
  return file.startsWith(root + sep) || file === root ? file : undefined;
};

function readBody(req) {
  return new Promise((ok, no) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });
}

function backendOf() {
  try {
    const project = JSON.parse(readFileSync(join(projectDir, 'nodegx.project.json'), 'utf8'));
    return project.metadata?.cloudservices ?? null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (status, body, type) => {
    res.writeHead(status, { 'content-type': type ?? types['.json'], 'cache-control': 'no-store' });
    res.end(body);
  };
  const json = (status, value) => send(status, JSON.stringify(value));
  try {
    if (url.pathname === '/') return send(200, readFileSync(join(here, 'open-bubble.html')), types['.html']);
    if (url.pathname === '/preview.js') return send(200, readFileSync(bundle), types['.js']);
    if (url.pathname === '/look.js' || url.pathname === '/specs.js') return send(200, readFileSync(join(orbit, url.pathname.slice(1))), types['.js']);
    if (url.pathname === '/api/project' && req.method === 'GET') {
      return json(200, { dir: projectDir, name: projectDir.split(sep).pop(), files: projectFiles(projectDir), backend: backendOf() });
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const { files = {}, removed = [] } = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const written = [];
      for (const [rel, text] of Object.entries(files)) {
        const file = under(projectDir, rel);
        if (!file || typeof text !== 'string') return json(400, { error: `refused: ${rel}` });
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, text);
        written.push(rel);
      }
      const gone = [];
      for (const rel of removed) {
        const file = under(projectDir, rel);
        if (!file) return json(400, { error: `refused: ${rel}` });
        if (existsSync(file)) {
          rmSync(file, { recursive: true });
          gone.push(rel);
        }
      }
      return json(200, { written, removed: gone });
    }
    if (url.pathname.startsWith('/api/backend/')) {
      const backend = backendOf();
      if (!backend?.endpoint) return json(503, { error: 'This project is not bound to a backend (no metadata.cloudservices.endpoint).' });
      const target = backend.endpoint.replace(/\/$/, '') + url.pathname.slice('/api/backend'.length) + url.search;
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
      let upstream;
      try {
        upstream = await fetch(target, {
          method: req.method,
          headers: { 'X-Parse-Application-Id': backend.appId ?? backend.instanceId ?? '', 'Content-Type': req.headers['content-type'] ?? 'application/json' },
          body
        });
      } catch (err) {
        return json(502, { error: `The backend at ${backend.endpoint} did not answer: ${err.message}` });
      }
      return send(upstream.status, Buffer.from(await upstream.arrayBuffer()), upstream.headers.get('content-type') ?? types['.json']);
    }
    const [root, rel] = url.pathname.startsWith('/runtime/') ? [runtimeDir, url.pathname.slice('/runtime/'.length)] : [here, url.pathname.slice(1)];
    const file = under(root, decodeURIComponent(rel));
    if (file && existsSync(file) && statSync(file).isFile()) return send(200, readFileSync(file), types[extname(file)] ?? 'application/octet-stream');
    // an asset of the project (images the app shows)
    const asset = under(projectDir, decodeURIComponent(url.pathname.slice(1)));
    if (asset && existsSync(asset) && statSync(asset).isFile()) return send(200, readFileSync(asset), types[extname(asset)] ?? 'application/octet-stream');
    res.writeHead(404);
    res.end();
  } catch (err) {
    json(500, { error: err.message });
  }
});
server.listen(Number(flag('--port')) || 0, '127.0.0.1', () => console.log(`open-bubble: http://127.0.0.1:${server.address().port}/  (${projectDir})`));
