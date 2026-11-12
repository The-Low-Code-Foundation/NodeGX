/**
 * P121-TWO005-ACLNULL — `ACL: null` on a write said 200 and kept the row's ACL.
 *
 * The community template brought a hidden post back with `Noodl.Records.save(id, {…}, { acl: null })`: the save
 * answered 200, the other fields changed, and the row kept `{"role:admin": {"read": true}}`, so no member could read
 * the post again. A row's ACL cannot be removed (the backend never could); the write now says so, and how to open the
 * row instead. A row with no ACL, and a row this caller cannot write, go on exactly as before.
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
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'p121' };
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

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p121-aclnull-'));
  fs.writeFileSync(
    path.join(dataDir, 'security.json'),
    JSON.stringify({
      version: 1,
      devOpen: false,
      defaults: {
        permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
        creatorOwns: true
      },
      collections: { Board: { creatorOwns: false } },
      functions: {},
      files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
      signup: 'public'
    })
  );
  const svc = new BackendService({ dataDir, port: 0, backendId: 'p121-aclnull', backendName: 'P121 ACL null' });
  running.push(svc);
  base = (await svc.start()).listen.url;
  admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  const signUp = async (name: string): Promise<Person> => {
    const r = await call('POST', '/users', { username: name, password: `pw-${name}-123`, email: `${name}@p121.test` });
    expect(r.status).toBe(201);
    return r.json;
  };
  ada = await signUp('ada');
  bea = await signUp('bea');
});

describe('P121-TWO005-ACLNULL — ACL: null on a write', () => {
  it('on a row with an ACL: refused in words, nothing written, the ACL as it was', async () => {
    const made = await call('POST', '/classes/Post', { text: 'v1' }, { session: ada.sessionToken });
    expect(made.status).toBe(201);
    const id = made.json.objectId;
    const before = (await call('GET', `/classes/Post/${id}`, undefined, { admin: true })).json.ACL;
    expect(before).toEqual({ [ada.objectId]: { read: true, write: true } });

    const cleared = await call('PUT', `/classes/Post/${id}`, { text: 'v2', ACL: null }, { session: ada.sessionToken });
    expect(cleared.status).toBe(400);
    expect(cleared.json.error).toMatch(/A row's ACL can't be removed/);
    expect(cleared.json.error).toContain('{"*": {"read": true}}');

    const after = (await call('GET', `/classes/Post/${id}`, undefined, { admin: true })).json;
    expect(after.text).toBe('v1');
    expect(after.ACL).toEqual(before);
  });

  it('the way the refusal names works: the row opens to everyone the rules let read it', async () => {
    const made = await call('POST', '/classes/Post', { text: 'mine' }, { session: ada.sessionToken });
    const id = made.json.objectId;
    expect((await call('GET', `/classes/Post/${id}`, undefined, { session: bea.sessionToken })).status).toBe(404);
    const opened = await call(
      'PUT',
      `/classes/Post/${id}`,
      { ACL: { '*': { read: true }, [ada.objectId]: { read: true, write: true } } },
      { session: ada.sessionToken }
    );
    expect(opened.status).toBe(200);
    expect((await call('GET', `/classes/Post/${id}`, undefined, { session: bea.sessionToken })).json.text).toBe('mine');
  });

  it('control: on a row with no ACL, ACL: null changes nothing about it and the save goes through', async () => {
    const made = await call('POST', '/classes/Board', { text: 'shared' }, { session: ada.sessionToken });
    expect(made.status).toBe(201);
    const id = made.json.objectId;
    const saved = await call('PUT', `/classes/Board/${id}`, { text: 'edited', ACL: null }, { session: bea.sessionToken });
    expect(saved.status).toBe(200);
    expect((await call('GET', `/classes/Board/${id}`, undefined, { admin: true })).json.text).toBe('edited');
  });

  it("control: a caller who cannot write the row is answered as before (404), so the refusal reveals nothing", async () => {
    const made = await call('POST', '/classes/Post', { text: 'ada only' }, { session: ada.sessionToken });
    const res = await call('PUT', `/classes/Post/${made.json.objectId}`, { text: 'x', ACL: null }, { session: bea.sessionToken });
    expect(res.status).toBe(404);
  });
});
