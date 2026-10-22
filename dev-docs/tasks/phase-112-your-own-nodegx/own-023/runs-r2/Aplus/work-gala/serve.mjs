// Serve the game on http://localhost:5173 (or PORT). `npm start` from this folder. No build step: the browser loads src/ as modules.
// It also keeps two files OUTSIDE the game folder, in ~/.gala-de-danse (or GALA_DIR): settings.json (the grown-ups'
// settings) and save.json (the school's progress). Installing a new version replaces the folder; these stay.
import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { sanitize } from './src/settings.js';

const ROOT = dirname(fileURLToPath(import.meta.url)), PORT = +(process.env.PORT || 5173);
const DATA = process.env.GALA_DIR || join(homedir(), '.gala-de-danse');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
// the only two files it will ever read or write, and what a file must be to be written
const FILES = {
  '/api/settings': { file: 'settings.json', keep: (o) => sanitize(o).file },
  '/api/save': { file: 'save.json', keep: (o) => (o && typeof o === 'object' && !Array.isArray(o) && o.v === 2 ? o : null) },
};
const MAX = 100 * 1024;
const LOCAL = ['localhost', '127.0.0.1'];

async function api(req, res, spec) {
  // only this machine's page: no other website (Origin), no other name for this address (Host)
  const host = (req.headers.host || '').replace(/:\d+$/, ''), origin = req.headers.origin;
  if (!LOCAL.includes(host) || (origin && !LOCAL.some((h) => origin === `http://${h}:${server.address().port}`))) return send(res, 403);
  const path = join(DATA, spec.file);
  if (req.method === 'GET') {
    // no file yet: `null` (not an error: a first visit is normal)
    let body = 'null'; try { body = await readFile(path); } catch { /* none yet */ }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(body);
    return;
  }
  if (req.method !== 'PUT') return send(res, 405);
  if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return send(res, 415);
  if (+(req.headers['content-length'] || 0) > MAX) return send(res, 413);
  const chunks = []; let size = 0, over = false;
  for await (const c of req) { size += c.length; if (size > MAX) { over = true; break; } chunks.push(c); }
  if (over) return send(res, 413);
  let obj; try { obj = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400); }
  const kept = spec.keep(obj); if (!kept) return send(res, 400);
  try {
    await mkdir(DATA, { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`; // written whole, then swapped in: a crash never leaves half a file
    await writeFile(tmp, JSON.stringify(kept)); await rename(tmp, path);
    send(res, 204);
  } catch { send(res, 500); }
}
const send = (res, code) => { res.writeHead(code, { 'cache-control': 'no-store' }); res.end(); };

const server = http.createServer(async (req, res) => {
  const p = req.url.split('?')[0];
  if (p.startsWith('/api/')) { const spec = FILES[p]; if (!spec) return send(res, 404); return api(req, res, spec); }
  let rel; try { rel = normalize(decodeURIComponent(p)).replace(/^([/\\])+/, '') || 'index.html'; } catch { return send(res, 400); }
  if (rel.startsWith('..')) { res.writeHead(403); res.end(); return; }
  try { const body = await readFile(join(ROOT, rel)); res.writeHead(200, { 'content-type': TYPES[extname(rel)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Le Gala de danse: http://localhost:${server.address().port}  (settings and save in ${DATA})`));
