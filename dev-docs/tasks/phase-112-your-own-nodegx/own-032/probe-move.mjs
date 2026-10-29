// OWN-032 s2 — why the arm never changes a setting: the move call, re-asked with one change at a time.
//
//   node probe-move.mjs <run> <fromTurn>     e.g. w3-puppy-t7a-t8a 14; writes runs/s2-move/result-<run>.json
//
// Takes the run's asked `move` calls from <fromTurn> on (every part of the goal there, only look findings left). Each
// variant changes ONE thing and asks E2B again at temperature 0. The score is P(the move that changes a setting).
// `base` is the control: the recorded prompt unchanged must give back the recorded odds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, chat, dist } from './door.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'gemma4:e2b-it-qat';
const [RUN, FROM] = [process.argv[2], Number(process.argv[3] || 1)];
const L = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${RUN}`, 'ledger.json'), 'utf8'));
const name = (i) => `n${String(i).padStart(2, '0')}`;
const isText = (n) => n.type === 'Text' || n.type === 'net.noodl.controls.button';
const words = (n) => String(n.params.text ?? n.params.label ?? '').trim().replace(/\s+/g, ' ');

// the owner of each spacing finding, worked out from the tree the prompt describes (arm.mjs `ownerNamed`)
function owners(p, nodes) {
  const up = (i) => { const a = []; for (let q = nodes[i]?.parent; q !== undefined && q >= 0; q = nodes[q].parent) a.push(q); return a; };
  const find = (w) => nodes.findIndex((n) => isText(n) && words(n).startsWith(w.replace(/…$/, '')));
  const root = nodes.findIndex((n) => n.parent === -1);
  const pad = (i) => (nodes[i].params.paddingLeft ? nodes[i].params.paddingLeft : 'none');
  return p.replace(/^(- .* is \d+px from the (?:left|right) edge of the screen\.)$/gm, (m) => `${m} ${name(root)} (the whole section) has padding left and right: ${pad(root)}.`)
    .replace(/^(- .*"(.+?)" and "(.+?)" are touching \(-?\d+px apart\)\.)$/gm, (m, all, a, b) => {
      const ia = find(a), ib = find(b); if (ia < 0 || ib < 0) return m;
      const c = up(ia).find((x) => x === ib || up(ib).includes(x));
      return c === undefined || nodes[c].type !== 'Group' ? m : `${m} The space between them is the gap of ${name(c)}, which holds both: ${nodes[c].params.rowGap ? nodes[c].params.rowGap : 'none'}.`;
    });
}
// the menu, rewritten with "change one setting" first (labels renumbered, so the answer is read back by meaning)
function setFirst(p) {
  const m = p.match(/Pick one:\n((?:\d\. .*\n?)+)$/); if (!m) return null;
  const items = m[1].trim().split('\n').map((l) => l.replace(/^\d\. /, ''));
  const order = [...items.filter((s) => s.startsWith('change')), ...items.filter((s) => !s.startsWith('change'))];
  return { prompt: p.replace(m[1], order.map((s, i) => `${i + 1}. ${s}`).join('\n')), setLabel: '1', labels: order.map((_, i) => String(i + 1)) };
}
// the fixes the findings point at, each its own numbered move, ahead of the generic ones (the menu poke): the score
// is then P(any fix). Read from the owner sentences, so it runs on `owners()`'s output.
function fixes(p) {
  const m = p.match(/Pick one:\n((?:\d\. .*\n?)+)$/); if (!m) return null;
  const fx = [];
  for (const [, n] of p.matchAll(/(n\d\d) \(the whole section\) has padding left and right: none/g)) fx.push(`give ${n} padding left and right (words are at the edge of the screen)`);
  for (const [, n] of p.matchAll(/the gap of (n\d\d), which holds both: none/g)) fx.push(`give ${n} a gap between its parts (words are touching)`);
  const uniq = [...new Set(fx)];
  const items = [...uniq, ...m[1].trim().split('\n').map((l) => l.replace(/^\d\. /, ''))];
  return { prompt: p.replace(m[1], items.map((s, i) => `${i + 1}. ${s}`).join('\n')), labels: items.map((_, i) => String(i + 1)), fixLabels: uniq.map((_, i) => String(i + 1)) };
}
const noEmpty = (p) => p.replace(/^- n\d\d.* (is|are) empty: .*\n/m, '');
const goalMet = (p) => p.replace(/\nWHAT THE LAST LOOK FOUND:\n/, '\nEvery part of the goal is there. What is left is how it looks: the findings below.\n\nWHAT THE LAST LOOK FOUND:\n');
const labelsOf = (p) => (p.match(/Pick one:\n((?:\d\. .*\n?)+)$/)?.[1].trim().split('\n') || []).map((l) => l[0]);
const setOf = (p) => (p.match(/(\d)\. change one setting/) || [])[1];

const VARIANTS = {
  base: (c) => ({ prompt: c.prompt }),
  owner: (c) => ({ prompt: owners(c.prompt, c.nodes) }),
  goalMet: (c) => ({ prompt: goalMet(c.prompt) }),
  setFirst: (c) => setFirst(c.prompt),
  all: (c) => setFirst(goalMet(owners(c.prompt, c.nodes))),
  noEmpty: (c) => ({ prompt: noEmpty(c.prompt) }),
  allNoEmpty: (c) => setFirst(noEmpty(goalMet(owners(c.prompt, c.nodes)))),
  fixes: (c) => fixes(goalMet(owners(c.prompt, c.nodes))),
  fixesNoEmpty: (c) => fixes(noEmpty(goalMet(owners(c.prompt, c.nodes))))
};
if (process.env.ONLY) for (const v of Object.keys(VARIANTS)) if (!process.env.ONLY.split(',').includes(v)) delete VARIANTS[v];

const cases = L.turns.filter((t) => t.turn >= FROM).flatMap((t) => {
  const c = t.calls.find((x) => x.key === 'move' && !x.replayed && !x.forced); if (!c) return [];
  const prev = L.turns.find((x) => x.turn === t.turn - 1);
  return [{ turn: t.turn, prompt: c.prompt, recorded: c.options, nodes: prev.nodes }];
});
console.log(`${cases.length} move calls from turn ${FROM} of ${RUN}`);
const out = { model: MODEL, run: RUN, from: FROM, cases: cases.length, variants: {}, rows: [] };
for (const [v, f] of Object.entries(VARIANTS)) {
  let pset = 0, picks = 0, drift = 0;
  for (const c of cases) {
    const x = f(c); const labels = x.labels || labelsOf(x.prompt); const sl = x.setLabel || setOf(x.prompt);
    const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: x.prompt }], { format: { type: 'object', properties: { pick: { type: 'string', enum: labels } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, labels) || [];
    const hits = x.fixLabels ? [...x.fixLabels, sl] : [sl];   // with fixes on the menu, any fix or the generic set counts
    const p = d.filter((o) => hits.includes(o.label)).reduce((t, o) => t + o.p, 0);
    pset += p;
    let pick = null; try { pick = JSON.parse(j.message.content).pick; } catch {}
    if (hits.includes(pick)) picks++;
    if (v === 'base') drift = Math.max(drift, ...labels.map((k) => Math.abs((d.find((o) => o.label === k)?.p ?? 0) - (c.recorded.find((o) => o.label === k)?.p ?? 0))));
    out.rows.push({ variant: v, turn: c.turn, pSet: p, pick, setLabel: sl, prompt: v === 'base' ? undefined : x.prompt });
  }
  out.variants[v] = { pSet: +(pset / cases.length).toFixed(3), picksSet: `${picks}/${cases.length}`, ...(v === 'base' ? { maxDriftFromRecorded: +drift.toFixed(3) } : {}) };
  console.log(v.padEnd(8), JSON.stringify(out.variants[v]));
}
fs.mkdirSync(path.join(HERE, 'runs', 's2-move'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'runs', 's2-move', `result-${RUN}${process.env.ONLY ? `-${process.env.ONLY}` : ''}.json`), JSON.stringify(out, null, 1));
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) });
