// A static server for the game: `public/` at /, three.js out of node_modules at /vendor/.
//   node server.mjs [--port 8787] [--open]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8787;
const MOUNTS = [
  ['/vendor/three/', path.join(here, 'node_modules/three/build')],
  ['/vendor/three-addons/', path.join(here, 'node_modules/three/examples/jsm')],
  ['/', path.join(here, 'public')]
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // The shipyard saves a design here: POST /api/design/<id> { values } → public/ships/<id>.json, which the game reads.
  const design = /^\/api\/design\/([a-z0-9-]{1,40})$/.exec(url);
  if (design && req.method === 'POST') return saveDesign(design[1], req, res);
  for (const [prefix, dir] of MOUNTS) {
    if (!url.startsWith(prefix)) continue;
    let file = path.join(dir, url.slice(prefix.length));
    if (!file.startsWith(dir)) break;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) continue;
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});
function saveDesign(id, req, res) {
  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 200_000) req.destroy();
  });
  req.on('end', () => {
    try {
      const { values } = JSON.parse(body);
      if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('no values');
      const dir = path.join(here, 'public/ships');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${id}.json`);
      fs.writeFileSync(file, JSON.stringify({ values, savedAt: new Date().toISOString() }, null, 2) + '\n');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, file: path.relative(here, file) }));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e.message ?? e) }));
    }
  });
}

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`threadspace at ${url}`);
  if (args.includes('--open')) exec(`open ${url}`);
});
