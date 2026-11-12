// OWN-032 s0 — can the reviewer answer a FACT about a hero picture? (§4 s0, the prediction in RESULTS §1)
//
//   node probe-vision.mjs render <bench project>        the variants, rendered at 1280 and 390, with their DOM facts
//   node probe-vision.mjs ask <model> [--tag e4b]        every fact question of every picture, P(yes) from logprobs
//   node probe-vision.mjs report                         separation per question per model
//
// Each variant is the OWN-030 puppy hero (G-puppy r4, its form taken out) with ONE fault switched on, so the DOM
// measure (bench.mjs FACTS) is the answer key and the picture is what the model sees.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { openBench, writeHero } from './bench.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'runs/s0-vision');
const [cmd, arg, ...rest] = process.argv.slice(2);

const base = () => JSON.parse(fs.readFileSync(path.join(HERE, '../own-029/runs/G-puppy/r4/tree.json'), 'utf8')).sections[0].nodes.slice(0, 9);
// 0 band, 1 shell, 2 columns, 3 words, 4 image, 5 headline, 6 sub-line, 7 button row, 8 button
const set = (nodes, i, p) => { Object.assign(nodes[i].params, p); return nodes; };
const left = (n) => { set(n, 3, { alignItems: 'flex-start' }); set(n, 5, { textAlignX: 'left' }); set(n, 6, { textAlignX: 'left' }); set(n, 7, { justifyContent: 'flex-start' }); return n; };
export const VARIANTS = {
  clean: (n) => n,
  cleanLeft: (n) => left(n),
  touching: (n) => set(set(n, 3, { rowGap: '0px' }), 7, { paddingTop: '0px' }),
  touchingLeft: (n) => set(set(left(n), 3, { rowGap: '0px' }), 7, { paddingTop: '0px' }),
  atEdge: (n) => set(set(left(n), 1, { paddingLeft: '0px', paddingRight: '0px' }), 6, { maxWidth: undefined }),
  photoCut: (n) => set(n, 4, { width: { value: 900, unit: 'px' } }),
  buttonWide: (n) => set(set(n, 7, { sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }), 8, { width: { value: 100, unit: '%' }, sizeMode: 'contentHeight' }),
  unaligned: (n) => set(set(set(n, 5, { textAlignX: 'left' }), 3, { alignItems: 'flex-start' }), 7, { justifyContent: 'flex-end', width: { value: 100, unit: '%' }, sizeMode: 'contentHeight' }),
  lowContrast: (n) => set(set(n, 6, { color: 'var(--foreground)' }), 8, { backgroundColor: 'var(--primary)', color: 'var(--primary)' }),
  everything: (n) => set(set(set(VARIANTS.touchingLeft(n), 1, { paddingLeft: '0px', paddingRight: '0px' }), 7, { sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }), 8, { width: { value: 100, unit: '%' }, sizeMode: 'contentHeight' })
};

// The questions. Every one is phrased so YES means the fault is there; `fact` is the DOM key that answers it.
export const QUESTIONS = [
  { id: 'touching', fact: (f) => f.touching.length > 0, q: 'Look at the words and the button in this picture. Are any two of them touching each other, with no space between them?' },
  { id: 'atEdge', fact: (f) => f.atEdge.length > 0, q: 'Is any text touching, or almost touching, the left or right edge of the picture?' },
  { id: 'photoCut', fact: (f) => f.photoCut.length > 0, q: 'Is the photo cut off by the edge of the picture, so that part of it is missing?' },
  { id: 'buttonWide', fact: (f) => f.buttonWide.length > 0, q: 'Is the button much wider than the words written on it?' },
  { id: 'contrast', fact: (f) => f.lowContrast.length > 0, q: 'Is any of the text hard to read because its colour is too close to the colour behind it?' },
  { id: 'unaligned', fact: (f) => f.unaligned.length > 0, q: 'Are the headline, the line under it and the button out of line with each other, for example some centred and some starting at the left?' }
];

