/**
 * P124-S1-DOORREFUSALUNSEEN — a request a permission rule turns away at the door
 * leaves a row in the audit (`access.denied`).
 *
 * Before: `POST /functions/:name` with no credential answered 403 and the audit's
 * count was the same before and after, and its action list had no "denied" at
 * all. A run that fails INSIDE a function is a run; a request the rule stops
 * before the function starts was nothing, on every screen. "Somebody tried to
 * read Lesson as nobody at 02:13" is the sentence a person road testing their
 * rules needs, so it is driven here over real HTTP with enforcement on and read
 * back through `GET /admin/audit`, the route the backend manager's Audit page reads.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { AUDIT_ACCESS_DENIED, ACCESS_DENIED_AUDIT_CAP, declaredAuditActions } from '../src/ops/audit-actions';
import type { AuditEntry, AuditQueryResult } from '../src/ops/audit';

import { request } from './helpers/http';

jest.setTimeout(30000);

const CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: {
      find: 'authenticated',
      get: 'authenticated',
      create: 'authenticated',
      update: 'authenticated',
      delete: 'authenticated'
    },
    creatorOwns: false
  },
  collections: {
    Lesson: { permissions: { find: 'authenticated', get: 'authenticated', create: 'role:staff', update: 'role:staff', delete: 'nobody' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

/** `closed` does not allow unauthenticated calls, so its effective rule is `authenticated`. */
const WORKFLOW = {
  components: [
    {
      name: '/#__cloud__/closed',
      nodes: [
        { id: 'req1', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
        { id: 'res1', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
      ],
      connections: [{ sourceId: 'req1', sourcePort: 'receive', targetId: 'res1', targetPort: 'send' }],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

interface AuditResponse extends AuditQueryResult {
  actions: string[];
}

describe('P124-S1-DOORREFUSALUNSEEN — a refusal at the door is an audit row', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;
  let alice: { id: string; token: string };

  const req = <T = Record<string, unknown>>(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
    request<T>(base, method, p, { body, headers });
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });

  async function denied(): Promise<AuditEntry[]> {
    const res = await req<AuditResponse>('GET', `/admin/audit?action=${AUDIT_ACCESS_DENIED}&limit=1000`, undefined, asAdmin());
    expect(res.status).toBe(200);
    return res.json.entries;
  }

  /** The audit write is fire-and-forget after the response; wait for the row to land. */
  async function settle(): Promise<void> {
    await new Promise((r) => setTimeout(r, 150));
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p124-door-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(WORKFLOW));
    service = new BackendService({ dataDir, port: 0, backendId: 'p124door', backendName: 'P124 door' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
    const signup = await req<{ objectId: string; sessionToken: string }>('POST', '/users', {
      username: 'alice',
      password: 'pw-alice'
    });
    expect(signup.status).toBe(201);
    alice = { id: signup.json.objectId, token: signup.json.sessionToken };
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('names the action in the vocabulary the Audit page filters by', async () => {
    expect(declaredAuditActions()).toContain(AUDIT_ACCESS_DENIED);
    const res = await req<AuditResponse>('GET', '/admin/audit', undefined, asAdmin());
    expect(res.json.actions).toContain(AUDIT_ACCESS_DENIED);
  });

  it('records an anonymous read of a collection the rule refuses: who, what, which rule', async () => {
    const res = await req('GET', '/classes/Lesson', undefined);
    expect(res.status).toBe(403);
    await settle();

    const row = (await denied()).find((e) => e.requestId === res.headers.get('x-request-id'));
    expect(row).toMatchObject({
      action: AUDIT_ACCESS_DENIED,
      actorKind: 'anonymous',
      outcome: 'failure',
      status: 403,
      method: 'GET',
      route: 'classes/:collection',
      ip: '127.0.0.1',
      target: { collection: 'Lesson' }
    });
    expect(row?.detail).toMatchObject({ op: 'find', rule: 'authenticated' });
  });

  it('records a call to a function the rule refuses', async () => {
    const res = await req('POST', '/functions/closed', {});
    expect(res.status).toBe(403);
    await settle();

    const row = (await denied()).find((e) => e.requestId === res.headers.get('x-request-id'));
    expect(row).toMatchObject({ actorKind: 'anonymous', status: 403, target: { function: 'closed' } });
    expect(row?.detail).toMatchObject({ op: 'call', rule: 'authenticated' });
  });

  it('names the signed-in person a rule refused', async () => {
    const res = await req('POST', '/classes/Lesson', { title: 'x' }, { 'x-parse-session-token': alice.token });
    expect(res.status).toBe(403);
    await settle();

    const row = (await denied()).find((e) => e.requestId === res.headers.get('x-request-id'));
    expect(row).toMatchObject({ actorKind: 'user', actor: alice.id, target: { collection: 'Lesson' } });
    expect(row?.detail).toMatchObject({ op: 'create', rule: 'role:staff' });
  });

  it('writes nothing for a request the rule lets through', async () => {
    const before = (await denied()).length;
    const res = await req('GET', '/classes/Lesson', undefined, { 'x-parse-session-token': alice.token });
    expect(res.status).toBe(200);
    await settle();
    expect((await denied()).length).toBe(before);
  });

  it('caps one caller per minute, so a flood cannot fill the table — and the cap is per caller', async () => {
    // Alice already has one row; a flood of her refusals stops at the cap.
    for (let i = 0; i < ACCESS_DENIED_AUDIT_CAP + 10; i++) {
      const res = await req('DELETE', `/classes/Lesson/nope${i}`, undefined, { 'x-parse-session-token': alice.token });
      expect(res.status).toBe(403);
    }
    await settle();
    const rows = await denied();
    expect(rows.filter((e) => e.actor === alice.id).length).toBe(ACCESS_DENIED_AUDIT_CAP);

    // Every 403 still answered, and someone else's (an anonymous caller's) refusal still lands.
    const other = await req('DELETE', '/classes/Lesson/nope');
    expect(other.status).toBe(403);
    await settle();
    expect((await denied()).some((e) => e.requestId === other.headers.get('x-request-id'))).toBe(true);
  });
});
