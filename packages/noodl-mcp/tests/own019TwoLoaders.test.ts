/**
 * P112-OWN019-TWOLOADERS — `validate_project` reads each nodes.json flat; the preview and `nodegx deploy` rebuild the
 * project by walking `children` and gate on that. A child listed twice is fine to the first and fatal to the second
 * (P112-OWN019-DUPCHILD: 0 errors here, 38 `duplicate-node-id` in the person's preview). `validate_project` now runs
 * the preview's own read and gate as well, and reports what it refuses.
 *
 * Control: the same project unedited validates with no preview refusal, so the error is about the edit.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture } from './helpers';

interface Report {
  summary: { errors: number };
  diagnostics: Array<{ code: string; severity: string; message: string; location: { component: string; nodeId?: string } }>;
}

const HOME = path.join('components', 'Pages', 'Home', 'nodes.json');

describe('P112-OWN019-TWOLOADERS — validate_project says what the preview would refuse', () => {
  it('a child listed twice in its parent (the DUPCHILD shape, written by hand) is an error', async () => {
    const dir = copyFixture();
    const file = path.join(dir, HOME);
    const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
    const layout = nodes.nodes.find((n: { id: string }) => n.id === 'layout');
    layout.children = [...layout.children, layout.children[0]];
    fs.writeFileSync(file, JSON.stringify(nodes, null, 2));

    const session = await connect(dir, true);
    try {
      const { data } = await call<Report>(session, 'validate_project');
      const refused = data.diagnostics.filter((d) => d.code === 'duplicate-node-id' && d.severity === 'error');
      expect(refused.length).toBeGreaterThan(0);
      expect(refused[0].message).toContain('The preview and `nodegx deploy` refuse this');
      expect(refused[0].location.component).toContain('Home');
      expect(data.summary.errors).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  it('control: the project unedited has no preview refusal', async () => {
    const session = await connect(copyFixture(), true);
    try {
      const { data } = await call<Report>(session, 'validate_project');
      expect(data.diagnostics.filter((d) => d.message.includes('The preview and `nodegx deploy` refuse this'))).toEqual([]);
    } finally {
      await session.close();
    }
  });
});
