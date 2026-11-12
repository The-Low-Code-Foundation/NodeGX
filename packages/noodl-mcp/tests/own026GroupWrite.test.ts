/**
 * P112 OWN-026 FIX-06 — several people who may all change the same records, through the doors an agent uses.
 *
 * A stranger's agent built "a second person who can change everything the first can" as a role named from a group
 * field of an invitation the page created: any account could write itself an invitation into any group. It found the
 * role primitive by unpacking the kit and reading the backend's bundled source. Graded here:
 *  1. `list_examples` answers `cloud-members-can-edit-my-records` first for the words such a request uses.
 *  2. The write door says `role-named-by-a-field-the-caller-wrote` on the measured shape (its words changed), and
 *     `function-guards-an-open-collection` on a function that guards a collection any caller may create into.
 *  3. The rules those infos read come from the backend the project is bound to when the project has no rules file
 *     of its own: `set_collection_permissions` writes the backend's, so locking a collection quiets the second info.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getExample, listExamples } from '../src/catalog';
import { projectCollectionRules } from '../src/validate';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

const ID = 'cloud-members-can-edit-my-records';
const ROLE = 'role-named-by-a-field-the-caller-wrote';
const GUARD = 'function-guards-an-open-collection';

const w = (line: string) => {
  const [a, b] = line.split('->').map((x) => x.trim());
  return { fromId: a.slice(0, a.indexOf('.')), fromProperty: a.slice(a.indexOf('.') + 1), toId: b.slice(0, b.indexOf('.')), toProperty: b.slice(b.indexOf('.') + 1) };
};

/** Every diagnostic code a write answered with. */
function codesOf(res: { isError: boolean; data: unknown }): string[] {
  const found: string[] = [];
  JSON.parse(JSON.stringify(res.data), (_k, v) => {
    if (v && typeof v === 'object' && typeof v.code === 'string' && typeof v.severity === 'string' && v.location) found.push(v.code);
    return v;
  });
  return found;
}

const JOIN = {
  nodes: [
    { id: 'jt_req', type: 'noodl.cloud.request', parameters: { allowNoAuth: false } },
    { id: 'jt_me', type: 'net.noodl.user.User' },
    { id: 'jt_invites', type: 'DbCollection2', parameters: { collectionName: 'invitation' } },
    {
      id: 'jt_pick',
      type: 'JavaScriptFunction',
      parameters: {
        functionScript:
          'if (Inputs.email === undefined || Inputs.invites === undefined) return;\n' +
          'const invite = Inputs.invites.filter((i) => i.withEmail === Inputs.email)[0];\n' +
          "Outputs.role = invite ? 'team-' + invite.teamId : '';\n" +
          'Outputs.go();'
      }
    },
    { id: 'jt_join', type: 'noodl.cloud.addusertorole', parameters: { createRole: true } },
    { id: 'jt_ok', type: 'noodl.cloud.response' },
    { id: 'jt_fail', type: 'noodl.cloud.response', parameters: { status: 'failure' } }
  ],
  connections: [
    'jt_req.receive -> jt_me.fetch',
    'jt_req.receive -> jt_invites.storageFetch',
    'jt_me.email -> jt_pick.in-email',
    'jt_invites.items -> jt_pick.in-invites',
    'jt_pick.out-role -> jt_join.role',
    'jt_me.id -> jt_join.userId',
    'jt_pick.out-go -> jt_join.add',
    'jt_join.done -> jt_ok.send',
    'jt_join.failure -> jt_fail.send',
    'jt_pick.failure -> jt_fail.send',
    'jt_me.failure -> jt_fail.send'
  ].map(w)
};

const GUARDED = {
  nodes: [
    { id: 'st_req', type: 'noodl.cloud.request', parameters: { allowNoAuth: false, params: 'text' } },
    { id: 'st_me', type: 'net.noodl.user.User' },
    { id: 'st_check', type: 'JavaScriptFunction', parameters: { functionScript: 'if (Inputs.me === undefined) return;\nOutputs.ok();' } },
    { id: 'st_create', type: 'NewDbModelProperties', parameters: { collectionName: 'task' } },
    { id: 'st_done', type: 'noodl.cloud.response' },
    { id: 'st_refuse', type: 'noodl.cloud.response', parameters: { status: 'failure' } }
  ],
  connections: ['st_req.receive -> st_me.fetch', 'st_me.id -> st_check.in-me', 'st_check.out-ok -> st_create.store', 'st_create.done -> st_done.send', 'st_check.failure -> st_refuse.send', 'st_create.failure -> st_refuse.send', 'st_me.failure -> st_refuse.send'].map(w)
};

