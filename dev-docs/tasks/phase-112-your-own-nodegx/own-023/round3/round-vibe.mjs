// OWN-023 round 3 (the reading), the bonus arms: the same brief and quiz as the Claude arms, in Mistral Vibe 2.26.1
// (--legacy-harness, as the kit's own config says) with DeepSeek V4.1 Flash on Richard's ClinePass key.
//
//   node round-vibe.mjs <root> <brief> --arm code|nodegx --seed <dir> [--then <quiz>] [--continues 2]
//     [--max-turns 300] [--time-limit 5400] [--max-price 10] [--port 8931]
//     [--nodegx 0.2.4] [--mcp-tgz <nodegx-mcp-<v>.tgz>] [--note-from <bin/create-nodegx.js>]
//
// Round 3b (the graph as text), as round-arm.mjs: --mcp-tgz installs a LOCAL @nodegx/mcp tarball at the kit's pinned
// version into the app folder (no package.json, no lock), so the kit's `npx -y @nodegx/mcp@<v>` resolves to it, and
// --note-from writes the checkout's create-nodegx agent note (CLAUDE.md / AGENTS.md) over the kit's.
//
// The seal is the OS, not Vibe's permissions (round-kit.mjs's lesson: Vibe's file tools read anywhere under
// --auto-approve, and its shell can't be fenced by rule): Vibe and everything it starts run under `sandbox-exec`,
// which refuses reads and writes in ~/vscode_projects, ~/.claude, ~/.vibe, ~/.noodl, /private/tmp (every scratchpad,
// /private/tmp/galanotes) and the other round-3 arms; the round's own root stays open. Bash is ON (the Claude arms have
// it). Cost of the seal, measured: Chrome can't start its own sandbox inside it, so neither Vibe arm can open a browser.
//
// The model: ClinePass, through own-020/stream-tap.mjs in retry mode (OWN-020: ClinePass's in-band stream errors end
// a run; the tap holds each answer until it is whole and asks again). Vibe's generic provider reads `reasoning`.
//
// The relay: a sitting is one `vibe -p`; while PLAN.md does not exist, "Continue." with `-c`, up to --continues.
// --then: one more `vibe -p … -c` with every tool disabled (closed book); its stdout is then.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../../../../..');
const [rootArg, briefFile, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const ARM = opt('--arm');
if (!rootArg || !briefFile || !['code', 'nodegx'].includes(ARM)) throw new Error('usage: node round-vibe.mjs <root> <brief> --arm code|nodegx --seed <dir>');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);
const HOME = path.join(root, 'home'), WORK = path.join(root, 'work'), APP = path.join(WORK, 'gala');
for (const d of [path.join(HOME, 'tmp'), path.join(HOME, '.vibe'), WORK]) fs.mkdirSync(d, { recursive: true });
const N = Number(opt('--continues', 2)), PORT = Number(opt('--port', 8931));
const VIBE = ['uvx', '--from', 'mistral-vibe==2.26.1', 'vibe'];
const KEY = (fs.readFileSync(path.join(REPO, '.env'), 'utf8').match(/^CLINE_PASS_API_KEY=["']?([^"'\n]+)/m) || [])[1];
if (!KEY) throw new Error('no CLINE_PASS_API_KEY in .env');
const env = {
  PATH: process.env.PATH, HOME, TMPDIR: path.join(HOME, 'tmp'), npm_config_cache: path.join(HOME, '.npm'), BROWSER: 'none',
  UV_CACHE_DIR: path.join(process.env.HOME, '.cache/uv'), LANG: 'en_US.UTF-8', TERM: 'dumb', CLINE_PASS_API_KEY: KEY
};

// 1. The folder: the code arm is the seed; the NodeGX arm is `npm create nodegx@0.2.4` (the kit's CLAUDE.md, AGENTS.md
// and .vibe/config.toml) with the seed copied in after it, as round-arm.mjs does for the Claude arm.
const setup = { arm: ARM };
const VERSION = opt('--nodegx', '0.2.4');
if (ARM === 'nodegx') {
  const c = spawnSync('npm', ['create', '-y', `nodegx@${VERSION}`, 'gala'], { cwd: WORK, env, encoding: 'utf8' });
  fs.writeFileSync(path.join(root, 'create.log'), c.stdout + c.stderr);
  if (c.status !== 0) throw new Error(`npm create nodegx exited ${c.status}`);
  setup.kit = { version: VERSION };
  const mcpTgz = opt('--mcp-tgz', null);
  if (mcpTgz) {
    const tgz = path.resolve(mcpTgz);
    const r = spawnSync('npm', ['i', '--no-save', '--no-package-lock', '--no-audit', '--no-fund', tgz], { cwd: APP, env, encoding: 'utf8' });
    fs.appendFileSync(path.join(root, 'create.log'), `\n== npm i ${tgz}\n` + r.stdout + r.stderr);
    if (r.status !== 0) throw new Error(`npm i ${tgz} exited ${r.status}; see create.log`);
    const installed = JSON.parse(fs.readFileSync(path.join(APP, 'node_modules', '@nodegx', 'mcp', 'package.json'), 'utf8'));
    if (installed.version !== VERSION) throw new Error(`--mcp-tgz is ${installed.name}@${installed.version}, the kit pins ${VERSION}: npx would fetch the registry's`);
    setup.mcpTgz = { file: tgz, bytes: fs.statSync(tgz).size, version: installed.version };
  }
  const noteFrom = opt('--note-from', null);
  if (noteFrom) {
    const kit = (await import(path.resolve(noteFrom))).default;
    if (kit.MCP_VERSION !== VERSION) throw new Error(`--note-from pins @nodegx/mcp@${kit.MCP_VERSION}, the round runs ${VERSION}`);
    for (const name of kit.AGENT_FILES) fs.writeFileSync(path.join(APP, name), kit.AGENT_NOTE);
    setup.noteFrom = { file: path.resolve(noteFrom), files: kit.AGENT_FILES, bytes: kit.AGENT_NOTE.length };
  }
} else fs.mkdirSync(APP);
const seed = path.resolve(opt('--seed'));
for (const f of fs.readdirSync(seed)) if (fs.existsSync(path.join(APP, f))) throw new Error(`--seed would replace ${f}`);
fs.cpSync(seed, APP, { recursive: true });
setup.seed = seed;

// 2. Vibe's config. The user layer (round HOME) holds the provider, the model and the seal-independent settings; the
// kit's project config (NodeGX arm) names Large 4 as active_model, so there the line is switched to the same model.
const MODEL = ['[[models]]', 'name = "cline-pass/deepseek-v4.1-flash"', 'provider = "clinepass"', 'alias = "deepseek-v4.1-flash"',
  'display_name = "DeepSeek V4.1 Flash (ClinePass)"', 'max_context_length = 1000000', 'input_price = 0.15', 'output_price = 0.60', 'cached_input_price = 0.003'];
const PROVIDER = ['[[providers]]', 'name = "clinepass"', `api_base = "http://127.0.0.1:${PORT}/api/v1"`, 'api_key_env_var = "CLINE_PASS_API_KEY"',
  'api_style = "openai"', 'backend = "generic"', 'reasoning_field_name = "reasoning"'];
fs.writeFileSync(path.join(HOME, '.vibe', 'config.toml'), ['# OWN-023 round 3 lab (harness, not the person): see round-vibe.mjs.',
  'active_model = "deepseek-v4.1-flash"', 'enable_update_checks = false', 'enable_auto_update = false', '', ...PROVIDER, '', ...MODEL, ''].join('\n'));
const projCfg = path.join(APP, '.vibe', 'config.toml');
if (fs.existsSync(projCfg)) {
  const before = fs.readFileSync(projCfg, 'utf8');
  const after = before.replace(/^active_model = "[^"]+"$/m, 'active_model = "deepseek-v4.1-flash"');
  if (after === before) throw new Error('the kit config has no active_model line to switch');
  fs.writeFileSync(projCfg, after);
  setup.kitVibeConfig = after;
}

// 3. The seal.
const deny = ['/Users/richardosborne/vscode_projects', '/Users/richardosborne/.claude', '/Users/richardosborne/.vibe',
  '/Users/richardosborne/.noodl', '/Users/richardosborne/Documents', '/Users/richardosborne/Desktop', '/Users/richardosborne/Downloads',
  '/private/tmp', path.dirname(root)];
function ancestors(p) { const out = []; for (let d = path.dirname(p); d !== path.dirname(d); d = path.dirname(d)) out.push(d); return out; }
const profile = path.join(root, 'seal.sb');
fs.writeFileSync(profile, ['(version 1)', '(allow default)',
  ...deny.map((d) => `(deny file-read* file-write* (subpath ${JSON.stringify(d)}))`),
  `(allow file-read* file-write* (subpath ${JSON.stringify(root)}))`,
  // npm walks every ancestor of its cwd (lstat) looking for node_modules: B-vibe's first run lost the kit's server to
  // EPERM on the rounds' folder. The ancestors' metadata is open; their contents stay sealed.
  ...ancestors(root).map((a) => `(allow file-read-metadata (literal ${JSON.stringify(a)}))`), ''].join('\n'));

// 4. The tap.
const tapDir = path.join(root, 'tap');
fs.mkdirSync(tapDir);
const tap = spawn(process.execPath, [path.join(HERE, '../../own-020/stream-tap.mjs'), String(PORT), tapDir, '--mode', 'retry'], { stdio: ['ignore', 'pipe', 'pipe'] });
tap.stdout.pipe(fs.createWriteStream(path.join(tapDir, 'tap.stdout')));
tap.stderr.pipe(fs.createWriteStream(path.join(tapDir, 'tap.stderr')));
await new Promise((r) => setTimeout(r, 1500));

const brief = fs.readFileSync(briefFile, 'utf8').trim();
const sittings = [];
function sitting(k, prompt, { resume = false, closed = false } = {}) {
  const out = path.join(root, `out-${k}`);
  const args = [...VIBE, '--legacy-harness', '-p', prompt, '--auto-approve', '--trust', '--output-dir', out,
    '--output', closed ? 'text' : 'streaming', '--max-turns', opt('--max-turns', '300'), '--time-limit', opt('--time-limit', '5400'),
    '--max-price', opt('--max-price', '10'), ...(resume ? ['-c'] : []),
    ...(closed ? ['--enabled-tools', 'no_tool_at_all'] : ['--disabled-tools', 'web_fetch', '--disabled-tools', 'web_search'])];
  if (k === 1) fs.writeFileSync(path.join(root, 'command.txt'), `cd ${APP} && sandbox-exec -f ${profile} ${args.map((a) => (a === brief ? '"$(cat brief)"' : JSON.stringify(a))).join(' ')}\n`);
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('sandbox-exec', ['-f', profile, ...args], { cwd: APP, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const so = path.join(root, `sitting-${k}.out`);
    child.stdout.pipe(fs.createWriteStream(so));
    child.stderr.pipe(fs.createWriteStream(path.join(root, `sitting-${k}.stderr`)));
    child.on('exit', (code, signal) => {
      let exp = null;
      try { exp = JSON.parse(fs.readFileSync(path.join(out, 'export.json'), 'utf8')); } catch {}
      resolve({ k, prompt: prompt === brief ? 'brief' : closed ? 'then' : prompt, code, signal, seconds: Math.round((Date.now() - t0) / 1000),
        stop: exp?.stop_reason ?? exp?.outcome ?? null, usage: exp?.usage ?? exp?.token_usage ?? null, vibeCost: exp?.cost_usd ?? exp?.cost ?? null, out: so });
    });
  });
}
const save = () => fs.writeFileSync(path.join(root, 'sittings.json'), JSON.stringify(sittings, null, 2) + '\n');
const planWritten = () => fs.existsSync(path.join(APP, 'PLAN.md'));
for (let k = 1; ; k++) {
  const s = await sitting(k, k === 1 ? brief : 'Continue.', { resume: k > 1 });
  s.planWritten = planWritten();
  sittings.push(s); save();
  console.log(`sitting ${k}: exit ${s.code} ${s.seconds}s plan ${s.planWritten}`);
  if (s.planWritten || k > N) break;
}
const thenFile = opt('--then', null);
if (thenFile && planWritten()) {
  const s = await sitting(sittings.length + 1, fs.readFileSync(path.resolve(thenFile), 'utf8').trim(), { resume: true, closed: true });
  sittings.push(s); save();
  fs.copyFileSync(s.out, path.join(root, 'then.md'));
  console.log(`then: exit ${s.code} ${s.seconds}s`);
}
tap.kill();

// Teardown: every process whose cwd or command line is inside the round (never by name).
const killed = [];
try {
  let pid; const pids = new Set();
  for (const line of execFileSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8' }).split('\n')) {
    if (line[0] === 'p') pid = Number(line.slice(1));
    else if (line[0] === 'n' && (line.slice(1) + '/').startsWith(root + '/')) pids.add(pid);
  }
  // a sibling arm's runner or `claude` names this root in its deny rules: by cwd only (round 3 lost B-claude twice)
  try {
    for (const p of execFileSync('pgrep', ['-f', root], { encoding: 'utf8' }).split('\n')) {
      if (!p) continue;
      let c = ''; try { c = execFileSync('ps', ['-o', 'command=', '-p', p], { encoding: 'utf8' }); } catch { continue; }
      if (!/round-arm\.mjs|--disallowedTools|round-vibe\.mjs/.test(c)) pids.add(Number(p));
    }
  } catch {}
  pids.delete(process.pid);
  for (const p of pids) { try { process.kill(p, 'SIGTERM'); killed.push(p); } catch {} }
} catch {}
fs.writeFileSync(path.join(root, 'arm.json'), JSON.stringify({ setup, sittings: sittings.length, plan: planWritten(), seconds: sittings.reduce((n, s) => n + s.seconds, 0), killed }, null, 2) + '\n');
console.log('done', root);
