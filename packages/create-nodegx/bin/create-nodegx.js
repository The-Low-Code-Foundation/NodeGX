#!/usr/bin/env node
/**
 * `npm create nodegx [folder]` — P112 OWN-011, the one install (R8, R9 ruled 2026-10-11).
 *
 * Writes the folder's `.mcp.json`, which gives the person's agent the NodeGX server in bootstrap mode, and (Richard,
 * 2026-10-12, P112-S14-NOTNODEGX: "or else what's the point?") a short `CLAUDE.md` and `AGENTS.md` saying that an app
 * asked for here is a NodeGX app. Without them a fresh agent wrote an Express server and never called a tool. The
 * project is not made here. The person opens their agent in the folder and says what they want; the agent scopes it
 * with them and calls `create_project`, which writes the project, its brief, its plan and its own server entry — so
 * there is one writer of projects, and the scoping conversation is never skipped (R8).
 *
 * The server is pinned to the version this command was published with, so a folder keeps the server it was set up
 * with. Never touches the person's global agent config; never replaces a server entry it did not write.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** The server this release sets up. `test/create.test.js` holds it equal to the checkout's `@nodegx/mcp` version. */
const MCP_PACKAGE = '@nodegx/mcp';
const MCP_VERSION = '0.2.0';
const PREVIEW_PACKAGE = '@nodegx/preview';
const SERVER_NAME = 'nodegx';

/**
 * What an agent opened in this folder reads before anything else (Claude Code: CLAUDE.md; other AI coders: AGENTS.md).
 * Written only when the file is absent: a person's own instructions are never replaced.
 */
const AGENT_FILES = ['CLAUDE.md', 'AGENTS.md'];
const AGENT_NOTE = [
  '# This folder is for NodeGX apps',
  '',
  'It was set up with `npm create nodegx`. When I ask for an app here, build it as a NodeGX app with the `nodegx`',
  "server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't",
  'write a separate web server or hand-written HTML and JavaScript instead: that would be a different app.',
  '',
  "When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value",
  "and tell me where to paste it in the project's `.env` file.",
  '',
  `To see an app: \`npx ${PREVIEW_PACKAGE} <the app's folder> --open\``,
  '',
  // P112-OWN018-LISTCHANGED / OWN-018 round 1: Mistral Large 4 (in Mistral Vibe) created the app, then could not see
  // the tools that build it, and wrote one 17-component batch whose every refusal it then had to untangle at once.
  "Some agents never refresh their tool list once a project is open. If a `nodegx` tool you're told about isn't in",
  'yours, call it through `call_tool` (`describe: true` shows its arguments first).',
  '',
  'Build in small steps: one component at a time, reading each answer before the next. A change the server refuses',
  'says exactly what to fix.',
  '',
  // P112 OWN-018 s2, quiz run 2: Mistral Large 4 in OpenCode ended its session after eight steps with "Let me study
  // three examples" and no tool call — a reply without one ends the run there. Run 1 tested its quiz with
  // `drive_page {page: "quiz"}` and never saw that pressing Start skipped question 1.
  'Keep going until the app is built and you have tried it. Some agents end the session at the first reply that',
  "calls no tool, so don't stop at a plan or a progress note: call the next tool.",
  '',
  "Try it the way a person arrives: `drive_page` from the app's start page (leave out `page`) and press through it,",
  'not a page opened on its own.',
  ''
].join('\n');

/**
 * P112 OWN-018 s2 — OpenCode's settings for this folder (`opencode.json`, read from the folder it runs in): the same
 * pinned server, and Mistral Large 4's context given as 128k. models.dev lists it at 1,048,576, so OpenCode never
 * compacts a session; Mistral caches 70% of a prompt under ~128k tokens and 5% of one over it (quiz run 1:
 * P112-OWN018-CACHE128K), so a long build paid full price on most of its steps. The model is left to the person;
 * the limit only applies when they choose Large 4. Written only when absent, like the agent notes.
 */
const OPENCODE_CONFIG = 'opencode.json';

function renderOpenCodeConfig(platform = process.platform) {
  const entry = serverEntry(platform);
  return (
    JSON.stringify(
      {
        $schema: 'https://opencode.ai/config.json',
        mcp: { [SERVER_NAME]: { type: 'local', command: [entry.command, ...entry.args], enabled: true } },
        provider: { mistral: { models: { 'mistral-large-4': { limit: { context: 128000, output: 16384 } } } } }
      },
      null,
      2
    ) + '\n'
  );
}

