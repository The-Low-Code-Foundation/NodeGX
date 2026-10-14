// OWN-019 s3: the anatomy of a Vibe session — where its time and tokens go, read from what Vibe itself writes.
//
// Vibe `--output streaming` (agent<tag>.jsonl) stamps every event with createdAt/updatedAt (ms): a `reasoning` event
// spans one think, an `effect` spans one tool call (with its status and output), a `notice` carries hook decisions.
// `out<tag>/export.json` has the session's tokens and Vibe's cost. From those:
//   time     — wall clock split into thinking (reasoning spans), tools (effect spans), and the rest: the model's
//              silence before it streams (prefill + queue), answer text, the harness
//   thinks   — count, total and longest (chars, seconds), chars per second
//   tools    — by kind: read (notes, node types, examples, describes), write (components, plans), verify (drive,
//              render, validate), notes (write_file/edit in docs), files (read_file/grep), meta (todo, skill)
//   drives   — passed / failed (drive_page's own verdict line)
//   refusals — tool calls whose result was not ok; hook denials (by our hooks' wording)
//   tokens   — input, cached share, output, Vibe's $; input per answer
//
//   node anatomy.mjs <round-root> [<round-root> …] [--json out.json] [--timeline]   (--timeline prints every event)
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const timeline = args.includes('--timeline');
const roots = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');

const READS = new Set(['get_node_type', 'get_example', 'list_examples', 'get_project_info', 'get_style_vocabulary', 'list_components', 'get_component', 'list_project_docs', 'get_project_doc', 'find_tools', 'list_node_types', 'list_projects', 'open_project']);
const WRITES = new Set(['create_component', 'update_component', 'delete_component', 'create_plan', 'stage_plan_operation', 'apply_plan', 'discard_plan', 'create_project']);
const VERIFY = new Set(['drive_page', 'render_report', 'validate_component', 'validate_project']);
const HOOK_WORDS = /This sitting's step is done|This is sitting 1, the plan|past the size of a sitting|time to hand over|is written, so this session/;

function kindOf(tool, input) {
  if (tool === 'nodegx_call_tool' || tool === 'call_tool') {
    if (input?.describe) return 'read';
    const n = String(input?.name || '');
    return READS.has(n) ? 'read' : WRITES.has(n) ? 'write' : VERIFY.has(n) ? 'verify' : 'other';
  }
  const n = tool.replace(/^nodegx_/, '');
  if (READS.has(n)) return 'read';
  if (WRITES.has(n)) return 'write';
  if (VERIFY.has(n)) return 'verify';
  if (tool === 'write_file' || tool === 'edit') return /[\\/]docs[\\/]/.test(String(input?.file_path ?? input?.filePath ?? '')) ? 'notes' : 'file-write';
  if (tool === 'read_file' || tool === 'grep') return 'files';
  if (tool === 'todo' || tool === 'skill') return 'meta';
  return 'other';
}
const nameOf = (tool, input) => (tool.endsWith('call_tool') ? `${input?.describe ? 'describe:' : ''}${input?.name ?? '?'}` : tool.replace(/^nodegx_/, ''));

