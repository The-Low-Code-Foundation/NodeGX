/**
 * P109 ISL-040 — P78-DBT-USERCOLS: a cloud function could make anybody the backend's administrator.
 *
 * A cloud function reaches its backend over loopback with the master key (`_noodl_cloudservices`),
 * and the master key is the admin principal, so `/classes/_User` let it write any account column:
 * `adminAccess: "full"` on the caller's own row made their next session the admin. The refusal the
 * account columns' docblock describes lived only in the admin user routes. `/classes/_User` also
 * stored a `password` as text.
 *
 * The attack, as a function makes it: the master key, `PUT /classes/_User/<id>`. The proof it
 * worked: the person's own session opens `/_admin/whoami`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

describe('ISL-040 P78-DBT-USERCOLS — the master key cannot write an account’s admin-only columns', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const MASTER = { 'x-parse-master-key': 't0k' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = <R = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = MASTER) =>
    request<R>(base, method, p, { body, headers });
  const signup = async (username: string) => {
    const res = await req<{ objectId: string; sessionToken: string }>('POST', '/users', { username, password: 'pw-123456', email: `${username}@example.com` }, {});
    expect(res.status).toBe(201);
    return { id: res.json.objectId, session: res.json.sessionToken };
  };
  const row = async (id: string) => (await req<Record<string, unknown>>('GET', `/classes/_User/${id}`)).json;
  const whoami = (session: string) => req('GET', '/_admin/whoami', undefined, { 'x-parse-session-token': session });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl040-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl040', backendName: 'ISL-040', authToken: 't0k' });
    base = (await service.start()).listen.url;
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('the attack does not land: the person’s own session cannot open the backend manager — beside an account the Users page granted, whose session can', async () => {
    // Known-firing control: access given through the door that owns it opens the manager.
    const alice = await signup('alice');
    expect((await req('PUT', `/admin/users/${alice.id}`, { adminAccess: 'full' }, { authorization: 'Bearer t0k' })).status).toBe(200);
    expect((await whoami(alice.session)).status).toBe(200);

    // The attack, as a cloud function makes it.
    const mallory = await signup('mallory');
    expect((await whoami(mallory.session)).status).toBeGreaterThanOrEqual(400);
    await req('PUT', `/classes/_User/${mallory.id}`, { adminAccess: 'full' });
    expect((await whoami(mallory.session)).status).toBeGreaterThanOrEqual(400);
    expect((await row(mallory.id)).adminAccess ?? null).toBeNull();
  });

  it('control: the master key still writes an ordinary account column', async () => {
    const bob = await signup('bob');
    const res = await req('PUT', `/classes/_User/${bob.id}`, { email: 'bob.new@example.com' });
    expect(res.status).toBe(200);
    expect((await row(bob.id)).email).toBe('bob.new@example.com');
  });

  it.each([
    ['adminAccess', 'full'],
    ['disabled', true],
    ['emailVerified', true],
    ['password', 'stored-as-text'],
    ['_hashed_password', 'x']
  ])('an update setting %s is refused by name, and nothing is written', async (field, value) => {
    const who = await signup(`u_${field.replace(/_/g, '')}`);
    const before = await row(who.id);
    const res = await req<{ error: string }>('PUT', `/classes/_User/${who.id}`, { [field]: value, email: 'changed@example.com' });
    expect([field, res.status]).toEqual([field, 400]);
    expect(res.json.error).toContain(field);
    const after = await row(who.id);
    expect([field, after.email, after.adminAccess ?? null, after.disabled ?? null, after.password ?? null]).toEqual([
      field,
      before.email,
      null,
      before.disabled ?? null,
      null
    ]);
  });

  it('a create carrying adminAccess is refused too', async () => {
    const res = await req<{ error: string }>('POST', '/classes/_User', { username: 'eve', adminAccess: 'full' });
    expect(res.status).toBe(400);
    expect(res.json.error).toContain('adminAccess');
    const found = await req<{ results: unknown[] }>('GET', `/classes/_User?where=${encodeURIComponent(JSON.stringify({ username: 'eve' }))}`);
    expect(found.json.results).toEqual([]);
  });
});
