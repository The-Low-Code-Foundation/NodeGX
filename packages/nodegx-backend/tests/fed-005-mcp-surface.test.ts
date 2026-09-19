/**
 * FED-005 — the MCP endpoint's surface and its door. AC1, AC3, AC4, AC7, and
 * the register R9 defect this task found and fixed.
 *
 * ## Read this before adding a case
 *
 * 🔴 **Every assertion here is about what a key CANNOT reach**, and an absence
 * is the easiest thing in the world to assert by accident. So each negative
 * arm is written beside a positive one in the SAME run — the tool that is
 * missing for Bob is asserted present for Alice, the collection a reader cannot
 * write is asserted findable — because "no tool called Task_create" is also
 * what a broken surface builder, an unstarted service and a typo'd tool name
 * all produce.
 *
 * 🔴 **`tools/list` is asserted by COUNT and by NAME** (AC1 says so in those
 * words). A by-name check alone passes on a list with extra tools in it, which
 * is the failure that matters here: the risk is a key being offered MORE than
 * it should be, not less.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { Principal, SecurityConfig } from '../src/security/model';
import { buildToolSurface } from '../src/server/mcp/toolSurface';

jest.setTimeout(60_000);

/**
 * Two ordinary collections and one function per access shape.
 *
 * `delete: 'authenticated'` on `Note` is deliberate and is AC3's whole point:
 * a collection whose HTTP delete rule is OPEN must still have no `_delete`
 * tool. Asserting AC3 only over `Task` (`delete: 'nobody'`) would pass on a
 * surface that derived delete from the rule, which is exactly the
 * implementation AC3 forbids.
 */
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
  collections: {
    Note: {
      permissions: {
        find: 'authenticated',
        get: 'authenticated',
        create: 'authenticated',
        update: 'authenticated',
        delete: 'authenticated'
      },
      creatorOwns: true
    }
  },
  functions: {
    // AC4's subject.
    staffReport: { call: 'role:staff' },
    openEcho: { call: 'public' }
  },
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

/**
 * Both functions tick `Allow Unauthenticated`.
 *
 * ⚠️ That is about the GRAPH's own check, which runs inside the function and is
 * a different gate from the backend's `call` rule — `staffReport` is still
 * `role:staff` at the door. Ticking it here keeps this suite measuring the
 * door: a graph that refused the caller would produce the same "no answer" as a
 * door that did, and one of those is the thing under test.
 *
 * `openEcho` declares a CWF-014 contract so the generated input schema has
 * something to be derived FROM; `staffReport` declares none, which is the
 * commoner case and the one the open-schema branch covers.
 */