/** Writes `opencode.json` when absent. Returns 'written' or 'present'. */
function writeOpenCodeConfig(dir, platform = process.platform) {
  const file = path.join(dir, OPENCODE_CONFIG);
  if (fs.existsSync(file)) return 'present';
  fs.writeFileSync(file, renderOpenCodeConfig(platform));
  return 'written';
}

/**
 * P112 OWN-018 — Mistral Vibe's settings for this folder. Vibe reads `.vibe/config.toml` from the folder it runs in
 * (once the person trusts the folder), not `.mcp.json`, and 2.26.1 ships no Mistral Large 4 entry: left alone, its
 * default model is routed to a non-Mistral one. Written only when absent, like the agent notes.
 *
 * Measured 2026-10-12 against Vibe 2.26.1's source and runs:
 * - Permissions are by exact tool name (no globs) and an MCP tool defaults to "ask", which `vibe -p` answers "no".
 *   The bootstrap server advertises seven tools, and `call_tool` reaches the rest, so seven entries are the whole list.
 * - The harness can be chosen only with `--legacy-harness` on the command line; the default one hands the model
 *   "The MCP tool returned an error" instead of the server's diagnostics (P112-OWN018-OPAQUEERRORS). The closing
 *   lines say so, and so does this file's header.
 * - `thinking = "low"` is Vibe's spelling of `reasoning_effort: "none"`; "high" is Vibe's own default for Mistral's models.
 */
const VIBE_CONFIG = path.join('.vibe', 'config.toml');
const VIBE_ALLOWED_TOOLS = ['list_projects', 'open_project', 'create_project', 'list_examples', 'get_example', 'find_tools', 'call_tool'];

function renderVibeConfig(platform = process.platform) {
  const entry = serverEntry(platform);
  const toml = (v) => JSON.stringify(v);
  return [
    '# Mistral Vibe settings for this folder, written by `npm create nodegx`. Start Vibe here with:',
    '#',
    '#   vibe --legacy-harness',
    '#',
    "# Vibe's default harness hides a tool's error messages from the model, and NodeGX answers every refused change",
    '# with what to fix, so the legacy harness builds better apps. Edit anything below; it is never overwritten.',
    '',
    'active_model = "mistral-large-4"',
    '',
    '[[models]]',
    'name = "mistral-large-4"',
    'provider = "mistral"',
    'alias = "mistral-large-4"',
    'display_name = "Mistral Large 4"',
    'temperature = 1.0',
    'thinking = "high"',
    'thinking_levels = ["low", "high"]',
    'max_context_length = 1000000',
    'input_price = 1.36',
    'output_price = 4.18',
    'cached_input_price = 0.14',
    '',
    '[[mcp_servers]]',
    `name = ${toml(SERVER_NAME)}`,
    'transport = "stdio"',
    `command = ${toml(entry.command)}`,
    `args = [${entry.args.map(toml).join(', ')}]`,
    'startup_timeout_sec = 240',
    'tool_timeout_sec = 600',
    '',
    ...VIBE_ALLOWED_TOOLS.flatMap((tool) => [`[tools.${SERVER_NAME}_${tool}]`, 'permission = "always"', '']),
  ].join('\n');
}

/** Writes `.vibe/config.toml` when absent. Returns 'written' or 'present'. */
function writeVibeConfig(dir, platform = process.platform) {
  const file = path.join(dir, VIBE_CONFIG);
  if (fs.existsSync(file)) return 'present';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderVibeConfig(platform));
  return 'written';
}

/** Writes each agent file that is absent. Returns the names written. */
function writeAgentNotes(dir) {
  const written = [];
  for (const name of AGENT_FILES) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, AGENT_NOTE);
    written.push(name);
  }
  return written;
}

/** The registration a client spawns. `cmd /c` on Windows, where `npx` is a `.cmd` a client cannot spawn directly. */
function serverEntry(platform = process.platform) {
  const npx = ['-y', `${MCP_PACKAGE}@${MCP_VERSION}`, '--allow-writes'];
  return platform === 'win32'
    ? { type: 'stdio', command: 'cmd', args: ['/c', 'npx', ...npx] }
    : { type: 'stdio', command: 'npx', args: npx };
}

