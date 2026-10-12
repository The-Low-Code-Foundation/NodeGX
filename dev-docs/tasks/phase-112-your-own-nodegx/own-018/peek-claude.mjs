// Reads a round-claude.mjs round (`claude -p --output-format stream-json`): what the agent said and called, the tool
// counts, refusals, every path a file tool touched (the lab audit: anything outside work/apps is a leak), and the
// result line — turns, wall time, API-equivalent $ (a subscription run costs nothing; this is what the API would
// charge), and the cache share of input tokens.
//   node peek-claude.mjs <root> [--tail N]
import fs from 'node:fs';
import path from 'node:path';

const [root, ...rest] = process.argv.slice(2);
const tailAt = rest.indexOf('--tail');
const tail = tailAt >= 0 ? Number(rest[tailAt + 1]) : Infinity;
const apps = path.join(fs.realpathSync(root), 'work', 'apps');
const flat = (s, n) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const events = [];
const counts = {};
const paths = new Set();
let refusals = 0;
let result = null;
let model = null;
for (const line of fs.readFileSync(path.join(root, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean)) {
  let m;
  try { m = JSON.parse(line); } catch { continue; }
  if (m.type === 'system' && m.subtype === 'init') model = m.model;
  if (m.type === 'assistant') {
    for (const c of m.message.content || []) {
      if (c.type === 'tool_use') {
        counts[c.name] = (counts[c.name] || 0) + 1;
        events.push(`TOOL ${c.name} ${flat(JSON.stringify(c.input), 200)}`);
        for (const k of ['file_path', 'path', 'directory']) if (typeof c.input?.[k] === 'string') paths.add(c.input[k]);
      } else if (c.type === 'text') events.push(`SAY  ${flat(c.text, 400)}`);
    }
  }
  if (m.type === 'user') {
    for (const c of m.message.content || []) {
      if (c.type !== 'tool_result') continue;
      const text = Array.isArray(c.content) ? c.content.map((x) => x.text || '').join(' ') : c.content;
      if (c.is_error || /"ok":false/.test(text)) { refusals++; events.push(`       REFUSED ${flat(text, 260)}`); }
    }
  }
  if (m.type === 'result') result = m;
}
console.log(events.slice(-tail).join('\n'));
console.log('\nTOOLS', JSON.stringify(Object.entries(counts).sort((a, b) => b[1] - a[1])));
const outside = [...paths].filter((p) => !path.resolve(apps, p).startsWith(apps));
console.log('PATHS', JSON.stringify({ touched: paths.size, outsideTheFolder: outside }));
if (result) {
  const u = result.usage || {};
  const input = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  console.log('RESULT', JSON.stringify({
    model, subtype: result.subtype, turns: result.num_turns, wallS: Math.round((result.duration_ms || 0) / 1000),
    apiEquivalentUsd: result.total_cost_usd, refusals, inputTokens: input, outputTokens: u.output_tokens,
    cachePct: input ? Math.round((100 * (u.cache_read_input_tokens || 0)) / input) : null, modelUsage: result.modelUsage
  }));
  console.log('FINAL', flat(result.result, 1500));
} else console.log('RESULT none yet', fs.existsSync(path.join(root, 'agent.exit')) ? fs.readFileSync(path.join(root, 'agent.exit'), 'utf8') : 'running');
