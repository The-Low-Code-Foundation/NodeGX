/**
 * P112-S14-MOVEDDEPLOY — a project whose folder moved can redeploy its cloud functions.
 *
 * Before: the bundle is named `<project>-<hash of its folder path>`. After a move, a rename of the folder or a
 * copy, the deploy builds a bundle under a new name; the backend still holds the old one, which defines the same
 * `#__cloud__` components, and refused: `Duplicate component name /#__cloud__/Functions/Speak`. Nothing the person
 * could reach removed the old bundle.
 *
 * Now a pushed bundle carries its project's id, and the deploy replaces, in the same swap, a bundle this project
 * put there under another name: one with the same id, or an old one with no id that shares the name before the
 * hash and at least one component. Another project's bundle is never replaced; a clash with one is refused in
 * words that name it. Driven over `PUT /admin/workflows/:name`, read back by calling the function, by
 * `GET /admin/workflows` and on disk, and once more after a restart.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const ADMIN = { authorization: 'Bearer t0k' };

/** A function `name` that answers `{ said: <said> }`. */
function fn(name: string, said: string) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      { id: `req-${name}`, type: 'noodl.cloud.request', parameters: { allowNoAuth: true }, ports: [], children: [] },
      { id: `res-${name}`, type: 'noodl.cloud.response', parameters: { params: 'said', 'pm-said': said }, ports: [], children: [] }
    ],
    connections: [{ sourceId: `req-${name}`, sourcePort: 'receive', targetId: `res-${name}`, targetPort: 'send' }],
    roots: []
  };
}

const bundle = (components: unknown[], projectId?: string) => ({
  components,
  settings: {},
  metadata: {},
  ...(projectId ? { projectId } : {})
});

describe('P112-S14-MOVEDDEPLOY — a deploy replaces the bundle the same project left under another name', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  const deploy = (name: string, body: unknown) =>
    request<{ success?: boolean; error?: string; replaced?: string[] }>(base, 'PUT', `/admin/workflows/${name}`, { body, headers: ADMIN });
  const call = async (name: string) => {
    const res = await request<{ result?: { said?: string } }>(base, 'POST', `/functions/${name}`, { body: {} });
    return res.status === 200 ? res.json.result?.said : res.status;
  };
  const onDisk = () =>
    fs
      .readdirSync(path.join(dataDir, 'workflows'))
      .filter((f) => f.endsWith('.workflow.json'))
      .sort();

  async function start() {
    service = new BackendService({ dataDir, port: 0, backendId: 'moved', backendName: 'App backend', authToken: 't0k' });
    base = (await service.start()).listen.url;
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p112-moved-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    const security = defaultSecurityConfig();
    security.functions = Object.fromEntries(['Speak', 'Listen', 'Other'].map((n) => [n, { call: 'public' }]));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    // What OWN-015 round 2 left: the bundle `bonjour` deployed before ids travelled with it.
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'Bonjour-9828ff05.workflow.json'), JSON.stringify(bundle([fn('Speak', 'old')])));
    await start();
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('the copy (same name, new folder) replaces the old bundle that has no id — before, "Duplicate component name"', async () => {
    expect(await call('Speak')).toBe('old');
    const res = await deploy('Bonjour-fd5e9204', bundle([fn('Speak', 'new')], 'proj-1'));
    expect([res.status, res.json.success, res.json.replaced]).toEqual([200, true, ['Bonjour-9828ff05']]);
    expect(await call('Speak')).toBe('new');
    expect(onDisk()).toEqual(['Bonjour-fd5e9204.workflow.json']);
  });

  it('moved again: the bundle with the same id goes, even with no function in common', async () => {
    const res = await deploy('Bonjour-0badcafe', bundle([fn('Listen', 'moved')], 'proj-1'));
    expect([res.status, res.json.replaced]).toEqual([200, ['Bonjour-fd5e9204']]);
    expect(await call('Listen')).toBe('moved');
    expect(await call('Speak')).toBe(404);
    expect(onDisk()).toEqual(['Bonjour-0badcafe.workflow.json']);
  });

  it("another project's bundle is never replaced, and a clash with it names it", async () => {
    const shop = await deploy('Shop-11111111', bundle([fn('Other', 'shop')], 'proj-2'));
    expect([shop.status, shop.json.replaced]).toEqual([200, undefined]);

    const clash = await deploy('Bonjour-22222222', bundle([fn('Listen', 'x'), fn('Other', 'mine')], 'proj-1'));
    expect([clash.status, clash.json.success]).toEqual([409, false]);
    expect(clash.json.error).toMatch(/"\/#__cloud__\/Other"/);
    expect(clash.json.error).toMatch(/"Shop-11111111"/);
    // Nothing moved: the swap is all or nothing.
    expect([await call('Other'), await call('Listen')]).toEqual(['shop', 'moved']);
    expect(onDisk()).toEqual(['Bonjour-0badcafe.workflow.json', 'Shop-11111111.workflow.json']);
  });

  it('an old bundle with no id under another name is not taken for this project', async () => {
    await service.stop();
    fs.writeFileSync(path.join(dataDir, 'workflows', 'Kiosk-33333333.workflow.json'), JSON.stringify(bundle([fn('Speak', 'kiosk')])));
    await start();
    const res = await deploy('Bonjour-0badcafe', bundle([fn('Listen', 'moved'), fn('Speak', 'mine')], 'proj-1'));
    expect([res.status, res.json.success]).toEqual([409, false]);
    expect(res.json.error).toMatch(/"Kiosk-33333333"/);
    expect(await call('Speak')).toBe('kiosk');
  });

  it('after a restart the backend loads what the deploys left, with no duplicate', async () => {
    await service.stop();
    await start();
    expect([await call('Listen'), await call('Other'), await call('Speak')]).toEqual(['moved', 'shop', 'kiosk']);
    const listed = await request<{ workflows?: string[] } & Record<string, unknown>>(base, 'GET', '/admin/workflows', { headers: ADMIN });
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.json)).not.toMatch(/Bonjour-fd5e9204|Bonjour-9828ff05/);
  });
});
