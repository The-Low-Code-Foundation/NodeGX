/**
 * BMG-005 — Roles, over real sockets on a LOCKED backend, and the derivation of
 * what a role can do.
 *
 * AC4/AC5 are graded twice: `roleUses` over a fixture config is compared with a
 * second, independent reading that walks the raw JSON for the literal atom
 * `role:editors` (no knowledge of which keys are operations), so a derivation
 * that skipped a section or matched a lookalike (`role:editors2`,
 * `role:Editors`) disagrees with it.
 *
 * The server half is what the Roles page stands on: members by role
 * (`GET /admin/users?role=`), the first three names on `GET /admin/roles`, a
 * description (`PUT /admin/roles/:name`), and removal that takes exactly one
 * person out.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { RoleConfig, roleUses, ruleCount, useSentence } from '../src/admin/app/roleUses';
import type { AuditEntry } from '../src/ops/audit';

import { request } from './helpers/http';

jest.setTimeout(30000);

/** Every section a role can be named in, lookalikes beside the real ones. */
const FIXTURE: RoleConfig & Record<string, unknown> = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: ['role:editors', 'role:admins'], update: 'role:editors', delete: 'nobody' }
  },
  collections: {
    Pet: { permissions: { find: 'public', get: 'public', create: 'role:editors', update: ['role:editors', 'role:vets'], delete: 'role:Editors' } },
    Order: { permissions: { find: ['role:editors'], delete: 'role:editors2' } },
    Invoice: { permissions: { find: 'role:billing' } },
    Empty: {}
  },
  functions: {
    sendInvoice: { call: ['authenticated', 'role:editors'] },
    cleanup: { call: 'role:admins' },
    rateOnly: {}
  },
  files: { upload: 'role:editors', read: 'public', delete: 'nobody' },
  signup: 'nobody'
};

/** The independent reading: every string equal to the atom, wherever it sits, with its path. */
function atomsIn(value: unknown, atom: string, at: string[] = []): string[] {
  if (typeof value === 'string') return value === atom ? [at.join('.')] : [];
  if (Array.isArray(value)) return value.flatMap((v) => atomsIn(v, atom, at));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => atomsIn(v, atom, at.concat(k)));
  return [];
}

describe('BMG-005 what a role can do (roleUses)', () => {
  it('AC4: lists exactly the operations whose stored rule contains role:editors', () => {
    const uses = roleUses(FIXTURE, 'editors');
    expect(uses.map(useSentence)).toEqual([
      'Every collection without a rule of its own: create, change',
      'Order: list',
      'Pet: create, change',
      'The sendInvoice function: call',
      'Files: upload'
    ]);
    // The second reading: the same places, found without knowing the vocabulary.
    const paths = atomsIn(FIXTURE, 'role:editors').sort();
    expect(paths).toEqual([
      'collections.Order.permissions.find',
      'collections.Pet.permissions.create',
      'collections.Pet.permissions.update',
      'defaults.permissions.create',
      'defaults.permissions.update',
      'files.upload',
      'functions.sendInvoice.call'
    ]);
    // AC5's number is the same count, read both ways.
    expect(ruleCount(uses)).toBe(paths.length);
  });

  it('a role nothing names derives nothing; lookalikes and other roles stay apart', () => {
    expect(roleUses(FIXTURE, 'nobodyhere')).toEqual([]);
    expect(ruleCount(roleUses(FIXTURE, 'editors2'))).toBe(atomsIn(FIXTURE, 'role:editors2').length);
    expect(roleUses(FIXTURE, 'Editors').map(useSentence)).toEqual(['Pet: delete']);
    expect(roleUses(FIXTURE, 'admins').map(useSentence)).toEqual(['Every collection without a rule of its own: create', 'The cleanup function: call']);
    expect(roleUses({ signup: 'role:staff' }, 'staff').map(useSentence)).toEqual(['Signing up: sign up']);
    expect(roleUses(null, 'editors')).toEqual([]);
  });
});

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

interface RoleRow {
  objectId: string;
  name: string;
  description?: string;
  createdAt?: string;
  users: string[];
  names: string[];
}

