// OWN-034 lanes G4·code and G2·code: OWN-030's bare lane on §3's brief. One call, one answer, no loop, T 0.
//   node gemma-code.mjs <model> <out dir>        e.g. gemma4:e4b-it-qat runs/g4-code
// The prompt is the brief word for word (brief.txt) and one line that names the medium, as OWN-030's bare lane did
// ("One HTML file, CSS inline."); here the app also needs its JavaScript. The answer's fenced block (or the whole
// answer) is written to <out>/index.html; the call's numbers to <out>/ledger.json. The model is unloaded after.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [MODEL, outArg] = process.argv.slice(2);
if (!MODEL || !outArg) throw new Error('usage: node gemma-code.mjs <model> <out dir>');
const OUT = path.resolve(outArg);
if (fs.existsSync(OUT)) throw new Error(`${OUT} exists`);
const OLLAMA = 'http://127.0.0.1:11434';
const brief = fs.readFileSync(path.join(HERE, 'brief.txt'), 'utf8').trim();
const prompt = `${brief}\n\nWrite it as one HTML file, with the CSS and the JavaScript inline.`;

const ps = await (await fetch(`${OLLAMA}/api/ps`)).json();
if (ps.models?.length) throw new Error(`Ollama is busy (${ps.models.map((m) => m.name).join(', ')}); the OWN-031 session shares it`);
const digest = (await (await fetch(`${OLLAMA}/api/tags`)).json()).models.find((m) => m.name === MODEL)?.digest;

const t0 = Date.now();
const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify({ model: MODEL, stream: false, think: false, keep_alive: 0,
  messages: [{ role: 'user', content: prompt }], options: { temperature: 0, num_predict: 16000, num_ctx: 20480 } }) });
const j = await r.json();
const text = j.message?.content || '';
const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'answer.md'), text);
fs.writeFileSync(path.join(OUT, 'index.html'), (fenced ? fenced[1] : text).trim() + '\n');
const ledger = { model: MODEL, digest: digest?.slice(0, 12), prompt, temperature: 0, think: false, num_ctx: 20480,
  tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, done: j.done_reason, seconds: Math.round((Date.now() - t0) / 1000), error: j.error };
fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 1) + '\n');
console.log(JSON.stringify(ledger));
