/**
 * P132 BWF-012 — the agent's server keeps a project's saved API calls when it writes `nodegx.automations.json`.
 * Before, `patchAutomations` wrote back `version`, `workflows` and `triggers` only, so an agent's workflow edit would
 * have deleted every saved call from the project (three writers of one file, each with its own field list: s9).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { patchAutomations } from '../src/backend/projectFiles';

const call = { id: 'weather', params: { url: 'https://api.example.com/forecast', query: { city: { $path: 'fill.city' } } }, blanks: [{ name: 'city' }] };

describe('P132 BWF-012: patchAutomations and saved calls', () => {
  let dir: string;
  const file = () => path.join(dir, 'nodegx.automations.json');
  const read = () => JSON.parse(fs.readFileSync(file(), 'utf8'));
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bwf012-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("a workflow written keeps the file's saved calls", () => {
    fs.writeFileSync(file(), JSON.stringify({ version: 1, workflows: [], triggers: [], apiCalls: [call] }, null, 2) + '\n');
    patchAutomations(dir, 'workflow', 'morning', { id: 'morning', entry: 'ask', steps: [{ id: 'ask', kind: 'http-request', params: { call: 'weather', fill: { city: 'Paris' } } }] });
    expect(read().apiCalls).toEqual([call]);
    expect(read().workflows.map((w: { id: string }) => w.id)).toEqual(['morning']);
  });

  it('a saved call is set and removed by id, timestamps dropped; none left = no key', () => {
    fs.writeFileSync(file(), JSON.stringify({ version: 1, workflows: [], triggers: [] }, null, 2) + '\n');
    patchAutomations(dir, 'apiCall', 'weather', { ...call, createdAt: 'x', updatedAt: 'y' });
    expect(read().apiCalls).toEqual([call]);
    patchAutomations(dir, 'apiCall', 'weather', null);
    expect('apiCalls' in read()).toBe(false);
  });
});
