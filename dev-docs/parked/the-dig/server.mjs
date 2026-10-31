// The Dig's server: `public/` at /, three.js out of node_modules at /vendor/, and a small API over `data/`.
//   node server.mjs [--port 8797] [--open] [--lan]
// `data/` is personal (the day's plants, the answers, the trophies, the cave) and never committed.
//   GET  /api/today            the plants for today: data/plants/<YYYY-MM-DD>.json, else the newest older one, else the sample
//   GET  /api/answers?date=…   the answers given that day
//   POST /api/answer           { date, plantId, text } → appended to data/answers.jsonl (the nightly run reads it)
//   GET  /api/trophies         POST /api/trophies { trophy }
//   GET  /api/save             POST /api/save { … } (the cave's edits, the player, the pack; last write wins)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { checkPlants } from './tools/check-plants.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8797;
const host = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const DATA = process.env.DIG_DATA || path.join(here, 'data');
const MOUNTS = [
  ['/vendor/three/', path.join(here, 'node_modules/three/build')],
  ['/vendor/three-addons/', path.join(here, 'node_modules/three/examples/jsm')],
  ['/', path.join(here, 'public')]
];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

fs.mkdirSync(path.join(DATA, 'plants'), { recursive: true });
const dataFile = (name) => path.join(DATA, name);
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
// The phone's day, not the server's: the client sends its own date.
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

// A plants file that fails the check is skipped (and said so in the log), never shown half-broken.
function usable(file) {
  const day = readJson(file, null);
  const problems = checkPlants(day);
  if (problems.length) console.log(`skipping ${path.basename(file)}: ${problems.slice(0, 3).join('; ')}`);
  return problems.length ? null : day;
}

function today(date) {
  const own = path.join(DATA, 'plants', `${date}.json`);
  const ownDay = fs.existsSync(own) && usable(own);
  if (ownDay) return { date, source: 'nightly', ...ownDay };
  const older = fs
    .readdirSync(path.join(DATA, 'plants'))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) < date)
    .sort()
    .reverse();
  for (const f of older) {
    const d = usable(path.join(DATA, 'plants', f));
    if (d) return { date: f.slice(0, 10), source: 'older', ...d };
  }
  return { date, source: 'sample', ...readJson(path.join(here, 'public', 'sample-plants.json'), {}) };
}

function answers(date) {
  if (!fs.existsSync(dataFile('answers.jsonl'))) return [];
  return fs
    .readFileSync(dataFile('answers.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((a) => a && (!date || a.date === date));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 4e6) reject(new Error('too big'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(s || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function send(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function api(req, res, url) {
  const q = url.searchParams;
  const route = `${req.method} ${url.pathname}`;
  if (route === 'GET /api/today') {
    const date = isDate(q.get('date')) ? q.get('date') : new Date().toISOString().slice(0, 10);
    return send(res, 200, today(date));
  }
  if (route === 'GET /api/answers') return send(res, 200, answers(q.get('date')));
  if (route === 'POST /api/answer') {
    const a = await body(req);
    if (!(isDate(a.date) || a.date === 'sample') || typeof a.plantId !== 'string' || typeof a.text !== 'string' || !a.text.trim())
      return send(res, 400, { error: 'an answer needs date, plantId and text' });
    const row = { at: new Date().toISOString(), date: a.date, plantId: a.plantId, title: a.title ?? '', text: a.text.trim() };
    fs.appendFileSync(dataFile('answers.jsonl'), JSON.stringify(row) + '\n');
    return send(res, 200, row);
  }
  if (route === 'GET /api/trophies') return send(res, 200, readJson(dataFile('trophies.json'), []));
  if (route === 'POST /api/trophies') {
    const { trophy } = await body(req);
    if (!trophy || typeof trophy.id !== 'string') return send(res, 400, { error: 'a trophy needs an id' });
    const all = readJson(dataFile('trophies.json'), []);
    if (!all.some((t) => t.id === trophy.id)) all.push({ ...trophy, at: new Date().toISOString() });
    fs.writeFileSync(dataFile('trophies.json'), JSON.stringify(all, null, 1));
    return send(res, 200, all);
  }
  if (route === 'GET /api/save') return send(res, 200, readJson(dataFile('save.json'), null));
  if (route === 'POST /api/save') {
    const save = await body(req);
    fs.writeFileSync(dataFile('save.json'), JSON.stringify(save));
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'no such route' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try {
      await api(req, res, url);
    } catch (e) {
      send(res, 400, { error: String(e.message || e) });
    }
    return;
  }
  const pathname = decodeURIComponent(url.pathname);
  for (const [prefix, dir] of MOUNTS) {
    if (!pathname.startsWith(prefix)) continue;
    let file = path.join(dir, pathname.slice(prefix.length));
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
  console.log(`the dig at ${url}`);
  if (host === '0.0.0.0') {
    for (const nets of Object.values(os.networkInterfaces()))
      for (const n of nets ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`  on the LAN (the phone): http://${n.address}:${port}/`);
  }
  if (args.includes('--open')) exec(`open ${url}`);
});
