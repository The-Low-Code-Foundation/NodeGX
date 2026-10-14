// OWN-017 AC3: validate_project on the edited copy, through the packed MCP 0.2.0 (read-only: no provisioning).
import path from 'node:path';
import { createRequire } from 'node:module';
const mcpRequire = createRequire('/Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-mcp/package.json');
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const S = path.dirname(new URL(import.meta.url).pathname);
const TGZ = '/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/b8895339-fec5-4f81-966b-d8569071829d/scratchpad/tgz/nodegx-mcp-0.2.0.tgz';
const env = { ...process.env, HOME: path.join(S, 'home'), npm_config_cache: path.join(S, 'home', '.npm') };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
const client = new Client({ name: 'own017-validate', version: '0' });
await client.connect(new StdioClientTransport({ command: 'npx', args: ['-y', `--package=${TGZ}`, 'noodl-mcp', path.join(S, 'work', 'french-phrases')], cwd: path.join(S, 'work'), env, stderr: 'inherit' }));
const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

const r = JSON.parse(text(await client.callTool({ name: 'validate_project', arguments: {} })));
console.log(JSON.stringify({ summary: r.summary, codes: r.diagnostics.map((d) => `${d.severity} ${d.code} ${d.location?.component || ''}`) }));
await client.close();
