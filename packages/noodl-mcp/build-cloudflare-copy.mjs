#!/usr/bin/env node
/**
 * P135 ODT-003 — the Cloudflare deploy an install of `@nodegx/mcp` runs, with no bundler on the person's machine.
 *
 *   node build-cloudflare-copy.mjs            dist/cloudflare/deploy.cjs and dist/cloudflare/worker.mjs (npm's prepack)
 *   node build-cloudflare-copy.mjs --remove   delete them again (npm's postpack)
 *   … --out <dir>                             build into (or remove) <dir> instead
 *
 * Claude Desktop's extension (the `.mcpb`) is this package and `@nodegx/preview` with a Node binary: no npm, no esbuild,
 * no wrangler, no backend source (P135 README §3 row 1). The deploy (`nodegx-backend/cloudflare/deployCloudflare.ts`)
 * bundled the Worker with esbuild on every run. Nothing in that Worker is the app's own: the app's code goes up as two
 * modules of its own beside it (`printed-code.mjs`, `app.mjs`; ODT-000 (e), live). So it is built HERE, once:
 *
 *   deploy.cjs   the deploy, one file (esbuild left external: only a checkout's deploy reaches it, never an install's)
 *   worker.mjs   `worker.ts` and the whole backend, by the deploy's OWN `bundleWorker`, so there is one definition of
 *                the Worker; the deploy copies it when `NODEGX_CLOUDFLARE_WORKER` names it
 *   LICENSE      the backend's (MIT), which goes with its code
 *
 * The rest of a deploy is already in an install: the cloud-function bundler (`dist/cloud-bundle.cjs`) and the site's
 * engine (`@nodegx/preview`'s `nodegx-deploy.cjs`, `NODEGX_DEPLOY_CLI` in the extension's manifest). The deploy runs
 * the engine itself when there is no `nodegx deploy` command to run.
 *
 * `buildCloudflareDeploy` is exported: `@nodegx/backend`'s pack (`nodegx-backend-npm/build.mjs`) builds the same two
 * files with it.
 */
import { copyFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

import { nodeModulesThroughLink } from './build-common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..', 'nodegx-backend');
const CF = path.join(BACKEND, 'cloudflare');
const require = createRequire(import.meta.url);

/**
 * Build the deploy and the prebuilt Worker.
 *
 * @param {{ deploy: string, worker: string, root: string }} at  the two files to write, and the package folder they
 *   ship in (the paths esbuild writes into comments are made relative to it, as every bundle of this package's are)
 */
export async function buildCloudflareDeploy(at) {
  mkdirSync(path.dirname(at.deploy), { recursive: true });
  mkdirSync(path.dirname(at.worker), { recursive: true });
  const built = await esbuild.build({
    entryPoints: [path.join(CF, 'deployCloudflare.ts')],
    outfile: at.deploy,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: false,
    logLevel: 'warning',
    absWorkingDir: at.root,
    external: ['esbuild'],
    logOverride: { 'direct-eval': 'silent' }, // the runtime's node.ts, which the code printer reaches; never run here
    plugins: [nodeModulesThroughLink],
    metafile: true
  });
  // The Worker, by the deploy just built (its `require('esbuild')` finds the repo's from here), told where its source is.
  const { buildAdminApp } = require(path.join(BACKEND, 'scripts', 'build-admin-app.js'));
  await buildAdminApp();
  const before = { src: process.env.NODEGX_CLOUDFLARE_SRC, cwd: process.cwd() };
  process.env.NODEGX_CLOUDFLARE_SRC = CF;
  process.chdir(at.root);
  try {
    delete require.cache[at.deploy];
    const { bundleWorker } = require(at.deploy);
    if (typeof bundleWorker !== 'function') throw new Error(`${at.deploy} exports no bundleWorker: deployCloudflare.ts changed its seam.`);
    await bundleWorker(at.worker, [nodeModulesThroughLink], esbuild);
  } finally {
    process.chdir(before.cwd);
    if (before.src === undefined) delete process.env.NODEGX_CLOUDFLARE_SRC;
    else process.env.NODEGX_CLOUDFLARE_SRC = before.src;
  }
  copyFileSync(path.join(BACKEND, 'LICENSE'), path.join(path.dirname(at.worker), 'LICENSE'));
  return { deployBytes: statSync(at.deploy).size, workerBytes: statSync(at.worker).size, deployInputs: Object.keys(built.metafile.inputs) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outAt = process.argv.indexOf('--out');
  const OUT = outAt > 0 ? path.resolve(process.argv[outAt + 1]) : path.join(HERE, 'dist', 'cloudflare');
  rmSync(OUT, { recursive: true, force: true });
  if (!process.argv.includes('--remove')) {
    const started = Date.now();
    const sizes = await buildCloudflareDeploy({ deploy: path.join(OUT, 'deploy.cjs'), worker: path.join(OUT, 'worker.mjs'), root: HERE });
    const mb = (n) => (n / 1e6).toFixed(2);
    console.log(
      `build-cloudflare-copy: ${path.relative(process.cwd(), OUT)}/deploy.cjs ${mb(sizes.deployBytes)} MB, worker.mjs ${mb(sizes.workerBytes)} MB ` +
        `(${((Date.now() - started) / 1000).toFixed(1)} s)`
    );
  }
}
