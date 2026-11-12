// The game's server: this folder, as it is, at http://127.0.0.1:8800/. One thing it does besides serving files: a
// design saved in the game (kit/design.mjs) arrives as POST /__design/<kind>/<id> and is written to
// design/<kind>/<id>.json, so a person's changes live in files beside the code, never in the browser.
//   node tools/serve.mjs [--port 8800] [--lan]
// --lan listens on every interface, so a tablet on the same Wi-Fi can open the game.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// The game's folder: this one, unless --root names another (the kit's own fixture is served that way).
let ROOT = KIT;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

function body(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) return req.destroy(), reject(new Error('too big'));
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const answer = (res, status, data) => (res.writeHead(status, { 'content-type': 'application/json' }), res.end(JSON.stringify(data)));

// POST /__design/<kind>/<id> { values } → design/<kind>/<id>.json = { values, savedAt }. An empty `values` deletes the
// file (nothing differs from the declaration any more).
async function saveDesign(kind, id, req, res) {
  try {
    const { values } = JSON.parse(await body(req, 1_000_000));
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('no values');
    const file = path.join(ROOT, 'design', kind, `${id}.json`);
    if (!Object.keys(values).length) fs.rmSync(file, { force: true });
    else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ values, savedAt: new Date().toISOString() }, null, 2) + '\n');
    }
    answer(res, 200, { ok: true, file: path.relative(ROOT, file) });
  } catch (e) {
    answer(res, 400, { ok: false, error: String(e.message ?? e) });
  }
}

// mounts: [[url prefix, folder]] tried in order before the folder itself; posts: [[RegExp, (match, req, res) => …]].
export function serve({ port = 8800, lan = false, mounts = [], posts = [], name = 'the game', root = KIT } = {}) {
  ROOT = path.resolve(root);
  const all = [...mounts, ['/', ROOT]];
  const routes = [[/^\/__design\/([a-z0-9-]{1,40})\/([a-z0-9-]{1,60})$/, (m, req, res) => saveDesign(m[1], m[2], req, res)], ...posts];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // The files in places/, for kit/place.mjs: a new level is found without any other file changing.
    if (url === '/__list/places') {
      const dir = path.join(ROOT, 'places');
      return answer(res, 200, fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.m?js$/.test(f)).sort() : []);
    }
    if (req.method === 'POST') {
      for (const [re, fn] of routes) {
        const m = re.exec(url);
        if (m) return fn(m, req, res);
      }
      return answer(res, 404, { ok: false, error: 'no such route' });
    }
    for (const [prefix, dir] of all) {
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
  server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
    console.log(`${name} at http://127.0.0.1:${port}/`);
    if (lan)
      for (const nets of Object.values(os.networkInterfaces()))
        for (const n of nets ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`  on the LAN: http://${n.address}:${port}/`);
  });
  return server;
}

export { body, answer, ROOT };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : KIT;
  // A game served from somewhere else still reaches the kit, three.js and the people.
  const mounts = root === KIT ? [] : ['kit', 'vendor', 'assets', 'tools'].map((d) => [`/${d}/`, path.join(KIT, d)]);
  serve({ port: Number(args[args.indexOf('--port') + 1]) || 8800, lan: args.includes('--lan'), root, mounts });
}
