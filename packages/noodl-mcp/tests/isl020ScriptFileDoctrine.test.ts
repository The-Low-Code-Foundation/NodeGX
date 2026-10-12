/**
 * P109 ISL-020 — an agent changes one line of a big script. Ruled 2026-10-05 (s18) "Close it, files are the
 * answer": after ISL-005 the island's engine is seven script files and `edit_script_file` changes one line of
 * one; a Function's own code (the garden's largest 31,745 characters) is still replaced whole, so the agent is
 * told where long code belongs instead of being given a second line-edit tool.
 *
 * Graded on the text a real server SENDS (`get_project_info.authoringDoctrine`), and against the server's own
 * tool list, so the sentence cannot name a tool that does not exist.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, type TestSession } from './helpers';
import type { FindToolsResponse, ProjectInfoResponse } from '../src/tools/responses';

describe('ISL-020 — long or shared code is a script file, and the doctrine says so', () => {
  let s: TestSession;

  beforeAll(async () => {
    s = await connect(copyFixture());
  });

  afterAll(async () => {
    await s.close();
    fs.rmSync(s.projectDir, { recursive: true, force: true });
  });

  it('the authoring doctrine an agent receives sends long code to a script file and names the line edit', async () => {
    const { data } = await call<ProjectInfoResponse>(s, 'get_project_info');
    const doctrine = String(data.authoringDoctrine);
    expect(doctrine).toMatch(/\*\*Shared or long code is a script file\.\*\*/);
    expect(doctrine).toMatch(/a Function body long enough\s+that you would change one line of it, goes in `scripts\/<name>\.js`/);
    expect(doctrine).toMatch(/`edit_script_file` then changes one\s+line without sending the file again/);
    expect(doctrine).toMatch(/a Function's own code can only be replaced whole/);
  });

  it('every tool the sentence names is one this server registers, found from the project group', async () => {
    const found = await call<FindToolsResponse>(s, 'find_tools', { group: 'project' });
    const names = JSON.stringify(found.data);
    for (const tool of ['write_script_file', 'edit_script_file']) expect(names).toContain(`"${tool}"`);
    // ...and no tool edits a Function's own code by line: the sentence's last clause stays true.
    const { tools } = await s.client.listTools();
    expect(tools.map((t) => t.name).filter((n) => /node_text|edit_function/.test(n))).toEqual([]);
  });
});
