/**
 * P112 OWN-026 FIX-01 — a backend the kit provisions keeps users apart by itself.
 *
 * A stranger's agent built a multi-user app on a local backend that started with
 * `"devOpen": true`: its rules were written and not enforced, so another user's
 * token, or none, read and changed every user's rows (P112-OWN023-DEVOPENREAD).
 * `--enforce-rules` mints the default rules with `devOpen: false` on a first
 * start, so what the agent tests on its machine is what a deploy enforces.
 *
 * The control arm is the same start without the flag: it must still be open, or
 * the enforced arm proves nothing about the flag.
 *
 * The last group is FIX-01 C's precondition: `Increment` is what the kit teaches
 * for a value several devices change, and on a field no record had set yet it
 * answered 404 "Object not found".
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

jest.setTimeout(120000);

interface Started {
  base: string;
  admin: string;
  dataDir: string;
  enforced: boolean;
}

const running: BackendService[] = [];
afterAll(async () => {
  for (const svc of running) await svc.stop();
});

async function start(label: string, opts: { enforceRules?: boolean; securityJson?: unknown } = {}): Promise<Started> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `own026-${label}-`));
  if (opts.securityJson) fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(opts.securityJson));
  const svc = new BackendService({
    dataDir,
    port: 0,
    backendId: `own026-${label}`,
    backendName: `OWN-026 ${label}`,
    enforceRules: opts.enforceRules
  });
  running.push(svc);
  const started = await svc.start();
  const admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  return { base: started.listen.url, admin, dataDir, enforced: started.security.enforced };
}

async function call(base: string, method: string, p: string, body?: unknown, session?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'own026' };
  if (session) headers['x-parse-session-token'] = session;
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, json };
}

async function signUp(base: string, name: string): Promise<string> {
  const r = await call(base, 'POST', '/users', { username: name, password: `pw-${name}-123`, email: `${name}@own026.test` });
  expect(r.status).toBe(201);
  return r.json.sessionToken;
}

/** One person's day on the backend, and a second person trying to reach into it. */
async function twoUsers(s: Started) {
  const a = await signUp(s.base, 'ada');
  const b = await signUp(s.base, 'bea');
  const created = await call(s.base, 'POST', '/classes/Note', { text: 'ada only' }, a);
  const id = created.json?.objectId;
  const seeded = await fetch(`${s.base}/classes/Note`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s.admin}` },
    body: JSON.stringify({ text: 'for everyone' })
  });
  const bFind = await call(s.base, 'GET', '/classes/Note', undefined, b);
  const aFind = await call(s.base, 'GET', '/classes/Note', undefined, a);
  return {
    aCreate: created.status,
    anonFind: (await call(s.base, 'GET', '/classes/Note')).status,
    anonUsers: (await call(s.base, 'GET', '/classes/_User')).status,
    bSees: (bFind.json?.results ?? []).map((r: any) => r.text).sort(),
    bGet: (await call(s.base, 'GET', `/classes/Note/${id}`, undefined, b)).status,
    bPut: (await call(s.base, 'PUT', `/classes/Note/${id}`, { text: 'changed by bea' }, b)).status,
    aSees: (aFind.json?.results ?? []).map((r: any) => r.text).sort(),
    aPut: (await call(s.base, 'PUT', `/classes/Note/${id}`, { text: 'ada edited' }, a)).status,
    adminSeed: seeded.status
  };
}

describe('OWN-026 FIX-01 A — --enforce-rules', () => {
  it('control: without the flag a first start mints dev-open, and another user reads and changes your rows', async () => {
    const s = await start('control');
    expect(JSON.parse(fs.readFileSync(path.join(s.dataDir, 'security.json'), 'utf-8')).devOpen).toBe(true);
    const r = await twoUsers(s);
    expect(r.anonFind).toBe(200);
    expect(r.bSees).toContain('ada only');
    expect(r.bPut).toBe(200);
  });

  it('with the flag the default rules are enforced from the first record: anonymous refused, users kept apart, your own app still works', async () => {
    const s = await start('enforced', { enforceRules: true });
    const onDisk = JSON.parse(fs.readFileSync(path.join(s.dataDir, 'security.json'), 'utf-8'));
    expect(onDisk.devOpen).toBe(false);
    expect(onDisk.defaults).toEqual({
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
      creatorOwns: true
    });
    expect(s.enforced).toBe(true);

    const r = await twoUsers(s);
    expect(r).toEqual({
      aCreate: 201,
      anonFind: 403,
      anonUsers: 403,
      // A row the admin seeded has no owner, so every signed-in user reads it; bea never sees ada's.
      bSees: ['for everyone'],
      bGet: 404,
      bPut: 404,
      aSees: ['ada only', 'for everyone'],
      aPut: 200,
      adminSeed: 201
    });
  });

  it('never changes a backend that already has rules, even with the flag', async () => {
    const open = { version: 1, devOpen: true, defaults: { permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' }, creatorOwns: true }, collections: {}, functions: {}, files: { upload: 'authenticated', read: 'public', delete: 'nobody' }, signup: 'public' };
    const s = await start('existing', { enforceRules: true, securityJson: open });
    expect(JSON.parse(fs.readFileSync(path.join(s.dataDir, 'security.json'), 'utf-8')).devOpen).toBe(true);
    expect(s.enforced).toBe(false);
  });
});

describe('OWN-026 FIX-01 C — Increment on a field no record has set yet', () => {
  it('starts the counter at the amount instead of answering "Object not found"', async () => {
    const s = await start('increment', { enforceRules: true });
    const a = await signUp(s.base, 'cal');
    const row = await call(s.base, 'POST', '/classes/Tally', { label: 'x' }, a);
    expect(row.status).toBe(201);
    const first = await call(s.base, 'PUT', `/classes/Tally/${row.json.objectId}`, { points: { __op: 'Increment', amount: 2 } }, a);
    expect(first.status).toBe(200);
    expect(first.json.points).toBe(2);
    const second = await call(s.base, 'PUT', `/classes/Tally/${row.json.objectId}`, { points: { __op: 'Increment', amount: 3 } }, a);
    expect(second.json.points).toBe(5);
  });
});