if (cmd === 'render') {
  const bench = await openBench(arg);
  const index = [];
  for (const [name, fn] of Object.entries(VARIANTS)) {
    const nodes = fn(base());
    for (const n of nodes) for (const k of Object.keys(n.params)) if (n.params[k] === undefined) delete n.params[k];
    writeHero(arg, nodes);
    const r = await bench.shoot(path.join(OUT, name));
    for (const w of ['desktop', 'phone']) index.push({ variant: name, width: w, png: `${name}/${w}.png`, truth: Object.fromEntries(QUESTIONS.map((q) => [q.id, q.fact(r[w].facts)])), facts: r[w].facts });
    console.log(name, r.ms, 'ms', JSON.stringify(index.slice(-2).map((x) => x.truth)));
  }
  await bench.close();
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
}

if (cmd === 'ask') {
  const model = arg, tag = rest[rest.indexOf('--tag') + 1] || model.replace(/\W+/g, '-');
  const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
  const answers = [];
  // --crop: the picture cut to the words and the button (40 px round them), from the screen's left edge, so the detail a
  // fact lives in is not shrunk away (a whole shot costs the model 148–339 tokens). The photo question is left out.
  const CROP = rest.includes('--crop');
  for (const pic of index) {
    let file = path.join(OUT, pic.png);
    if (CROP) {
      const b = pic.facts.blocks, W = pic.facts.width;
      const y0 = Math.max(0, Math.min(...b.map((x) => x.y)) - 40), y1 = Math.max(...b.map((x) => x.y + x.h)) + 40, x1 = Math.min(W, Math.max(...b.map((x) => x.x + x.w)) + 40);
      const out = file.replace('.png', '-crop.png');
      execFileSync('sips', ['-c', String(y1 - y0), String(x1), '--cropOffset', String(y0), '0', file, '--out', out], { stdio: 'ignore' });
      file = out;
    }
    const img = fs.readFileSync(file).toString('base64');
    for (const q of QUESTIONS.filter((q) => !CROP || q.id !== 'photoCut')) {
      const t = Date.now();
      const r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify({ model, stream: false, think: false, logprobs: true, top_logprobs: 10,
        messages: [{ role: 'user', content: `${q.q} Answer yes or no.`, images: [img] }], options: { temperature: 0, num_predict: 1, num_ctx: 4096 }, keep_alive: '10m' }) });
      const j = await r.json();
      let y = 0, n = 0;
      for (const x of j.logprobs?.[0]?.top_logprobs || []) { const k = x.token.trim().toLowerCase(); if (k === 'yes') y += Math.exp(x.logprob); if (k === 'no') n += Math.exp(x.logprob); }
      const pYes = y + n ? +(y / (y + n)).toFixed(3) : null;
      answers.push({ crop: CROP || undefined, variant: pic.variant, width: pic.width, q: q.id, truth: pic.truth[q.id], pYes, tokensIn: j.prompt_eval_count, ms: Date.now() - t });
      process.stdout.write(`${pic.variant}/${pic.width} ${q.id}: truth ${pic.truth[q.id]} pYes ${pYes} (${j.prompt_eval_count} tok, ${Date.now() - t} ms)\n`);
    }
  }
  fs.writeFileSync(path.join(OUT, `answers-${tag}.json`), JSON.stringify({ model, at: new Date().toISOString(), answers }, null, 1));
  await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model, keep_alive: 0 }) });
}

if (cmd === 'report') {
  for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith('answers-'))) {
    const { model, answers } = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    console.log(`\n${model}`);
    for (const q of QUESTIONS) {
      const a = answers.filter((x) => x.q === q.id && x.pYes !== null);
      const mean = (xs) => (xs.length ? +(xs.reduce((s, x) => s + x.pYes, 0) / xs.length).toFixed(3) : null);
      const yes = a.filter((x) => x.truth), no = a.filter((x) => !x.truth);
      const right = a.filter((x) => (x.pYes > 0.5) === x.truth).length;
      console.log(`  ${q.id.padEnd(11)} fault present ${String(mean(yes)).padEnd(6)} (n ${yes.length})  absent ${String(mean(no)).padEnd(6)} (n ${no.length})  separation ${mean(yes) !== null && mean(no) !== null ? (mean(yes) - mean(no)).toFixed(3) : '—'}  right ${right}/${a.length}`);
    }
  }
}
