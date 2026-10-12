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
  VIBE_ALLOWED_TOOLS,
  VIBE_CONFIG,
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
  // The same registration .mcp.json gets.
  const entry = serverEntry();
  assert.ok(toml.includes(`command = ${JSON.stringify(entry.command)}`));
  assert.ok(toml.includes(`args = [${entry.args.map((a) => JSON.stringify(a)).join(', ')}]`));
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

test('P112 OWN-018 s2: OpenCode gets the same pinned server, and Large 4 a 128k context so it compacts before the cache stops', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const config = read(path.join(dir, OPENCODE_CONFIG));
  assert.equal(fs.readFileSync(path.join(dir, OPENCODE_CONFIG), 'utf8'), renderOpenCodeConfig());
  const entry = serverEntry();
  assert.deepEqual(config.mcp.nodegx, { type: 'local', command: [entry.command, ...entry.args], enabled: true });
  // Measured (P112-OWN018-CACHE128K): Mistral caches 70% of a prompt under ~128k tokens and 5% of one over it.
  assert.deepEqual(config.provider.mistral.models['mistral-large-4'].limit, { context: 128000, output: 16384 });
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

test('P112 OWN-018 s2: the agent notes say keep going until the app is tried, and try it from the start page', () => {
  assert.match(AGENT_NOTE, /Keep going until the app is built and you have tried it/);
  assert.match(AGENT_NOTE, /calls no tool, so don't stop at a plan or a progress note: call the next tool/);
  assert.match(AGENT_NOTE, /`drive_page` from the app's start page \(leave out `page`\)/);
});
