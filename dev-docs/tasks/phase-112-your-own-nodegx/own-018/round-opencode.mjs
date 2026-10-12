// OWN-018, the OpenCode arm: the person does what the packed create-nodegx tells them, nothing more.
//   npm create nodegx apps   →  writes .mcp.json, CLAUDE.md, AGENTS.md and .vibe/config.toml (none of them read by
//                               OpenCode except AGENTS.md: its first project-level match wins, so CLAUDE.md is not stacked)
//   "Another AI coder: give it the server "npx -y @nodegx/mcp@0.2.0 --allow-writes" (stdio)."  →  the person writes
//   apps/opencode.json the way OpenCode's docs (config, mcp-servers) show it: the model, the server, nothing else.
//   cd apps && opencode run "<the sentence>"
// The only change to what the person writes: the server comes from the tarball, because 0.2.0 isn't on the registry
// (`@nodegx/mcp@0.2.0` → `--package=<tgz> noodl-mcp`), as round-kit.mjs does for Vibe. HOME is empty, and XDG_* and
// TMPDIR point inside it, so no OpenCode, Claude or npm config of the real user is read. The sentence never says
// "NodeGX"; the app's key is never shown to the agent (R26).
//
// The lab is sealed by the HARNESS, in the empty HOME's global config ($XDG_CONFIG_HOME/opencode/opencode.json; the
// person's project config stays as they wrote it). Measured from OpenCode 1.19.0's source (tag v1.19.0):
// - `opencode run` answers every "ask" with "reject" (cli/cmd/run.ts), and a rejection ENDS the run
//   (session/processor.ts: PermissionV1.RejectedError sets ctx.blocked) unless experimental.continue_loop_on_deny.
//   A configured "deny" is a different error (PermissionV1.DeniedError): the tool call fails with "The user has
//   specified a rule which prevents you…" and the loop goes on. So the seal is "deny", never "ask".
// - external_directory: OpenCode's default is "ask" (agent/agent.ts) for any path outside the folder it runs in (a
//   folder that isn't a git repo has worktree "/", which containsPath deliberately ignores). read, glob, grep, list,
//   edit, write, apply_patch and lsp all go through it. "deny" here refuses them all outside work/apps.
// - bash, webfetch, websearch: a "*" deny removes the tool from the model's list altogether (Permission.disabled), as
//   round-kit.mjs's --disabled-tools does for Vibe. Subagents (task) inherit every deny (agent/subagent-permissions.ts).
// - The asks that remain in OpenCode's defaults (read of a `*.env` file inside the folder, doom_loop) would end the
//   run; experimental.continue_loop_on_deny turns those rejections into a tool error the model reads, which is what
//   Vibe's harness gets from its denylist (a skip the run survives).
// - autoupdate off: npx pins the version, and nothing should download over it mid-round.
// Measured 2026-10-12, at no API cost, against a scripted OpenAI-compatible mock in this same layout: a configured
// "deny" (read outside the folder) → tool error, the run goes on; OpenCode's default "ask" for the same read →
// "permission requested … auto-rejecting", the run ENDS there and still exits 0; "ask" (a `.env` read) with
// continue_loop_on_deny → tool error "The user rejected permission…", the run goes on. bash/webfetch/websearch absent
// from the model's tool list. AGENTS.md reached the system prompt and CLAUDE.md did not; so did the server's
// instructions. Then the Mistral smoke (oc-smoke1, smoke-kit.txt, $0.103): canary 0, no fetch tool anywhere (a `task`
// subagent was tried for both and was refused the same way), Notes created, get_project_info answered via call_tool.
// 🔴 After create_project the NEXT step still offers only the 7 bootstrap tools; OpenCode handles tools/list_changed but
// the refreshed list (25 nodegx tools) arrives a step later (mock), so a direct get_project_info right away is
// "unavailable tool" — AGENTS.md's call_tool line is what carries that step.
//
//   node round-opencode.mjs <root> <tgz-dir> <prompt-file> [--max-steps N] [--variant none|high]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [rootArg, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!rootArg || !tgzDir || !promptFile) throw new Error('usage: node round-opencode.mjs <root> <tgz-dir> <prompt-file> [--max-steps N] [--variant none|high]');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const OPENCODE = 'opencode-ai@1.19.0'; // npm latest on 2026-10-12; source read at github.com/anomalyco/opencode tag v1.19.0
const MODEL = 'mistral/mistral-large-4';
fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg); // /tmp is a symlink on macOS; OpenCode compares real paths
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const XDG = {
  XDG_CONFIG_HOME: path.join(HOME, '.config'),
  XDG_DATA_HOME: path.join(HOME, '.local', 'share'),
  XDG_CACHE_HOME: path.join(HOME, '.cache'),
  XDG_STATE_HOME: path.join(HOME, '.local', 'state')
};
const tgz = (name) => path.resolve(tgzDir, name);
for (const d of [...Object.values(XDG), path.join(HOME, 'tmp'), path.join(XDG.XDG_CONFIG_HOME, 'opencode'), path.dirname(APPS)]) fs.mkdirSync(d, { recursive: true });

const envLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('MISTRAL_API_KEY='));
if (!envLine) throw new Error('MISTRAL_API_KEY is not in the repo .env');
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('OPENCODE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, {
  HOME,
  ...XDG,
  TMPDIR: path.join(HOME, 'tmp'), // OpenCode allow-lists $TMPDIR/opencode/* for external_directory; keep it in the lab
  npm_config_cache: path.join(HOME, '.npm'),
  MISTRAL_API_KEY: envLine.slice('MISTRAL_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
});

// 0. The lab's seal (see the header): harness config, in the HOME the person never sees.
const seal = {
  $schema: 'https://opencode.ai/config.json',
  autoupdate: false,
  permission: { external_directory: 'deny', bash: 'deny', webfetch: 'deny', websearch: 'deny' },
  experimental: { continue_loop_on_deny: true },
  ...(opt('--max-steps', null) ? { agent: { build: { steps: Number(opt('--max-steps')) } } } : {})
};
const sealFile = path.join(XDG.XDG_CONFIG_HOME, 'opencode', 'opencode.json');
fs.writeFileSync(sealFile, JSON.stringify(seal, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'opencode-seal.json'), JSON.stringify(seal, null, 2) + '\n');

// 1. npm create nodegx apps, from the packed tarball.
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx-0.2.0.tgz')}`, 'create-nodegx', APPS], { cwd: path.dirname(APPS), env, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
if (created.status !== 0) throw new Error(`create-nodegx exited ${created.status}; see create.log`);
if (!/Another AI coder: give it the server "npx -y @nodegx\/mcp@0\.2\.0 --allow-writes" \(stdio\)\./.test(created.stdout)) throw new Error('create-nodegx no longer prints the "Another AI coder" line this round follows; see create.log');

// 2. What the person writes from that line and OpenCode's docs — with the registry name → the tarball.
const person = {
  $schema: 'https://opencode.ai/config.json',
  model: MODEL,
  mcp: { nodegx: { type: 'local', command: ['npx', '-y', '@nodegx/mcp@0.2.0', '--allow-writes'], enabled: true } }
};
const project = structuredClone(person);
project.mcp.nodegx.command = ['npx', '-y', `--package=${tgz('nodegx-mcp-0.2.0.tgz')}`, 'noodl-mcp', '--allow-writes'];
fs.writeFileSync(path.join(APPS, 'opencode.json'), JSON.stringify(project, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'opencode-config.json'), JSON.stringify(project, null, 2) + '\n');

// 3. opencode run in the folder, headless. The model is the project config's; --variant only for a control arm.
const variant = opt('--variant', null);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const args = ['-y', OPENCODE, 'run', '--format', 'json', ...(variant ? ['--variant', variant] : []), prompt];
fs.writeFileSync(
  path.join(root, 'command.txt'),
  `cd ${APPS} && npx ${args.slice(0, -1).join(' ')} "$(cat ${path.resolve(promptFile)})"\n` +
    `# HOME=${HOME} (XDG_* and TMPDIR inside it); seal ${sealFile}\n` +
    `# the person's opencode.json names the server as: ${person.mcp.nodegx.command.join(' ')}\n`
);
const log = fs.createWriteStream(path.join(root, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(root, 'agent.stderr'));
// `opencode run` takes its folder from $PWD before process.cwd() (cli/cmd/run.ts); an inherited PWD would run the
// round in the folder this script was started from (mock probe, 2026-10-12: directory= the caller's folder).
const child = spawn('npx', args, { cwd: APPS, env: { ...env, PWD: APPS }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => { fs.writeFileSync(path.join(root, 'agent.exit'), String(code)); console.log('exit', code); });
