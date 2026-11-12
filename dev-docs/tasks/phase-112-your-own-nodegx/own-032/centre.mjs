// OWN-032 s6 (11c) — the words column beside the photo: measure, then pictures for Richard. 9c saw a calm words column
// top-aligned beside a 320 px photo, with empty space under the button. A Columns has no vertical-centre input (its
// column wrappers stretch to the row, and a words Group takes its content's height), so `centred` makes the words Group
// fill its column (height 100 %) and justify its parts to the centre. Each final hero is rendered on a COPY of its bench
// (`-centre`), never on a bench an arm run uses.
//
//   node centre.mjs w20m-bakery:bakery w17s-jazz:jazz …     → runs/centre-<run>/<variant>/{desktop,phone}.png, report.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VARIANTS = {
  built: (n) => n,
  centred: (n) => { const col = n[n.find((x) => x.role === 'headline').parent]; Object.assign(col.params, { sizeMode: 'explicit', height: { value: 100, unit: '%' }, justifyContent: 'center' }); return n; }
};
// the words column's box is the union of its blocks (the headline's column: every block left of the photo)
const measure = (f) => {
  const p = f.photos?.[0], words = f.blocks.filter((b) => !p || b.x + b.w <= p.x || f.width < 640);
  const top = Math.min(...words.map((b) => b.y)), bottom = Math.max(...words.map((b) => b.y + b.h));
  return { words: [top, bottom], photo: p && [p.y, p.y + p.h], offset: p ? Math.round((top + bottom) / 2 - (p.y + p.y + p.h) / 2) : null };
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
      const r = await b.shoot(path.join(HERE, 'runs', `centre-${run}`, name));
      (report[run] ||= {})[name] = { desktop: measure(r.desktop.facts), phoneHeight: r.phone.height, desktopHeight: r.desktop.height, phoneWords: r.phone.checks?.words };
      console.log(run, name, JSON.stringify(report[run][name]));
    }
  } finally { await b.close(); }
}
fs.writeFileSync(path.join(HERE, 'runs', 'centre-report.json'), JSON.stringify(report, null, 1));
