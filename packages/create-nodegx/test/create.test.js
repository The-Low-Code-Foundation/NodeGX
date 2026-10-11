'use strict';
/** P112 OWN-011 — `npm create nodegx`. Run: `npm test --workspace create-nodegx`. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { MCP_PACKAGE, MCP_VERSION, serverEntry, setUp } = require('../bin/create-nodegx.js');

const BIN = path.join(__dirname, '..', 'bin', 'create-nodegx.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'create-nodegx-'));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('the pinned server is the version the checkout would publish', () => {
  const mcp = require('../../noodl-mcp/package.json');
  assert.equal(MCP_PACKAGE, mcp.name);
  assert.equal(MCP_VERSION, mcp.version);
});

test('an empty folder gets one file: the bootstrap server, pinned', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readdirSync(dir), ['.mcp.json']);
  const entry = read(path.join(dir, '.mcp.json')).mcpServers.nodegx;
  assert.deepEqual(entry, serverEntry());
  assert.ok(entry.args.includes(`${MCP_PACKAGE}@${MCP_VERSION}`));
  assert.ok(entry.args.includes('--allow-writes'));
  // Bootstrap mode: no project directory, so the agent's create_project makes the app (R8).
  assert.ok(!entry.args.some((a) => path.isAbsolute(a)));
  assert.match(run.stdout, /Say what you want to build/);
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
