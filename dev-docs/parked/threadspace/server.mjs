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
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`threadspace at ${url}`);
  if (args.includes('--open')) exec(`open ${url}`);
});
