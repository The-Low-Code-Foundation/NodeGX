// OWN-019 s4 (Richard, 2026-10-14): "I'd like a locally running version of every app Mistral builds to evaluate,
// as we go along, and summarised at the end." Every round's app is COPIED out of the session scratchpad (which can
// vanish) into one gallery folder, served by the round's own PACKED preview on a fixed port, and listed on an index
// page with its brief, kit, hour, grade, cost and the grader's screenshots.
//
//   node gallery.mjs add <round> <round-root|app-dir> --tgz <tgz-dir> --brief <name> [--model "GLM-5.3 · Vibe"] [--grade <grade.json>] [--note "…"]
//   node gallery.mjs serve      start (or restart) every app's preview and the index, detached; prints the URLs
//   node gallery.mjs stop       stop them (by the pids this script recorded, never by name)
//   node gallery.mjs list
//
// Gallery: ~/vscode_projects/NodeGX test projects/OWN-019 Mistral apps/ — apps.json, <round>/<app>, tgz/<kit>/,
// shots/<round>/, logs/, pids.json. Index on http://localhost:4800, apps from 4801 in the order added.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const GALLERY = path.join(process.env.HOME, 'vscode_projects', 'NodeGX test projects', 'OWN-019 Mistral apps');
const INDEX_PORT = 4800;
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
fs.mkdirSync(GALLERY, { recursive: true });
const DB = path.join(GALLERY, 'apps.json');
const PIDS = path.join(GALLERY, 'pids.json');
const load = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const apps = load(DB, []);
const save = () => fs.writeFileSync(DB, JSON.stringify(apps, null, 2) + '\n');

const findApp = (dir, depth = 0) => {
  if (fs.existsSync(path.join(dir, 'nodegx.project.json'))) return dir;
  if (depth > 3) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || ['home', 'node_modules', 'grade', 'calls'].includes(e.name) || e.name.startsWith('.')) continue;
    const hit = findApp(path.join(dir, e.name), depth + 1);
    if (hit) return hit;
  }
  return null;
};

