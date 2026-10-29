// OWN-027 — the MCP door, as a stranger's client meets it: stdio against bin/noodl-mcp.js, the SDK's own Client.
// One server per process. `open()` binds a project at start (`--project`-style positional + --allow-writes);
// `openUnbound()` starts the seven-tool door that only offers create_project / list_projects / examples.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
const BIN = path.join(REPO, 'packages/noodl-mcp/bin/noodl-mcp.js');

export async function open(projectDir, { extraArgs = [] } = {}) {
  const args = [BIN, ...(projectDir ? [projectDir] : []), '--allow-writes', ...extraArgs];
  const transport = new StdioClientTransport({ command: process.execPath, args, stderr: 'pipe' });
  const client = new Client({ name: 'own-027-harness', version: '0.1.0' }, { capabilities: {} });
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
