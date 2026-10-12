/**
 * P112 OWN-015 — P112-S14-UNDEPLOYED: a write that changes a cloud function says the backend doesn't have it yet.
 *
 * The stranger round wrote `Functions/Speak` with `apply_plan`, validated 0 errors and stopped; nothing it read said
 * deploy. Graded on the three write doors (`create_component`, `update_component`, `apply_plan`), each beside a
 * non-cloud write through the same door that must carry no note, in a project with no backend and in one bound to
 * an endpoint (the sentence differs: provision first, or deploy now).
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

const FN_NODES = [
  { id: 'req', type: 'noodl.cloud.request', parameters: { allowNoAuth: true, params: 'text' } },
  { id: 'res', type: 'noodl.cloud.response', parameters: { params: 'text' } }
];
const FN_WIRES = [
  { fromId: 'req', fromProperty: 'receive', toId: 'res', toProperty: 'send' },
  { fromId: 'req', fromProperty: 'pm-text', toId: 'res', toProperty: 'pm-text' }
];
const PLAIN_NODES = [{ id: 'root', type: 'Group' }];

type Note = { functions: string[]; next: string; toolsRevealed?: string[] } | undefined;
const noteOf = (r: { data: unknown }): Note => (r.data as { cloudFunctionsNotDeployed?: Note }).cloudFunctionsNotDeployed;

function bind(dir: string): void {
  const file = path.join(dir, 'nodegx.project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  project.metadata = { ...(project.metadata ?? {}), cloudservices: { instanceId: 'b1', endpoint: 'http://127.0.0.1:59999' } };
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
}

describe('OWN-015 UNDEPLOYED — a write to a cloud function says to deploy it', () => {
  const sessions: Array<{ session: TestSession; dir: string }> = [];
  const open = async (bound: boolean): Promise<TestSession> => {
    const dir = copyFixture();
    if (bound) bind(dir);
    const session = await connect(dir);
    sessions.push({ session, dir });
    return session;
  };

  afterAll(async () => {
    for (const { session, dir } of sessions) {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('create_component: no backend → provision then deploy; a plain component → no note', async () => {
    const session = await open(false);
    const fn = await call(session, 'create_component', { path: '#__cloud__/Functions/Speak', nodes: FN_NODES, connections: FN_WIRES });
    expect(fn.isError).toBe(false);
    expect(noteOf(fn)?.functions).toEqual(['Functions/Speak']);
    expect(noteOf(fn)?.next).toMatch(/no backend.*provision_backend, then deploy_cloud_functions/);
    // The deploy tool lives in the deferred backend group; the note brings it into view.
    expect(noteOf(fn)?.toolsRevealed).toEqual(['provision_backend', 'deploy_cloud_functions']);

    const plain = await call(session, 'create_component', { path: 'Components/Plain', nodes: PLAIN_NODES });
    expect(plain.isError).toBe(false);
    expect(noteOf(plain)).toBeUndefined();
  });

  it('update_component on a bound project → deploy now; an update that changes nothing → no note', async () => {
    const session = await open(true);
    expect((await call(session, 'create_component', { path: '#__cloud__/Functions/Speak', nodes: FN_NODES, connections: FN_WIRES })).isError).toBe(false);
    const read = await call<{ revision: string }>(session, 'get_component', { path: '#__cloud__/Functions/Speak' });

    const changed = await call(session, 'update_component', {
      path: '#__cloud__/Functions/Speak',
      if_revision: read.data.revision,
      operations: [{ op: 'update_node', id: 'req', parameters: { params: 'text,voice' } }]
    });
    expect(changed.isError).toBe(false);
    expect(noteOf(changed)?.functions).toEqual(['Functions/Speak']);
    expect(noteOf(changed)?.next).toMatch(/^Call deploy_cloud_functions now/);

    const again = await call<{ revision: string; unchanged?: true }>(session, 'update_component', {
      path: '#__cloud__/Functions/Speak',
      operations: [{ op: 'update_node', id: 'req', parameters: { params: 'text,voice' } }]
    });
    expect(again.isError).toBe(false);
    expect(again.data.unchanged).toBe(true);
    expect(noteOf(again)).toBeUndefined();
  });

  it('apply_plan names the cloud function it wrote and not the page beside it', async () => {
    const session = await open(true);
    const plan = await call<{ planId: string; operations: Array<{ id: string; target: string }> }>(session, 'create_plan', {
      request: 'A function and a component that calls nothing',
      operations: [
        { kind: 'create', target: '#__cloud__/Functions/Speak', intent: 'Says a phrase.' },
        { kind: 'create', target: 'Components/Plain', intent: 'A plain group.' }
      ]
    });
    expect(plan.isError).toBe(false);
    const opFor = (t: string) => plan.data.operations.find((o) => o.target.includes(t))!.id;
    expect((await call(session, 'stage_plan_operation', { plan_id: plan.data.planId, operation_id: opFor('Speak'), nodes: FN_NODES, connections: FN_WIRES })).isError).toBe(false);
    expect((await call(session, 'stage_plan_operation', { plan_id: plan.data.planId, operation_id: opFor('Plain'), nodes: PLAIN_NODES })).isError).toBe(false);

    const applied = await call(session, 'apply_plan', { plan_id: plan.data.planId, render: 'off' });
    expect(applied.isError).toBe(false);
    expect(noteOf(applied)?.functions).toEqual(['Functions/Speak']);
    expect(noteOf(applied)?.next).toMatch(/^Call deploy_cloud_functions now/);
  });
});
