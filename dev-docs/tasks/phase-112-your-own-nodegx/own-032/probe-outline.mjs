// OWN-032 s0 — can the builder read the tree outline back? (§4 s0, prediction 3 in RESULTS §1)
//
//   node probe-outline.mjs [model]
// Twelve "which node…" questions about the G-puppy hero as outline.mjs writes it (20 nodes, the form included), each
// answered through a schema whose only field is an enum of the node names (#0…#19), at temperature 0. The
// distribution over the names comes from the logprobs, as in lm.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outline } from './outline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = process.argv[2] || 'gemma4:e2b-it-qat';
const nodes = JSON.parse(fs.readFileSync(path.join(HERE, '../own-029/runs/G-puppy/r4/tree.json'), 'utf8')).sections[0].nodes;
const tree = outline(nodes);
const Q = [
  ['Which node holds the headline?', 5], ['Which node is the main button of the section?', 8], ['Which node is the photo?', 4],
  ['Which group holds the headline, the line under it and the button?', 3], ['Which node is the whole section band, the outermost one?', 0],
  ['Which node puts the words beside the photo?', 2], ['Which node sets the space between the headline and the line under it?', 3],
  ['Which node has the padding that keeps everything off the left and right edges of the screen?', 1], ['Which node holds the label of the email field?', 14],
  ['Which node is the button that sends the form?', 19], ['Which node holds the line under the headline?', 6], ['Which group holds the main button?', 7]
];
const names = nodes.map((_, i) => `#${i}`);
const rows = [];
for (const [q, want] of Q) {
  const user = `This is one section of a web page, as a tree of nodes. Each line is a node: its name (#n), its kind, its role in quotes, its settings in brackets, then its words.\n\n${tree}\n\n${q}`;
  const t = Date.now();
  const r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify({ model: MODEL, stream: false, think: false, logprobs: true, top_logprobs: 10,
    format: { type: 'object', properties: { node: { type: 'string', enum: names } }, required: ['node'] },
    messages: [{ role: 'system', content: 'You answer one question about building a web page. Reply with JSON only, matching the schema. Be brief.' }, { role: 'user', content: user }],
    options: { temperature: 0, num_predict: 30, num_ctx: 4096 }, keep_alive: '10m' }) });
  const j = await r.json();
  let got = null; try { got = JSON.parse(j.message.content).node; } catch {}
  rows.push({ q, want: `#${want}`, got, right: got === `#${want}`, tokensIn: j.prompt_eval_count, ms: Date.now() - t });
  console.log(`${got === `#${want}` ? 'RIGHT' : 'wrong'}  ${q}  want #${want} got ${got}  (${j.prompt_eval_count} tok, ${Date.now() - t} ms)`);
}
const right = rows.filter((r) => r.right).length;
console.log(`${MODEL}: ${right}/${rows.length}`);
fs.mkdirSync(path.join(HERE, 'runs/s0-outline'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'runs/s0-outline', `${MODEL.replace(/\W+/g, '-')}.json`), JSON.stringify({ model: MODEL, tree, right, rows }, null, 1));
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) });
