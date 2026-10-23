// OWN-026: one grade of one round (PLAN.md §5). A fresh Opus in Claude Code, on a COPY of the round's folder and
// HOME (backend data included), runs the named checks of checks.md and writes grade.json.
//
//   node grade.mjs <round-root> <grade-root> --ids S0,F1,…  [--request <file>] [--model claude-opus-5-5] [--cap 40]
//
// The fence: every shell command the grader runs goes through <grade-root>/shell-prefix.sh, which gives it the copy's
// HOME and runs it under sandbox-exec (no reading Richard's home, the scratchpads, or any round of the lab; only this
// grade's folder, the grader kit and node). Claude Code's own file tools are fenced by deny rules on the same places.
// Claude Code itself keeps Richard's HOME, for its login (OWN-023).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = '/Users/Shared/nodegx-lab';
const KIT = path.join(LAB, 'grader-kit');
const NODE_DIR = path.dirname(process.execPath);
const [roundArg, gradeArg, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const IDS = opt('--ids', null);
if (!roundArg || !gradeArg || !IDS) throw new Error('usage: node grade.mjs <round-root> <grade-root> --ids S0,F1,…');
if (fs.existsSync(gradeArg)) throw new Error(`${gradeArg} exists`);
const round = fs.realpathSync(roundArg);
fs.mkdirSync(gradeArg, { recursive: true });
const G = fs.realpathSync(gradeArg);
if (![path.join(LAB, 'own026-grades'), path.join(LAB, 'own026-mocks')].some((d) => G.startsWith(d + '/'))) throw new Error('a grade root sits under ' + path.join(LAB, 'own026-grades'));
const APP = path.join(G, 'app');
const HOME = path.join(G, 'home');
const WORK = path.join(G, 'work');
const OUT = path.join(G, 'grade.json');
for (const d of [WORK, path.join(HOME, 'tmp')]) fs.mkdirSync(d, { recursive: true });

// The copy: the folder and HOME as the round left them (servers were reaped by round.mjs), minus Cline's own chat.
fs.cpSync(path.join(round, 'work', 'apps'), APP, { recursive: true, verbatimSymlinks: true });
fs.cpSync(path.join(round, 'home'), HOME, { recursive: true, verbatimSymlinks: true, filter: (p) => !p.startsWith(path.join(round, 'home', '.cline')) });
const sittings = JSON.parse(fs.readFileSync(path.join(round, 'sittings.json'), 'utf8'));
const r = JSON.parse(fs.readFileSync(path.join(round, 'round.json'), 'utf8'));
const request = fs.readFileSync(opt('--request', r.request), 'utf8').trim();
const last = sittings.findLast((s) => s.last)?.last ?? '(the assistant ended without a message)';
// The round's kit carried its own @nodegx/preview: the grader's `npx @nodegx/preview` runs it too (round.mjs, same shim).
const kitDir = r.kit && typeof r.kit === 'object' ? r.kit.dir : null;
const previewTgz = kitDir && r.kit.files.find((f) => /^nodegx-preview-.*\.tgz$/.test(f)) ? path.join(kitDir, r.kit.files.find((f) => /^nodegx-preview-.*\.tgz$/.test(f))) : null;

const ancestors = (p) => { const out = []; for (let d = path.dirname(p); d !== '/'; d = path.dirname(d)) out.push(d); return out; };
fs.writeFileSync(path.join(G, 'sandbox.sb'), [
  '(version 1)', '(allow default)',
  '(deny file-read* file-write* (subpath "/Users/richardosborne"))',
  `(allow file-read* (subpath "${path.dirname(path.dirname(NODE_DIR))}"))`,
  // NOT the Claude scratchpads: Claude Code's Bash writes each command's output into a file there, and a denied write
  // makes `cat` fail ("stdout: Operation not permitted") and node abort at start (t1-code-1's first grade, 2026-10-22).
  `(deny file-read* file-write* (subpath "${LAB}"))`,
  `(allow file-read* (subpath "${KIT}"))`,
  `(allow file-read* (subpath "${path.join(LAB, 'bin')}"))`,
  ...(kitDir ? [`(allow file-read* (subpath "${kitDir}"))`] : []),
  `(allow file-read* file-write* (subpath "${path.join(LAB, 'cache')}"))`,
  `(allow file-read* file-write* (subpath "${G}"))`,
  ...[...new Set([G, KIT, NODE_DIR, path.join(LAB, 'bin', 'x'), ...(kitDir ? [path.join(kitDir, 'x')] : []), path.join(LAB, 'cache', 'x')].flatMap(ancestors))].map((d) => `(allow file-read-metadata (literal "${d}"))`)
].join('\n') + '\n');
fs.copyFileSync(path.join(HERE, 'checks.md'), path.join(G, 'checks.md'));
const prefix = path.join(G, 'shell-prefix.sh');
fs.writeFileSync(prefix, `#!/bin/sh
# OWN-026 grader: every shell command gets the copy's HOME and runs inside the lab's sandbox.
export HOME="${HOME}" TMPDIR="${HOME}/tmp" npm_config_cache="${path.join(LAB, 'cache', 'npm')}" PLAYWRIGHT_BROWSERS_PATH="${path.join(LAB, 'cache', 'ms-playwright')}" BROWSER=none CHROME_PATH="${path.join(LAB, 'bin', 'chrome')}" USER=grader${previewTgz ? ` NODEGX_LAB_PREVIEW_TGZ="${previewTgz}" NODEGX_LAB_REAL_NPX="${path.join(NODE_DIR, 'npx')}"` : ''} PATH="${previewTgz ? path.join(LAB, 'bin', 'kitnpx') + ':' : ''}${NODE_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
exec /usr/bin/sandbox-exec -f "${path.join(G, 'sandbox.sb')}" /bin/zsh -c "$*"
`, { mode: 0o755 });

const prompt = fs.readFileSync(path.join(HERE, 'grader.txt'), 'utf8')
  .replace('{APP}', APP).replace('{WORK}', WORK).replace('{REQUEST}', request).replace('{LAST}', last)
  .replace('{CHECKS}', path.join(G, 'checks.md')).replace('{IDS}', IDS.split(',').join(', ')).replace('{OUT}', OUT);
fs.writeFileSync(path.join(G, 'prompt.txt'), prompt);
const fence = ['//Users/richardosborne/**', `/${path.join(LAB, 'own026')}/**`]; // not the scratchpads: long tool output is saved there for the grader to Read
const denied = ['WebFetch', 'WebSearch', 'Bash(open:*)', ...fence.flatMap((g) => ['Read', 'Edit', 'Write', 'Glob', 'Grep'].map((t) => `${t}(${g})`))];
const bin = process.env.CLAUDE_BIN || newestClaudeBin();
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_|NODEGX_|NOODL_)/.test(k) && !/KEY|TOKEN|SECRET/.test(k)));
env.CLAUDE_CODE_SHELL_PREFIX = prefix;
const args = ['-p', prompt, '--model', opt('--model', 'claude-opus-5-5'), '--output-format', 'stream-json', '--verbose',
  '--setting-sources', '', '--strict-mcp-config', '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'TodoWrite',
  '--disallowedTools', ...denied, '--max-budget-usd', String(opt('--cap', 40))];
