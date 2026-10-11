/**
 * P109 ISL-042 — P96-FED005-R10: an author writes a description on a cloud component for the model that will call it,
 * and the model never saw it. Every function's MCP tool said `Run the cloud function "X" on this NodeGX backend.`, so a
 * model choosing between nine tools chose on names alone (DBT had to ship its brief as a tool of its own).
 *
 * The editor's exporter now carries the component's `description` into the bundle (graded in noodl-mcp's
 * `isl042CloudDescription`), and the backend's tool takes it. A function with no description keeps the generic
 * sentence: that arm is the control.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const ADMIN = { authorization: 'Bearer t0k' };

function fn(name: string, description?: string) {
  return {
    name: `/#__cloud__/${name}`,
    ...(description === undefined ? {} : { description }),
    nodes: [
      { id: `req-${name}`, type: 'noodl.cloud.request', parameters: { params: 'topic' }, ports: [], children: [] },
      { id: `res-${name}`, type: 'noodl.cloud.response', parameters: {}, ports: [], children: [] }
    ],
    connections: [{ sourceId: `req-${name}`, sourcePort: 'receive', targetId: `res-${name}`, targetPort: 'send' }],
    roots: []
  };
}

describe('ISL-042 P96-FED005-R10 — a cloud function\'s MCP tool says what its author wrote', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let tools: Record<string, string>;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl042-desc-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    const security = defaultSecurityConfig();
    security.functions = { authoringGuide: { call: 'public' }, plainFunction: { call: 'public' } };
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl042d', backendName: 'descriptions', authToken: 't0k' });
    base = (await service.start()).listen.url;

    const deployed = await request<{ success?: boolean }>(base, 'PUT', '/admin/workflows/main', {
      body: {
        components: [fn('authoringGuide', 'Read this first. It is the writing brief: tone, length and the words to avoid.'), fn('plainFunction')],
        settings: {},
        metadata: {}
      },
      headers: ADMIN
    });
    expect([deployed.status, deployed.json.success]).toEqual([200, true]);

    const key = await request<{ key?: string; secret?: string }>(base, 'POST', '/admin/keys', {
      body: { name: 'desc-reader', scopes: ['functions:*'] },
      headers: ADMIN
    });
    const secret = key.json.secret;
    expect(typeof secret).toBe('string');
    const listed = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nodegx-api-key': secret as string },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    const body = (await listed.json()) as { result?: { tools?: { name: string; description: string }[] } };
    tools = Object.fromEntries((body.result?.tools ?? []).map((t) => [t.name, t.description]));
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('the described function\'s tool leads with the description its author wrote', () => {
    expect(tools.authoringGuide).toMatch(/^Read this first\. It is the writing brief: tone, length and the words to avoid\./);
    expect(tools.authoringGuide).toContain('Takes: topic');
  });

  it('control: a function with no description keeps the generic sentence', () => {
    expect(tools.plainFunction).toBe('Run the cloud function "plainFunction" on this NodeGX backend. Takes: topic.');
  });
});
