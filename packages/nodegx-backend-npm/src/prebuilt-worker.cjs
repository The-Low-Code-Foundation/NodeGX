/**
 * What `require('esbuild')` is inside the INSTALLED deploy (`dist/cloudflare-deploy.cjs`; `build.mjs` aliases it).
 *
 * The deploy calls esbuild once, to bundle the Worker (`worker.ts` and the whole backend). Nothing in that bundle is
 * the app's own (the app's two modules stay imports), so the pack built it already (`dist/worker/worker.mjs`), and
 * this "build" copies it to where the deploy asked. Any other build is a refusal that names this file: an install
 * has no esbuild and no backend source.
 */
'use strict';

const fs = require('fs');
const path = require('path');

exports.build = async function build(options) {
  const entry = String((options && options.entryPoints && options.entryPoints[0]) || '');
  const prebuilt = process.env.NODEGX_CLOUDFLARE_WORKER;
  if (path.basename(entry) !== 'worker.ts' || !prebuilt) {
    throw new Error(`@nodegx/backend bundles nothing at deploy time (asked for ${entry || 'no entry'}); see src/prebuilt-worker.cjs.`);
  }
  if (!fs.existsSync(prebuilt)) throw new Error(`The prebuilt Worker is not here (${prebuilt}): this install is incomplete.`);
  fs.mkdirSync(path.dirname(options.outfile), { recursive: true });
  fs.copyFileSync(prebuilt, options.outfile);
  return { errors: [], warnings: [] };
};
