/**
 * P127-BKO006-NOROLESFAILS — a caller in no groups is an answer, not a failure.
 *
 * BKO-006's repair shop: a function asked Get User Roles "is the caller staff?". For an ordinary customer (in no
 * groups) every call failed with "That user is in no roles.", until the agent wired the failure into its own check;
 * it said "Treat Unchanged as" had no effect. Each shape below is one function an author would write, called by a
 * customer in no groups and by a member of `staff`.
 *
 * MEASURED P127 s7 (the row has it): at HEAD a customer takes Unchanged, and "Treat Unchanged as: Done" takes Done.
 * P127 s9, from the kept transcript and lab: the failure was the node's Error, filled on Unchanged, arriving as the
 * message of the author's own refusal (`listJobs` below). Fixed in SystemRoles: no error with an Unchanged answer.
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

/**
 * The repair shop's List Jobs as the agent first wrote it (its transcript and lab, kept from s6): Done and Unchanged
 * run its staff check, a script that refuses anyone not in `staff` with its own reason through the failure Response;
 * Get User Roles' Error is wired to that Response's message and its Failure to its send, as every role node is wired.
 * With `withRolesError` false it is the control: the same function without the Error wire.
 */
function listJobs(name: string, roleParams: Record<string, unknown>, withRolesError: boolean) {
  const script =
    "const roles = Array.isArray(Inputs.roles) ? Inputs.roles : [];\nif (!Inputs.me || !roles.includes('staff')) {\n  Outputs.reason = 'Only shop staff can see the workshop board.';\n  Outputs.refused();\n  return;\n}\nOutputs.listed();";
  const port = (n: string, plug: string, type: string) => ({ name: n, displayName: n.slice(n.indexOf('-') + 1), plug, type, group: plug === 'input' ? 'Inputs' : 'Outputs' });
  const nodes = [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: false }, ports: [], children: [] },
    { id: 'roles', type: 'noodl.cloud.getuserroles', x: 0, y: 100, parameters: roleParams, ports: [], children: [] },
    {
      id: 'list',
      type: 'JavaScriptFunction',
      x: 0,
      y: 200,
      parameters: { functionScript: script, 'runOnChange-in-me': false, 'runOnChange-in-roles': false },
      ports: [port('in-me', 'input', '*'), port('in-roles', 'input', '*'), port('out-refused', 'output', 'signal'), port('out-listed', 'output', 'signal'), port('out-reason', 'output', '*')],
      children: []
    },
    { id: 'ok', type: 'noodl.cloud.response', x: 0, y: 300, parameters: { params: 'branch', 'pm-branch': 'listed' }, ports: [], children: [] },
    { id: 'fail', type: 'noodl.cloud.response', x: 200, y: 300, parameters: { status: 'failure' }, ports: [], children: [] }
  ];
  const wire = (sourceId: string, sourcePort: string, targetId: string, targetPort: string): Wire => ({ sourceId, sourcePort, targetId, targetPort });
  const connections: Wire[] = [
    wire('req', 'receive', 'roles', 'read'),
    wire('req', 'userId', 'roles', 'userId'),
    wire('req', 'userId', 'list', 'in-me'),
    wire('roles', 'roles', 'list', 'in-roles'),
    wire('roles', 'done', 'list', 'run'),
    wire('roles', 'unchanged', 'list', 'run'),
    ...(withRolesError ? [wire('roles', 'error', 'fail', 'errorMessage'), wire('roles', 'failure', 'fail', 'send')] : []),
    wire('list', 'out-reason', 'fail', 'errorMessage'),
    wire('list', 'out-refused', 'fail', 'send'),
    wire('list', 'out-listed', 'ok', 'send')
  ];
  return { name: `/#__cloud__/${name}`, nodes, connections, roots: [] };
}

/** List Users In Role on a role with no members: Unchanged answers, and its Error is passed on as `said`. */
function emptyRole(name: string) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
      { id: 'members', type: 'noodl.cloud.listusersinrole', x: 0, y: 100, parameters: { role: 'nobody-yet' }, ports: [], children: [] },
      { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'said,branch', 'pm-branch': 'unchanged' }, ports: [], children: [] }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'members', targetPort: 'read' },
      { sourceId: 'members', sourcePort: 'unchanged', targetId: 'res', targetPort: 'send' },
      { sourceId: 'members', sourcePort: 'error', targetId: 'res', targetPort: 'pm-said' }
    ],
    roots: []
  };
}

const FUNCTIONS = {
  components: [
    whoIsIt('three-wired', ['done', 'unchanged', 'failure']),
    whoIsIt('unchanged-as-done', ['done', 'failure'], { treatUnchangedAs: 'done' }),
    listJobs('list-jobs', {}, true),
    listJobs('list-jobs-as-done', { treatUnchangedAs: 'done' }, true),
    listJobs('list-jobs-control', {}, false),
    emptyRole('empty-role')
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
    expect((await http.request('POST', '/admin/roles', { body: { name: 'nobody-yet' }, headers: admin })).status).toBeLessThan(300);
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

  // MEASURED P127 s9 on the published 0.2.7 and 0.2.8 backends: list-jobs and list-jobs-as-done answered a customer
  // 400 "That user is in no roles." (the agent's report, word for word, and the setting with no effect); the control
  // answered "Only shop staff can see the workshop board."
  it.each(['list-jobs', 'list-jobs-as-done', 'list-jobs-control'])('%s (the agent’s List Jobs): a customer is refused in the author’s words', async (fn) => {
    const r = await call(fn, customer);
    expect({ status: r.status, json: r.json }).toEqual({ status: 400, json: { error: 'Only shop staff can see the workshop board.' } });
  });

  it.each(['list-jobs', 'list-jobs-as-done', 'list-jobs-control'])('%s (the agent’s List Jobs): staff are listed', async (fn) => {
    const r = await call(fn, staff);
    expect(r.json).toEqual({ result: { branch: 'listed' } });
  });

  it('a role with no members answers Unchanged with nothing on Error', async () => {
    const r = await call('empty-role', staff);
    expect(r.json).toEqual({ result: { branch: 'unchanged' } });
  });

  it.each(['three-wired', 'unchanged-as-done'])('%s: a member of staff takes Done', async (fn) => {
    const r = await call(fn, staff);
    expect(r.json).toEqual({ result: { branch: 'done' } });
  });
});
