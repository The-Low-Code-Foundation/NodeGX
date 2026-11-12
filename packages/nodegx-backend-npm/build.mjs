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
 *   dist/cloudflare-deploy.cjs   `deployCloudflare.ts` and what it imports, one file
 *   dist/worker/worker.mjs       `worker.ts` and the whole backend, the app's two modules left as imports, built by
 *                                the deploy's OWN `bundleWorker`; the deploy copies it (`NODEGX_CLOUDFLARE_WORKER`,
 *                                set by the bin) instead of bundling
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
 * Both files come from `noodl-mcp/build-cloudflare-copy.mjs` (P135 ODT-003), which builds the same pair for
 * `@nodegx/mcp`, so Claude Desktop's extension deploys with no bundler too. The deploy exports what the bin reaches
 * (`main`, `wranglerCommand`) and reads `NODEGX_CLOUDFLARE_COMMAND` for its usage line itself: no rewrite of its text.
 */
import { mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

import { nodeModulesThroughLink } from '../noodl-mcp/build-common.mjs';
import { buildCloudBundle } from '../noodl-mcp/build-cloud-bundle.mjs';
import { buildCloudflareDeploy } from '../noodl-mcp/build-cloudflare-copy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..', 'nodegx-backend');
const CF = path.join(BACKEND, 'cloudflare');
const DIST = path.join(HERE, 'dist');
const started = Date.now();

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const node = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', sourcemap: false, logLevel: 'warning', absWorkingDir: HERE };
const graph = {};
const cf = await buildCloudflareDeploy({ deploy: path.join(DIST, 'cloudflare-deploy.cjs'), worker: path.join(DIST, 'worker', 'worker.mjs'), root: HERE });
graph['deployCloudflare.ts'] = cf.deployInputs;
const r = await esbuild.build({ ...node, entryPoints: [path.join(CF, 'domainCommand.ts')], outfile: path.join(DIST, 'cloudflare-domain.cjs'), plugins: [nodeModulesThroughLink], metafile: true });
graph['domainCommand.ts'] = Object.keys(r.metafile.inputs);

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
