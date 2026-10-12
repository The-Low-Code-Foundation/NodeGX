#!/usr/bin/env node
/**
 * `npm create nodegx [folder]` — P112 OWN-011, the one install (R8, R9 ruled 2026-10-11).
 *
 * Writes ONE file: the folder's `.mcp.json`, which gives the person's agent the NodeGX server in bootstrap mode. The
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

/** The registration a client spawns. `cmd /c` on Windows, where `npx` is a `.cmd` a client cannot spawn directly. */
function serverEntry(platform = process.platform) {
  const npx = ['-y', `${MCP_PACKAGE}@${MCP_VERSION}`, '--allow-writes'];
  return platform === 'win32'
    ? { type: 'stdio', command: 'cmd', args: ['/c', 'npx', ...npx] }
    : { type: 'stdio', command: 'npx', args: npx };
}

/**
 * Set `folder` up. Returns what happened, for the sentence; throws (with a sentence) when it will not write.
 * @returns {{ folder: string, file: string, outcome: 'written' | 'added' | 'present' }}
 */
function setUp(folder, platform = process.platform) {
  const dir = path.resolve(folder);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) throw new Error(`${dir} is a file, not a folder.`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, '.mcp.json');
  const entry = serverEntry(platform);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ mcpServers: { [SERVER_NAME]: entry } }, null, 2) + '\n');
    return { folder: dir, file, outcome: 'written' };
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}), so it was left as it is. Fix it, then run this again.`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`${file} is not a JSON object; left as it is.`);
  const servers = config.mcpServers && typeof config.mcpServers === 'object' ? config.mcpServers : {};
  if (servers[SERVER_NAME]) return { folder: dir, file, outcome: 'present' };
  config.mcpServers = { ...servers, [SERVER_NAME]: entry };
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  return { folder: dir, file, outcome: 'added' };
}

function sentence(result) {
  const here = path.relative(process.cwd(), result.folder) || '.';
  const done =
    result.outcome === 'present'
      ? `${result.file} already has a "${SERVER_NAME}" server; it was left as it is.`
      : `${result.outcome === 'written' ? 'Wrote' : 'Added the NodeGX server to'} ${result.file}.`;
  return [
    done,
    '',
    'Next:',
    `  1. Open your agent in ${here === '.' ? 'this folder' : here} (Claude Code: cd ${here} && claude) and accept the "${SERVER_NAME}" server.`,
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

module.exports = { MCP_PACKAGE, MCP_VERSION, SERVER_NAME, serverEntry, setUp };
