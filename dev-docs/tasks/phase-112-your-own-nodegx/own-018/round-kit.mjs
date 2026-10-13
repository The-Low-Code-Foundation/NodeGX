// OWN-018 round 3+: the person does what the packed create-nodegx tells them, nothing more.
//   npm create nodegx apps   →  writes .mcp.json, CLAUDE.md, AGENTS.md and .vibe/config.toml (Large 4, the server, the
//                               bootstrap tools allowed)
//   cd apps && vibe --legacy-harness, trusting the folder
// The only change to what create-nodegx wrote: the server comes from the tarball, because 0.2.0 isn't on the registry
// (`@nodegx/mcp@0.2.0` → `--package=<tgz> noodl-mcp`), as s15 did for .mcp.json. HOME is empty (no user-level Vibe
// config). NO --auto-approve: Vibe then answers every "ask" with no in `-p` — a path outside the folder, the shell, the
// web — so the lab is sealed by Vibe's own permissions (measured from its source, OWN-018 §8). The sentence never says
// "NodeGX"; the app's key is never shown to the agent (R26).
//
// 🔴 But in `-p` an "ask" answered no is "User cancelled the operation" and ENDS the run (kit smoke, 2026-10-12), so
// one stray read outside the folder would end a build. The lab is therefore sealed by the HARNESS, in the empty
// HOME's user config (the person's project config stays as create-nodegx wrote it): every file tool gets a denylist
// of everything that isn't the lab — each ancestor folder exactly, and every sibling of every ancestor with all it
// holds — and the shells and the web are "never". Vibe checks a denylist before the workspace boundary and answers it
// with a skip ("permanently disabled"), which the run survives. A clean machine has none of this repo's files on it.
//
// s3 (2026-10-13), the s2 lab rules: the root is a real path (/tmp is a symlink on macOS), TMPDIR is inside the empty
// HOME, every flag the kit writes after the server's name is kept (--screenshots-to-files), and the key is the Vibe
// subscription's (MISTRAL_VIBE_API_KEY, made under Code › Vibe CLI) when the repo .env has one, else the pay-as-you-go
// MISTRAL_API_KEY; an exported MISTRAL_API_KEY wins over ~/.vibe/.env (Vibe's docs), so the empty HOME stays empty.
// command.txt records which key was used, never its value. Measured from Vibe 2.26.1's source: the kit's
// max_context_length 1,000,000 puts compaction near the full window, and the legacy harness sends no max_tokens — so
// unlike OpenCode, a long think is not cut at 32k.
//
// OWN-019: `--kit vibe` sets the folder up with the Vibe kit (`create-nodegx --vibe`, what `npm create nodegx-vibe` runs):
// its AGENTS.md, `.vibe/agents/nodegx.toml` as the default agent, and the server started with `--profile vibe`.
//
// OWN-019 s1: `--stall-min N` (default 30 since s2; 12 in s1) stops a round whose session journal has not grown for N minutes — the
// baseline sat 32 min in one answer (the legacy harness sends no max_tokens, so nothing cuts a long think off) while
// the key spent. agent.exit then says "stalled". The tree is found by parent pid, never by name.
//
//   node round-kit.mjs <root> <tgz-dir> <prompt-file> [--max-price 4] [--max-turns 250] [--thinking high|low] [--temperature T] [--key vibe|api] [--kit vibe] [--stall-min 30] [--sittings N --max-total 20]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [rootArg, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!rootArg || !tgzDir || !promptFile) throw new Error('usage: node round-kit.mjs <root> <tgz-dir> <prompt-file> [--max-price N] [--max-turns N] [--thinking high|low]');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const VIBE = 'mistral-vibe==2.26.1';
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const OUT = path.join(root, 'out');
const tgz = (name) => path.resolve(tgzDir, name);
fs.mkdirSync(path.join(HOME, '.vibe'), { recursive: true });
fs.mkdirSync(path.join(HOME, 'tmp'), { recursive: true });
fs.mkdirSync(path.dirname(APPS), { recursive: true });

