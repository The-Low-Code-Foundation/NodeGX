// Bring the round-2 agent's backend back the way its agent would, and keep it up: the 0.2.0 MCP tarball over stdio,
// HOME = the round's home, open_project → provision_backend (adopts the same id) → deploy_cloud_functions. Stays
// alive until killed (the backend stops with the MCP server). Never reads or prints a secret.
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
  stderr: 'ignore'
});
const client = new Client({ name: 'own015-stack', version: '0' });
await client.connect(transport);
const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
  console.log(`== ${name}${r.isError ? ' (ERROR)' : ''}\n${text(r).slice(0, 1500)}`);
  return r;
};

await call('open_project', { directory: path.join(WORK, 'bonjour-repaired') });
await call('find_tools', { group: 'backend' });
await call('provision_backend', { name: 'App backend', force: true }); // 0.2.0's own refusal says so (P112-S14-DAYTWO)
await call('deploy_cloud_functions', {});
console.log('READY');
setInterval(() => {}, 1 << 30);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await client.close(); process.exit(0); });
