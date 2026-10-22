// OWN-023 §4.1: one arm's build. The same brief, model, tools, cap and relay for every arm; only the folder differs.
//
//   node round-arm.mjs <root> <brief-file> --bare
//   node round-arm.mjs <root> <brief-file> --harness <CLAUDE.md>
//   node round-arm.mjs <root> <brief-file> --nodegx 0.2.2            (npm create nodegx@<version>, from the registry)
//     [--continues 5] [--cap 60] [--model claude-opus-5-5] [--deny <other round root>]…
//     [--app music] [--seed <dir>[=<sub-folder>]]…   (round 2: the folder's name, and files copied in after it is made)
//
// The seal (R2: Bash is on in every arm, so OWN-018's "Bash denied" can't hold):
// - A round root of its own: <root>/work/music is the folder the person opens, <root>/home the HOME every shell
//   command and the NodeGX server see. Claude Code itself keeps Richard's HOME, because its login lives there (a moved
//   HOME reads "Not logged in", measured 2026-10-19): the round's HOME reaches the agent's shell through
//   CLAUDE_CODE_SHELL_PREFIX (<root>/shell-prefix.sh), which also sets TMPDIR, the npm/Playwright/Puppeteer caches and
//   BROWSER=none (OWN-008: a stranger's `npm start` opened Richard's browser).
// - --setting-sources project,local: the folder's own CLAUDE.md, settings and skills (A+'s harness, the kit's), none of
//   Richard's. --strict-mcp-config: no MCP server but the kit's (B), none of his connectors. No web tools, any arm.
// - Reads, writes and shells are denied by rule for /Users/**, /Applications/** and every --deny root (the other
//   arms); audit.json lists afterwards every absolute path any tool named, outside the root (the rules can't see a
//   path a script builds, so the audit is the measurement and the rules are a fence).
//
// The relay (R3: "one shot" is one conversation): when a sitting ends, judge.txt goes to a fresh Haiku with the
// agent's last message and nothing else; MORE → the lab resumes the same session with the bare word "Continue.", up to
// --continues times; DONE → the build is over. The lab never reads the output to decide. A sitting cut by the
// subscription's rate limit waits for the reset and resumes with "Continue." too, counted apart (rateLimitResumes),
// not against N. The cap (R4) is for the whole arm: each sitting gets what is left of it.
//
// Writes into <root>: command.txt, sittings/<k>.jsonl (+ .stderr), sittings.json, audit.json, teardown.json, arm.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [rootArg, briefFile, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const all = (name) => rest.flatMap((a, i) => (a === name ? [rest[i + 1]] : []));
const mode = rest.includes('--bare') ? 'bare' : rest.includes('--harness') ? 'harness' : rest.includes('--nodegx') ? 'nodegx' : null;
if (!rootArg || !briefFile || !mode) throw new Error('usage: node round-arm.mjs <root> <brief-file> --bare | --harness <file> | --nodegx <version>');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const N = Number(opt('--continues', 5));
const CAP = Number(opt('--cap', 60));
const MODEL = opt('--model', 'claude-opus-5-5');
const BIN = process.env.CLAUDE_BIN || path.join(process.env.HOME, '.vscode/extensions/anthropic.claude-code-2.1.301-darwin-arm64/resources/native-binary/claude');
const JUDGE_BIN = process.env.JUDGE_BIN || path.join(process.env.HOME, '.vscode/extensions/anthropic.claude-code-2.1.301-darwin-arm64/resources/native-binary/claude');
const SITTING_SECONDS = Number(process.env.SITTING_SECONDS || 3 * 3600);
const QUOTA_STOP = Number(process.env.QUOTA_STOP || 0.95);

fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);
if (root.startsWith('/Users/') || root.startsWith('/Applications/')) throw new Error('a round root sits outside /Users and /Applications, which the rules deny');
const HOME = path.join(root, 'home');
const WORK = path.join(root, 'work');
const APP = path.join(WORK, opt('--app', 'music'));
const SITS = path.join(root, 'sittings');
for (const d of [path.join(HOME, 'tmp'), WORK, SITS]) fs.mkdirSync(d, { recursive: true });
const deny = all('--deny').map((d) => path.resolve(d));

