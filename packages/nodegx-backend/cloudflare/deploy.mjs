#!/usr/bin/env node
// P115 HST-014 — put a NodeGX app online on your own Cloudflare account (see deployCloudflare.ts).
//
//   node packages/nodegx-backend/cloudflare/deploy.mjs <project> [--name <worker>] [--viewer <folder>] [--local] …
//
// The command is TypeScript beside the code it reuses (the code printer, the editor's cloud deploy, the backend's
// admin API rules); this launcher bundles it with the repo's esbuild into `.build/` (gitignored) and runs it.
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '.build', 'deploy.cjs');
await esbuild.build({
  entryPoints: [path.join(here, 'deployCloudflare.ts')],
  outfile: out,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['esbuild'],
  logLevel: 'error'
});
process.env.NODEGX_CLOUDFLARE_SRC = here;
const { main } = createRequire(import.meta.url)(out);
process.exit(await main(process.argv.slice(2)));
