/**
 * BMG-007 — `PUT /admin/keys/:id`: the API keys page edits what a key may do.
 * AC6 over real sockets: the edit shows in `GET /admin/keys`, the audit trail
 * records it, and the key's next request is judged by the new scopes.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { AuditEntry } from '../src/ops/audit';

import { request } from './helpers/http';
import { readonlyAdminMayCall } from '../src/admin/readonly';

jest.setTimeout(30000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

interface KeyRow {
  objectId: string;
  name: string;
  scopes: string[];
  revoked: boolean;
  actsAsUserId: string | null;
  lastUsedAt: string | null;
}

describe('BMG-007 PUT /admin/keys/:id', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
    request<T>(base, method, p, { body, headers });
  const keys = async () => (await req<{ keys: KeyRow[] }>('GET', '/admin/keys', undefined, asAdmin())).json.keys;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg007-'));
    // Locked, like FED-005's: a dev-open backend bypasses key scopes wholesale
    // (measured: a classes:read key got 201 on POST under the default posture).
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_bmg007', backendName: 'BMG-007' });
    base = (await service.start()).listen.url;
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] }, asAdmin());
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC6: changes the scopes, the list shows it, the audit trail records it, and the key obeys the new scopes', async () => {
    const made = await req<{ objectId: string; secret: string }>('POST', '/admin/keys', { name: 'reporting', scopes: ['classes:read'] }, asAdmin());
    expect(made.status).toBe(201);
    const { objectId, secret } = made.json;
    const asKey = () => ({ 'x-nodegx-api-key': secret });

    expect((await req('POST', '/api/Pet', { name: 'Milo' }, asKey())).status).toBe(403);

    const put = await req('PUT', `/admin/keys/${objectId}`, { scopes: ['classes:*'] }, asAdmin());
    expect(put.status).toBe(200);
    expect((await keys()).find((k) => k.objectId === objectId)!.scopes).toEqual(['classes:*']);

    expect((await req('POST', '/api/Pet', { name: 'Milo' }, asKey())).status).toBe(201);

    const trail = await req<{ entries: AuditEntry[] }>('GET', '/admin/audit?action=apikey.update', undefined, asAdmin());
    const entry = trail.json.entries[0];
    expect(entry).toMatchObject({ action: 'apikey.update', outcome: 'success', method: 'PUT', route: 'admin/keys/:id' });
    expect(entry.detail).toMatchObject({ keyId: objectId, scopes: ['classes:*'] });
    expect(JSON.stringify(entry)).not.toContain(secret);
  });

  it('binds and unbinds the acting user, and refuses a user that does not exist', async () => {
    const user = await req<{ objectId?: string; user?: { objectId: string } }>('POST', '/users', { username: 'ann', email: 'ann@example.com', password: 'secret-pw-1' });
    const annId = user.json.objectId || user.json.user!.objectId;
    const made = await req<{ objectId: string }>('POST', '/admin/keys', { name: 'ann-laptop', scopes: ['classes:read'] }, asAdmin());
    const id = made.json.objectId;

    expect((await req('PUT', `/admin/keys/${id}`, { actsAsUserId: 'no-such-user' }, asAdmin())).status).toBe(400);
    expect((await req('PUT', `/admin/keys/${id}`, { actsAsUserId: annId }, asAdmin())).status).toBe(200);
    expect((await keys()).find((k) => k.objectId === id)!.actsAsUserId).toBe(annId);
    expect((await req('PUT', `/admin/keys/${id}`, { actsAsUserId: null }, asAdmin())).status).toBe(200);
    expect((await keys()).find((k) => k.objectId === id)!.actsAsUserId).toBeNull();
  });

  it('refuses a bad scope, an empty patch, an unknown key, and a revoked key', async () => {
    const made = await req<{ objectId: string }>('POST', '/admin/keys', { name: 'temp', scopes: ['functions:*'] }, asAdmin());
    const id = made.json.objectId;
    const bad = await req<{ error: string }>('PUT', `/admin/keys/${id}`, { scopes: ['everything'] }, asAdmin());
    expect(bad.status).toBe(400);
    expect(bad.json.error).toContain('unknown scope');
    expect((await req('PUT', `/admin/keys/${id}`, {}, asAdmin())).status).toBe(400);
    expect((await req('PUT', `/admin/keys/does-not-exist`, { scopes: ['classes:read'] }, asAdmin())).status).toBe(404);
    expect((await req('DELETE', `/admin/keys/${id}`, undefined, asAdmin())).status).toBe(200);
    const revoked = await req<{ error: string }>('PUT', `/admin/keys/${id}`, { scopes: ['classes:read'] }, asAdmin());
    expect(revoked.status).toBe(409);
    expect((await keys()).find((k) => k.objectId === id)!.scopes).toEqual(['functions:*']);
  });

  it('a read-only admin cannot use it', async () => {
    // The read-only tier is a second credential; without one provisioned, the
    // policy table is the gate this spec can reach: PUT is not in the safe set.
    expect(readonlyAdminMayCall('PUT', 'admin/keys/:id')).toBe(false);
  });
});
