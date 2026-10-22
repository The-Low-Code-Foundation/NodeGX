// OWN-026: one sitting-chain of Cline CLI + DeepSeek V4.1 Flash (ClinePass) in one arm's folder. Tests 1 and 2 of
// PLAN.md. Built from own-020/round-cline.mjs (the empty HOME, the seal plugin, the audit) with three differences:
//   1. three arms, one runner: --arm code (an empty folder), harness (an empty folder + OWN-023's plain-code
//      instructions as AGENTS.md, the file Cline reads), nodegx (`npx -y create-nodegx@<v> apps --cline` FROM THE
//      REGISTRY, exactly what a person types; the kit writes its own entry into Cline's MCP file);
//   2. the SHELL IS ON in every arm (a person's Cline has it; a plain-code app can't be built or run without it), so the
//      fence is the OS's: the whole cline process tree runs under sandbox-exec with a profile that denies reads and
//      writes in Richard's home (but node's own ~/.nvm), every Claude scratchpad, and every other round of the lab;
//   3. the relay: when a sitting ends, OWN-023's judge.txt goes to a fresh Haiku with Cline's last message only;
//      MORE → a new sitting in the SAME folder (3.0.71 can't resume a chat headless) whose prompt is the same request
//      plus one sentence saying another session started it; up to --continues times.
//
//   node round.mjs <root> <request-file> --arm code|harness|nodegx [--seed <earlier round root>] [--continues 2]
//                  [--model cline-pass/deepseek-v4.1-flash] [--timeout-min 120] [--stall-min 30] [--tap <port>]
//                  [--kit-version 0.2.5]
// --seed (test 2): the earlier round's work/apps and home (backend data, caches) are copied in first; the folder is
// what the person has on day N, and the request file is that day's change.
//
// Writes into <root>: command.txt, sandbox.sb, sittings/<k>/{agent.jsonl,agent.stderr,run-result.json,exit}, sittings.json,
// seal-audit.txt, sandbox-denials.txt, teardown.txt, round.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../../../..');
const LAB = '/Users/Shared/nodegx-lab';
const CLINE_BIN = path.join(LAB, 'cline-3.0.71/node_modules/cline/bin/cline');
const CACHE = path.join(LAB, 'cache'); // shared npm cache + Playwright browsers: disk, not knowledge (packages only)
const NODE_DIR = path.dirname(process.execPath);
const PRICE = { input: 0.15, cached: 0.003, output: 0.6 }; // ClinePass DeepSeek V4.1 Flash, $/M (OWN-020 §12)

const [rootArg, requestFile, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const ARM = opt('--arm', null);
if (!rootArg || !requestFile || !['code', 'harness', 'nodegx'].includes(ARM)) throw new Error('usage: node round.mjs <root> <request-file> --arm code|harness|nodegx');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const MODEL = opt('--model', 'cline-pass/deepseek-v4.1-flash');
const KIT_V = opt('--kit-version', '0.2.5');
const N = Number(opt('--continues', 2));
const seed = opt('--seed', null);
const tapPort = opt('--tap', null);

fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);
if (!root.startsWith(LAB + '/')) throw new Error(`a round root sits under ${LAB}`);
if (spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).status === 0) throw new Error(`${root} is inside a git repo`);
const HOME = path.join(root, 'home');
const CLINE_DIR = path.join(HOME, '.cline');
const DATA = path.join(CLINE_DIR, 'data');
const SETTINGS = path.join(DATA, 'settings');
const APPS = path.join(root, 'work', 'apps');
const SITS = path.join(root, 'sittings');
for (const d of [path.join(HOME, 'tmp'), path.dirname(APPS), SITS, path.join(CACHE, 'npm'), path.join(CACHE, 'ms-playwright')]) fs.mkdirSync(d, { recursive: true });

const keyLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('CLINE_PASS_API_KEY='));
if (!keyLine) throw new Error('CLINE_PASS_API_KEY is not in the repo .env');
const env = {};
for (const k of ['LANG', 'LC_ALL', 'TERM', 'SHELL', 'USER', 'LOGNAME']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, {
  USER: 'person', LOGNAME: 'person', // OWN-023: agents saw `richardosborne`
  PATH: `${NODE_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  HOME,
  TMPDIR: path.join(HOME, 'tmp'),
  npm_config_cache: path.join(CACHE, 'npm'),
  PLAYWRIGHT_BROWSERS_PATH: path.join(CACHE, 'ms-playwright'),
  BROWSER: 'none', // OWN-008: a stranger's `npm start` opened Richard's browser
  // Chrome's own sandbox can't start inside sandbox-exec (renderer/GPU/network crash; the kit's render_report hung 240 s
  // and a code agent's own CDP probe got no page): the lab's Chrome runs with --no-sandbox, as Playwright runs it. Every
  // arm alike; read by the NodeGX render harness and any tool that honours CHROME_PATH (PLAN §8, 2026-10-22 14:30).
  CHROME_PATH: path.join(LAB, 'bin', 'chrome'),
  CLINE_DIR,
  CLINE_DATA_DIR: DATA,
  CLINE_MCP_SETTINGS_PATH: path.join(SETTINGS, 'cline_mcp_settings.json'),
  CLINE_SESSION_BACKEND_MODE: 'local',
  CLINE_NO_AUTO_UPDATE: '1',
  CLINE_HUB_PORT: '25999',
  CLINE_API_KEY: keyLine.slice('CLINE_PASS_API_KEY='.length).trim().replace(/^["']|["']$/g, ''),
  ...(tapPort ? { CLINE_API_BASE_URL: `http://127.0.0.1:${tapPort}/api/v1` } : {})
});

// 0. The fence. Cline's own seal (OWN-020) for its file tools, and the OS sandbox for everything (the shell is on).
const TEAM = ['team_spawn_teammate', 'team_shutdown_teammate', 'team_status', 'team_run_task', 'team_task', 'team_await_run', 'team_await_runs',
  'team_await_all_runs', 'team_cancel_run', 'team_list_runs', 'team_send_message', 'team_broadcast', 'team_read_mailbox', 'team_create_outcome',
  'team_attach_outcome_fragment', 'team_review_outcome_fragment', 'team_finalize_outcome', 'team_list_outcomes', 'team_cleanup', 'team_mission_log'];
// web off in every arm (no reading nodegx.io or the docs of anything); ask_question answers itself headless; no sub-agents.
const globalSettings = { telemetryOptOut: true, autoUpdateEnabled: false, toolAutoApprove: true,
  disabledTools: ['fetch_web_content', 'spawn_agent', 'ask_question', ...TEAM], tools: { web_search: { enabled: false } } };
const ALLOWED = [root];
const ancestors = (p) => { const out = []; for (let d = path.dirname(p); d !== '/'; d = path.dirname(d)) out.push(d); return out; };
const sb = [
  '(version 1)', '(allow default)',
  '(deny file-read* file-write* (subpath "/Users/richardosborne"))',
  `(allow file-read* (subpath "${path.dirname(path.dirname(NODE_DIR))}"))`,
  '(deny file-read* file-write* (subpath "/private/tmp/claude-501"))',
  `(deny file-read* file-write* (subpath "${LAB}"))`,
  `(allow file-read* (subpath "${path.join(LAB, 'cline-3.0.71')}"))`,
  `(allow file-read* (subpath "${path.join(LAB, 'bin')}"))`,
  `(allow file-read* file-write* (subpath "${CACHE}"))`,
  `(allow file-read* file-write* (subpath "${root}"))`,
  ...[...new Set([root, CACHE, NODE_DIR, path.join(LAB, 'cline-3.0.71'), path.join(LAB, 'bin', 'x'), '/private/tmp/claude-501/x'].flatMap(ancestors))].map((d) => `(allow file-read-metadata (literal "${d}"))`)
].join('\n') + '\n';
fs.writeFileSync(path.join(root, 'sandbox.sb'), sb);

const sh = (cmd, args, o = {}) => spawnSync('sandbox-exec', ['-f', path.join(root, 'sandbox.sb'), cmd, ...args], { env, encoding: 'utf8', ...o });

