/**
 * P109 ISL-040 — P78-DBT-UNRULED: a function deployed to a RUNNING public backend with no rule ran for any
 * signed-in caller.
 *
 * SB-016's interlock refuses to START a public backend whose functions have no `functions` entry (an
 * undeclared function takes its rule from the graph's `Allow Unauthenticated` port, so an unticked one
 * means "any signed-in caller", and it runs as system). It ran only at start. `PUT /admin/workflows/:name`
 * and `POST /admin/workflows/reload` loaded new functions with no check at all.
 *
 * The bundle is SB-016's own: the Site Builder's cloud half, authored through the real MCP door.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../../noodl-mcp/src/server';
import { SB004_COMPONENTS } from '../../noodl-mcp/tests/sb004Components';
import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { declaredFunctionsIn } from '../src/workflow/functionDeclarations';

import { bundleAuthoredComponents, WorkflowBundle } from './helpers/authored-bundle';
import { request } from './helpers/http';

jest.setTimeout(300000);

const ADMIN = { authorization: 'Bearer t0k' };
const made: string[] = [];
const services: BackendService[] = [];
let bundle: WorkflowBundle;
let names: string[];

async function authorCloudHalf(): Promise<string> {
  const fixture = path.join(__dirname, '..', '..', 'noodl-mcp', 'tests', 'fixtures', 'demo-app');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl040-authored-'));
  made.push(dir);
  fs.cpSync(fixture, dir, { recursive: true });
  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl040', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  for (const component of SB004_COMPONENTS) {
    const res = (await client.callTool({
      name: 'create_component',
      arguments: { path: component.path, nodes: component.nodes, connections: component.connections }
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    if (res.isError) throw new Error(`create_component ${component.path} refused:\n${res.content?.[0]?.text}`);
  }
  await client.close();
  await server.close();
  return dir;
}

/** A running backend with no functions yet, its policy written before any function existed. */
async function start(host: string, label: string): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `isl040-${label}-`));
  made.push(dir);
  fs.writeFileSync(path.join(dir, 'security.json'), JSON.stringify({ ...defaultSecurityConfig(), devOpen: false, signup: 'public' }));
  fs.writeFileSync(path.join(dir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const svc = new BackendService({ dataDir: dir, port: 0, host, backendId: `isl040-${label}`, backendName: label, authToken: 't0k' });
  services.push(svc);
  const { listen } = await svc.start();
  return `http://127.0.0.1:${new URL(listen.url).port}`;
}

beforeAll(async () => {
  const projectDir = await authorCloudHalf();
  bundle = bundleAuthoredComponents(projectDir, SB004_COMPONENTS.map((c) => c.key));
  names = declaredFunctionsIn(bundle, 'site').map((f) => f.name).sort();
});
afterAll(async () => {
  for (const s of services) await s.stop().catch(() => undefined);
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

describe('ISL-040 P78-DBT-UNRULED — a deploy to a running backend meets SB-016’s rule', () => {
  it('the bundle declares endpoints with no rule (the fixture is the case)', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it('on a public bind, a deploy carrying an undeclared function is refused by name, and nothing runs', async () => {
    const base = await start('0.0.0.0', 'public');
    const res = await request<{ error: string; success: boolean }>(base, 'PUT', '/admin/workflows/site', { body: bundle as never, headers: ADMIN });
    expect(res.status).toBe(409);
    // The editor's and the MCP door's deploy clients read `success`, not the status.
    expect(res.json.success).toBe(false);
    for (const n of names) expect(res.json.error).toContain(n);
    expect(res.json.error).toContain('/admin/permissions/functions/');

    // The attack the refusal prevents: a signed-up account, no role, calls the endpoint.
    const user = await request<{ sessionToken: string }>(base, 'POST', '/users', { body: { username: 'learner', password: 'pw-123456' } });
    expect(user.status).toBe(201);
    const unticked = declaredFunctionsIn(bundle, 'site').find((f) => !f.allowNoAuth)!;
    const call = await request(base, 'POST', `/functions/${encodeURIComponent(unticked.name)}`, {
      body: {},
      headers: { 'x-parse-session-token': user.json.sessionToken }
    });
    expect([unticked.name, call.status]).toEqual([unticked.name, 404]);

    // Declared first (as the refusal says), the same deploy goes through.
    for (const n of names) {
      const declared = await request(base, 'PUT', `/admin/permissions/functions/${encodeURIComponent(n)}`, { body: { call: 'role:admin' }, headers: ADMIN });
      expect([n, declared.status]).toEqual([n, 200]);
    }
    const again = await request(base, 'PUT', '/admin/workflows/site', { body: bundle as never, headers: ADMIN });
    expect(again.status).toBe(200);
    const refused = await request(base, 'POST', `/functions/${encodeURIComponent(unticked.name)}`, {
      body: {},
      headers: { 'x-parse-session-token': user.json.sessionToken }
    });
    expect([unticked.name, refused.status]).toEqual([unticked.name, 403]);
  });

  it('on loopback the deploy goes through, and the answer says which functions have no rule', async () => {
    const base = await start('127.0.0.1', 'loopback');
    const res = await request<{ success: boolean; warning?: string }>(base, 'PUT', '/admin/workflows/site', { body: bundle as never, headers: ADMIN });
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    for (const n of names) expect(res.json.warning || '').toContain(n);
  });

  it('a reload of the workflows folder on a public bind is held to the same rule', async () => {
    const base = await start('0.0.0.0', 'reload');
    const dir = made[made.length - 1];
    fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'workflows', 'site.workflow.json'), JSON.stringify(bundle));
    const res = await request<{ error: string }>(base, 'POST', '/admin/workflows/reload', { body: {}, headers: ADMIN });
    expect(res.status).toBe(409);
    for (const n of names) expect(res.json.error).toContain(n);
  });
});
