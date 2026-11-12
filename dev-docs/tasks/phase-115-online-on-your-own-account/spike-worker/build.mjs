// Builds what the Worker bundles from the NodeGX project in ../fixtures/b-newsletter:
//   node build.mjs                      → dist-local/: the cloud functions, for `wrangler dev` (the local stand-in)
//   node build.mjs https://<host>       → dist-deploy/: the cloud functions AND the automations, every API address that
//                                         named the local stand-in (127.0.0.1:8799) aimed at <host> instead
// The cloud functions come from the editor's own bundler (packages/noodl-mcp/dist/cloud-bundle.cjs, the one the
// Deploy button and the MCP's deploy_cloud_functions run), so the Worker serves the same bundle a NodeGX backend would.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LOCAL = 'http://127.0.0.1:8799';
const base = process.argv[2];
if (base !== undefined && !/^https:\/\/[a-z0-9.-]+$/.test(base)) throw new Error('usage: node build.mjs [https://<host>] (no trailing slash)');

const project = fileURLToPath(new URL('../fixtures/b-newsletter', import.meta.url));
const bundler = fileURLToPath(new URL('../../../../packages/noodl-mcp/dist/cloud-bundle.cjs', import.meta.url));
const run = spawnSync(process.execPath, [bundler, project], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
if (run.status !== 0) throw new Error(`the cloud bundler failed:\n${run.stderr}`);
const { bundleName, parts } = JSON.parse(run.stdout);
if (parts.failures.length) throw new Error(`not every cloud function built: ${JSON.stringify(parts.failures)}`);

// SHIM for P115-HST004-BUNDLEDROPS: the bundler drops every wire into an HTTP Request's runtime-made ports (body-*,
// auth-*, …). Put back each wire the project's own connections.json holds and the bundle lost, and say which.
const restored = [];
for (const c of parts.bundle?.components ?? []) {
  const dir = c.name.replace(/^\/#__cloud__\//, '__cloud__/');
  const onDisk = JSON.parse(readFileSync(`${project}/components/${dir}/connections.json`, 'utf8'));
  const key = (s, sp, t, tp) => `${s}.${sp}->${t}.${tp}`;
  const have = new Set(c.connections.map((w) => key(w.sourceId, w.sourcePort, w.targetId, w.targetPort)));
  for (const w of onDisk.connections ?? onDisk) {
    if (have.has(key(w.fromId, w.fromProperty, w.toId, w.toProperty))) continue;
    c.connections.push({ sourceId: w.fromId, sourcePort: w.fromProperty, targetId: w.toId, targetPort: w.toProperty });
    restored.push(`${c.name}: ${key(w.fromId, w.fromProperty, w.toId, w.toProperty)}`);
  }
}
if (restored.length) console.log(`restored ${restored.length} wire(s) the bundler dropped (P115-HST004-BUNDLEDROPS):\n  ${restored.join('\n  ')}`);

const out = new URL(base ? './dist-deploy/' : './dist-local/', import.meta.url);
mkdirSync(out, { recursive: true });
const aim = (text) => (base ? text.split(LOCAL).join(base) : text);
const functions = aim(JSON.stringify(parts.bundle ?? { components: [], settings: {}, metadata: {} }));
writeFileSync(new URL('cloud-bundle.json', out), functions + '\n');
let line = `${bundleName}: ${parts.shipped.length} cloud function(s) (${parts.shipped.join(', ')}), ${functions.length} bytes`;
if (base) {
  const automations = aim(readFileSync(new URL('nodegx.automations.json', `file://${project}/`), 'utf8'));
  writeFileSync(new URL('nodegx.automations.json', out), automations);
  line += `; automations copied; ${LOCAL} → ${base} in both`;
}
console.log(`${fileURLToPath(out)}  ${line}`);