describe('BMG-005 /admin/roles and members by role', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const A = { authorization: 'Bearer t0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = A) => request<T>(base, method, p, { body, headers });
  const roles = async () => (await req<{ roles: RoleRow[] }>('GET', '/admin/roles')).json.roles;
  const role = async (name: string) => (await roles()).find((r) => r.name === name)!;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg005-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg005', backendName: 'BMG-005', authToken: 't0k' });
    base = (await service.start()).listen.url;
    for (const [username, email] of [
      ['ann', 'ann@example.com'],
      ['bob', 'bob@example.com'],
      ['cat', 'cat@example.com'],
      ['dan', 'dan@example.com'],
      ['eve', null]
    ] as const) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', { username, email: email || undefined, password: 'pw-' + username });
      ids[username] = made.json.objectId;
    }
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('a role is made with a description, and the list carries it and when it was made', async () => {
    const made = await req('POST', '/admin/roles', { name: 'editors', description: '  People who change the catalogue  ' });
    expect(made.status).toBe(201);
    const r = await role('editors');
    expect(r.description).toBe('People who change the catalogue');
    expect(typeof r.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(r.createdAt!))).toBe(false);
    expect((await req('POST', '/admin/roles', { name: 'plain' })).status).toBe(201);
    expect((await role('plain')).description).toBeUndefined();
  });

  it('PUT /admin/roles/:name changes the description, clears it, and refuses anything else in words', async () => {
    expect((await req('PUT', '/admin/roles/plain', { description: 'Just people' })).status).toBe(200);
    expect((await role('plain')).description).toBe('Just people');
    expect((await req('PUT', '/admin/roles/plain', { description: '' })).status).toBe(200);
    expect((await role('plain')).description).toBeUndefined();

    const renamed = await req<{ error: string }>('PUT', '/admin/roles/plain', { name: 'other' });
    expect(renamed.status).toBe(400);
    expect(renamed.json.error).toContain('Only a role');
    const long = await req<{ error: string }>('PUT', '/admin/roles/plain', { description: 'x'.repeat(281) });
    expect(long.status).toBe(400);
    expect(long.json.error).toContain('280');
    expect((await req('PUT', '/admin/roles/nope', { description: 'x' })).status).toBe(404);
    expect((await req('POST', '/admin/roles', { name: 'bad name' })).status).toBe(400);
  });

  it('the change is audited as role.update, with no description text in the entry', async () => {
    const entries = (await req<{ entries: AuditEntry[] }>('GET', '/admin/audit?action=role.update')).json.entries;
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(entries)).not.toContain('Just people');
  });

  it('AC1 (server): the list names the first three members, never an id', async () => {
    for (const who of ['ann', 'bob', 'cat', 'dan', 'eve']) {
      expect((await req('POST', '/admin/roles/editors/users', { userId: ids[who] })).status).toBe(200);
    }
    const r = await role('editors');
    expect(r.users.sort()).toEqual(Object.values(ids).sort());
    expect(r.names).toHaveLength(3);
    for (const n of r.names) {
      expect(['ann', 'bob', 'cat', 'dan', 'eve']).toContain(n);
      expect(Object.values(ids)).not.toContain(n);
    }
    expect((await role('plain')).names).toEqual([]);
  });

  it('GET /admin/users?role= answers exactly the members; an empty role is empty; an unknown one is a 404', async () => {
    const got = await req<{ users: Array<{ objectId: string; username: string }>; total: number }>('GET', '/admin/users?role=editors&limit=200');
    expect(got.status).toBe(200);
    expect(got.json.users.map((u) => u.username).sort()).toEqual(['ann', 'bob', 'cat', 'dan', 'eve']);
    expect(got.json.total).toBe(5);
    const narrowed = await req<{ users: Array<{ username: string }> }>('GET', '/admin/users?role=editors&q=an');
    expect(narrowed.json.users.map((u) => u.username).sort()).toEqual(['ann', 'dan']);
    const empty = await req<{ users: unknown[]; total: number }>('GET', '/admin/users?role=plain');
    expect(empty.status).toBe(200);
    expect(empty.json).toMatchObject({ users: [], total: 0 });
    expect((await req('GET', '/admin/users?role=ghosts')).status).toBe(404);
  });

  it('AC2 (server): removing Bob removes exactly Bob; removing the rest leaves an empty role that still exists', async () => {
    expect((await req('DELETE', `/admin/roles/editors/users/${ids.bob}`)).status).toBe(200);
    const after = (await req<{ users: Array<{ username: string }> }>('GET', '/admin/users?role=editors')).json.users.map((u) => u.username).sort();
    expect(after).toEqual(['ann', 'cat', 'dan', 'eve']);
    for (const who of ['ann', 'cat', 'dan', 'eve']) await req('DELETE', `/admin/roles/editors/users/${ids[who]}`);
    const r = await role('editors');
    expect(r.users).toEqual([]);
    expect(r.names).toEqual([]);
    // The people are untouched: a membership went, an account did not.
    expect((await req('GET', `/admin/users/${ids.bob}`)).status).toBe(200);
  });

  it('AC5 (server config): the page reads the stored rules the delete warning counts', async () => {
    const config = (await req<{ config: RoleConfig }>('GET', '/admin/permissions')).json.config;
    const uses = roleUses(config, 'editors');
    expect(uses.map(useSentence)).toEqual(['Pet: create, change']);
    expect(ruleCount(uses)).toBe(2);
  });
});
