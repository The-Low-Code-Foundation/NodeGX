/**
 * P127-BKO006-COMPVISIBLE — at the door: a placed component cannot be shown or hidden by itself, and the door says so.
 *
 * The shared-expenses agent wrote `User.authenticated -> <Group View>.visible` on its Home page; Group View declared no
 * Component Inputs, so the wire-target rule skipped it (it left interfaceless components to `interfaceless-instance`,
 * which reads parameters only). The write was clean, and the private screen drew under the sign-in card. The agent
 * found the answer only in a screenshot: wrap the instance in a Group and gate the Group's `mounted`.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, TestSession } from './helpers';

describe('P127-BKO006-COMPVISIBLE — showing or hiding a placed component', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
    const made = await call(session, 'create_component', {
      path: 'Group View',
      nodes: [
        { id: 'gv_root', type: 'Group' },
        { id: 'gv_t', type: 'Text', parent: 'gv_root', parameters: { text: 'Private' } }
      ],
      connections: [],
      visual_roots: ['gv_root']
    });
    expect(made.isError).toBe(false);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // The page's body as a plain component: a path under Pages/ also owes a Page node, which is not this row.
  const home = (extra: object[], connections: string[]) => ({
    path: 'Home Area',
    nodes: [{ id: 'hm_root', type: 'Group' }, { id: 'hm_user', type: 'net.noodl.user.User' }, ...extra],
    connections,
    visual_roots: ['hm_root']
  });

  it('the measured write: a wire into the instance’s visible is refused, with the wrapper to use', async () => {
    const res = await call(
      session,
      'create_component',
      home([{ id: 'hm_group', type: '/Group View', parent: 'hm_root' }], ['hm_user.authenticated -> hm_group.visible'])
    );
    expect(res.isError).toBe(true);
    const text = JSON.stringify(res);
    expect(text).toContain('connection-unknown-instance-port');
    expect(text).toContain('It declares no Component Inputs, so it has no inputs at all.');
    expect(text).toContain('A placed component has no Visible or Mounted of its own.');
  });

  it('a mounted: false parameter on the instance is refused with the same advice', async () => {
    const res = await call(
      session,
      'create_component',
      home([{ id: 'hm_group', type: '/Group View', parent: 'hm_root', parameters: { mounted: false } }], [])
    );
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res)).toContain('A placed component has no Visible or Mounted of its own.');
  });

  it('control: the wrapper Group, gated and starting hidden, is written', async () => {
    const res = await call(
      session,
      'create_component',
      home(
        [
          { id: 'hm_wrap', type: 'Group', parent: 'hm_root', parameters: { mounted: false } },
          { id: 'hm_group', type: '/Group View', parent: 'hm_wrap' }
        ],
        ['hm_user.authenticated -> hm_wrap.mounted']
      )
    );
    expect(res.isError).toBe(false);
  });
});
