/**
 * P123-S6-CREATOREDITS — "everyone reads a row, only the person who made it changes it", in one line.
 *
 * Ruled (a) by Richard 2026-10-24: a `creator` rule value. Before it, the commonest posture of a
 * Bubble app or a board (`find: public`, edits only by the maker) could not be written: `creatorOwns`
 * hid the row from everyone else, and `update`/`delete` took `public | authenticated | nobody |
 * role:<name> | { path }`, none of which names the row's maker. `creator` lets a signed-in caller in
 * to the rows whose `owner` is them — the field the server stamps and no caller can write
 * (OWN-026 FIX-05, `own026-owner-is-the-servers.test.ts`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { checkClp, defaultSecurityConfig, validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';

jest.setTimeout(120000);

const running: BackendService[] = [];
afterAll(async () => {
  for (const svc of running) await svc.stop();
});

interface Person {
  objectId: string;
  sessionToken: string;
}

let base = '';
let admin = '';
let ada: Person;
let bea: Person;

async function call(method: string, p: string, body?: unknown, auth?: { session?: string; admin?: boolean }) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'p123' };
  if (auth?.session) headers['x-parse-session-token'] = auth.session;
  if (auth?.admin) headers.authorization = `Bearer ${admin}`;
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

const LISTING = {
  creatorOwns: false,
  permissions: { find: 'public', get: 'public', create: 'authenticated', update: 'creator', delete: 'creator' }
};

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p123-creator-'));
  fs.writeFileSync(
    path.join(dataDir, 'security.json'),
    JSON.stringify({
      version: 1,
      devOpen: false,
      defaults: {
        permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
        creatorOwns: true
      },
      collections: {
        Listing: LISTING,
        // `creator` ORs like any atom: the maker, or a moderator through their own row.
        Note: {
          creatorOwns: false,
          permissions: {
            find: 'authenticated',
            get: 'authenticated',
            create: 'authenticated',
            update: ['creator', { path: { hops: [{ from: 'Moderator', by: 'user' }, { follow: 'note', to: 'Note' }], maxDepth: 2 } }],
            delete: 'creator'
          }
        },
        Moderator: { creatorOwns: false, permissions: { find: 'authenticated', get: 'authenticated', create: 'nobody', update: 'nobody', delete: 'nobody' } }
      },
      functions: {},
      files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
      signup: 'public'
    })
  );
  const svc = new BackendService({ dataDir, port: 0, backendId: 'p123-creator', backendName: 'P123 creator' });
  running.push(svc);
  base = (await svc.start()).listen.url;
  admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  const signUp = async (name: string): Promise<Person> => {
    const r = await call('POST', '/users', { username: name, password: `pw-${name}-123`, email: `${name}@p123.test` });
    expect(r.status).toBe(201);
    return r.json;
  };
  ada = await signUp('ada');
  bea = await signUp('bea');
  // No Moderator row: before the first moderator the path reaches no one (P123-S6-PATHNOTABLE).
});

describe('P123-S6-CREATOREDITS — the rule value', () => {
  const withListing = (permissions: Record<string, unknown>) => ({
    ...defaultSecurityConfig(),
    collections: { Listing: { creatorOwns: false, permissions } }
  });

  it('is accepted on find, get, update and delete', () => {
    expect(validateSecurityConfig(withListing({ find: 'creator', get: 'creator', update: 'creator', delete: ['creator', 'role:mod'] }))).toEqual([]);
  });

  it('is refused on create, saying why', () => {
    const errors = validateSecurityConfig(withListing({ create: 'creator' }));
    expect(errors.join('\n')).toMatch(/"creator" is allowed only on find, get, update and delete.*nobody who made it yet/);
  });

  it('is refused on a function, a file and signup', () => {
    const cfg = { ...defaultSecurityConfig(), functions: { f: { call: 'creator' } }, files: { upload: 'creator', read: 'public', delete: 'nobody' }, signup: 'creator' };
    const errors = validateSecurityConfig(cfg);
    expect(errors.filter((e) => /"creator" is allowed only/.test(e))).toHaveLength(3);
  });

  it('narrows a signed-in caller to the rows that name them as owner; an anonymous caller is refused', () => {
    const cfg = withListing({ update: 'creator' }) as any;
    const user = checkClp(cfg, { kind: 'user', userId: 'u1', roles: [] } as any, 'Listing', 'update');
    expect(user).toMatchObject({ allowed: true, narrow: { owner: 'u1' } });
    expect(checkClp(cfg, { kind: 'anonymous' } as any, 'Listing', 'update').allowed).toBe(false);
  });

  it('is granted outright, with no narrowing, when another atom in the same rule grants the caller', () => {
    const cfg = withListing({ update: ['creator', 'authenticated'] }) as any;
    const d = checkClp(cfg, { kind: 'user', userId: 'u1', roles: [] } as any, 'Listing', 'update');
    expect(d.allowed).toBe(true);
    expect(d.narrow).toBeUndefined();
  });
});

describe('P123-S6-CREATOREDITS — on a running backend: everyone reads, only the maker changes', () => {
  let listing = '';
  beforeAll(async () => {
    const made = await call('POST', '/classes/Listing', { title: 'bike' }, { session: ada.sessionToken });
    expect(made.status).toBe(201);
    listing = made.json.objectId;
  });

  it('everyone reads it: another person, and nobody signed in', async () => {
    expect((await call('GET', `/classes/Listing/${listing}`, undefined, { session: bea.sessionToken })).json.title).toBe('bike');
    expect((await call('GET', `/classes/Listing/${listing}`)).json.title).toBe('bike');
    const found = await call('GET', '/classes/Listing', undefined, { session: bea.sessionToken });
    expect(found.json.results.map((r: any) => r.objectId)).toContain(listing);
  });

  // A signed-in caller the rule narrows away is answered 404, as for a row ACL: whether someone
  // else's row is there is not said. A caller with no session is refused at the door, 403.
  it('another person cannot change it or delete it, and it is left as it was', async () => {
    const put = await call('PUT', `/classes/Listing/${listing}`, { title: 'stolen' }, { session: bea.sessionToken });
    expect(put.status).toBe(404);
    const del = await call('DELETE', `/classes/Listing/${listing}`, undefined, { session: bea.sessionToken });
    expect(del.status).toBe(404);
    expect((await call('GET', `/classes/Listing/${listing}`)).json.title).toBe('bike');
  });

  it('nobody signed in cannot change it', async () => {
    const put = await call('PUT', `/classes/Listing/${listing}`, { title: 'anon' });
    expect(put.status).toBe(403);
    expect((await call('GET', `/classes/Listing/${listing}`)).json.title).toBe('bike');
  });

  it('a forged owner on the way in does not make someone else the maker', async () => {
    const forged = await call('POST', '/classes/Listing', { title: 'says ada', owner: ada.objectId }, { session: bea.sessionToken });
    expect(forged.status).toBe(201);
    const put = await call('PUT', `/classes/Listing/${forged.json.objectId}`, { title: 'ada edits' }, { session: ada.sessionToken });
    expect(put.status).toBe(404);
    expect((await call('PUT', `/classes/Listing/${forged.json.objectId}`, { title: 'bea edits' }, { session: bea.sessionToken })).status).toBe(200);
  });

  it('the maker changes it and then deletes it', async () => {
    const put = await call('PUT', `/classes/Listing/${listing}`, { title: 'red bike' }, { session: ada.sessionToken });
    expect(put.status).toBe(200);
    expect((await call('GET', `/classes/Listing/${listing}`)).json.title).toBe('red bike');
    const del = await call('DELETE', `/classes/Listing/${listing}`, undefined, { session: ada.sessionToken });
    expect(del.status).toBe(200);
    expect((await call('GET', `/classes/Listing/${listing}`)).status).toBe(404);
  });

  it('a row nobody made (an admin seed with no owner) is changed by the admin only', async () => {
    const seeded = await call('POST', '/classes/Listing', { title: 'seed' }, { admin: true });
    expect(seeded.status).toBe(201);
    const id = seeded.json.objectId;
    expect((await call('PUT', `/classes/Listing/${id}`, { title: 'x' }, { session: ada.sessionToken })).status).toBe(404);
    expect((await call('PUT', `/classes/Listing/${id}`, { title: 'y' }, { admin: true })).status).toBe(200);
  });

  it('ORs with a path rule: a moderator the path reaches changes a note they did not make', async () => {
    const note = await call('POST', '/classes/Note', { text: 'ada note' }, { session: ada.sessionToken });
    expect(note.status).toBe(201);
    const id = note.json.objectId;
    expect((await call('PUT', `/classes/Note/${id}`, { text: 'bea edit' }, { session: bea.sessionToken })).status).toBe(404);
    // bea moderates that note: a Moderator row (only the admin makes those) links her to it.
    const link = await call(
      'POST',
      '/classes/Moderator',
      { user: { __type: 'Pointer', className: '_User', objectId: bea.objectId }, note: { __type: 'Pointer', className: 'Note', objectId: id } },
      { admin: true }
    );
    expect(link.status).toBe(201);
    expect((await call('PUT', `/classes/Note/${id}`, { text: 'moderated' }, { session: bea.sessionToken })).status).toBe(200);
    // delete is `creator` alone: the moderator may not.
    expect((await call('DELETE', `/classes/Note/${id}`, undefined, { session: bea.sessionToken })).status).toBe(404);
    expect((await call('PUT', `/classes/Note/${id}`, { text: 'mine again' }, { session: ada.sessionToken })).status).toBe(200);
  });
});