const dotenv = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n');
const keyFrom = (name) => dotenv.find((l) => l.startsWith(`${name}=`))?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || null;
const keyName = { vibe: 'MISTRAL_VIBE_API_KEY', api: 'MISTRAL_API_KEY' }[opt('--key', keyFrom('MISTRAL_VIBE_API_KEY') ? 'vibe' : 'api')];
if (!keyName || !keyFrom(keyName)) throw new Error(`${keyName || opt('--key')} is not in the repo .env`);
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('VIBE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, {
  HOME,
  VIBE_HOME: path.join(HOME, '.vibe'),
  TMPDIR: path.join(HOME, 'tmp'),
  npm_config_cache: path.join(HOME, '.npm'),
  UV_CACHE_DIR: spawnSync('uv', ['cache', 'dir'], { encoding: 'utf8' }).stdout.trim(),
  MISTRAL_API_KEY: keyFrom(keyName)
});

// 0. The lab's seal (see the header). fnmatch has no negation, so it is built from the ancestors of the lab.
const deny = [];
for (let dir = path.resolve(root); ; dir = path.dirname(dir)) {
  const parent = path.dirname(dir);
  deny.push(dir === root ? null : dir); // an ancestor itself, exactly: no grep over a folder that holds other rounds
  if (parent === dir) break;
  for (const sib of fs.readdirSync(parent)) {
    const full = path.join(parent, sib);
    if (full !== dir) deny.push(full, `${full}/*`);
  }
}
const denylist = deny.filter((d) => d && d !== path.resolve(root));
// OWN-019 s2: the round's OWN root was not sealed — v6 grepped the server's package in home/.npm and v5 wrote to a
// path it invented at the root; each was an "ask", answered no, and the `-p` run ended where a person would have
// declined and gone on. fnmatch has [!…]: everything at the root but work/, everything in work/ but apps/, existing
// or not. Vibe checks its own scratchpad (home/tmp/vibe-scratchpad-…) before the denylist, so that stays writable.
denylist.push(`${root}/[!w]*`, `${root}/work/[!a]*`);
const toml = (v) => JSON.stringify(v);
fs.writeFileSync(
  path.join(HOME, '.vibe', 'config.toml'),
  [
    '# OWN-018 lab seal (harness, not the person): see round-kit.mjs.',
    'enable_update_checks = false',
    'enable_auto_update = false',
    '',
    ...['read_file', 'grep', 'edit', 'write_file'].flatMap((t) => [`[tools.${t}]`, 'permission = "always"', `denylist = [${denylist.map(toml).join(', ')}]`, '']),
    ...['bash', 'git_bash', 'experimental_bash', 'windows_shell', 'web_fetch', 'web_search'].flatMap((t) => [`[tools.${t}]`, 'permission = "never"', ''])
  ].join('\n')
);

// 1. npm create nodegx apps, from the packed tarball.
const kit = opt('--kit', 'core');
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx-0.2.0.tgz')}`, 'create-nodegx', APPS, ...(kit === 'vibe' ? ['--vibe'] : [])], { cwd: path.dirname(APPS), env, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
if (created.status !== 0) throw new Error(`create-nodegx exited ${created.status}; see create.log`);

// 2. The registry name → the tarball, in the config create-nodegx wrote (and nothing else in it).
const cfgFile = path.join(APPS, '.vibe', 'config.toml');
const cfg = fs.readFileSync(cfgFile, 'utf8');
const pinned = '"@nodegx/mcp@0.2.0"';
if (!cfg.includes(pinned)) throw new Error('create-nodegx wrote no @nodegx/mcp@0.2.0 server into .vibe/config.toml');
let next = cfg.replace(pinned, `"--package=${tgz('nodegx-mcp-0.2.0.tgz')}", "noodl-mcp"`);
const thinking = opt('--thinking', null);
if (thinking) next = next.replace(/^thinking = "[a-z]+"$/m, `thinking = "${thinking}"`); // a control arm, recorded in command.txt
const temperature = opt('--temperature', null); // OWN-019 s2: a control arm, as --thinking
if (temperature) next = next.replace(/^temperature = [\d.]+$/m, `temperature = ${temperature}`);
fs.writeFileSync(cfgFile, next);
fs.writeFileSync(path.join(root, 'vibe-config.toml'), next);

