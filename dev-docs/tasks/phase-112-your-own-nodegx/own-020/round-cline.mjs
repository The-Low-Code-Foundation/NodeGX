// OWN-020, the Cline arm: the person does what the packed create-nodegx tells them, then runs Cline CLI in the folder.
//   npm create nodegx apps   →  AGENTS.md (Cline reads it at the folder root; CLAUDE.md it does not), .mcp.json, …
//   the person adds the nodegx server to Cline (`cline mcp add`, which writes Cline's ONE MCP file — there is no
//   project-level MCP file in 3.0.71) and picks ClinePass; then `cd apps && cline "<the sentence>"`.
// The only change to what the person does: the server comes from the tarball (`--package=<tgz> noodl-mcp`), as the
// Vibe and OpenCode runners do. HOME is empty (CLINE_DIR and the data dir inside it), so Richard's own ~/.cline (his
// models, his MCP servers) is never read. The sentence never says "NodeGX"; the app's key is never shown to the agent.
//
// Measured from cline@3.0.71's source (OWN-020 s1, scratchpad cline-source-findings.md):
// - Headless (`--json`) runs act mode with every enabled tool approved, and `read_files` takes absolute paths with no
//   workspace limit. So the seal is the HARNESS's, in the empty HOME: `disabledTools` in global-settings.json removes
//   the shell, the web, sub-agents, teams and ask_question (which, with no TTY, answers itself with its first option);
//   `tools.web_search.enabled = false` is the only switch for web search; and the seal plugin (seal-plugin) skips any
//   file tool call outside the round's folders with a reason the model reads, and the run goes on.
// - The MCP client never handles tools/list_changed: the tools are listed once, at the start, as `nodegx__<tool>`.
//   The bootstrap server's call_tool carries everything after create_project/open_project (as in Vibe).
// - An MCP result reaches the model as JSON text (isError and its text kept; an image only as base64 text), cut in the
//   middle past 8,000 characters (CLINE_MESSAGE_BUILDER_MAX_TOOL_RESULT_CHARS) — so screenshots go to files.
// - The MCP connect timeout is 10 s unless the entry sets `timeout` (then connect and requests both use it); a first
//   `npx --package=<tgz>` can take longer, so the entry sets 300 s and the server is warmed before the run.
// - `--data-dir` (and CLINE_SESSION_BACKEND_MODE=local) keeps the run in-process: no hub daemon outlives it.
//   CLINE_NO_AUTO_UPDATE=1 and autoUpdateEnabled false: nothing downloads mid-round.
// - Exit 0 is NOT success: three all-failed turns or a hook cancel end as `aborted` with exit 0. The round reads
//   run_result.finishReason ("completed" | "aborted" | "error" | "max_iterations"). No step cap exists; -t is the
//   wall-clock bound, and the stall stop (journal not growing) is this runner's.
// - The workspace root is the git top level of the folder, else the folder: the lab is outside any repo.
//
//   node round-cline.mjs <root> <tgz-dir> <prompt-file> --model cline-pass/<m> [--cline-bin <path>] [--timeout-min 120]
//                        [--stall-min 30] [--thinking none|low|medium|high|xhigh] [--kit cline] [--result-chars N]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { kitTarball, kitVersion } from '../own-018/kit-tarball.mjs';

const [rootArg, tgzDir, promptFile, ...rest] = process.argv.slice(2);
if (!rootArg || !tgzDir || !promptFile) throw new Error('usage: node round-cline.mjs <root> <tgz-dir> <prompt-file> --model cline-pass/<m>');
if (fs.existsSync(rootArg)) throw new Error(`${rootArg} exists; a round starts from an empty folder`);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const MODEL = opt('--model', null);
if (!/^cline-pass\/[\w.-]+$/.test(MODEL || '')) throw new Error('--model cline-pass/<model> is required');
const CLINE = 'cline@3.0.71'; // npm latest on 2026-10-15; source read in OWN-020 s1
const clineBin = opt('--cline-bin', null); // a pinned install of CLINE (a 105 MB binary; npx would fetch it every round)
const kit = opt('--kit', null);

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
fs.mkdirSync(rootArg, { recursive: true });
const root = fs.realpathSync(rootArg); // /tmp is a symlink on macOS
const HOME = path.join(root, 'home');
const CLINE_DIR = path.join(HOME, '.cline');
const DATA = path.join(CLINE_DIR, 'data');
const SETTINGS = path.join(DATA, 'settings');
const APPS = path.join(root, 'work', 'apps');
const tgz = (pkg) => kitTarball(path.resolve(tgzDir), pkg);
const MCP_AT = () => `@nodegx/mcp@${kitVersion(path.resolve(tgzDir))}`;
for (const d of [SETTINGS, path.join(HOME, 'tmp'), path.dirname(APPS)]) fs.mkdirSync(d, { recursive: true });
if (spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).status === 0) throw new Error(`${root} is inside a git repo; Cline would take the repo as the workspace`);

const keyLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('CLINE_PASS_API_KEY='));
if (!keyLine) throw new Error('CLINE_PASS_API_KEY is not in the repo .env');
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('CLINE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, {
  HOME,
  TMPDIR: path.join(HOME, 'tmp'),
  npm_config_cache: path.join(HOME, '.npm'),
  CLINE_DIR,
  CLINE_DATA_DIR: DATA,
  CLINE_MCP_SETTINGS_PATH: path.join(SETTINGS, 'cline_mcp_settings.json'),
  CLINE_SESSION_BACKEND_MODE: 'local',
  CLINE_NO_AUTO_UPDATE: '1',
  CLINE_HUB_PORT: '25999', // never Richard's hub (25463), should anything try to start one
  CLINE_API_KEY: keyLine.slice('CLINE_PASS_API_KEY='.length).trim().replace(/^["']|["']$/g, ''), // env, not argv (ps shows argv)
  ...(opt('--result-chars', null) ? { CLINE_MESSAGE_BUILDER_MAX_TOOL_RESULT_CHARS: opt('--result-chars') } : {}),
  // --base-url: the lab's scripted mock (mock-model.mjs) in place of api.cline.bot, to prove the seal at no cost.
  ...(opt('--base-url', null) ? { CLINE_API_BASE_URL: opt('--base-url') } : {})
});

// 0. The lab's seal (see the header): harness settings in the empty HOME, never the person's folder.
const TEAM = ['team_spawn_teammate', 'team_shutdown_teammate', 'team_status', 'team_run_task', 'team_task', 'team_await_run', 'team_await_runs',
  'team_await_all_runs', 'team_cancel_run', 'team_list_runs', 'team_send_message', 'team_broadcast', 'team_read_mailbox', 'team_create_outcome',
  'team_attach_outcome_fragment', 'team_review_outcome_fragment', 'team_finalize_outcome', 'team_list_outcomes', 'team_cleanup', 'team_mission_log'];
const globalSettings = {
  telemetryOptOut: true,
  autoUpdateEnabled: false,
  toolAutoApprove: true,
  disabledTools: ['run_commands', 'fetch_web_content', 'spawn_agent', 'ask_question', ...TEAM],
  tools: { web_search: { enabled: false } }
};
fs.writeFileSync(path.join(SETTINGS, 'global-settings.json'), JSON.stringify(globalSettings, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'cline-seal.json'), JSON.stringify(globalSettings, null, 2) + '\n');
const ALLOWED = [APPS, path.join(HOME, 'tmp')];
writeSealPlugin(path.join(CLINE_DIR, 'plugins'), ALLOWED);

// 1. npm create nodegx apps, from the packed tarball.
const created = spawnSync('npx', ['-y', `--package=${tgz('create-nodegx')}`, 'create-nodegx', APPS, ...(kit === 'cline' ? ['--cline'] : [])], { cwd: path.dirname(APPS), env, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'create.log'), created.stdout + created.stderr);
if (created.status !== 0) throw new Error(`create-nodegx exited ${created.status}; see create.log`);
// --seed <previous round root>: a later sitting. 3.0.71 can't resume a session headless (`--id` forces interactive,
// `--json` refuses it), so the person's next turn is a new chat in the SAME folder on the SAME machine: the previous
// round's work/apps, and its ~/.noodl (a provisioned backend lives there, named by id from nodegx.project.json).
const seed = opt('--seed', null);
if (seed) {
  fs.cpSync(path.join(path.resolve(seed), 'work', 'apps'), APPS, { recursive: true, force: true });
  const noodl = path.join(path.resolve(seed), 'home', '.noodl');
  if (fs.existsSync(noodl)) fs.cpSync(noodl, path.join(HOME, '.noodl'), { recursive: true, force: true });
}

// 2. The server in Cline's MCP file. The core kit: the way `cline mcp add` writes it, with the flags the kit gives
// other agents (opencode.json's command: --allow-writes --screenshots-to-files) and a timeout. `--kit cline`
// (create-nodegx --cline, OWN-020 s-kit): the kit wrote the entry itself into CLINE_MCP_SETTINGS_PATH, so the round
// keeps exactly what it wrote (flags, timeout, metadata) and only points the registry name at the tarball.
let written, timeout = 300, metadata;
if (kit === 'cline') {
  const entry = JSON.parse(fs.readFileSync(env.CLINE_MCP_SETTINGS_PATH, 'utf8')).mcpServers.nodegx;
  written = [entry.command, ...entry.args];
  ({ timeout, metadata } = entry);
} else {
  written = JSON.parse(fs.readFileSync(path.join(APPS, 'opencode.json'), 'utf8')).mcp.nodegx.command;
}
if (JSON.stringify(written.slice(0, 4)) !== JSON.stringify(['npx', '-y', MCP_AT(), '--allow-writes'])) throw new Error(`the kit names the server as ${JSON.stringify(written)}`);
const serverArgs = ['-y', `--package=${tgz('nodegx-mcp')}`, 'noodl-mcp', ...written.slice(3)];
const mcp = { mcpServers: { nodegx: { command: 'npx', args: serverArgs, timeout, ...(metadata ? { metadata } : {}) } } };
fs.writeFileSync(env.CLINE_MCP_SETTINGS_PATH, JSON.stringify(mcp, null, 2) + '\n');
// Warm the server's npx install so the first connect doesn't race Cline's clock.
spawnSync('npx', [...serverArgs.slice(0, 3), '--version'], { cwd: APPS, env, encoding: 'utf8', timeout: 240000 });

// 3. cline in the folder, headless.
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const timeoutS = Math.round(Number(opt('--timeout-min', 120)) * 60);
const thinking = opt('--thinking', null);
// --retries: a turn whose every call the seal skipped counts as a "mistake", and 3 in a row (the default) end the run
// as `aborted`; the lab's own refusals must not end a round a person's machine would have let run on, so 5.
const clineArgs = ['--json', '-P', 'cline-pass', '-m', MODEL, '-c', APPS, '--data-dir', DATA, '-t', String(timeoutS), '--retries', opt('--retries', '5'), ...(thinking ? ['--thinking', thinking] : []), prompt];
const [cmd, args] = clineBin ? [clineBin, clineArgs] : ['npx', ['-y', CLINE, ...clineArgs]];
fs.writeFileSync(
  path.join(root, 'command.txt'),
  `cd ${APPS} && ${cmd} ${args.slice(0, -1).join(' ')} "$(cat ${path.resolve(promptFile)})"\n` +
    `# HOME=${HOME} (CLINE_DIR, data dir and TMPDIR inside it); seal ${path.join(SETTINGS, 'global-settings.json')} + ${path.join(CLINE_DIR, 'plugins')}\n` +
    `# key: CLINE_PASS_API_KEY from the repo .env, passed as CLINE_API_KEY (value never written)\n` +
    `# server: npx ${serverArgs.join(' ')} (timeout 300 s)\n`
);
const log = fs.createWriteStream(path.join(root, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(root, 'agent.stderr'));
const child = spawn(cmd, args, { cwd: APPS, env: { ...env, PWD: APPS }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
const t0 = Date.now();

// The stall stop: the journal not growing for --stall-min minutes. The tree is found by parent pid, never by name.
const stallMin = Number(opt('--stall-min', 30));
let lastSize = 0, lastGrow = Date.now(), stalled = false;
const tree = (pid) => [pid, ...(spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).flatMap((c) => tree(Number(c)))];
const watch = setInterval(() => {
  const size = fs.statSync(path.join(root, 'agent.jsonl')).size + fs.statSync(path.join(root, 'agent.stderr')).size;
  if (size !== lastSize) { lastSize = size; lastGrow = Date.now(); return; }
  if (!stalled && Date.now() - lastGrow > stallMin * 60000) {
    stalled = true;
    for (const pid of tree(child.pid).reverse()) try { process.kill(pid, 'SIGTERM'); } catch {}
  }
}, 15000);

child.on('close', (code) => {
  clearInterval(watch);
  const lines = fs.readFileSync(path.join(root, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const result = lines.findLast((l) => l.type === 'run_result');
  const finish = stalled ? 'stalled' : result?.finishReason ?? lines.findLast((l) => l.type === 'run_aborted')?.reason ?? 'no run_result';
  const how = `${finish} (exit ${code})`;
  fs.writeFileSync(path.join(root, 'agent.exit'), `${how} ${Math.round((Date.now() - t0) / 1000)}s`);
  if (result) fs.writeFileSync(path.join(root, 'run-result.json'), JSON.stringify(result, null, 2) + '\n');
  // The seal fails open, so audit: every absolute path in any TOOL INPUT that is outside the round's folders. (Not
  // every event: streamed text arrives as growing prefixes, "/private/tmp/cla…", which s1's first audit counted.)
  const roots = [root, root.replace(/^\/private\/tmp\//, '/tmp/')];
  const seen = new Set();
  const inputs = lines.filter((l) => l.type === 'agent_event' && l.event?.type === 'content_start' && l.event.contentType === 'tool');
  for (const l of inputs) for (const m of JSON.stringify(l.event.input ?? '').matchAll(/(?<![\w.])(\/(?:Users|private|tmp|etc|var|opt|Library|Volumes|home)\/[^"\s\\,)]*)/g)) {
    if (!roots.some((r) => m[1] === r || m[1].startsWith(r + '/'))) seen.add(`${l.event.toolName}: ${m[1]}`);
  }
  fs.writeFileSync(path.join(root, 'seal-audit.txt'), seen.size ? [...seen].join('\n') + '\n' : 'clean\n');
  console.log('exit', how, '| seal audit:', seen.size ? `${seen.size} outside path(s), see seal-audit.txt` : 'clean');
});

/**
 * The seal plugin (measured from 3.0.71's source, s1 follow-up): every *.js under $CLINE_DIR/plugins is its own plugin,
 * loaded through jiti in a worker; it must export { name, manifest: { capabilities: ['hooks'] }, hooks }. beforeTool
 * gets { toolCall: { toolName, input } } and `{ skip: true, reason }` gives the model the reason as a tool error, and
 * the run goes on. read_files accepts a string, an array or any of {path, file_path, filePath, file_paths, paths,
 * files}, so EVERY string in the input is checked; relative paths resolve against the process cwd (APPS here).
 * It FAILS OPEN (a throw, >3 s, or 5 failures and the tool runs), so it is synchronous and trivial, and the runner
 * audits every tool input afterwards (seal-audit.txt). `run_commands` would bypass any path check; it is disabled.
 */
function writeSealPlugin(dir, allowed) {
  fs.mkdirSync(dir, { recursive: true });
  // /tmp is a symlink on macOS: a path may arrive as /tmp/… or /private/tmp/….
  const roots = [...new Set(allowed.flatMap((a) => [a, a.replace(/^\/private\/tmp\//, '/tmp/')]))];
  const src = `// OWN-020 lab seal (harness, not the person): see round-cline.mjs.
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
const inside = (p) => {
  const abs = path.resolve(CWD, p);
  return ROOTS.some((r) => abs === r || abs.startsWith(r + path.sep));
};
const pathsOf = (tool, input) => {
  if (tool === 'apply_patch') {
    const text = strings(input).join('\\n');
    return [...text.matchAll(/^\\*\\*\\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map((m) => m[1].trim());
  }
  if (tool === 'editor') return strings(input && input.path !== undefined ? input.path : input).slice(0, 1);
  // read_files: every string that could be a path (not cline://, which is Cline's own cache of a cut result)
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
  fs.writeFileSync(path.join(root, 'cline-seal-plugin.js'), src);
}
