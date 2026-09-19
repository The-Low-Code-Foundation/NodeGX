/**
 * FED-005 AC5 — the OFFICIAL MCP TypeScript client, against this endpoint.
 *
 * ## Why a real client and not another `fetch`
 *
 * The sibling suites speak JSON-RPC by hand, which measures that this backend
 * answers what those suites think MCP is. That is exactly the kind of agreement
 * a twin gives you: green until the first real client arrives. The whole point
 * of FED-005 is that *somebody pastes an address into Claude on their laptop*,
 * and the only instrument that measures that is the library that laptop runs.
 *
 * So this suite is deliberately thin and deliberately unmocked: connect, list,
 * call, read the answer. Everything it touches is protocol — the handshake, the
 * negotiated version, the content shape, the error shape — and each of those is
 * a place where a hand-rolled server and a real client can disagree while both
 * look correct on their own side. Three of them already did, and are written up
 * where they were fixed:
 *
 *   - `GET /mcp` must be **405**, not the router's 404 (the client special-cases
 *     405 as "no SSE stream"; anything else goes to `onerror`).
 *   - a notification must be **202 with an empty body**.
 *   - a tool failure must be an `isError` RESULT, not a JSON-RPC error, or the
 *     model never sees the reason.
 *
 * ⚠️ The SDK is a **dev dependency of the tests only**. Nothing in `src/` imports
 * it: this backend speaks the protocol directly, so a deployed service carries
 * no MCP library and no transitive dependency of one.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

jest.setTimeout(60_000);

/* eslint-disable @typescript-eslint/no-var-requires */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

interface McpClient {
  connect(transport: unknown): Promise<void>;
  close(): Promise<void>;
  getServerVersion(): { name?: string; version?: string } | undefined;
  getInstructions(): string | undefined;
  listTools(): Promise<{ tools: { name: string; description?: string; inputSchema?: unknown }[] }>;
  callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<{
    content?: { type: string; text?: string }[];
    isError?: boolean;
  }>;
}

const CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: {
      find: 'authenticated',
      get: 'authenticated',
      create: 'authenticated',
      update: 'authenticated',
      delete: 'nobody'
    },
    creatorOwns: true
  },
  collections: {},
  functions: { addNumbers: { call: 'public' } },
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

const WORKFLOW = {
  components: [
    {
      name: '/#__cloud__/addNumbers',
      nodes: [
        {
          id: 'req',
          type: 'noodl.cloud.request',
          x: 0,
          y: 0,
          parameters: { allowNoAuth: true, params: 'a', 'ptype-a': 'number', 'preq-a': true },
          ports: [],
          children: []
        },
        {
          id: 'res',
          type: 'noodl.cloud.response',
          x: 0,
          y: 200,
          parameters: { params: 'echoed' },
          ports: [],
          children: []
        }
      ],
      connections: [
        { sourceId: 'req', sourcePort: 'receive', targetId: 'res', targetPort: 'send' },
        { sourceId: 'req', sourcePort: 'pm-a', targetId: 'res', targetPort: 'pm-echoed' }
      ],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

describe('FED-005 AC5 — the official MCP client', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;
  let apiKey: string;
  let client: McpClient;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed005-client-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(WORKFLOW));

    service = new BackendService({ dataDir, port: 0, backendId: 'fed005c', backendName: 'Distraction' });
    const started = await service.start();
    base = started.listen.url;
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

    const signup = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'client-alice', password: 'pw' })
    });
    const alice = (await signup.json()) as { objectId: string; sessionToken: string };

    await fetch(`${base}/classes/Task`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-parse-session-token': alice.sessionToken },
      body: JSON.stringify({ title: 'read the feed' })
    });

    const keyRes = await fetch(`${base}/admin/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'laptop', scopes: ['classes:*', 'functions:*'], actsAsUserId: alice.objectId })
    });
    apiKey = ((await keyRes.json()) as { secret: string }).secret;

    client = new Client({ name: 'fed-005-spec', version: '1.0.0' }) as McpClient;
    // Exactly the shape a person configures: an address and a key in a header.
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { 'X-NodeGX-Api-Key': apiKey } }
      })
    );
  });

  afterAll(async () => {
    if (client) await client.close();
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC5: it connects, and the handshake names this backend', () => {
    // `connect()` resolving at all is the handshake: initialize, the negotiated
    // protocol version, and `notifications/initialized` — three exchanges the
    // client would have thrown on.
    expect(client.getServerVersion()?.name).toBe('Distraction');
    expect(client.getInstructions()).toContain('NodeGX');
  });

  it('AC5: it lists the tools this key may use', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['Task_create', 'Task_find', 'Task_get', 'Task_update', 'addNumbers']);
    // Every tool the client receives must carry a description and a schema —
    // a tool with neither is one a model cannot choose.
    for (const tool of tools) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description!.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
    }
  });

  it('AC5: it calls a collection tool and reads the row back', async () => {
    const found = await client.callTool({ name: 'Task_find', arguments: {} });
    expect(found.isError).toBeFalsy();
    expect(found.content?.[0]?.text).toContain('read the feed');
  });

  it('AC5: it adds a row, and the row is there', async () => {
    const created = await client.callTool({ name: 'Task_create', arguments: { title: 'added by the client' } });
    expect(created.isError).toBeFalsy();

    const found = await client.callTool({ name: 'Task_find', arguments: { where: { title: 'added by the client' } } });
    expect(found.content?.[0]?.text).toContain('added by the client');
  });

  it('AC5: it calls a cloud function and gets its answer', async () => {
    const answered = await client.callTool({ name: 'addNumbers', arguments: { a: 41 } });
    expect(answered.isError).toBeFalsy();
    expect(answered.content?.[0]?.text).toContain('41');
  });

  it('a tool failure arrives as an isError RESULT the model can read, not as a client exception', async () => {
    // A required parameter the caller omitted: the graph refuses with CWF-014's
    // 400, and the client must hand that text to the model rather than throw.
    const failed = await client.callTool({ name: 'addNumbers', arguments: {} });
    expect(failed.isError).toBe(true);
    // The SENTENCE, not the envelope. The function answers
    // `{"error":"Invalid request body: \"a\" is required", ...}`, and handing a
    // model the whole JSON buries the one useful clause under two levels of
    // escaping — which is what this assertion caught on its first run.
    expect(failed.content?.[0]?.text).toContain('Invalid request body: "a" is required');
    expect(failed.content?.[0]?.text).not.toContain('\\"');
  });

  it('a tool that does not exist rejects at the protocol level', async () => {
    await expect(client.callTool({ name: 'Task_delete', arguments: {} })).rejects.toThrow(/No tool named/);
  });
});
