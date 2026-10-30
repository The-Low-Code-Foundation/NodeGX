// Reads a lab arm as it is, for THE-TEST.md §3 and §5's measures, without touching it: its Claude Code transcripts
// (~/.claude/projects/<the folder's path, dashed>) and its git history. Per session: when, how long, dollars (the
// transcript's own cost-state line), the owner's prompts, tool calls in all and before the first edit, every run of the
// checker with its red gates, and every tool input that reaches outside the arm (the file tools are fenced by arm.mjs;
// Bash is not, so this is where a look at `..` shows). Then the game: commits, and lines in the files the agent made.
//   node _make/read-lab.mjs [<arm folder> …]        (default: both arms in ~/vscode_projects/platform-lab)
//   node _make/read-lab.mjs --gates                 (also runs the arm's own check.mjs and what.mjs: headless Chrome)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const gates = argv.includes('--gates');
const lab = path.join(os.homedir(), 'vscode_projects/platform-lab');
const arms = argv.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));
if (!arms.length) arms.push(path.join(lab, 'A'), path.join(lab, 'B'));

const EDITS = new Set(['Edit', 'Write', 'NotebookEdit']);
const minutes = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 6e4);
const texts = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(texts) : []);

function sessions(dir) {
  const where = path.join(os.homedir(), '.claude/projects', dir.replace(/[^A-Za-z0-9]/g, '-'));
  if (!fs.existsSync(where)) return [];
  return fs.readdirSync(where).filter((f) => f.endsWith('.jsonl')).map((f) => readSession(dir, path.join(where, f)))
    .filter((s) => s.first).sort((a, b) => a.first.localeCompare(b.first));
}

