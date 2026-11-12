/**
 * NPMAUDIT-MCPREADME — what the server says about itself, where a model or a person reads it, matches what it does.
 *
 * The stranger audit (2026-10-23): `create_project`'s description said "Point a new server at the created directory",
 * and its result's `note` said "start a server against this directory", beside `bound: true` from a server that had
 * just bound itself (BST-002). `--help` said bootstrap mode advertises six tools (it is seven: `call_tool`) and "60 of
 * the 89 tools are backend admin" (115 and 65 when measured). The npm README half of the row is not graded here.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';
import { BOOTSTRAP_ADVERTISED, TOOL_GROUPS } from '../src/toolGroups';
import type { CreateProjectResponse } from '../src/tools/createProject';
import { USAGE } from '../src/usage';

const SCOPE = { name: 'Reading List', request: 'a reading list app', summary: 'A private reading list.', agreed: true };

async function bootstrapClient(): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = createServer({ allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'mcpreadme-test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, close: async () => (await client.close(), await server.close()) };
}

describe('NPMAUDIT-MCPREADME — the server describes itself as it is', () => {
  let tmp: string;
  beforeEach(() => (tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpreadme-'))));
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("create_project's description says the server binds, not that a new one is needed", async () => {
    const { client, close } = await bootstrapClient();
    const tool = (await client.listTools()).tools.find((t) => t.name === 'create_project')!;
    await close();
    expect(tool.description).not.toContain('Point a new server');
    expect(tool.description).toContain('A server with no project binds to the new one');
  });

  it('a create that bound this server says to build here; its note no longer sends the agent to start one', async () => {
    const { client, close } = await bootstrapClient();
    const res = (await client.callTool({ name: 'create_project', arguments: { ...SCOPE, directory: path.join(tmp, 'rl') } })) as {
      content: Array<{ text: string }>;
    };
    await close();
    const data = JSON.parse(res.content[0].text) as CreateProjectResponse;
    expect(data.bound?.bound).toBe(true);
    expect(data.note).toContain('from this conversation');
    expect(data.note).not.toContain('start a server');
  });

  it('--help counts its tools from the manifest', () => {
    const all = new Set(TOOL_GROUPS.flatMap((g) => g.tools)).size;
    const backend = TOOL_GROUPS.find((g) => g.id === 'backend')!.tools.length;
    expect(USAGE).toContain(`${backend} of the`);
    expect(USAGE.replace(/\s+/g, ' ')).toContain(`${backend} of the ${all} tools are backend admin`);
    expect(USAGE.replace(/\s+/g, ' ')).toContain(`it advertises ${BOOTSTRAP_ADVERTISED.join(', ')}, and nothing else`);
    expect(USAGE).not.toMatch(/\$\{/);
  });
});
