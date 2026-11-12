// OWN-038 AC3–AC6 in Claude Code: one scripted person per arm, each a stranger Claude Code in a folder made by
// `npx create-nodegx@0.2.10` FROM THE REGISTRY, under a HOME of its own.
//
// Why a HOME of its own (not OWN-036's arm.mjs, which ran in Richard's): the practice round saves the person's sheet
// to ~/.claude/skills/, so in his HOME it would land in his real skills and every later session of his would load it.
// Here ~ is <arm>/home: the sheet lands there, and AC5's "a fresh session in a different folder lists it" is a probe
// with that same HOME from <arm>/home/elsewhere. Richard's ~/.claude/CLAUDE.md, memory and user skills never load.
// Auth is ANTHROPIC_API_KEY from the repo .env (passed in the environment, never written).
//
//   node own-038/arm.mjs make  <arm>                         the folder, the kit, a git repo
//   node own-038/arm.mjs turn  <arm> <n> <message-file> [--continue]   → out/<arm>-<n>.json
//   node own-038/arm.mjs probe <arm> [--from my-apps|elsewhere]         Haiku lists the skills it sees
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const LAB = '/Users/Shared/nodegx-lab/own038';
// OWN038_KIT: a packed tarball of this checkout's kit, to re-measure a fix before it is on npm (the arm records it)
const KIT = process.env.OWN038_KIT ?? 'create-nodegx@0.2.10';
const [cmd, arm, ...rest] = process.argv.slice(2);
if (!['make', 'turn', 'probe'].includes(cmd) || !/^cc-[a-z0-9-]+$/.test(arm ?? '')) {
  throw new Error('usage: node own-038/arm.mjs make|turn|probe cc-<name> ...');
}
const root = path.join(LAB, arm);
const HOME = path.join(root, 'home');
const dir = path.join(root, 'my-apps');
const env = {
  PATH: process.env.PATH,
  HOME,
  TMPDIR: path.join(HOME, 'tmp'),
  USER: 'person',
  LANG: 'en_GB.UTF-8',
  npm_config_cache: '/Users/Shared/nodegx-lab/cache/npm', // packages only: disk, not knowledge
  ...auth()
};

// The API key ran dry mid-run (2026-11-04); Richard chose his subscription: a `claude setup-token` token he saved to
// ~/.nodegx/claude-oauth-token. When that file exists it is used and the API key is left out (it would win).
function auth() {
  const tokenFile = path.join(os.homedir(), '.nodegx/claude-oauth-token');
  if (fs.existsSync(tokenFile)) return { CLAUDE_CODE_OAUTH_TOKEN: fs.readFileSync(tokenFile, 'utf8').trim() };
  return { ANTHROPIC_API_KEY: readKey('ANTHROPIC_API_KEY') };
}

if (cmd === 'make') {
  if (fs.existsSync(root)) throw new Error(`${root} exists; an arm is made once`);
  for (const d of [path.join(HOME, 'tmp'), path.join(HOME, 'elsewhere')]) fs.mkdirSync(d, { recursive: true });
  const run = spawnSync('npx', KIT.endsWith('.tgz') ? ['-y', `--package=${KIT}`, 'create-nodegx', 'my-apps'] : ['-y', KIT, 'my-apps'], { cwd: root, env, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`${arm}: ${run.stderr}`);
  fs.writeFileSync(path.join(root, 'kit.txt'), KIT + '\n');
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['-c', 'user.name=lab', '-c', 'user.email=lab@localhost', 'commit', '-qm', 'npm create nodegx'], { cwd: dir });
  console.log(`${arm}: ${dir}; skills ${fs.readdirSync(path.join(dir, '.claude/skills')).sort().join(' ')}`);
  process.exit(0);
}

const mcp = path.join(dir, '.mcp.json');
if (!fs.existsSync(mcp)) throw new Error(`${dir} has no .mcp.json: make the arm first`);
// The file tools are refused in Richard's home and every other arm; Bash is not fenced (read the transcript).
const real = os.homedir();
const fenced = [real, ...fs.readdirSync(LAB).map((n) => path.join(LAB, n)).filter((p) => p !== root)];
const deny = fenced.flatMap((p) => [`Read(/${p}/**)`, `Edit(/${p}/**)`]);
const settings = path.join(root, '.settings.json');
fs.writeFileSync(settings, JSON.stringify({ permissions: { deny } }, null, 1));
const sealed = ['--strict-mcp-config', '--mcp-config', mcp, '--settings', settings];
const exts = path.join(real, '.vscode/extensions');
const bin = process.env.CLAUDE_BIN ?? fs.readdirSync(exts).filter((n) => /^anthropic\.claude-code-/.test(n))
  .map((n) => path.join(exts, n, 'resources/native-binary/claude')).filter((p) => fs.existsSync(p))
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];

if (cmd === 'probe') {
  const from = rest.includes('--from') ? rest[rest.indexOf('--from') + 1] : 'elsewhere';
  const cwd = from === 'my-apps' ? dir : path.join(HOME, 'elsewhere');
  const ask = 'Reply with exactly two lines and nothing else. Line 1: the names of every skill you can load, ' +
    'comma-separated. Line 2: the names of the MCP servers you have tools from. Do not call any tool.';
  const args = ['-p', ask, '--model', 'haiku', '--no-session-persistence', '--output-format', 'json',
    ...(from === 'my-apps' ? sealed : ['--strict-mcp-config'])];
  const r = spawnSync(bin, args, { cwd, env, encoding: 'utf8' });
  const out = JSON.parse(r.stdout || '{}');
  console.log(`probe ${arm} from ${from} (${cwd}): exit ${r.status}, $${out.total_cost_usd ?? '?'}\n${out.result ?? r.stderr}`);
  process.exit(r.status ?? 1);
}

// turn
const [n, msgFile] = rest;
const msg = fs.readFileSync(msgFile, 'utf8');
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
const args = ['-p', msg, '--model', 'claude-opus-5-5', '--output-format', 'json', '--permission-mode', 'auto',
  ...sealed, ...(rest.includes('--continue') ? ['--continue'] : [])];
const r = spawnSync('nice', ['-n', '10', bin, ...args], { cwd: dir, env, encoding: 'utf8', maxBuffer: 1 << 28 });
fs.writeFileSync(path.join(here, 'out', `${arm}-${n}.json`), r.stdout);
fs.writeFileSync(path.join(here, 'out', `${arm}-${n}.err`), r.stderr);
let out = {};
try { out = JSON.parse(r.stdout); } catch { /* the .err says why */ }
fs.appendFileSync(path.join(here, 'turns.log'),
  `${new Date().toISOString()} ${arm} ${n} ${path.basename(msgFile)} exit ${r.status} $${out.total_cost_usd ?? '?'} ${out.num_turns ?? '?'} steps\n`);
console.log(`${arm} turn ${n}: exit ${r.status}, $${out.total_cost_usd ?? '?'}, ${out.num_turns ?? '?'} steps\n---\n${out.result ?? r.stderr.slice(-2000)}`);
process.exit(r.status ?? 1);

function readKey(name) {
  const line = fs.readFileSync(path.join(repo, '.env'), 'utf8').split('\n').find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is not in the repo .env`);
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
}
