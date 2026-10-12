/**
 * P112-OWN018-LISTCHANGED — `call_tool`, for a client that lists tools once and never again.
 *
 * Measured 2026-10-12 with Mistral Vibe 2.26.1: started on a bootstrap server it keeps the bootstrap tools for the
 * whole session, so after `create_project` binds, every authoring tool is "Unknown tool" to it. These specs play that
 * client: they read `tools/list` once at the start and then reach everything else through `call_tool`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';
import { BOOTSTRAP_ADVERTISED, TOOL_GROUPS } from '../src/toolGroups';

interface Result {
  isError: boolean;
  text: string;
  data: any;
}

async function bootstrapSession(home: string): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = createServer({ projectDir: undefined, allowWrites: true, deferTools: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'never-relists', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  void home;
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

async function callTool(client: Client, name: string, args?: Record<string, unknown>, describe?: boolean): Promise<Result> {
  const res = (await client.callTool({
    name: 'call_tool',
    arguments: { name, ...(args ? { arguments: args } : {}), ...(describe ? { describe } : {}) }
  })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
  const text = res.content?.[0]?.text ?? '';
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { isError: !!res.isError, text, data };
}

const PAGE = (prefix: string, title: string) => [
  { id: `${prefix}_page`, type: 'Page', parameters: { title, urlPath: title.toLowerCase() } },
  { id: `${prefix}_text`, type: 'Text', parent: `${prefix}_page`, parameters: { text: `Hello from ${title}` } }
];

describe('P112-OWN018-LISTCHANGED — call_tool reaches every tool for a client that never re-lists', () => {
  let root: string;
  let session: { client: Client; close(): Promise<void> };
  let listedOnce: string[];

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-calltool-'));
    session = await bootstrapSession(root);
    // The one tools/list this client ever reads.
    listedOnce = (await session.client.listTools()).tools.map((t) => t.name);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('is in the bootstrap list, beside find_tools', () => {
    expect(listedOnce.sort()).toEqual([...BOOTSTRAP_ADVERTISED].sort());
    expect(listedOnce).toContain('call_tool');
    expect(listedOnce).not.toContain('create_component');
  });

  it('refuses a project tool while no project is open, naming the two exits', async () => {
    const res = await callTool(session.client, 'get_project_info');
    // P112-OWN018-OPAQUEERRORS — an answer, not isError, so a harness that blanks error results still shows it.
    expect(res.isError).toBe(false);
    expect(res.data.ok).toBe(false);
    expect(res.data.tool).toBe('get_project_info');
    expect(res.data.error.code).toBe('no-project');
    expect(res.text).toContain('create_project');
    expect(res.text).toContain('open_project');
  });

  it('after create_project binds, builds the app with tools its list never showed', async () => {
    const dir = path.join(root, 'notes');
    const created = await callTool(session.client, 'create_project', {
      directory: dir,
      name: 'Notes',
      request: 'A tiny notes app.'
    });
    expect(created.isError).toBe(false);
    expect(created.data.bound.note).toContain('call_tool');

    const info = await callTool(session.client, 'get_project_info');
    expect(info.isError).toBe(false);
    expect(fs.realpathSync(info.data.projectDir ?? info.data.directory ?? dir)).toBe(fs.realpathSync(dir));

    const page = await callTool(session.client, 'create_component', { path: 'Pages/About', nodes: PAGE('ab', 'About') });
    expect(page.isError).toBe(false);
    expect(fs.existsSync(path.join(dir, 'components', 'Pages', 'About', 'nodes.json'))).toBe(true);

    // A deferred group's tool, never advertised to anyone yet, is one call away too.
    const explore = TOOL_GROUPS.find((g) => g.id === 'explore')!.tools[0];
    const described = await callTool(session.client, explore, undefined, true);
    expect(described.isError).toBe(false);
    expect(described.data.name).toBe(explore);
    expect(described.data.inputSchema.type).toBe('object');

    // And still none of this ever reached the client's list.
    expect(listedOnce).not.toContain('get_project_info');
  });

  it("hands back the tool's own refusal, diagnostics and all", async () => {
    await callTool(session.client, 'create_project', { directory: path.join(root, 'app'), name: 'App', request: 'An app.' });
    const res = await callTool(session.client, 'create_component', {
      path: 'Components/Dead',
      nodes: [
        { id: 'btn', type: 'Button', label: 'Go' },
        { id: 'go', type: 'RouterNavigate', label: 'Go nowhere' }
      ],
      connections: [{ fromId: 'btn', fromProperty: 'onClick', toId: 'go', toProperty: 'navigate' }],
      visual_roots: ['btn']
    });
    expect(res.isError).toBe(false);
    expect(res.data.ok).toBe(false);
    expect(res.data.error.code).toBe('validation-failed');
    expect(res.text).toContain('unresolved-navigation');
  });

  it("checks arguments against the tool's own schema, and says how to read it", async () => {
    await callTool(session.client, 'create_project', { directory: path.join(root, 'app'), name: 'App', request: 'An app.' });
    const res = await callTool(session.client, 'create_component', { path: 'Pages/X', nodes: 'not a list' });
    expect(res.isError).toBe(false);
    expect(res.data.ok).toBe(false);
    expect(res.data.error.code).toBe('invalid-argument');
    expect(res.text).toContain('describe: true');

    const schema = await callTool(session.client, 'create_component', undefined, true);
    expect(Object.keys(schema.data.inputSchema.properties)).toEqual(expect.arrayContaining(['path', 'nodes']));
  });

  it('says which tools exist when the name is wrong, and never calls itself', async () => {
    const wrong = await callTool(session.client, 'create_componnet');
    expect(wrong.data.ok).toBe(false);
    expect(wrong.data.error.code).toBe('not-found');
    expect(wrong.text).toContain('create_component');

    const self = await callTool(session.client, 'call_tool');
    expect(self.data.ok).toBe(false);
    expect(self.data.error.code).toBe('not-found');
  });
});