const prefix = path.join(root, 'shell-prefix.sh');
fs.writeFileSync(prefix, `#!/bin/sh
# OWN-023: every shell command the agent runs gets the round's HOME (Claude Code's own HOME stays, for its login).
export HOME="${HOME}" TMPDIR="${HOME}/tmp" npm_config_cache="${HOME}/.npm" PLAYWRIGHT_BROWSERS_PATH="${HOME}/ms-playwright" PUPPETEER_CACHE_DIR="${HOME}/puppeteer" BROWSER=none
exec /bin/zsh -c "$*"
`, { mode: 0o755 });

const roundEnv = { HOME, TMPDIR: path.join(HOME, 'tmp'), npm_config_cache: path.join(HOME, '.npm'), BROWSER: 'none' };
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_|NODEGX_|NOODL_)/.test(k) && !/KEY|TOKEN|SECRET/.test(k)));
env.CLAUDE_CODE_SHELL_PREFIX = prefix;
env.PWD = APP;

// The folder the person opens.
const setup = { mode };
let mcpArgs = [];
// §4.3 follow-ups: `--from <arm-root>` starts from a COPY of that build's folder and HOME (its local backend's data
// lives there), as the person's machine was left; the build itself stays as built. Same seal, relay and cap.
const from = opt('--from', null);
if (from) {
  fs.cpSync(path.join(path.resolve(from), 'work', path.basename(APP)), APP, { recursive: true, verbatimSymlinks: true });
  const noodl = path.join(path.resolve(from), 'home', '.noodl');
  if (fs.existsSync(noodl)) fs.cpSync(noodl, path.join(HOME, '.noodl'), { recursive: true });
  setup.from = path.resolve(from);
}
if (mode === 'bare' && !from) fs.mkdirSync(APP);
if (mode === 'harness' && !from) {
  fs.mkdirSync(APP);
  const h = path.resolve(opt('--harness'));
  fs.copyFileSync(h, path.join(APP, 'CLAUDE.md'));
  setup.harness = { file: h, bytes: fs.statSync(h).size };
}
if (mode === 'nodegx') {
  const version = opt('--nodegx');
  const created = from ? { status: 0, stdout: `copied from ${from}`, stderr: '' } : process.env.MOCK_CREATE
    ? (fs.mkdirSync(APP), fs.writeFileSync(path.join(APP, '.mcp.json'), JSON.stringify({ mcpServers: { nodegx: { type: 'stdio', command: 'npx', args: ['-y', `@nodegx/mcp@${version}`, '--allow-writes'] } } })), { status: 0, stdout: 'mock', stderr: '' })
    : spawnSync('npm', ['create', '-y', `nodegx@${version}`, path.basename(APP)], { cwd: WORK, env: { ...env, ...roundEnv }, encoding: 'utf8' });
  fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
  if (created.status !== 0) throw new Error(`npm create nodegx@${version} exited ${created.status}; see create.log`);
  const mcp = JSON.parse(fs.readFileSync(path.join(APP, '.mcp.json'), 'utf8'));
  const server = mcp.mcpServers.nodegx;
  if (JSON.stringify(server.args) !== JSON.stringify(['-y', `@nodegx/mcp@${version}`, '--allow-writes'])) throw new Error(`.mcp.json changed: ${JSON.stringify(server)}`);
  server.env = roundEnv; // the person accepts this server; its HOME (backends, list_projects) is the round's
  const mcpFile = path.join(root, 'mcp.json');
  fs.writeFileSync(mcpFile, JSON.stringify(mcp, null, 2) + '\n');
  mcpArgs = ['--mcp-config', mcpFile];
  setup.kit = { version, files: Object.fromEntries(walk(APP).map((f) => [f, fs.statSync(path.join(APP, f)).size])) };
  // round 3b (2026-10-21, the graph as text): the server under test is a LOCAL tarball of @nodegx/mcp at the same
  // version the kit pins. Installed into the app folder's node_modules (no package.json, no lock), so that
  // `npx -y @nodegx/mcp@<version>` — the kit's .mcp.json and the kit's note alike — resolves to it instead of the
  // registry's (measured 2026-10-21: the local install wins and nothing lands in the npx cache). The agent notes come
  // from the checkout's create-nodegx (--note-from <bin/create-nodegx.js>), the ones that ship with that server.
  const mcpTgz = opt('--mcp-tgz', null);
  if (mcpTgz && !from) {
    const tgz = path.resolve(mcpTgz);
    const r = spawnSync('npm', ['i', '--no-save', '--no-package-lock', '--no-audit', '--no-fund', tgz], { cwd: APP, env: { ...env, ...roundEnv }, encoding: 'utf8' });
    fs.appendFileSync(path.join(root, 'create.log'), `\n== npm i ${tgz}\n` + r.stdout + r.stderr);
    if (r.status !== 0) throw new Error(`npm i ${tgz} exited ${r.status}; see create.log`);
    const installed = JSON.parse(fs.readFileSync(path.join(APP, 'node_modules', '@nodegx', 'mcp', 'package.json'), 'utf8'));
    if (installed.version !== version) throw new Error(`--mcp-tgz is ${installed.name}@${installed.version}, the kit pins ${version}: npx would fetch the registry's`);
    setup.mcpTgz = { file: tgz, bytes: fs.statSync(tgz).size, version: installed.version };
  }
  const noteFrom = opt('--note-from', null);
  if (noteFrom && !from) {
    const kit = (await import(path.resolve(noteFrom))).default;
    if (kit.MCP_VERSION !== version) throw new Error(`--note-from pins @nodegx/mcp@${kit.MCP_VERSION}, the round runs ${version}`);
    for (const name of kit.AGENT_FILES) fs.writeFileSync(path.join(APP, name), kit.AGENT_NOTE);
    setup.noteFrom = { file: path.resolve(noteFrom), files: kit.AGENT_FILES, bytes: kit.AGENT_NOTE.length };
  }
  // R9 (Richard, 2026-10-19): the server is started once before the build, as a person who retried would have —
  // cold it misses Claude Code's 30 s limit (P112-OWN023-COLDSERVER). The cost stays in B's row; this is its measure.
  if (rest.includes('--warm-server') && !process.env.MOCK_CREATE) setup.warm = await warmServer(server, version);
}

