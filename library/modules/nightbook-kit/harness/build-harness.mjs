#!/usr/bin/env node
/** Bundle the harness (React + the BUILT kit) into one page: `node build-harness.mjs <outDir>`. */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || join(here, '.out'));
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(here, 'entry.js')],
  bundle: true,
  format: 'iife',
  outfile: join(out, 'harness.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
  nodePaths: [resolve(here, '../../../../node_modules')]
});
writeFileSync(join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Nightbook page harness</title><style>body{margin:0;background:#26244A}</style></head><body><div id="root"></div><script src="harness.js"></script></body></html>\n');
console.log('harness at ' + join(out, 'index.html'));
