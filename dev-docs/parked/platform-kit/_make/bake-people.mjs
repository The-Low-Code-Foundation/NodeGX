// Bakes the crowd sheet and the party models (bake.mjs) in headless Chrome: starts _make/serve.mjs, drives
// /_make/bake.html until it is done, stops the server. Run it outside any sandbox that stops Chrome starting.
//   node _make/bake-people.mjs [--px 128] [--only soldier-f,medic-f]
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const port = 8801;
const server = spawn(process.execPath, [path.join(kit, '_make/serve.mjs'), '--port', String(port)], { stdio: 'inherit' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 800));
const q = new URLSearchParams();
if (opt('--px')) q.set('px', opt('--px'));
if (opt('--only')) q.set('only', opt('--only'));
const r = spawnSync(process.execPath, [path.join(kit, 'tools/drive.mjs'), `http://127.0.0.1:${port}/_make/bake.html?${q}`, path.join(kit, '_make/bake.json'), path.join(kit, 'shots/bake')], { stdio: 'inherit' });
server.kill();
process.exit(r.status ?? 1);
