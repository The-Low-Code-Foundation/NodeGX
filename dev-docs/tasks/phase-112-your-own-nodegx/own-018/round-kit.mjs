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
//   node round-kit.mjs <root> <tgz-dir> <prompt-file> [--max-price 4] [--max-turns 250] [--thinking high|low]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [root, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!root || !tgzDir || !promptFile) throw new Error('usage: node round-kit.mjs <root> <tgz-dir> <prompt-file> [--max-price N] [--max-turns N] [--thinking high|low]');
if (fs.existsSync(root)) throw new Error(`${root} exists; a round starts from an empty folder`);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const VIBE = 'mistral-vibe==2.26.1';
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const OUT = path.join(root, 'out');
const tgz = (name) => path.resolve(tgzDir, name);
fs.mkdirSync(path.join(HOME, '.vibe'), { recursive: true });
fs.mkdirSync(path.dirname(APPS), { recursive: true });

const envLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('MISTRAL_API_KEY='));
if (!envLine) throw new Error('MISTRAL_API_KEY is not in the repo .env');
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('VIBE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, {
  HOME,
  VIBE_HOME: path.join(HOME, '.vibe'),
  npm_config_cache: path.join(HOME, '.npm'),
  UV_CACHE_DIR: spawnSync('uv', ['cache', 'dir'], { encoding: 'utf8' }).stdout.trim(),
  MISTRAL_API_KEY: envLine.slice('MISTRAL_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
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
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx-0.2.0.tgz')}`, 'create-nodegx', APPS], { cwd: path.dirname(APPS), env, encoding: 'utf8' });
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
fs.writeFileSync(cfgFile, next);
fs.writeFileSync(path.join(root, 'vibe-config.toml'), next);

// 3. vibe --legacy-harness in the folder, trusted for this run, as the closing words say.
const args = [
  '--from', VIBE, 'vibe',
  '--prompt-file', path.resolve(promptFile),
  '--legacy-harness', '--trust',
  // `bash` resolves its own permission per command and ignores a configured "never" (kit smoke 2: it asked, and the
  // ask ended the run), so the shells are not offered at all — as s15's Claude stranger had no shell approved.
  ...['bash', 'git_bash', 'experimental_bash', 'windows_shell', 'web_fetch', 'web_search'].flatMap((t) => ['--disabled-tools', t]),
  '--output', 'streaming',
  '--output-dir', OUT,
  '--max-price', opt('--max-price', '4'),
  '--max-turns', opt('--max-turns', '250'),
  '--workdir', APPS
];
fs.writeFileSync(path.join(root, 'command.txt'), ['uvx', ...args].join(' ') + (thinking ? `\n# thinking = ${thinking}\n` : '\n'));
const log = fs.createWriteStream(path.join(root, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(root, 'agent.stderr'));
const child = spawn('uvx', args, { cwd: APPS, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => { fs.writeFileSync(path.join(root, 'agent.exit'), String(code)); console.log('exit', code); });
