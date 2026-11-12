// OWN-023 round 3: the process and difficulty numbers of one arm, from its transcripts (never from what it says).
//   node metrics.mjs <arm root> [--json]
// Claude arms: sittings/<k>.jsonl (stream-json, subagents' turns included via parent_tool_use_id) + sittings.json.
// Vibe arms: sitting-<k>.out (the journal, one entry per line) + out-<k>/export.json + tap/tap.log.
// The quiz sitting (prompt 'then') is counted apart: it is closed book, so it should show no tool call at all.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const vibe = fs.existsSync(path.join(root, 'seal.sb'));
const sittings = JSON.parse(fs.readFileSync(path.join(root, 'sittings.json'), 'utf8'));
const SAVE = /save|storage|persist|localstorage|store\.js|state\.js/i;

const m = { arm: path.basename(root), harness: vibe ? 'vibe' : 'claude', sittings: [], quiz: null };
const tools = {}, files = new Set(), components = new Set(), errors = [], bashFirstWords = {};
let t0 = null, firstSave = null, planWrite = null, resultChars = 0, calls = 0, subagentCalls = 0, last = null;
const seen = (ts, input, name = '') => {
  const s = JSON.stringify(input || {});
  if (!firstSave && SAVE.test(s)) firstSave = ts;
  if (!planWrite && /PLAN\.md$/.test(String(input?.file_path || input?.filePath || input?.path || ''))) planWrite = ts;
};
const tally = (name, input, ts, sub) => {
  calls++; if (sub) subagentCalls++;
  tools[name] = (tools[name] || 0) + 1;
  const p = input?.file_path || input?.filePath || input?.path;
  if (p && /read/i.test(name)) files.add(String(p).replace(/^.*\/work\/gala\//, ''));
  const comp = input?.componentName || input?.component || input?.name || input?.arguments?.componentName || input?.arguments?.component;
  if (/get_component|validate_component/.test(name) && comp) components.add(comp);
  if (/call_tool/.test(name) && input?.name && /get_component/.test(input.name)) components.add(JSON.stringify(input.arguments || {}).slice(0, 80));
  if (/bash/i.test(name) && input?.command) {
    const cmd = String(input.command), w = cmd.trim().split(/\s+/)[0];
    bashFirstWords[w] = (bashFirstWords[w] || 0) + 1;
    // files a shell command reads by name (cat/sed/head/…); a glob or a grep over a folder isn't counted as a file read
    if (/^(cat|sed|head|tail|less|nl|awk|jq|python3?|node)\b/.test(w)) for (const f of cmd.match(/[\w./@-]*[\w-]+\.(?:m?js|json|css|html|csv)\b/g) || []) if (!/[*?]/.test(f)) files.add(f.trim().replace(/^.*\/work\/gala\//, ''));
  }
  if (/write/i.test(name)) seen(ts, input, name); else if (!firstSave && SAVE.test(JSON.stringify(input || {}))) firstSave = ts;
};

if (!vibe) {
  for (const s of sittings) {
    const file = path.join(root, 'sittings', `${s.k}.jsonl`);
    const quiz = s.prompt === 'then';
    let qcalls = 0;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      const ts = e.timestamp ? Date.parse(e.timestamp) : null;
      if (ts && !quiz) { t0 ??= ts; last = ts; }
      if (e.type === 'assistant') for (const c of e.message?.content || []) if (c.type === 'tool_use') { if (quiz) qcalls++; else tally(c.name, c.input, ts, !!e.parent_tool_use_id); }
      if (e.type === 'user' && !quiz) for (const c of e.message?.content || []) if (c.type === 'tool_result') {
        const text = typeof c.content === 'string' ? c.content : JSON.stringify(c.content || '');
        resultChars += text.length;
        if (c.is_error) errors.push(text.slice(0, 160));
      }
    }
    const row = { k: s.k, prompt: s.prompt, seconds: s.seconds, activeSeconds: s.activeSeconds, usd: s.usd, turns: s.turns, judge: s.judge?.verdict ?? null };
    if (quiz) m.quiz = { ...row, toolCalls: qcalls }; else m.sittings.push(row);
  }
} else {
  for (const s of sittings) {
    const quiz = s.prompt === 'then';
    let qcalls = 0, exp = null;
    try { exp = JSON.parse(fs.readFileSync(path.join(root, `out-${s.k}`, 'export.json'), 'utf8')); } catch {}
    const journal = quiz ? [] : fs.readFileSync(path.join(root, `sitting-${s.k}.out`), 'utf8').split('\n');
    for (const line of journal) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      const ts = e.createdAt || null;
      if (ts) { t0 ??= ts; last = ts; }
      if (e.type === 'effect') {
        const name = e.detail?.toolName || e.title;
        tally(name, e.detail?.input, ts, false);
        const out = e.state?.output ? JSON.stringify(e.state.output) : e.state?.outputText || '';
        resultChars += out.length;
        if (e.state?.status === 'failed') errors.push(String(e.state?.error?.message || '').slice(0, 160));
      }
    }
    const row = { k: s.k, prompt: s.prompt, seconds: s.seconds, usage: exp?.usage ?? null, vibeUsd: exp?.cost_usd ?? null, outcome: exp?.outcome ?? null, planWritten: s.planWritten };
    if (quiz) m.quiz = { ...row, toolCalls: qcalls }; else m.sittings.push(row);
  }
  // the tap's log: requests, retries, and the size of the context each request carried
  try {
    const log = fs.readFileSync(path.join(root, 'tap', 'tap.log'), 'utf8').split('\n');
    const posts = log.filter((l) => / POST /.test(l));
    const chars = posts.map((l) => Number((l.match(/chars=(\d+)/) || [])[1] || 0));
    m.tap = { requests: posts.length, retries: log.filter((l) => /try [2-9]/.test(l)).length, bad: log.filter((l) => /bad|fail/i.test(l)).length, maxContextChars: Math.max(0, ...chars) };
  } catch {}
}
const min = (a, b) => (a && b ? Number(((a - b) / 60000).toFixed(1)) : null);
Object.assign(m, {
  wallMinutes: min(last, t0), toolCalls: calls, subagentCalls, tools, bashFirstWords,
  filesRead: files.size, files: [...files].sort(), componentsRead: components.size,
  errors: errors.length, errorSamples: errors.slice(0, 8), resultMegachars: Number((resultChars / 1e6).toFixed(2)),
  minutesToFirstSaveLook: min(firstSave, t0), minutesToPlanWrite: min(planWrite, t0),
  planBytes: (() => { try { return fs.statSync(path.join(root, 'work', 'gala', 'PLAN.md')).size; } catch { return null; } })()
});
if (process.argv.includes('--json')) console.log(JSON.stringify(m, null, 2));
else { const { files: f, errorSamples: es, ...short } = m; console.log(JSON.stringify(short, null, 2)); }
