/**
 * P121-S19-SIGNINRACE, the REST half — `RestAuthAdapter.fetchCurrentUser` had the Parse wire's hole: a "who is signed
 * in" check that answers after somebody else signed in wrote the previous person back (and a 401 for the old token
 * cleared the new session). The Parse-wire case, through the real UserService, is noodl-viewer-react
 * tests/p121-s19-signinrace.test.ts. Here: PocketBase, a fetch that holds every answer until the case releases it.
 */

import type { BackendHandle } from '@noodl/backend-contract';

import { SESSION_MOVED_MESSAGE } from '../../src/api/backends/ParseAuthAdapter';
import { RestAuthAdapter, restSessionKey } from '../../src/api/backends/RestAuthAdapter';
import { SessionStore } from '../../src/api/backends/SessionStore';

const pocketbase: BackendHandle = { id: 'be-pb', type: 'pocketbase', name: 'My PocketBase', url: 'https://pb.example' };
const KEY = 'NodeGX/be-pb/session';
const NOW = 1_700_000_000_000;

function jwt(id: string): string {
  const claim = Buffer.from(JSON.stringify({ exp: NOW / 1000 + 604800, collectionId: '_pb_users_auth_', id })).toString('base64url');
  return `header.${claim}.signature`;
}

interface Held {
  url: string;
  answer(status: number, body: unknown): void;
}

/** Disposed after each case, so a red case cannot leave its refresh timers holding the run open. */
const made: RestAuthAdapter[] = [];
afterEach(() => {
  for (const adapter of made.splice(0)) adapter.dispose();
});

function makeAdapter() {
  const held: Held[] = [];
  const storage: Record<string, unknown> = {};
  const adapter = new RestAuthAdapter({
    fetchImpl: ((url: string) =>
      new Promise((resolve) =>
        held.push({ url, answer: (status, body) => resolve({ status, text: () => Promise.resolve(JSON.stringify(body)) }) })
      )) as never,
    now: () => NOW,
    isBrowserTab: () => true,
    createStore: (handle) => new SessionStore({ key: restSessionKey(handle), storage, broadcaster: null })
  });
  made.push(adapter);
  const take = (path: string): Held => {
    const i = held.findIndex((h) => h.url.endsWith(path));
    if (i < 0) throw new Error(`no request to ${path} is waiting`);
    return held.splice(i, 1)[0];
  };
  const who = () => (storage[KEY] === undefined ? undefined : JSON.parse(storage[KEY] as string).objectId);
  return { adapter, storage, take, who };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const STAFF_TOKEN = jwt('staff');

/** The staff member's stored session is being checked when the admin signs in. */
async function adminSignsInWhileTheCheckIsOut(a: ReturnType<typeof makeAdapter>, said: string[]): Promise<Held> {
  a.storage[KEY] = JSON.stringify({ objectId: 'staff', email: 'ada@example.com', sessionToken: STAFF_TOKEN });
  a.adapter.fetchCurrentUser(pocketbase, { success: () => said.push('ok'), error: (e) => said.push(String(e)) });
  const check = a.take('/auth-refresh');
  a.adapter.logIn(pocketbase, { username: 'root@example.com', password: 'pw', success: () => said.push('signed in'), error: (e) => said.push(String(e)) });
  a.take('/auth-with-password').answer(200, { record: { id: 'admin', email: 'root@example.com', verified: true, collectionName: 'users' }, token: jwt('admin') });
  await settle();
  await settle();
  expect(a.who()).toBe('admin');
  return check;
}

describe('P121-S19-SIGNINRACE — REST: a check made for the previous session does not overrule the sign-in after it', () => {
  it('🔴 the staff member\'s check answers after the admin signed in: the admin stays, the caller is told why', async () => {
    const a = makeAdapter();
    const said: string[] = [];
    const check = await adminSignsInWhileTheCheckIsOut(a, said);

    check.answer(200, { record: { id: 'staff', email: 'ada@example.com', verified: true, collectionName: 'users' }, token: jwt('staff2') });
    await settle();
    await settle();

    expect(a.who()).toBe('admin');
    expect(said).toEqual(['signed in', SESSION_MOVED_MESSAGE]);
  });

  it('🔴 the staff member\'s token is refused (401) after the admin signed in: the admin\'s session is not cleared', async () => {
    const a = makeAdapter();
    const lost: unknown[] = [];
    a.adapter.on('sessionLost', (r) => lost.push(r));
    const check = await adminSignsInWhileTheCheckIsOut(a, []);

    check.answer(401, { status: 401, message: 'The request requires valid record authorization token.' });
    await settle();
    await settle();

    expect(a.who()).toBe('admin');
    expect(lost).toEqual([]);
  });

  it('(known-firing) nobody signs in while the check is out: a refreshed session is adopted, and a 401 still signs out', async () => {
    const a = makeAdapter();
    a.storage[KEY] = JSON.stringify({ objectId: 'staff', email: 'ada@example.com', sessionToken: STAFF_TOKEN });
    a.adapter.fetchCurrentUser(pocketbase, { success: () => undefined, error: () => undefined });
    a.take('/auth-refresh').answer(200, { record: { id: 'staff', email: 'ada@new.example.com', verified: true, collectionName: 'users' }, token: jwt('staff') });
    await settle();
    await settle();
    expect(JSON.parse(a.storage[KEY] as string).email).toBe('ada@new.example.com');

    const lost: unknown[] = [];
    a.adapter.on('sessionLost', (r) => lost.push(r));
    a.adapter.fetchCurrentUser(pocketbase, { success: () => undefined, error: () => undefined });
    a.take('/auth-refresh').answer(401, { status: 401, message: 'no' });
    await settle();
    await settle();
    expect(a.who()).toBeUndefined();
    expect(lost).toHaveLength(1);
  });
});
