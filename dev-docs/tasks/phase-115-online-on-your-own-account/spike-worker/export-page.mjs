// Exports the NodeGX project's page as plain HTML into public/, served by the same Worker as its server half:
//   node export-page.mjs                                   (Fixture B → ./public, app id "newsletter")
//   node export-page.mjs <project> <publicDir> <appId>     (any project; HST-006 §8 uses it for Fixture C)
// From a copy of the project (an export reads, but a copy is what this repo's drives use), with two deploy-time edits,
// neither of which belongs in the project itself:
//   1. metadata.cloudservices = { endpoint, appId }: the exporter prints a real client only when the project declares a
//      backend; without one, every Cloud Function node is a stub that fails "No cloud services defined in this project."
//   2. env.js with an EMPTY endpoint, so the page calls /functions/<name> on the origin that served it. ('/' would not
//      do: `${ENDPOINT}/functions/…` would be '//functions/…', a protocol-relative URL to a host called "functions".)
// The export's README.md and EXPORT-PREFLIGHT.md are for a developer and are not published.
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [argProject, argPublic, argAppId] = process.argv.slice(2);
const project = argProject ? resolve(argProject) : fileURLToPath(new URL('../fixtures/b-newsletter', import.meta.url));
const appId = argAppId || 'newsletter';
const cli = fileURLToPath(new URL('../../../../packages/nodegx-export/dist/cli.mjs', import.meta.url));
const publicDir = argPublic ? resolve(argPublic) : fileURLToPath(new URL('./public', import.meta.url));
const work = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'hst-page-'));
const copy = join(work, 'project');
cpSync(project, copy, { recursive: true });
const file = join(copy, 'nodegx.project.json');
const p = JSON.parse(readFileSync(file, 'utf8'));
p.metadata = { ...(p.metadata || {}), cloudservices: { endpoint: 'https://same-origin.invalid', appId } };
writeFileSync(file, JSON.stringify(p, null, 2));

rmSync(publicDir, { recursive: true, force: true });
const run = spawnSync(process.execPath, [cli, 'export', '--target', 'html', copy, publicDir], { encoding: 'utf8' });
process.stdout.write(run.stdout);
if (run.status !== 0) throw new Error(`export failed (${run.status}):\n${run.stderr}`);
writeFileSync(
  join(publicDir, 'env.js'),
  "// Written by spike-worker/export-page.mjs: an empty endpoint, so the page calls /functions/<name> on the origin that\n" +
    `// served it, the Worker beside these files.\nexport const env = { VITE_NODEGX_ENDPOINT: '', VITE_NODEGX_APP_ID: '${appId}' };\n`
);
for (const f of ['README.md', 'EXPORT-PREFLIGHT.md']) rmSync(join(publicDir, f), { force: true });
rmSync(work, { recursive: true, force: true });
console.log(`public/ ready: the page calls its own origin`);
