/**
 * P112-OWN019-NESTEDCALLTOOL — Mistral Large 4 asks `call_tool` to call `call_tool`. o2 (OWN-019 s4, 2026-10-14) sent
 * `call_tool({ name: "call_tool", arguments: { name: "drive_page", describe: true } })` six times — for
 * create_component, update_component, drive_page and render_report — and got "This server has no tool named
 * call_tool" every time, so it never read one of those tools' arguments. The server's own hint ("call them through
 * call_tool({ name, arguments }) (describe: true …)") reads as if `describe` is one of the arguments. A call_tool
 * nested in call_tool now means the inner call, one level.
 *
 * Control: on HEAD before the fix, the first two tests fail (`not-found`).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

async function session(): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = createServer({ projectDir: undefined, allowWrites: true, deferTools: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'never-relists', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

const call = async (client: Client, args: Record<string, unknown>) => {
  const res = (await client.callTool({ name: 'call_tool', arguments: args })) as { content: Array<{ text: string }> };
  return JSON.parse(res.content[0].text);
};

describe('P112-OWN019-NESTEDCALLTOOL — call_tool through call_tool is the inner call', () => {
  let s: Awaited<ReturnType<typeof session>>;
  beforeAll(async () => {
    s = await session();
  });
  afterAll(async () => {
    await s.close();
  });

  it("describes the tool o2 asked for (Large 4's exact call)", async () => {
    const r = await call(s.client, { name: 'call_tool', arguments: { describe: true, name: 'drive_page' } });
    expect(r.ok).not.toBe(false);
    expect(r.name).toBe('drive_page');
    expect(r.inputSchema?.properties?.steps).toBeDefined();
  });

  it('describes several when the inner name lists them', async () => {
    const r = await call(s.client, { name: 'call_tool', arguments: { describe: true, name: 'create_component,update_component' } });
    expect(r.tools?.map((t: { name: string }) => t.name)).toEqual(['create_component', 'update_component']);
  });

  it('runs the inner call when it carries arguments', async () => {
    const r = await call(s.client, { name: 'call_tool', arguments: { name: 'list_examples', arguments: { query: 'stopwatch' } } });
    expect(r.ok).not.toBe(false);
    expect(Array.isArray(r.examples) || Array.isArray(r)).toBe(true);
  });

  it('still refuses call_tool with no inner name', async () => {
    const r = await call(s.client, { name: 'call_tool' });
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe('not-found');
  });
});
