// OWN-032 AC5 — the pictures for the blind pairs: each brief's composition hero (the hero of OWN-029's kept G round)
// and the arm's hero (the last turn of arm-<run>-<brief>), both rendered on that brief's bench, so theme, tokens and
// widths are the same and only the tree differs.
//
//   node ac5.mjs <arm run prefix, e.g. w6> [brief …]     → runs/ac5-<prefix>/<brief>/{composition,arm}/{desktop,phone}.png
// The bench's hero is rewritten for each shot and left holding the arm's final tree, as the arm left it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [prefix = 'w6', ...briefs] = process.argv.slice(2);
const P = path.join(process.env.HOME, 'vscode_projects/NodeGX test projects');
const OUT = path.join(HERE, 'runs', `ac5-${prefix}`);

for (const brief of briefs.length ? briefs : ['puppy', 'bakery', 'jazz', 'plumber']) {
  const g = path.join(HERE, '../own-029/runs', `G-${brief}`);
  const kept = JSON.parse(fs.readFileSync(path.join(g, 'summary.json'), 'utf8')).bestRound;
  const composition = JSON.parse(fs.readFileSync(path.join(g, `r${kept}`, 'tree.json'), 'utf8')).sections[0].nodes;
  const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${prefix}-${brief}`, 'ledger.json'), 'utf8'));
  const arm = L.turns.at(-1).nodes;
  const bench = path.join(P, `own-032-bench-${brief}`);
  const b = await openBench(bench);
  try {
    for (const [name, nodes] of [['composition', composition], ['arm', arm]]) {
      writeHero(bench, nodes);
      const r = await b.shoot(path.join(OUT, brief, name));
      console.log(`${brief} ${name} (G r${kept} / ${L.turns.length} turns): ${r.ms} ms, desktop h ${r.desktop.height}, phone h ${r.phone.height}`);
    }
  } finally { await b.close(); }
}
