/**
 * P109 ISL-015 AC5 (s12) — `update_component`'s `set_visual_roots` op is what the component's roots become.
 *
 * Met in the stranger round: an agent's kit node (a type the server did not know yet) was left out of
 * `visualRoots`, so it asked `set_visual_roots: ["pad"]` and was answered `applied`, `unchanged: true`, with
 * nothing written. The operations door re-derives the roots after every batch (AWP-002 A20) and passed
 * `explicit: undefined` "by construction: a batch has no visual_roots argument", which overwrote the op it had
 * just applied. Derivation and the op agree for a known visual type, so only a case where they disagree shows it:
 * an unknown type (derivation says not visual), and a deliberate subset (AWP-001: "an explicit visual_roots wins,
 * verbatim").
 *
 * @module noodl-mcp/tests/setVisualRootsOp
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, type TestSession } from './helpers';

const rootsOnDisk = (s: TestSession, component: string) =>
  JSON.parse(fs.readFileSync(path.join(s.projectDir, 'components', component, 'nodes.json'), 'utf8')).visualRoots;

async function revision(s: TestSession, component: string): Promise<string> {
  return String((await call<{ revision: string }>(s, 'get_component', { path: component })).data.revision);
}

describe('set_visual_roots in an update batch', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await connect(copyFixture());
  });

  afterEach(async () => {
    await session.close();
  });

  it('keeps an unknown-type node as the root it was set to be', async () => {
    await call(session, 'create_component', {
      path: 'Thing',
      allow_unknown_types: true,
      nodes: [{ id: 'x', type: 'nowhere-kit.Widget', label: 'W' }]
    });
    // Known-firing control: derivation alone leaves the unknown node out.
    expect(rootsOnDisk(session, 'Thing')).toBeUndefined();

    const res = await call<Record<string, unknown>>(session, 'update_component', {
      path: 'Thing',
      if_revision: await revision(session, 'Thing'),
      allow_unknown_types: true,
      operations: [{ op: 'set_visual_roots', visualRoots: ['x'] }]
    });
    expect(res.isError).toBe(false);
    expect(res.data.unchanged).toBeUndefined();
    expect(rootsOnDisk(session, 'Thing')).toEqual(['x']);
  });

  it('keeps a deliberate subset of the visual roots', async () => {
    await call(session, 'create_component', {
      path: 'Two',
      nodes: [
        { id: 'a', type: 'Group', label: 'A' },
        { id: 'b', type: 'Group', label: 'B' }
      ]
    });
    expect(rootsOnDisk(session, 'Two')).toEqual(['a', 'b']);

    await call(session, 'update_component', {
      path: 'Two',
      if_revision: await revision(session, 'Two'),
      operations: [{ op: 'set_visual_roots', visualRoots: ['b'] }]
    });
    expect(rootsOnDisk(session, 'Two')).toEqual(['b']);
  });

  it('still derives when no op sets the roots (AWP-002 A20)', async () => {
    await call(session, 'create_component', { path: 'One', nodes: [{ id: 'a', type: 'Group', label: 'A' }] });
    await call(session, 'update_component', {
      path: 'One',
      if_revision: await revision(session, 'One'),
      operations: [{ op: 'add_node', node: { id: 'c', type: 'Group', label: 'C' } }]
    });
    expect(rootsOnDisk(session, 'One')).toEqual(['a', 'c']);
  });
});
