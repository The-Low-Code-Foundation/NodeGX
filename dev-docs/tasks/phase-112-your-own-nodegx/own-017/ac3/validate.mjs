// OWN-017 AC3: validate_project, read-only, through the checkout's built MCP, on a given project folder.
import { createRequire } from 'node:module';
const mcpRequire = createRequire('/Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-mcp/package.json');
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const dir = process.argv[2];
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
const client = new Client({ name: 'own017-validate', version: '0' });
await client.connect(new StdioClientTransport({ command: 'node', args: ['/Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-mcp/dist/noodl-mcp.cjs', dir], env, stderr: 'ignore' }));
const r = await client.callTool({ name: 'validate_project', arguments: {} });
const t = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
try { const j = JSON.parse(t); console.log(JSON.stringify({ summary: j.summary, codes: j.diagnostics.map((d) => `${d.severity} ${d.code} ${d.location?.component || ''}`) })); } catch { console.log(t.slice(0, 2000)); }
await client.close();
