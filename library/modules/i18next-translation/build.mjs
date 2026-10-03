#!/usr/bin/env node
/**
 * Build `project/noodl_modules/i18next-noodl/index.js` (+ its map) from `src/`.
 *
 *     node library/modules/i18next-translation/build.mjs
 *
 * P109 ISL-007. The module was imported (2026-07-25) as a webpack bundle only; its map carried `sourcesContent`, so
 * every file it was built from is recovered verbatim into `src/` and `src/vendor/` (i18next 19, the browser language
 * detector, ten Babel helpers, the Noodl SDK — see `src/vendor/README.md`). Nothing is installed: the vendored files
 * are aliased here, so the root `package-lock.json` is never touched. Bundled with the repo's esbuild; the same input
 * gives the same bytes, so `git diff` on the output is a real diff. Edit `src/`, not the output.
 */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const vendor = (p) => join(here, 'src', 'vendor', p);
const outfile = join(here, 'project', 'noodl_modules', 'i18next-noodl', 'index.js');

await build({
  absWorkingDir: here,
  entryPoints: [join(here, 'src', 'i18next-module.js')],
  outfile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  minify: true,
  sourcemap: true,
  sourcesContent: true,
  legalComments: 'none', // the two licences ship beside index.js
  alias: {
    i18next: vendor('i18next.js'),
    'i18next-browser-languagedetector': vendor('i18next-browser-languagedetector.js'),
    '@noodl/noodl-sdk': vendor('noodl-sdk.js'),
    '@babel/runtime/helpers/esm': vendor('babel-helpers')
  },
  logLevel: 'info'
});