if (cmd === 'add') {
  const [round, src] = rest;
  const app = findApp(path.resolve(src));
  if (!round || !app) throw new Error('usage: gallery.mjs add <round> <round-root|app-dir> --tgz <tgz-dir> --brief <name>');
  const tgzDir = path.resolve(opt('--tgz', ''));
  const kit = path.basename(tgzDir);
  if (!fs.existsSync(path.join(tgzDir, 'nodegx-preview-0.2.0.tgz'))) throw new Error(`no preview tarball in ${tgzDir}`);
  const kitDir = path.join(GALLERY, 'tgz', kit);
  if (!fs.existsSync(kitDir)) fs.cpSync(tgzDir, kitDir, { recursive: true, filter: (s) => !/\.log$/.test(s) });
  const dest = path.join(GALLERY, round, path.basename(app));
  fs.rmSync(path.join(GALLERY, round), { recursive: true, force: true });
  fs.cpSync(app, dest, { recursive: true, filter: (s) => !/[\\/](\.previews|grade|node_modules[\\/]\.cache)([\\/]|$)/.test(s) });
  const gradeFile = opt('--grade') || [path.join(path.resolve(src), 'grade', 'grade.json'), path.join(app, 'grade', 'grade.json')].find((f) => fs.existsSync(f));
  const grade = gradeFile ? load(gradeFile, null) : null;
  if (gradeFile) {
    const shots = path.join(GALLERY, 'shots', round);
    fs.rmSync(shots, { recursive: true, force: true });
    fs.mkdirSync(shots, { recursive: true });
    for (const f of fs.readdirSync(path.dirname(gradeFile))) if (f.endsWith('.png')) fs.copyFileSync(path.join(path.dirname(gradeFile), f), path.join(shots, f));
  }
  const prev = apps.findIndex((a) => a.round === round);
  const entry = {
    round,
    brief: opt('--brief', '?'),
    model: opt('--model', 'Mistral Large 4 · Vibe'),
    kit,
    app: path.relative(GALLERY, dest),
    port: prev >= 0 ? apps[prev].port : INDEX_PORT + 1 + apps.length,
    score: grade?.score ?? null,
    failed: grade ? Object.entries(grade.checks).filter(([, c]) => !c.ok).map(([k]) => k) : null,
    note: opt('--note', ''),
    added: new Date().toISOString()
  };
  if (prev >= 0) apps[prev] = entry; else apps.push(entry);
  save();
  console.log(`added ${round} → ${dest} (port ${entry.port}, ${entry.score ?? 'ungraded'})`);
} else if (cmd === 'serve' || cmd === 'stop') {
  for (const pid of load(PIDS, [])) try { process.kill(pid); } catch {}
  fs.writeFileSync(PIDS, '[]\n');
  if (cmd === 'stop') { console.log('stopped'); process.exit(0); }
  const logs = path.join(GALLERY, 'logs');
  fs.mkdirSync(logs, { recursive: true });
  const home = path.join(GALLERY, '.home');
  fs.mkdirSync(home, { recursive: true });
  const env = { ...process.env, HOME: home, npm_config_cache: path.join(home, '.npm'), TMPDIR: home };
  for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
  const pids = [];
  for (const a of apps) {
    const out = fs.openSync(path.join(logs, `${a.round}.log`), 'w');
    const p = spawn('npx', ['-y', `--package=${path.join(GALLERY, 'tgz', a.kit, 'nodegx-preview-0.2.0.tgz')}`, 'noodl-preview', path.join(GALLERY, a.app), '--port', String(a.port), '--no-watch'],
      { env, cwd: home, detached: true, stdio: ['ignore', out, out] });
    p.unref();
    pids.push(-p.pid); // the process group: npx and the server it starts
  }
  const idx = spawn(process.execPath, [new URL(import.meta.url).pathname, 'index-server'], { detached: true, stdio: 'ignore' });
  idx.unref();
  pids.push(idx.pid);
  fs.writeFileSync(PIDS, JSON.stringify(pids) + '\n');
  console.log(`index  http://localhost:${INDEX_PORT}`);
  for (const a of apps) console.log(`${a.round.padEnd(6)} http://localhost:${a.port}  ${a.brief}  ${a.score ?? ''}`);
} else if (cmd === 'index-server') {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  http.createServer((req, res) => {
    const list = load(DB, []);
    const m = req.url.match(/^\/shots\/([\w-]+)\/([\w.-]+\.png)$/);
    if (m) {
      const f = path.join(GALLERY, 'shots', m[1], m[2]);
      if (fs.existsSync(f)) { res.writeHead(200, { 'content-type': 'image/png' }); return fs.createReadStream(f).pipe(res); }
      res.writeHead(404); return res.end();
    }
    const rows = list.map((a) => {
      const shots = fs.existsSync(path.join(GALLERY, 'shots', a.round)) ? ['phone.png', 'laptop.png', '1-top.png'].filter((f) => fs.existsSync(path.join(GALLERY, 'shots', a.round, f))) : [];
      return `<tr><td><b>${esc(a.round)}</b></td><td>${esc(a.model ?? 'Mistral Large 4 · Vibe')}</td><td>${esc(a.brief)}</td><td>${esc(a.kit)}</td><td>${esc(a.score ?? '—')}${a.failed?.length ? `<br><small>✗ ${esc(a.failed.join(', '))}</small>` : ''}</td>
        <td><a href="http://localhost:${a.port}" target="_blank">open :${a.port}</a></td><td>${shots.map((f) => `<a href="/shots/${a.round}/${f}" target="_blank">${f.replace('.png', '')}</a>`).join(' · ')}</td><td>${esc(a.note)}</td></tr>`;
    }).join('\n');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>OWN-019 agent apps</title>
<style>body{font:15px/1.5 -apple-system,system-ui,sans-serif;margin:32px;color:#1d1d1f;background:#fafafa}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:10px 12px;border-bottom:1px solid #e5e5e5;text-align:left;vertical-align:top}th{font-size:13px;color:#666}small{color:#b3261e}</style>
<h1>Apps the agents built (OWN-019 s4)</h1><p>Each runs from the round's own packed preview. Graded by the brief's grader; the look is yours to judge.</p>
<table><tr><th>Round</th><th>Agent</th><th>Brief</th><th>Kit</th><th>Grade</th><th>App</th><th>Screens</th><th>Note</th></tr>${rows}</table>`);
  }).listen(INDEX_PORT, '127.0.0.1');
} else if (cmd === 'list') {
  for (const a of apps) console.log(`${a.round.padEnd(6)} :${a.port}  ${a.brief.padEnd(8)} ${a.kit}  ${a.score ?? '—'}  ${a.failed?.join(',') ?? ''}  ${a.note}`);
} else {
  throw new Error('usage: gallery.mjs add|serve|stop|list');
}