describe('FIX-06: list_examples answers the group example for the words a request uses', () => {
  it.each([
    'invite someone who can edit my records too',
    'let several people change the same records',
    'members can edit my records',
    'a second person who can change everything I can'
  ])('%s', (query) => {
    expect(listExamples({ query }).map((r) => r.id)[0]).toBe(ID);
  });
});

describe('FIX-06: the rules come from the bound backend when the project has none', () => {
  const saved = process.env.NODEGX_BACKENDS_DIR;
  let session: TestSession;
  let backends: string;
  beforeAll(async () => {
    backends = fs.mkdtempSync(path.join(os.tmpdir(), 'own026-fix06-backends-'));
    process.env.NODEGX_BACKENDS_DIR = backends;
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
    if (saved === undefined) delete process.env.NODEGX_BACKENDS_DIR;
    else process.env.NODEGX_BACKENDS_DIR = saved;
  });

  const bindTo = (id: string, rules: unknown) => {
    fs.mkdirSync(path.join(backends, id), { recursive: true });
    fs.writeFileSync(path.join(backends, id, 'security.json'), JSON.stringify(rules));
    session.store.writeCloudServices({ instanceId: id, endpoint: 'http://127.0.0.1:1', appId: id, type: 'nodegx' }, true);
  };
  const locked = { defaults: { permissions: { create: 'authenticated', update: 'authenticated' } }, collections: { task: { permissions: { create: 'nobody' } } } };

  it('reads "not known" with no binding and no file, and the backend\'s file once bound', () => {
    expect(projectCollectionRules(session.store)).toBeNull();
    bindTo('backend_test_a', locked);
    expect(projectCollectionRules(session.store)?.collections).toEqual(locked.collections);
  });

  it("prefers the project's own nodegx.security.json, and never reads outside the backends folder", () => {
    const own = path.join(session.projectDir, 'nodegx.security.json');
    fs.writeFileSync(own, JSON.stringify({ defaults: { permissions: { create: 'nobody' } }, collections: {} }));
    expect(projectCollectionRules(session.store)?.defaults).toEqual({ permissions: { create: 'nobody' } });
    fs.unlinkSync(own);
    session.store.writeCloudServices({ instanceId: '../escape', endpoint: 'http://127.0.0.1:1', appId: 'x', type: 'nodegx' }, true);
    expect(projectCollectionRules(session.store)).toBeNull();
  });

  it('the write door says both infos on the measured shapes, and the second goes quiet once the backend locks the collection', async () => {
    bindTo('backend_test_b', { defaults: { permissions: { create: 'authenticated', update: 'authenticated' } }, collections: {} });
    const join = await call(session, 'create_component', { path: '#__cloud__/Cloud Functions/Join Team', ...JOIN });
    expect(join.isError).toBe(false);
    expect(codesOf(join)).toContain(ROLE);

    const open = await call(session, 'create_component', { path: '#__cloud__/Cloud Functions/Set Task', ...GUARDED });
    expect(open.isError).toBe(false);
    expect(codesOf(open)).toContain(GUARD);

    bindTo('backend_test_c', locked);
    const closed = await call(session, 'create_component', { path: '#__cloud__/Cloud Functions/Set Task Again', ...GUARDED });
    expect(closed.isError).toBe(false);
    expect(codesOf(closed)).not.toContain(GUARD);
  });

  it("writes the example's own components through the same door, with none of the three infos once Note is locked", async () => {
    bindTo('backend_test_d', { defaults: { permissions: { create: 'authenticated', update: 'authenticated' } }, collections: { Note: { permissions: { create: 'nobody' } } } });
    const example = getExample(ID) as { components: { name: string; nodes: unknown[]; connections: unknown[] }[] };
    for (const c of example.components) {
      const res = await call(session, 'create_component', { path: c.name.replace(/^\//, ''), nodes: c.nodes, connections: c.connections });
      expect({ name: c.name, isError: res.isError }).toEqual({ name: c.name, isError: false });
      const said = codesOf(res).filter((code) => [ROLE, GUARD, 'function-trusts-a-field-the-caller-wrote', 'owner-sent-by-the-page'].includes(code));
      expect({ name: c.name, said }).toEqual({ name: c.name, said: [] });
    }
  });
});
