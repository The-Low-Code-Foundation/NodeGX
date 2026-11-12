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

// HST-013: print every code node of the cloud functions this Worker will serve into dist/printed-code.mjs, its own
// module (wrangler uploads it beside worker.mjs: wrangler.toml `find_additional_modules`). HST_PRINT_FROM: paths, ':'
// between them, each a `*.workflow.json` (`{ components }`) or a folder searched for them. A text that cannot be
// printed refuses the BUILD, by function and node. With nothing to print the table is empty, and still installed:
// a code node then answers "This code was not printed when the app was deployed", never workerd's own refusal.
{
  const printer = path.join(here, 'dist/.printcode.cjs');
  await esbuild.build({
    entryPoints: [path.resolve(here, '../../../../packages/noodl-runtime/src/printcode.ts')],
    outfile: printer,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    logLevel: 'error'
  });
  const { createRequire } = await import('node:module');
  const { collectCode, printCodeModule, refusalSentence } = createRequire(import.meta.url)(printer);
  const fs = await import('node:fs');
  const files = [];
  const walk = (p) => {
    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((e) => walk(path.join(p, e)));
    else if (p.endsWith('.workflow.json')) files.push(p);
  };
  for (const p of (process.env.HST_PRINT_FROM || '').split(':').filter(Boolean)) walk(path.resolve(p));
  const components = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).components || []);
  const { print, refusals } = collectCode(components);
  if (refusals.length) {
    refusals.forEach((r) => console.error(refusalSentence(r)));
    process.exit(1);
  }
  fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(here, 'dist/printed-code.mjs'), printCodeModule(print));
  console.log(`printed ${print.length} code text(s) from ${components.length} function(s) in ${files.length} file(s)`);
}

await esbuild.build({
  // HST_ENTRY: build another entry (HST-011 built session 7's worker this way to grade the move of its files).
  entryPoints: [process.env.HST_ENTRY ? path.resolve(process.env.HST_ENTRY) : path.join(here, 'src/worker.ts')],
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
      name: 'printed-code-is-its-own-module',
      setup(b) {
        b.onResolve({ filter: /^\.\/printed-code\.mjs$/ }, () => ({ path: './printed-code.mjs', external: true }));
      }
    },
    {
      name: 'node-sqlite-is-the-durable-object',
      setup(b) {
        b.onResolve({ filter: /^node:sqlite$/ }, () => ({ path: shim }));
      }
    }
  ]
});
console.log('built dist/worker.mjs');
