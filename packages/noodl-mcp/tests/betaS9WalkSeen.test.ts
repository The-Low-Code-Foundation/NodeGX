/**
 * BETA-S9-WALKSEEN — a write's own checks read every other component, and must not count as the agent reading them.
 *
 * `update_component` validates against the whole project (`authoredProjectViews`, `idsInUseElsewhere`), and both walks
 * went through `ProjectStore.readComponent`: the read-before-write door, which takes a drift snapshot, hashes the
 * files and records them as SEEN. So after any write, every component counted as read at that moment, and
 * `what_changed_since` (P125 CCN-002) compared the person's Studio edits against a baseline taken AFTER them: it
 * answered "none of the components you have read changed" about an edit the agent never saw.
 *
 * It was also the cost: 82 hashes and clones per write on the training template (0.97 s of a 2.6 s `update_component`,
 * BETA-S8-SEE001TIMEOUT). The walks now read through `ProjectStore.peekComponent`, which takes no snapshot.
 */

import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, reveal, TestSession } from './helpers';

type WhatChanged = { changed: { component: string }[]; unchanged: number; note: string };

describe('BETA-S9-WALKSEEN — a write does not read the rest of the project on the agent’s behalf', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir, true);
    await reveal(session, 'project');
  });
  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** The person edits Card in Studio: a Text's words. */
  function personEditsCard() {
    const nodesFile = path.join(dir, 'components', 'Card', 'nodes.json');
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes.nodes[1].parameters.text = 'changed in Studio';
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 2));
  }

  async function write(componentPath: string) {
    const write = await call<{ isError?: boolean }>(session, 'update_component', {
      path: componentPath,
      operations: [{ op: 'add_node', node: { id: 'walkseen_fn', type: 'JavaScriptFunction', parameters: { functionScript: 'Script.Outputs.x = 1;' } } }]
    });
    expect(write.isError).toBe(false);
  }

  it('control: with no write between, what_changed_since names the person’s edit', async () => {
    await call(session, 'get_component', { path: 'Card' });
    personEditsCard();
    const seen = await call<WhatChanged>(session, 'what_changed_since');
    expect(seen.data.changed.map((c) => c.component)).toEqual(['Card']);
  });

  it('🔴 a write to another component between the edit and the question still lets it be named', async () => {
    await call(session, 'get_component', { path: 'Card' });
    personEditsCard();
    await write('Pages/Home');
    const seen = await call<WhatChanged>(session, 'what_changed_since');
    expect(seen.data.changed.map((c) => c.component)).toEqual(['Card']);
  });

  it('a write does not make the components it checked count as read', async () => {
    // Card, not a page: a page's write also registers it in App's router, which is a real write of App.
    await write('Card');
    const seen = await call<WhatChanged>(session, 'what_changed_since');
    // Only Card, which the write read and wrote. App and Pages/Home were walked, not read.
    expect(seen.data.unchanged).toBe(1);
  });
});