// round 2 (--seed): the arm's starting files, copied in after the folder exists (the kit's own files are never replaced)
if (!from) for (const sd of all('--seed')) {
  const [src, sub = ''] = sd.split('='), to = path.join(APP, sub);
  for (const f of fs.readdirSync(src)) { if (fs.existsSync(path.join(to, f))) throw new Error(`--seed would replace ${path.join(sub, f)}`); }
  fs.cpSync(path.resolve(src), to, { recursive: true });
  (setup.seeds ||= []).push({ src: path.resolve(src), into: sub || '.', files: walk(to).length });
}

function warmServer(server, version) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(server.command, server.args, { cwd: APP, env: { ...env, ...roundEnv }, stdio: ['pipe', 'pipe', 'pipe'] });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'own023-warm', version: '0' } } }) + '\n');
    const done = (answered) => { try { p.kill(); } catch {} resolve({ answered, seconds: Number(((Date.now() - t0) / 1000).toFixed(1)), package: `@nodegx/mcp@${version}` }); };
    p.stdout.on('data', (d) => { if (String(d).includes('"id":1')) done(true); });
    setTimeout(() => done(false), 300000).unref();
  });
}

// round 3: --deny-read <dir> fences the file tools only, no Bash rule (a Bash(*/tmp/*) would also refuse the round's
// own /private/var/tmp root); a command that names one is caught by the audit, as /Users is.
const fence = ['//Users/**', '//Applications/**', ...deny.map((d) => `/${d}/**`), ...all('--deny-read').map((d) => `/${path.resolve(d)}/**`)];
const tools = ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob', 'Grep', 'Bash', 'Skill', 'TodoWrite', 'Task', 'Agent', ...(mode === 'nodegx' ? ['mcp__nodegx'] : [])];
const denied = ['WebFetch', 'WebSearch', 'Bash(open:*)',
  ...fence.flatMap((g) => ['Read', 'Edit', 'Write', 'Glob', 'Grep'].map((t) => `${t}(${g})`)),
  // No Bash(*/Users/*): Claude Code expands `$HOME` and `~/` with ITS OWN HOME (/Users/richardosborne) when it matches
  // a rule, so that rule refused `echo "$HOME"` and `ls ~/` — commands the shell runs inside the round (smoke2,
  // 2026-10-19). A fence that refuses harmless commands, and refuses them more in whichever arm's prompt says `~/`, is
  // a confound; an explicit /Users path in a command is caught by the audit instead.
  ...['/Applications/', ...deny.map((d) => d + '/')].map((p) => `Bash(*${p}*)`)];
