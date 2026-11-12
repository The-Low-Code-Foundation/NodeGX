// P124 — read a finished round: exit, minutes, turns, cost, the tools it used, whether the project copies changed,
// what it left running, and its report. `node verify.mjs <labRoot> [canvas]` → prints a summary and writes
// out/<name>/verify.json.
import fs from 'node:fs';
import path from 'node:path';

const [labRoot, name = 'canvas'] = process.argv.slice(2);
if (!labRoot) throw new Error('usage: verify.mjs <labRoot> [name]');
const OUT = path.join(labRoot, 'out', name);
const LAB = path.join(labRoot, 'lab', name);
const read = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
const exit = JSON.parse(read('agent.exit'));
const before = JSON.parse(read('before.json'));
const after = JSON.parse(read('after.json'));
const teardown = JSON.parse(read('teardown.json'));

const diff = (a, b) => { const out = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out.push(k); return out; };
const labChanged = diff(before.labTraining, after.labTraining);
const rootChanged = diff(before.rootTraining, after.rootTraining);

const tools = {}; let turns = 0; let result = null; let model = null; const writesOutside = [];
for (const line of read('agent.jsonl').split('\n')) {
  if (!line) continue; let e; try { e = JSON.parse(line); } catch { continue; }
  if (e.type === 'system' && e.subtype === 'init') model = e.model;
  if (e.type === 'assistant') { turns++; for (const c of e.message?.content || []) if (c.type === 'tool_use') { tools[c.name] = (tools[c.name] || 0) + 1; const fp = c.input?.file_path; if ((c.name === 'Write' || c.name === 'Edit') && fp && !fs.realpathSync.native(path.dirname(fs.existsSync(fp) ? fp : path.dirname(fp))).startsWith(fs.realpathSync(LAB))) writesOutside.push(fp); } }
  if (e.type === 'result') result = { subtype: e.subtype, costUsd: e.total_cost_usd, turns: e.num_turns, durationMs: e.duration_ms, usage: e.usage };
}
const report = fs.existsSync(path.join(LAB, 'REPORT.md')) ? fs.readFileSync(path.join(LAB, 'REPORT.md'), 'utf8') : null;
const shots = fs.readdirSync(LAB).filter((f) => /\.png$/.test(f));
const editor = fs.existsSync(path.join(LAB, 'editor', 'package.json')) ? JSON.parse(fs.readFileSync(path.join(LAB, 'editor', 'package.json'), 'utf8')) : null;

const summary = {
  model, exit, result, turns, tools, writesOutsideLab: [...new Set(writesOutside)],
  projectCopyInLabChanged: labChanged, projectCopyAtRootChanged: rootChanged, leftRunning: teardown,
  report: report ? { chars: report.length, head: report.slice(0, 400) } : null, screenshots: shots,
  editor: editor ? { name: editor.name, scripts: editor.scripts, dependencies: editor.dependencies } : null
};
fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, report: summary.report && { chars: summary.report.chars } }, null, 2));
