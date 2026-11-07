#!/usr/bin/env node
/**
 * `@nodegx/backend` — the Cloudflare deploy from an npm install (npm's prepack; `npm run build` for the same in place).
 *
 * The deploy's code lives in `packages/nodegx-backend/cloudflare/` beside what it reuses (the code printer in
 * `noodl-runtime`, the editor's cloud-function push, the preview's viewer classifier, the backend's own esbuild
 * settings). In a checkout `cloudflare/deploy.mjs` bundles it with the repo's esbuild on every run, and bundles the
 * Worker (the whole backend) on every deploy. An install has no checkout and no esbuild, so everything that is not the
 * app's own is built HERE, once, before the tarball exists:
 *
 *   dist/cloudflare-deploy.cjs   `deployCloudflare.ts` and what it imports, one file; its `require('esbuild')` is
 *                                `src/prebuilt-worker.cjs` (copies the Worker below), and the backend build settings it
 *                                reads at `<its folder>/../scripts/build.js` are `dist/scripts/build.js` (a banner, empty:
 *                                the prebuilt Worker has the real one)
 *   dist/cloudflare-domain.cjs   `domainCommand.ts` (find, check and buy a name; the email set-up)
 *   dist/worker/worker.mjs       `worker.ts` and the whole backend, the app's two modules left as imports, built by
 *                                the deploy's OWN `buildWorker` (one definition of the Worker), run from a pack-time
 *                                bundle of the same file that keeps the real esbuild
 *   dist/cloud-bundle.cjs        the editor's cloud-function bundler (`@nodegx/mcp` ships the same file), and the
 *                                `dist/package.json` it needs beside it
 *
 * The site is not built here: the deploy runs `nodegx deploy` (`@nodegx/export`) over `@nodegx/preview`'s engine and
 * its production viewer, both dependencies, both on npm.
 *
 * Not `packages/nodegx-backend` renamed: that package is the service the editor, `@nodegx/mcp` and `@nodegx/preview`
 * bundle by path, its dependencies are `file:` links npm cannot publish, and its `dist/` is the one a running editor
 * reads. This package owns no source; it is the published face of the deploy.
 *
 * 🔴 It edits nothing in `cloudflare/` (a peer phase works there). Two things the deploy keeps to itself are reached at
 * BUNDLE time instead: `buildWorker` and `wranglerCommand` are exported by a line appended to the bundled copy of
 * `deployCloudflare.ts`, and its usage line names `NODEGX_CLOUDFLARE_COMMAND` (the bin's spelling). Both refuse the
 * build when the text they rely on is gone, so a change there is seen at the next pack, not by a stranger.
 */
import { copyFileSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

import { nodeModulesThroughLink } from '../noodl-mcp/build-common.mjs';
import { buildCloudBundle } from '../noodl-mcp/build-cloud-bundle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..', 'nodegx-backend');
const CF = path.join(BACKEND, 'cloudflare');
const DIST = path.join(HERE, 'dist');
const require = createRequire(import.meta.url);
const started = Date.now();

rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, 'worker'), { recursive: true });
mkdirSync(path.join(DIST, 'scripts'), { recursive: true });

/** The bundled copy of `deployCloudflare.ts`: two private functions exported, the usage line naming the bin. */
const deployCopy = {
  name: 'nodegx-backend-deploy-copy',
  setup(b) {
    b.onLoad({ filter: /[\\/]cloudflare[\\/]deployCloudflare\.ts$/ }, (a) => {
      let text = readFileSync(a.path, 'utf8');
      const usage = 'const USAGE = `usage: deploy.mjs <project>';
      if (!text.includes(usage)) throw new Error(`deployCloudflare.ts no longer has "${usage}": update build.mjs`);
      text = text.replace(usage, "const USAGE = `usage: ${process.env.NODEGX_CLOUDFLARE_COMMAND || 'deploy.mjs'} <project>");
      // esbuild refuses an export of a name the file no longer defines: the pack stops, by name.
      text += '\nexport { buildWorker as __nodegxBuildWorker, wranglerCommand as __nodegxWranglerCommand };\n';
      return { contents: text, loader: 'ts' };
    });
  }
};

