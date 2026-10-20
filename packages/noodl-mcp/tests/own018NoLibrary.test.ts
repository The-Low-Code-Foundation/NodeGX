/**
 * P112-OWN018-NOLIBRARY — from npm there is no `library/` on disk, and the four shelf tools failed on every call
 * ("set NODEGX_LIBRARY_DIR"). They are no longer registered on a server that cannot find a library; in a checkout
 * (the control) they are.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { call, connect, copyFixture, reveal, type TestSession } from './helpers';

const SHELF_TOOLS = ['list_library', 'get_library_entry', 'install_prefab', 'export_to_library'];

async function advertised(session: TestSession): Promise<string[]> {
  return (await session.client.listTools()).tools.map((t) => t.name);
}

describe('P112-OWN018-NOLIBRARY — no library on disk, no shelf tools', () => {
  const saved = process.env.NODEGX_LIBRARY_DIR;
  let empty: string;

  beforeEach(() => {
    empty = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-nolibrary-'));
  });
  afterEach(() => {
    fs.rmSync(empty, { recursive: true, force: true });
    if (saved === undefined) delete process.env.NODEGX_LIBRARY_DIR;
    else process.env.NODEGX_LIBRARY_DIR = saved;
  });

  it('a server with no library offers none of the four, even with the group revealed', async () => {
    process.env.NODEGX_LIBRARY_DIR = empty; // what an npm install amounts to: nothing to read
    const session = await connect(copyFixture(), true);
    try {
      await reveal(session, 'explore');
      const names = await advertised(session);
      expect(names).toContain('drive_page'); // the rest of the group still arrives
      for (const tool of SHELF_TOOLS) expect(names).not.toContain(tool);
      // call_tool (the door for a client that never re-reads the list) answers in words, not with a failed call.
      const viaCallTool = await call<{ error: { message: string } }>(session, 'call_tool', { name: 'list_library', arguments: {} });
      expect(viaCallTool.data.error.message).toContain('no tool named "list_library"');
    } finally {
      await session.close();
    }
  });

  it('control: in a checkout the same group offers all four', async () => {
    delete process.env.NODEGX_LIBRARY_DIR;
    const session = await connect(copyFixture(), true);
    try {
      await reveal(session, 'explore');
      const names = await advertised(session);
      for (const tool of SHELF_TOOLS) expect(names).toContain(tool);
    } finally {
      await session.close();
    }
  });
});