// 1. The folder.
if (seed) {
  const s = path.resolve(seed);
  fs.cpSync(path.join(s, 'work', 'apps'), APPS, { recursive: true, verbatimSymlinks: true });
  // the person's machine on day N: the backend's data and the agent's own caches came with it; never the old chat.
  fs.cpSync(path.join(s, 'home'), HOME, { recursive: true, verbatimSymlinks: true, filter: (p) => !p.startsWith(path.join(s, 'home', '.cline')) });
  fs.writeFileSync(path.join(root, 'seed.txt'), s + '\n');
} else if (ARM === 'nodegx') {
  const r = sh('npx', ['-y', `create-nodegx@${KIT_V}`, APPS, '--cline'], { cwd: path.dirname(APPS) });
  fs.writeFileSync(path.join(root, 'create.log'), r.stdout + r.stderr);
  if (r.status !== 0) throw new Error(`create-nodegx exited ${r.status}; see create.log`);
} else {
  fs.mkdirSync(APPS, { recursive: true });
  if (ARM === 'harness') {
    // OWN-023's plain-code harness, word for word but the file's own name: Cline reads AGENTS.md, not CLAUDE.md.
    const h = fs.readFileSync(path.join(HERE, '../own-023/harness/CLAUDE.md'), 'utf8');
    if (!h.includes('- `CLAUDE.md`: this file. Leave it as it is.')) throw new Error('the harness changed; re-read before renaming');
    fs.writeFileSync(path.join(APPS, 'AGENTS.md'), h.replace('- `CLAUDE.md`: this file. Leave it as it is.', '- `AGENTS.md`: this file. Leave it as it is.'));
  }
}
fs.mkdirSync(SETTINGS, { recursive: true });
fs.writeFileSync(path.join(SETTINGS, 'global-settings.json'), JSON.stringify(globalSettings, null, 2) + '\n');
writeSealPlugin(path.join(CLINE_DIR, 'plugins'), ALLOWED);
if (ARM === 'nodegx') {
  const entry = JSON.parse(fs.readFileSync(env.CLINE_MCP_SETTINGS_PATH, 'utf8')).mcpServers.nodegx;
  if (!entry || !entry.args.includes(`@nodegx/mcp@${KIT_V}`)) throw new Error(`the kit wrote ${JSON.stringify(entry)}`);
  // Warm the server's npx install so the first connect doesn't race Cline's clock (OWN-020).
  sh('npx', ['-y', `@nodegx/mcp@${KIT_V}`, '--version'], { cwd: APPS, timeout: 240000 });
}

// 2. Sittings.
const request = fs.readFileSync(requestFile, 'utf8').trim();
const CARRY_ON = '\n\n(Another session already started on this in this folder and stopped before it was finished. Carry on from where it is.)';
const tokens = { input: 0, cached: 0, output: 0 };
const sittings = [];
const t0 = Date.now();
fs.writeFileSync(path.join(root, 'command.txt'),
  `cd ${APPS} && sandbox-exec -f ${root}/sandbox.sb ${CLINE_BIN} --json -P cline-pass -m ${MODEL} -c ${APPS} --data-dir ${DATA} -t <s> --retries 5 "$(cat ${path.resolve(requestFile)})"\n` +
  `# arm ${ARM}; HOME=${HOME}; key from the repo .env as CLINE_API_KEY (never written); relay judge.txt → Haiku, MORE → a new sitting, up to ${N}\n`);
for (let k = 1; k <= N + 1; k++) {
  const s = await sitting(k, k === 1 ? request : request + CARRY_ON);
  sittings.push(s);
  fs.writeFileSync(path.join(root, 'sittings.json'), JSON.stringify(sittings, null, 2) + '\n');
  console.log(`sitting ${k}: ${s.finish} ${s.seconds}s $${s.usd.toFixed(3)} judge ${s.judge ?? '—'}`);
  if (s.finish !== 'completed' || s.judge !== 'MORE') break;
}
const teardown = reap();
const usd = tokens.input * PRICE.input / 1e6 + tokens.cached * PRICE.cached / 1e6 + tokens.output * PRICE.output / 1e6;
const round = { arm: ARM, model: MODEL, kit: ARM === 'nodegx' ? KIT_V : null, seed, request: path.resolve(requestFile),
  sittings: sittings.length, finish: sittings.at(-1).finish, judge: sittings.at(-1).judge, seconds: Math.round((Date.now() - t0) / 1000),
  tokens, usdAtClinePassPrices: Number(usd.toFixed(3)), audit: audit(), teardown };
fs.writeFileSync(path.join(root, 'round.json'), JSON.stringify(round, null, 2) + '\n');
console.log('round', JSON.stringify({ finish: round.finish, judge: round.judge, sittings: round.sittings, seconds: round.seconds, usd: round.usdAtClinePassPrices, audit: round.audit }));