// round 3: `closed` = the --then sitting, answered from what the session already holds: no tool, no MCP server.
const baseArgs = (prompt, resume, budget, closed = false) => [
  '-p', prompt, ...(resume ? ['--resume', resume] : []),
  '--model', MODEL,
  '--output-format', 'stream-json', '--verbose',
  '--setting-sources', 'project,local',
  '--strict-mcp-config', ...(closed ? [] : mcpArgs),
  ...(closed ? ['--tools', ''] : ['--allowedTools', ...tools, '--disallowedTools', ...denied]),
  '--max-budget-usd', budget.toFixed(2)
];
const brief = fs.readFileSync(briefFile, 'utf8').trim();
fs.writeFileSync(path.join(root, 'command.txt'),
  `# ${new Date().toISOString()} · Claude Code ${spawnSync(BIN, ['--version'], { encoding: 'utf8' }).stdout.trim()} · arm ${mode}\n` +
  `# env: CLAUDE_CODE_SHELL_PREFIX=${prefix}; CLAUDE*/MCP_*/NODEGX_*/NOODL_* and *KEY*/*TOKEN*/*SECRET* removed\n` +
  `cd ${APP} && claude ${baseArgs('BRIEF', null, CAP).map((a) => (a === 'BRIEF' ? `"$(cat ${path.resolve(briefFile)})"` : JSON.stringify(a))).join(' ')}\n` +
  `# then, while the judge (judge.txt, Haiku) says MORE, up to ${N} times: claude -p "Continue." --resume <session> … --max-budget-usd <what is left of ${CAP}>\n`);

