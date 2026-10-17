// OWN-008 grade for one stranger: `node grade.mjs <name> <labRoot> --adapter <path in lab> [--own-edits <path in lab>]
// [--saved <dir>]`. Writes <labRoot>/out/<name>/grade.json and prints a summary.
//   AC2  isolation: every path a tool call names, every refused call, and the todo copy and the repo's template
//        hashed before and after the round (round.mjs).
//   AC1  the suite (the stranger's own install of the command) with the stranger's adapter on a fresh copy of
//        templates/todo-list and the REPO's todo-list edit script, which the stranger never saw; the control (the same
//        adapter saving one number as a string) must FAIL; the stranger's own script too, if it wrote one.
//   AC1  --saved: a folder the stranger's editor saved after the drive. The official editor's validator
//        (`npm run validate:project`) on it and on the untouched template: a diagnostic that is new is a failure. Then
//        `validate_project` through the published `@nodegx/mcp@0.2.2`, with a HOME of its own.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../../../..');
const [name, labRoot, ...rest] = process.argv.slice(2);
const opt = (flag) => { const i = rest.indexOf(flag); return i < 0 ? undefined : rest[i + 1]; };
const LAB = path.join(labRoot, 'lab', name);
const OUT = path.join(labRoot, 'out', name);
const grade = { name, at: new Date().toISOString() };
const real = (p) => p.replace(/^\/private\/tmp\//, '/tmp/');
const inLab = (p) => real(path.resolve(LAB, p)).startsWith(real(LAB) + '/') || real(path.resolve(LAB, p)) === real(LAB);

// ---- AC2: isolation -------------------------------------------------------------------------------------------
const events = fs.readFileSync(path.join(OUT, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const calls = [];
for (const e of events) {
  if (e.type !== 'assistant') continue;
  for (const c of e.message.content) if (c.type === 'tool_use') calls.push({ tool: c.name, input: c.input });
}
const ABS = /(?:^|[\s'"=:(])(\/(?:Users|private|tmp|var|etc|opt|Applications|Library|System|usr|Volumes|home)\b[^\s'"`;|&)]*)/g;
const outside = [];
const climbs = [];
for (const c of calls) {
  const text = Object.values(c.input).filter((v) => typeof v === 'string').join('\n');
  for (const m of text.matchAll(ABS)) if (!inLab(m[1])) outside.push({ tool: c.tool, path: m[1] });
  if (/(^|[\s'"/])\.\.\//.test(text) || /\bcd \.\.(\s|$)/.test(text)) climbs.push({ tool: c.tool, text: text.slice(0, 200) });
}
const result = events.findLast((e) => e.type === 'result');
const before = JSON.parse(fs.readFileSync(path.join(OUT, 'before.json'), 'utf8'));
const afterFile = path.join(OUT, 'after.json');
const after = fs.existsSync(afterFile) ? JSON.parse(fs.readFileSync(afterFile, 'utf8')) : null;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
grade.isolation = {
  toolCalls: calls.length,
  skillsLoaded: calls.filter((c) => c.tool === 'Skill').map((c) => c.input.skill),
  pathsOutsideLab: [...new Map(outside.map((o) => [o.path, o])).values()],
  relativeClimbs: climbs,
  refused: (result?.permission_denials || []).map((d) => ({ tool: d.tool_name, input: JSON.stringify(d.tool_input).slice(0, 200) })),
  labTodoUnchanged: after ? same(before.labTodo, after.labTodo) : null,
  repoTodoUnchanged: after ? same(before.repoTodo, after.repoTodo) : null
};
grade.run = result ? {
  minutes: result.duration_ms / 60000, turns: result.num_turns, costUsd: result.total_cost_usd,
  subtype: result.subtype, usage: result.usage
} : null;

// ---- AC1: the suite ---------------------------------------------------------------------------------------------
const find = (dir, file) => {
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.home') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (p.endsWith(file)) hits.push(p);
    }
  };
  walk(dir);
  return hits;
};
const command = find(LAB, '@nodegx/project-contract/editor-suite-node.js')[0];
const adapterRel = opt('--adapter');
const suite = (label, adapter, editsPath, env = {}) => {
  const copy = path.join(OUT, `suite-${label}`, 'todo-list');
  fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  fs.cpSync(path.join(REPO, 'templates/todo-list'), copy, { recursive: true });
  const r = spawnSync('node', [command, adapter, copy, editsPath], {
    cwd: LAB, encoding: 'utf8', timeout: 300_000, env: { ...process.env, ...env }
  });
  return { exit: r.status, out: (r.stdout + r.stderr).trim().split('\n').slice(0, 40) };
};
if (command && adapterRel) {
  const adapter = path.resolve(LAB, adapterRel);
  const edits = path.join(OUT, 'todo-list.edits.json');
  fs.copyFileSync(path.join(REPO, 'packages/nodegx-project-contract/tests/fixtures/editor-suite/todo-list.edits.json'), edits);
  grade.suite = { command: path.relative(LAB, command), adapter: adapterRel };
  grade.suite.repoScript = suite('repo', adapter, edits);
  grade.suite.control = suite('control', path.join(HERE, 'control-adapter.cjs'), edits, { OWN008_ADAPTER: adapter });
  const own = opt('--own-edits');
  if (own) grade.suite.ownScript = suite('own', adapter, path.resolve(LAB, own));
} else {
  grade.suite = { missing: !command ? 'no editor-suite-node.js installed in the lab' : 'no --adapter given' };
}

// ---- AC1: the saved project -------------------------------------------------------------------------------------
const savedDir = opt('--saved');
if (savedDir) {
  const validate = (dir) => {
    const r = spawnSync('nice', ['-n', '19', 'npm', 'run', '-s', 'validate:project', '--', '--json', dir], {
      cwd: REPO, encoding: 'utf8', timeout: 120_000
    });
    const res = JSON.parse(r.stdout).results[0];
    return { exit: r.status, summary: res.summary, keys: res.diagnostics.map((d) =>
      `${d.severity} ${d.code} ${d.location?.component || ''} ${d.location?.nodeId || ''}`) };
  };
  const base = validate(path.join(REPO, 'templates/todo-list'));
  const saved = validate(path.resolve(savedDir));
  grade.officialValidator = { base: base.summary, saved: saved.summary, exit: saved.exit,
    newDiagnostics: saved.keys.filter((k) => !base.keys.includes(k)) };
  const home = fs.mkdtempSync(path.join(OUT, 'mcp-home-'));
  const env = { ...process.env, HOME: home };
  for (const k of Object.keys(env)) if (/^(NODEGX_|NOODL_|CLAUDE|MCP_)|KEY|TOKEN|SECRET/.test(k)) delete env[k];
  const r = spawnSync('node', [path.join(HERE, 'mcp-validate.mjs'), path.resolve(savedDir)], {
    cwd: OUT, encoding: 'utf8', timeout: 300_000, env
  });
  grade.mcpValidate = r.status === 0 ? JSON.parse(r.stdout.trim().split('\n').pop()) : { exit: r.status, err: r.stderr.slice(-800) };
}

fs.writeFileSync(path.join(OUT, 'grade.json'), JSON.stringify(grade, null, 2));
const s = grade.suite;
console.log(JSON.stringify({
  skills: grade.isolation.skillsLoaded, outside: grade.isolation.pathsOutsideLab.length,
  climbs: grade.isolation.relativeClimbs.length, refused: grade.isolation.refused.length,
  todoUnchanged: [grade.isolation.labTodoUnchanged, grade.isolation.repoTodoUnchanged],
  repoScript: s.repoScript ? [s.repoScript.exit, s.repoScript.out[0]] : s.missing,
  control: s.control ? [s.control.exit, s.control.out.slice(0, 3)] : undefined,
  ownScript: s.ownScript ? [s.ownScript.exit, s.ownScript.out[0]] : undefined,
  newOfficialDiagnostics: grade.officialValidator?.newDiagnostics, mcp: grade.mcpValidate?.summary,
  run: grade.run && { minutes: grade.run.minutes, turns: grade.run.turns, costUsd: grade.run.costUsd }
}, null, 1));
