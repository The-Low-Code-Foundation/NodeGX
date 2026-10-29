// OWN-032 s5b (10c) — what a third, "warm and friendly" look could be, shown before any arm code. Richard: "like if you
// look up yoga landing pages or buddhist stuff … very pastel soft light colours, everything rounded, round soft fonts or
// calligraphy". A run's last tree, with each candidate applied by hand, rendered on a COPY of its bench (`-warm`), so an
// arm run on the real bench is never touched. The fonts are ones the repo already ships: Fredoka (bot-garden-fonts, the
// rounded title face of Olive's Island) and Caveat (the nightbook kit's handwriting face), both bundled for offline use.
//
//   node warm.mjs [run=w17m-bakery] [brief=bakery] [eyebrow words]   → runs/warm-<run>/<variant>/{desktop,phone}.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';
import { addWarmFonts } from './fonts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [run = 'w17m-bakery', brief = 'bakery', eyebrowWords = ''] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'), 'utf8'));
const base = L.turns.filter((t) => t.shot).at(-1).nodes;
const OUT = path.join(HERE, 'runs', `warm-${run}`);
const role = (n, r) => n.findIndex((x) => x.role === r);
const sp = (k) => `var(--space-${k})`;
const clone = () => JSON.parse(JSON.stringify(base));

// the bench copy, with the two font modules beside the theme's own
const SRC = path.join(process.env.HOME, 'vscode_projects/NodeGX test projects', `own-032-bench-${brief}`);
const BENCH = `${SRC}-warm`;
if (!fs.existsSync(BENCH)) fs.cpSync(SRC, BENCH, { recursive: true });
addWarmFonts(BENCH);

// the shared warm treatment: a pastel wash of the brand colour, everything rounded, the words close together
const PASTEL = 'color-mix(in srgb, var(--primary) 12%, var(--background))';
function warm(n, headFont) {
  const root = n.findIndex((x) => x.parent === -1), h = role(n, 'headline'), line = role(n, 'line'), btn = role(n, 'button'), img = role(n, 'photo'), col = n[h].parent;
  Object.assign(n[root].params, { backgroundColor: PASTEL });
  delete n[root].params.backgroundGradient;
  Object.assign(n[col].params, { rowGap: sp(4), columnGap: sp(4) });
  Object.assign(n[h].params, { fontFamily: headFont, fontWeight: headFont === 'Caveat' ? 'var(--font-bold)' : 'var(--font-semibold)', color: 'var(--foreground)' });
  if (headFont === 'Caveat') n[h].params.fontSize = 'var(--display-lg)';
  Object.assign(n[line].params, { color: 'var(--muted-foreground)', fontSize: 'var(--text-lg)' });
  Object.assign(n[btn].params, { borderRadius: 'var(--radius-full)', fontFamily: 'Fredoka', marginTop: { value: 8, unit: 'px' }, paddingLeft: sp(6), paddingRight: sp(6), paddingTop: sp(3), paddingBottom: sp(3) });
  Object.assign(n[img].params, { borderRadius: '40px' });
  return n;
}
export const VARIANTS = {
  // as the arm left it (the calm look)
  calm: () => clone(),
  // rounded: a round headline face (Fredoka), pastel wash, pill button, a softly rounded photo
  rounded: () => warm(clone(), 'Fredoka'),
  // handwritten: the same, with the headline in a handwriting face (Caveat)
  handwritten: () => warm(clone(), 'Caveat'),
  // both: the rounded headline, and a small handwritten line above it (words from the request, written by me)
  both: () => {
    const n = warm(clone(), 'Fredoka'), h = role(n, 'headline');
    n.push({ type: 'Text', role: 'eyebrow', parent: n[h].parent, seq: (n[h].seq ?? h) - 0.5, params: { text: eyebrowWords || 'made with love', fontFamily: 'Caveat', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--primary)' } });
    return n;
  },
  // a brand with no colour (pottery's is near-black) washes to grey: the same "both", on the product's Soft theme's own
  // pastel (its --muted, #f5f3ff) instead of a wash of the brand
  softGround: () => { const n = VARIANTS.both(); n[n.findIndex((x) => x.parent === -1)].params.backgroundColor = '#f5f3ff'; return n; }
};

const b = await openBench(BENCH, { retryBlank: true });
const report = {};
try {
  for (const [name, make] of Object.entries(VARIANTS)) {
    writeHero(BENCH, make());
    const r = await b.shoot(path.join(OUT, name));
    report[name] = { desktop: r.desktop.facts.lowContrast?.length ?? 0, phone: r.phone.facts.lowContrast?.length ?? 0, words: r.desktop.checks?.words };
    console.log(name, JSON.stringify(report[name]));
  }
} finally {
  await b.close();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