function sitting(k, prompt, resume, budget, closed = false) {
  return new Promise((resolve) => {
    const out = path.join(SITS, `${k}.jsonl`);
    const t0 = Date.now();
    const loadBefore = os.loadavg().map((x) => Number(x.toFixed(1)));
    const child = spawn('perl', ['-e', `alarm ${SITTING_SECONDS}; exec @ARGV`, BIN, ...baseArgs(prompt, resume, budget, closed)], { cwd: APP, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(out);
    child.stdout.pipe(log);
    child.stderr.pipe(fs.createWriteStream(path.join(SITS, `${k}.stderr`)));
    fs.writeFileSync(path.join(root, 'agent.pid'), String(child.pid));
    // A sitting ends at the agent's FIRST answer (s1, B-F2: an agent that left servers running in Claude Code's
    // background kept `claude -p` open two hours a sitting, its later turns answered the servers' exit notices, and
    // the judge read those). An interactive person reads the first answer; their servers stay up, and so do these
    // (teardown at the end of the arm). 5 s after the first `result` event the process is ended.
    let tail = '', ended = false;
    child.stdout.on('data', (chunk) => {
      const lines = (tail + chunk).split('\n');
      tail = lines.pop();
      if (!ended && lines.some((l) => l.startsWith('{"type":"result"') || /"type":"result"/.test(l))) {
        ended = true;
        setTimeout(() => { try { child.kill('SIGTERM'); } catch {} }, 5000).unref();
      }
    });
    // 'exit', not 'close': a server the agent left running can hold the pipe open (OWN-008).
    child.on('exit', (code, signal) => log.end(() => resolve({ k, prompt: prompt === brief ? 'brief' : closed ? 'then' : prompt, code, signal, endedAtFirstAnswer: ended, seconds: Math.round((Date.now() - t0) / 1000), load: { before: loadBefore, after: os.loadavg().map((x) => Number(x.toFixed(1))) }, ...read(out) })));
  });
}

// `total_cost_usd` is the SESSION's running total, so a resumed sitting reports what came before it too (s1: B-F1's
// six sittings summed to $18.74 for a session that cost $3.43). `cum` is that total at this sitting's end; the
// sitting's own cost (`usd`) is set in the loop as cum minus the previous sitting's cum in the same session.
function read(file) {
  let session = null, result = null, first = null, limit = null, week = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    if (m.session_id) session ??= m.session_id;
    if (m.type === 'rate_limit_event') {
      limit = m.rate_limit_info;
      week = m.rate_limit_info?.unifiedWindows?.seven_day?.utilization ?? week;
    }
    if (m.type === 'result') { result = m; first ??= m; }
  }
  return {
    session, week,
    subtype: first?.subtype ?? null, isError: first?.is_error ?? null, turns: first?.num_turns ?? null,
    activeSeconds: first ? Math.round(first.duration_ms / 1000) : null,
    cum: result?.total_cost_usd ?? 0, results: result ? (first === result ? 1 : 2) : 0, last: first?.result ?? '',
    rateLimited: limit?.status === 'rejected' || (!!result?.is_error && /limit|rate/i.test(result?.result || '')),
    resetsAt: limit?.resetsAt ?? null
  };
}

function judge(message) {
  const prompt = fs.readFileSync(path.resolve(opt('--judge', path.join(HERE, 'judge.txt'))), 'utf8').replace('{MESSAGE}', message.slice(-6000));
  const cwd = path.join(root, 'judge');
  fs.mkdirSync(cwd, { recursive: true });
  const r = spawnSync(JUDGE_BIN, ['-p', prompt, '--model', 'haiku', '--output-format', 'json', '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--no-session-persistence'],
    { cwd, env: Object.fromEntries(Object.entries(env).filter(([k]) => k !== 'CLAUDE_CODE_SHELL_PREFIX')), encoding: 'utf8', timeout: 120000 });
  let said = '';
  try { said = JSON.parse(r.stdout).result.trim(); } catch { said = `unreadable: ${(r.stdout + r.stderr).slice(0, 200)}`; }
  return { verdict: /^DONE\b/.test(said) ? 'DONE' : /^MORE\b/.test(said) ? 'MORE' : 'UNCLEAR', said };
}

const sittings = [];
let continues = 0, rateLimitResumes = 0, session = null, stop = null;
const spent = () => sittings.reduce((n, s) => n + (s.usd || 0), 0);
for (let k = 1; ; k++) {
  const prompt = k === 1 ? brief : 'Continue.';
  // A resumed session may measure --max-budget-usd against its running total, so it gets the whole cap; the lab's own
  // sum (spent) stops the arm at the cap either way.
  const s = await sitting(k, prompt, session, session ? CAP : Math.max(0.01, CAP - spent()));
  const prevCum = sittings.filter((x) => x.session === s.session).reduce((n, x) => Math.max(n, x.cum || 0), 0);
  s.usd = Math.max(0, (s.cum || 0) - prevCum);
  session = s.session ?? session;
  if (s.rateLimited) {
    s.judge = null;
    sittings.push(s);
    save();
    const margin = Number(process.env.RATE_WAIT_MARGIN_MS ?? 60000); // the mock sets 0
    const wait = Math.max(margin, (s.resetsAt ? s.resetsAt * 1000 - Date.now() : 15 * 60000) + margin);
    console.log(`sitting ${k}: rate limited; waiting ${Math.round(wait / 60000)} min for the reset`);
    await new Promise((r) => setTimeout(r, wait));
    rateLimitResumes++;
    continue;
  }
  s.judge = s.subtype === 'success' ? judge(s.last) : null;
  sittings.push(s);
  save();
  console.log(`sitting ${k}: ${s.subtype} ${s.seconds}s $${s.usd.toFixed(2)} (arm $${spent().toFixed(2)}) judge ${s.judge?.verdict ?? '—'}`);
  if (s.week != null && s.week >= QUOTA_STOP) { stop = `week at ${s.week}`; break; }
  if (/max_budget|budget/i.test(s.subtype || '') || spent() >= CAP) { stop = `cap $${CAP}`; break; }
  if (s.subtype !== 'success' && s.signal !== 'SIGALRM' && s.code !== 0 && !s.session) { stop = `sitting ${k} failed to start (${s.code} ${s.signal})`; break; }
  if (s.judge?.verdict === 'DONE') { stop = 'judge: DONE'; break; }
  if (continues >= N) { stop = `${N} continues used`; break; }
  continues++;
}

// round 3: --then <file> — one more sitting in the same session after the relay, closed book (no tools): the quiz is
// answered from the understanding the work was built on. Its answer is kept as then.md; its cost counts in the arm's.
const thenFile = opt('--then', null);
if (thenFile && session && !/cap|week|failed/.test(stop || '')) {
  const s = await sitting(sittings.length + 1, fs.readFileSync(path.resolve(thenFile), 'utf8').trim(), session, CAP, true);
  const prevCum = sittings.filter((x) => x.session === s.session).reduce((n, x) => Math.max(n, x.cum || 0), 0);
  s.usd = Math.max(0, (s.cum || 0) - prevCum);
  sittings.push(s);
  save();
  fs.writeFileSync(path.join(root, 'then.md'), s.last || '');
  console.log(`then: ${s.subtype} ${s.seconds}s $${s.usd.toFixed(2)}`);
}

function save() {
  fs.writeFileSync(path.join(root, 'sittings.json'), JSON.stringify(sittings, null, 2) + '\n');
}

// Every process the agent left behind, found by what it can only have got from this round (memory: never by name).
function teardown() {
  const pids = new Set();
  try {
    let pid;
    for (const line of execFileSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8' }).split('\n')) {
      if (line[0] === 'p') pid = Number(line.slice(1));
      else if (line[0] === 'n' && (line.slice(1) + '/').startsWith(root + '/')) pids.add(pid);
    }
  } catch {}
  // round 3: a sibling arm's runner and its `claude` name this root in their --deny rules, so `pgrep -f root` matched
  // them and A-claude's teardown killed B-claude mid-sitting. Those two shapes count only by cwd (above), never by name.
  try {
    for (const p of execFileSync('pgrep', ['-f', root], { encoding: 'utf8' }).split('\n')) {
      if (!p) continue;
      let command = '';
      try { command = execFileSync('ps', ['-o', 'command=', '-p', p], { encoding: 'utf8' }); } catch { continue; }
      if (/round-arm\.mjs|--disallowedTools|round-vibe\.mjs/.test(command)) continue;
      pids.add(Number(p));
    }
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

function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') out.push(...walk(p, base)); } else out.push(path.relative(base, p));
  }
  return out;
}

const audit = (await import(path.join(HERE, 'audit-arm.mjs'))).audit(root);
fs.writeFileSync(path.join(root, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'teardown.json'), JSON.stringify(teardown(), null, 2) + '\n');
const arm = {
  mode, setup, model: MODEL, cap: CAP, n: N, stop, continues, rateLimitResumes,
  sittings: sittings.length, usd: Number(spent().toFixed(4)), seconds: sittings.reduce((n, s) => n + s.seconds, 0),
  turns: sittings.reduce((n, s) => n + (s.turns || 0), 0), week: { first: sittings[0]?.week ?? null, last: sittings.at(-1)?.week ?? null },
  leaks: audit.leaks.length
};
fs.writeFileSync(path.join(root, 'arm.json'), JSON.stringify(arm, null, 2) + '\n');
console.log('arm', JSON.stringify(arm));
