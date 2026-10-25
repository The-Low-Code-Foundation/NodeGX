/**
 * P112-OWN026-OPENSTAT (Richard 2026-10-25: "the caller owns it").
 *
 * Mistral Large 4 built a times-table app whose answer history (`TableStat`) was written by a cloud function
 * (`RecordAnswer`). A function writes as the system, so each row got no ACL, and a row with no ACL is every signed-in
 * account's to read and overwrite: a second family's session read 104 rows from every family and blanked another
 * family's "Mastered tables". Rows a PAGE creates were already the creator's own; this was the function's half.
 *
 * Now a record created inside a run a signed-in person started, into a creator-owned collection, with no access rule
 * of its own, is that person's. A function that means to share says so (`acl` with '*'), or its collection sets
 * creatorOwns false; a run nobody signed in started (anonymous, a schedule) is unchanged.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { ParseRecord, httpClient } from './helpers/http';

jest.setTimeout(60000);

/** A public function whose script creates one record, as `RecordAnswer` did. */
function writer(name: string, script: string) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      { id: `${name}-req`, type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'table' }, ports: [], children: [] },
      { id: `${name}-js`, type: 'JavaScriptFunction', x: 0, y: 100, parameters: { functionScript: script }, ports: [], children: [] },
      { id: `${name}-res`, type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'id' }, ports: [], children: [] },
      { id: `${name}-err`, type: 'noodl.cloud.response', x: 0, y: 300, parameters: { params: 'error' }, ports: [], children: [] }
    ],
    connections: [
      { sourceId: `${name}-req`, sourcePort: 'pm-table', targetId: `${name}-js`, targetPort: 'in-table' },
      { sourceId: `${name}-req`, sourcePort: 'receive', targetId: `${name}-js`, targetPort: 'run' },
      { sourceId: `${name}-js`, sourcePort: 'out-id', targetId: `${name}-res`, targetPort: 'pm-id' },
      { sourceId: `${name}-js`, sourcePort: 'success', targetId: `${name}-res`, targetPort: 'send' },
      { sourceId: `${name}-js`, sourcePort: 'error', targetId: `${name}-err`, targetPort: 'pm-error' },
      { sourceId: `${name}-js`, sourcePort: 'failure', targetId: `${name}-err`, targetPort: 'send' }
    ],
    roots: []
  };
}

const WORKFLOW = {
  components: [
    writer('record-answer', "const r = await Noodl.Records.create('TableStat', { table: Inputs.table });\nOutputs.id = r.id;"),
    writer(
      'record-shared',
      "const r = await Noodl.Records.create('TableStat', { table: Inputs.table }, { acl: { '*': { read: true, write: true } } });\nOutputs.id = r.id;"
    ),
    writer('record-board', "const r = await Noodl.Records.create('Board', { table: Inputs.table });\nOutputs.id = r.id;")
  ],
  settings: {},
  metadata: {}
};

const SECURITY = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  // A page never creates the history; FIX-06's advice, and the lab app's own rule.
  collections: { TableStat: { permissions: { create: 'nobody' } }, Board: { creatorOwns: false } },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('P112-OWN026-OPENSTAT — a record a function creates for a signed-in caller is the caller’s', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer admin-token' };
  const http = httpClient(() => base);
  let a: { id: string; token: string };
  let b: { id: string; token: string };

  const as = (who: { token: string } | null) => (who ? { 'x-parse-session-token': who.token } : {});
  const call = async (fn: string, who: { token: string } | null, table: number) => {
    const res = await http.request<{ result: { id?: string; error?: string } }>('POST', `/functions/${fn}`, { body: { table }, headers: as(who) });
    expect(res.status).toBe(200);
    expect(res.json.result.error).toBeUndefined();
    return res.json.result.id as string;
  };
  const rowsSeenBy = async (collection: string, who: { token: string }) =>
    (await http.get<{ results: ParseRecord[] }>(`/classes/${collection}`, as(who))).json.results.map((r) => r.objectId);
  const aclOf = async (collection: string, id: string) =>
    ((await http.get<ParseRecord>(`/api/${collection}/${id}`, admin)).json as Record<string, unknown>).ACL;

  const signUp = async (username: string) => {
    const res = await http.post<{ objectId: string; sessionToken: string }>('/users', { username, password: 'correct-horse', email: `${username}@example.com` });
    expect(res.status).toBe(201);
    return { id: res.json.objectId, token: res.json.sessionToken };
  };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-openstat-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(SECURITY));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(WORKFLOW));
    service = new BackendService({ dataDir, port: 0, backendId: 'openstat', backendName: 'OPENSTAT', authToken: 'admin-token' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    a = await signUp('family-a');
    b = await signUp('family-b');
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('🔴 another family can neither read nor overwrite the history row a function recorded for A', async () => {
    const id = await call('record-answer', a, 7);
    expect(await aclOf('TableStat', id)).toEqual({ [a.id]: { read: true, write: true } });

    expect(await rowsSeenBy('TableStat', a)).toContain(id);
    expect(await rowsSeenBy('TableStat', b)).not.toContain(id);
    const overwrite = await http.put(`/classes/TableStat/${id}`, { table: 0 }, as(b));
    expect(overwrite.status).toBeGreaterThanOrEqual(400);
    expect(((await http.get<ParseRecord>(`/api/TableStat/${id}`, admin)).json as Record<string, unknown>).table).toBe(7);
  });

  it('control: a function that shares on purpose (acl "*") is read by the other family, through the same door', async () => {
    const id = await call('record-shared', a, 8);
    expect(await rowsSeenBy('TableStat', b)).toContain(id);
  });

  it('control: a collection whose rules set creatorOwns false stays shared', async () => {
    const id = await call('record-board', a, 9);
    expect((await aclOf('Board', id)) ?? null).toBeNull();
    expect(await rowsSeenBy('Board', b)).toContain(id);
  });

  it('a call nobody signed in to has no caller to give it to, and is as before', async () => {
    const id = await call('record-answer', null, 3);
    expect((await aclOf('TableStat', id)) ?? null).toBeNull();
    expect(await rowsSeenBy('TableStat', b)).toContain(id);
  });
});
