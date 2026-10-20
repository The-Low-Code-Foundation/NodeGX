/**
 * P112-OWN020-CALLTOOLSTRIP — an argument sent through `call_tool` that the tool does not have is refused by name.
 *
 * P109-S12 refuses one on a direct `tools/call` (the SDK's `validateToolInput`, `unknownArguments.test.ts`). `call_tool`
 * parsed the inner arguments with the tool's own zod schema, which strips a key it does not know, so on the door Vibe
 * and Cline author through the defect was back: DeepSeek V4.1 Flash sent `update_component` its wires as a top-level
 * `connections` beside `set` (OWN-020 CDS1b), got `updated` with 0 errors and 0 warnings, and the wires were gone.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

/** What `call_tool` answers, as far as these specs read it. */
interface ToolAnswer {
  ok?: boolean;
  name?: string;
  inputSchema: { properties: Record<string, unknown> };
  error: { code: string; message: string; details: { unknownArguments?: string[]; didYouMean?: Record<string, string> } };
}

/** The answer's JSON. Read only where a spec reads it: an answer that isn't JSON fails that spec, saying what it was. */
function answerOf(text: string): ToolAnswer {
  try {
    return JSON.parse(text) as ToolAnswer;
  } catch {
    throw new Error(`call_tool answered text that isn't JSON: ${text.slice(0, 200)}`);
  }
}

async function callTool(client: Client, name: string, args?: Record<string, unknown>): Promise<{ isError: boolean; text: string; readonly data: ToolAnswer }> {
  const res = (await client.callTool({ name: 'call_tool', arguments: { name, ...(args ? { arguments: args } : {}) } })) as {
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  };
  const text = res.content?.[0]?.text ?? '';
  return {
    isError: !!res.isError,
    text,
    get data() {
      return answerOf(text);
    }
  };
}

const NODES = [
  { id: 'hm_page', type: 'Page', parameters: { title: 'Desk', urlPath: 'desk' } },
  { id: 'hm_btn', type: 'Button', parent: 'hm_page', parameters: { label: 'Go' } },
  { id: 'hm_var', type: 'Variable', label: 'Clicked', parameters: { value: 'no' } },
  { id: 'hm_set', type: 'Set Variable', label: 'Mark clicked', parameters: { name: 'Clicked', value: 'yes' } }
];
const WIRE = { fromId: 'hm_btn', fromProperty: 'onClick', toId: 'hm_set', toProperty: 'do' };

describe('P112-OWN020-CALLTOOLSTRIP — call_tool refuses an argument the tool does not have', () => {
  let root: string;
  let dir: string;
  let client: Client;
  let close: () => Promise<void>;

  const connectionsOnDisk = () =>
    JSON.parse(fs.readFileSync(path.join(dir, 'components', 'Pages', 'Desk', 'connections.json'), 'utf8')).connections;
  const nodesOnDisk = () => fs.readFileSync(path.join(dir, 'components', 'Pages', 'Desk', 'nodes.json'), 'utf8');

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'own020-calltoolstrip-'));
    dir = path.join(root, 'app');
    const { server } = createServer({ projectDir: undefined, allowWrites: true, deferTools: true });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'cline-like', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    close = async () => {
      await client.close();
      await server.close();
    };
    expect((await callTool(client, 'create_project', { directory: dir, name: 'App', request: 'An app.' })).isError).toBe(false);
    const created = await callTool(client, 'create_component', { path: 'Pages/Desk', nodes: NODES, visual_roots: ['hm_page'] });
    expect(created.text).not.toContain("\"ok\":false");
  });

  afterEach(async () => {
    await close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("refuses CDS1b's call by name — wires beside `set`, not in it — and writes nothing", async () => {
    const before = nodesOnDisk();
    const res = await callTool(client, 'update_component', {
      path: 'Pages/Desk',
      set: { nodes: [...NODES, { id: 'hm_txt', type: 'Text', parent: 'hm_page', parameters: { text: 'x' } }], visual_roots: ['hm_page'] },
      connections: [WIRE]
    });
    expect(res.isError).toBe(false);
    expect(res.data.ok).toBe(false);
    expect(res.data.error.code).toBe('invalid-argument');
    expect(res.data.error.message).toContain('update_component has no argument "connections"');
    expect(res.data.error.details.unknownArguments).toEqual(['connections']);
    expect(nodesOnDisk()).toBe(before);
  });

  it('offers the declared spelling, as a direct call does', async () => {
    const res = await callTool(client, 'create_component', { path: 'Pages/Two', nodes: NODES, visualRoots: ['hm_page'] });
    expect(res.data.ok).toBe(false);
    expect(res.data.error.details.didYouMean).toEqual({ visualRoots: 'visual_roots' });
    expect(fs.existsSync(path.join(dir, 'components', 'Pages', 'Two'))).toBe(false);
  });

  it('the same call with the wires inside `set` writes them (the control)', async () => {
    const res = await callTool(client, 'update_component', {
      path: 'Pages/Desk',
      set: { nodes: NODES, connections: [WIRE], visual_roots: ['hm_page'] }
    });
    expect(res.data.ok).not.toBe(false);
    expect(connectionsOnDisk()).toEqual(expect.arrayContaining([expect.objectContaining({ fromId: 'hm_btn', toId: 'hm_set' })]));
  });

  it('still reads `describe: true` inside the arguments as the flag, for a tool with no `describe` of its own', async () => {
    const res = await callTool(client, 'update_component', { describe: true });
    expect(res.data.ok).not.toBe(false);
    expect(res.data.name).toBe('update_component');
    expect(Object.keys(res.data.inputSchema.properties)).toContain('set');
  });
});
