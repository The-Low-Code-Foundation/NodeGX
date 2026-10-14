// Render the round-2 agent's project the way its agent did: the 0.2.0 MCP tarball over stdio, HOME = the round's
// empty home, opened with open_project. Server stderr goes to render.stderr. Usage: node render.mjs [page]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const mcpRequire = createRequire(path.join(R, 'packages', 'noodl-mcp', 'package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));

const S = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(S, 'work', 'lingo-apps');
const env = { ...process.env, HOME: path.join(S, 'home'), npm_config_cache: path.join(S, 'home', '.npm') };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_')) delete env[k];

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '--package=/Users/richardosborne/nodegx-npm-0.2.0/nodegx-mcp-0.2.0.tgz', 'noodl-mcp', '--allow-writes'],
  cwd: WORK,
  env,
  stderr: 'pipe'
});
const errLog = fs.createWriteStream(path.join(S, 'render.stderr'));
transport.stderr?.on('data', (d) => errLog.write(d));
const client = new Client({ name: 'own015-render', version: '0' });
await client.connect(transport);

const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const t0 = Date.now();
const opened = await client.callTool({ name: 'open_project', arguments: { directory: path.join(WORK, 'bonjour') } });
console.log('open', Date.now() - t0, 'ms', opened.isError ? text(opened).slice(0, 400) : 'ok');
const args = { viewports: 'phone', screenshot: 'none' };
if (process.argv[2]) args.page = process.argv[2];
const t1 = Date.now();
try {
  const r = await client.callTool({ name: 'render_report', arguments: args }, undefined, { timeout: 300000 });
  console.log('render', Date.now() - t1, 'ms', r.isError ? 'ERROR' : 'ok');
  console.log(text(r).slice(0, 4000));
} catch (e) {
  console.log('render threw after', Date.now() - t1, 'ms', String(e).slice(0, 400));
}
await client.close();