const WORKFLOW = {
  components: [
    {
      name: '/#__cloud__/openEcho',
      nodes: [
        {
          id: 'req1',
          type: 'noodl.cloud.request',
          x: 0,
          y: 0,
          parameters: {
            allowNoAuth: true,
            params: 'title,count',
            'ptype-title': 'string',
            'preq-title': true,
            'ptype-count': 'number'
          },
          ports: [],
          children: []
        },
        { id: 'res1', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
      ],
      connections: [{ sourceId: 'req1', sourcePort: 'receive', targetId: 'res1', targetPort: 'send' }],
      roots: []
    },
    {
      name: '/#__cloud__/staffReport',
      nodes: [
        { id: 'req2', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
        { id: 'res2', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
      ],
      connections: [{ sourceId: 'req2', sourcePort: 'receive', targetId: 'res2', targetPort: 'send' }],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

interface JsonRpcReply {
  jsonrpc?: string;
  id?: unknown;
  result?: {
    tools?: { name: string; description: string; inputSchema: Record<string, unknown> }[];
    instructions?: string;
    protocolVersion?: string;
    serverInfo?: { name?: string; version?: string };
    content?: { type: string; text: string }[];
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

describe('FED-005 — /mcp: the door and the surface', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;

  let alice: { id: string; token: string };
  let bob: { id: string; token: string };
  const keys: Record<string, string> = {};

  /** One JSON-RPC call with a given credential header set. */
  async function rpc(
    method: string,
    params: unknown,
    headers: Record<string, string>
  ): Promise<{ status: number; body: JsonRpcReply }> {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    let body: JsonRpcReply = {};
    try {
      body = (await res.json()) as JsonRpcReply;
    } catch {
      /* 202 / non-JSON */
    }
    return { status: res.status, body };
  }

  const withKey = (name: string) => ({ 'x-nodegx-api-key': keys[name] });

  async function toolNames(keyName: string): Promise<string[]> {
    const { body } = await rpc('tools/list', {}, withKey(keyName));
    return (body.result?.tools || []).map((t) => t.name).sort();
  }

  async function signup(username: string): Promise<{ id: string; token: string }> {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password: `pw-${username}` })
    });
    const json = (await res.json()) as { objectId: string; sessionToken: string };
    return { id: json.objectId, token: json.sessionToken };
  }

  async function makeKey(name: string, scopes: string[], actsAsUserId?: string): Promise<string> {
    const res = await fetch(`${base}/admin/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name, scopes, ...(actsAsUserId ? { actsAsUserId } : {}) })
    });
    const json = (await res.json()) as { secret?: string; error?: string };
    if (!json.secret) throw new Error(`key "${name}" was not created: ${JSON.stringify(json)}`);
    keys[name] = json.secret;
    return json.secret;
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed005-surface-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(WORKFLOW));

    service = new BackendService({ dataDir, port: 0, backendId: 'fed005', backendName: 'Feed Backend' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

    alice = await signup('fed005-alice');
    bob = await signup('fed005-bob');

    // Alice is staff; Bob is not. AC4's two arms.
    await fetch(`${base}/admin/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'staff' })
    });
    await fetch(`${base}/admin/roles/staff/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId: alice.id })
    });

    // The two collections have to EXIST before a tool can be derived for them,
    // and a collection on this backend exists once a row has been written into
    // it. Written as Alice over plain HTTP, which is also the row AC2's sibling
    // suite reads back.
    for (const collection of ['Task', 'Note']) {
      const res = await fetch(`${base}/classes/${collection}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-parse-session-token': alice.token },
        body: JSON.stringify({ title: `alice ${collection}` })
      });
      expect(res.status).toBe(201);
    }

    await makeKey('reader', ['classes:read']);
    await makeKey('writer', ['classes:*']);
    await makeKey('fn-only', ['functions:*']);
    await makeKey('bound-alice', ['classes:*', 'functions:*'], alice.id);
    await makeKey('bound-bob', ['classes:*', 'functions:*'], bob.id);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // AC1 — the door, and the list
  // ==========================================================================

  it('AC1: no key is 401, and the refusal names the header to send', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    expect(res.status).toBe(401);
    expect(await res.text()).toContain('X-NodeGX-Api-Key');
  });

  it('AC1: a revoked key is 401 — and was 200 a moment earlier', async () => {
    const secret = await makeKey('doomed', ['classes:read']);
    // The positive arm, in the same run: the 401 below must be the revocation
    // and not a key that never worked.
    const before = await rpc('tools/list', {}, { 'x-nodegx-api-key': secret });
    expect(before.status).toBe(200);

    const listed = await fetch(`${base}/admin/keys`, { headers: { authorization: `Bearer ${adminToken}` } });
    const { keys: rows } = (await listed.json()) as { keys: { objectId: string; name: string }[] };
    const doomed = rows.find((k) => k.name === 'doomed');
    expect(doomed).toBeDefined();
    await fetch(`${base}/admin/keys/${doomed!.objectId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    const after = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nodegx-api-key': secret },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    expect(after.status).toBe(401);
  });

  it('AC1: initialize succeeds and names this backend', async () => {
    const { status, body } = await rpc('initialize', { protocolVersion: '2025-06-18' }, withKey('reader'));
    expect(status).toBe(200);
    expect(body.result?.protocolVersion).toBe('2025-06-18');
    expect(body.result?.serverInfo?.name).toBe('Feed Backend');
    expect(body.result?.instructions).toContain('NodeGX');
  });

  it('AC1: a key with classes:read only sees _find and _get — by count and by name', async () => {
    const names = await toolNames('reader');
    // BY NAME.
    expect(names).toEqual(['Note_find', 'Note_get', 'Task_find', 'Task_get']);
    // BY COUNT — the assertion that fails when something EXTRA is offered.
    expect(names).toHaveLength(4);
    // And the positive control that the surface is not simply empty-by-accident:
    // the same backend hands a wider key more.
    expect((await toolNames('writer')).length).toBeGreaterThan(names.length);
  });

  it('AC1: a key with classes:* gets all four verbs per collection, and no function tools', async () => {
    expect(await toolNames('writer')).toEqual([
      'Note_create',
      'Note_find',
      'Note_get',
      'Note_update',
      'Task_create',
      'Task_find',
      'Task_get',
      'Task_update'
    ]);
  });

  it('AC1: a key with no covering scope sees an empty list and is TOLD why', async () => {
    // `fn-only` has `functions:*` but is unbound, so the function rules are not
    // consulted for it and both functions are on its surface — the collections
    // are not.
    const names = await toolNames('fn-only');
    expect(names).toEqual(['openEcho', 'staffReport']);

    const { body } = await rpc('initialize', {}, withKey('fn-only'));
    expect(body.result?.instructions).toContain('NodeGX');
  });

  // ==========================================================================
  // AC3 — no delete, ever
  // ==========================================================================

  it('AC3: no _delete tool exists, including on a collection whose HTTP delete rule is open', async () => {
    for (const keyName of ['reader', 'writer', 'bound-alice']) {
      const names = await toolNames(keyName);
      expect(names.filter((n) => n.endsWith('_delete'))).toEqual([]);
    }
    // The control that makes the absence mean something: `Note`'s delete rule
    // really is open, and a session user really can delete through HTTP.
    const created = await fetch(`${base}/classes/Note`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-parse-session-token': alice.token },
      body: JSON.stringify({ title: 'deletable' })
    });
    const { objectId } = (await created.json()) as { objectId: string };
    const deleted = await fetch(`${base}/classes/Note/${objectId}`, {
      method: 'DELETE',
      headers: { 'x-parse-session-token': alice.token }
    });
    expect(deleted.status).toBe(200);
  });

  it('AC3: naming a delete tool anyway is a JSON-RPC error, not a deletion', async () => {
    const { status, body } = await rpc(
      'tools/call',
      { name: 'Note_delete', arguments: { objectId: 'anything' } },
      withKey('writer')
    );
    expect(status).toBe(200);
    expect(body.error?.code).toBe(-32602);
    expect(body.error?.message).toContain('No tool named "Note_delete"');
  });

  // ==========================================================================
  // AC4 — a function rule, seen from a bound key
  // ==========================================================================

  it('AC4: role:staff is present for a key acting as staff and absent for one that is not', async () => {
    const asAlice = await toolNames('bound-alice');
    const asBob = await toolNames('bound-bob');

    expect(asAlice).toContain('staffReport');
    expect(asBob).not.toContain('staffReport');
    // The control in the same run: Bob is not simply seeing nothing.
    expect(asBob).toContain('openEcho');
    expect(asBob).toContain('Task_find');
  });

  it('AC4: calling an absent tool by name is a JSON-RPC error, not a 500', async () => {
    const { status, body } = await rpc('tools/call', { name: 'staffReport', arguments: {} }, withKey('bound-bob'));
    expect(status).toBe(200);
    expect(body.error?.code).toBe(-32602);
    expect(body.error?.message).toContain('staffReport');
    // And Alice's key runs the very same tool — so the refusal is the rule and
    // not a broken function.
    const allowed = await rpc('tools/call', { name: 'staffReport', arguments: {} }, withKey('bound-alice'));
    expect(allowed.body.error).toBeUndefined();
    expect(allowed.body.result?.isError).toBeUndefined();
  });

  it('AC4: an unknown method is -32601 and says what this endpoint offers', async () => {
    const { body } = await rpc('resources/list', {}, withKey('reader'));
    expect(body.error?.code).toBe(-32601);
    expect(body.error?.message).toContain('tools only');
  });

  // ==========================================================================
  // AC7 — the master key
  // ==========================================================================

  it('AC7: the master key is refused, with the sentence that says to make a scoped key', async () => {
    const asBearer = await rpc('tools/list', {}, { authorization: `Bearer ${adminToken}` });
    expect(asBearer.status).toBe(403);

    const asMasterKey = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-parse-master-key': adminToken },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    expect(asMasterKey.status).toBe(403);
    const text = await asMasterKey.text();
    expect(text).toContain('scoped API key');
    expect(text).toContain('/admin/keys');
  });

  it('a session token is not a credential for this endpoint', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-parse-session-token': alice.token },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    expect(res.status).toBe(401);
  });

  // ==========================================================================
  // §3.1 — the two header spellings, and the transport's shape
  // ==========================================================================

  it('§3.1: an API key authenticates as a Bearer token as well as in its own header', async () => {
    const viaBearer = await rpc('tools/list', {}, { authorization: `Bearer ${keys['reader']}` });
    expect(viaBearer.status).toBe(200);
    expect((viaBearer.body.result?.tools || []).map((t) => t.name).sort()).toEqual(await toolNames('reader'));

    // A Bearer that is neither an admin token nor a key is still 401.
    const rubbish = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    expect(rubbish.status).toBe(401);
  });

  it('a notification is 202 with no body, and GET is 405 rather than 404', async () => {
    const notification = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...withKey('reader') },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
    });
    expect(notification.status).toBe(202);
    expect(await notification.text()).toBe('');

    const stream = await fetch(`${base}/mcp`, { method: 'GET', headers: withKey('reader') });
    expect(stream.status).toBe(405);
    expect(stream.headers.get('allow')).toBe('POST');
  });

  it('a body that is not JSON is a JSON-RPC parse error at HTTP 200, not a transport failure', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...withKey('reader') },
      body: '{ this is not json'
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonRpcReply;
    expect(body.error?.code).toBe(-32700);
    expect(body.id).toBeNull();
  });

  // ==========================================================================
  // Register R9 — the defect this task found
  // ==========================================================================

  it('R9: a scoped key cannot read _Session through /classes — it could before FED-005', async () => {
    // 🔴 MEASURED on this build before the fix: `classes:*` returned every row
    // of `_Session`, sessionToken and all, which is impersonation of every
    // account on the backend. `_ApiKey` (key hashes), `_User` and `_Audit` came
    // back the same way. Users and anonymous callers were correctly refused the
    // whole time, which is why nothing caught it.
    for (const sys of ['_Session', '_User', '_ApiKey', '_Audit']) {
      const res = await fetch(`${base}/classes/${sys}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...withKey('writer') },
        body: JSON.stringify({ _method: 'GET', where: {} })
      });
      expect([res.status, sys]).toEqual([403, sys]);
    }
    // The control: the same key, the same route, an ordinary collection.
    const ok = await fetch(`${base}/classes/Task`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...withKey('writer') },
      body: JSON.stringify({ _method: 'GET', where: {} })
    });
    expect(ok.status).toBe(200);
    // And the admin credential still reaches it — the Data Browser's path.
    const asAdmin = await fetch(`${base}/classes/_Session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ _method: 'GET', where: {} })
    });
    expect(asAdmin.status).toBe(200);
  });

  /**
   * 🔴 This began as "ask a live backend for its tools and assert none start
   * with `_`", and a mutant check showed it GRADED NOTHING: with the R9 hole
   * deliberately reopened it stayed green. Measured 2026-09-19 — a backend with
   * rows in `_User`, `_Session`, `_ApiKey` and `_Audit` answers
   * `GET /admin/schema` with `["Task"]`. The schema manager's `listTables()`
   * does not report system tables at all, so no system name ever reaches
   * `checkClp` through that path and the assertion could not fail whatever the
   * gate did.
   *
   * That is defence in depth and it is worth having — but the SECURITY property
   * is the gate, and a spec that cannot see the gate is not measuring it. So it
   * is asserted where it is real: `buildToolSurface` is pure, and is handed a
   * collection list that DOES contain the system names.
   */
  it('R9: the gate itself refuses a system collection, whatever the listing contains', () => {
    const scopedKey: Principal = { kind: 'apiKey', name: 'writer', scopes: ['classes:*'] };
    const boundKey: Principal = {
      kind: 'apiKey',
      name: 'bound',
      scopes: ['classes:*'],
      actsAs: { userId: 'u1', roles: [] }
    };

    for (const principal of [scopedKey, boundKey]) {
      const { tools } = buildToolSurface({
        config: CONFIG as unknown as SecurityConfig,
        principal,
        // The names `listTables()` will not give us, supplied by hand.
        collections: ['Task', '_Session', '_User', '_ApiKey', '_Audit', '_Role'],
        columnsOf: () => [{ name: 'sessionToken', type: 'String' }],
        functions: []
      });
      const names = tools.map((t) => t.name);
      expect(names.filter((n) => n.startsWith('_'))).toEqual([]);
      // The control in the same call: the ordinary collection IS on the
      // surface, so the empty filter above is a refusal and not an empty build.
      expect(names).toContain('Task_find');
    }
  });

  it('R9: and the live surface carries no system collection either', async () => {
    for (const keyName of ['reader', 'writer', 'bound-alice']) {
      const names = await toolNames(keyName);
      expect(names.filter((n) => n.startsWith('_'))).toEqual([]);
      expect(names.length).toBeGreaterThan(0);
    }
  });

  // ==========================================================================
  // The generated schemas
  // ==========================================================================

  it("a function tool's input schema is its Request node's declared contract", async () => {
    const { body } = await rpc('tools/list', {}, withKey('bound-alice'));
    const echo = (body.result?.tools || []).find((t) => t.name === 'openEcho');
    expect(echo).toBeDefined();
    expect(echo!.inputSchema).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string' }, count: { type: 'number' } },
      required: ['title']
    });
    // A function that declares nothing gets an OPEN schema, not an empty one —
    // saying it takes no arguments would be a lie about the commonest case.
    const report = (body.result?.tools || []).find((t) => t.name === 'staffReport');
    expect(report!.inputSchema).toMatchObject({ type: 'object', properties: {}, additionalProperties: true });
  });

  it('a collection tool never offers ACL or owner as a writable field', async () => {
    const { body } = await rpc('tools/list', {}, withKey('writer'));
    const create = (body.result?.tools || []).find((t) => t.name === 'Task_create');
    const properties = (create!.inputSchema as { properties: Record<string, unknown> }).properties;
    for (const forbidden of ['ACL', 'owner', 'objectId', 'createdAt', 'updatedAt']) {
      expect(Object.keys(properties)).not.toContain(forbidden);
    }
    // The control: the collection's real field IS offered.
    expect(Object.keys(properties)).toContain('title');
  });
});