const t0 = Date.now();
const log = fs.createWriteStream(path.join(G, 'grader.jsonl'));
const child = spawn(bin, args, { cwd: WORK, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(fs.createWriteStream(path.join(G, 'grader.stderr')));
child.on('close', (code) => {
  // reap what the grader left running (found by the copy's HOME in the environment, never by name)
  const ps = spawnSync('ps', ['-E', '-ww', '-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout || '';
  const left = ps.split('\n').filter((l) => l.includes(`HOME=${HOME} `)).map((l) => Number(l.trim().split(/\s+/)[0])).filter(Boolean);
  for (const pid of left) try { process.kill(pid, 'SIGTERM'); } catch {}
  const lines = fs.readFileSync(path.join(G, 'grader.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const res = lines.findLast((l) => l.type === 'result');
  const grade = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const count = (g) => (grade ? Object.entries(grade).filter(([k, v]) => /^[SFTC]\d/.test(k) && v?.grade?.startsWith(g)).length : null);
  const rl = lines.find((l) => l.type === 'rate_limit_event');
  const meta = { round, ids: IDS, exit: code, sevenDay: rl?.rate_limit_info?.seven_day?.utilization ?? rl?.seven_day?.utilization ?? null, seconds: Math.round((Date.now() - t0) / 1000), usd: res?.total_cost_usd ?? null, reaped: left.length,
    pass: count('PASS'), fail: count('FAIL'), notReached: count('NOT REACHED'), result: res?.result ?? null };
  fs.writeFileSync(path.join(G, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log('grade', JSON.stringify(meta));
});

function newestClaudeBin() {
  const ext = '/Users/richardosborne/.vscode/extensions';
  const dirs = fs.readdirSync(ext).filter((d) => /^anthropic\.claude-code-[\d.]+-darwin-arm64$/.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return path.join(ext, dirs.at(-1), 'resources/native-binary/claude');
}
