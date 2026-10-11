/**
 * P109 ISL-042 — P78-DBT-BUNDLEWIRES: two malformed function bundles deployed and loaded without a word, and every
 * call then waited out the timeout.
 *
 * - Wires in the on-disk spelling (`fromId` / `fromProperty` / `toId` / `toProperty`). A bundle's wires are
 *   `sourceId` / `sourcePort` / `targetId` / `targetPort`, so nothing was wired.
 * - A helper component deployed with `ports: []`. Its instances have no ports, so the wires into them go nowhere.
 *
 * `PUT /admin/workflows/:name` now refuses the first (400, `success: false`, both spellings named) and deploys the
 * second with a `warning` that names the component and the port. Each has a control: the right spelling deploys and
 * answers; a helper that declares its port deploys with no warning.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const ADMIN = { authorization: 'Bearer t0k' };

type Wire = Record<string, string>;

function endpoint(name: string, wire: (from: string, fromPort: string, to: string, toPort: string) => Wire) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      { id: `req-${name}`, type: 'noodl.cloud.request', parameters: { allowNoAuth: true }, ports: [], children: [] },
      { id: `res-${name}`, type: 'noodl.cloud.response', parameters: { params: 'ok', 'pm-ok': 'yes' }, ports: [], children: [] }
    ],
    connections: [wire(`req-${name}`, 'receive', `res-${name}`, 'send')],
    roots: []
  };
}
const bundleSpelling = (sourceId: string, sourcePort: string, targetId: string, targetPort: string) => ({ sourceId, sourcePort, targetId, targetPort });
const diskSpelling = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });

/** An endpoint that places `/#<name>-helper` and wires its `text` input; the helper declares `ports` as given. */
function withHelper(name: string, helperPorts: unknown[]) {
  const helper = `/#${name}-helper`;
  return {
    components: [
      {
        name: helper,
        nodes: [{ id: 'ci', type: 'Component Inputs', parameters: {}, ports: [{ name: 'text', type: '*', plug: 'output' }], children: [] }],
        connections: [],
        ports: helperPorts,
        roots: []
      },
      {
        name: `/#__cloud__/${name}`,
        nodes: [
          { id: 'req', type: 'noodl.cloud.request', parameters: { allowNoAuth: true, params: 'text' }, ports: [], children: [] },
          { id: 'h', type: helper, parameters: {}, ports: [], children: [] },
          { id: 'res', type: 'noodl.cloud.response', parameters: {}, ports: [], children: [] }
        ],
        connections: [
          { sourceId: 'req', sourcePort: 'pm-text', targetId: 'h', targetPort: 'text' },
          { sourceId: 'req', sourcePort: 'receive', targetId: 'res', targetPort: 'send' }
        ],
        roots: []
      }
    ],
    settings: {},
    metadata: {}
  };
}

describe('ISL-042 P78-DBT-BUNDLEWIRES — a bundle whose wires reach nothing is named at deploy', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  const deploy = (name: string, body: unknown) =>
    request<{ success?: boolean; error?: string; warning?: string }>(base, 'PUT', `/admin/workflows/${name}`, { body, headers: ADMIN });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl042-bundle-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    // Each function has its rule, so SB-016's "no rule" warning (ISL-040 UNRULED) stays out of these readings.
    const security = defaultSecurityConfig();
    security.functions = Object.fromEntries(['right', 'ondisk', 'emptyhelper', 'fullhelper'].map((n) => [n, { call: 'public' }]));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl042b', backendName: 'bundle wires', authToken: 't0k' });
    base = (await service.start()).listen.url;
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('control: the bundle spelling deploys and the endpoint answers', async () => {
    const res = await deploy('right', { components: [endpoint('right', bundleSpelling)], settings: {}, metadata: {} });
    expect([res.status, res.json.success, res.json.warning]).toEqual([200, true, undefined]);
    const call = await request<{ result?: { ok?: string } }>(base, 'POST', '/functions/right', { body: {} });
    expect([call.status, call.json.result?.ok]).toEqual([200, 'yes']);
  });

  it('refuses wires in the on-disk spelling, names both spellings, and leaves nothing deployed', async () => {
    const res = await deploy('ondisk', { components: [endpoint('ondisk', diskSpelling)], settings: {}, metadata: {} });
    expect([res.status, res.json.success]).toEqual([400, false]);
    expect(res.json.error).toMatch(/\/#__cloud__\/ondisk/);
    expect(res.json.error).toMatch(/fromId/);
    expect(res.json.error).toMatch(/sourceId/);
    expect(fs.existsSync(path.join(dataDir, 'workflows', 'ondisk.workflow.json'))).toBe(false);
  });

  it('warns about a wire into a helper port the helper does not declare (ports: [])', async () => {
    const res = await deploy('emptyhelper', withHelper('emptyhelper', []));
    expect([res.status, res.json.success]).toEqual([200, true]);
    expect(res.json.warning).toMatch(/\/#emptyhelper-helper/);
    expect(res.json.warning).toMatch(/"text"/);
  });

  it('control: the same helper declaring its `text` input deploys with no warning', async () => {
    const res = await deploy('fullhelper', withHelper('fullhelper', [{ name: 'text', type: '*', plug: 'input', index: 0 }]));
    expect([res.status, res.json.success, res.json.warning]).toEqual([200, true, undefined]);
  });
});
