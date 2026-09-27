/**
 * FED-005 §3.3 — whose rows does an API key see? AC2, AC5 and AC6.
 *
 * ## The half that can be got quietly wrong
 *
 * This is the suite the task file warns about: *"a key that sees too much
 * passes every functional test there is."* Every assertion here is therefore a
 * PAIR — Alice's key sees Alice's row, and in the same breath does not see
 * Bob's, which exists and is findable by somebody. A one-sided "Alice sees her
 * row" is green on a backend with no isolation at all.
 *
 * ## AC2's third clause is the one that matters most
 *
 * "a raw HTTP `find` with the same key returns the same set." If MCP narrowed
 * and `/classes` did not, the binding would be a decoration: an attacker
 * holding the key would simply use the other door. So `aclFor` is where the
 * narrowing lives, and this suite reads the same key through both.
 *
 * ## AC6 and what "one row per call" can honestly mean here
 *
 * The trail belongs to a BACKEND, and each spec file in this package provisions
 * its own. A claim about "the calls from AC1–AC5" across files would be a claim
 * about four different `_Audit` tables. So it is asserted where it is
 * measurable: every tool call this suite makes writes exactly one row, with
 * §3.4's fields, and a call that FAILS writes one too — an audit trail that
 * records only successes answers none of the questions it exists for.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { AUDIT_MCP_TOOL_CALL } from '../src/ops/audit-actions';

jest.setTimeout(60_000);

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
  functions: { whoAmI: { call: 'authenticated' } },
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

/**
 * `whoAmI` answers with the user the graph saw.
 *
 * ⚠️ `allowNoAuth` is FALSE here on purpose, and it is the point of the
 * function: it is the gate that lives INSIDE the graph, which no backend rule
 * can wave. A bound key reaches it only because `sessionForGraph` mints an
 * ephemeral session for the user it acts as — so this function passing is the
 * measurement that the binding is visible to code the person wrote, and not
 * only to the security model.
 */
