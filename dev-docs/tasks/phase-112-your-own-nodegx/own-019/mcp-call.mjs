// OWN-019: call the PACKED server's tools on an app, the way a kit user's agent would — for building controls and
// mutants from a real round (replay an agent's calls on a copy) and for proving a kit fix from the tarball itself.
//   node mcp-call.mjs <app-dir> --tgz <tgz-dir> <tool> '<json args>' [<tool> '<json args>' …]
// Prints each answer's text. HOME is an empty temp folder; the server runs with --allow-writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { kitTarball, hasTarball } from '../own-018/kit-tarball.mjs';

const argv = process.argv.slice(2);
const APP = path.resolve(argv[0] || '');
const ti = argv.indexOf('--tgz');
const TGZ = path.resolve(argv[ti + 1] || '');
const calls = argv.slice(1).filter((_, i, a) => i !== ti - 1 && i !== ti);
if (!fs.existsSync(path.join(APP, 'nodegx.project.json')) || !hasTarball(TGZ, 'nodegx-mcp') || calls.length % 2) {
  throw new Error("usage: node mcp-call.mjs <app-dir> --tgz <tgz-dir> <tool> '<json>' …");
}
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-call-'));
const env = { ...process.env, HOME: home, npm_config_cache: path.join(home, '.npm'), TMPDIR: home };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
const mcpRequire = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../packages/noodl-mcp/package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const transport = new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${kitTarball(TGZ, 'nodegx-mcp')}`, 'noodl-mcp', APP, '--allow-writes'], cwd: home, env, stderr: 'ignore' });
const client = new Client({ name: 'own019-mcp-call', version: '0' });
await client.connect(transport);
try {
  for (let i = 0; i < calls.length; i += 2) {
    // Through call_tool, as an agent on a static tool list does: deferred tools are disabled until revealed.
    const r = await client.callTool({ name: 'call_tool', arguments: { name: calls[i], arguments: JSON.parse(calls[i + 1]) } }, undefined, { timeout: 300000 });
    console.log(`== ${calls[i]}${r.isError ? ' (error)' : ''}`);
    console.log((r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n'));
  }
} finally {
  await client.close();
  fs.rmSync(home, { recursive: true, force: true });
}
