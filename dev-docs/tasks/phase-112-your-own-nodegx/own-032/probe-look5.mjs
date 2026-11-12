// OWN-032 s8 (13d) — a held-out test of rule D, fitted on 13c's 42 rows: C's "does it say how it looks?" first, and
// where C says ask, the two-look rule (P(stylish) ≤ 0.1 minimal, ≥ 0.9 stylish, else ask). 32 requests written before
// any model was asked of them (RESULTS §13d lists them): 8 warm (4 with a look word, 4 without), 12 plain, 6 calm, 6 bold.
//
//   node probe-look5.mjs [--model gemma4:e2b-it-qat]     → runs/probe-look5-<model>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookOf, lookOf3 } from './lookq.mjs';
import { Q_NAMED, yesOf } from './probe-look4.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HELD = [
  ['warm', 'A warm, welcoming page for our little seaside guesthouse.'],
  ['warm', 'Something friendly and soft for my dog grooming salon.'],
  ['warm', 'A gentle, cosy page for our family-run café in the village.'],
  ['warm', 'A soft, welcoming page for my primary school\'s parents\' evening.'],
  ['warm', 'Make it feel like home, for our care home\'s open day.'],
  ['warm', 'A comforting, kind page for my counselling practice.'],
  ['warm', 'Sweet and homely, for my cupcake stall at the market.'],
  ['warm', 'A nurturing, gentle page for our new-parents support group.'],
  ['ask', 'A page for my dental surgery.'],
  ['ask', 'A website for my accountancy firm in Bristol.'],
  ['ask', 'A landing page for my driving school.'],
  ['ask', 'A site for our tennis club.'],
  ['ask', 'A page for my window cleaning round.'],
  ['ask', 'A website for my vintage clothing shop.'],
  ['ask', 'A page for our church jumble sale on 3 March.'],
  ['ask', 'A landing page for my piano lessons.'],
  ['ask', 'A site for our allotment society.'],
  ['ask', 'A page for my mobile phone repair shop.'],
  ['ask', 'A website for a farmers\' market every Sunday.'],
  ['ask', 'A page for our street party in July.'],
  ['minimal', 'A clean, simple page for my architecture studio.'],
  ['minimal', 'Minimal and quiet, for my bookbinding workshop.'],
  ['minimal', 'A plain, spacious page for our law firm.'],
  ['minimal', 'Keep it understated and calm, for my yoga teacher training.'],
  ['minimal', 'A simple white page with lots of space for my photography portfolio.'],
  ['minimal', 'Something sober and uncluttered for our accountancy practice.'],
  ['stylish', 'A bold, dramatic page for our nightclub\'s opening night.'],
  ['stylish', 'Make my tattoo studio\'s page dark and edgy.'],
  ['stylish', 'Loud, bright and punchy, for our skate shop.'],
  ['stylish', 'A sleek, striking page with a dark background for my car detailing business.'],
  ['stylish', 'Something glamorous and bold for my cocktail bar.'],
  ['stylish', 'High-energy and colourful, for our dance festival.']
];
export function decideD(r) {
  const c = r.pNamed < 0.5 ? 'ask' : r.c.top >= 0.9 ? r.c.style : 'ask';
  if (c !== 'ask') return c;
  return r.pStylish <= 0.1 ? 'minimal' : r.pStylish >= 0.9 ? 'stylish' : 'ask';
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const MODEL = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : 'gemma4:e2b-it-qat';
  const rows = [];
  for (const [want, request] of HELD) {
    const two = await lookOf(MODEL, request), pNamed = await yesOf(MODEL, Q_NAMED, request), c3 = await lookOf3(MODEL, request);
    const r = { want, request, pStylish: two.pStylish, pNamed, c: { style: c3.style, top: c3.top, mean: c3.mean } };
    r.D = decideD(r);
    rows.push(r);
    console.log(`${want.padEnd(7)} D ${r.D.padEnd(7)} ${r.D === want ? '  ' : '✘ '}| pS ${r.pStylish} named ${pNamed} C3 ${c3.style} ${c3.top} | ${request}`);
  }
  const summary = Object.fromEntries(['warm', 'ask', 'minimal', 'stylish'].map((w) => { const rs = rows.filter((r) => r.want === w); return [w, { right: rs.filter((r) => r.D === w).length, of: rs.length, got: rs.reduce((a, r) => ({ ...a, [r.D]: (a[r.D] || 0) + 1 }), {}) }]; }));
  console.log('\n', JSON.stringify(summary));
  fs.writeFileSync(path.join(HERE, 'runs', `probe-look5-${MODEL.replace(/[:/]/g, '_')}.json`), JSON.stringify({ model: MODEL, summary, rows }, null, 1));
  await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
}
