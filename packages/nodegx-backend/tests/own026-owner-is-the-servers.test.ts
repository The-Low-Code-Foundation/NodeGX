/**
 * P112 OWN-026 FIX-05 — `owner` is the server's word, on every door and every collection.
 *
 * A stranger's agent built "invite someone to see my records" as an invitation row the page
 * creates, naming a group by a field the page fills from the signed-in user, and a cloud
 * function that trusts that field. Any signed-in caller who sends another group's id reads that
 * group's records (P112-OWN026-CALLEROWNER). The server already wrote who made each record into
 * `owner`, but measured before this fix (2026-10-23, the same requests as below):
 *
 *  - `PUT {owner: <someone else>}` on your own record answered 200 and stored it (the ACL stayed yours);
 *  - a create into a shared collection (`creatorOwns: false`) stored the `owner` the page sent,
 *    and left it empty when the page sent none.
 *
 * So the one field that looked like the server's could be written by anyone. Now a session, a key
 * bound to a user and an anonymous caller never write it: a create names the caller (or nobody),
 * and an update drops it. An admin and an unbound server key still may (a seed, a transfer, a cloud
 * function running as the system).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'own026' };
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

/** The stored `owner` as an id, whichever wire shape it came back in (a Pointer, or a bare id). */
async function ownerOf(collection: string, id: string): Promise<string | null> {
  const r = await call('GET', `/classes/${collection}/${id}`, undefined, { admin: true });
  expect(r.status).toBe(200);
  const o = r.json.owner;
  return o == null ? null : typeof o === 'string' ? o : o.objectId;
}

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'own026-owner-'));
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
        Board: { creatorOwns: false },
        Chunk: { creatorOwns: false },
        Guestbook: {
          creatorOwns: false,
          permissions: { find: 'public', get: 'public', create: 'public', update: 'nobody', delete: 'nobody' }
        }
      },
      functions: {},
      files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
      signup: 'public'
    })
  );
  const svc = new BackendService({ dataDir, port: 0, backendId: 'own026-owner', backendName: 'OWN-026 owner' });
  running.push(svc);
  base = (await svc.start()).listen.url;
  admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  const signUp = async (name: string): Promise<Person> => {
    const r = await call('POST', '/users', { username: name, password: `pw-${name}-123`, email: `${name}@own026.test` });
    expect(r.status).toBe(201);
    return r.json;
  };
  ada = await signUp('ada');
  bea = await signUp('bea');
});