// 3. vibe --legacy-harness in the folder, trusted for this run, as the closing words say.
// OWN-019 s3 (R31): `--sittings N` runs the build as the Vibe kit's process — sitting 1 is the person's paragraph, every
// later sitting a FRESH `vibe -p` in the same folder with the same fixed words (own-019/continue.txt, "Continue."),
// never chosen from the agent's output. It stops when the app's docs/NEXT.md starts `# Done`, at N sittings, when a
// sitting stalls, when two sittings in a row leave NEXT.md unchanged, or at `--max-total` dollars (Vibe's list count,
// summed). Sitting k writes agent<k>.jsonl, out<k>/ and agent<k>.exit (sitting 1 untagged, as peek.mjs --tag reads);
// sittings.json holds each one's measures. Without --sittings a round is one session, as before.
const CONTINUE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../own-019/continue.txt');
const sittings = Number(opt('--sittings', 1));
const maxTotal = Number(opt('--max-total', 20));
const argsFor = (prompt, out) => [
  '--from', VIBE, 'vibe',
  '--prompt-file', prompt,
  '--legacy-harness', '--trust',
  // `bash` resolves its own permission per command and ignores a configured "never" (kit smoke 2: it asked, and the
  // ask ended the run), so the shells are not offered at all — as s15's Claude stranger had no shell approved.
  ...['bash', 'git_bash', 'experimental_bash', 'windows_shell', 'web_fetch', 'web_search'].flatMap((t) => ['--disabled-tools', t]),
  '--output', 'streaming',
  '--output-dir', out,
  '--max-price', opt('--max-price', '4'),
  '--max-turns', opt('--max-turns', '250'),
  '--workdir', APPS
];
fs.writeFileSync(path.join(root, 'command.txt'), ['uvx', ...argsFor(path.resolve(promptFile), OUT)].join(' ') + `\n# key: ${keyName}; kit: ${kit}${thinking ? `; thinking = ${thinking}` : ''}${temperature ? `; temperature = ${temperature}` : ''}${sittings > 1 ? `; sittings ≤ ${sittings}, later prompts ${CONTINUE}, max-total $${maxTotal}` : ''}\n`);

// OWN-019 s2: 12 was shorter than Large 4's own productive thinks. Vibe writes a think to the journal only when it
// ends; the long design thinks of rounds that finished took up to 10.1 min (9–17 KB/min), and v4/v8 were stopped at
// 11.8/12.4 min still writing at that speed, no more repetitive than the ones that finished. 30 is three times the
// longest productive think measured.
const stallMs = Number(opt('--stall-min', 30)) * 60000;
const journalSize = () => {
  const dir = path.join(HOME, '.vibe', 'logs', 'session');
  let size = 0;
  try {
    for (const s of fs.readdirSync(dir)) {
      const f = path.join(dir, s, 'messages.jsonl');
      if (fs.existsSync(f)) size += fs.statSync(f).size;
    }
  } catch {}
  return size;
};