const WORKFLOW = {
  components: [
    {
      name: '/#__cloud__/whoAmI',
      nodes: [
        { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: false }, ports: [], children: [] },
        {
          id: 'res',
          type: 'noodl.cloud.response',
          x: 0,
          y: 200,
          // A Response node returns a NAMED list, and each name mints a `pm-`
          // input — the same convention the Request node's parameters use. A
          // wire to a bare `userId` lands on no port at all and the function
          // answers `{}`, which is what this fixture did on its first run.
          parameters: { params: 'userId,authenticated' },
          ports: [],
          children: []
        }
      ],
      connections: [
        { sourceId: 'req', sourcePort: 'receive', targetId: 'res', targetPort: 'send' },
        { sourceId: 'req', sourcePort: 'userId', targetId: 'res', targetPort: 'pm-userId' },
        { sourceId: 'req', sourcePort: 'auth', targetId: 'res', targetPort: 'pm-authenticated' }
      ],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

interface JsonRpcReply {
  result?: { content?: { type: string; text: string }[]; isError?: boolean; tools?: { name: string }[] };
  error?: { code: number; message: string };
}

interface AuditRow {
  action?: string;
  actorKind?: string;
  actor?: string;
  outcome?: string;
  route?: string;
  requestId?: string;
  target?: { tool?: string; collection?: string; op?: string; function?: string; objectId?: string };
  detail?: { durationMs?: number; actsAsUserId?: string | null };
}

describe('FED-005 §3.3 — a key that acts as a user', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;

  let alice: { id: string; token: string };
  let bob: { id: string; token: string };
  let aliceTaskId: string;
  let bobTaskId: string;
  const keys: Record<string, string> = {};

  async function call(
    keyName: string,
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<JsonRpcReply> {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nodegx-api-key': keys[keyName] },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
    });
    return (await res.json()) as JsonRpcReply;
  }

  /** The rows a `_find` tool answered with, parsed back out of its text content. */
  function rows(reply: JsonRpcReply): Record<string, unknown>[] {
    const text = reply.result?.content?.[0]?.text || '[]';
    if (text.startsWith('No rows')) return [];
    return JSON.parse(text) as Record<string, unknown>[];
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

  async function makeKey(name: string, scopes: string[], actsAsUserId?: string): Promise<void> {
    const res = await fetch(`${base}/admin/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name, scopes, ...(actsAsUserId ? { actsAsUserId } : {}) })
    });
    const json = (await res.json()) as { secret?: string };
    if (!json.secret) throw new Error(`key "${name}" was not created`);
    keys[name] = json.secret;
  }

  async function auditRows(): Promise<AuditRow[]> {
    const res = await fetch(`${base}/admin/audit?limit=1000`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    const { entries } = (await res.json()) as { entries: AuditRow[] };
    return entries.filter((e) => e.action === AUDIT_MCP_TOOL_CALL);
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed005-actsas-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(WORKFLOW));

    service = new BackendService({ dataDir, port: 0, backendId: 'fed005a', backendName: 'Acts As' });
    const started = await service.start();
    base = started.listen.url;
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

    alice = await signup('actsas-alice');
    bob = await signup('actsas-bob');

    for (const [user, title] of [
      [alice, 'alice task'],
      [bob, 'bob task']
    ] as const) {
      const res = await fetch(`${base}/classes/Task`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-parse-session-token': user.token },
        body: JSON.stringify({ title })
      });
      const { objectId } = (await res.json()) as { objectId: string };
      if (title.startsWith('alice')) aliceTaskId = objectId;
      else bobTaskId = objectId;
    }

    await makeKey('unbound', ['classes:*', 'functions:*']);
    await makeKey('as-alice', ['classes:*', 'functions:*'], alice.id);
    await makeKey('as-bob', ['classes:*', 'functions:*'], bob.id);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // AC2
  // ==========================================================================

  it('AC2: Task_find as a key bound to Alice returns Alice\'s row and not Bob\'s', async () => {
    const asAlice = rows(await call('as-alice', 'Task_find'));
    expect(asAlice.map((r) => r.title)).toEqual(['alice task']);

    // The pair, in the same run: Bob's row exists and Bob's key finds it.
    const asBob = rows(await call('as-bob', 'Task_find'));
    expect(asBob.map((r) => r.title)).toEqual(['bob task']);
  });

  it('AC2: an UNBOUND key still sees both — the binding is what narrows, not the endpoint', async () => {
    // 🔴 This is the control that makes the two assertions above mean
    // something. Without it, a surface that returned nothing at all, or a
    // service that had lost Bob's row, would read identically. It is also the
    // statement that FED-005 changed nothing for existing keys.
    const both = rows(await call('unbound', 'Task_find'));
    expect(both.map((r) => r.title).sort()).toEqual(['alice task', 'bob task']);
  });

  it('AC2: Task_get of another user\'s row reads exactly like a row that is not there', async () => {
    const mine = await call('as-alice', 'Task_get', { objectId: aliceTaskId });
    expect(mine.result?.isError).toBeUndefined();

    const theirs = await call('as-alice', 'Task_get', { objectId: bobTaskId });
    const missing = await call('as-alice', 'Task_get', { objectId: '00000000-0000-4000-8000-000000000000' });
    expect(theirs.result?.isError).toBe(true);
    // Existence hiding: the two refusals must be the same sentence, or the
    // difference between them IS the leak.
    expect(theirs.result?.content?.[0]?.text?.replace(bobTaskId, 'ID')).toEqual(
      missing.result?.content?.[0]?.text?.replace('00000000-0000-4000-8000-000000000000', 'ID')
    );
  });

  it('AC2: Task_create through a bound key stamps that user as owner', async () => {
    const created = await call('as-alice', 'Task_create', { title: 'made over mcp' });
    expect(created.result?.isError).toBeUndefined();

    // Read the stored row as admin — the only principal that sees the stamping.
    const res = await fetch(`${base}/classes/Task`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ _method: 'GET', where: { title: 'made over mcp' } })
    });
    const { results } = (await res.json()) as { results: Record<string, unknown>[] };
    expect(results).toHaveLength(1);
    expect(results[0].owner).toEqual({ __type: 'Pointer', className: '_User', objectId: alice.id });
    expect(results[0].ACL).toEqual({ [alice.id]: { read: true, write: true } });

    // And Bob's key cannot see it, while Alice's can — the row it created is a
    // row it can read back, which is the failure a half-done binding produces.
    expect(rows(await call('as-bob', 'Task_find')).map((r) => r.title)).not.toContain('made over mcp');
    expect(rows(await call('as-alice', 'Task_find')).map((r) => r.title)).toContain('made over mcp');
  });

  it("AC2: a raw HTTP find with the SAME key returns the SAME set", async () => {
    const overMcp = rows(await call('as-alice', 'Task_find'))
      .map((r) => String(r.title))
      .sort();

    const res = await fetch(`${base}/classes/Task`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nodegx-api-key': keys['as-alice'] },
      body: JSON.stringify({ _method: 'GET', where: {} })
    });
    expect(res.status).toBe(200);
    const { results } = (await res.json()) as { results: Record<string, unknown>[] };
    const overHttp = results.map((r) => String(r.title)).sort();

    expect(overHttp).toEqual(overMcp);
    // Named rather than only compared, so a future run that broke BOTH doors
    // identically would still fail here.
    expect(overHttp).toEqual(['alice task', 'made over mcp']);
  });

  it('AC2: a bound key cannot change another user\'s row', async () => {
    const refused = await call('as-alice', 'Task_update', { objectId: bobTaskId, title: 'hijacked' });
    expect(refused.result?.isError).toBe(true);

    // The control: the same tool, the same key, its own row.
    const allowed = await call('as-alice', 'Task_update', { objectId: aliceTaskId, title: 'alice task v2' });
    expect(allowed.result?.isError).toBeUndefined();

    // And Bob's row is untouched, read by the one principal that can see both.
    const res = await fetch(`${base}/classes/Task/${bobTaskId}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect(((await res.json()) as { title: string }).title).toBe('bob task');
  });

  it('a binding to a user that no longer exists fails SHUT, not open', async () => {
    const ghost = await signup('actsas-ghost');
    await makeKey('as-ghost', ['classes:*'], ghost.id);
    // It works while the user is there.
    expect((await call('as-ghost', 'Task_find')).error).toBeUndefined();

    await fetch(`${base}/classes/_User/${ghost.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    const after = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nodegx-api-key': keys['as-ghost'] },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    // 🔴 401, NOT a silent downgrade to an unbound key — which would promote it
    // from "sees one person's rows" to "sees everybody's" by deleting a user.
    expect(after.status).toBe(401);
    expect(await after.text()).toContain('no longer exists');
  });

  // ==========================================================================
  // The graph sees the user
  // ==========================================================================

  it('a cloud function that refuses unauthenticated callers runs for a bound key, as that user', async () => {
    const answered = await call('as-alice', 'whoAmI');
    expect(answered.result?.isError).toBeUndefined();
    expect(answered.result?.content?.[0]?.text).toContain(alice.id);

    // The pair: the SAME function, the SAME backend, an unbound key — the
    // graph's own `Allow Unauthenticated` check refuses it, and the refusal
    // names the fix.
    const refused = await call('unbound', 'whoAmI');
    expect(refused.result?.isError).toBe(true);
    expect(refused.result?.content?.[0]?.text).toContain('bind it to a user');
  });

  it('the ephemeral session is released — no _Session row outlives the call', async () => {
    const before = await fetch(`${base}/classes/_Session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ _method: 'GET', where: {}, limit: 0, count: 1 })
    });
    const countBefore = ((await before.json()) as { count: number }).count;

    await call('as-alice', 'whoAmI');
    await call('as-alice', 'whoAmI');
    // And one that FAILS inside the graph — the release is in a `finally`, and
    // a failure leaving a live token behind is the leak with the long tail.
    await call('as-bob', 'whoAmI');

    const after = await fetch(`${base}/classes/_Session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ _method: 'GET', where: {}, limit: 0, count: 1 })
    });
    expect(((await after.json()) as { count: number }).count).toBe(countBefore);
  });

  // ==========================================================================
  // AC6 — the audit trail
  // ==========================================================================

  it('AC6: one row per tool call, with the fields §3.4 names', async () => {
    const before = (await auditRows()).length;

    await call('as-alice', 'Task_find');
    await call('as-alice', 'Task_create', { title: 'audited' });
    await call('as-alice', 'whoAmI');
    // A call that fails is audited too.
    await call('as-alice', 'Task_get', { objectId: bobTaskId });

    const rowsNow = await auditRows();
    expect(rowsNow.length - before).toBe(4);

    const recent = rowsNow.slice(0, 4);
    for (const row of recent) {
      expect(row.actorKind).toBe('apiKey');
      expect(row.actor).toBe('as-alice');
      expect(row.route).toBe('mcp');
      expect(typeof row.requestId).toBe('string');
      expect(typeof row.detail?.durationMs).toBe('number');
      expect(row.detail?.actsAsUserId).toBe(alice.id);
      expect(typeof row.target?.tool).toBe('string');
    }

    const byTool = new Map(recent.map((r) => [r.target?.tool, r]));
    expect(byTool.get('Task_find')?.target).toMatchObject({ collection: 'Task', op: 'find' });
    expect(byTool.get('whoAmI')?.target).toMatchObject({ function: 'whoAmI' });
    // The objectId of the row that was created, and of the row that was asked for.
    expect(typeof byTool.get('Task_create')?.target?.objectId).toBe('string');
    expect(byTool.get('Task_get')?.target?.objectId).toBe(bobTaskId);

    // Outcome is not decoration: the refused read is recorded as a failure and
    // the other three as successes.
    expect(byTool.get('Task_get')?.outcome).toBe('failure');
    expect(byTool.get('Task_find')?.outcome).toBe('success');
  });

  it('AC6: a tool a key may NOT call is not recorded as one it did call', async () => {
    const before = (await auditRows()).length;
    await call('as-alice', 'NoSuchTool_find');
    // A JSON-RPC error over a tool that was never dispatched writes no row —
    // the trail records what this backend DID, and a refused name is the access
    // log's business.
    expect((await auditRows()).length).toBe(before);
  });
});