describe('OWN-026 FIX-05 A — a record says who made it, and only the server says it', () => {
  it("a creator-owned record names its creator whatever the page sent, and an update cannot rename it", async () => {
    const made = await call('POST', '/classes/Invite', { owner: bea.objectId, note: 'says bea' }, { session: ada.sessionToken });
    expect(made.status).toBe(201);
    expect(await ownerOf('Invite', made.json.objectId)).toBe(ada.objectId);

    const renamed = await call('PUT', `/classes/Invite/${made.json.objectId}`, { owner: bea.objectId, note: 'still mine' }, { session: ada.sessionToken });
    expect(renamed.status).toBe(200);
    expect(await ownerOf('Invite', made.json.objectId)).toBe(ada.objectId);
    // The rest of the save went through: dropping `owner` is not refusing the write.
    expect((await call('GET', `/classes/Invite/${made.json.objectId}`, undefined, { session: ada.sessionToken })).json.note).toBe('still mine');
  });

  it("an 'All' save that sends the record back as read, owner included, still saves", async () => {
    const made = await call('POST', '/classes/Invite', { note: 'v1' }, { session: ada.sessionToken });
    const read = (await call('GET', `/classes/Invite/${made.json.objectId}`, undefined, { session: ada.sessionToken })).json;
    expect(read.owner).toBeTruthy();
    const { objectId: _id, createdAt: _c, updatedAt: _u, ...back } = read;
    const saved = await call('PUT', `/classes/Invite/${made.json.objectId}`, { ...back, note: 'v2' }, { session: ada.sessionToken });
    expect(saved.status).toBe(200);
    expect(await ownerOf('Invite', made.json.objectId)).toBe(ada.objectId);
  });

  it('a shared record names its creator too (read by everyone, still made by one person)', async () => {
    const forged = await call('POST', '/classes/Board', { owner: bea.objectId, text: 'says bea' }, { session: ada.sessionToken });
    expect(forged.status).toBe(201);
    expect(await ownerOf('Board', forged.json.objectId)).toBe(ada.objectId);

    const plain = await call('POST', '/classes/Board', { text: 'no owner sent' }, { session: bea.sessionToken });
    expect(await ownerOf('Board', plain.json.objectId)).toBe(bea.objectId);

    // Shared still means shared: the other user reads and changes it, but cannot take it over.
    expect((await call('GET', `/classes/Board/${plain.json.objectId}`, undefined, { session: ada.sessionToken })).status).toBe(200);
    const takeOver = await call('PUT', `/classes/Board/${plain.json.objectId}`, { owner: ada.objectId, text: 'edited by ada' }, { session: ada.sessionToken });
    expect(takeOver.status).toBe(200);
    expect(await ownerOf('Board', plain.json.objectId)).toBe(bea.objectId);
  });

  it('an anonymous record names nobody, whatever it sent', async () => {
    const r = await call('POST', '/classes/Guestbook', { owner: ada.objectId, text: 'hi' });
    expect(r.status).toBe(201);
    expect(await ownerOf('Guestbook', r.json.objectId)).toBe(null);
  });

  it('the /api door: a save and a batch save drop it the same way', async () => {
    const made = await call('POST', '/classes/Invite', { note: 'api' }, { session: ada.sessionToken });
    const id = made.json.objectId;
    const put = await call('PUT', `/api/Invite/${id}`, { owner: bea.objectId, note: 'api put' }, { session: ada.sessionToken });
    expect(put.status).toBe(200);
    expect(await ownerOf('Invite', id)).toBe(ada.objectId);
    const batch = await call(
      'POST',
      '/api/_batch',
      { operations: [{ method: 'save', collection: 'Invite', objectId: id, data: { owner: bea.objectId } }] },
      { session: ada.sessionToken }
    );
    expect(batch.status).toBe(200);
    expect(await ownerOf('Invite', id)).toBe(ada.objectId);
  });

  it('an admin may still name an owner (a seed, a transfer, a function running as the system)', async () => {
    const seeded = await call('POST', '/classes/Board', { owner: bea.objectId, text: 'seeded for bea' }, { admin: true });
    expect(seeded.status).toBe(201);
    expect(await ownerOf('Board', seeded.json.objectId)).toBe(bea.objectId);
    const moved = await call('PUT', `/classes/Board/${seeded.json.objectId}`, { owner: ada.objectId }, { admin: true });
    expect(moved.status).toBe(200);
    expect(await ownerOf('Board', seeded.json.objectId)).toBe(ada.objectId);
  });

  it("an app whose own `owner` links one of its classes keeps it (the server's owner only ever points at _User)", async () => {
    const team = await call('POST', '/classes/Board', { text: 'a team stand-in' }, { session: ada.sessionToken });
    const link = { __type: 'Pointer', className: 'Board', objectId: team.json.objectId };
    const first = await call('POST', '/classes/Chunk', { owner: link, n: 1 }, { session: ada.sessionToken });
    expect(first.status).toBe(201);
    expect(await ownerOf('Chunk', first.json.objectId)).toBe(team.json.objectId);
    // The column now says so, and later writes and updates keep the app's link too.
    const second = await call('POST', '/classes/Chunk', { owner: link, n: 2 }, { session: bea.sessionToken });
    expect(await ownerOf('Chunk', second.json.objectId)).toBe(team.json.objectId);
    const other = await call('POST', '/classes/Board', { text: 'another team' }, { session: bea.sessionToken });
    const moved = await call('PUT', `/classes/Chunk/${second.json.objectId}`, { owner: { ...link, objectId: other.json.objectId } }, { session: bea.sessionToken });
    expect(moved.status).toBe(200);
    expect(await ownerOf('Chunk', second.json.objectId)).toBe(other.json.objectId);
  });

  it("relabelling a forged owner as another class does not get it past a _User owner column", async () => {
    const made = await call('POST', '/classes/Invite', { note: 'relabel' }, { session: ada.sessionToken });
    const relabelled = await call(
      'PUT',
      `/classes/Invite/${made.json.objectId}`,
      { owner: { __type: 'Pointer', className: 'Family', objectId: bea.objectId } },
      { session: ada.sessionToken }
    );
    expect(relabelled.status).toBe(200);
    expect(await ownerOf('Invite', made.json.objectId)).toBe(ada.objectId);
  });

  it('a query filters by owner with the bare id, the shape a visualFilter sends', async () => {
    await call('POST', '/classes/Board', { text: 'ada board' }, { session: ada.sessionToken });
    const where = encodeURIComponent(JSON.stringify({ owner: ada.objectId }));
    const r = await call('GET', `/classes/Board?where=${where}`, undefined, { session: bea.sessionToken });
    expect(r.status).toBe(200);
    const texts = r.json.results.map((x: any) => x.text);
    expect(texts).toContain('ada board');
    expect(r.json.results.every((x: any) => (typeof x.owner === 'string' ? x.owner : x.owner.objectId) === ada.objectId)).toBe(true);
  });

  it("a forged grant is told apart by its owner: the field says bea's, the server says ada made it", async () => {
    // The measured defect's shape, generically: a row whose own field names another person.
    const forged = await call('POST', '/classes/Grant', { forUser: bea.objectId, to: 'ada@own026.test' }, { session: ada.sessionToken });
    const rows = (await call('GET', '/classes/Grant', undefined, { admin: true })).json.results;
    const row = rows.find((r: any) => r.objectId === forged.json.objectId);
    const owner = typeof row.owner === 'string' ? row.owner : row.owner.objectId;
    expect(row.forUser).toBe(bea.objectId);
    expect(owner).toBe(ada.objectId);
  });
});
