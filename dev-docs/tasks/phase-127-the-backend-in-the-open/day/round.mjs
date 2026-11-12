// P127 BKO-009 one stranger: `node round.mjs <labRoot> [--again <message.txt>]` — BKO-006's runner (briefs/round.mjs)
// with a club's app and its running backend handed over, and the backend editor skill in the folder.
//
// <labRoot>/base is what a person has after `npm create nodegx@0.2.8` (made once by hand). The lab is a copy of it at
// <labRoot>/lab/day, with what the next create-nodegx cut adds (the skill `nodegx-your-own-backend-editor` and the
// agent notes' line naming it) and what the person hands over:
//   riverside/                 the club's app (lab.mjs: templates/members-area, filled through its own doors)
//   riverside-admin-token.txt  its backend's admin credential; the backend's data is outside the lab
//   KIT_TARBALL                the kit, copied in, when @nodegx/backend-kit isn't on npm yet (the prompt says so)
// The stranger is a fresh `claude -p` on Opus: no repo, no git, no web, the folder's own CLAUDE.md and skills only.
// Run it under nohup with the Bash sandbox off: a stranger outlives this session. `--again` carries it on.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { makeMembersLab } from './lab.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const SKILL = path.join(REPO, 'packages', 'create-nodegx', 'profiles', 'core', 'skills', 'nodegx-your-own-backend-editor');
const BRIEF = 'A day in the life: pick someone, play their day, and show what the app handed them at each step.';
const [labRoot] = process.argv.slice(2);
if (!labRoot) throw new Error('usage: round.mjs <labRoot> [--again <message.txt>]');

const LAB = path.join(labRoot, 'lab', 'day');
const FIRST = path.join(labRoot, 'out', 'day');
const againFile = process.argv[3] === '--again' ? process.argv[4] : null;
let OUT = FIRST;
let resume = [];
let prompt;
if (againFile) {
  let n = 1;
  while (fs.existsSync(path.join(FIRST, `again-${n}`))) n++;
  OUT = path.join(FIRST, `again-${n}`);
  const prev = n > 1 ? path.join(FIRST, `again-${n - 1}`, 'agent.jsonl') : path.join(FIRST, 'agent.jsonl');
  const last = fs.readFileSync(prev, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).findLast((e) => e.session_id);
  fs.mkdirSync(OUT, { recursive: true });
  resume = ['--resume', last.session_id];
  prompt = fs.readFileSync(againFile, 'utf8').trim();
} else {
  if (fs.existsSync(LAB)) throw new Error(`${LAB} exists: a lab is used once`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(path.join(labRoot, 'base'), LAB, { recursive: true });
  fs.mkdirSync(path.join(LAB, '.home'));
  const mcp = JSON.parse(fs.readFileSync(path.join(LAB, '.mcp.json'), 'utf8'));
  mcp.mcpServers.nodegx.env = { HOME: path.join(LAB, '.home'), npm_config_cache: path.join(labRoot, 'npm-cache') };
  fs.writeFileSync(path.join(LAB, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
  // what the next create-nodegx cut writes: the skill, and the line in the agent notes that names it
  fs.cpSync(SKILL, path.join(LAB, '.claude', 'skills', 'nodegx-your-own-backend-editor'), { recursive: true });
  const line = "\nIf it shows or changes the app's backend (its tables, rules, people, triggers or runs), the guide is\n`nodegx-your-own-backend-editor` (`.claude/skills/nodegx-your-own-backend-editor/SKILL.md`).\n";
  for (const note of ['CLAUDE.md', 'AGENTS.md']) if (fs.existsSync(path.join(LAB, note))) fs.appendFileSync(path.join(LAB, note), line);
  // the club, its backend's data outside the lab
  const club = await makeMembersLab({ dir: path.join(labRoot, 'club'), app: path.join(LAB, 'riverside'), logFile: path.join(labRoot, 'club-backend.log') });
  club.child.unref();
  fs.writeFileSync(path.join(LAB, 'riverside-admin-token.txt'), club.token + '\n');
  fs.writeFileSync(path.join(OUT, 'club.json'), JSON.stringify({ backend: club.base, pid: club.child.pid, token: club.token, people: club.people }, null, 2));
  let kit = '';
  if (process.env.KIT_TARBALL) {
    fs.copyFileSync(process.env.KIT_TARBALL, path.join(LAB, path.basename(process.env.KIT_TARBALL)));
    kit = ` The NodeGX backend kit isn't on npm yet: it's in ./${path.basename(process.env.KIT_TARBALL)}.`;
  }
  prompt =
    `I'm not a coder. I run a members' club whose app I built with NodeGX. The app is in ./riverside, and its backend is running at ${club.base}; its admin key is in ./riverside-admin-token.txt.${kit} ` +
    `I'd like a tool of my own for it. ${BRIEF} Build it here, in a folder of its own, and leave my app and its backend as they are. ` +
    'Please just build it without waiting for me to answer questions: decide on your defaults and push to the end. ' +
    "When you're done, write ./REPORT.md: what you built, how I open it, how long it took, and every place where you had to guess.";
}
fs.writeFileSync(path.join(OUT, 'prompt.txt'), prompt + '\n');
const bash = ['npm', 'npx', 'node', 'ls', 'mkdir', 'cat', 'cd', 'head', 'tail', 'find', 'grep', 'wc', 'echo', 'sleep',
  'cp', 'diff', 'curl', 'mv', 'touch', 'sort', 'jq'].map((c) => `Bash(${c}:*)`);
// Nothing outside its own lab: not the repo, not the club's backend data, not the runs' records.
const fence = [];
for (const p of ['//Users/**', `/${path.join(labRoot, 'out')}/**`, `/${path.join(labRoot, 'club')}/**`, '//private/tmp/claude-501/**']) {
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