function readSession(dir, file) {
  const s = { id: path.basename(file, '.jsonl').slice(0, 8), first: null, last: null, cost: 0, prompts: [], tools: 0,
    beforeFirstEdit: null, firstEditAt: null, firstServeAt: null, checks: [], outside: [] };
  const pending = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'cost-state') s.cost = Math.max(s.cost, o.totalCostUSD ?? 0);
    if (o.timestamp && (o.type === 'user' || o.type === 'assistant')) { s.first ??= o.timestamp; s.last = o.timestamp; }
    const content = o.message?.content;
    if (o.type === 'user' && typeof content === 'string' && !o.isMeta && !content.startsWith('<')) s.prompts.push(content);
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (o.type === 'user' && c.type === 'text' && !o.isMeta && !o.isSidechain && !c.text.startsWith('<')) s.prompts.push(c.text);
      if (c.type === 'tool_use') {
        s.tools++;
        if (EDITS.has(c.name) && s.beforeFirstEdit === null) { s.beforeFirstEdit = s.tools - 1; s.firstEditAt = o.timestamp; }
        const cmd = c.name === 'Bash' ? String(c.input?.command ?? '') : '';
        if (/tools\/serve\.mjs|http\.server|npx (serve|vite|http-server)/.test(cmd)) s.firstServeAt ??= o.timestamp;
        if (/tools\/check\.mjs/.test(cmd)) pending.set(c.id, { at: o.timestamp, cmd });
        // A path under the home folder but not under the arm, or a step up out of it, is a reach outside.
        for (const t of texts(c.input)) {
          for (const m of t.matchAll(/(?:~|\/Users\/[^/\s'"]+)\/[^\s'"`]*/g)) {
            const p = m[0].replace(/^~/, os.homedir());
            if (!p.startsWith(dir) && !p.startsWith(path.join(os.homedir(), '.claude/projects', dir.replace(/[^A-Za-z0-9]/g, '-')))) s.outside.push(`${c.name}: ${m[0]}`);
          }
          if (c.name === 'Bash' && /(^|[\s;&|(])(cd|ls|cat|find|grep|rg|tree)\s+[^;&|]*\.\.(\/|\s|$)/.test(t)) s.outside.push(`Bash: ${t.slice(0, 120)}`);
        }
      }
      if (c.type === 'tool_result' && pending.has(c.tool_use_id)) {
        const out = texts(c.content).join('\n');
        const reds = [...out.matchAll(/^FAIL\s+(\d+)/gm)].map((m) => +m[1]);
        s.checks.push({ ...pending.get(c.tool_use_id), error: !!c.is_error, reds: [...new Set(reds)].sort((a, b) => a - b), fails: reds.length });
        pending.delete(c.tool_use_id);
      }
    }
  }
  return s;
}

function game(dir) {
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim();
  const log = git('log', '--reverse', '--format=%h %ad %s', '--date=iso').split('\n').filter(Boolean);
  const base = log[0]?.split(' ')[0];
  // The agent's files: tracked or untracked now, and not in the starting folder.
  const start = new Set(git('ls-tree', '-r', '--name-only', base).split('\n'));
  const now = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter((f) => f && !start.has(f) && fs.existsSync(path.join(dir, f)));
  const code = now.filter((f) => /\.(m?js|ts|html|css|glsl)$/.test(f));
  const lines = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').length;
  const why = code.reduce((n, f) => n + (fs.readFileSync(path.join(dir, f), 'utf8').match(/\/\/\s*why:/g) ?? []).length, 0);
  const changedKit = base ? git('diff', '--name-only', base, '--', 'kit', 'tools', 'vendor', 'assets').split('\n').filter(Boolean) : [];
  return { commits: log.length - 1, log: log.slice(1), files: now.length, code: code.length, lines: code.reduce((n, f) => n + lines(f), 0), why, changedKit };
}

for (const dir of arms) {
  console.log(`\n# ${dir}`);
  const ss = sessions(dir);
  let total = 0;
  for (const s of ss) {
    total += s.cost;
    console.log(`\n## session ${s.id}: ${s.first} → ${s.last} (${minutes(s.first, s.last)} min), $${s.cost.toFixed(2)}, ${s.tools} tool calls`);
    console.log(`- owner's prompts: ${s.prompts.length}${s.prompts[0] ? ` (first: "${s.prompts[0].slice(0, 100).replace(/\n/g, ' ')}")` : ''}`);
    console.log(`- first edit: ${s.firstEditAt ? `+${minutes(s.first, s.firstEditAt)} min, after ${s.beforeFirstEdit} tool calls` : 'none'}`);
    console.log(`- first server started: ${s.firstServeAt ? `+${minutes(s.first, s.firstServeAt)} min` : 'none seen'} (a proxy; the first picture is the owner's to name)`);
    console.log(`- check.mjs runs: ${s.checks.length}${s.checks.map((c) => `\n  - +${minutes(s.first, c.at)} min: ${c.reds.length ? `red ${c.reds.join(', ')}` : c.error ? 'exit ≠ 0, no FAIL line' : 'green'}`).join('')}`);
    console.log(`- reaches outside the arm: ${new Set(s.outside).size}${[...new Set(s.outside)].slice(0, 20).map((o) => `\n  - ${o}`).join('')}`);
  }
  if (!ss.length) console.log('\nno sessions yet');
  console.log(`\n## in all: ${ss.length} sessions, $${total.toFixed(2)}`);
  const g = game(dir);
  console.log(`- commits since the starting folder: ${g.commits}${g.log.map((l) => `\n  - ${l}`).join('')}`);
  console.log(`- files the agent made: ${g.files}, of them code ${g.code} (${g.lines} lines), \`// why:\` comments ${g.why}`);
  console.log(`- kit, tools, vendor or assets changed: ${g.changedKit.length ? g.changedKit.join(', ') : 'none'}`);
  if (gates && fs.existsSync(path.join(dir, 'tools/check.mjs'))) {
    for (const tool of ['what.mjs', 'check.mjs']) {
      const r = spawnSync(process.execPath, [path.join(dir, 'tools', tool)], { cwd: dir, encoding: 'utf8' });
      console.log(`\n## node tools/${tool}: exit ${r.status}\n\n\`\`\`\n${(r.stdout + r.stderr).trim().slice(-4000)}\n\`\`\``);
    }
  }
}
