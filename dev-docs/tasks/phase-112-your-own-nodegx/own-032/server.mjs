// OWN-032 — the workbench's local server (§3d). Serves the viewer and the runs; the arm and surgery routes join it as
// they are built. Local only: it will drive Ollama and Chrome, which a published page cannot reach.
//
//   node server.mjs [--port 8732]   then open http://127.0.0.1:8732/?t=runs/view-G-puppy-s0
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const PORT = Number(argv[argv.indexOf('--port') + 1] || 8732);
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.js': 'text/javascript', '.mjs': 'text/javascript' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/runs') {
    const list = fs.readdirSync(path.join(HERE, 'runs')).filter((d) => fs.existsSync(path.join(HERE, 'runs', d, 'timeline.json')));
    res.writeHead(200, { 'Content-Type': TYPES['.json'] });
    return res.end(JSON.stringify(list));
  }
  const file = path.join(HERE, url === '/' ? 'viewer.html' : url);
  if (!file.startsWith(HERE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`workbench on http://127.0.0.1:${PORT}/?t=runs/view-G-puppy-s0`));
