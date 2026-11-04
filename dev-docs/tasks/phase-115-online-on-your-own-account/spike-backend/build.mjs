// HST-006 §7: bundle the Worker ourselves. wrangler's Text rule cannot answer a CommonJS `require('./ui/index.html')`
// (the admin dashboard's page), and wrangler `[alias]` would do for node:sqlite but not for that. So: esbuild with an
// html-as-text loader and a node:sqlite plugin, `require` given to the CommonJS inside through node:module, and
// `__dirname` given too (the execution store reads `path.join(__dirname, 'schema.sql')` outside its own fallback), and
// wrangler uploads the result with `--no-bundle` (wrangler.toml `no_bundle = true`).
import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shim = path.join(here, 'src/nodeSqliteShim.ts');

await esbuild.build({
  entryPoints: [path.join(here, 'src/worker.ts')],
  outfile: path.join(here, 'dist/worker.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  conditions: ['workerd', 'worker'],
  tsconfig: path.join(here, 'tsconfig.json'),
  external: ['cloudflare:*', 'sharp', 'pg-native', 'better-sqlite3'],
  loader: { '.html': 'text', '.css': 'text', '.txt': 'text' },
  banner: { js: "import { createRequire as __hstCreateRequire } from 'node:module'; const require = __hstCreateRequire('/bundle/worker.mjs'); const __filename = '/bundle/worker.mjs'; const __dirname = '/bundle';" },
  logLevel: 'warning',
  logOverride: { 'direct-eval': 'silent' },
  plugins: [
    {
      name: 'node-sqlite-is-the-durable-object',
      setup(b) {
        b.onResolve({ filter: /^node:sqlite$/ }, () => ({ path: shim }));
      }
    }
  ]
});
console.log('built dist/worker.mjs');
