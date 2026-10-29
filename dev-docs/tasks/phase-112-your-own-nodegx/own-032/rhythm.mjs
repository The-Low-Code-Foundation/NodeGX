// OWN-032 s4 8c — spacing rhythm in the stylish words column, shown before any arm code changes. w8s-puppy's last
// tree, and the same tree with each candidate applied by hand, rendered on the puppy bench. Richard picks; the arm
// only learns the one he keeps.
//
//   node rhythm.mjs [run=w8s-puppy] [brief=puppy]     → runs/rhythm-<run>/<variant>/{desktop,phone}.png, gaps.json
// gaps: the space in px between each pair of word blocks in the words column, on a desktop and on a phone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [run = 'w8s-puppy', brief = 'puppy'] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'), 'utf8'));
const base = L.turns.filter((t) => t.shot).at(-1).nodes;
const OUT = path.join(HERE, 'runs', `rhythm-${run}`);
const role = (n, r) => n.findIndex((x) => x.role === r);
const sp = (k) => `var(--space-${k})`;
const clone = () => JSON.parse(JSON.stringify(base));
const gap = (k) => ({ rowGap: sp(k), columnGap: sp(k) });

export const VARIANTS = {
  // as the arm left it: one gap for the whole words column (huge, space-12 = 48px)
  before: () => clone(),
  // the small line belongs to the headline: both in a Group of their own with a small gap; the column keeps its gap
  together: () => {
    const n = clone(), eb = role(n, 'eyebrow'), h = role(n, 'headline'), col = n[h].parent;
    n.push({ type: 'Group', role: '', parent: col, seq: (n[eb].seq ?? eb) - 0.25, params: { width: { value: 100, unit: '%' }, sizeMode: 'contentHeight', flexDirection: 'column', ...gap(2) } });
    n[eb].parent = n.length - 1; n[eb].seq = 0; n[h].parent = n.length - 1; n[h].seq = 1;
    return n;
  },
  // a gap by role pair: the column gap small (8px), the line 16px further down, the button 32px further down
  pairs: () => {
    const n = clone(), h = role(n, 'headline'), col = n[h].parent;
    Object.assign(n[col].params, gap(2));
    n[role(n, 'line')].params.marginTop = { value: 16, unit: 'px' };
    n[role(n, 'button')].params.marginTop = { value: 32, unit: 'px' };
    return n;
  },
  // the composition hero's rhythm (OWN-029 G-plumber r4): one medium gap (16px), the button 8px further down
  medium: () => {
    const n = clone(), h = role(n, 'headline'), col = n[h].parent;
    Object.assign(n[col].params, gap(4));
    n[role(n, 'button')].params.marginTop = { value: 8, unit: 'px' };
    return n;
  }
};

const bench = path.join(process.env.HOME, 'vscode_projects/NodeGX test projects', `own-032-bench-${brief}`);
const b = await openBench(bench, { retryBlank: true });
const report = {};
try {
  for (const [name, make] of Object.entries(VARIANTS)) {
    writeHero(bench, make());
    const r = await b.shoot(path.join(OUT, name));
    const gaps = {};
    for (const w of ['desktop', 'phone']) {
      const bl = r[w].facts.blocks.filter((x) => x.kind !== 'image').sort((p, q) => p.y - q.y);
      gaps[w] = bl.slice(1).map((x, i) => `${bl[i].text.slice(0, 14)} → ${x.text.slice(0, 14)}: ${x.y - (bl[i].y + bl[i].h)}px`);
    }
    report[name] = gaps;
    console.log(name, JSON.stringify(gaps.desktop));
  }
} finally {
  // the bench is left holding the arm's tree, as the arm left it
  writeHero(bench, base);
  await b.close();
}
fs.writeFileSync(path.join(OUT, 'gaps.json'), JSON.stringify(report, null, 1));
