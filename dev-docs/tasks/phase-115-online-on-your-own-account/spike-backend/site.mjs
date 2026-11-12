// HST-006 §8: a NodeGX project's app as the static half of this Worker — the interpreter site `nodegx deploy` writes
// (every node runs, as in the preview), with the PRODUCTION viewer, aimed at this Worker's own backend.
//
//   node site.mjs <project> <https://worker-address> [<production engine folder>]
//
// Why not the plain-HTML export Fixture B used (spike-worker/export-page.mjs): for Fixture C it leaves out Page
// Inputs, Record, Create Record, User, Log In, Log Out and Query Records (its EXPORT-PREFLIGHT.md names all 15), so
// the page would draw and do nothing. The interpreter carries them all.
//
// Why the engine swap: `nodegx deploy` refuses the development viewer in the checkout (16.5 MB, 10.9 MB of it the
// viewer source as a source map) and asks for `npm run build:editor:_viewer`, which runs `npm i` and `lerna clean` on
// a shared checkout. So the viewer's production deploy bundle is built on its own into a scratch folder:
//   OUT_PATH=<dir> npx webpack --config <a config that requires webpack-configs/webpack.deploy.prod.js>
// and its noodl.deploy.js (+ LICENSE) replace the development one here. Without a third argument the development
// engine ships, said loudly.
//
// From a copy of the project, with: the backend address set to the Worker's (it lands in nodegx-config.json), and
// nothing private published — `.accounts.json` and `MUST.md` are removed, and the site is searched for the passwords.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [projectArg, address, engineDir] = process.argv.slice(2);
if (!projectArg || !address?.startsWith('https://')) {
  console.error('usage: node site.mjs <project> <https://worker-address> [<production engine folder>]');
  process.exit(2);
}
const project = resolve(projectArg);
const cli = fileURLToPath(new URL('../../../../packages/nodegx-export/dist/cli.mjs', import.meta.url));
const publicDir = fileURLToPath(new URL('./public', import.meta.url));
const work = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'hst-site-'));
const copy = join(work, 'project');
cpSync(project, copy, { recursive: true });

const passwords = existsSync(join(copy, '.accounts.json'))
  ? Object.values(JSON.parse(readFileSync(join(copy, '.accounts.json'), 'utf8'))).map((a) => a.password)
  : [];
for (const f of ['.accounts.json', 'MUST.md', '.previews']) rmSync(join(copy, f), { recursive: true, force: true });

const file = join(copy, 'nodegx.project.json');
const p = JSON.parse(readFileSync(file, 'utf8'));
const appId = (p.name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-');
p.metadata = { ...(p.metadata || {}), cloudservices: { endpoint: address, appId, instanceId: appId, type: 'nodegx' } };
writeFileSync(file, JSON.stringify(p, null, 2));

rmSync(publicDir, { recursive: true, force: true });
const run = spawnSync(process.execPath, [cli, 'deploy', copy, publicDir, '--allow-development-engine'], { encoding: 'utf8' });
if (run.status !== 0) throw new Error(`deploy failed (${run.status}):\n${run.stdout}\n${run.stderr}`);
const summary = run.stdout.split('\n').find((l) => l.includes(' deployed to ')) || '(no summary line)';

if (engineDir) {
  for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) cpSync(join(engineDir, f), join(publicDir, f));
} else {
  console.warn('⚠️ no production engine given: this site carries the DEVELOPMENT viewer (its source, readable).');
}
// The deploy's own notes and its local server are for a person with the folder, not for the host.
for (const f of ['DEPLOY.md', 'serve.js', 'package.json', '.nodegx-deploy.json']) rmSync(join(publicDir, f), { force: true });

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const full = join(d, e.name);
    if (e.isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(publicDir);
const leaked = files.filter((f) => passwords.some((pw) => readFileSync(f, 'latin1').includes(pw)));
if (leaked.length) throw new Error(`a test password is in the site: ${leaked.join(', ')}`);
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
const engine = statSync(join(publicDir, 'noodl.deploy.js')).size;
rmSync(work, { recursive: true, force: true });
console.log(summary.trim());
console.log(`public/: ${files.length} files, ${(bytes / 1e6).toFixed(2)} MB (engine ${(engine / 1e6).toFixed(2)} MB, ${engineDir ? 'production' : 'DEVELOPMENT'}); backend ${address}; 0 passwords`);
