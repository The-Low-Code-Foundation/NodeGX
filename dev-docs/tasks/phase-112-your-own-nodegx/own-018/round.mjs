// OWN-018 stranger round on Mistral: a fresh Mistral Vibe (`vibe -p`, model pinned to mistral-large-4) in the folder
// the PACKED create-nodegx made (its CLAUDE.md/AGENTS.md included), the MCP registered the way @nodegx/mcp's README
// tells "any other MCP client" (the tarball standing in for the registry name), HOME empty. The sentence never says
// "NodeGX". The agent is never given the app's key: the person pastes it into the project's .env afterwards (R26).
//
//   node round.mjs <root> <tgz-dir> <prompt-file> [--max-price 4] [--max-turns 200]
//   node round.mjs <root> <tgz-dir> <prompt-file> --continue <project-folder-name> [--tag 2] [...]
//
// <root> must not exist. It gets home/ (HOME and VIBE_HOME), work/apps/ (the folder the person made), out/ (Vibe's
// export.json + session journal), agent.jsonl (the streaming output), agent.stderr, agent.exit.
//
// --continue is the person's repair for P112-OWN018-LISTCHANGED (Vibe never re-reads the tool list, so after
// create_project the agent still has the six bootstrap tools): they do what the server's two sentences say — register
// the server with the project folder AND --all-tools — and resume the same Vibe session (`vibe -c`) in an existing
// <root>. Its files carry the tag: out<tag>/, agent<tag>.jsonl, agent<tag>.stderr, agent<tag>.exit.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [root, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!root || !tgzDir || !promptFile) throw new Error('usage: node round.mjs <root> <tgz-dir> <prompt-file> [--max-price N] [--max-turns N]');
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const project = opt('--continue', null);
const tag = project ? opt('--tag', '2') : '';
if (!project && fs.existsSync(root)) throw new Error(`${root} exists; a round starts from an empty folder`);
if (project && !fs.existsSync(path.join(root, 'work', 'apps', project))) throw new Error(`no ${project} in ${root}/work/apps`);

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const VIBE = 'mistral-vibe==2.26.1';
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const OUT = path.join(root, `out${tag}`);
const tgz = (name) => path.resolve(tgzDir, name);
fs.mkdirSync(path.join(HOME, '.vibe'), { recursive: true });
fs.mkdirSync(path.dirname(APPS), { recursive: true });

// The Mistral key is the harness's credential (Vibe reads MISTRAL_API_KEY), read from the repo's .env. Every other
// key, token or NodeGX setting in this shell is left out, as s15 did.
const envLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('MISTRAL_API_KEY='));
if (!envLine) throw new Error('MISTRAL_API_KEY is not in the repo .env');
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('VIBE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, {
  HOME,
  VIBE_HOME: path.join(HOME, '.vibe'),
  npm_config_cache: path.join(HOME, '.npm'),
  UV_CACHE_DIR: spawnSync('uv', ['cache', 'dir'], { encoding: 'utf8' }).stdout.trim(), // the harness's own download
  MISTRAL_API_KEY: envLine.slice('MISTRAL_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
});

// 1. The person: `npm create nodegx apps`, from the packed tarball.
if (!project) {
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx-0.2.0.tgz')}`, 'create-nodegx', APPS], { cwd: path.dirname(APPS), env, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
if (created.status !== 0) throw new Error(`create-nodegx exited ${created.status}; see create.log`);
}
const serverArgs = ['-y', `--package=${tgz('nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', ...(project ? [path.join(APPS, project)] : []), '--allow-writes', ...(project ? ['--all-tools'] : [])];

// 2. The person adds Mistral Large 4 to Vibe (2.26.1 ships no entry for it) by copying the one Mistral model entry
//    Vibe does ship (Mistral Medium 3.5: temperature 1.0, thinking high) and changing the name and prices, then
//    registers the NodeGX server as @nodegx/mcp's README says any other MCP client should.
fs.writeFileSync(path.join(HOME, '.vibe', 'config.toml'), `active_model = "mistral-large-4"
enable_update_checks = false
enable_auto_update = false

[[models]]
name = "mistral-large-4"
provider = "mistral"
alias = "mistral-large-4"
display_name = "Mistral Large 4"
temperature = 1.0
input_price = 0.68
output_price = 2.09
cached_input_price = 0.07
thinking = "high"
thinking_levels = ["off", "high"]
supports_images = true
max_context_length = 1000000

[[mcp_servers]]
name = "nodegx"
transport = "stdio"
command = "npx"
args = ${JSON.stringify(serverArgs)}
startup_timeout_sec = 240
tool_timeout_sec = 600
`);

// 3. The agent. --auto-approve stands in for a person approving every edit and MCP call; the shell tools are
//    disabled so this round has what s15's Claude stranger had (no Bash or web search approved), and so the agent's
//    shell cannot read the harness key from its environment. Vibe's names are `file_system.bash`, `process.*`,
//    `web_search`: a plain `bash*` matches none of them (the s18 smoke round ran jq with it set).
const args = [
  '--from', VIBE, 'vibe',
  '--prompt-file', path.resolve(promptFile),
  '--auto-approve', '--trust',
  '--disabled-tools', 're:.*(bash|powershell|process).*',
  '--disabled-tools', 're:.*web_search.*',
  '--output', 'streaming',
  '--output-dir', OUT,
  '--max-price', opt('--max-price', '4'),
  '--max-turns', opt('--max-turns', '200'),
  '--workdir', APPS,
  // --legacy-harness: Vibe's tool-calling loop without the code sandbox. The default (code-mode) harness hands the
  // model only "The MCP tool returned an error" for any MCP error result, so the server's diagnostics never arrive
  // (P112-OWN018-OPAQUEERRORS).
  ...(rest.includes('--legacy') ? ['--legacy-harness'] : []),
  ...(project ? ['--continue'] : [])
];
fs.writeFileSync(path.join(root, `command${tag}.txt`), ['uvx', ...args].join(' ') + '\n');
const log = fs.createWriteStream(path.join(root, `agent${tag}.jsonl`));
const err = fs.createWriteStream(path.join(root, `agent${tag}.stderr`));
const child = spawn('uvx', args, { cwd: APPS, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => { fs.writeFileSync(path.join(root, `agent${tag}.exit`), String(code)); console.log('exit', code); });
