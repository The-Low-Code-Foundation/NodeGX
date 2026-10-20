// P112 OWN-012 — the grade: a project's first page drawn from the descriptions (prototype/real/drawn.html) and compared
// node by node with the real app beside it, in headless Chrome, at each viewport. Step 1 graded Orbit; step 2 grades any
// project folder beside prototype/real/serve.mjs (a COPY of a template: never the template itself).
//
//   node measure.mjs [--project orbit] [--viewports 390x844,1280x800] [--out <dir>] [--pause <node id>] [--still 0]
//                    [--variant row] [--mutant nogap]
//
// Writes <out>/measure-<project>-<viewport>.json (the page's rows and needs) and a screenshot of each, and prints a table
// with each node's verdict: `within 2 px`, `absent on both`, `named: …` (a limit the layout model or the measurer states,
// or an assumption the drawer names), or `OFF` (nothing names it: a defect to file). Exits 0 when no node is OFF, 1
// otherwise. One Chrome at a time (memory: one heavy job); it is closed after each viewport.
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
const pause = flag('--pause', '');
const still = flag('--still', '');
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
    const url = `${base}drawn.html?project=${project}&w=${vp.w}&h=${vp.h}${variant ? `&variant=${variant}` : ''}${mutant ? `&mutant=${mutant}` : ''}${pause ? `&pause=${pause}` : ''}${still ? `&still=${still}` : ''}`;
    const c = await openChrome(url, { width: vp.w * 2 + 700, height: vp.h + 80 });
    try {
      await c.waitFor('window.__own012?.ready === true', 60_000, 'the page to draw and grade');
      const r = await c.ev('JSON.parse(JSON.stringify(window.__own012))');
      r.pageErrors = c.errors;
      const stem = `${project === 'orbit' ? '' : project + '-'}${vp.name}${tag ? '-' + tag : ''}`;
      fs.writeFileSync(path.join(out, `measure-${stem}.json`), JSON.stringify(r, null, 1) + '\n');
      await c.shot(path.join(out, `drawn-${stem}.png`));
      const f = (n) => (n === undefined ? '' : String(Math.round(n * 10) / 10));
      const counts = { within: 0, absent: 0, named: 0, off: 0 };
      console.log(`\n== ${project}${tag ? ' ' + tag : ''} at ${vp.name}: ${r.rows.length} boxes drawn, ${r.visualCount} visual nodes in the files, root ${r.rootPath}, pages ${JSON.stringify(r.pages)}, still ${r.stilled}${c.errors.length ? `, page errors: ${c.errors.join(' | ')}` : ''}`);
      for (const row of r.rows) {
        const kind = row.verdict === 'within 2 px' ? 'within' : row.verdict === 'absent on both' ? 'absent' : row.verdict.startsWith('named') ? 'named' : 'off';
        counts[kind]++;
        if (kind === 'off') failed++;
        const drawn = row.present ? `${f(row.drawn.x)},${f(row.drawn.y)} ${f(row.drawn.width)}×${f(row.drawn.height)}` : 'not mounted';
        const real = row.real ? `${f(row.real.x)},${f(row.real.y)} ${f(row.real.width)}×${f(row.real.height)}` : 'none';
        const delta = row.real && row.present ? `Δ ${f(row.dx)},${f(row.dy)} ${f(row.dw)}×${f(row.dh)}` : '';
        console.log(`  ${row.path.padEnd(34)} ${row.type.padEnd(28)} drawn ${drawn.padEnd(26)} real ${real.padEnd(26)} ${delta.padEnd(24)} ${row.verdict}`);
      }
      console.log(`  -- within ${counts.within}, absent on both ${counts.absent}, named ${counts.named}, OFF ${counts.off}`);
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
