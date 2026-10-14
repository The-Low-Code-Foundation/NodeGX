// OWN-018 §13 run 0, the yardstick: Claude Sonnet in Claude Code on the same brief, kit and lab rules as the OpenCode
// arm (round-opencode.mjs). The person does what the packed create-nodegx tells them: `cd apps && claude`, accept the
// "nodegx" server, say the sentence. Headless that is `claude -p` with apps/.mcp.json as the only MCP config.
//
// What differs from the person, and why:
// - The server comes from the tarball (0.2.0 isn't on the registry): `@nodegx/mcp@0.2.0` → `--package=<tgz> noodl-mcp`,
//   in a copy of apps/.mcp.json kept in the round's root, with the server's HOME empty (env in that config).
// - Claude Code itself keeps Richard's HOME, because its login lives there (subscription; report API-equivalent $, not
//   cost). What it would read from that HOME is shut off: --setting-sources project,local (no user settings, user
//   CLAUDE.md or user skills), --strict-mcp-config (no other MCP server, no claude.ai connector).
// - The seal, as OpenCode's: the shell and web tools are denied; reads outside the lab are denied where a rule can
//   name them (Richard's files, /Applications, s1's scratchpad). Claude Code's Read is not confined to the folder by
//   default, so the transcript is audited afterwards (peek-claude.mjs prints every path a file tool touched).
//
//   node round-claude.mjs <root> <tgz-dir> <prompt-file> [--model sonnet]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [rootArg, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!rootArg || !tgzDir || !promptFile) throw new Error('usage: node round-claude.mjs <root> <tgz-dir> <prompt-file> [--model sonnet]');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };

fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg);
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const tgz = (name) => path.resolve(tgzDir, name);
for (const d of [path.join(HOME, 'tmp'), path.dirname(APPS)]) fs.mkdirSync(d, { recursive: true });

const labEnv = { ...process.env };
for (const k of Object.keys(labEnv)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete labEnv[k];
const serverEnv = { HOME, TMPDIR: path.join(HOME, 'tmp'), npm_config_cache: path.join(HOME, '.npm') };

// 1. npm create nodegx apps, from the packed tarball, HOME empty.
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx-0.2.0.tgz')}`, 'create-nodegx', APPS], { cwd: path.dirname(APPS), env: { ...labEnv, ...serverEnv }, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
if (created.status !== 0) throw new Error(`create-nodegx exited ${created.status}; see create.log`);

// OWN-019 s4 (Richard's bonus: a second run on the quiz app — "your own editor"): `--seed <app-dir>` puts an app that
// already exists into the folder after create-nodegx, as a person's earlier session would have left it (its docs/
// included). Copied without its previews, grades or caches; the round's command.txt names the seed.
const seedArg = opt('--seed', null);
if (seedArg) {
  const seed = path.resolve(seedArg);
  if (!fs.existsSync(path.join(seed, 'nodegx.project.json'))) throw new Error(`--seed ${seed} holds no nodegx.project.json`);
  fs.cpSync(seed, path.join(APPS, path.basename(seed)), { recursive: true, filter: (s) => !/[\\/](\.previews|grade|node_modules[\\/]\.cache)([\\/]|$)/.test(s) });
}
if (!/Claude Code: cd apps && claude\) and accept the "nodegx" server/.test(created.stdout)) throw new Error('create-nodegx no longer prints the Claude Code line this round follows; see create.log');

// 2. The server the person accepts, with the registry name → the tarball and an empty HOME.
const mcp = JSON.parse(fs.readFileSync(path.join(APPS, '.mcp.json'), 'utf8'));
const server = mcp.mcpServers.nodegx;
if (JSON.stringify(server.args) !== JSON.stringify(['-y', '@nodegx/mcp@0.2.0', '--allow-writes'])) throw new Error(`apps/.mcp.json changed: ${JSON.stringify(server)}`);
server.args = ['-y', `--package=${tgz('nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', '--allow-writes'];
server.env = serverEnv;
const mcpFile = path.join(root, 'mcp.json');
fs.writeFileSync(mcpFile, JSON.stringify(mcp, null, 2) + '\n');

// 3. claude -p in the folder.
const S1 = '/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/5e5b1033-c010-4d89-a2c9-c706d7a16071';
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const args = [
  '-p', prompt,
  '--model', opt('--model', 'sonnet'),
  '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--mcp-config', mcpFile,
  '--setting-sources', 'project,local',
  '--allowedTools', 'mcp__nodegx', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch', 'Read(//Users/**)', 'Read(//Applications/**)', `Read(/${S1}/**)`,
  '--max-budget-usd', '10',
  '--no-session-persistence'
];
fs.writeFileSync(path.join(root, 'command.txt'), `cd ${APPS} && claude ${args.map((a) => (a === prompt ? '"$(cat ' + path.resolve(promptFile) + ')"' : JSON.stringify(a))).join(' ')}\n`);
const log = fs.createWriteStream(path.join(root, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(root, 'agent.stderr'));
const t0 = Date.now();
const child = spawn('claude', args, { cwd: APPS, env: { ...labEnv, PWD: APPS }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => { fs.writeFileSync(path.join(root, 'agent.exit'), `${code} ${Math.round((Date.now() - t0) / 1000)}s`); console.log('exit', code); });
