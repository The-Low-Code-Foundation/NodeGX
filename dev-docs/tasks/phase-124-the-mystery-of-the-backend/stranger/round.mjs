// P124 one stranger: `node round.mjs <canvas> <labRoot> [--again <message.txt>]` — OWN-008's runner
// (`phase-112-your-own-nodegx/own-008/round.mjs`) with the project and the backend swapped in.
//
// The lab is what a person has after `npm create nodegx@0.2.3` (made once as <labRoot>/base) plus a copy of the
// training template (<labRoot>/training, made once: the backend was set up from it), BACKEND.md (what the backend
// answers), and two one-line files the brief points at: BACKEND-URL and ADMIN-TOKEN (<labRoot>/backend-url and
// <labRoot>/admin-token). The stranger is a fresh `claude -p` on Opus: no repo, no git, no web, no messaging socket,
// the project's own settings and skill only, the nodegx server from the folder's .mcp.json with its HOME moved into
// the lab so `list_projects` cannot see this machine's projects. Shell is limited to read-only tools plus
// npm/npx/node/curl/cp/diff/mv/mkdir/touch. Run it under nohup: a stranger outlives this session.
// `--again` carries the same stranger on in its own session (`--resume`) with the person's next words.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [name, labRoot] = process.argv.slice(2);
const wishes = JSON.parse(fs.readFileSync(path.join(HERE, 'wishes.json'), 'utf8'));
if (!wishes.strangers[name] || !labRoot) throw new Error('usage: round.mjs <canvas> <labRoot>');

