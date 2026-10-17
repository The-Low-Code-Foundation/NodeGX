// OWN-008: `validate_project` on a saved folder through the published @nodegx/mcp@0.2.2, read-only (no
// --allow-writes). The caller sets HOME. Prints one JSON line: the summary and every diagnostic's key.
import { createRequire } from 'node:module';
const mcpRequire = createRequire(new URL('../../../../packages/noodl-mcp/package.json', import.meta.url).pathname);
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));

const dir = process.argv[2];
const client = new Client({ name: 'own008-validate', version: '0' });
await client.connect(new StdioClientTransport({
  command: 'npx', args: ['-y', '@nodegx/mcp@0.2.2', dir], env: process.env, stderr: 'ignore'
}));
const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const r = JSON.parse(text(await client.callTool({ name: 'validate_project', arguments: {} })));
console.log(JSON.stringify({
  summary: r.summary,
  codes: r.diagnostics.map((d) => `${d.severity} ${d.code} ${d.location?.component || ''}`)
}));
await client.close();