function sitting(k, prompt) {
  const dir = path.join(SITS, String(k));
  fs.mkdirSync(dir, { recursive: true });
  const timeoutS = Math.round(Number(opt('--timeout-min', 120)) * 60);
  const args = ['-f', path.join(root, 'sandbox.sb'), CLINE_BIN, '--json', '-P', 'cline-pass', '-m', MODEL, '-c', APPS, '--data-dir', DATA, '-t', String(timeoutS), '--retries', '5', prompt];
  const log = fs.createWriteStream(path.join(dir, 'agent.jsonl'));
  const err = fs.createWriteStream(path.join(dir, 'agent.stderr'));
  const child = spawn('sandbox-exec', args, { cwd: APPS, env: { ...env, PWD: APPS }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(err);
  const start = Date.now();
  const stallMin = Number(opt('--stall-min', 30));
  let lastSize = -1, lastGrow = Date.now(), stalled = false;
  const watch = setInterval(() => {
    const size = fs.statSync(path.join(dir, 'agent.jsonl')).size + fs.statSync(path.join(dir, 'agent.stderr')).size;
    if (size !== lastSize) { lastSize = size; lastGrow = Date.now(); return; }
    if (!stalled && Date.now() - lastGrow > stallMin * 60000) { stalled = true; for (const pid of tree(child.pid).reverse()) try { process.kill(pid, 'SIGTERM'); } catch {} }
  }, 15000);
  return new Promise((resolve) => child.on('close', (code) => {
    clearInterval(watch);
    const lines = readJsonl(path.join(dir, 'agent.jsonl'));
    const result = lines.findLast((l) => l.type === 'run_result');
    const finish = stalled ? 'stalled' : result?.finishReason ?? lines.findLast((l) => l.type === 'run_aborted')?.reason ?? 'no run_result';
    if (result) fs.writeFileSync(path.join(dir, 'run-result.json'), JSON.stringify(result, null, 2) + '\n');
    const u = result?.aggregateUsage ?? result?.usage ?? sumUsage(lines);
    const t = { input: (u.inputTokens || 0) - (u.cacheReadTokens || 0), cached: u.cacheReadTokens || 0, output: u.outputTokens || 0 };
    for (const key of Object.keys(t)) tokens[key] += t[key];
    const usd = t.input * PRICE.input / 1e6 + t.cached * PRICE.cached / 1e6 + t.output * PRICE.output / 1e6;
    const s = { k, finish, exit: code, seconds: Math.round((Date.now() - start) / 1000), iterations: result?.iterations ?? null, tokens: t, usd,
      last: (result?.text ?? '').slice(-6000), judge: finish === 'completed' ? judge(result?.text ?? '') : null };
    fs.writeFileSync(path.join(dir, 'exit'), `${finish} (exit ${code}) ${s.seconds}s\n`);
    reap(); // the sitting's servers die with it; the next sitting (or the grader) starts its own
    resolve(s);
  }));
}

function judge(message) {
  const bin = process.env.JUDGE_BIN || newestClaudeBin();
  const prompt = fs.readFileSync(path.join(HERE, '../own-023/judge.txt'), 'utf8').replace('{MESSAGE}', message.slice(-6000));
  const cwd = path.join(root, 'judge');
  fs.mkdirSync(cwd, { recursive: true });
  const r = spawnSync(bin, ['-p', prompt, '--model', 'haiku', '--output-format', 'json', '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--no-session-persistence'], { cwd, encoding: 'utf8', timeout: 180000 });
  try { const v = JSON.parse(r.stdout).result.trim().toUpperCase(); return v.startsWith('MORE') ? 'MORE' : v.startsWith('DONE') ? 'DONE' : `?${v.slice(0, 20)}`; } catch { return '?no-judge'; }
}

function newestClaudeBin() {
  const ext = path.join('/Users/richardosborne/.vscode/extensions');
  const dirs = fs.readdirSync(ext).filter((d) => /^anthropic\.claude-code-[\d.]+-darwin-arm64$/.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return path.join(ext, dirs.at(-1), 'resources/native-binary/claude');
}

// Every process whose environment carries this round's HOME (servers the agent started, the NodeGX backend) — found
// by environment, never by name (memory: pkill by name kills a peer's).
function reap() {
  const ps = spawnSync('ps', ['-E', '-ww', '-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout || '';
  const mine = ps.split('\n').filter((l) => l.includes(`HOME=${HOME} `) || l.includes(`HOME=${HOME}\t`)).map((l) => Number(l.trim().split(/\s+/)[0])).filter((p) => p && p !== process.pid);
  for (const pid of mine) try { process.kill(pid, 'SIGTERM'); } catch {}
  const out = `${new Date().toISOString()} reaped ${mine.length}: ${mine.join(' ')}\n`;
  fs.appendFileSync(path.join(root, 'teardown.txt'), out);
  return mine.length;
}

function tree(pid) { return [pid, ...(spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).flatMap((c) => tree(Number(c)))]; }
function readJsonl(f) { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
function sumUsage(lines) {
  const u = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  for (const l of lines) if (l.type === 'agent_event' && l.event?.type === 'usage') for (const k of Object.keys(u)) u[k] += l.event[k] ?? l.event.usage?.[k] ?? 0;
  return u;
}

// The seal fails open and the sandbox is silent to the model's file tools only through errors, so: every absolute path
// in any tool input outside the round, and every sandbox denial the kernel logged for this round's processes.
function audit() {
  const roots = [root];
  const seen = new Set();
  for (const k of fs.readdirSync(SITS)) {
    const lines = readJsonl(path.join(SITS, k, 'agent.jsonl')).filter((l) => l.type === 'agent_event' && l.event?.type === 'content_start' && l.event.contentType === 'tool');
    for (const l of lines) for (const m of JSON.stringify(l.event.input ?? '').matchAll(/(?<![\w.])(\/(?:Users|private|tmp|etc|var|opt|Library|Volumes|home)\/[^"\s\\,)'`]*)/g)) {
      if (!roots.some((r) => m[1] === r || m[1].startsWith(r + '/')) && !m[1].startsWith(CACHE)) seen.add(`${l.event.toolName}: ${m[1]}`);
    }
  }
  fs.writeFileSync(path.join(root, 'seal-audit.txt'), seen.size ? [...seen].join('\n') + '\n' : 'clean\n');
  // The fence's one known cost to an agent: Chrome launched by its own path (not CHROME_PATH) can't start its sandbox.
  let chromeSandboxHits = 0;
  for (const k of fs.readdirSync(SITS)) for (const l of readJsonl(path.join(SITS, k, 'agent.jsonl')))
    if (l.type === 'agent_event' && l.event?.type === 'content_end' && /sandbox initialization failed|Failed to initialize sandbox/.test(JSON.stringify(l.event.output ?? ''))) chromeSandboxHits++;
  fs.writeFileSync(path.join(root, 'chrome-sandbox-hits.txt'), `${chromeSandboxHits}\n`);
  // /tmp is shared by every round (the sandbox can't take it away without breaking tools): what a round named there is
  // moved into its own folder, so a later round of another arm can't read it (§8, 2026-10-22, after t1-code-1).
  const left = path.join(root, 'left-in-tmp');
  for (const entry of seen) {
    const m = entry.match(/: (?:\/private)?\/tmp\/([^/]+)/);
    const src = m && path.join('/private/tmp', m[1]);
    if (!src || m[1].startsWith('claude-') || !fs.existsSync(src)) continue;
    fs.mkdirSync(left, { recursive: true });
    try { fs.renameSync(src, path.join(left, m[1])); } catch {}
  }
  return seen.size ? `${seen.size} outside path(s)` : 'clean';
}

function writeSealPlugin(dir, allowed) {
  fs.mkdirSync(dir, { recursive: true });
  const roots = [...new Set(allowed.flatMap((a) => [a, a.replace(/^\/private\/tmp\//, '/tmp/')]))];
  const src = `// OWN-026 lab seal (harness, not the person): see own-020/round-cline.mjs. The OS sandbox is the real fence.
const path = require('node:path');
const ROOTS = ${JSON.stringify(roots)};
const CWD = ${JSON.stringify(APPS)};
const FILE_TOOLS = ['read_files', 'editor', 'apply_patch'];
const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
};
const inside = (p) => { const abs = path.resolve(CWD, p); return ROOTS.some((r) => abs === r || abs.startsWith(r + path.sep)); };
const pathsOf = (tool, input) => {
  if (tool === 'apply_patch') {
    const text = strings(input).join('\\n');
    return [...text.matchAll(/^\\*\\*\\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map((m) => m[1].trim());
  }
  if (tool === 'editor') return strings(input && input.path !== undefined ? input.path : input).slice(0, 1);
  return strings(input).filter((s) => s.trim() && !s.startsWith('cline://') && !/^\\d+$/.test(s));
};
module.exports = {
  name: 'nodegx-lab-seal',
  manifest: { capabilities: ['hooks'] },
  hooks: {
    beforeTool(ctx) {
      const tool = ctx && ctx.toolCall ? ctx.toolCall.toolName : undefined;
      if (!FILE_TOOLS.includes(tool)) return undefined;
      const input = ctx.toolCall.input !== undefined ? ctx.toolCall.input : ctx.input;
      const outside = pathsOf(tool, input).filter((p) => !inside(p));
      if (!outside.length) return undefined;
      return { skip: true, reason: 'This path is outside the folder you are working in, so it is not available: ' + outside.join(', ') + '. Work inside ' + CWD + '.' };
    }
  }
};
`;
  fs.writeFileSync(path.join(dir, 'seal.js'), src);
}
