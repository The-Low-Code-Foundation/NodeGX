/**
 * P128-S3-NAMEMISMATCH — the `.mcpb` manifest is named `nodegx` and the server answered `initialize` as `noodl-mcp`.
 * A Claude Desktop report (anthropics/claude-code#70397) says an extension's tools reach the chat only when the two
 * match. The `.mcpb` now passes NODEGX_SERVER_NAME; every other client keeps `noodl-mcp`.
 *
 * The instrument is the handshake itself: an in-process client reads `serverInfo` from `initialize`.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

async function handshakeName(env: string | undefined): Promise<string | undefined> {
  const before = process.env.NODEGX_SERVER_NAME;
  if (env === undefined) delete process.env.NODEGX_SERVER_NAME;
  else process.env.NODEGX_SERVER_NAME = env;
  try {
    const { server } = createServer({ allowWrites: true });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'p128-name', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const name = client.getServerVersion()?.name;
    await client.close();
    await server.close();
    return name;
  } finally {
    if (before === undefined) delete process.env.NODEGX_SERVER_NAME;
    else process.env.NODEGX_SERVER_NAME = before;
  }
}

describe('P128-S3-NAMEMISMATCH — the handshake can carry the extension\'s name', () => {
  it('the .mcpb\'s NODEGX_SERVER_NAME is the name initialize answers with', async () => {
    expect(await handshakeName('nodegx')).toBe('nodegx');
  });

  it('without it (Claude Code, Cline, the editor) the name stays noodl-mcp', async () => {
    expect(await handshakeName(undefined)).toBe('noodl-mcp');
  });

  it('an empty value is no name', async () => {
    expect(await handshakeName('')).toBe('noodl-mcp');
  });
});
