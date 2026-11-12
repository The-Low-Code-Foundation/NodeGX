// OWN-032 s5 (9d) — a third look? Can E2B separate "minimal / stylish / warm and friendly" from the words of a request?
// Probe only, no arm code. 8 requests per look (minimal and stylish are §7a's 16; the 8 warm ones were written before
// any model was asked), each asked in all 6 orders of the three looks (5a: the order draws odds on its own); a request's
// answer is the look with the highest mean P across the orders.
//
//   node probe-look3.mjs [--model gemma4:e2b-it-qat]     → runs/probe-look3-<model>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, chat, dist } from './door.mjs';
import { LOOKS } from './lookq.mjs';
import { REQUESTS } from './probe-look.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MODEL = opt('--model', 'gemma4:e2b-it-qat');

export const LOOKS3 = { ...LOOKS, warm: 'warm and friendly: a soft light colour ground, rounded shapes, a welcoming headline' };
export const WARM = [
  'A warm, friendly page for our family-run café. Cosy and welcoming.',
  'Something friendly and inviting for my childminding service.',
  'A cheerful, welcoming page for our community garden.',
  'Soft, warm and homely, for my bed and breakfast in the Dales.',
  'A friendly, approachable page for my dog grooming salon. Nothing too serious.',
  'Make it feel warm and welcoming, like a hug. It is for my knitting group.',
  'A gentle, kind page for our local food bank.',
  'Cosy and friendly, with soft colours, for my bakery\'s tea room.'
];
const ROWS = [...REQUESTS.filter(([w]) => w !== '?'), ...WARM.map((r) => ['warm', r])];
const KEYS = Object.keys(LOOKS3);
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const ORDERS = perms(KEYS);
const ask = (request, order) => `A person asked for a web page:\n"${request}"\n\nWhich look are they asking for?\n${order.map((k) => `- ${k}: ${LOOKS3[k]}`).join('\n')}`;

const rows = [];
for (const [want, request] of ROWS) {
  const mean = Object.fromEntries(KEYS.map((k) => [k, 0])), picks = [], firstP = [];
  for (const order of ORDERS) {
    const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: ask(request, order) }], { format: { type: 'object', properties: { pick: { type: 'string', enum: order } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, order) || [];
    for (const k of KEYS) mean[k] += (d.find((x) => x.label === k)?.p ?? 0) / ORDERS.length;
    picks.push(JSON.parse(j.message.content).pick);
    firstP.push(d.find((x) => x.label === order[0])?.p ?? 0);
  }
  for (const k of KEYS) mean[k] = +mean[k].toFixed(3);
  const got = KEYS.reduce((a, b) => (mean[b] > mean[a] ? b : a));
  const agree = picks.filter((p) => p === got).length;
  rows.push({ want, request, got, right: got === want, mean, agree, picks, meanFirstP: +(firstP.reduce((s, x) => s + x, 0) / firstP.length).toFixed(3) });
  console.log(`${want.padEnd(7)} ${got.padEnd(7)} ${KEYS.map((k) => `${k} ${mean[k].toFixed(2)}`).join('  ')}  orders agree ${agree}/6  ${request}`);
}
const by = Object.fromEntries(KEYS.map((k) => [k, rows.filter((r) => r.want === k)]));
const summary = Object.fromEntries(KEYS.map((k) => [k, { right: by[k].filter((r) => r.right).length, of: by[k].length, allOrders: by[k].filter((r) => r.right && r.agree === 6).length }]));
const confusion = Object.fromEntries(KEYS.map((w) => [w, Object.fromEntries(KEYS.map((g) => [g, by[w].filter((r) => r.got === g).length]))]));
console.log('\n', JSON.stringify(summary), '\n confusion (want → got):', JSON.stringify(confusion), '\n mean P(the first-listed look):', +(rows.reduce((s, r) => s + r.meanFirstP, 0) / rows.length).toFixed(3));
fs.writeFileSync(path.join(HERE, 'runs', `probe-look3-${MODEL.replace(/[:/]/g, '_')}.json`), JSON.stringify({ model: MODEL, looks: LOOKS3, orders: ORDERS, summary, confusion, rows }, null, 1));
// unload what this probe loaded (16 GB box: the next job must find Ollama empty)
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