/**
 * Set `folder` up. Returns what happened, for the sentence; throws (with a sentence) when it will not write.
 * @returns {{ folder: string, file: string, outcome: 'written' | 'added' | 'present', notes: string[], vibe: string, opencode: string }}
 */
function setUp(folder, platform = process.platform) {
  const dir = path.resolve(folder);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) throw new Error(`${dir} is a file, not a folder.`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, '.mcp.json');
  const entry = serverEntry(platform);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ mcpServers: { [SERVER_NAME]: entry } }, null, 2) + '\n');
    return { folder: dir, file, outcome: 'written', notes: writeAgentNotes(dir), vibe: writeVibeConfig(dir, platform), opencode: writeOpenCodeConfig(dir, platform) };
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}), so it was left as it is. Fix it, then run this again.`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`${file} is not a JSON object; left as it is.`);
  const servers = config.mcpServers && typeof config.mcpServers === 'object' ? config.mcpServers : {};
  if (servers[SERVER_NAME]) return { folder: dir, file, outcome: 'present', notes: writeAgentNotes(dir), vibe: writeVibeConfig(dir, platform), opencode: writeOpenCodeConfig(dir, platform) };
  config.mcpServers = { ...servers, [SERVER_NAME]: entry };
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  return { folder: dir, file, outcome: 'added', notes: writeAgentNotes(dir), vibe: writeVibeConfig(dir, platform), opencode: writeOpenCodeConfig(dir, platform) };
}

function sentence(result) {
  const here = path.relative(process.cwd(), result.folder) || '.';
  const done =
    result.outcome === 'present'
      ? `${result.file} already has a "${SERVER_NAME}" server; it was left as it is.`
      : `${result.outcome === 'written' ? 'Wrote' : 'Added the NodeGX server to'} ${result.file}.`;
  const notes = result.notes && result.notes.length ? [`Wrote ${result.notes.join(' and ')}: they tell your agent that apps here are NodeGX apps.`] : [];
  if (result.vibe === 'written') notes.push(`Wrote ${VIBE_CONFIG}: Mistral Vibe uses Mistral Large 4 and the NodeGX server here.`);
  if (result.opencode === 'written') notes.push(`Wrote ${OPENCODE_CONFIG}: OpenCode gets the NodeGX server here.`);
  return [
    done,
    ...notes,
    '',
    'Next:',
    `  1. Open your agent in ${here === '.' ? 'this folder' : here} (Claude Code: cd ${here} && claude) and accept the "${SERVER_NAME}" server.`,
    `     Mistral Vibe: cd ${here} && vibe --legacy-harness, and trust the folder when it asks.`,
    `     OpenCode: cd ${here} && opencode (with Mistral: opencode -m mistral/mistral-large-4).`,
    '  2. Say what you want to build. Your agent talks it through with you, then makes the app in a folder here.',
    `  3. See it: npx ${PREVIEW_PACKAGE} <the app's folder> --open`,
    '',
    'Any time you want the visual editor, open the same folder in NodeGX — nothing needs converting.',
    `Another AI coder: give it the server "npx -y ${MCP_PACKAGE}@${MCP_VERSION} --allow-writes" (stdio).`
  ].join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: npm create nodegx [folder]\n\nSets a folder up so your AI agent can build NodeGX apps in it. Default folder: this one.\n');
  } else if (args.filter((a) => !a.startsWith('-')).length > 1) {
    process.stderr.write('create-nodegx: one folder at most. Usage: npm create nodegx [folder]\n');
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(sentence(setUp(args.find((a) => !a.startsWith('-')) || '.')) + '\n');
    } catch (err) {
      process.stderr.write(`create-nodegx: ${err.message}\n`);
      process.exitCode = 1;
    }
  }
}

module.exports = { AGENT_FILES, AGENT_NOTE, MCP_PACKAGE, MCP_VERSION, OPENCODE_CONFIG, SERVER_NAME, VIBE_ALLOWED_TOOLS, VIBE_CONFIG, renderOpenCodeConfig, renderVibeConfig, serverEntry, setUp };
