// Reads a round's agent.jsonl (`opencode run --format json`, round-opencode.mjs) and prints what the agent said and
// called, in order, then the tool counts and the token usage. OpenCode 1.19.0 writes one JSON object per line:
// step_start / tool_use (on completion or error, with input and output) / text / reasoning / step_finish (tokens and
// OpenCode's own cost for that step, priced from models.dev) / error. A permission OpenCode ASKED for (and `run`
// auto-rejected) is not in the JSON; it is a "permission requested: …; auto-rejecting" line in agent.stderr, listed here.
//   node peek-opencode.mjs <root> [--tail N]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [root, ...rest] = process.argv.slice(2);
const tailAt = rest.indexOf('--tail');
const tail = tailAt >= 0 ? Number(rest[tailAt + 1]) : Infinity;
const lines = fs.readFileSync(path.join(root, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean);
const flat = (s, n) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const events = [];
const counts = {};
const usage = { steps: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, opencodeUsd: 0 };
for (const line of lines) {
  let m;
  try { m = JSON.parse(line); } catch { continue; }
  const p = m.part || {};
  if (m.type === 'tool_use') {
    counts[p.tool] = (counts[p.tool] || 0) + 1;
    const st = p.state || {};
    const result = st.status === 'error' ? `ERROR ${flat(st.error, 200)}` : `→ ${flat(st.output, 200)}`;
    events.push(`TOOL ${p.tool} ${flat(JSON.stringify(st.input ?? {}), 220)}\n       ${result}`);
  } else if (m.type === 'text') {
    events.push(`SAY  ${flat(p.text, 400)}`);
  } else if (m.type === 'reasoning') {
    events.push(`THINK ${flat(p.text, 200)}`);
  } else if (m.type === 'error') {
    events.push(`ERROR ${flat(JSON.stringify(m.error), 300)}`);
  } else if (m.type === 'step_finish') {
    const t = p.tokens || {};
    usage.steps++;
    usage.input += t.input || 0;
    usage.output += t.output || 0;
    usage.reasoning += t.reasoning || 0;
    usage.cacheRead += t.cache?.read || 0;
    usage.cacheWrite += t.cache?.write || 0;
    usage.opencodeUsd += p.cost || 0;
  }
}
console.log(events.slice(-tail).join('\n'));
console.log('\nTOOLS', JSON.stringify(Object.entries(counts).sort((a, b) => b[1] - a[1])));

const stderr = path.join(root, 'agent.stderr');
const asked = fs.existsSync(stderr) ? fs.readFileSync(stderr, 'utf8').split('\n').filter((l) => l.includes('permission requested:')) : [];
if (asked.length) console.log('ASKED+REJECTED', JSON.stringify(asked.map((l) => flat(l.replace(/\x1b\[[0-9;]*m/g, ''), 240))));

// Mistral Large 4: $0.68/M input, $0.07/M cached input, $2.09/M output. OpenCode's `input` excludes the cache read.
const estimatedUsd = (usage.input * 0.68 + usage.cacheRead * 0.07 + (usage.output + usage.reasoning) * 2.09) / 1e6;
const exit = path.join(root, 'agent.exit');
console.log('USAGE (main session)', JSON.stringify({ ...usage, opencodeUsd: Number(usage.opencodeUsd.toFixed(4)), estimatedUsd: Number(estimatedUsd.toFixed(4)), exit: fs.existsSync(exit) ? fs.readFileSync(exit, 'utf8') : 'running' }));

// The JSON stream carries the main session only: a subagent's (`task`) steps are billed but never printed. OpenCode's
// own database has every assistant message of every session (oc-smoke1: 6 main steps $0.092, all sessions $0.103).
// Not counted anywhere: the session-title call, one short request to the same model.
const db = path.join(root, 'home', '.local', 'share', 'opencode', 'opencode.db');
if (fs.existsSync(db)) {
  const q = "select json_extract(data,'$.agent'), count(*), count(distinct session_id), sum(json_extract(data,'$.tokens.input')), sum(json_extract(data,'$.tokens.output')), sum(json_extract(data,'$.tokens.reasoning')), sum(json_extract(data,'$.tokens.cache.read')), round(sum(json_extract(data,'$.cost')),4) from message where json_extract(data,'$.role')='assistant' group by 1";
  const r = spawnSync('sqlite3', ['-readonly', '-json', db, q], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) {
    const rows = JSON.parse(r.stdout).map((o) => Object.values(o));
    for (const [agent, steps, sessions, input, output, reasoning, cacheRead, usd] of rows) console.log('USAGE (all sessions)', JSON.stringify({ agent, sessions, steps, input, output, reasoning, cacheRead, opencodeUsd: usd }));
    console.log('TOTAL USD', rows.reduce((n, row) => n + (row[7] || 0), 0).toFixed(4));
  } else console.log('USAGE (all sessions) unavailable:', flat(r.stderr || r.error, 200));
}