const node = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', sourcemap: false, logLevel: 'warning', absWorkingDir: HERE };
const graph = {};
const deployEntry = path.join(CF, 'deployCloudflare.ts');
// Shipped: esbuild is the prebuilt-Worker copier.
let r = await esbuild.build({
  ...node,
  entryPoints: [deployEntry],
  outfile: path.join(DIST, 'cloudflare-deploy.cjs'),
  alias: { esbuild: path.join(HERE, 'src', 'prebuilt-worker.cjs') },
  plugins: [deployCopy, nodeModulesThroughLink],
  metafile: true
});
graph['deployCloudflare.ts'] = Object.keys(r.metafile.inputs);
r = await esbuild.build({ ...node, entryPoints: [path.join(CF, 'domainCommand.ts')], outfile: path.join(DIST, 'cloudflare-domain.cjs'), plugins: [nodeModulesThroughLink], metafile: true });
graph['domainCommand.ts'] = Object.keys(r.metafile.inputs);
writeFileSync(
  path.join(DIST, 'scripts', 'build.js'),
  "// The backend build settings the installed deploy reads (see build.mjs): only the banner, empty; the prebuilt Worker has the real one.\nmodule.exports = { shared: { banner: { js: '' } } };\n"
);

// The Worker, by the deploy's own buildWorker, from a pack-time copy that keeps the real esbuild.
// Inside this package (gitignored), so the bundle's `require('esbuild')` finds the repo's.
const scratch = path.join(HERE, '.pack');
rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });
try {
  const packTime = path.join(scratch, 'deploy.cjs');
  await esbuild.build({ ...node, entryPoints: [deployEntry], outfile: packTime, external: ['esbuild'], plugins: [deployCopy] });
  const { buildAdminApp } = require(path.join(BACKEND, 'scripts', 'build-admin-app.js'));
  await buildAdminApp();
  process.env.NODEGX_CLOUDFLARE_SRC = CF;
  delete process.env.NODEGX_CLOUDFLARE_WORKER;
  // Run from this folder, so the paths esbuild writes into the bundle's comments are relative to it.
  const cwd = process.cwd();
  process.chdir(HERE);
  try {
    const { __nodegxBuildWorker } = require(packTime);
    await __nodegxBuildWorker(path.join(scratch, 'worker'), { appId: 'x', appName: 'x', policy: null, automations: null }, '');
  } finally {
    process.chdir(cwd);
  }
  // A worktree's node_modules are links: name them through the link, as nodeModulesThroughLink does for the others.
  const link = path.resolve(HERE, '..', '..', 'node_modules');
  let worker = readFileSync(path.join(scratch, 'worker', 'worker.mjs'), 'utf8');
  try {
    const real = path.dirname(realpathSync(path.join(link, 'esbuild')));
    if (real !== link) worker = worker.split(path.relative(HERE, real) + '/').join(path.relative(HERE, link) + '/');
  } catch {
    /* no esbuild link: nothing to rename */
  }
  writeFileSync(path.join(DIST, 'worker', 'worker.mjs'), worker);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
// The backend is MIT (what the app runs on); its licence goes with it, as in @nodegx/mcp's dist/backend.
copyFileSync(path.join(BACKEND, 'LICENSE'), path.join(DIST, 'worker', 'LICENSE'));

await buildCloudBundle(path.join(DIST, 'cloud-bundle.cjs'), 'error');

const mb = (f) => (statSync(path.join(DIST, f)).size / 1e6).toFixed(2);
for (const f of ['cloudflare-deploy.cjs', 'cloudflare-domain.cjs', 'worker/worker.mjs', 'cloud-bundle.cjs']) console.log(`  dist/${f}  ${mb(f)} MB`);
for (const [entry, inputs] of Object.entries(graph)) {
  const by = {};
  for (const p of inputs) {
    const m = /(?:^|\/)packages\/([^/]+)\//.exec(path.resolve(HERE, p));
    const k = m ? m[1] : p;
    by[k] = (by[k] || 0) + 1;
  }
  console.log(`  ${entry} imports: ${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
console.log(`@nodegx/backend build: ${((Date.now() - started) / 1000).toFixed(1)} s`);
