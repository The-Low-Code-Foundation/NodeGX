// Reads a round's agent.jsonl (Vibe `--output streaming`) and prints what the agent said and called, in order, then
// the tool counts and, once the round has ended, Vibe's export (outcome, steps, tokens). Vibe's export reports
// `cached_input_tokens: 0` and prices every token at the uncached rate; the per-step journal (out/session/journal) carries
// the real cached counts, summed here as `cachedFromJournal`, and `estimatedUsd` reprices with them.
//   node peek.mjs <root> [--tail N] [--tag 2]   (--tag reads a --continue sitting's agent<tag>.jsonl / out<tag>/)
import fs from 'node:fs';
import path from 'node:path';

const [root, ...rest] = process.argv.slice(2);
const tailAt = rest.indexOf('--tail');
const tail = tailAt >= 0 ? Number(rest[tailAt + 1]) : Infinity;
const tagAt = rest.indexOf('--tag');
const tag = tagAt >= 0 ? rest[tagAt + 1] : '';
const lines = fs.readFileSync(path.join(root, `agent${tag}.jsonl`), 'utf8').split('\n').filter(Boolean);
const events = [];
const counts = {};
for (const line of lines) {
  let m;
  try { m = JSON.parse(line); } catch { continue; }
  if (m.type === 'effect') {
    const name = m.detail?.toolName;
    counts[name] = (counts[name] || 0) + 1;
    events.push(`TOOL ${name} ${JSON.stringify(m.detail?.input ?? {}).slice(0, 220)}`);
  } else if (m.role === 'assistant') {
    events.push(`SAY  ${(m.content || []).map((c) => c.text || '').join(' ').replace(/\s+/g, ' ').slice(0, 400)}`);
  }
}
console.log(events.slice(-tail).join('\n'));
console.log('\nTOOLS', JSON.stringify(Object.entries(counts).sort((a, b) => b[1] - a[1])));

const exp = path.join(root, `out${tag}`, 'export.json');
if (fs.existsSync(exp)) {
  const d = JSON.parse(fs.readFileSync(exp, 'utf8'));
  // Each step's usage object is written twice in the journal; one per distinct object.
  const seen = new Set();
  const journal = path.join(root, `out${tag}`, 'session', 'journal');
  for (const f of fs.existsSync(journal) ? fs.readdirSync(journal) : []) { // --legacy-harness writes no journal here
    for (const m of fs.readFileSync(path.join(journal, f), 'utf8').matchAll(/\{"cached_input_tokens":\d+,"input_tokens":\d+,"output_tokens":\d+,"total_tokens":\d+\}/g)) seen.add(m[0]);
  }
  const cached = [...seen].reduce((n, s) => n + JSON.parse(s).cached_input_tokens, 0);
  const u = d.usage;
  // --legacy-harness writes no journal but its export counts the cache correctly: use whichever is larger.
  const hit = Math.max(cached, u.cached_input_tokens || 0);
  const estimatedUsd = ((u.input_tokens - hit) * 0.68 + hit * 0.07 + u.output_tokens * 2.09) / 1e6;
  console.log('EXPORT', JSON.stringify({ outcome: d.outcome, stop: d.stop_reason, error: d.error, steps: d.steps, usage: u, vibeUsd: d.cost_usd, cachedFromJournal: cached, estimatedUsd: Number(estimatedUsd.toFixed(3)), started: d.started_at, ended: d.ended_at }));
}
