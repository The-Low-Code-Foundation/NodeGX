// OWN-032 s6 (11b) — a stricter third-look probe. 9d's caveats: seven of its eight warm requests used the look's own
// words ("warm", "friendly", "welcoming"), and no plain request was asked against three looks. Here:
//   strict  8 warm requests written WITHOUT warm, friendly, welcoming, soft, light or rounded (written before any model
//           was asked of them; the look's description says "warm and friendly: a soft light colour ground, rounded
//           shapes, a welcoming headline")
//   plain   the 20 PLAIN requests of 8d, which name no look
//   sets    the 11 run-set requests (10 from s3/s4, m-puppy from s6), to see where each lands with three looks
// Each through lookq.mjs lookOf3: all 6 orders, E2B at T 0, the answer is the look with the highest mean P.
//
//   node probe-look3b.mjs [--model gemma4:e2b-it-qat]     → runs/probe-look3b-<model>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookOf3 } from './lookq.mjs';
import { PLAIN } from './probe-look.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STRICT = [
  'A gentle, pastel page for my meditation retreat.',
  'Cosy and homely, like a cup of tea, for my village tea room.',
  'Something kind and caring for our hospice charity.',
  'A page for my children\'s nursery that feels like a hug.',
  'Make it feel cosy and kind, for my knitting circle.',
  'Pastel colours and a happy, approachable feel for my baby clothes shop.',
  'A caring, reassuring page for my family vet practice.',
  'Gentle and nurturing, for my yoga and wellbeing studio.'
];
export const SETS = [
  ['minimal', 'A simple, calm page for Maison Levain, our family bakery in Lyon. Lots of white space.'],
  ['stylish', 'Something bold and stylish for Maison Levain, our bakery in Lyon. Make it stand out.'],
  ['minimal', 'A clean, quiet page for The Blue Room\'s jazz evening on 14 November.'],
  ['stylish', 'The Blue Room, a jazz evening on 14 November. Dark, moody and glamorous.'],
  ['minimal', 'A plain, uncluttered page for Dupont Plumbing.'],
  ['stylish', 'Dupont Plumbing: make it look cool and confident, with strong colours.'],
  ['minimal', 'A calm, simple page for Park Runners, our Saturday morning running club in the park.'],
  ['stylish', 'Park Runners, our Saturday morning running club in the park. Make it bold, punchy and full of energy.'],
  ['minimal', 'A quiet, minimal page for Potter Portfolio: handmade bowls and weekend pottery classes. Lots of white space.'],
  ['stylish', 'Potter Portfolio: handmade bowls and weekend classes. Something striking and stylish, with a dark background.'],
  ['minimal', 'A simple, calm page for Puppy Haven, a puppy adoption site. Lots of white space.']
];

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const MODEL = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : 'gemma4:e2b-it-qat';
  const rows = [];
  for (const [set, want, request] of [...STRICT.map((r) => ['strict', 'warm', r]), ...PLAIN.map(([, r]) => ['plain', '?', r]), ...SETS.map(([w, r]) => ['sets', w, r])]) {
    const a = await lookOf3(MODEL, request);
    rows.push({ set, want, request, ...a, right: want === '?' ? undefined : a.style === want });
    console.log(`${set.padEnd(6)} ${want.padEnd(7)} ${a.style.padEnd(7)} top ${a.top.toFixed(3)}  ${Object.entries(a.mean).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  ')}  agree ${a.agree}/6  ${request}`);
  }
  const strict = rows.filter((r) => r.set === 'strict'), plain = rows.filter((r) => r.set === 'plain'), sets = rows.filter((r) => r.set === 'sets');
  const summary = {
    strict: { right: strict.filter((r) => r.right).length, of: strict.length, got: Object.fromEntries(['minimal', 'stylish', 'warm'].map((k) => [k, strict.filter((r) => r.style === k).length])) },
    plain: { got: Object.fromEntries(['minimal', 'stylish', 'warm'].map((k) => [k, plain.filter((r) => r.style === k).length])), tops: plain.map((r) => r.top).sort((a, b) => a - b) },
    sets: { right: sets.filter((r) => r.right).length, of: sets.length, tops: sets.map((r) => r.top).sort((a, b) => a - b) }
  };
  console.log('\n', JSON.stringify(summary));
  fs.writeFileSync(path.join(HERE, 'runs', `probe-look3b-${MODEL.replace(/[:/]/g, '_')}.json`), JSON.stringify({ model: MODEL, summary, rows }, null, 1));
  // unload what this probe loaded (16 GB box: the next job must find Ollama empty)
  await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
}