function session(root, tag) {
  const file = path.join(root, `agent${tag}.jsonl`);
  if (!fs.existsSync(file)) return null;
  const ev = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    try {
      const m = JSON.parse(line);
      if (m && m.type) ev.push(m);
    } catch {}
  }
  if (ev.length === 0) return null;
  const t0 = Math.min(...ev.map((e) => e.createdAt));
  const t1 = Math.max(...ev.map((e) => e.updatedAt ?? e.createdAt));
  const thinks = ev.filter((e) => e.type === 'reasoning').map((e) => ({ chars: (e.text || '').length, ms: e.updatedAt - e.createdAt, at: e.createdAt }));
  const effects = ev.filter((e) => e.type === 'effect').map((e) => {
    const tool = e.detail?.toolName || e.title;
    const input = e.detail?.input || {};
    const out = e.state?.output;
    const text = typeof out?.text === 'string' ? out.text : typeof out === 'string' ? out : '';
    const ok = e.state?.status === 'completed' && out?.ok !== false && !HOOK_WORDS.test(JSON.stringify(e.state ?? ''));
    return { tool, name: nameOf(tool, input), kind: kindOf(tool, input), ms: e.updatedAt - e.createdAt, ok, text, at: e.createdAt, end: e.updatedAt };
  });
  const msgs = ev.filter((e) => e.type === 'message' && e.role === 'assistant');
  const denials = effects.filter((e) => HOOK_WORDS.test(e.text)).length + ev.filter((e) => e.type === 'notice' && /deny/i.test(String(e.detail?.status)) ).length;
  const drives = effects.filter((e) => e.name === 'drive_page');
  const byKind = {};
  for (const e of effects) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const byName = {};
  for (const e of effects) byName[e.name] = (byName[e.name] || 0) + 1;
  // The model's silence: from the end of a tool call to the start of the next think or answer (prefill, queue, TTFT).
  const starts = [...thinks.map((t) => t.at), ...msgs.map((m) => m.createdAt)].sort((a, b) => a - b);
  const gaps = [];
  for (const e of effects) {
    const next = starts.find((s) => s >= e.end);
    if (next !== undefined) gaps.push(next - e.end);
  }
  const sum = (a) => a.reduce((n, x) => n + x, 0);
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
  let exp = null;
  try {
    exp = JSON.parse(fs.readFileSync(path.join(root, `out${tag}`, 'export.json'), 'utf8'));
  } catch {}
  const u = exp?.usage;
  const wallS = (t1 - t0) / 1000;
  const thinkS = sum(thinks.map((t) => t.ms)) / 1000;
  const toolS = sum(effects.map((e) => e.ms)) / 1000;
  const longest = thinks.reduce((a, t) => (t.chars > a.chars ? t : a), { chars: 0, ms: 0 });
  const r = {
    round: path.basename(root),
    tag: tag || '1',
    outcome: exp?.outcome ?? '(running or killed)',
    wallMin: +(wallS / 60).toFixed(1),
    thinkMin: +(thinkS / 60).toFixed(1),
    toolMin: +(toolS / 60).toFixed(1),
    otherMin: +((wallS - thinkS - toolS) / 60).toFixed(1),
    thinks: thinks.length,
    thinkKB: +(sum(thinks.map((t) => t.chars)) / 1024).toFixed(0),
    longestThinkKB: +(longest.chars / 1024).toFixed(0),
    longestThinkMin: +(longest.ms / 60000).toFixed(1),
    thinkCharsPerS: thinkS ? Math.round(sum(thinks.map((t) => t.chars)) / thinkS) : 0,
    medianSilenceS: +(med(gaps) / 1000).toFixed(1),
    silenceMin: +(sum(gaps) / 60000).toFixed(1),
    tools: effects.length,
    byKind,
    refused: effects.filter((e) => !e.ok).length,
    hookDenials: denials,
    drives: drives.length,
    drivesPassed: drives.filter((d) => /^PASSED/.test(d.text)).length,
    drivesFailed: drives.filter((d) => /^FAILED|"verdict":"failed"/.test(d.text)).length,
    inputK: u ? Math.round(u.input_tokens / 1000) : null,
    cachedPct: u ? Math.round((100 * (u.cached_input_tokens || 0)) / Math.max(1, u.input_tokens)) : null,
    outputK: u ? Math.round(u.output_tokens / 1000) : null,
    vibeUsd: exp?.cost_usd != null ? +exp.cost_usd.toFixed(2) : null,
    inputPerAnswerK: u && thinks.length ? Math.round(u.input_tokens / Math.max(thinks.length, msgs.length) / 1000) : null,
    topTools: Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => `${n}×${c}`).join(' ')
  };
  if (timeline) {
    const rows = [
      ...thinks.map((t) => ({ at: t.at, s: `THINK ${(t.chars / 1024).toFixed(1)} KB ${(t.ms / 1000).toFixed(0)} s` })),
      ...effects.map((e) => ({ at: e.at, s: `${e.kind.padEnd(10)} ${e.name} ${(e.ms / 1000).toFixed(1)} s${e.ok ? '' : ' NOT OK'}${e.name === 'drive_page' ? ' ' + e.text.slice(0, 40) : ''}` })),
      ...msgs.map((m) => ({ at: m.createdAt, s: `SAY ${(JSON.stringify(m.content) || '').slice(0, 100)}` }))
    ].sort((a, b) => a.at - b.at);
    console.log(`\n# ${r.round} session ${r.tag}`);
    for (const x of rows) console.log(`${((x.at - t0) / 60000).toFixed(1).padStart(6)} min  ${x.s}`);
  }
  return r;
}

const all = [];
for (const root of roots) {
  const tags = fs
    .readdirSync(root)
    .map((f) => /^agent(\d*)\.jsonl$/.exec(f)?.[1])
    .filter((t) => t !== undefined)
    .sort((a, b) => Number(a || 1) - Number(b || 1));
  for (const tag of tags) {
    const s = session(root, tag);
    if (s) all.push(s);
  }
}
const cols = ['round', 'tag', 'outcome', 'wallMin', 'thinkMin', 'toolMin', 'otherMin', 'thinks', 'longestThinkKB', 'longestThinkMin', 'thinkCharsPerS', 'medianSilenceS', 'tools', 'refused', 'drives', 'drivesPassed', 'inputK', 'cachedPct', 'vibeUsd'];
console.log(cols.join('\t'));
for (const r of all) console.log(cols.map((c) => r[c]).join('\t'));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 2));
