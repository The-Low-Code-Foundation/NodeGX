// OWN-026 Mistral (2026-10-24, Richard: "apply the same fixes 01 through 07 to the Mistral Vibe harness and try 10 rounds
// of the same concept in Mistral Large 4"): round.mjs's sitting-chain, with Mistral Vibe 3.0.2 + Mistral Large 4 in place
// of Cline 3.0.71 + DeepSeek V4.1 Flash. Everything else is round.mjs's: the three arms, the empty HOME, the OS fence
// (sandbox-exec), the kit's tarballs and preview shim, CHROME_PATH, the Haiku relay (MORE → a NEW sitting with the
// carry-on sentence, up to --continues; kept although Vibe can resume, so both labs relay alike), the reaper, the audit.
//
//   node round-vibe.mjs <root> <request-file> --arm code|harness|nodegx [--seed <earlier round root>] [--continues 2]
//                       [--timeout-min 120] [--stall-min 30] [--max-usd 3] [--key vibe|api] [--tap <port>] (mock only)
//
// Vibe as a person installs it today (3.0.2, 2026-10-22): its Unified Harness is the only one (no --legacy-harness; it
// now hands the model the MCP server's own error text), MCP tools are reached through search_tool_functions +
// run_typescript, and web/sub-agent/ask tools are off in every arm (round.mjs's rule). --auto-approve: in `vibe -p` an
// unanswered ask ends the run (memory: a-stranger-agent-round-recipe), and the OS fence is the real seal.
// VIBE_HOME is <root>/vibe, outside home/: it holds the user config (written here every round), the trust list and
// Vibe's own session logs, so the old chat neither seeds the next round nor reaches the grader (as home/.cline in round.mjs).
// --reply (OWN-037): the person answers in the same chat. <root> is an earlier round's; the request file is the reply,
// sent with `-c` (Vibe's continue: the folder's most recent session, from the round's own VIBE_HOME). A relay after it
// is what the kit's note tells a person to type after a hand-over: a NEW session saying "continue". Writes
// turn-<n>.json, never round.json.
// --tap <port>: a $0 mock (series.mjs --mock) — the built-in mistral provider is pointed at mock-model.mjs on that port.
//
// Writes into <root>: command.txt, sandbox.sb, sittings/<k>/{agent.jsonl,agent.stderr,out/export.json,exit},
// sittings.json, seal-audit.txt, chrome-sandbox-hits.txt, teardown.txt, round.json (+ mcp-entry.json for nodegx).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { kitTarball, hasTarball } from '../own-018/kit-tarball.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../../../..');
const LAB = '/Users/Shared/nodegx-lab';
// --vibe <version> (2026-11-02, Large 4.0 on Vibe 3.0.4): each version its own uv venv, LAB/vibe-<version>; 3.0.2 when unset
const VIBE_VERSION = (() => { const a = process.argv.indexOf('--vibe'); return a > 0 ? process.argv[a + 1] : '3.0.2'; })();
const VIBE_DIR = path.join(LAB, `vibe-${VIBE_VERSION}`); // uv venv, its python under LAB/uv-python (the fence denies ~/.local and ~/.cache)
const VIBE_BIN = path.join(VIBE_DIR, 'bin', 'vibe');
const PY_DIR = path.join(LAB, 'uv-python');
const CACHE = path.join(LAB, 'cache');
const NODE_DIR = path.dirname(process.execPath);
const MODEL = 'mistral-large-4';
// Large 4, $/M: the kit's own .vibe/config.toml (create-nodegx renderVibeConfig) — the same lines go in the user config
const PRICE = { input: 1.36, cached: 0.14, output: 4.18 };
const MODEL_TOML = ['[[models]]', `name = "${MODEL}"`, 'provider = "mistral"', `alias = "${MODEL}"`, 'display_name = "Mistral Large 4"',
  'temperature = 1.0', 'thinking = "high"', 'thinking_levels = ["low", "high"]', 'max_context_length = 1000000',
  'max_output_tokens = 262144', // the kit's fix for P112-OWN026-VIBEMAXTOKENS (Richard 2026-10-24: fix the kit; every arm matches)
  `input_price = ${PRICE.input}`, `output_price = ${PRICE.output}`, `cached_input_price = ${PRICE.cached}`];
