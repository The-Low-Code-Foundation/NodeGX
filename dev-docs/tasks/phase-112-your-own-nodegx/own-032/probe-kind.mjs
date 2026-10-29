// OWN-032 s2 — why the arm adds empty Groups: the "which kind?" call, re-asked with one change at a time.
//
//   node probe-kind.mjs [run ...]      default: w2-puppy w3-puppy; writes runs/s2-kind/result.json
//
// Every asked `add.kind` call of the runs is taken with its recorded prompt, while the goal still lacked a part. Each
// variant changes ONE thing in that prompt and asks E2B again at temperature 0. The score is P(a kind the goal still
// lacks) and P(Group). `base` is the control: the recorded prompt unchanged, which must give back the recorded odds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, chat, dist } from './door.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'gemma4:e2b-it-qat';
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['w2-puppy', 'w3-puppy'];
const KIND = { 'a headline': 'Text', 'a line under the headline': 'Text', 'a button': 'Button', 'a photo': 'Image' };
const SAY = { Group: 'Group (a box that holds other parts)', Columns: 'Columns (two columns side by side, one under the other on a phone)', Text: 'Text (words)', Image: 'Image (the photo)', Button: 'Button' };
const ALL = ['Group', 'Columns', 'Text', 'Image', 'Button'];

const missingOf = (p) => { const m = p.match(/Not there yet: (.*)\.\n/); return m ? m[1].split(', ').map((s) => s.trim()) : []; };
const kindsOf = (p) => [...new Set(missingOf(p).map((s) => KIND[s]).filter(Boolean))];
const list = (kinds, mark = []) => kinds.map((k) => `- ${SAY[k]}${mark.includes(k) ? ' — still missing' : ''}`).join('\n');
const withList = (p, kinds, mark) => p.replace(/Which kind\?\n[\s\S]*$/, `Which kind?\n${list(kinds, mark)}`);
const named = (p) => p.replace(/Not there yet: (.*)\.\n/, (m, s) => `Not there yet: ${s.split(', ').map((x) => `${x} (${KIND[x] === 'Image' ? 'an' : 'a'} ${KIND[x]})`).join(', ')}.\n`);
const noLast = (p) => p.replace(/\nYOUR LAST STEPS:\n(- .*\n)+/, '');
const missingFirst = (p) => { const m = kindsOf(p); return [...m, ...ALL.filter((k) => !m.includes(k) && k !== 'Group'), 'Group']; };

const VARIANTS = {
  base: (p) => ({ prompt: p, kinds: ALL }),
  order: (p) => ({ prompt: withList(p, missingFirst(p)), kinds: missingFirst(p) }),
  mark: (p) => ({ prompt: withList(p, ALL, kindsOf(p)), kinds: ALL }),
  named: (p) => ({ prompt: named(p), kinds: ALL }),
  noLast: (p) => ({ prompt: noLast(p), kinds: ALL }),
  all: (p) => { const k = missingFirst(p); return { prompt: withList(noLast(named(p)), k, kindsOf(p)), kinds: k }; },
  allKeepLast: (p) => { const k = missingFirst(p); return { prompt: withList(named(p), k, kindsOf(p)), kinds: k }; }
};
// ONLY=a,b asks just those variants (the result file then holds only them)
if (process.env.ONLY) for (const v of Object.keys(VARIANTS)) if (!process.env.ONLY.split(',').includes(v)) delete VARIANTS[v];

const cases = runs.flatMap((r) => JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${r}`, 'ledger.json'), 'utf8')).turns
  .flatMap((t) => t.calls.filter((c) => c.key === 'add.kind' && !c.replayed && !c.forced && kindsOf(c.prompt).length).map((c) => ({ run: r, turn: t.turn, prompt: c.prompt, recorded: c.options }))));
console.log(`${cases.length} add.kind calls with a part still missing`);
const out = { model: MODEL, runs, cases: cases.length, variants: {}, rows: [] };
for (const [v, f] of Object.entries(VARIANTS)) {
  let lack = 0, group = 0, picks = 0, drift = 0;
  for (const c of cases) {
    const { prompt, kinds } = f(c.prompt);
    const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], { format: { type: 'object', properties: { pick: { type: 'string', enum: kinds } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, kinds) || [];
    const p = (k) => d.find((o) => o.label === k)?.p ?? 0;
    const miss = kindsOf(c.prompt), pl = miss.reduce((s, k) => s + p(k), 0);
    lack += pl; group += p('Group');
    let pick = null; try { pick = JSON.parse(j.message.content).pick; } catch {}
    if (miss.includes(pick)) picks++;
    if (v === 'base') drift = Math.max(drift, ...ALL.map((k) => Math.abs(p(k) - (c.recorded.find((o) => o.label === k)?.p ?? 0))));
    out.rows.push({ variant: v, run: c.run, turn: c.turn, missing: miss, pick, pLacking: +pl.toFixed(3), pGroup: p('Group') });
  }
  out.variants[v] = { pLacking: +(lack / cases.length).toFixed(3), pGroup: +(group / cases.length).toFixed(3), picksALackingKind: `${picks}/${cases.length}`, ...(v === 'base' ? { maxDriftFromRecorded: +drift.toFixed(3) } : {}) };
  console.log(v.padEnd(7), JSON.stringify(out.variants[v]));
}
fs.mkdirSync(path.join(HERE, 'runs', 's2-kind'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'runs', 's2-kind', process.env.ONLY ? `result-${process.env.ONLY}.json` : 'result.json'), JSON.stringify(out, null, 1));
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) });
