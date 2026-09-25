/**
 * BMG-006 — the server half of the Permissions page, over real sockets on a
 * LOCKED backend.
 *
 * AC4: the whole-config route now carries a version tag (`etag`, the `ETag`
 * header) and refuses a `PUT` whose `If-Match` is stale with 412 and a
 * sentence, saving nothing — so the page's read-patch-write cannot overwrite a
 * change made under it. A PUT with no header behaves as it always did.
 * AC5: the dry run answers what `checkClp` answers for the person's principal.
 * AC6: a `_` table cannot be given rules — the validator's refusal is why the
 * page never draws one.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { configEtag } from '../src/server/admin-security';
import { checkClp, SecurityConfig } from '../src/security/model';

import { request } from './helpers/http';

jest.setTimeout(30000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: true
  },
  collections: { Pet: { permissions: { create: 'role:editors', update: ['role:editors', 'authenticated'] } } },
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'nobody'
};

interface PermsBody {
  config: SecurityConfig;
  etag: string;
  enforced: boolean;
}

describe('BMG-006 /admin/permissions with a version tag', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const A = { authorization: 'Bearer t0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = A) => request<T>(base, method, p, { body, headers });
  let ann = '';

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg006-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg006', backendName: 'BMG-006', authToken: 't0k' });
    base = (await service.start()).listen.url;
    ann = (await req<{ objectId: string }>('POST', '/admin/users', { username: 'ann', email: 'ann@example.com', password: 'pw-ann' })).json.objectId;
    await req('POST', '/admin/roles', { name: 'editors' });
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC4: GET answers the tag in the body and as ETag, and it is a digest of the stored config', async () => {
    const r = await req<PermsBody>('GET', '/admin/permissions');
    expect(r.status).toBe(200);
    expect(r.json.etag).toBe(configEtag(r.json.config));
    expect(r.headers.get('etag')).toBe(r.json.etag);
    expect(r.json.etag).toMatch(/^"[0-9a-f]{20}"$/);
  });

  it('AC4: a PUT whose If-Match is current is saved and answers the new tag; a stale one is refused with 412 and saves nothing', async () => {
    const before = await req<PermsBody>('GET', '/admin/permissions');
    const next = JSON.parse(JSON.stringify(before.json.config)) as SecurityConfig;
    next.signup = 'public';
    next.files.delete = 'role:editors';
    next.functions.sendInvoice = { call: ['authenticated', 'role:editors'], rateLimit: { ratePerMinute: 30, burst: 10 }, timeoutMs: 5000, idempotency: { enabled: true, requireKey: true } };
    const saved = await req<PermsBody>('PUT', '/admin/permissions', next, { ...A, 'If-Match': before.json.etag });
    expect(saved.status).toBe(200);
    expect(saved.json.etag).not.toBe(before.json.etag);
    // Read back equal — every field, through the whole-config route.
    const after = await req<PermsBody>('GET', '/admin/permissions');
    expect(after.json.config.signup).toBe('public');
    expect(after.json.config.files.delete).toBe('role:editors');
    expect(after.json.config.functions.sendInvoice).toEqual(next.functions.sendInvoice);
    expect(after.json.etag).toBe(saved.json.etag);
    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'security.json'), 'utf8')).signup).toBe('public');

    // The page that loaded BEFORE that write tries to save its own change.
    const stale = JSON.parse(JSON.stringify(before.json.config)) as SecurityConfig;
    stale.defaults.permissions.delete = 'authenticated';
    const refused = await req<{ error: string }>('PUT', '/admin/permissions', stale, { ...A, 'If-Match': before.json.etag });
    expect(refused.status).toBe(412);
    expect(refused.json.error).toMatch(/changed since this page loaded/);
    expect(refused.json.error).toMatch(/Nothing was saved/);
    const still = await req<PermsBody>('GET', '/admin/permissions');
    expect(still.json.config.defaults.permissions.delete).toBe('nobody');
    expect(still.json.config.signup).toBe('public');
    expect(still.json.etag).toBe(saved.json.etag);

    // No header: the write goes through as it always did (MCP and the editor send none).
    const plain = await req<PermsBody>('PUT', '/admin/permissions', { ...still.json.config, signup: 'nobody' });
    expect(plain.status).toBe(200);
    expect((await req<PermsBody>('GET', '/admin/permissions')).json.config.signup).toBe('nobody');
  });

  it('AC5: the dry run answers what checkClp answers for ann’s principal, roles resolved live', async () => {
    const config = (await req<PermsBody>('GET', '/admin/permissions')).json.config;
    const asks = async (op: string) => (await req<{ allowed: boolean; rule: unknown; reason: string }>('POST', '/admin/permissions/check', { principal: { kind: 'user', userId: ann }, collection: 'Pet', op })).json;
    // Ann is in no role: Change on Pet is ['role:editors','authenticated'] and she is signed in.
    let local = checkClp(config, { kind: 'user', userId: ann, roles: [] }, 'Pet', 'update');
    expect(await asks('update')).toMatchObject({ allowed: local.allowed, rule: local.rule, reason: local.reason });
    expect(local.allowed).toBe(true);
    // Create is role:editors only: refused, until she joins the role.
    local = checkClp(config, { kind: 'user', userId: ann, roles: [] }, 'Pet', 'create');
    expect(await asks('create')).toMatchObject({ allowed: false, rule: 'role:editors', reason: local.reason });
    await req('POST', '/admin/roles/editors/users', { userId: ann });
    local = checkClp(config, { kind: 'user', userId: ann, roles: ['editors'] }, 'Pet', 'create');
    expect(await asks('create')).toMatchObject({ allowed: true, rule: 'role:editors', reason: local.reason });
    // Signed out, on the defaults: refused.
    const anon = (await req<{ allowed: boolean }>('POST', '/admin/permissions/check', { principal: { kind: 'anonymous' }, collection: 'Pet', op: 'find' })).json;
    expect(anon.allowed).toBe(false);
  });

  it('AC6: a system table cannot carry rules — the validator refuses by name', async () => {
    const r = await req<{ error: string }>('PUT', '/admin/permissions/collections/_User', { permissions: { find: 'public' } });
    expect(r.status).toBe(400);
    expect(r.json.error).toMatch(/system collections have a fixed posture/);
  });
});