// web and asking off in every arm (round.mjs's rule). Sub-agents can't be: 3.0.2's `agents` connector (spawn, send_message,
// …) stays through --disabled-tools (names, globs, re:), enable_subagents = false and [[connectors]] disabled = true
// (measured 2026-10-24, $0 mocks). So they're on in every arm, as in a person's Vibe, and round.json counts the spawns.
const DISABLED = ['web_fetch', 'web_search', 'task', 'ask_user_question'];

const [rootArg, requestFile, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const ARM = opt('--arm', null);
if (!rootArg || !requestFile || !['code', 'harness', 'nodegx'].includes(ARM)) throw new Error('usage: node round-vibe.mjs <root> <request-file> --arm code|harness|nodegx');
const REPLY = rest.includes('--reply');
if (!REPLY && fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
if (REPLY && !fs.existsSync(path.join(rootArg, 'sittings.json'))) throw new Error(`--reply: ${rootArg} has no sittings.json`);
if (!fs.existsSync(VIBE_BIN)) throw new Error(`no ${VIBE_BIN}`);
let KIT_DIR = opt('--kit-dir', null);
if (ARM === 'nodegx' && !KIT_DIR) {
  const hold = opt('--hold', null);
  if (hold && fs.existsSync(hold)) console.log(`waiting: ${hold} exists`);
  while (hold && fs.existsSync(hold)) await new Promise((r) => setTimeout(r, 60000));
  const kitFile = opt('--kit-file', null);
  if (kitFile && fs.existsSync(kitFile)) KIT_DIR = fs.readFileSync(kitFile, 'utf8').trim() || null;
  if (!KIT_DIR) throw new Error('the Mistral lab runs on a packed kit only (--kit-dir, or --kit-file naming one)');
}
if (KIT_DIR) { KIT_DIR = path.resolve(KIT_DIR); kitTarball(KIT_DIR, 'create-nodegx'); kitTarball(KIT_DIR, 'nodegx-mcp'); }
const N = Number(opt('--continues', 2));
// Richard 2026-10-24: $3 a round at first; every round then ended on price_limit half-built, and he ruled "no cap"
// (`--max-usd none`): a round ends on --time-limit, the stall watch and the relay's limit only.
const MAX_USD = opt('--max-usd', '3') === 'none' ? null : Number(opt('--max-usd', '3'));
const seed = opt('--seed', null);
const mockPort = opt('--tap', null);

fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);
if (!root.startsWith(LAB + '/')) throw new Error(`a round root sits under ${LAB}`);
if (spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).status === 0) throw new Error(`${root} is inside a git repo`);
const HOME = path.join(root, 'home');
const VIBE_HOME = path.join(root, 'vibe');
const APPS = path.join(root, 'work', 'apps');
const SITS = path.join(root, 'sittings');
for (const d of [path.join(HOME, 'tmp'), VIBE_HOME, path.dirname(APPS), SITS, path.join(CACHE, 'npm'), path.join(CACHE, 'ms-playwright')]) fs.mkdirSync(d, { recursive: true });