function runSitting(prompt, tag) {
  const out = path.join(root, `out${tag}`);
  const log = fs.createWriteStream(path.join(root, `agent${tag}.jsonl`));
  const err = fs.createWriteStream(path.join(root, `agent${tag}.stderr`));
  const child = spawn('uvx', argsFor(prompt, out), { cwd: APPS, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(err);
  const t0 = Date.now();
  let stalled = null;
  let lastSize = journalSize();
  let lastGrowth = Date.now();
  const watchdog = setInterval(() => {
    const size = journalSize();
    if (size !== lastSize) {
      lastSize = size;
      lastGrowth = Date.now();
      return;
    }
    if (Date.now() - lastGrowth < stallMs || stalled) return;
    stalled = Math.round((Date.now() - lastGrowth) / 60000);
    const tree = (pid) => [pid, ...(spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).flatMap((c) => tree(Number(c)))];
    for (const pid of tree(child.pid).reverse()) try { process.kill(pid, 'SIGTERM'); } catch {}
  }, 30000);
  return new Promise((resolve) => child.on('close', (code) => {
    clearInterval(watchdog);
    const how = stalled ? `stalled (no journal growth for ${stalled} min)` : String(code);
    const seconds = Math.round((Date.now() - t0) / 1000);
    fs.writeFileSync(path.join(root, `agent${tag}.exit`), `${how} ${seconds}s`);
    resolve({ how, stalled: Boolean(stalled), seconds, ...measure(out) });
  }));
}

/** One sitting's measures from Vibe's own export and journal: list $, tokens, calls, input per call, longest think. */
function measure(out) {
  const m = {};
  try {
    const d = JSON.parse(fs.readFileSync(path.join(out, 'export.json'), 'utf8'));
    const u = d.usage;
    Object.assign(m, { outcome: d.outcome, stop: d.stop_reason, vibeUsd: d.cost_usd, usage: u,
      estimatedUsd: Number((((u.input_tokens - (u.cached_input_tokens || 0)) * 0.68 + (u.cached_input_tokens || 0) * 0.07 + u.output_tokens * 2.09) / 1e6).toFixed(3)) });
  } catch {}
  try {
    const msgs = fs.readFileSync(path.join(out, 'session', 'messages.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const calls = msgs.filter((x) => x.role === 'assistant');
    m.calls = calls.length;
    m.toolCalls = calls.reduce((n, x) => n + (x.tool_calls?.length || 0), 0);
    m.longestThinkChars = Math.max(0, ...calls.map((x) => (x.reasoning_content || '').length));
    if (m.usage && calls.length) m.inputPerCall = Math.round(m.usage.input_tokens / calls.length);
  } catch {}
  return m;
}

/** The first line of the app's docs/NEXT.md (the Vibe kit's process note), or null before sitting 1 writes it. */
function nextLine() {
  const find = (dir, depth) => {
    if (depth < 0) return null;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    const here = path.join(dir, 'docs', 'NEXT.md');
    if (fs.existsSync(here)) return here;
    for (const e of entries) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
      const f = find(path.join(dir, e.name), depth - 1);
      if (f) return f;
    }
    return null;
  };
  const f = find(APPS, 2);
  return f ? { file: path.relative(APPS, f), text: fs.readFileSync(f, 'utf8'), first: fs.readFileSync(f, 'utf8').split('\n')[0].trim() } : null;
}

const record = [];
let unchanged = 0;
for (let k = 1; k <= sittings; k++) {
  const before = nextLine();
  const r = await runSitting(k === 1 ? path.resolve(promptFile) : CONTINUE, k === 1 ? '' : String(k));
  const after = nextLine();
  record.push({ sitting: k, ...r, next: after?.first ?? null, nextFile: after?.file ?? null });
  fs.writeFileSync(path.join(root, 'sittings.json'), JSON.stringify(record, null, 2));
  console.log(`sitting ${k}: exit ${r.how} ${r.seconds}s $${r.vibeUsd ?? '?'} — ${after?.first ?? '(no NEXT.md)'}`);
  if (sittings === 1) break;
  if (r.stalled) { console.log('stop: stalled'); break; }
  if (after && /^#\s*Done\b/i.test(after.first)) { console.log('stop: done'); break; }
  unchanged = before && after && before.text === after.text ? unchanged + 1 : 0;
  if (unchanged >= 2) { console.log('stop: NEXT.md unchanged for two sittings'); break; }
  const total = record.reduce((n, x) => n + (x.vibeUsd || 0), 0);
  if (total >= maxTotal) { console.log(`stop: $${total.toFixed(2)} ≥ --max-total ${maxTotal}`); break; }
}
const sum = (f) => record.reduce((n, x) => n + (f(x) || 0), 0);
console.log('exit', record.at(-1).how, `| ${record.length} sitting(s), ${Math.round(sum((x) => x.seconds) / 60)} min, $${sum((x) => x.vibeUsd).toFixed(2)} list, ~$${sum((x) => x.estimatedUsd).toFixed(2)} cached`);