const LAB = path.join(labRoot, 'lab', name);
const FIRST = path.join(labRoot, 'out', name);
const againFile = process.argv[4] === '--again' ? process.argv[5] : null;
let OUT = FIRST;
let resume = [];
if (againFile) {
  const init = fs.readFileSync(path.join(FIRST, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .find((e) => e.type === 'system' && e.subtype === 'init');
  let n = 1;
  while (fs.existsSync(path.join(FIRST, `again-${n}`))) n++;
  OUT = path.join(FIRST, `again-${n}`);
  fs.mkdirSync(OUT, { recursive: true });
  const prev = n > 1 ? path.join(FIRST, `again-${n - 1}`, 'agent.jsonl') : null;
  const last = prev ? fs.readFileSync(prev, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).findLast((e) => e.session_id) : init;
  resume = ['--resume', last.session_id];
} else {
  if (fs.existsSync(LAB)) throw new Error(`${LAB} exists: a lab is used once`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(path.join(labRoot, 'base'), LAB, { recursive: true });
  fs.cpSync(path.join(labRoot, 'training'), path.join(LAB, 'training'), { recursive: true });
  fs.copyFileSync(path.join(HERE, 'BACKEND.md'), path.join(LAB, 'BACKEND.md'));
  fs.writeFileSync(path.join(LAB, 'BACKEND-URL'), fs.readFileSync(path.join(labRoot, 'backend-url'), 'utf8').trim() + '\n');
  fs.writeFileSync(path.join(LAB, 'ADMIN-TOKEN'), fs.readFileSync(path.join(labRoot, 'admin-token'), 'utf8').trim() + '\n');
  fs.mkdirSync(path.join(LAB, '.home'));
  const mcp = JSON.parse(fs.readFileSync(path.join(LAB, '.mcp.json'), 'utf8'));
  mcp.mcpServers.nodegx.env = { HOME: path.join(LAB, '.home') };
  fs.writeFileSync(path.join(LAB, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
}

function manifest(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}
const snapshot = () => ({
  at: new Date().toISOString(),
  labTraining: manifest(path.join(LAB, 'training')),
  rootTraining: manifest(path.join(labRoot, 'training'))
});
fs.writeFileSync(path.join(OUT, 'before.json'), JSON.stringify(snapshot(), null, 2));

const prompt = againFile ? fs.readFileSync(againFile, 'utf8').trim() : wishes.frame.replace('{wish}', wishes.strangers[name]);
fs.writeFileSync(path.join(OUT, 'prompt.txt'), prompt + '\n');
const bash = ['npm', 'npx', 'node', 'ls', 'mkdir', 'cat', 'cd', 'head', 'tail', 'find', 'grep', 'wc', 'echo', 'sleep',
  'cp', 'diff', 'curl', 'mv', 'touch', 'sort', 'jq'].map((c) => `Bash(${c}:*)`);
const args = [
  '-e', 'alarm 7200; exec @ARGV', process.env.CLAUDE_BIN || 'claude',
  '-p', prompt, ...resume,
  '--model', 'claude-opus-5-5',
  '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--mcp-config', path.join(LAB, '.mcp.json'),
  '--setting-sources', 'project,local',
  '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'TodoWrite', 'mcp__nodegx', 'Bash(pwd)', ...bash,
  '--disallowedTools', 'WebSearch', 'WebFetch', 'Bash(git:*)', 'Bash(gh:*)', 'Read(//Users/**)', 'Glob(//Users/**)',
  'Grep(//Users/**)',
  '--max-budget-usd', '60'
];
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_)/.test(k)));
env.PUPPETEER_CACHE_DIR = path.join(LAB, '.home', 'puppeteer');
const QUOTA_STOP = Number(process.env.QUOTA_STOP || 0.9);
const QUOTA_SPEND = Number(process.env.QUOTA_SPEND || 0.15);
let firstUsed = null;
const started = Date.now();
const child = spawn('perl', args, { cwd: LAB, env, stdio: ['ignore', 'pipe', 'pipe'] });
const log = fs.createWriteStream(path.join(OUT, 'agent.jsonl'));
let quotaStop = null;
let tail = '';
child.stdout.on('data', (chunk) => {
  log.write(chunk);
  const lines = (tail + chunk).split('\n');
  tail = lines.pop();
  for (const line of lines) {
    if (!line.includes('rate_limit_event')) continue;
    const used = JSON.parse(line).rate_limit_info?.unifiedWindows?.seven_day?.utilization;
    if (typeof used !== 'number') continue;
    firstUsed ??= used;
    if ((used >= QUOTA_STOP || used - firstUsed >= QUOTA_SPEND) && !quotaStop) {
      quotaStop = { used, firstUsed, at: new Date().toISOString() };
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 10_000).unref();
    }
  }
});
child.stderr.pipe(fs.createWriteStream(path.join(OUT, 'agent.stderr')));
fs.writeFileSync(path.join(OUT, 'agent.pid'), String(child.pid));
child.on('exit', (code, signal) => {
  const after = snapshot();
  fs.writeFileSync(path.join(OUT, 'after.json'), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(OUT, 'agent.exit'),
    JSON.stringify({ code, signal, quotaStop, minutes: (Date.now() - started) / 60000 }));
  fs.writeFileSync(path.join(OUT, 'teardown.json'), JSON.stringify(teardown(), null, 2));
  console.log('exit', code, signal, quotaStop ? `stopped at ${quotaStop.used} of the week` : '');
  log.end(() => process.exit(0));
});

// Every process the stranger left behind, by what it can only have got from the lab (memory: kill by what a process
// writes, never by a runner's name). The backend is not in the lab, so it survives.
function teardown() {
  const lab = fs.realpathSync(LAB);
  const pids = new Set();
  try {
    let pid;
    for (const line of execFileSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8' }).split('\n')) {
      if (line[0] === 'p') pid = Number(line.slice(1));
      else if (line[0] === 'n' && (line.slice(1) + '/').startsWith(lab + '/')) pids.add(pid);
    }
  } catch {}
  try {
    for (const p of execFileSync('pgrep', ['-f', lab], { encoding: 'utf8' }).split('\n')) if (p) pids.add(Number(p));
  } catch {}
  pids.delete(process.pid);
  const killed = [];
  for (const p of pids) {
    let command = '';
    try { command = execFileSync('ps', ['-o', 'command=', '-p', String(p)], { encoding: 'utf8' }).trim(); } catch { continue; }
    try { process.kill(p, 'SIGTERM'); killed.push({ pid: p, command: command.slice(0, 200) }); } catch {}
  }
  return killed;
}
