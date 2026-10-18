// P112 OWN-012 step 1 — the measurement: Orbit's screen drawn from the descriptions (prototype/real/drawn.html) and graded
// node by node against the real app beside it, in headless Chrome, at each viewport.
//
//   node measure.mjs [--project orbit] [--viewports 390x844,1280x800] [--out <dir>] [--variant row] [--mutant nogap]
//
// Writes <out>/measure-<viewport>.json (the page's own rows and needs) and a screenshot of each, and prints a table.
// Exits 0 when every visual node was drawn within 2 px of the real app or carries a named limit, 1 otherwise. One
// Chrome at a time (memory: one heavy job); it is closed after each viewport.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openChrome } from '../own-008/cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const flag = (name, dflt) => { const i = process.argv.indexOf(name); return i === -1 ? dflt : process.argv[i + 1]; };
const project = flag('--project', 'orbit');
const viewports = flag('--viewports', '390x844,1280x800').split(',').map((v) => { const [w, h] = v.split('x').map(Number); return { name: v, w, h }; });
const variant = flag('--variant', '');
const mutant = flag('--mutant', '');
const tag = [variant && `variant-${variant}`, mutant && `mutant-${mutant}`].filter(Boolean).join('-');
const out = path.resolve(flag('--out', path.join(here, 'measured')));
fs.mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, [path.join(here, '..', 'prototype', 'real', 'serve.mjs'), '0'], { stdio: ['ignore', 'pipe', 'inherit'] });
const base = await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => { const m = /http:\/\/127\.0\.0\.1:\d+\//.exec(String(d)); if (m) resolve(m[0]); });
  server.on('exit', (c) => reject(new Error(`serve exited ${c}`)));
});

let failed = 0;
try {
  for (const vp of viewports) {
    const c = await openChrome(`${base}drawn.html?project=${project}&w=${vp.w}&h=${vp.h}${variant ? `&variant=${variant}` : ''}${mutant ? `&mutant=${mutant}` : ''}`, { width: vp.w * 2 + 700, height: vp.h + 80 });
    try {
      await c.waitFor('window.__own012?.ready === true', 40_000, 'the page to draw and grade');
      const r = await c.ev('JSON.parse(JSON.stringify(window.__own012))');
      r.pageErrors = c.errors;
      fs.writeFileSync(path.join(out, `measure-${vp.name}${tag ? '-' + tag : ''}.json`), JSON.stringify(r, null, 1) + '\n');
      await c.shot(path.join(out, `drawn-${vp.name}${tag ? '-' + tag : ''}.png`));
      const f = (n) => (n === undefined ? '' : String(Math.round(n * 10) / 10));
      console.log(`\n== ${project}${tag ? ' ' + tag : ''} at ${vp.name}: ${r.rows.length} boxes drawn, ${r.visualCount} visual nodes in the file, still ${r.stilled}${c.errors.length ? `, page errors: ${c.errors.join(' | ')}` : ''}`);
      for (const row of r.rows) {
        const named = row.outside.length > 0 || row.limits.length > 0;
        const verdict = row.within ? 'within 2 px' : named ? 'named: ' + [...row.outside, ...row.limits].join('; ') : 'OFF';
        if (!row.within && !named) failed++;
        console.log(`  ${row.id.padEnd(10)} drawn ${f(row.drawn.x)},${f(row.drawn.y)} ${f(row.drawn.width)}×${f(row.drawn.height)}  real ${row.real ? `${f(row.real.x)},${f(row.real.y)} ${f(row.real.width)}×${f(row.real.height)}` : 'none'}  Δ ${f(row.dx)},${f(row.dy)} ${f(row.dw)}×${f(row.dh)}  ${verdict}`);
      }
      console.log('  needs:');
      for (const n of r.needs) console.log('   - ' + n);
    } finally {
      c.close();
    }
  }
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
