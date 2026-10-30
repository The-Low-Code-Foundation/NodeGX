// OWN-032 s8 (13) — grade-w22.mjs with the pairs on the command line, plus the photo: its rect on both widths, whether
// it sits in a centred Group (centrePhoto), and the small line's colour (eyebrowDark).
//   node grade.mjs <out> w24w-bakery:w23w-bakery …        → a table on stdout, runs/grade-<out>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [OUT, ...ARGS] = process.argv.slice(2), PAIRS = ARGS.map((a) => a.split(':'));
const one = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const read = (run) => {
  const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'), 'utf8'));
  const last = L.turns.filter((t) => t.shot).at(-1), n = last.nodes;
  const t = fs.readdirSync(path.join(HERE, 'runs', `arm-${run}`)).filter((x) => /^t\d+$/.test(x)).sort((a, b) => a.slice(1) - b.slice(1)).at(-1);
  const F = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${run}`, t, 'facts.json'), 'utf8'));
  const role = (r) => n.find((x) => x.role === r), h = role('headline'), line = role('line');
  const at = (w) => { const f = F[w].facts, b = f.blocks.find((x) => x.text === one(line?.params.text).slice(0, 40)); return b && { h: b.h, lines: b.lines, perLine: Math.round(b.h / b.lines) }; };
  // s6 runs predate FACTS `photos`: the photo then is 11c's measured rect (top 96 px) at its own height setting
  const img = n.find((x) => x.role === 'photo'), f = F.desktop.facts, p = f.photos?.[0] || (img && { x: Infinity, y: 96, h: img.params.height?.value }), words = f.blocks.filter((b) => !p || b.x + b.w <= p.x);
  const top = Math.min(...words.map((b) => b.y)), bottom = Math.max(...words.map((b) => b.y + b.h));
  const col = h && n[h.parent];
  return {
    turns: L.turns.length, ended: L.end.ended, style: L.style,
    lineSize: line?.params.fontSize, centred: col?.params.justifyContent === 'center' && col?.params.height?.value === 100,
    lineD: at('desktop'), lineP: at('phone'),
    offset: p ? Math.round((top + bottom) / 2 - (p.y + p.y + p.h) / 2) : null, wordsH: bottom - top, photoH: p?.h,
    open: (L.end.findings || []).map((x) => x.check || x.say?.slice(0, 50)),
    lowD: f.lowContrast.map((x) => `${x.text.slice(0, 18)} ${x.ratio}`), atEdgeP: F.phone.facts.atEdge.length, overflowP: F.phone.facts.overflowX,
    phoneH: F.phone.height, photoD: f.photos?.[0], photoP: F.phone.facts.photos?.[0],
    photoWrapped: !!img && n[img.parent]?.type === 'Group' && n[img.parent].params.justifyContent === 'center',
    eyebrow: role('eyebrow')?.params.color, lowP: F.phone.facts.lowContrast.map((x) => `${x.text.slice(0, 18)} ${x.ratio}`), headline: one(h?.params.text), line: one(line?.params.text)
  };
};
const out = {};
for (const [run, ctl] of PAIRS) {
  if (!fs.existsSync(path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'))) { console.log(run, 'not run'); continue; }
  const a = read(run), c = read(ctl);
  out[run] = { control: ctl, run: a, ctl: c };
  console.log(`\n${run} (${a.style}) vs ${ctl}`);
  console.log(`  turns ${c.turns} → ${a.turns} (${a.turns - c.turns >= 0 ? '+' : ''}${a.turns - c.turns}), ended ${a.ended}`);
  console.log(`  line ${c.lineSize} → ${a.lineSize}; desktop ${JSON.stringify(c.lineD)} → ${JSON.stringify(a.lineD)}; phone ${JSON.stringify(c.lineP)} → ${JSON.stringify(a.lineP)}`);
  console.log(`  centred ${c.centred} → ${a.centred}; offset ${c.offset} → ${a.offset} (words ${a.wordsH} px, photo ${a.photoH} px); phone height ${c.phoneH} → ${a.phoneH}`);
  console.log(`  open ${JSON.stringify(c.open)} → ${JSON.stringify(a.open)}; lowContrast ${JSON.stringify(c.lowD)} → ${JSON.stringify(a.lowD)}; phone atEdge ${a.atEdgeP} overflow ${a.overflowP}`);
  console.log(`  photo wrapped ${c.photoWrapped} → ${a.photoWrapped}; desktop ${JSON.stringify(c.photoD)} → ${JSON.stringify(a.photoD)}; phone ${JSON.stringify(c.photoP)} → ${JSON.stringify(a.photoP)}; eyebrow ${c.eyebrow} → ${a.eyebrow}; phone lowContrast ${JSON.stringify(a.lowP)}`);
  console.log(`  words ${a.headline === c.headline && a.line === c.line ? 'SAME' : `DIFFER: "${c.headline}" / "${c.line}" → "${a.headline}" / "${a.line}"`}`);
}
fs.writeFileSync(path.join(HERE, 'runs', `grade-${OUT}.json`), JSON.stringify(out, null, 1));
