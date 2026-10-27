/**
 * P127-BKO006-NOROLESFAILS — a caller in no groups is an answer, not a failure.
 *
 * BKO-006's repair shop: a function asked Get User Roles "is the caller staff?". For an ordinary customer (in no
 * groups) every call failed with "That user is in no roles.", until the agent wired the failure into its own check;
 * it said "Treat Unchanged as" had no effect. Each shape below is one function an author would write, called by a
 * customer in no groups and by a member of `staff`.
 *
 * MEASURED P127 s7 (the row has it): at HEAD a customer takes Unchanged, and "Treat Unchanged as: Done" takes Done.
 * Two more shapes were measured and are not kept here, because each waits out the 30 s function timeout: with only
 * Done and Failure wired the call answers 504 naming the unwired Unchanged; with the setting given its label `Done`
 * (not the value `done`) the runtime ignores it the same way, though the agent's write check refuses that spelling.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { httpClient } from './helpers/http';

jest.setTimeout(30000);

type Wire = { sourceId: string; sourcePort: string; targetId: string; targetPort: string };

/** Request (signed in only) → Get User Roles on the caller → one Response per branch the shape wires. */
function whoIsIt(name: string, branches: Array<'done' | 'unchanged' | 'failure'>, roleParams: Record<string, unknown> = {}) {
  const nodes = [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
    { id: 'roles', type: 'noodl.cloud.getuserroles', x: 0, y: 100, parameters: roleParams, ports: [], children: [] },
    ...branches.map((b, i) => ({ id: `res-${b}`, type: 'noodl.cloud.response', x: i * 200, y: 200, parameters: { params: 'branch', 'pm-branch': b }, ports: [], children: [] }))
  ];
  const connections: Wire[] = [
    { sourceId: 'req', sourcePort: 'receive', targetId: 'roles', targetPort: 'read' },
    { sourceId: 'req', sourcePort: 'userId', targetId: 'roles', targetPort: 'userId' },
    ...branches.map((b) => ({ sourceId: 'roles', sourcePort: b, targetId: `res-${b}`, targetPort: 'send' }))
  ];
  return { name: `/#__cloud__/${name}`, nodes, connections, roots: [] };
}

const FUNCTIONS = {
  components: [
    whoIsIt('three-wired', ['done', 'unchanged', 'failure']),
    whoIsIt('unchanged-as-done', ['done', 'failure'], { treatUnchangedAs: 'done' })
  ],
  settings: {},
  metadata: {}
};

const ADMIN_TOKEN = 'admin-token-for-p127-no-roles';

describe('P127-BKO006-NOROLESFAILS — Get User Roles for a caller in no groups', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(() => base);
  let customer = '';
  let staff = '';

  async function signUp(username: string): Promise<{ id: string; token: string }> {
    const r = await http.request<{ objectId: string; sessionToken: string }>('POST', '/users', { body: { username, password: 'a-long-password-9' } });
    expect(r.status).toBe(201);
    return { id: r.json.objectId, token: r.json.sessionToken };
  }

  const call = (fn: string, token: string) =>
    http.request<{ result?: { branch?: string }; error?: string }>('POST', `/functions/${fn}`, { body: {}, headers: { 'x-parse-session-token': token } });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p127-noroles-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(FUNCTIONS));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_p127noroles', backendName: 'P127', authToken: ADMIN_TOKEN });
    base = (await service.start()).listen.url;
    customer = (await signUp('customer-cy')).token;
    const s = await signUp('staff-sam');
    staff = s.token;
    const admin = { authorization: `Bearer ${ADMIN_TOKEN}` };
    expect((await http.request('POST', '/admin/roles', { body: { name: 'staff' }, headers: admin })).status).toBeLessThan(300);
    expect((await http.request('POST', '/admin/roles/staff/users', { body: { userId: s.id }, headers: admin })).status).toBeLessThan(300);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it.each([
    ['three-wired', 'unchanged'],
    ['unchanged-as-done', 'done']
  ])('%s: a customer in no groups answers, on %s', async (fn, branch) => {
    const r = await call(fn, customer);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ result: { branch } });
  });

  it.each(['three-wired', 'unchanged-as-done'])('%s: a member of staff takes Done', async (fn) => {
    const r = await call(fn, staff);
    expect(r.json).toEqual({ result: { branch: 'done' } });
  });
});
