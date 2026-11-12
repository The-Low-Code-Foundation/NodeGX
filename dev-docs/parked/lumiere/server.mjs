// A static server for Château Lumière: `public/` at /, three.js and three-vrm out of node_modules at /vendor/.
//   node server.mjs [--port 8812] [--open] [--lan]
// --lan listens on every interface, so a tablet on the same Wi-Fi can open http://<this-mac's-ip>:8812/
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8812;
const host = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const MOUNTS = [
  ['/vendor/three/', path.join(here, 'node_modules/three/build')],
  ['/vendor/three-addons/', path.join(here, 'node_modules/three/examples/jsm')],
  ['/vendor/three-vrm/', path.join(here, 'node_modules/@pixiv/three-vrm/lib')],
  ['/', path.join(here, 'public')]
];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.vrm': 'model/gltf-binary',
  '.bin': 'application/octet-stream', '.fbx': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg'
};

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
server.listen(port, host, () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Château Lumière at ${url}`);
  if (host === '0.0.0.0') {
    for (const nets of Object.values(os.networkInterfaces()))
      for (const n of nets ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`  on the LAN: http://${n.address}:${port}/`);
  }
  if (args.includes('--open')) exec(`open ${url}`);
});
