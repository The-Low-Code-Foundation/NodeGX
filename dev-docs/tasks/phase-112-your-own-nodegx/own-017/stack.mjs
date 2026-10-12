// OWN-017 s16 (copied from own-015/s15/stack.mjs): bring the app's backend up as its agent's server would on day two (packed MCP, HOME = the round's home,
// open_project → provision_backend with the agent's own name, no force), then call set_function_secret with no value
// every 5 s until the person has pasted the key into the project's .env (the tool reads the file; this prints only
// the tool's answer, which carries the length, never the value). Stays up: the backend stops with its server.
import path from 'node:path';
import { createRequire } from 'node:module';

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const mcpRequire = createRequire(path.join(R, 'packages', 'noodl-mcp', 'package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));

const S = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(S, 'work');
const TGZ = '/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/b8895339-fec5-4f81-966b-d8569071829d/scratchpad/tgz/nodegx-mcp-0.2.0.tgz';
const env = { ...process.env, HOME: path.join(S, 'home'), npm_config_cache: path.join(S, 'home', '.npm') };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];

const client = new Client({ name: 'own017-s16-stack', version: '0' });
await client.connect(new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${TGZ}`, 'noodl-mcp', '--allow-writes'], cwd: WORK, env, stderr: 'ignore' }));
const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
  console.log(`== ${name}${r.isError ? ' (ERROR)' : ''}\n${text(r).slice(0, 1200)}`);
  return r;
};

await call('open_project', { directory: path.join(WORK, 'french-phrases') });
await call('find_tools', { group: 'backend' });
// force: the copy still points at s15's backend (alive, s15's HOME); this copy gets its own (OWN-017 s16).
await call('provision_backend', { name: 'French Phrases backend', force: true });
await call('validate_project', {});
// A fresh HOME is a fresh backend: the function has to be deployed to it (s15's was reused).
await call('deploy_cloud_functions', {});
console.log('WAITING FOR THE KEY IN .env');
for (;;) {
  const r = await client.callTool({ name: 'set_function_secret', arguments: { name: 'GEMINI_API_KEY' } }, undefined, { timeout: 60000 });
  const t = text(r);
  if (!r.isError && /"set": ?true/.test(t)) { console.log('== set_function_secret\n' + t); break; }
  await new Promise((res) => setTimeout(res, 5000));
}
console.log('READY');
// The home-made editor has no deploy button (OWN-017 §6): touching `deploy.now` beside this script deploys, as a
// person would by asking their agent to.
const TRIGGER = path.join(S, 'deploy.now');
const fs = await import('node:fs');
setInterval(async () => {
  if (!fs.existsSync(TRIGGER)) return;
  fs.rmSync(TRIGGER);
  await call('deploy_cloud_functions', {});
  console.log('DEPLOYED');
}, 2000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await client.close(); process.exit(0); });
