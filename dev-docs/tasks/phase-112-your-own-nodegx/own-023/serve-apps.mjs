// OWN-023 §5 / C5: the three apps under letters (K, M, R), each run the way its own folder says, on a fixed port, from
// a COPY (apps/<letter>) so grading and playing never touch the build as built (rounds/<arm>/work/music). The map is
// arms.json in the gallery folder; this script reads it and prints letters and URLs only.
//   node serve-apps.mjs serve | stop | list
// Gallery: ~/vscode_projects/NodeGX test projects/OWN-023 apps/  (apps/<L>, homes/<L>, logs/, pids.json)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const G = path.join(process.env.HOME, 'vscode_projects', 'NodeGX test projects', 'OWN-023 apps');
const PORTS = { K: 5101, M: 5102, R: 5103 };
const { map } = JSON.parse(fs.readFileSync(path.join(G, 'arms.json'), 'utf8'));
const PIDS = path.join(G, 'pids.json');
const cmd = process.argv[2];
const load = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

for (const pid of cmd === 'list' ? [] : load(PIDS, [])) try { process.kill(pid, 'SIGTERM'); } catch {}
if (cmd === 'stop') { fs.writeFileSync(PIDS, '[]\n'); console.log('stopped'); process.exit(0); }
if (cmd === 'list') { for (const l of Object.keys(PORTS)) console.log(`${l}  http://localhost:${PORTS[l]}`); process.exit(0); }
if (cmd !== 'serve') throw new Error('usage: serve-apps.mjs serve|stop|list');

fs.mkdirSync(path.join(G, 'logs'), { recursive: true });
const pids = [];
const nodeDir = path.dirname(process.execPath); // Node 22 (A's README asks ≥ 22.13; the agents' shell had 20.11)
for (const [L, arm] of Object.entries(map)) {
  const src = path.join(G, 'rounds', arm, 'work', 'music');
  const app = path.join(G, 'apps', L);
  const home = path.join(G, 'homes', L);
  if (!fs.existsSync(app)) {
    fs.cpSync(src, app, { recursive: true, verbatimSymlinks: true });
    fs.mkdirSync(home, { recursive: true });
    const backends = path.join(G, 'rounds', arm, 'home', '.noodl');
    if (fs.existsSync(backends)) fs.cpSync(backends, path.join(home, '.noodl'), { recursive: true });
  }
  const env = { ...process.env, HOME: home, PORT: String(PORTS[L]), PATH: `${nodeDir}:${process.env.PATH}`, BROWSER: 'none', npm_config_cache: path.join(G, '.npm') };
  for (const k of Object.keys(env)) if (/^(NODEGX_|NOODL_|CLAUDE)/.test(k) || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
  let command, args, cwd = app;
  const proj = fs.readdirSync(app).find((d) => fs.existsSync(path.join(app, d, 'nodegx.project.json')));
  if (proj) {
    command = 'npx'; args = ['-y', '--package=@nodegx/preview@0.2.2', 'noodl-preview', path.join(app, proj), '--port', String(PORTS[L]), '--no-watch', '--host', '0.0.0.0'];
    // --host: so it opens on a phone on the same Wi-Fi like the other two (the folder's own docs don't say how —
    // a row, not a lab fix). Off loopback the preview mints a token; the URL with it is in logs/<L>.log.
  } else if (fs.existsSync(path.join(app, 'next.config.ts')) || fs.existsSync(path.join(app, 'next.config.js'))) {
    // Its README: `npm run setup` (done by the build: database, .env.local, sample data), then `npm run dev`
    // (`next dev -p 3000`) — the same, on this letter's port. It left no production build (`next start` refuses).
    command = 'npx'; args = ['next', 'dev', '-p', String(PORTS[L])];
  } else {
    command = 'npm'; args = ['start'];
  }
  const out = fs.openSync(path.join(G, 'logs', `${L}.log`), 'w');
  const p = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', out, out] });
  p.unref();
  pids.push(-p.pid);
  console.log(`${L}  http://localhost:${PORTS[L]}`);
}
fs.writeFileSync(PIDS, JSON.stringify(pids) + '\n');
