/**
 * P109 ISL-030 — P107-C45 ("Stay signed in, say nothing") and P107-C46 ("Fire it once"), ruled 2026-10-05.
 *
 * When the user service is made with a stored session it checks it with the backend. On ANY failure it used to clear the
 * Parse-wire store and announce `sessionLost` — on top of the adapter, which already clears and announces when the backend
 * REJECTED the session. So a blip at page load (a 503, the network down) signed a NodeGX-backend user out, and a real
 * rejection was announced twice. Now the adapter alone decides.
 *
 * The node spec's world plays only REST backends; this is the Parse-wire (NodeGX backend) half: the real `UserService`, the
 * real `ParseAuthAdapter`, a fake `XMLHttpRequest` answering `/users/me`, and the session where the adapter keeps it.
 */

import NoodlRuntime from '@noodl/runtime';

import UserService from '../src/nodes/std-library/user/userservice';

type Answer = { status: number; body: unknown };

let answer: Answer;
const opened: string[] = [];

class FakeXHR {
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  status = 0;
  response = '';
  responseText = '';
  open(_method: string, url: string) {
    opened.push(url);
  }
  setRequestHeader() {
    /* not read */
  }
  send() {
    this.readyState = 4;
    this.status = answer.status;
    this.response = this.responseText = JSON.stringify(answer.body);
    setTimeout(() => this.onreadystatechange && this.onreadystatechange(), 0);
  }
}

const KEY = 'Parse/app-1/currentUser';
const STORED = JSON.stringify({ objectId: 'u1', username: 'ann', email: 'ann@example.com', sessionToken: 'tok-1' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

/** A fresh service on a project whose backend is the NodeGX one (a `cloudservices` endpoint), signed in as ann. */
function makeService(): { service: UserService; lost: number[] } {
  const holder = NoodlRuntime as unknown as { instance?: unknown };
  holder.instance = {
    getMetaData: (key: string) =>
      key === 'cloudservices' ? { endpoint: 'http://localhost:8577', appId: 'app-1', type: 'nodegx' } : undefined
  };
  const lost: number[] = [];
  const service = new (UserService as unknown as new () => UserService)();
  service.on('sessionLost', () => lost.push(1));
  return { service, lost };
}

let savedInstance: unknown;
let savedXHR: unknown;
/** The session storage (Node has no `localStorage`; `SessionStore` reads whatever the global is now). */
let storage: Record<string, string>;

beforeEach(() => {
  opened.length = 0;
  savedInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;
  savedXHR = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXHR;
  storage = { [KEY]: STORED };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
});

afterEach(() => {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = savedInstance;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = savedXHR;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('ISL-030 C45 + C46 — the page-load check: the backend decides, once', () => {
  it('a 503 at load: the person stays signed in and nothing is announced', async () => {
    answer = { status: 503, body: { error: 'Service Unavailable' } };
    const { service, lost } = makeService();
    await settle();

    expect(opened).toEqual(['http://localhost:8577/users/me']);
    expect(lost).toEqual([]);
    expect(storage[KEY]).toBe(STORED);
    expect(service.current && service.current.getId()).toBe('u1');
  });

  it('the session rejected at load (209): Session Lost ONCE, the session gone, and nobody is current', async () => {
    answer = { status: 400, body: { code: 209, error: 'Invalid session token' } };
    const { service, lost } = makeService();
    await settle();

    expect(lost).toEqual([1]);
    expect(storage[KEY]).toBeUndefined();
    expect(service.current).toBeUndefined();
  });

  it('(control) the backend agrees at load: signed in, nothing announced', async () => {
    answer = { status: 200, body: { objectId: 'u1', username: 'ann', email: 'ann@example.com', sessionToken: 'tok-1' } };
    const { service, lost } = makeService();
    await settle();

    expect(lost).toEqual([]);
    expect(service.current && service.current.getId()).toBe('u1');
  });
});
