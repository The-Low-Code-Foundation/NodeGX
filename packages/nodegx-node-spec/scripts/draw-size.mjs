/**
 * What the drawer adds to a page (OWN-012 step 2, AC3): three entries bundled for a browser with esbuild and minified,
 * raw and gzipped bytes —
 *   draw-only    src/draw-only.ts    the drawer, the canvas measurer, the layout model and the generated spec table
 *   draw-full    src/draw-full.ts    the drawer over the full spec table (`./nodes`: every node's runners and scenarios)
 *   browser      src/browser.ts      the whole browser entry, for the ledger row P107-SIZE
 * `fast-xml-parser` is external (as `scripts/bundle-size.mjs` measures it). `--json` prints the numbers as JSON.
 */
import { gzipSync } from 'node:zlib';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const entries = { 'draw-only': 'src/draw-only.ts', 'draw-full': 'src/draw-full.ts', browser: 'src/browser.ts' };
const results = {};
for (const [name, entry] of Object.entries(entries)) {
  const built = await esbuild.build({
    entryPoints: [entry],
    absWorkingDir: `${here}/..`,
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    external: ['fast-xml-parser'],
    write: false,
    legalComments: 'none'
  });
  const raw = built.outputFiles[0].contents;
  results[name] = { raw: raw.byteLength, gzip: gzipSync(raw).byteLength };
}
if (process.argv.includes('--json')) console.log(JSON.stringify(results));
else {
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  for (const [k, v] of Object.entries(results)) console.log(`${k.padEnd(10)} ${kb(v.raw).padStart(10)} minified   ${kb(v.gzip).padStart(10)} gzipped   (${v.raw.toLocaleString('en')} / ${v.gzip.toLocaleString('en')} bytes)`);
}
