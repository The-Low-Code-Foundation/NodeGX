/**
 * P121-S19-SIGNINRACE — a "who is signed in" check that answers after somebody else signs in.
 *
 * Measured in the marketplace drive (s19): with a staff member signed in, the drive opened `/sign-in` and signed in as
 * the admin; once in three runs the app routed the admin to the STAFF's Orders page. On 0.4.2 (OWN-021 S8) the bar once
 * still named the previous person 3 s after a sign-in. The node's `done` was not the cause: Log In writes the new
 * session before it reports (ParseAuthAdapter `logIn`). The page load is: the user service checks the STORED session
 * with the backend (`/users/me`, carrying the old person's token), and when that answer arrives after the sign-in, the
 * adapter wrote it into the session, putting the old person back; a "session invalid" answer (209) for the old token
 * would clear the new person's session outright.
 *
 * The real `UserService`, the real `ParseAuthAdapter`, a fake `XMLHttpRequest` that holds every answer until the case
 * releases it — so the order the race needs is played every time, not one run in three.
 */

import NoodlRuntime from '@noodl/runtime';

import UserService from '../src/nodes/std-library/user/userservice';

interface Held {
  url: string;
  answer(status: number, body: unknown): void;
}

const held: Held[] = [];

class HoldingXHR {
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  status = 0;
  response = '';
  responseText = '';
  private url = '';
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {
    /* not read */
  }
  send() {
    held.push({
      url: this.url,
      answer: (status, body) => {
        this.readyState = 4;
        this.status = status;
        this.response = this.responseText = JSON.stringify(body);
        if (this.onreadystatechange) this.onreadystatechange();
      }
    });
  }
}

const KEY = 'Parse/app-1/currentUser';
const STAFF = { objectId: 'staff', username: 'ada', email: 'ada@example.com', sessionToken: 'tok-staff' };
const ADMIN = { objectId: 'admin', username: 'root', email: 'root@example.com', sessionToken: 'tok-admin' };
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
const take = (path: string): Held => {
  const i = held.findIndex((h) => h.url.endsWith(path));
  if (i < 0) throw new Error(`no request to ${path} is waiting (${held.map((h) => h.url).join(', ') || 'none'})`);
  return held.splice(i, 1)[0];
};
const stored = () => (storage[KEY] === undefined ? undefined : JSON.parse(storage[KEY]).objectId);

/** A fresh service on a project whose backend is the NodeGX one, with the staff member's session stored. */
function makeService(): { service: UserService; lost: number[] } {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = {
    getMetaData: (key: string) =>
      key === 'cloudservices' ? { endpoint: 'http://localhost:8577', appId: 'app-1', type: 'nodegx' } : undefined
  };
  const lost: number[] = [];
  const service = new (UserService as unknown as new () => UserService)();
  service.on('sessionLost', () => lost.push(1));
  return { service, lost };
}

/** The admin signs in while the page-load check for the staff member is still out. */
async function adminSignsInWhileTheCheckIsOut(service: UserService): Promise<string[]> {
  const outcome: string[] = [];
  service.logIn({ username: 'root', password: 'pw', success: () => outcome.push('done'), error: (e) => outcome.push('failed: ' + e) });
  take('/login').answer(200, ADMIN);
  await settle();
  return outcome;
}

let storage: Record<string, string>;
let savedInstance: unknown;
let savedXHR: unknown;

beforeEach(() => {
  held.length = 0;
  savedInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;
  savedXHR = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = HoldingXHR;
  storage = { [KEY]: JSON.stringify(STAFF) };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
});

afterEach(() => {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = savedInstance;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = savedXHR;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('P121-S19-SIGNINRACE — a check made for the previous session does not overrule the sign-in after it', () => {
  it('🔴 the staff member\'s check answers after the admin signed in: the admin stays signed in', async () => {
    const { service } = makeService();
    const check = take('/users/me');

    expect(await adminSignsInWhileTheCheckIsOut(service)).toEqual(['done']);
    expect(stored()).toBe('admin');

    check.answer(200, STAFF);
    await settle();

    expect(stored()).toBe('admin');
    expect(service.current && service.current.getId()).toBe('admin');
  });

  it('🔴 the staff member\'s token turns out invalid after the admin signed in: the admin\'s session is not cleared', async () => {
    const { service, lost } = makeService();
    const check = take('/users/me');
    await adminSignsInWhileTheCheckIsOut(service);

    check.answer(400, { code: 209, error: 'Invalid session token' });
    await settle();

    expect(stored()).toBe('admin');
    expect(lost).toEqual([]);
    expect(service.current && service.current.getId()).toBe('admin');
  });

  it('a check asked for after the sign-in answers for the admin, and is adopted', async () => {
    const { service } = makeService();
    take('/users/me').answer(200, STAFF);
    await adminSignsInWhileTheCheckIsOut(service);

    const said: string[] = [];
    service.fetchCurrentUser({ success: () => said.push('ok'), error: (e) => said.push('failed: ' + e) });
    take('/users/me').answer(200, { ...ADMIN, email: 'root@new.example.com' });
    await settle();

    expect(said).toEqual(['ok']);
    expect(JSON.parse(storage[KEY]).email).toBe('root@new.example.com');
  });

  it('(known-firing) nobody signs in while the check is out: its answer is adopted, and a 209 still signs the person out', async () => {
    const first = makeService();
    take('/users/me').answer(200, { ...STAFF, email: 'ada@new.example.com' });
    await settle();
    expect(JSON.parse(storage[KEY]).email).toBe('ada@new.example.com');
    expect(first.service.current && first.service.current.getId()).toBe('staff');

    storage[KEY] = JSON.stringify(STAFF);
    const second = makeService();
    take('/users/me').answer(400, { code: 209, error: 'Invalid session token' });
    await settle();
    expect(stored()).toBeUndefined();
    expect(second.lost).toEqual([1]);
  });
});
