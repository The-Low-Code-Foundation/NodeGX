/**
 * The size of the browser entry (OWN-002 §3.4): `src/browser.ts` bundled for a browser and
 * minified, measured twice — with `fast-xml-parser` bundled in (what a page that uses Parse XML
 * or Parse Feed pays) and with it external (every other page). Raw and gzipped bytes. The budget
 * is on the gzipped bundle WITHOUT the parser. Measured 2026-10-03 with 86 specs: 520 KB minified,
 * 147.6 KB gzipped, of which the specs (`src/nodes/*`) are 65% — about 1.1 KB gzipped per spec — so the
 * full picker vocabulary (147) lands near 215 KB. The budget is 240 KB: a ceiling for the whole
 * vocabulary, not a target, and a budget measured on today's bundle bounds today's bundle (memory).
 * Run with `--json` for machine-readable output; exits 1 over budget.
 */
import { gzipSync } from 'node:zlib';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const BUDGET_GZIP_WITHOUT_PARSER = 240 * 1024;

const results = {};
for (const [name, external] of [['with-xml-parser', []], ['without-xml-parser', ['fast-xml-parser']]]) {
  const built = await esbuild.build({
    entryPoints: ['src/browser.ts'],
    absWorkingDir: `${here}/..`,
    bundle: true,
    minify: true,
    platform: 'browser',
    target: 'es2020',
    external,
    write: false,
    legalComments: 'none'
  });
  const raw = built.outputFiles[0].contents;
  results[name] = { raw: raw.byteLength, gzip: gzipSync(raw).byteLength };
}
const over = results['without-xml-parser'].gzip > BUDGET_GZIP_WITHOUT_PARSER;
if (process.argv.includes('--json')) console.log(JSON.stringify({ ...results, budgetGzipWithoutParser: BUDGET_GZIP_WITHOUT_PARSER, over }));
else {
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  for (const [k, v] of Object.entries(results)) console.log(`${k.padEnd(20)} ${kb(v.raw).padStart(10)} minified   ${kb(v.gzip).padStart(10)} gzipped`);
  console.log(`budget (gzipped, without the parser): ${kb(BUDGET_GZIP_WITHOUT_PARSER)} — ${over ? 'OVER' : 'ok'}`);
}
process.exit(over ? 1 : 0);
