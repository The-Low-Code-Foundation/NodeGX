// OWN-032 s8 (13c) — Richard, round four: a request that names no look gets "clean, bold or warm?". 11b showed the plain
// three-look question cannot be that rule: it sends 20 of 20 plain requests to warm, 11 at ≥ 0.9. Three candidates,
// each a decision per request — minimal, stylish, warm, or ask — on 11b's three sets plus the three warm run-set requests:
//   A  two looks, then a yes/no "warm?": warm when mean P(yes) ≥ 0.9 over both orders; else lookOf's two-look rule
//      (P(stylish) ≤ 0.1 minimal, ≥ 0.9 stylish, else ask)
//   B  three looks, warm described without "welcoming" or "friendly"; the top look when its mean P ≥ 0.9, else ask
//   C  a yes/no "do their words say how it should look?": ask when mean P(yes) < 0.5; else lookOf3's three looks,
//      the top look when its mean P ≥ 0.9, else ask
// All at T 0, every option order. The raw odds are kept, so a band can be re-graded without asking the model again.
//
//   node probe-look4.mjs [--model gemma4:e2b-it-qat]     → runs/probe-look4-<model>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, chat, dist } from './door.mjs';
import { LOOKS, lookOf, lookOf3 } from './lookq.mjs';
import { PLAIN } from './probe-look.mjs';
import { STRICT, SETS } from './probe-look3b.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WARM_SETS = [
  'A warm, friendly page for Maison Levain, our family bakery in Lyon. Soft and welcoming.',
  'A warm, gentle page for Potter Portfolio: handmade bowls and weekend pottery classes. Soft and welcoming.',
  'A warm, friendly page for Puppy Haven, where families adopt puppies. Soft and welcoming.'
];
const head = (request) => `A person asked for a web page:\n"${request}"\n\n`;
export const Q_WARM = (request, order) => `${head(request)}Do their words ask for a warm, cosy look: soft pastel colours and rounded shapes?\n${order.map((k) => `- ${k}`).join('\n')}`;
export const Q_NAMED = (request, order) => `${head(request)}Do their words say anything about how the page should look or feel: its colours, its mood or its style?\n${order.map((k) => `- ${k}`).join('\n')}`;
export const LOOKS3B = { ...LOOKS, warm: 'cosy and gentle: a soft pastel ground, rounded shapes, a handwritten touch' };
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));

async function yesOf(model, q, request) {
  let p = 0;
  for (const order of [['yes', 'no'], ['no', 'yes']]) {
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: q(request, order) }], { format: { type: 'object', properties: { answer: { type: 'string', enum: order } }, required: ['answer'] }, logprobs: true });
    p += (dist(j, order)?.find((x) => x.label === 'yes')?.p ?? 0) / 2;
  }
  return +p.toFixed(3);
}
async function look3b(model, request) {
  const keys = Object.keys(LOOKS3B), mean = Object.fromEntries(keys.map((k) => [k, 0])), orders = perms(keys);
  for (const order of orders) {
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: `${head(request)}Which look are they asking for?\n${order.map((k) => `- ${k}: ${LOOKS3B[k]}`).join('\n')}` }], { format: { type: 'object', properties: { pick: { type: 'string', enum: order } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, order) || [];
    for (const k of keys) mean[k] += (d.find((x) => x.label === k)?.p ?? 0) / orders.length;
  }
  for (const k of keys) mean[k] = +mean[k].toFixed(3);
  const style = keys.reduce((a, b) => (mean[b] > mean[a] ? b : a));
  return { style, top: mean[style], mean };
}
// the decision rules, on the raw odds (exported so a band can be re-graded from the json)
export const decideA = (r) => (r.pWarm >= 0.9 ? 'warm' : r.pStylish <= 0.1 ? 'minimal' : r.pStylish >= 0.9 ? 'stylish' : 'ask');
export const decideB = (r) => (r.b.top >= 0.9 ? r.b.style : 'ask');
export const decideC = (r) => (r.pNamed < 0.5 ? 'ask' : r.c.top >= 0.9 ? r.c.style : 'ask');

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const MODEL = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : 'gemma4:e2b-it-qat';
  const rows = [];
  for (const [set, want, request] of [...STRICT.map((r) => ['strict', 'warm', r]), ...PLAIN.map(([, r]) => ['plain', 'ask', r]), ...SETS.map(([w, r]) => ['sets', w, r]), ...WARM_SETS.map((r) => ['warmset', 'warm', r])]) {
    const two = await lookOf(MODEL, request), pWarm = await yesOf(MODEL, Q_WARM, request), b = await look3b(MODEL, request), pNamed = await yesOf(MODEL, Q_NAMED, request), c3 = await lookOf3(MODEL, request);
    const r = { set, want, request, pStylish: two.pStylish, pWarm, b, pNamed, c: { style: c3.style, top: c3.top, mean: c3.mean } };
    Object.assign(r, { A: decideA(r), B: decideB(r), C: decideC(r) });
    rows.push(r);
    console.log(`${set.padEnd(7)} ${want.padEnd(7)} A ${r.A.padEnd(7)} B ${r.B.padEnd(7)} C ${r.C.padEnd(7)} | pS ${r.pStylish} pW ${pWarm} B ${b.style} ${b.top} named ${pNamed} C3 ${c3.style} ${c3.top} | ${request}`);
  }
  const summary = Object.fromEntries(['A', 'B', 'C'].map((k) => [k, Object.fromEntries(['strict', 'plain', 'sets', 'warmset'].map((s) => {
    const rs = rows.filter((r) => r.set === s);
    return [s, { right: rs.filter((r) => r[k] === r.want).length, of: rs.length, got: rs.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] || 0) + 1 }), {}) }];
  }))]));
  console.log('\n', JSON.stringify(summary, null, 1));
  fs.writeFileSync(path.join(HERE, 'runs', `probe-look4-${MODEL.replace(/[:/]/g, '_')}.json`), JSON.stringify({ model: MODEL, summary, rows }, null, 1));
  // unload what this probe loaded (16 GB box: the next job must find Ollama empty)
  await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
}