// The key: Richard's ruling 2026-10-24, the Vibe subscription's (MISTRAL_VIBE_API_KEY), as MISTRAL_API_KEY — the
// variable Vibe's mistral provider reads. Set even in a mock: with none, Vibe 3 goes to the macOS Keychain.
const envFile = fs.readFileSync(path.join(REPO, '.env'), 'utf8');
const keyFrom = (name) => (envFile.match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm')) || [])[1];
const keyName = { vibe: 'MISTRAL_VIBE_API_KEY', api: 'MISTRAL_API_KEY' }[opt('--key', 'vibe')];
const KEY = mockPort ? 'mock' : keyFrom(keyName);
if (!KEY) throw new Error(`no ${keyName} in the repo .env`);
const env = {};
for (const k of ['LANG', 'LC_ALL', 'TERM', 'SHELL']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, {
  USER: 'person', LOGNAME: 'person',
  PATH: `${NODE_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  HOME, VIBE_HOME,
  TMPDIR: path.join(HOME, 'tmp'),
  npm_config_cache: path.join(CACHE, 'npm'),
  PLAYWRIGHT_BROWSERS_PATH: path.join(CACHE, 'ms-playwright'),
  BROWSER: 'none',
  CHROME_PATH: path.join(LAB, 'bin', 'chrome'),
  MISTRAL_API_KEY: KEY,
  TERM: 'dumb', LANG: process.env.LANG || 'en_US.UTF-8'
});
if (KIT_DIR && hasTarball(KIT_DIR, 'nodegx-preview')) Object.assign(env, {
  PATH: `${path.join(LAB, 'bin', 'kitnpx')}:${env.PATH}`,
  NODEGX_LAB_PREVIEW_TGZ: kitTarball(KIT_DIR, 'nodegx-preview'),
  NODEGX_LAB_REAL_NPX: path.join(NODE_DIR, 'npx')
});
// Vibe's bash runs the login profile, and macOS's /etc/zprofile (path_helper) puts /usr/local/bin first: the first mock's
// shell had /usr/local/bin/npx (no shim, the registry's preview) and possibly another node. The lab's ZDOTDIR (outside
// HOME, so not the person's folder) puts the round's PATH back after it, as round.mjs's shell has it.
const ZDOT = path.join(root, 'zdotdir');
fs.mkdirSync(ZDOT, { recursive: true });
fs.writeFileSync(path.join(ZDOT, '.zprofile'), `# OWN-026 Mistral lab: the round's PATH after /etc/zprofile's path_helper (round-vibe.mjs)\nexport PATH=${JSON.stringify(env.PATH)}\n`);
Object.assign(env, { SHELL: '/bin/zsh', ZDOTDIR: ZDOT });

// 0. The fence: round.mjs's profile, with Vibe's install (and its python) readable in place of Cline's.
const ancestors = (p) => { const out = []; for (let d = path.dirname(p); d !== '/'; d = path.dirname(d)) out.push(d); return out; };
const sb = [
  '(version 1)', '(allow default)',
  '(deny file-read* file-write* (subpath "/Users/richardosborne"))',
  `(allow file-read* (subpath "${path.dirname(path.dirname(NODE_DIR))}"))`,
  '(deny file-read* file-write* (subpath "/private/tmp/claude-501"))',
  `(deny file-read* file-write* (subpath "${LAB}"))`,
  `(allow file-read* (subpath "${VIBE_DIR}"))`,
  `(allow file-read* (subpath "${PY_DIR}"))`,
  `(allow file-read* (subpath "${path.join(LAB, 'bin')}"))`,
  ...(KIT_DIR ? [`(allow file-read* (subpath "${KIT_DIR}"))`] : []),
  `(allow file-read* file-write* (subpath "${CACHE}"))`,
  `(allow file-read* file-write* (subpath "${root}"))`,
  ...[...new Set([root, CACHE, NODE_DIR, path.join(VIBE_DIR, 'x'), path.join(PY_DIR, 'x'), path.join(LAB, 'bin', 'x'), ...(KIT_DIR ? [path.join(KIT_DIR, 'x')] : []), '/private/tmp/claude-501/x'].flatMap(ancestors))].map((d) => `(allow file-read-metadata (literal "${d}"))`)
].join('\n') + '\n';
fs.writeFileSync(path.join(root, 'sandbox.sb'), sb);
const sh = (cmd, args, o = {}) => spawnSync('sandbox-exec', ['-f', path.join(root, 'sandbox.sb'), cmd, ...args], { env, encoding: 'utf8', ...o });

// 1. The folder.
const PROJ_CFG = path.join(APPS, '.vibe', 'config.toml');
if (REPLY) {
  // turn 1's folder, home and Vibe sessions as they are
} else if (seed) {
  const s = path.resolve(seed);
  fs.cpSync(path.join(s, 'work', 'apps'), APPS, { recursive: true, verbatimSymlinks: true });
  fs.cpSync(path.join(s, 'home'), HOME, { recursive: true, verbatimSymlinks: true }); // backends, caches; the chat lives in <seed>/vibe
  fs.writeFileSync(path.join(root, 'seed.txt'), s + '\n');
} else if (ARM === 'nodegx') {
  const r = sh('npx', ['-y', `--package=${kitTarball(KIT_DIR, 'create-nodegx')}`, 'create-nodegx', APPS, '--vibe'], { cwd: path.dirname(APPS) });
  fs.writeFileSync(path.join(root, 'create.log'), r.stdout + r.stderr);
  if (r.status !== 0) throw new Error(`create-nodegx exited ${r.status}; see create.log`);
} else {
  fs.mkdirSync(APPS, { recursive: true });
  if (ARM === 'harness') {
    // OWN-023's plain-code harness as AGENTS.md (Vibe reads AGENTS.md, as Cline does): round.mjs's exact text
    const h = fs.readFileSync(path.join(HERE, '../own-023/harness/CLAUDE.md'), 'utf8');
    if (!h.includes('- `CLAUDE.md`: this file. Leave it as it is.')) throw new Error('the harness changed; re-read before renaming');
    fs.writeFileSync(path.join(APPS, 'AGENTS.md'), h.replace('- `CLAUDE.md`: this file. Leave it as it is.', '- `AGENTS.md`: this file. Leave it as it is.'));
  }
}
// The user layer: the model (the kit's own Large 4 lines, so every arm has the same model entry), no update checks;
// in a mock, the built-in mistral provider points at mock-model.mjs.
// 2026-11-02 (Vibe 3.0.4): a layer naming an active_model it has no entry for logs "Model 'mistral-large-4' is not
// available — running 'Mistral Medium 3.5'" though the merged config runs Large 4, so the user layer names the model
// only when it also carries the entry; the kit's project layer names both.
const kitHasModel = fs.existsSync(PROJ_CFG) && /^active_model = /m.test(fs.readFileSync(PROJ_CFG, 'utf8'));
fs.writeFileSync(path.join(VIBE_HOME, 'config.toml'), ['# OWN-026 Mistral lab (harness, not the person): see round-vibe.mjs.',
  ...(kitHasModel ? [] : [`active_model = "${MODEL}"`]), 'enable_update_checks = false', 'enable_auto_update = false', '',
  ...(mockPort ? ['[[providers]]', 'name = "mistral"', `api_base = "http://127.0.0.1:${mockPort}/v1"`, 'api_key_env_var = "MISTRAL_API_KEY"', 'backend = "mistral"', ''] : []),
  ...(kitHasModel ? [] : MODEL_TOML), ''].join('\n'));
if (ARM === 'nodegx' && !REPLY) {
  // the kit's server entry, from today's kit tarball: `npx -y @nodegx/mcp@<v> …` → `npx -y --package=<tgz> noodl-mcp …`
  const before = fs.readFileSync(PROJ_CFG, 'utf8');
  const m = before.match(/^\[\[mcp_servers\]\][\s\S]*?^args = (\[.*\])$/m);
  if (!m) throw new Error('the kit wrote no [[mcp_servers]] args line');
  const args = JSON.parse(m[1]);
  const at = args.findIndex((a) => /^@nodegx\/mcp@/.test(a));
  const atTgz = args.findIndex((a) => /^--package=.*\/nodegx-mcp-[^/]*\.tgz$/.test(a));
  if (at >= 0) args.splice(at, 1, `--package=${kitTarball(KIT_DIR, 'nodegx-mcp')}`, 'noodl-mcp');
  else if (atTgz >= 0 && args[atTgz + 1] === 'noodl-mcp') args[atTgz] = `--package=${kitTarball(KIT_DIR, 'nodegx-mcp')}`;
  else throw new Error(`the kit's args ${m[1]} name no server to point at the kit`);
  let after = before.replace(m[0], m[0].replace(m[1], JSON.stringify(args).replace(/","/g, '", "')));
  // 2026-10-25, the blind NodeGX arm: Vibe 3 starts an MCP server with only HOME/PATH/SHELL/TERM/USER/LOGNAME (the MCP
  // SDK's default), so the lab's CHROME_PATH never reached the kit's renderer, and every render_report / drive_page hung
  // 240 s inside the fence (12 times in t1–c03). Cline hands its servers the whole environment; this gives the server
  // the same lab variables (never the model's key). Lab plumbing, like the --package rewrite above.
  const serverEnv = Object.fromEntries(['CHROME_PATH', 'TMPDIR', 'npm_config_cache', 'PLAYWRIGHT_BROWSERS_PATH', 'BROWSER',
    'NODEGX_LAB_PREVIEW_TGZ', 'NODEGX_LAB_REAL_NPX'].filter((k) => env[k]).map((k) => [k, env[k]]));
  const envLine = `env = { ${Object.entries(serverEnv).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(', ')} }`;
  const block = after.match(/^\[\[mcp_servers\]\][\s\S]*?(?=^\[|(?![\s\S]))/m)[0];
  const newBlock = /^env = .*$/m.test(block) ? block.replace(/^env = .*$/m, envLine) : block.replace(/^(args = .*)$/m, `$1\n${envLine}`);
  after = after.replace(block, newBlock);
  fs.writeFileSync(PROJ_CFG, after);
  const cmd = (before.match(/^\[\[mcp_servers\]\][\s\S]*?^command = (".*")$/m) || [])[1];
  fs.writeFileSync(path.join(root, 'mcp-entry.json'), JSON.stringify({ command: cmd && JSON.parse(cmd), args, envKeys: Object.keys(serverEnv) }, null, 2) + '\n');
  // warm the server's npx install so the first connect doesn't race Vibe's startup timeout
  const bin = args.indexOf('noodl-mcp');
  sh('npx', [...args.slice(0, bin + 1), '--version'], { cwd: APPS, timeout: 240000 });
}

// 2. Sittings.
const request = fs.readFileSync(requestFile, 'utf8').trim();
const CARRY_ON = '\n\n(Another session already started on this in this folder and stopped before it was finished. Carry on from where it is.)';
const tokens = { input: 0, cached: 0, output: 0 };
const sittings = [];
let vibeUsd = 0;
let subagents = 0; // agents.spawn calls (audit)
const t0 = Date.now();
const timeoutS = Math.round(Number(opt('--timeout-min', 120)) * 60);
const baseArgs = ['--auto-approve', '--trust', '--output', 'streaming', '--time-limit', String(timeoutS), ...DISABLED.flatMap((t) => ['--disabled-tools', t])];
const prior = REPLY ? JSON.parse(fs.readFileSync(path.join(root, 'sittings.json'), 'utf8')) : [];
const k0 = prior.length;
(REPLY ? fs.appendFileSync : fs.writeFileSync)(path.join(root, 'command.txt'),
  `cd ${APPS} && sandbox-exec -f ${root}/sandbox.sb ${VIBE_BIN} -p "$(cat ${path.resolve(requestFile)})" ${baseArgs.join(' ')}${MAX_USD === null ? '' : ` --max-price <$${MAX_USD} − spent>`} --output-dir <sitting>/out\n` +
  `# arm ${ARM}; HOME=${HOME}; VIBE_HOME=${VIBE_HOME}; ${MODEL}; key ${mockPort ? 'mock' : keyName} as MISTRAL_API_KEY (never written); relay judge.txt → Haiku, MORE → a new sitting, up to ${N}\n`);
for (let k = k0 + 1; k <= k0 + N + 1; k++) {
  const left = MAX_USD === null ? null : MAX_USD - vibeUsd;
  if (left !== null && left <= 0.01) break;
  const first = k === k0 + 1;
  const s = await sitting(k, first ? request : REPLY ? 'continue' : request + CARRY_ON, left, REPLY && first ? ['-c'] : []);
  if (REPLY && first) s.resumed = '-c';
  sittings.push(s);
  fs.writeFileSync(path.join(root, 'sittings.json'), JSON.stringify([...prior, ...sittings], null, 2) + '\n');
  console.log(`sitting ${k}: ${s.finish} ${s.seconds}s $${s.usd.toFixed(3)} (vibe $${s.vibeUsd}) judge ${s.judge ?? '—'}`);
  if (s.finish !== 'completed' || s.judge !== 'MORE') break;
}
// A round whose first sitting never got a token back (2026-10-24: every request refused, `max_tokens is too large`)
// tells nothing about the arm: no round.json, so the series stops there and nothing is graded or seeded from it
// (PLAN §8's `.infra-broken-*` rule, made automatic). Set the root aside by hand and re-run.
const s1 = sittings[0];
// ...and no tool call either: a sitting the stall watch stopped has an export with usage null (Vibe 3 writes none on
// SIGTERM), though it may have worked for an hour (t2-nodegx-c04: 260 calls, 2026-10-25) — that one is graded as it stands
const s1Effects = s1 ? readJsonl(path.join(SITS, String(s1.k), 'agent.jsonl')).filter((l) => l.type === 'effect').length : 0;
if (s1 && s1.finish !== 'completed' && !s1.tokens.input && !s1.tokens.cached && !s1.tokens.output && !s1Effects) {
  reap();
  fs.writeFileSync(path.join(root, 'infra-broken.txt'), `${s1.finish}: ${JSON.stringify(s1.error)}\n`);
  console.log(`infra-broken: ${s1.finish} ${JSON.stringify(s1.error)?.slice(0, 300)}`);
  process.exit(2);
}
const teardown = reap();
const usd =tokens.input * PRICE.input / 1e6 + tokens.cached * PRICE.cached / 1e6 + tokens.output * PRICE.output / 1e6;
const round = { arm: ARM, harness: `mistral-vibe ${VIBE_VERSION}`, model: MODEL, kit: ARM === 'nodegx' ? { dir: KIT_DIR, files: fs.readdirSync(KIT_DIR).filter((f) => f.endsWith('.tgz')) } : null,
  seed, request: path.resolve(requestFile), sittings: sittings.length, finish: sittings.at(-1).finish, judge: sittings.at(-1).judge,
  seconds: Math.round((Date.now() - t0) / 1000), tokens, usd: Number(usd.toFixed(3)), vibeUsd: Number(vibeUsd.toFixed(3)), maxUsd: MAX_USD,
  turns: sittings.reduce((t, x) => t + (x.iterations || 0), 0), audit: audit(), subagents, teardown };
const roundFile = REPLY ? `turn-${fs.readdirSync(root).filter((f) => /^turn-\d+\.json$/.test(f)).length + 2}.json` : 'round.json';
fs.writeFileSync(path.join(root, roundFile), JSON.stringify({ ...round, ...(REPLY ? { reply: true, firstSitting: k0 + 1 } : {}) }, null, 2) + '\n');
console.log(roundFile, JSON.stringify({ finish: round.finish, judge: round.judge, sittings: round.sittings, seconds: round.seconds, usd: round.usd, vibeUsd: round.vibeUsd, audit: round.audit }));

function sitting(k, prompt, maxPrice, extra = []) {
  const dir = path.join(SITS, String(k));
  const out = path.join(dir, 'out');
  fs.mkdirSync(dir, { recursive: true });
  const args = ['-f', path.join(root, 'sandbox.sb'), VIBE_BIN, ...extra, '-p', prompt, ...baseArgs, ...(maxPrice === null ? [] : ['--max-price', maxPrice.toFixed(2)]), '--output-dir', out];
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
    // SIGTERM to vibe itself first: it writes its export and exits (its --help)
    if (!stalled && Date.now() - lastGrow > stallMin * 60000) { stalled = true; for (const pid of tree(child.pid).reverse()) try { process.kill(pid, 'SIGTERM'); } catch {} }
  }, 15000);
  return new Promise((resolve) => child.on('close', (code) => {
    clearInterval(watch);
    let exp = null;
    try { exp = JSON.parse(fs.readFileSync(path.join(out, 'export.json'), 'utf8')); } catch {}
    const lines = readJsonl(path.join(dir, 'agent.jsonl'));
    // the person's last words from the agent: its last assistant text
    const lastText = lines.filter((l) => l.type === 'message' && l.role === 'assistant').map(textOf).filter(Boolean).at(-1) ?? '';
    const finish = stalled ? 'stalled' : exp?.outcome === 'finished' && !exp?.stop_reason ? 'completed' : (exp?.stop_reason || exp?.outcome || `no export (exit ${code})`);
    const u = exp?.usage ?? {};
    const t = { input: (u.input_tokens || 0) - (u.cached_input_tokens || 0), cached: u.cached_input_tokens || 0, output: u.output_tokens || 0 };
    for (const key of Object.keys(t)) tokens[key] += t[key];
    vibeUsd += exp?.cost_usd || 0;
    const usdS = t.input * PRICE.input / 1e6 + t.cached * PRICE.cached / 1e6 + t.output * PRICE.output / 1e6;
    const s = { k, finish, exit: code, seconds: Math.round((Date.now() - start) / 1000), iterations: exp?.steps ?? null, tokens: t, usd: usdS,
      vibeUsd: exp?.cost_usd ?? null, error: exp?.error ?? null, last: lastText.slice(-6000), judge: finish === 'completed' ? judge(lastText) : null };
    fs.writeFileSync(path.join(dir, 'exit'), `${finish} (exit ${code}) ${s.seconds}s\n`);
    reap();
    resolve(s);
  }));
}

function textOf(l) { return (Array.isArray(l.content) ? l.content : []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim(); }

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

// round.mjs's reaper: by this round's HOME in the environment, never by name
function reap() {
  const ps = spawnSync('ps', ['-E', '-ww', '-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout || '';
  const mine = ps.split('\n').filter((l) => l.includes(`HOME=${HOME} `) || l.includes(`HOME=${HOME}\t`)).map((l) => Number(l.trim().split(/\s+/)[0])).filter((p) => p && p !== process.pid);
  for (const pid of mine) try { process.kill(pid, 'SIGTERM'); } catch {}
  fs.appendFileSync(path.join(root, 'teardown.txt'), `${new Date().toISOString()} reaped ${mine.length}: ${mine.join(' ')}\n`);
  return mine.length;
}

function tree(pid) { return [pid, ...(spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).flatMap((c) => tree(Number(c)))]; }
function readJsonl(f) { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } }

// round.mjs's audit: absolute paths outside the round in the model's own tool calls (Vibe 3's `effect` entries:
// detail.toolName + detail.input; run_typescript's code included), Chrome's sandbox failures in their results
// (state.output / outputText), and /tmp files a round named moved into its own folder.
function audit() {
  const seen = new Set();
  let chromeSandboxHits = 0;
  for (const k of fs.readdirSync(SITS)) for (const l of readJsonl(path.join(SITS, k, 'agent.jsonl'))) {
    if (l.type !== 'effect') continue;
    for (const m of JSON.stringify(l.detail?.input ?? '').matchAll(/(?<![\w.])(\/(?:Users|private|tmp|etc|var|opt|Library|Volumes|home)\/[^"\s\\,)'`;|&]*)/g)) {
      if (!(m[1] === root || m[1].startsWith(root + '/')) && !m[1].startsWith(CACHE)) seen.add(`${l.detail?.toolName}: ${m[1]}`);
    }
    if (/sandbox initialization failed|Failed to initialize sandbox/.test(JSON.stringify(l.state ?? ''))) chromeSandboxHits++;
    if (l.detail?.toolName === 'agents.spawn') subagents++;
  }
  fs.writeFileSync(path.join(root, 'seal-audit.txt'), seen.size ? [...seen].join('\n') + '\n' : 'clean\n');
  fs.writeFileSync(path.join(root, 'chrome-sandbox-hits.txt'), `${chromeSandboxHits}\n`);
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
