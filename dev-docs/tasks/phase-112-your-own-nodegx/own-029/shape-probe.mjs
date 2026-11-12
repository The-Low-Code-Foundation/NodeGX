// OWN-029 s3 — the organisation judge without the words, measured offline on the rounds the ledgers already hold.
// Every v4 round stored its "page.organised" question: the outline with each section's first headline after " — ".
// The probe strips the words (kind, ground and parts stay), asks the reviewer the shape question, and writes
// runs/shape-probe.json: { run, round, kept, org (with words), shape (without) } per round.
//   node shape-probe.mjs                          every R4, Q, S0, K and W run
// The question is shape.mjs's, the one agent.mjs asks as 'page.shape'.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLM } from './lm.mjs';
import { SHAPE_Q, stripWords } from './shape.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));

const ledger = { judgements: [], calls: [] };
const lm = makeLM({ model: 'gemma4:e4b-it-qat', judgeModel: 'gemma4:e4b-it-qat', ledger });
const runs = fs.readdirSync(path.join(HERE, 'runs')).filter((r) => /^(R4|Q|S0|K\d|W\d)-/.test(r)).sort();
const out = [];
for (const run of runs) {
  const f = path.join(HERE, 'runs', run, 'ledger.json');
  if (!fs.existsSync(f)) continue;
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of L.roundsLog) {
    const j = L.judgements.find((x) => x.key === 'page.organised' && x.round === r.round);
    if (!j) continue;
    const shape = await lm.judge('page.shape', `${stripWords(j.user)}\n\n${SHAPE_Q}`);
    out.push({ run, brief: L.brief, round: r.round, kept: !!r.kept, best: L.result?.bestRound === r.round, perLine: r.perLine, org: j.pYes, shape });
    console.log(`${run} r${r.round} org ${j.pYes} shape ${shape}`);
  }
}
fs.writeFileSync(path.join(HERE, 'runs', 'shape-probe.json'), JSON.stringify(out, null, 1));
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: 'gemma4:e4b-it-qat', keep_alive: 0 }) });
console.log(`wrote runs/shape-probe.json (${out.length} rounds)`);
