// P127 BKO-006 one stranger: `node round.mjs <brief> <labRoot> [--again <message.txt>]` — P124's runner
// (`phase-124-the-mystery-of-the-backend/stranger/round.mjs`) with no project handed over: the stranger gets the brief.
//
// The lab is what a person has after `npm create nodegx@0.2.7` (made once as <labRoot>/base), copied per brief to
// <labRoot>/lab/<brief>. The stranger is a fresh `claude -p` on Opus: no repo, no git, no web, no sibling lab, the
// folder's own CLAUDE.md and skill only, the nodegx server from the folder's .mcp.json with its HOME moved into the lab
// so `list_projects` cannot see this machine's projects and its backends live in the lab. Shell is limited to
// read-only tools plus npm/npx/node/curl/cp/diff/mv/mkdir/touch (`--allowedTools` pre-approves; it does not restrict).
// Run it under nohup with the Bash sandbox off: a stranger outlives this session, and its render_report starts Chrome.
// `--again` carries the same stranger on in its own session (`--resume`) with the person's next words.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [name, labRoot] = process.argv.slice(2);
const briefs = JSON.parse(fs.readFileSync(path.join(HERE, 'briefs.json'), 'utf8'));
if (!briefs.briefs[name] || !labRoot) throw new Error('usage: round.mjs <brief> <labRoot>');

const LAB = path.join(labRoot, 'lab', name);
const FIRST = path.join(labRoot, 'out', name);
const againFile = process.argv[4] === '--again' ? process.argv[5] : null;
let OUT = FIRST;
let resume = [];
if (againFile) {
  let n = 1;
  while (fs.existsSync(path.join(FIRST, `again-${n}`))) n++;
  OUT = path.join(FIRST, `again-${n}`);
  const prev = n > 1 ? path.join(FIRST, `again-${n - 1}`, 'agent.jsonl') : path.join(FIRST, 'agent.jsonl');
  const last = fs.readFileSync(prev, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).findLast((e) => e.session_id);
  fs.mkdirSync(OUT, { recursive: true });
  resume = ['--resume', last.session_id];
} else {
  if (fs.existsSync(LAB)) throw new Error(`${LAB} exists: a lab is used once`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(path.join(labRoot, 'base'), LAB, { recursive: true });
  fs.mkdirSync(path.join(LAB, '.home'));
  const mcp = JSON.parse(fs.readFileSync(path.join(LAB, '.mcp.json'), 'utf8'));
  mcp.mcpServers.nodegx.env = { HOME: path.join(LAB, '.home'), npm_config_cache: path.join(labRoot, 'npm-cache') };
  fs.writeFileSync(path.join(LAB, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
}

const prompt = againFile ? fs.readFileSync(againFile, 'utf8').trim() : briefs.frame.replace('{brief}', briefs.briefs[name]);
fs.writeFileSync(path.join(OUT, 'prompt.txt'), prompt + '\n');
const bash = ['npm', 'npx', 'node', 'ls', 'mkdir', 'cat', 'cd', 'head', 'tail', 'find', 'grep', 'wc', 'echo', 'sleep',
  'cp', 'diff', 'curl', 'mv', 'touch', 'sort', 'jq'].map((c) => `Bash(${c}:*)`);
// Nothing outside its own lab: not the repo, not the other briefs' labs, not the runs' records.
const fence = [];
for (const p of ['//Users/**', `/${path.join(labRoot, 'out')}/**`, '//private/tmp/claude-501/**',
  ...Object.keys(briefs.briefs).filter((b) => b !== name).map((b) => `/${path.join(labRoot, 'lab', b)}/**`)]) {
  fence.push(`Read(${p})`, `Glob(${p})`, `Grep(${p})`, `Edit(${p})`, `Write(${p})`);
}
const args = [
  '-e', 'alarm 7200; exec @ARGV', process.env.CLAUDE_BIN || 'claude',
  '-p', prompt, ...resume,
  '--model', 'claude-opus-5-5',
  '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--mcp-config', path.join(LAB, '.mcp.json'),
  '--setting-sources', 'project,local',
  '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'TodoWrite', 'mcp__nodegx', 'Bash(pwd)', ...bash,
  '--disallowedTools', 'WebSearch', 'WebFetch', 'Bash(git:*)', 'Bash(gh:*)', ...fence,
  '--max-budget-usd', '40'
];
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_)/.test(k)));
env.npm_config_cache = path.join(labRoot, 'npm-cache');
// `npx @nodegx/preview --open` (the folder's CLAUDE.md says it) runs macOS `open` from PATH: a shim records the request
// instead of putting a browser window on the screen of whoever runs the round
const shim = path.join(labRoot, 'shim');
fs.mkdirSync(shim, { recursive: true });
fs.writeFileSync(path.join(shim, 'open'), `#!/bin/sh\necho "$(date -u +%FT%TZ) open $*" >> ${JSON.stringify(path.join(labRoot, 'shim', 'opened.log'))}\n`, { mode: 0o755 });
env.PATH = `${shim}:${env.PATH}`;
const QUOTA_STOP = Number(process.env.QUOTA_STOP || 0.9);
const QUOTA_SPEND = Number(process.env.QUOTA_SPEND || 0.12);
let firstUsed = null;
const started = Date.now();
const child = spawn('perl', args, { cwd: LAB, env, stdio: ['ignore', 'pipe', 'pipe'] });
const log = fs.createWriteStream(path.join(OUT, 'agent.jsonl'));
let quotaStop = null;
let resultAt = null;
setInterval(() => { if (resultAt && Date.now() - resultAt > 5 * 60_000) { try { child.kill('SIGTERM'); } catch {} } }, 30_000).unref();
let tail = '';
child.stdout.on('data', (chunk) => {
  log.write(chunk);
  const lines = (tail + chunk).split('\n');
  tail = lines.pop();
  for (const line of lines) {
    // a turn's end (`total_cost_usd`) is not the end: a background wait wakes it again. A preview it left running
    // keeps `claude -p` up after the real last one, so five quiet minutes after a turn's end end it
    if (line.includes('"total_cost_usd"')) resultAt = Date.now();
    else if (line.startsWith('{"type":"assistant"')) resultAt = null;
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
  fs.writeFileSync(path.join(OUT, 'agent.exit'),
    JSON.stringify({ code, signal, quotaStop, minutes: (Date.now() - started) / 60000 }));
  fs.writeFileSync(path.join(OUT, 'teardown.json'), JSON.stringify(teardown(), null, 2));
  console.log('exit', code, signal, quotaStop ? `stopped at ${quotaStop.used} of the week` : '');
  log.end(() => process.exit(0));
});

// Every process the stranger left behind, by what it can only have got from the lab (memory: kill by what a process
// writes, never by a runner's name). Its backend runs from the lab's .home, so it goes too: the grade starts the app
// again from its folder, which is the claim (the files are the truth).
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
