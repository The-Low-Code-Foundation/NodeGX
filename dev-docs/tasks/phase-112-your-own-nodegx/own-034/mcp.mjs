// OWN-034 — the MCP door, as own-027/mcp.mjs, but against the kit's own server: the @nodegx/mcp 0.2.8 the D·kit lane
// ran, installed from the registry tarball (OWN034_MCP_BIN = <install>/node_modules/@nodegx/mcp/bin/noodl-mcp.js), so
// the harness lane meets the same tools and validators as D·kit. Stdio, the SDK's own Client; one server per process.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export async function open(projectDir, { bin = process.env.OWN034_MCP_BIN, extraArgs = [] } = {}) {
  if (!bin) throw new Error('set OWN034_MCP_BIN to the kit\'s noodl-mcp.js');
  const args = [bin, ...(projectDir ? [projectDir] : []), '--allow-writes', '--screenshots-to-files', ...extraArgs];
  const transport = new StdioClientTransport({ command: process.execPath, args, stderr: 'pipe' });
  const client = new Client({ name: 'own-034-harness', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);
  const stderr = [];
  transport.stderr?.on('data', (d) => stderr.push(String(d)));
  async function call(name, args = {}) {
    const t = Date.now();
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 600000 });
    const text = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { isError: !!r.isError, text, json, structured: r.structuredContent, content: r.content, ms: Date.now() - t };
  }
  async function tools() { return (await client.listTools()).tools; }
  async function close() { try { await client.close(); } catch {} }
  return { client, call, tools, close, stderr };
}
