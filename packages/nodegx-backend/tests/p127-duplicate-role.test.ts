/**
 * P127-S8-DUPEROLE — one role per name, and a member removed by name is out.
 *
 * Measured on the BKO-006 shared-expenses lab: its Join Group function puts people in `members-of-<owner>` with
 * Create Role If Missing ticked; two calls ran at once and the backend held two `_Role` rows of that one name. Removing
 * bob by name then answered success twice while he kept reading all four of the group's expenses, because every call
 * by name reached only the first row.
 *
 * Driven through `POST /functions/:name` on a real service with enforcement on (the shape of
 * `cloud-system-roles.test.ts`):
 *  1. Four Add User To Role calls at once, each making the role if missing, leave ONE role holding all four people.
 *  2. A backend that already holds two rows of one name (planted the way the lab's were) heals on the next call by
 *     name: one row, holding everyone from both.
 *  3. The consequence the lab measured: a person in the second row reads a row whose ACL names the role, is removed by
 *     name, and on the SAME session can no longer read it. Beside it, a member left in the role still reads it (the
 *     known-firing signal: a refusal alone could be a read that reaches nothing).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { RoleStore } from '../src/roles/RoleStore';
import { BackendService } from '../src/service';

jest.setTimeout(60000);

const LOCKED_CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const requestNode = (id: string, params: string) => ({
  id,
  type: 'noodl.cloud.request',
  x: 0,
  y: 0,
  parameters: { allowNoAuth: true, params } as Record<string, any>,
  ports: [],
  children: []
});
const responseNode = (id: string, params: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'noodl.cloud.response',
  x: 0,
  y: 400,
  parameters: { params, ...extra } as Record<string, any>,
  ports: [],
  children: []
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Add User To Role with Create Role If Missing, as the expenses app's Join Group has it. */
const join = {
  name: '/#__cloud__/join',
  nodes: [
    requestNode('req', 'target,role'),
    { id: 'ar', type: 'noodl.cloud.addusertorole', x: 0, y: 200, parameters: { createRole: true }, ports: [], children: [] },
    responseNode('resOk', 'state', { 'pm-state': 'added' }),
    responseNode('resDup', 'state', { 'pm-state': 'already' }),
    responseNode('resErr', 'error,state', { 'pm-state': 'refused' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-target', targetId: 'ar', targetPort: 'userId' },
    { sourceId: 'req', sourcePort: 'pm-role', targetId: 'ar', targetPort: 'role' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'ar', targetPort: 'add' },
    { sourceId: 'ar', sourcePort: 'done', targetId: 'resOk', targetPort: 'send' },
    { sourceId: 'ar', sourcePort: 'unchanged', targetId: 'resDup', targetPort: 'send' },
    { sourceId: 'ar', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
    { sourceId: 'ar', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
};

/**
 * One run that sends `add` twice at the same moment, as the lab's Join Group did: its script has three inputs from
 * two fetches, so it ran more than once and fired its join twice. Here two Add User To Role nodes both start on the
 * request's `receive`, each with Create Role If Missing.
 */
const joinTwo = {
  name: '/#__cloud__/jointwo',
  nodes: [
    requestNode('req', 'a,b,role'),
    { id: 'ar1', type: 'noodl.cloud.addusertorole', x: 0, y: 200, parameters: { createRole: true }, ports: [], children: [] },
    { id: 'ar2', type: 'noodl.cloud.addusertorole', x: 300, y: 200, parameters: { createRole: true }, ports: [], children: [] },
    responseNode('resOk', 'state', { 'pm-state': 'sent' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-a', targetId: 'ar1', targetPort: 'userId' },
    { sourceId: 'req', sourcePort: 'pm-b', targetId: 'ar2', targetPort: 'userId' },
    { sourceId: 'req', sourcePort: 'pm-role', targetId: 'ar1', targetPort: 'role' },
    { sourceId: 'req', sourcePort: 'pm-role', targetId: 'ar2', targetPort: 'role' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'ar1', targetPort: 'add' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'ar2', targetPort: 'add' },
    { sourceId: 'ar2', sourcePort: 'done', targetId: 'resOk', targetPort: 'send' }
  ],
  roots: []
};

/** Remove User From Role, by name, as the app's Remove Member has it. */
const leave = {
  name: '/#__cloud__/leave',
  nodes: [
    requestNode('req', 'target,role'),
    { id: 'rr', type: 'noodl.cloud.removeuserfromrole', x: 0, y: 200, parameters: {}, ports: [], children: [] },
    responseNode('resOk', 'state', { 'pm-state': 'removed' }),
    responseNode('resNoop', 'state', { 'pm-state': 'wasnt' }),
    responseNode('resErr', 'error,state', { 'pm-state': 'refused' })
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-target', targetId: 'rr', targetPort: 'userId' },
    { sourceId: 'req', sourcePort: 'pm-role', targetId: 'rr', targetPort: 'role' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'rr', targetPort: 'remove' },
    { sourceId: 'rr', sourcePort: 'done', targetId: 'resOk', targetPort: 'send' },
    { sourceId: 'rr', sourcePort: 'unchanged', targetId: 'resNoop', targetPort: 'send' },
    { sourceId: 'rr', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
    { sourceId: 'rr', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
};

interface Body {
  [key: string]: unknown;
  sessionToken?: string;
  objectId?: string;
  result?: Record<string, unknown>;
  results?: Array<Record<string, unknown>>;
  roles?: Array<{ name: string; objectId?: string; users?: string[] }>;
}

describe('P127-S8-DUPEROLE one role per name, and removal by name reaches every member', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;

  async function req(method: string, pathName: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}${pathName}`, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = {} as Body;
    try {
      json = JSON.parse(text) as Body;
    } catch {
      /* non-JSON */
    }
    return { status: res.status, json };
  }
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });
  const asUser = (u: { token: string }) => ({ 'x-parse-session-token': u.token });

  let seq = 0;
  async function signup(prefix: string) {
    const username = `${prefix}-${++seq}`;
    const { status, json } = await req('POST', '/users', { username, password: `pw-${username}` });
    expect(status).toBe(201);
    return { id: json.objectId as string, token: json.sessionToken as string };
  }
  const rolesNamed = async (name: string) =>
    ((await req('GET', '/admin/roles', undefined, asAdmin())).json.roles ?? []).filter((r) => r.name === name);
  const state = (r: { json: Body }) => (r.json.result as Record<string, unknown> | undefined)?.state;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-duperole-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED_CONFIG));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'main.workflow.json'),
      JSON.stringify({ components: [join, joinTwo, leave], settings: {}, metadata: {} })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'duperole', backendName: 'Duperole Test' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  });

  afterAll(async () => {
    await service?.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('one run that adds two people at the same moment, each making the role if missing, leaves one role', async () => {
    const [x, y] = [await signup('x'), await signup('y')];
    const sent = await req('POST', '/functions/jointwo', { a: x.id, b: y.id, role: 'members-of-once' }, asUser(x));
    expect(sent.status).toBe(200);
    // Both adds finish in the same run; the answer goes on the second's done, so wait for both memberships to land.
    let rows = await rolesNamed('members-of-once');
    for (let i = 0; i < 20 && rows.flatMap((r) => r.users ?? []).length < 2; i++) {
      await new Promise((r) => setTimeout(r, 100));
      rows = await rolesNamed('members-of-once');
    }
    expect(rows).toHaveLength(1);
    expect([...(rows[0].users ?? [])].sort()).toEqual([x.id, y.id].sort());
  });

  it('four joins at once, each making the role if missing, leave one role holding all four', async () => {
    const people = await Promise.all([signup('a'), signup('b'), signup('c'), signup('d')]);
    const caller = people[0];
    const answers = await Promise.all(
      people.map((p) => req('POST', '/functions/join', { target: p.id, role: 'members-of-race' }, asUser(caller)))
    );
    expect(answers.map(state)).toEqual(['added', 'added', 'added', 'added']);
    const rows = await rolesNamed('members-of-race');
    expect(rows).toHaveLength(1);
    expect([...(rows[0].users ?? [])].sort()).toEqual(people.map((p) => p.id).sort());
  });

  it('two ensures of one name at the same moment, from two stores on one storage, make one row', async () => {
    // The look-then-make gap itself, without a function run's timing around it: the cloud node and the admin door
    // each hold their own RoleStore over the same facade.
    const facade = (service as any).facade; // eslint-disable-line @typescript-eslint/no-explicit-any
    const [one, two] = await Promise.all([new RoleStore(facade).ensure('members-of-gap'), new RoleStore(facade).ensure('members-of-gap')]);
    expect([one.created, two.created].sort()).toEqual([false, true]);
    expect(one.role.objectId).toBe(two.role.objectId);
    expect(await rolesNamed('members-of-gap')).toHaveLength(1);
  });

  it('two rows of one name, already stored, heal on the next call by name and removal reaches everyone', async () => {
    const owner = await signup('owner');
    const kept = await signup('kept');
    const bob = await signup('bob');
    // Planted the way the lab's were: two `_Role` rows of one name, kept in the first, bob in the second.
    const facade = (service as any).facade; // eslint-disable-line @typescript-eslint/no-explicit-any
    const first = await facade.rawCreate('_Role', { name: 'members-of-lab' });
    const second = await facade.rawCreate('_Role', { name: 'members-of-lab' });
    await facade.addRelation('_Role', first.objectId, 'users', kept.id);
    await facade.addRelation('_Role', second.objectId, 'users', bob.id);
    expect(await rolesNamed('members-of-lab')).toHaveLength(2);

    // A row only the group may read, made by its owner.
    const made = await req(
      'POST',
      '/classes/Expense',
      { description: 'Team lunch', ACL: { [owner.id]: { read: true, write: true }, 'role:members-of-lab': { read: true } } },
      asUser(owner)
    );
    expect(made.status).toBe(201);
    const readAs = async (u: { token: string }) =>
      (await req('GET', `/classes/Expense/${made.json.objectId}`, undefined, asUser(u))).status;
    expect(await readAs(bob)).toBe(200);
    expect(await readAs(kept)).toBe(200);

    const removed = await req('POST', '/functions/leave', { target: bob.id, role: 'members-of-lab' }, asUser(owner));
    expect(state(removed)).toBe('removed');

    // Bob is out, on the same session; the member left in still reads it.
    expect(await readAs(bob)).not.toBe(200);
    expect(await readAs(kept)).toBe(200);
    const rows = await rolesNamed('members-of-lab');
    expect(rows).toHaveLength(1);
    expect(rows[0].users).toEqual([kept.id]);
  });
});
