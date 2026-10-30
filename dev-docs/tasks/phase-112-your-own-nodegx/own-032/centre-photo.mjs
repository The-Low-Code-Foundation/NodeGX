// OWN-032 s8 (13a) — the warm photo beside taller words: measure how to centre it, before any arm code. On the warm look
// the words (370–401 px) are taller than the 320 px photo, which sits at the top of its column. A Columns item wrapper is
// a plain block stretched to the row (Columns.tsx: `alignItems: stretch`, no flex on the wrapper), so the Image's own
// `alignY` (a margin in a flex column) may do nothing there. Four variants, each on a COPY of its bench (`-centre`), as
// centre.mjs does:
//   built     the final hero as the arm left it
//   alignY    the Image's own vertical alignment, centre
//   fill      the Image fills its column (height 100 %), cropped by `cover`
//   wrapped   the Image inside a Group that fills its column and centres it (centreWords's change, on the photo side)
//
//   node centre-photo.mjs w23w-puppy:puppy w23m-pottery:pottery …   → runs/centre-photo-<run>/<variant>/…, centre-photo-report.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const photoOf = (n) => n.findIndex((x) => x.role === 'photo');
const VARIANTS = {
  built: (n) => n,
  alignY: (n) => { n[photoOf(n)].params.alignY = 'center'; return n; },
  fill: (n) => { n[photoOf(n)].params.height = { value: 100, unit: '%' }; return n; },
  wrapped: (n) => {
    const p = photoOf(n);
    n.push({ type: 'Group', role: '', parent: n[p].parent, seq: n[p].seq ?? p, params: { width: { value: 100, unit: '%' }, flexDirection: 'column', sizeMode: 'explicit', height: { value: 100, unit: '%' }, justifyContent: 'center' } });
    n[p].parent = n.length - 1;
    return n;
  }
};
// the words column's box is the union of its blocks left of the photo (as centre.mjs); on a phone, the photo's place
const measure = (f) => {
  const p = f.photos?.[0], words = f.blocks.filter((b) => !p || b.x + b.w <= p.x);
  if (!p || !words.length) return { photo: p && [p.y, p.y + p.h, p.w] };
  const top = Math.min(...words.map((b) => b.y)), bottom = Math.max(...words.map((b) => b.y + b.h));
  return { words: [top, bottom], photo: [p.y, p.y + p.h, p.w], offset: Math.round((top + bottom) / 2 - (p.y + p.y + p.h) / 2) };
};
const report = {};
for (const arg of process.argv.slice(2)) {
  const [run, brief] = arg.split(':');
  const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'), 'utf8'));
  const base = L.turns.filter((t) => t.shot).at(-1).nodes;
  const SRC = path.join(process.env.HOME, 'vscode_projects/NodeGX test projects', `own-032-bench-${brief}`), BENCH = `${SRC}-centre`;
  if (!fs.existsSync(BENCH)) fs.cpSync(SRC, BENCH, { recursive: true });
  const b = await openBench(BENCH, { retryBlank: true });
  try {
    for (const [name, make] of Object.entries(VARIANTS)) {
      writeHero(BENCH, make(JSON.parse(JSON.stringify(base))));
      const r = await b.shoot(path.join(HERE, 'runs', `centre-photo-${run}`, name));
      (report[run] ||= {})[name] = { desktop: measure(r.desktop.facts), phone: measure(r.phone.facts), desktopHeight: r.desktop.height, phoneHeight: r.phone.height, phoneOverflow: r.phone.facts.overflowX, phoneAtEdge: r.phone.facts.atEdge };
      console.log(run, name, JSON.stringify(report[run][name]));
    }
  } finally { await b.close(); }
}
fs.writeFileSync(path.join(HERE, 'runs', 'centre-photo-report.json'), JSON.stringify(report, null, 1));
