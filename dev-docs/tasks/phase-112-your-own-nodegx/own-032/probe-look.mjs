// OWN-032 s3 — does the 2B model hear the LOOK a person asks for? Richard, after AC5: "it would be good if we could be
// sure the model is responding to the prompt, so if the user asks for something a bit cooler and more stylish, they
// won't get look B". One closed question per request, E2B at temperature 0, asked twice with the two looks in both
// orders (5a found the menu's first option drawing 0.4 of the odds on its own); the answer is the mean of the two.
//
//   node probe-look.mjs [--model gemma4:e2b-it-qat] [--question 1|2]   → runs/probe-look-<model>-q<n>.json
// `want` is written before any model is asked (RESULTS §7 pre-registers the bar: ≥ 14 of 16 explicit requests right).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, chat, dist } from './door.mjs';
import { LOOKS } from './lookq.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MODEL = opt('--model', 'gemma4:e2b-it-qat'), Q = opt('--question', '1');

export const REQUESTS = [
  ['minimal', 'A clean, minimal website for my bakery.'],
  ['minimal', 'A landing page for my dog walking business. Simple and calm, lots of white space.'],
  ['minimal', 'Minimalist and understated, please. It is for my architecture studio.'],
  ['minimal', 'Keep it simple and airy. A page for my pottery classes.'],
  ['minimal', 'A Scandinavian feel, light and quiet, for my furniture shop.'],
  ['minimal', 'Plain and professional, nothing flashy. A page for my accountancy firm.'],
  ['minimal', 'Elegant and minimal on a white background, for a wedding photographer.'],
  ['minimal', 'A calm, uncluttered page for my yoga studio.'],
  ['stylish', 'Make me something cool and stylish for my barber shop.'],
  ['stylish', 'A bold, striking landing page for my gym.'],
  ['stylish', 'A jazz evening on 14 November. Dark and elegant.'],
  ['stylish', 'Vibrant and eye-catching, for a summer music festival.'],
  ['stylish', 'Modern and edgy, it has to make a statement. It is for my streetwear brand.'],
  ['stylish', 'A moody, dramatic look for my cocktail bar.'],
  ['stylish', 'Punchy colours and high energy, for a kids\' trampoline park.'],
  ['stylish', 'Sleek and premium with a dark background, for my car detailing business.'],
  // no look named: no right answer, the default is what we learn
  ['?', 'A website for my bakery.'],
  ['?', 'Make me a puppy adoption landing page please, blue colour theme, modern style.'],
  ['?', 'A page for my plumbing business.'],
  ['?', 'A page for my jazz night.'],
  ['?', 'A site for my running club.'],
  ['?', 'Landing page for a family bakery in Lyon, warm colours.']
];

const ask = (request, order) => {
  const opts = order.map((k) => `- ${k}: ${LOOKS[k]}`).join('\n');
  return Q === '2'
    ? `A person asked for a web page in these words:\n"${request}"\n\nRead only the words about how it should LOOK. Which of these two looks matches them best?\n${opts}`
    : `A person asked for a web page:\n"${request}"\n\nWhich look are they asking for?\n${opts}`;
};

const rows = [];
for (const [want, request] of REQUESTS) {
  const per = {};
  for (const order of [['minimal', 'stylish'], ['stylish', 'minimal']]) {
    const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: ask(request, order) }], { format: { type: 'object', properties: { pick: { type: 'string', enum: order } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, order);
    per[order[0]] = { pick: JSON.parse(j.message.content).pick, pStylish: d?.find((x) => x.label === 'stylish')?.p ?? null };
  }
  const pS = +(((per.minimal.pStylish ?? 0) + (per.stylish.pStylish ?? 0)) / 2).toFixed(3);
  const got = pS >= 0.5 ? 'stylish' : 'minimal';
  rows.push({ want, request, pStylish: pS, got, right: want === '?' ? null : got === want, minimalFirst: per.minimal, stylishFirst: per.stylish });
  console.log(`${want.padEnd(7)} ${got.padEnd(7)} P(stylish) ${pS.toFixed(2)} (min-first ${per.minimal.pStylish}, sty-first ${per.stylish.pStylish})  ${request}`);
}
const explicit = rows.filter((r) => r.want !== '?');
const right = explicit.filter((r) => r.right).length;
console.log(`\nexplicit: ${right}/${explicit.length} right; no look named: ${rows.filter((r) => r.want === '?').map((r) => r.got).join(', ')}`);
fs.writeFileSync(path.join(HERE, 'runs', `probe-look-${MODEL.replace(/[:/]/g, '_')}-q${Q}.json`), JSON.stringify({ model: MODEL, question: Q, looks: LOOKS, right, of: explicit.length, rows }, null, 1));
// unload what this probe loaded (16 GB box: the next job must find Ollama empty)
await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
