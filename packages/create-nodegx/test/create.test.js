'use strict';
/** P112 OWN-011 — `npm create nodegx`. Run: `npm test --workspace create-nodegx`. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  AGENT_NOTE,
  MCP_PACKAGE,
  MCP_VERSION,
  OPENCODE_CONFIG,
  VIBE_AGENT,
  VIBE_ALLOWED_TOOLS,
  VIBE_CONFIG,
  VIBE_SERVER_FLAGS,
  renderOpenCodeConfig,
  renderVibeConfig,
  serverEntry,
  setUp
} = require('../bin/create-nodegx.js');

const BIN = path.join(__dirname, '..', 'bin', 'create-nodegx.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'create-nodegx-'));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('the pinned server is the version the checkout would publish', () => {
  const mcp = require('../../noodl-mcp/package.json');
  assert.equal(MCP_PACKAGE, mcp.name);
  assert.equal(MCP_VERSION, mcp.version);
});

test('an empty folder gets the bootstrap server, pinned, and the two agent notes', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['.mcp.json', '.vibe', 'AGENTS.md', 'CLAUDE.md', 'opencode.json']);
  const entry = read(path.join(dir, '.mcp.json')).mcpServers.nodegx;
  assert.deepEqual(entry, serverEntry());
  assert.ok(entry.args.includes(`${MCP_PACKAGE}@${MCP_VERSION}`));
  assert.ok(entry.args.includes('--allow-writes'));
  // Bootstrap mode: no project directory, so the agent's create_project makes the app (R8).
  assert.ok(!entry.args.some((a) => path.isAbsolute(a)));
  assert.match(run.stdout, /Say what you want to build/);
  assert.match(run.stdout, /Wrote CLAUDE.md and AGENTS.md/);
});

test('P112-S14-NOTNODEGX: the agent notes say an app here is a NodeGX app, and how a key goes in', () => {
  assert.match(AGENT_NOTE, /build it as a NodeGX app with the `nodegx`\nserver's tools/);
  assert.match(AGENT_NOTE, /Don't\nwrite a separate web server/);
  assert.match(AGENT_NOTE, /`set_function_secret` without a value/);
  assert.match(AGENT_NOTE, /`\.env` file/);
});

test("a person's own CLAUDE.md or AGENTS.md is never replaced", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'mine\n');
  const result = setUp(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'mine\n');
  assert.deepEqual(result.notes, ['AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), AGENT_NOTE);
});

test('Windows spawns npx through cmd /c', () => {
  assert.deepEqual(serverEntry('win32').args.slice(0, 3), ['/c', 'npx', '-y']);
  assert.equal(serverEntry('win32').command, 'cmd');
});

test('another server in .mcp.json is kept, and an existing "nodegx" entry is never replaced', () => {
  const dir = tmp();
  const file = path.join(dir, '.mcp.json');
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { other: { command: 'x' } } }));
  assert.equal(setUp(dir).outcome, 'added');
  assert.deepEqual(Object.keys(read(file).mcpServers), ['other', 'nodegx']);

  const mine = { command: 'my-own-nodegx' };
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { nodegx: mine } }));
  assert.equal(setUp(dir).outcome, 'present');
  assert.deepEqual(read(file).mcpServers.nodegx, mine);
});

test('a .mcp.json that is not JSON is refused and left as it is', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '.mcp.json'), '{ not json');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'), '{ not json');
});

test('the home folder is never touched', () => {
  const home = tmp();
  const dir = path.join(tmp(), 'apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('P112 OWN-018: Mistral Vibe gets Large 4, the same pinned server, and permission for the bootstrap tools', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const toml = fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8');
  assert.equal(toml, renderVibeConfig());
  // Pinned, never `mistral-large-latest` (a different, older model on 2026-10-12), and set, so Vibe's routed default
  // (a non-Mistral model) never applies.
  assert.match(toml, /^active_model = "mistral-large-4"$/m);
  assert.match(toml, /^name = "mistral-large-4"$/m);
  // The same registration .mcp.json gets, plus the Vibe profile (OWN-019: worded for a tool list that never changes,
  // and screenshots to files — P112-OWN018-IMAGECACHE: an image in the conversation turns Mistral's cache off).
  const entry = serverEntry();
  assert.ok(toml.includes(`command = ${JSON.stringify(entry.command)}`));
  assert.ok(toml.includes(`args = [${[...entry.args, ...VIBE_SERVER_FLAGS].map((a) => JSON.stringify(a)).join(', ')}]`));
  for (const tool of VIBE_ALLOWED_TOOLS) assert.match(toml, new RegExp(`^\\[tools\\.nodegx_${tool}\\]\\npermission = "always"$`, 'm'));
  // The person is told how to start it, and why the harness matters.
  assert.match(toml, /vibe --legacy-harness/);
  assert.match(run.stdout, /Mistral Vibe: cd .* && vibe --legacy-harness/);
  assert.match(run.stdout, /Wrote \.vibe\/config\.toml/);
});

test('P112 OWN-018: the allowed tools are exactly what the bootstrap server advertises', () => {
  // Read off the checkout's manifest, so a tool added to bootstrap mode can't be left out of Vibe's permissions.
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'noodl-mcp', 'src', 'toolGroups.ts'), 'utf8');
  const names = (re) => src.match(re)[1].match(/'([a-z_]+)'/g).map((q) => q.slice(1, -1));
  const bootstrap = names(/export const BOOTSTRAP_TOOLS\b.*?Object\.freeze\(\[([^\]]*)\]/s);
  const extra = names(/export const BOOTSTRAP_ADVERTISED\b.*?\[\.\.\.BOOTSTRAP_TOOLS,([^\]]*)\]/s);
  assert.deepEqual([...VIBE_ALLOWED_TOOLS].sort(), [...bootstrap, ...extra].sort());
});

test("P112 OWN-018: a person's own .vibe/config.toml is never replaced", () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.vibe'));
  fs.writeFileSync(path.join(dir, VIBE_CONFIG), 'active_model = "mine"\n');
  assert.equal(setUp(dir).vibe, 'present');
  assert.equal(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), 'active_model = "mine"\n');
});

test('P112 OWN-018: on Windows, Vibe spawns npx through cmd /c too', () => {
  assert.match(renderVibeConfig('win32'), /^command = "cmd"$/m);
  assert.match(renderVibeConfig('win32'), /^args = \["\/c", "npx", "-y"/m);
});

test('P112 OWN-018: the agent notes name call_tool for an agent whose tool list never refreshes', () => {
  assert.match(AGENT_NOTE, /call it through `call_tool`/);
  assert.match(AGENT_NOTE, /one component at a time/);
});

test('P112 OWN-018 s2: OpenCode gets the same pinned server, and Large 4 limits that compact before the cache stops without cutting an answer', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const config = read(path.join(dir, OPENCODE_CONFIG));
  assert.equal(fs.readFileSync(path.join(dir, OPENCODE_CONFIG), 'utf8'), renderOpenCodeConfig());
  const entry = serverEntry();
  assert.deepEqual(config.mcp.nodegx, { type: 'local', command: [entry.command, ...entry.args, '--screenshots-to-files'], enabled: true });
  // Measured (P112-OWN018-CACHE128K): Mistral caches 70% of a prompt under ~128k tokens and 5% of one over it, so
  // OpenCode should compact first (at context − output ≈ 118k); and output at OpenCode's own ceiling, 32000: at 16384
  // two runs ended on an answer cut off mid-step (finish `length`).
  const limit = config.provider.mistral.models['mistral-large-4'].limit;
  assert.deepEqual(limit, { context: 150000, output: 32000 });
  assert.ok(limit.context - limit.output < 128000);
  // The model stays the person's choice: an OpenCode user on another model is not switched to Mistral.
  assert.equal(config.model, undefined);
  assert.match(run.stdout, /Wrote opencode\.json/);
  assert.match(run.stdout, /OpenCode: cd .* && opencode \(with Mistral: opencode -m mistral\/mistral-large-4\)/);
});

test("P112 OWN-018 s2: a person's own opencode.json is never replaced", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, OPENCODE_CONFIG), '{"model":"mine"}\n');
  assert.equal(setUp(dir).opencode, 'present');
  assert.equal(fs.readFileSync(path.join(dir, OPENCODE_CONFIG), 'utf8'), '{"model":"mine"}\n');
});

test('P112 OWN-018 s2: the agent notes say try the app from its start page', () => {
  assert.match(AGENT_NOTE, /`drive_page` from the app's start page \(leave out `page`\)/);
});

test('P112 OWN-018 s2: only the Mistral-facing configs send screenshots to files; .mcp.json (Claude) keeps them inline', () => {
  const dir = path.join(tmp(), 'my-apps');
  setUp(dir);
  assert.ok(!read(path.join(dir, '.mcp.json')).mcpServers.nodegx.args.includes('--screenshots-to-files'));
  assert.ok(read(path.join(dir, OPENCODE_CONFIG)).mcp.nodegx.command.includes('--screenshots-to-files'));
  // Vibe's server takes the profile, which implies screenshots to files (noodl-mcp cli.ts).
  assert.match(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), /"--profile", "vibe"\]/);
});

test('P112 OWN-019: the Vibe kit writes only Vibe files — its AGENTS.md, the NodeGX agent, and a config that starts it', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir, '--vibe'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  // R29: the profile overrides what only suits Claude — no .mcp.json, CLAUDE.md or opencode.json.
  for (const absent of ['.mcp.json', 'CLAUDE.md', OPENCODE_CONFIG]) assert.ok(!fs.existsSync(path.join(dir, absent)), absent);
  const toml = fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8');
  assert.equal(toml, renderVibeConfig(process.platform, { profile: 'vibe' }));
  assert.match(toml, new RegExp(`^default_agent = "${VIBE_AGENT}"$`, 'm'));
  // The agent carries tool settings only: Vibe 2.26.1 sends an agent's `instructions` on its unified harness alone,
  // and the kit runs the legacy one — so how to build lives in AGENTS.md, which reaches the model on both (s1 smoke).
  const agent = fs.readFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'utf8');
  assert.match(agent, /^disabled_tools = \["task"\]$/m);
  assert.doesNotMatch(agent, /^instructions =/m);
  const notes = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(notes, /Your tool list will not change/);
  assert.match(notes, /Write the checklist before building/);
  assert.match(notes, /"look": "Lisbon"/);
  assert.match(run.stdout, /vibe --legacy-harness/);
});

test("P112 OWN-019: the Vibe kit never replaces a person's own files", () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.vibe', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'mine\n');
  fs.writeFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'mine = true\n');
  const result = setUp(dir, process.platform, { profile: 'vibe' });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine\n');
  assert.equal(fs.readFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'utf8'), 'mine = true\n');
  assert.deepEqual(result.written, []);
});

test('P112 OWN-019: the plain kit does not set a default agent (there is no agent file beside it)', () => {
  const dir = path.join(tmp(), 'my-apps');
  setUp(dir);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), /default_agent/);
});
